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
      <el-form-item label="自选日期" prop="date">
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
        <el-button icon="Refresh" v-model:loading="refreshFlag" @click="addStockForStrategyInfo">加入策略股</el-button>
      </el-form-item>

    </el-form>


    <el-table v-loading="loading" :data="postList">
      <el-table-column label="股票编号" align="center" prop="stockNo"/>
      <el-table-column label="股票名称" align="center" prop="stockName"/>
      <el-table-column label="自选类型" align="center" prop="optionType"/>
      <el-table-column label="自选日期" align="center" prop="optionDate"/>
      <el-table-column label="日期" align="center" prop="date"/>
      <el-table-column label="时间" align="center" prop="time"/>
      <el-table-column label="开盘价" align="center" prop="todayStartPrice"/>
      <el-table-column label="当前价格" align="center" prop="nowPrice"/>
      <el-table-column label="最高价" align="center" prop="todayMax"/>
      <el-table-column label="最低价" align="center" prop="todayMin"/>
      <el-table-column label="成交量" align="center" prop="traNumber"/>
      <el-table-column label="涨跌额" align="center" prop="increase"/>
      <el-table-column label="涨跌幅度" align="center" prop="increPer"/>
      <el-table-column label="自选价格" align="center" prop="optionPrice"/>
      <el-table-column label="自选后收益" align="center" prop="optionIncrePer"/>

      <el-table-column label="操作" width="180" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleLookKLine(scope.row)">查看K线</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="form.current"
        v-model:limit="form.size"
        @pagination="getList"
    />

    <!-- 添加或修改岗位对话框 -->
    <el-dialog :title="title" v-model="open" @close="closeDialog" width="1100px" height="700px" append-to-body>
      <el-tabs v-model="activeName" @tab-click="handleClick">
        <el-tab-pane label="分时图" name="first">
          <div ref="shiDenChartDom" style="width: 1000px; height: 500px;"></div>
        </el-tab-pane>
        <el-tab-pane label="日K" name="second">
          <div ref="kChartDom" style="width: 1000px; height: 500px;"></div>
        </el-tab-pane>
        <el-tab-pane label="角色管理" name="third">

        </el-tab-pane>
        <el-tab-pane label="定时任务补偿" name="fourth">定时任务补偿</el-tab-pane>
      </el-tabs>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Post">
import {addStockForStrategy, listPost} from "@/api/stock/myseflOptionStock.js";
import {nextTick, onMounted, onUnmounted, ref} from 'vue';
import * as echarts from 'echarts';
import {queryFenShiLineByStockNo, queryKLineByStockNo} from "@/api/stock/stockKLine.js";

const {proxy} = getCurrentInstance();



const postList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const activeName = ref("first");
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

const {form} = toRefs(data);


const shiDenChartDom = ref(null);
let shifenChartInstance = null;

// 创建一个响应式引用来保存DOM元素
const kChartDom = ref(null);
let chartInstance = null;

const upColor = '#ec0000';
const downColor = '#00da3c';
let timer = null;

var bgColor = "#1f212d";//背景
var shifenUpColor = "#F9293E";//涨颜色
var shifenDownColor = "#00aa3b";//跌颜色

// ma  颜色
var ma5Color = "#39afe6";
var ma10Color = "#da6ee8";
var ma20Color = "#ffab42";
var ma30Color = "#00940b";


const refreshFlag = ref(false);

function splitData(rawData) {
  let categoryData = [];
  let values = [];
  let volumes = [];
  for (let i = 0; i < rawData.length; i++) {
    categoryData.push(rawData[i].splice(0, 1)[0]);
    values.push(rawData[i]);
    volumes.push([i, rawData[i][4], rawData[i][0] >= rawData[i][1] ? 1 : -1]);
  }
  return {
    categoryData: categoryData,
    values: values,
    volumes: volumes
  };
}

function handleClick(tab, event) {
  console.log(tab, event);
}

function addStockForStrategyInfo() {
  refreshFlag.value = true;
  addStockForStrategy().then(response => {
    refreshFlag.value = false;
    getList()
  });

}

