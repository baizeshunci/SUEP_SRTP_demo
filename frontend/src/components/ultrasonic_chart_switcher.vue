<template>
  <div class="paper-stack-container relative w-full h-full overflow-hidden">
    <!-- 时域波形图 -->
    <div ref="timeDomainRef" :class="{ 'active': isTimeDomainActive, 'inactive': !isTimeDomainActive }"
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out cursor-pointer">
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">时域波形图
          <span class="ml-2 text-blue-400 text-[clamp(0.5rem,1vw,0.6rem)]">单击切换</span>
        </div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          振幅 / 时间 (s)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
    </div>

    <!-- 频谱分析图 -->
    <div ref="frequencyRef" :class="{ 'active': !isTimeDomainActive, 'inactive': isTimeDomainActive }"
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-blue-500/30 shadow-xl transition-all duration-300 ease-out cursor-pointer">
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">频谱分析图
          <span class="ml-2 text-blue-400 text-[clamp(0.5rem,1vw,0.6rem)]">单击切换</span>
        </div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          能量 / 频率 (Hz)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
import {
  getGridConfig,
  getAxisBaseConfig,
  getXAxisLabelFormatter,
  getYAxisLabelFormatter,
  getTooltipBaseConfig
} from "../utils/chart_utils";
import { useBaseChart } from "./utils_js/base-chart";

const props = defineProps({
  timeDomain: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(item =>
        Array.isArray(item) && item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number'
      );
    }
  },
  frequency: {
    type: Array,
    default: null,
    validator: (value) => {
      if (!value) return true;
      return value.every(item =>
        Array.isArray(item) && item.length === 2 &&
        typeof item[0] === 'number' && typeof item[1] === 'number'
      );
    }
  }
});

// 状态管理（与脉冲图表逻辑一致：缓存实例+切换状态）
const isTimeDomainActive = ref(true);
// 1. 修复：缓存图表实例（避免重复创建）
const timeDomainChart = ref(null);
const frequencyChart = ref(null);

// 图表容器ref（与脉冲图表的 pulseTimeContainer 逻辑一致）
const timeDomainRef = ref(null);
const frequencyRef = ref(null);

// 颜色函数（保留原有逻辑）
const getPulseColor = (value) => {
  if (value == null) return '#9ca3af';
  if (value <= 50) return '#3b82f6';
  if (value <= 80) return '#f59e0b';
  return '#ef4444';
};
const getAmplitudeColor = (value) => {
  if (value == null) return '#9ca3af';
  const absValue = Math.abs(value);
  if (absValue <= 0.5) return '#3b82f6';
  if (absValue <= 1.0) return '#f59e0b';
  return '#ef4444';
};

// 切换图表（与脉冲图表 toggleStack 逻辑一致）
const toggleStack = () => {
  isTimeDomainActive.value = !isTimeDomainActive.value;
};

// 计算父容器尺寸（保留原有逻辑，增加兜底尺寸避免无宽高）
const getParentConstrainedSize = (container) => {
  if (!container?.parentElement) return { width: 400, height: 300 }; // 兜底尺寸

  const parent = container.parentElement;
  const parentRect = parent.getBoundingClientRect();

  const maxWidth = parentRect.width * 0.95;
  const maxHeight = parentRect.height * 0.95;
  const minWidth = Math.max(180, maxWidth * 0.3);
  const minHeight = Math.max(120, maxHeight * 0.3);

  return {
    width: Math.min(container.clientWidth || maxWidth, maxWidth, Math.max(container.clientWidth || maxWidth, minWidth)),
    height: Math.min(container.clientHeight || maxHeight, maxHeight, Math.max(container.clientHeight || maxHeight, minHeight))
  };
};

// -------------------------- 初始化时域图（完全对齐脉冲图表 initPulseTimeChart 逻辑） --------------------------
const initTimeDomainChart = () => {
  // 1. 获取容器（与脉冲图表一致：先判空）
  const container = timeDomainRef.value?.querySelector('.chart-container');
  if (!container) return;

  // 2. 图表配置函数（与原有逻辑一致）
  const getTimeDomainOption = () => {
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    const grid = getGridConfig(container, { type: 'time-domain' });
    const timeDomainData = props.timeDomain.map(([time, value]) => ({
      value: [time, value],
      itemStyle: { color: getPulseColor(value) }
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
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
          formatter: function (value, index) {
            // 1. 先调用 getXAxisLabelFormatter 判断是否显示标签（获取显示控制结果）
            const shouldShow = getXAxisLabelFormatter({
              intervalPixel: 3,
              target: timeDomainRef,
              data: props.timeDomain.map(item => item[0]) // 传入时间数组
            })(value, index); // 传入 value 和 index 两个参数（工具函数需要 index 计算间隔）

            // 2. 如果不需要显示（返回空字符串），直接返回空
            if (shouldShow === '') return '';

            // 3. 如果需要显示，对原始数值 value 进行格式化（而非对 shouldShow 格式化）
            // 先确保 value 是数值类型，避免 toFixed 报错
            if (typeof value !== 'number' || isNaN(value)) return '';

            // 根据需求格式化（例如保留 2 位小数）
            return value.toFixed(2);
          }
        }
      },
      yAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (value) => value.toFixed(2),
          align: 'right',
          margin: container.offsetWidth < 300 ? 6 : 4
        },
        axisTick: { inside: false, length: 0 }
      },
      series: [{
        name: '波形',
        type: 'line',
        data: timeDomainData,
        lineStyle: { color: 'rgba(59, 130, 246, 1)', width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ]
          }
        },
        symbol: 'none',
        sampling: 'average',
        animation: { duration: 500 }
      }]
    };
  };

  // 3. 修复：实例缓存（与脉冲图表一致：已存在则更新，不存在则创建）
  if (timeDomainChart.value) {
    const chartInstance = timeDomainChart.value.getChartInstance();
    chartInstance?.setOption(getTimeDomainOption(), true); // 仅更新配置
    return timeDomainChart.value;
  }

  // 4. 修复：watchSource 改为「getter函数数组」（与脉冲图表逻辑完全一致）
  timeDomainChart.value = useBaseChart({
    target: ref(container), // target 用 ref 包装，确保响应式
    getOption: getTimeDomainOption,
    watchSource: [
      () => isTimeDomainActive.value, // 监听切换状态（getter函数）
      () => props.timeDomain          // 监听数据变化（getter函数，包裹普通数组）
    ]
  });
  return timeDomainChart.value;
};

