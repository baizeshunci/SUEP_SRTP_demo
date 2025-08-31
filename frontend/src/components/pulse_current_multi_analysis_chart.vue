<template>
  <div class="paper-stack-container relative w-full h-full overflow-hidden">
    <!-- 脉冲时间峰值柱状图 -->
    <div 
      :class="{ 'active': isPulseTimeActive, 'inactive': !isPulseTimeActive }" 
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out cursor-pointer"
    >
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">脉冲时间峰值分布
          <span class="ml-2 text-blue-400 text-[clamp(0.5rem,1vw,0.6rem)]">单击切换</span>
        </div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          峰值电流 / 时间 (s)
        </div>
      </div>
      <div 
        ref="pulseTimeContainer" 
        class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"
      >
        <div class="legend-container flex items-center gap-3 px-[2%] pb-[1%]">
          <div v-for="(item, idx) in legendData" :key="idx" class="flex items-center gap-1.5">
            <span :style="{ backgroundColor: item.color, width: '5px', height: '5px', display: 'inline-block' }"></span>
            <span class="text-gray-400 text-[clamp(0.55rem,1.5vw,0.65rem)]">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 脉冲峰值频率分布图 -->
    <div 
      :class="{ 'active': !isPulseTimeActive, 'inactive': isPulseTimeActive }" 
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-blue-500/30 shadow-xl transition-all duration-300 ease-out cursor-pointer"
    >
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">脉冲峰值区间频率
          <span class="ml-2 text-blue-400 text-[clamp(0.5rem,1vw,0.6rem)]">单击切换</span>
        </div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          出现次数 / 电流区间 (mA)
        </div>
      </div>
      <div 
        ref="pulseFreqContainer" 
        class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"
      >
        <div class="legend-container flex items-center gap-3 px-[2%] pb-[1%]">
          <div v-for="(item, idx) in legendData" :key="idx" class="flex items-center gap-1.5">
            <span :style="{ backgroundColor: item.color, width: '5px', height: '5px', display: 'inline-block' }"></span>
            <span class="text-gray-400 text-[clamp(0.55rem,1.5vw,0.65rem)]">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
import { useBaseChart } from "./utils_js/base-chart";
import { 
  getGridConfig, 
  getAxisBaseConfig, 
  getTooltipBaseConfig,
  getXAxisLabelFormatter,
  getYAxisLabelFormatter
} from "../utils/chart_utils";

const props = defineProps({ 
  pulseTimeData: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(item => 
        Array.isArray(item) && item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number'
      );
    }
  },
  pulseFreqData: {
    type: Array,
    default: null,
    validator: (value) => {
      if (!value) return true;
      return value.every(item => 
        typeof item === 'object' && item.name && typeof item.value === 'number'
      );
    }
  }
});

// 状态管理
const isPulseTimeActive = ref(true);
// 1. 修复：缓存图表实例
const pulseTimeChart = ref(null);
const pulseFreqChart = ref(null);

// 图表容器ref
const pulseTimeContainer = ref(null);
const pulseFreqContainer = ref(null);

// 图例数据
const legendData = [
  { name: '低 (0-40mA)', color: '#3b82f6' },
  { name: '中 (40-80mA)', color: '#f59e0b' },
  { name: '高 (80-100mA)', color: '#ef4444' }
];

// 切换图表
const toggleStack = async () => {
  isPulseTimeActive.value = !isPulseTimeActive.value;
};

// 计算频率分布
const calculateFreqData = () => {
  const timeData = props.pulseTimeData;
  return [
    { name: '低 (0-40mA)', value: timeData.filter(([_, v]) => v < 40).length },
    { name: '中 (40-80mA)', value: timeData.filter(([_, v]) => v >= 40 && v < 80).length },
    { name: '高 (80-100mA)', value: timeData.filter(([_, v]) => v >= 80).length }
  ];
};

// 根据数值获取颜色
const getColorByValue = (value) => {
  if (value < 40) return legendData[0].color;
  if (value < 80) return legendData[1].color;
  return legendData[2].color;
};