function calculateMA(dayCount, data) {
  let result = [];
  let len = data.length;
  for (let i = 0; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      sum += parseFloat(data[i - j][1]);
    }
    result.push(+(sum / dayCount).toFixed(2));
  }
  return result;
}

function calculateTraNumMA(dayCount, data) {
  let result = [];
  let len = data.length;
  for (let i = 0; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      sum += parseFloat(data[i - j][1]);
    }
    result.push(+(sum / dayCount).toFixed(0));
  }
  return result;
}

function drawKChart(row) {

  let stockNo = row;
  queryKLineByStockNo(stockNo).then(response => {

    let rawData = response.data.map(el => {
      let series = [];
      series.push(el.date);
      series.push(el.dayStartPrice);
      series.push(el.dayEndPrice);
      series.push(el.dayMinPrice);
      series.push(el.dayMaxPrice);
      series.push(el.traNumber);
      return series;
    });
    let startValue = rawData[rawData.length - 30][0];
    let endValue = rawData[rawData.length - 1][0];
    let data = splitData(rawData);
    let macdData = calcMACD(5, 10, 6, rawData, data.values, 1);
    const option = {
      animation: false,
      legend: [
        {
          left: '0%',
          data: ['K线周期图表', 'MA5', 'MA10', 'MA20', 'MA30'],
          textStyle: {
            fontSize: 12,
            color: '#0e99e2'
          },
        },
        {
          left: '0%',
          top: '50%',
          data: ['成交量', 'M5', 'M10'],
          textStyle: {
            fontSize: 12,
            color: '#0e99e2'
          },
        },
        {
          left: '0%',
          top: '70%',
          data: ['MACD', 'DIF', 'DEA'],
          textStyle: {
            fontSize: 12,
            color: '#0e99e2'
          },
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: {
          color: '#000'
        },
        position: function (pos, params, el, elRect, size) {
          const obj = {
            top: 10
          };
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
          return obj;
        }
        // extraCssText: 'width: 170px'
      },
      axisPointer: {
        link: [
          {
            xAxisIndex: 'all'
          }
        ],
        label: {
          backgroundColor: '#777'
        }
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: false
          },
          brush: {
            type: ['lineX', 'clear']
          }
        }
      },
      brush: {
        xAxisIndex: 'all',
        brushLink: 'all',
        outOfBrush: {
          colorAlpha: 0.1
        }
      },
      visualMap: {
        show: false,
        seriesIndex: [5, 8],
        dimension: 2,
        pieces: [
          {
            value: 1,
            color: downColor
          },
          {
            value: -1,
            color: upColor
          }
        ]
      },
      grid: [
        {
          left: '0%',
          right: '0%',
          height: '30%'
        },
        {
          left: '0%',
          right: '0%',
          top: '48%',
          height: '20%'
        },
        {
          left: '0%',
          right: '0%',
          top: '78%',
          height: '20%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: data.categoryData,
          boundaryGap: false,
          axisLine: {onZero: false},
          scale: true,
          splitLine: {
            show: false,
            lineStyle: {
              color: '#3a3a3e'
            }
          },
          min: 'dataMin',
          max: 'dataMax',
          axisPointer: {
            z: 100
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: data.categoryData,
          boundaryGap: false,
          axisLine: {onZero: false},
          axisTick: {show: false},
          splitLine: {show: false},
          axisLabel: {show: false},
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 2,
          data: data.categoryData,
          boundaryGap: false,
          axisLine: {onZero: false},
          axisTick: {show: false},
          splitLine: {show: false},
          axisLabel: {show: false},
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          // splitArea: {
          //   show: true
          // },
          splitLine: { //分割线设置
            show: false,
            lineStyle: {
              color: '#181a23'
            }
          },
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: {show: false},
          axisLine: {show: false},
          axisTick: {show: false},
          splitLine: {show: false}
        },
        {
          scale: true,
          gridIndex: 2,
          splitNumber: 2,
          axisLabel: {show: false},
          axisLine: {show: false},
          axisTick: {show: false},
          splitLine: {show: false}
        }
      ],
      backgroundColor: bgColor,
      dataZoom: [
        {
          xAxisIndex: [0, 1, 2],
          show: false,
          startValue: startValue,                         // 数据展示窗口的初始数据
          endValue: endValue,                           // 数据展示窗口的结束数据
        },
        {
          show: false,
          type: 'inside',
          xAxisIndex: [0, 1, 2],
          start: 98,
          end: 100
        },
        {
          show: false,
          xAxisIndex: [0, 1, 2],
          type: 'slider',
          top: '85%',
          start: 98,
          end: 100
        }
      ],
      // backgroundColor: bgColor,
      series: [
        {
          name: 'K线周期图表',
          type: 'candlestick',
          // barWidth: '55%',
          large: true,
          largeThreshold: 100,
          data: data.values,

          itemStyle: {
            color: shifenUpColor,
            color0: shifenDownColor,
            borderColor: shifenUpColor,
            borderColor0: shifenDownColor
          }
        },
        {
          name: 'MA5',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          data: calculateMA(5, data.values),
          smooth: true,
          lineStyle: {
            opacity:  0.8,
            width: 1,
          }
        },
        {
          name: 'MA10',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          data: calculateMA(10, data.values),
          smooth: true,
          lineStyle: {
            opacity:  0.8,
            width: 1
          }
        },
        {
          name: 'MA20',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          data: calculateMA(20, data.values),
          smooth: true,
          lineStyle: {
            opacity: 0.8,
            width: 1
          }
        },
        {
          name: 'MA30',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          data: calculateMA(30, data.values),
          smooth: true,
          lineStyle: {
            opacity:  0.8,
            width: 1
          }
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: data.volumes
        },
        {
          name: 'M5',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: calculateTraNumMA(5, data.volumes),
        },
        {
          name: 'M10',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: calculateTraNumMA(10, data.volumes),
        },
        {
          name: 'MACD',
          type: 'bar',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.macd,
          barWidth: 2,
        },
        {
          name: 'DIF',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: calculateMacdData(2, macdData.dif)
        },
        {
          name: 'DEA',
          type: 'line',
          showSymbol: false,
          symbol: "none",
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: calculateMacdData(2, macdData.dea)

        }
      ]
    };
    chartInstance.setOption(option, true);
  });
}