// -------------------------- 初始化频谱图（完全对齐脉冲图表 initPulseFreqChart 逻辑） --------------------------
const initFrequencyChart = () => {
  // 1. 获取容器（与脉冲图表一致：先判空）
  const container = frequencyRef.value?.querySelector('.chart-container');
  if (!container) return;

  // 2. 图表配置函数（与原有逻辑一致）
  const getFrequencyOption = () => {
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    const grid = getGridConfig(container, { type: 'pulse-freq' });
    const frequencyData = props.frequency?.map(([time, value]) => ({
      value: [time, value],
      itemStyle: { color: getAmplitudeColor(value) }
    })) || [];

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      tooltip: {
        ...getTooltipBaseConfig(),
        trigger: 'axis',
        textStyle: { ...getTooltipBaseConfig().textStyle, fontSize }
      },
      grid,
      xAxis: {
        ...getAxisBaseConfig('log', { fontSize }),
        min: 20,
        max: 20000,
        axisLabel: {
          ...getAxisBaseConfig('log', { fontSize }).axisLabel,
          formatter: (value) => value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)
        }
      },
      yAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (value) => value.toFixed(2),
          align: 'right',
          margin: container.offsetWidth < 300 ? 6 : 4
        },
        axisTick: { inside: false, length: 0 }
      },
      series: [{
        name: '频谱',
        type: 'bar',
        data: frequencyData,
        barWidth: '70%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.85)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.45)' }
            ]
          }
        },
        animation: { duration: 500 }
      }]
    };
  };

  // 3. 修复：实例缓存（与脉冲图表一致）
  if (frequencyChart.value) {
    const chartInstance = frequencyChart.value.getChartInstance();
    chartInstance?.setOption(getFrequencyOption(), true); // 仅更新配置
    return frequencyChart.value;
  }

  // 4. 修复：watchSource 改为「getter函数数组」（与脉冲图表逻辑一致）
  frequencyChart.value = useBaseChart({
    target: ref(container),
    getOption: getFrequencyOption,
    watchSource: [
      () => isTimeDomainActive.value, // 监听切换状态
      () => props.frequency           // 监听数据变化
    ]
  });
  return frequencyChart.value;
};

// -------------------------- 渲染图表（与脉冲图表 renderCharts 逻辑完全一致） --------------------------
const renderCharts = async () => {
  await nextTick(); // 确保DOM已更新（容器已存在）
  if (isTimeDomainActive.value) {
    initTimeDomainChart();
  } else {
    initFrequencyChart();
  }
};

// -------------------------- 监听逻辑（与脉冲图表一致：关闭immediate，通过onMounted初始化） --------------------------
watch([
  () => isTimeDomainActive.value, // 监听切换状态
  () => props.timeDomain,         // 监听时域数据
  () => props.frequency           // 监听频谱数据
], renderCharts, { deep: true }); // 关闭immediate，避免setup阶段触发

// -------------------------- 生命周期（与脉冲图表完全一致：onMounted初始化，onUnmounted销毁） --------------------------
onMounted(() => {
  // 组件挂载后初始化（此时DOM已存在，实例活跃，钩子能正确关联）
  renderCharts();
  // 绑定窗口resize事件（可选：与脉冲图表保持一致，如需可添加）
  window.addEventListener('resize', renderCharts);
});

onUnmounted(() => {
  // 1. 解绑resize事件（若添加了）
  window.removeEventListener('resize', renderCharts);
  // 2. 正确销毁实例（与脉冲图表一致：调用destroyChart清理资源）
  if (timeDomainChart.value) {
    timeDomainChart.value.destroyChart();
    timeDomainChart.value = null;
  }
  if (frequencyChart.value) {
    frequencyChart.value.destroyChart();
    frequencyChart.value = null;
  }
});
</script>

<style lang="scss" scoped>
@use "../styles/chart_keynote.scss" as *;
</style>