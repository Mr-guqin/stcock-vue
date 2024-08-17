<template>
  <div ref="chartDom" style="width: 1000px; height: 800px;"></div>
</template>

<script setup>
import {ref, onMounted, onUnmounted, nextTick} from 'vue';
import * as echarts from 'echarts';
import {queryKLineByStockNo} from "@/api/stock/stockKLine.js";

// 创建一个响应式引用来保存DOM元素
const chartDom = ref(null);
let chartInstance = null;

const upColor = '#ec0000';
const downColor = '#00da3c';

// 初始化ECharts实例并设置配置项（这里以折线图为例，但可灵活替换）
onMounted(async () => {
  await nextTick(); // 确保DOM已经渲染完成
  draw();
});

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
    result.push(+(sum / dayCount).toFixed(3));
  }
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

function draw() {
  chartInstance = echarts.init(chartDom.value);
  let stockNo = '605178';
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
    let data = splitData(rawData);
    let macdData = calcMACD(5, 10, 6, rawData, data.values, 1);
    const option = {
      animation: false,
      legend: {
        top: 30,
        left: 'center',
        data: ['K线周期图表', 'MA5', 'MA10', 'MA20', 'MA30']
      },
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
          left: '10%',
          right: '8%',
          height: '30%'
        },
        {
          left: '10%',
          right: '8%',
          top: '40%',
          height: '20%'
        },
        {
          left: '10%',
          right: '8%',
          top: '60%',
          height: '20%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: data.categoryData,
          boundaryGap: false,
          axisLine: {onZero: false},
          splitLine: {show: false},
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
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: {show: false},
          axisLine: {show: false},
          axisTick: {show: false},
          splitLine: {show: false}
        }
        ,
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
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1, 2],
          start: 98,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1, 2],
          type: 'slider',
          top: '85%',
          start: 98,
          end: 100
        }
      ],
      series: [
        {
          name: 'K线周期图表',
          type: 'candlestick',
          data: data.values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor
          }
        },
        {
          name: 'MA5',
          type: 'line',
          showSymbol: false,
          data: calculateMA(5, data.values),
          smooth: true,
          lineStyle: {
            opacity: 1
          }
        },
        {
          name: 'MA10',
          type: 'line',
          showSymbol: false,
          data: calculateMA(10, data.values),
          smooth: true,
          lineStyle: {
            opacity: 1
          }
        },
        {
          name: 'MA20',
          type: 'line',
          showSymbol: false,
          data: calculateMA(20, data.values),
          smooth: true,
          lineStyle: {
            opacity: 1
          }
        },
        {
          name: 'MA30',
          type: 'line',
          showSymbol: false,
          data: calculateMA(30, data.values),
          smooth: true,
          lineStyle: {
            opacity: 1
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
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: calculateTraNumMA(5, data.volumes),
          lineStyle: {
            opacity: 1
          }
        },
        {
          name: 'M10',
          type: 'line',
          showSymbol: false,
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: calculateTraNumMA(10, data.volumes),
          lineStyle: {
            opacity: 1
          }
        },
        {
          name: 'macd',
          type: 'bar',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.macd,
          barWidth: 2,
        },
        {
          name: 'dif',
          type: 'line',
          showSymbol: false,
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: calculateMacdData(2, macdData.dif)
        },
        {
          name: 'dea',
          type: 'line',
          showSymbol: false,
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: calculateMacdData(2, macdData.dea)

        }
      ]
    };
    chartInstance.setOption(option, true);
  });


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
    macd.push([i, parseFloat(((dif[i] - dea[i]) * 2).toFixed(3)).toFixed(2), rawData[i][0] >= rawData[i][1] ? 1 : -1]);
  }
  result.dif = dif;
  result.dea = dea;
  result.macd = macd;
  return result;
}


//=================================================MADC计算公式 end
// 销毁ECharts实例
onUnmounted(() => {
  if (chartInstance != null && chartInstance.dispose) {
    chartInstance.dispose();
  }
});


</script>

<style scoped>
/* 添加一些CSS样式来美化图表容器（可选） */
</style>