function drawShiFenChart(row) {
  let stockNo = row;
  queryFenShiLineByStockNo(stockNo).then(response => {
    let data = response.data;
    const option = initMOption(data, 'hs');
    shifenChartInstance.setOption(option, true);
  });
}

/**
 * 生成分时option
 * @param {Object} m_data 分时数据
 * @param {Object} type 股票类型  us-美股  hs-沪深  hk-港股
 */
function initMOption(m_data, type) {
  var m_datas = get_m_data(m_data, type);
  return {
    tooltip: { //弹框指示器
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function (params, ticket, callback) {
        var i = params[0].dataIndex;

        var color;
        if (m_datas.priceArr[i] > m_data.yestclose) {
          color = 'style="color:#ff4242"';
        } else {
          color = 'style="color:#26bf66"';
        }

        var html = '<div class="commColor" style="width:100px;"><div>当前价 <span  ' + color + ' >' + m_datas.priceArr[i] + '</span></div>';
        html += '<div>均价 <span  ' + color + ' >' + m_datas.avgPrice[i] + '</span></div>';
        html += '<div>涨幅 <span  ' + color + ' >' + ratioCalculate(m_datas.priceArr[i], m_data.yestclose) + '%</span></div>';
        html += '<div>成交量 <span  ' + color + ' >' + m_datas.vol[i] + '</span></div></div>'
        return html;
      }
    },
    legend: { //图例控件,点击图例控制哪些系列不显示
      icon: 'rect',
      type: 'scroll',
      itemWidth: 14,
      itemHeight: 2,
      left: 0,
      top: '-1%',
      textStyle: {
        fontSize: 12,
        color: '#0e99e2'
      }
    },
    axisPointer: {
      link: [
        {
          xAxisIndex: 'all'
        }
      ],
    },
    color: [ma5Color, ma10Color],
    grid: [{
      id: 'gd1',
      left: '0%',
      right: '1%',
      height: '50%', //主K线的高度,
      top: '10%'
    },
      {
        id: 'gd2',
        left: '0%',
        right: '1%',
        height: '50%', //主K线的高度,
        top: '10%'
      }, {
        id: 'gd3',
        left: '0%',
        right: '1%',
        top: '65%',
        height: '20%' //交易量图的高度
      }
    ],
    xAxis: [ //==== x轴
      { //主图
        gridIndex: 0,
        data: m_datas.times,
        axisLabel: { //label文字设置
          show: false
        },
        splitLine: {
          show: false,
        }
      },
      {
        show: false,
        gridIndex: 1,
        data: m_datas.times,
        axisLabel: { //label文字设置
          show: false
        },
        splitLine: {
          show: false,
        }
      }, { //交易量图
        splitNumber: 2,
        type: 'category',
        gridIndex: 2,
        data: m_datas.times,
        axisLabel: { //label文字设置
          color: '#9b9da9',
          fontSize: 10
        },
      }
    ],
    yAxis: [ //y轴
      {
        gridIndex: 0,
        scale: true,
        splitNumber: 3,
        axisLabel: { //label文字设置
          inside: true, //label文字朝内对齐
          fontWeight: 'bold',
          color: function (val) {
            if (val == m_data.yestclose) {
              return '#aaa'
            }
            return val > m_data.yestclose ? shifenUpColor : shifenDownColor;
          }
        }, z: 4, splitLine: { //分割线设置
          show: false,
          lineStyle: {
            color: '#181a23'
          }
        },
      }, {
        scale: true, gridIndex: 1, splitNumber: 3,
        position: 'right', z: 4,
        axisLabel: { //label文字设置
          color: function (val) {
            if (val == m_data.yestclose) {
              return '#aaa'
            }
            return val > m_data.yestclose ? shifenUpColor : shifenDownColor;
          },
          inside: true, //label文字朝内对齐
          fontWeight: 'bold',
          formatter: function (val) {
            var resul = ratioCalculate(val, m_data.yestclose);
            return Number(resul).toFixed(2) + ' %'
          }
        },
        splitLine: { //分割线设置
          show: false,
          lineStyle: {
            color: '#181a23'
          }
        },
        axisPointer: {
          show: true,
          label: {
            formatter: function (params) { //计算右边Y轴对应的当前价的涨幅比例
              return ratioCalculate(params.value, m_data.yestclose) + '%';
            }
          }
        }
      }
      , { //交易图
        gridIndex: 2, z: 4,
        splitNumber: 3,
        axisLine: {
          onZero: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: { //label文字设置
          color: '#c7c7c7',
          inside: true, //label文字朝内对齐
          fontSize: 8
        },
      }
    ],
    dataZoom: [],
    //animation:false,//禁止动画效果
    backgroundColor: bgColor,
    blendMode: 'source-over',
    series: [{
      name: '当前价',
      type: 'line',
      data: m_datas.priceArr,
      smooth: true,
      symbol: "circle", //中时有小圆点
      lineStyle: {
        normal: {
          opacity: 0.8,
          color: '#39afe6',
          width: 1
        }
      },
      areaStyle: {
        normal: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: 'rgba(0, 136, 212, 0.7)'
          }, {
            offset: 0.8,
            color: 'rgba(0, 136, 212, 0.02)'
          }], false),
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowBlur: 10
        }
      }
    },
      {
        name: '均价',
        type: 'line',
        data: m_datas.avgPrice,
        smooth: true,
        symbol: "circle",
        lineStyle: { //标线的样式
          normal: {
            opacity: 0.8,
            color: '#da6ee8',
            width: 1
          }
        }
      }, {
        type: 'line',
        data: m_datas.priceArr,
        smooth: true,
        symbol: "none",
        gridIndex: 1,
        xAxisIndex: 1,
        yAxisIndex: 1,
        lineStyle: { //标线的样式
          normal: {
            width: 0
          }
        }
      },
      {
        name: '成交量',
        type: 'bar',
        gridIndex: 2,
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: m_datas.vol,
        barWidth: '60%',
        itemStyle: {
          normal: {
            color: function (params) {
              var colorList;
              if (m_datas.priceArr[params.dataIndex] > m_datas.priceArr[params.dataIndex - 1]) {
                colorList = shifenUpColor;
              } else {
                colorList = shifenDownColor;
              }
              return colorList;
            },
          }
        }
      }
    ]
  };
}


