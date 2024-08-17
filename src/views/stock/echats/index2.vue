<template>
  <div ref="chartDom" style="width: 1000px; height: 800px;"></div>
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
const upColor = '#ec0000';
const upBorderColor = '#8A0000';
const downColor = '#00da3c';
const downBorderColor = '#008F28';
const dataCount = 2e5;
const data = generateOHLC(dataCount);


// 初始化ECharts实例并设置配置项（这里以折线图为例，但可灵活替换）
onMounted(async () => {
  await nextTick(); // 确保DOM已经渲染完成
  draw();

});

function draw() {
  chartInstance = echarts.init(chartDom.value);
  const option = {
    dataset: {
      source: data
    },
    title: {
      text: 'Data Amount: ' + echarts.format.addCommas(dataCount)
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      }
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: false
        }
      }
    },
    grid: [
      {
        left: '10%',
        right: '10%',
        bottom: 200
      },
      {
        left: '10%',
        right: '10%',
        height: 80,
        bottom: 80
      }
    ],
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        // inverse: true,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      {
        type: 'category',
        gridIndex: 1,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      }
    ],
    yAxis: [
      {
        scale: true,
        splitArea: {
          show: true
        }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 10,
        end: 100
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        bottom: 10,
        start: 10,
        end: 100
      }
    ],
    visualMap: {
      show: false,
      seriesIndex: 1,
      dimension: 6,
      pieces: [
        {
          value: 1,
          color: upColor
        },
        {
          value: -1,
          color: downColor
        }
      ]
    },
    series: [
      {
        type: 'candlestick',
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upBorderColor,
          borderColor0: downBorderColor
        },
        encode: {
          x: 0,
          y: [1, 4, 3, 2]
        }
      },
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: '#7fbe9e'
        },
        large: true,
        encode: {
          x: 0,
          y: 5
        }
      }
    ]
  };
  chartInstance.setOption(option);
}

function generateOHLC(count) {
  let data = [];
  let xValue = +new Date(2011, 0, 1);
  let minute = 60 * 1000;
  let baseValue = Math.random() * 12000;
  let boxVals = new Array(4);
  let dayRange = 12;
  for (let i = 0; i < count; i++) {
    baseValue = baseValue + Math.random() * 20 - 10;
    for (let j = 0; j < 4; j++) {
      boxVals[j] = (Math.random() - 0.5) * dayRange + baseValue;
    }
    boxVals.sort();
    let openIdx = Math.round(Math.random() * 3);
    let closeIdx = Math.round(Math.random() * 2);
    if (closeIdx === openIdx) {
      closeIdx++;
    }
    let volumn = boxVals[3] * (1000 + Math.random() * 500);
    // ['open', 'close', 'lowest', 'highest', 'volumn']
    // [1, 4, 3, 2]
    data[i] = [
      echarts.format.formatTime('yyyy-MM-dd\nhh:mm:ss', (xValue += minute)),
      +boxVals[openIdx].toFixed(2),
      +boxVals[3].toFixed(2),
      +boxVals[0].toFixed(2),
      +boxVals[closeIdx].toFixed(2),
      +volumn.toFixed(0),
      getSign(data, i, +boxVals[openIdx], +boxVals[closeIdx], 4) // sign
    ];
  }
  return data;
  function getSign(data, dataIndex, openVal, closeVal, closeDimIdx) {
    var sign;
    if (openVal > closeVal) {
      sign = -1;
    } else if (openVal < closeVal) {
      sign = 1;
    } else {
      sign =
          dataIndex > 0
              ? // If close === open, compare with close of last record
              data[dataIndex - 1][closeDimIdx] <= closeVal
                  ? 1
                  : -1
              : // No record of previous, set to be positive
              1;
    }
    return sign;
  }
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
