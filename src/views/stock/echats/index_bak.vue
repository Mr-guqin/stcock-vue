<template>
  <div ref="chartDom" style="width: 600px; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { queryKLineByStockNo } from "@/api/stock/stockKLine.js";

// 创建一个响应式引用来保存DOM元素
const chartDom = ref(null);
const xAxisData = ref([]);
const seriesData = ref([]);
let chartInstance = null;




const data = reactive({
  form: {
    current: 1,
    size: 10000,
    queryCondition: {
      stockNo: '000007',
    }
  }
});
// 初始化ECharts实例并设置配置项（这里以折线图为例，但可灵活替换）
onMounted(async () => {
  await nextTick(); // 确保DOM已经渲染完成
  getList()

});

function draw() {
  chartInstance = echarts.init(chartDom.value);
  const option = {
    xAxis: {
      // data:  ['2017-10-24', '2017-10-25', '2017-10-26', '2017-10-27']
      data: xAxisData.value
    },
    yAxis: {},
    series: [
      {
        type: 'candlestick',
        // data: [
        //   [20, 34, 10, 38],
        //   [40, 35, 30, 50],
        //   [31, 38, 33, 44],
        //   [38, 15, 5, 42]
        // ]
        data: seriesData.value
      }
    ]
  };
  chartInstance.setOption(option);
}

// 销毁ECharts实例
onUnmounted(() => {
  if (chartInstance != null && chartInstance.dispose) {
    chartInstance.dispose();
  }
});

function getList() {
  let stockNo =  '000007';

  queryKLineByStockNo(stockNo).then(response => {

    xAxisData.value = response.data.map(el=>el.date);

    seriesData.value = response.data.map(el=> {
      let series = [];
      series.push(el.dayStartPrice);
      series.push(el.dayEndPrice);
      series.push(el.dayMinPrice);
      series.push(el.dayMaxPrice);
      return series;
    });
    draw();
    // xAxisData.value = ;
  // .forEach(item => {
  //     if (!props.options.some(v => v.value === item)) {
  //       unmatchArray.value.push(item)
  //       unmatch = true // 如果有未匹配项，将标志设置为true
  //     }
  //   })
  });
}

</script>

<style scoped>
/* 添加一些CSS样式来美化图表容器（可选） */
</style>