/**
 * 计算价格涨跌幅百分比
 * @param {Object} price 当前价
 * @param {Object} yclose 昨收价
 */
function ratioCalculate(price, yclose) {
  return ((price - yclose) / yclose * 100).toFixed(2);
}


/**
 * 15:20 时:分 格式时间增加num分钟
 * @param {Object} time 起始时间
 * @param {Object} num
 */
function addTimeStr(time, num) {
  var hour = time.split(':')[0];
  var mins = Number(time.split(':')[1]);
  var mins_un = parseInt((mins + num) / 60);
  var hour_un = parseInt((Number(hour) + mins_un) / 24);
  if (mins_un > 0) {
    if (hour_un > 0) {
      var tmpVal = ((Number(hour) + mins_un) % 24) + "";
      hour = tmpVal.length > 1 ? tmpVal : '0' + tmpVal;//判断是否是一位
    } else {
      var tmpVal = Number(hour) + mins_un + "";
      hour = tmpVal.length > 1 ? tmpVal : '0' + tmpVal;
    }
    var tmpMinsVal = ((mins + num) % 60) + "";
    mins = tmpMinsVal.length > 1 ? tmpMinsVal : 0 + tmpMinsVal;//分钟数为 取余60的数
  } else {
    var tmpMinsVal = mins + num + "";
    mins = tmpMinsVal.length > 1 ? tmpMinsVal : '0' + tmpMinsVal;//不大于整除60
  }
  return hour + ":" + mins;
}

