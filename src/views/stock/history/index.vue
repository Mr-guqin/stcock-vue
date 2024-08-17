<template>
  <div class="app-container">
    <el-form :model="form.queryCondition" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="股票编号" prop="stockNo">
        <el-input
            v-model="form.queryCondition.stockNo"
            placeholder="请输入股票编号"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="交易日期" prop="date">
        <el-date-picker
            v-model="dateRange"
            type="daterange"
            align="right"
            unlink-panels
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :picker-options="pickerOptions">
        </el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
      <el-form-item>
        <el-button icon="Refresh" v-model:loading="refreshFlag" @click="refreshStockInfo">更新股票</el-button>
      </el-form-item>
    </el-form>

<!--    <el-row :gutter="10" class="mb8">-->
<!--      <el-col :span="1.5">-->
<!--        <el-button-->
<!--            type="primary"-->
<!--            plain-->
<!--            icon="Plus"-->
<!--            @click="handleAdd"-->
<!--            v-hasPermi="['system:post:add']"-->
<!--        >新增</el-button>-->
<!--      </el-col>-->
<!--      <el-col :span="1.5">-->
<!--        <el-button-->
<!--            type="success"-->
<!--            plain-->
<!--            icon="Edit"-->
<!--            :disabled="single"-->
<!--            @click="handleUpdate"-->
<!--            v-hasPermi="['system:post:edit']"-->
<!--        >修改</el-button>-->
<!--      </el-col>-->
<!--      <el-col :span="1.5">-->
<!--        <el-button-->
<!--            type="warning"-->
<!--            plain-->
<!--            icon="Download"-->
<!--            @click="handleExport"-->
<!--            v-hasPermi="['system:post:export']"-->
<!--        >导出</el-button>-->
<!--      </el-col>-->
<!--      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>-->
<!--    </el-row>-->

    <el-table v-loading="loading" :data="postList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="股票编号" align="center" prop="stockNo" />
      <el-table-column label="日期" align="center" prop="date" />
      <el-table-column label="开盘价" align="center" prop="dayStartPrice" />
      <el-table-column label="收盘价" align="center" prop="dayEndPrice" />
      <el-table-column label="最低价" align="center" prop="dayMinPrice" />
      <el-table-column label="最高价" align="center" prop="dayMaxPrice" />
      <el-table-column label="成交量" align="center" prop="traNumber" />
      <el-table-column label="成交金额" align="center" prop="traAmount" />
      <el-table-column label="涨跌额" align="center" prop="increase" />
      <el-table-column label="涨跌幅度" align="center" prop="increPer"/>
      <el-table-column label="换手率" align="center" prop="traRate"/>
      <el-table-column label="换手率（实）" width="120" align="center" prop="realTraRate"/>


<!--      <el-table-column label="操作" width="180" align="center" class-name="small-padding fixed-width">-->
<!--        <template #default="scope">-->
<!--          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:post:edit']">修改</el-button>-->
<!--        </template>-->
<!--      </el-table-column>-->
    </el-table>

    <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="form.current"
        v-model:limit="form.size"
        @pagination="getList"
    />
  </div>
</template>

<script setup name="Post">
import { listPost, refreshStockInfoList, getPost, updatePost } from "@/api/stock/historyStock.js";
import {refreshCache} from "@/api/system/config.js";

const { proxy } = getCurrentInstance();

const postList = ref([]);
const open = ref(false);
const loading = ref(true);
const refreshFlag = ref(false);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const dateRange = ref([]);

const data = reactive({
  form: {
    current: 1,
    size: 10,
    queryCondition: {
      stockNo: undefined,
      tradeStartDate: undefined,
      tradeEndDate: undefined
    }
  },
  rules: {
    postName: [{ required: true, message: "岗位名称不能为空", trigger: "blur" }],
    postCode: [{ required: true, message: "岗位编码不能为空", trigger: "blur" }],
    postSort: [{ required: true, message: "岗位顺序不能为空", trigger: "blur" }],
  },

  pickerOptions: {
    shortcuts: [{
      text: '最近一周',
      onClick(picker) {
        const end = new Date();
        const start = new Date();
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
        picker.$emit('pick', [start, end]);
      }
    }, {
      text: '最近一个月',
      onClick(picker) {
        const end = new Date();
        const start = new Date();
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
        picker.$emit('pick', [start, end]);
      }
    }, {
      text: '最近三个月',
      onClick(picker) {
        const end = new Date();
        const start = new Date();
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
        picker.$emit('pick', [start, end]);
      }
    }]
  },
});

const { form, rules } = toRefs(data);

/** 查询岗位列表 */
function getList() {
  loading.value = true;
  if (dateRange.value.length > 0) {
    form.value.queryCondition.tradeStartDate = dateRange.value[0];
    form.value.queryCondition.tradeEndDate = dateRange.value[1];
  }
  listPost(form.value).then(response => {
    postList.value = response.data.records;
    total.value = response.data.total;
    loading.value = false;
  });
}

/** 刷新股票数据 */
function refreshStockInfo() {
  refreshFlag.value = true;
  refreshStockInfoList().then(response => {
    refreshFlag.value = false;
  });
}

/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}

/** 表单重置 */
function reset() {
  proxy.resetForm("postRef");
}

/** 搜索按钮操作 */
function handleQuery() {
  form.current = 1;
  getList();
}

/** 重置按钮操作 */
function resetQuery() {
  form.value = {
    current: 1,
    size: 10,
    queryCondition: {
      stockNo: undefined,
      tradeStartDate: undefined,
      tradeEndDate: undefined
    }
  };
  proxy.resetForm("queryRef");
  dateRange.value = [];
  handleQuery();
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.postId);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}

/** 新增按钮操作 */
function handleAdd() {
  reset();
  open.value = true;
  title.value = "添加岗位";
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  const postId = row.postId || ids.value;
  getPost(postId).then(response => {
    form.value = response.data;
    open.value = true;
    title.value = "修改岗位";
  });
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("system/post/export", {
    ...form.value
  }, `post_${new Date().getTime()}.xlsx`);
}

dateRange.value = [new Date(), new Date()];
getList();
</script>
