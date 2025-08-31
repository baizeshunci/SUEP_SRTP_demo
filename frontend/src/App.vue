<template>
  <div id="building" class="flex flex-col min-h-screen">
    <!-- 标题容器（减小margin，避免顶部占用过多空间） -->
    <div class="z-10 text-white bg-opacity-50 bg-slate-800 m-1 rounded-md flex items-center justify-center title-container">
      <h1 class="text-4xl p-1 font-bold">变压器油中典型电弧放电过程</h1>
    </div>

    <!-- 内容容器（核心调整：自适应剩余空间，避免溢出） -->
    <div class="z-10 text-white flex-1 flex flex-wrap m-1 gap-2 content-container">
      <!-- 左侧内容（使用flex-1自适应，取消固定高度） -->
      <div class="flex-1 bg-opacity-50 bg-slate-800 p-2 rounded-md flex flex-col">
        <div class="flex-1 p-1 rounded-md text-center">
          <p>特高频信号频谱图(柱状图,0.3-3GHz 频段能量分布)</p>
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <p>多传感器信号对比图(折线图，绕组上 / 中 / 下部信号幅值)</p>
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <p>放电能量趋势图(折线图，时间 - 累积能量 J)</p>
        </div>
      </div>

      <!-- 中间内容（减小gap，避免高度累加溢出） -->
      <div class="flex-1 flex flex-col gap-2">
        <!-- 超声信号面板 -->
        <div class="bg-slate-800 bg-opacity-50 rounded-lg shadow-md overflow-hidden flex-1 flex flex-col">
          <div class="text-gray-300 text-sm font-medium p-2 border-b border-gray-700">
            超声信号监测区
          </div>
          <div class="flex-1 p-1">
            <UltrasonicChartSwitcher :timeDomain="formattedTimeDomainData" :frequency="formattedFrequencyData" class="w-full h-full" />
          </div>
        </div>

        <!-- 脉冲电流面板 -->
        <div class="bg-slate-800 bg-opacity-50 rounded-lg shadow-md overflow-hidden flex-1 flex flex-col">
          <div class="text-gray-300 text-sm font-medium p-2 border-b border-gray-700">
            脉冲电流监测区
          </div>
          <div class="flex-1 p-1">
            <PulseCurrentMultiAnalysisChart :pulseTimeData="formattedPulseTimeData" class="w-full h-full" />
          </div>
        </div>
      </div>

      <!-- 右边内容（使用flex-1自适应高度，取消h-1/3固定比例） -->
      <div class="flex-1 bg-opacity-50 bg-slate-800 rounded-md flex flex-col">
        <!-- 温度图表：用flex-1自适应分配高度 -->
        <div class="flex-1 p-1 rounded-md text-center">
          <TemperatureChart :data="currentData.temperature" />
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <Stress_time :data="currentData.pressure"/>
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <p>变压器 2D 模型图(带传感器位置标注,点击弹窗显示放电点)</p>
        </div>
      </div>
    </div>

    <!-- 类型选择容器（减小margin，避免底部溢出） -->
    <div class="z-10 text-white bg-opacity-50 bg-slate-800 m-1 rounded-md flex items-center justify-center type-container">
      <FaultType class="rounded-md w-full" :fault-types="faultTypes" :selected-type="currentSelected"
        @type-change="handleTypeChange" />
    </div>
  </div>
</template>

<script setup>
import TemperatureChart from "./components/temp_time.vue";
import FaultType from "./components/fault_type.vue";
import UltrasonicChartSwitcher from "./components/ultrasonic_chart_switcher.vue";
import PulseCurrentMultiAnalysisChart from "./components/pulse_current_multi_analysis_chart.vue";
import Stress_time from "./components/stress_time.vue";
import { ref , computed , onMounted} from 'vue';
import MockDataSource from './components/utils_js/AI_test_data.js';

import request from './utils/request.js';

// 故障类型列表
const faultTypes = [
  '正常状态',
  '电弧放电',
  '电晕放电',
  '火花放电',
  '内部故障',
  '未知类型'
];

const testRequest = async () => {
  try {
    const res = await request.get('/dashboard/test'); // 测试接口
    console.log('请求成功，返回结果：', res);
  } catch (err) {
    console.error('请求测试失败：', err);
  }
};

// 页面加载时执行测试
onMounted(() => {
  testRequest(); // 新增这一行，其他初始化逻辑保留
  // ... 原来的 fetchData() 等逻辑
});