//获取增加指定分钟数的 数组  如 09:30增加2分钟  结果为 ['09:31','09:32']
function getNextTime(startTime, endTIme, offset, resultArr) {
  var result = addTimeStr(startTime, offset);
  resultArr.push(result);
  if (result == endTIme) {
    return resultArr;
  } else {
    return getNextTime(result, endTIme, offset, resultArr);
  }
}


/**
 * 不同类型的股票的交易时间会不同
 * @param {Object} type   hs=沪深  us=美股  hk=港股
 */
var time_arr = function (type) {
  if (type.indexOf('us') != -1) {//生成美股时间段
    var timeArr = new Array();
    timeArr.push('09:30')
    return getNextTime('09:30', '16:00', 1, timeArr);
  }
  if (type.indexOf('hs') != -1) {//生成沪深时间段
    var timeArr = new Array();
    timeArr.push('09:30');
    timeArr.concat(getNextTime('09:30', '11:29', 1, timeArr));
    timeArr.push('13:00');
    timeArr.concat(getNextTime('13:00', '15:00', 1, timeArr));
    return timeArr;
  }
  if (type.indexOf('hk') != -1) {//生成港股时间段
    var timeArr = new Array();
    timeArr.push('09:30');
    timeArr.concat(getNextTime('09:30', '11:59', 1, timeArr));
    timeArr.push('13:00');
    timeArr.concat(getNextTime('13:00', '16:00', 1, timeArr));
    return timeArr;
  }

}


var get_m_data = function (m_data, type) {
  var priceArr = new Array();
  var avgPrice = new Array();
  var vol = new Array();
  var times = time_arr(type);
  for (let i = 0; i < m_data.data.length; i++) {
    priceArr.push(m_data.data[i][1]);
    avgPrice.push(m_data.data[i][2]);
    vol.push(m_data.data[i][3]);

  }
  return {
    priceArr: priceArr,
    avgPrice: avgPrice,
    vol: vol,
    times: times
  }
}

/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}

onMounted(async () => {
  await nextTick(); // 确保DOM已经渲染完成
  getList();
});