// 初始化脉冲时间-峰值柱状图
const initPulseTimeChart = () => {
  const container = pulseTimeContainer.value;
  if (!container) return;

  const getPulseTimeOption = () => {
    const grid = getGridConfig(container, { type: 'pulse-time' });
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    const styledData = props.pulseTimeData.map(([time, value]) => ({
      value: [time, value],
      itemStyle: { color: getColorByValue(value) }
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 300,
      tooltip: {
        ...getTooltipBaseConfig(),
        trigger: 'axis',
        textStyle: { ...getTooltipBaseConfig().textStyle, fontSize }
      },
      grid,
      xAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (val) => val.toFixed(1)
        }
      },
      yAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        min: 0,
        max: 100,
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (val) => val.toFixed(0)
        }
      },
      series: [{
        name: '脉冲峰值',
        type: 'bar',
        data: styledData,
        barWidth: container.offsetWidth < 300 ? '40%' : '50%',
        animation: { duration: 500 }
      }]
    };
  };

  // 2. 修复：如果实例已存在，直接更新；否则创建新实例
  if (pulseTimeChart.value) {
    const chartInstance = pulseTimeChart.value.getChartInstance();
    chartInstance?.setOption(getPulseTimeOption(), true);
    return pulseTimeChart.value;
  }

  // 3. 修复：watchSource 应为「响应式源数组」（getter函数数组）
  pulseTimeChart.value = useBaseChart({
    target: pulseTimeContainer,
    getOption: getPulseTimeOption,
    watchSource: [
      () => isPulseTimeActive.value,  // 监听切换状态
      () => props.pulseTimeData       // 监听数据变化
    ]
  });
  return pulseTimeChart.value;
};

// 初始化脉冲峰值区间频率图
const initPulseFreqChart = () => {
  const container = pulseFreqContainer.value;
  if (!container) return;

  const getPulseFreqOption = () => {
    const grid = getGridConfig(container,{ type: 'freq-currrntrange' });
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    const freqData = props.pulseFreqData || calculateFreqData();

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 300,
      tooltip: {
        ...getTooltipBaseConfig(),
        trigger: 'item',
        textStyle: { ...getTooltipBaseConfig().textStyle, fontSize }
      },
      grid,
      xAxis: {
        ...getAxisBaseConfig('category', { fontSize }),
        data: freqData.map(item => item.name),
        axisLabel: {
          ...getAxisBaseConfig('category', { fontSize }).axisLabel,
          rotate: container.offsetWidth < 280 ? 30 : 0,
          formatter: getXAxisLabelFormatter({
            intervalPixel: 40,
            target: pulseFreqContainer,
            data: freqData
          })
        }
      },
      yAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        min: 0,
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: getYAxisLabelFormatter({
            intervalPixel: 25,
            target: pulseFreqContainer,
            splitNumber: 5
          })
        }
      },
      series: [{
        name: '',
        type: 'bar',
        data: freqData.map(item => item.value),
        barWidth: container.offsetWidth < 300 ? '40%' : '60%',
        itemStyle: {
          color: ({ dataIndex }) => legendData[dataIndex].color
        },
        animation: { duration: 500 }
      }]
    };
  };

  // 2. 修复：缓存实例，避免重复创建
  if (pulseFreqChart.value) {
    const chartInstance = pulseFreqChart.value.getChartInstance();
    chartInstance?.setOption(getPulseFreqOption(), true);
    return pulseFreqChart.value;
  }

  // 3. 修复：watchSource 格式
  pulseFreqChart.value = useBaseChart({
    target: pulseFreqContainer,
    getOption: getPulseFreqOption,
    watchSource: [
      () => isPulseTimeActive.value,
      () => props.pulseFreqData,
      () => props.pulseTimeData
    ]
  });
  return pulseFreqChart.value;
};

// 渲染图表
const renderCharts = async () => {
  await nextTick(); // 确保DOM已更新
  if (isPulseTimeActive.value) {
    initPulseTimeChart();
  } else {
    initPulseFreqChart();
  }
};

// 4. 修复：监听逻辑优化，关闭immediate，通过onMounted初始化
watch([
  () => isPulseTimeActive.value,
  () => props.pulseTimeData,
  () => props.pulseFreqData
], renderCharts, { deep: true });

// 5. 修复：在onMounted中初始化（确保DOM已挂载，实例活跃）
onMounted(() => {
  renderCharts();
});

// 6. 修复：正确销毁实例
onUnmounted(() => {
  if (pulseTimeChart.value) {
    pulseTimeChart.value.destroyChart();
    pulseTimeChart.value = null;
  }
  if (pulseFreqChart.value) {
    pulseFreqChart.value.destroyChart();
    pulseFreqChart.value = null;
  }
});
</script>

<style lang="scss" scoped>
@use "../styles/chart_keynote.scss" as *;
</style>