const currentSelected = ref('正常状态');
// 计算属性自动同步，无需手动更新
const currentData = computed(() => {
  return MockDataSource[currentSelected.value] || {
    temperature: { xAxis: [], series: [] },
    pressure: { xAxis: [], series: [] },
    pulse: { xAxis: [], series: [] }
  };
});

// 新增：格式化脉冲数据为子组件需要的二维数组
const formattedPulseTimeData = computed(() => {
  // 从当前数据中获取脉冲原始数据
  const pulse = currentData.value.pulse;
  
  // 防御性校验：确保原始数据格式正确
  if (
    !pulse || 
    !Array.isArray(pulse.xAxis) || 
    !pulse.series || 
    pulse.series.length === 0 || 
    !Array.isArray(pulse.series[0].data)
  ) {
    return []; // 格式错误时返回空数组
  }
  
  // 转换为 [[时间(数字), 峰值], ...] 格式
  return pulse.xAxis.map((timeStr, index) => [
    parseFloat(timeStr), // 将时间字符串转为数字（如 "0.2" → 0.2）
    // 取对应索引的峰值，若不存在则用 0 兜底
    pulse.series[0].data[index] !== undefined ? pulse.series[0].data[index] : 0
  ]);
});

const formattedTimeDomainData = computed(() => {
  const timeDomainData = currentData.value?.timeDomain;
  
  if (
    !timeDomainData || 
    !Array.isArray(timeDomainData.xAxis) || 
    !timeDomainData.series || 
    timeDomainData.series.length === 0 || 
    !Array.isArray(timeDomainData.series[0].data)
  ) {
    console.warn('时域波形原始数据格式错误或缺失，返回空数组');
    return [];
  }

  const { xAxis: timeStrList } = timeDomainData;
  const { data: amplitudeList } = timeDomainData.series[0];

  // 关键修正：取 xAxis 和 amplitudeList 中较短的长度，避免索引越界
  const minLength = Math.min(timeStrList.length, amplitudeList.length);
  
  return timeStrList.slice(0, minLength).map((timeStr, index) => [
    parseFloat(timeStr) || 0, // 确保时间是数字（空值用0兜底）
    // 修正：从 amplitudeList 的每项中取第二个值（因为你的 amplitudeList 是 [[时间, 振幅], ...] 格式）
    Array.isArray(amplitudeList[index]) ? amplitudeList[index][1] || 0 : 0
  ]);
});

// 父组件：formattedFrequencyData 计算逻辑（与 timeDomain 对齐）
const formattedFrequencyData = computed(() => {
  const frequencyData = currentData.value?.frequency;
  // 防御性校验：确保原始数据结构完整
  if (!frequencyData || !Array.isArray(frequencyData.xAxis) || !frequencyData.series?.[0]?.data) {
    return null; // 无数据时返回 null（匹配子组件默认值）
  }

  const { xAxis: freqList } = frequencyData;
  const { data: energyList } = frequencyData.series[0];
  // 取较短长度，避免索引越界
  const minLength = Math.min(freqList.length, energyList.length);

  return freqList.slice(0, minLength).map((freq, index) => {
    // 转换为 [频率（数字）, 能量（数字）]
    const frequency = parseFloat(freq) || 0; // 字符串频率转数字
    const energy = Array.isArray(energyList[index]) ? energyList[index][1] || 0 : 0; // 取能量值
    return [frequency, energy];
  });
});

// 切换函数只需更新选中状态即可
function handleTypeChange(newType) {
  if (MockDataSource[newType]) {
    currentSelected.value = newType;
  } else {
    console.warn(`不存在的状态类型：${newType}`);
  }
}

</script>

<style scoped>
#building {
  background: url("@/assets/images/bg.jpg") center/cover no-repeat fixed;
  height: 100vh;
  overflow: hidden; /* 保持页面级不滚动 */
}

.content-container {
  flex: 1;
  overflow: auto; /* 内容区超出时显示内部滚动条 */
  padding: 0.25rem;
  /* 限制最大高度为视口剩余空间（避免撑开屏幕） */
  max-height: calc(100vh - 60px - 40px); /* 减去标题栏和类型选择栏高度 */
}

/* 标题容器：限制最小高度，避免文字换行导致高度增加 */
.title-container {
  min-height: 60px;
  max-height: 80px;
  padding: 0.5rem 0; /* 垂直内边距减小 */
}


/* 类型选择容器：固定底部高度，避免挤压内容区 */
.type-container {
  padding: 0.25rem 0; /* 垂直内边距减小 */
}

/* 修复flex子元素高度计算偏差 */
.flex-1 {
  min-height: 0; /* 允许flex子元素高度小于内容高度时收缩 */
}
</style>