/** 关闭窗口 */
function closeDialog() {
  if (chartInstance != null && chartInstance.dispose) {
    chartInstance.dispose();
  }
  if (shifenChartInstance != null && shifenChartInstance.dispose) {
    shifenChartInstance.dispose();
  }

  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
}

// 销毁ECharts实例
onUnmounted(() => {
  if (chartInstance != null && chartInstance.dispose) {
    chartInstance.dispose();
  }
  if (shifenChartInstance != null && shifenChartInstance.dispose) {
    shifenChartInstance.dispose();
  }

  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
});

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

/** 表单重置 */
function reset() {
  proxy.resetForm("postRef");
}


//=================================================MADC计算公式

/*
 * 计算EMA指数平滑移动平均线，用于MACD
 * @param {number} n 时间窗口
 * @param {array} data 输入数据
 * @param {string} field 计算字段配置
 */
function calcEMA(n, data, field) {
  let i, l, ema, a;
  a = 2 / (n + 1);
  if (field) {
    //二维数组
    ema = [data[0][field]];
    for (i = 1, l = data.length; i < l; i++) {
      ema.push((a * data[i][field] + (1 - a) * ema[i - 1]).toFixed(3));
    }
  } else {
    //普通一维数组
    ema = [data[0]];
    for (i = 1, l = data.length; i < l; i++) {
      ema.push((a * data[i] + (1 - a) * ema[i - 1]).toFixed(3));
    }
  }
  return ema;
}

/*
 * 计算DIF快线，用于MACD
 * @param {number} short 快速EMA时间窗口
 * @param {number} long 慢速EMA时间窗口
 * @param {array} data 输入数据
 * @param {string} field 计算字段配置
 */
function calcDIF(short, long, data, field) {
  let i, l, dif, emaShort, emaLong;
  dif = [];
  emaShort = calcEMA(short, data, field);
  emaLong = calcEMA(long, data, field);
  for (i = 0, l = data.length; i < l; i++) {
    dif.push((emaShort[i] - emaLong[i]).toFixed(3));
  }
  return dif;
}

/*
 * 计算DEA慢线，用于MACD
 * @param {number} mid 对dif的时间窗口
 * @param {array} dif 输入数据
 */
function calcDEA(mid, dif) {
  return calcEMA(mid, dif);
}

/*
 * 计算MACD
 * @param {number} short 快速EMA时间窗口
 * @param {number} long 慢速EMA时间窗口
 * @param {number} mid dea时间窗口
 * @param {array} data 输入数据
 * @param {string} field 计算字段配置
 */
function calcMACD(short, long, mid, rawData, data, field) {
  let i, l, dif, dea, macd, result;
  result = {};
  macd = [];
  dif = calcDIF(short, long, data, field);
  dea = calcDEA(mid, dif);
  for (i = 0, l = rawData.length; i < l; i++) {
    macd.push([i, parseFloat(((dif[i] - dea[i]) * 2).toFixed(3)).toFixed(2), dif[i] - dea[i] >= 0 ? -1 : 1]);
  }
  result.dif = dif;
  result.dea = dea;
  result.macd = macd;
  return result;
}

function calculateMacdData(dayCount, data) {
  let result = [];
  let len = data.length;
  for (let i = 0; i < len; i++) {
    result.push(parseFloat(data[i]).toFixed(2));
  }
  return result;
}


//=================================================MADC计算公式 end

/** 新增按钮操作 */
function handleLookKLine(row) {
  open.value = true;
  title.value = "K线图: " + row.stockName + "(" + row.stockNo + ")";
  nextTick(() => {
    chartInstance = echarts.init(kChartDom.value);
    shifenChartInstance = echarts.init(shiDenChartDom.value);
    drawKChart(row.stockNo);
    drawShiFenChart(row.stockNo)
    timer = setInterval(() => {
      setTimeout(() => {
        drawKChart(row.stockNo)
      }, 100)
      setTimeout(() => {
        drawShiFenChart(row.stockNo)
      }, 500)
    }, 1500)
  })
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
</script>
