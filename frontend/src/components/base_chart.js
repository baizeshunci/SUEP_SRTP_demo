// utils_js/base-chart.js（修复后的模板，不改动）
let echarts = null;

export class BaseChart {
  constructor(options) {
    this.data = options.data;
    this.chartContainer = options.chartContainer;
    this.chartInstance = null;
    this.loading = false;
    this.initTimer = null;
    this.init();
  }

  // 模板固定流程：初始化总逻辑
  init() {
    this.beforeInit();
    if (!this.chartContainer?.value) {
      if (this.initTimer) clearTimeout(this.initTimer);
      this.initTimer = setTimeout(() => this.init(), 100);
      return;
    }
    this.mountChart();
    this.afterInit();
    this.watchDataChange();
  }

  // 模板固定方法：挂载图表
  mountChart() {
    if (!this.chartContainer?.value) throw new Error("容器不存在");
    this.loading = true;

    if (!echarts) {
      import('echarts').then((m) => {
        echarts = m.default;
        this.initEchartsInstance();
      }).catch(err => {
        console.error("ECharts导入失败:", err);
        this.loading = false;
      });
    } else {
      this.initEchartsInstance();
    }
  }

  // 模板私有方法：初始化ECharts实例
  initEchartsInstance() {
    try {
      this.chartInstance = echarts.init(this.chartContainer.value);
      this.chartInstance.setOption(this.getChartOption());
      this.loading = false;
    } catch (err) {
      console.error("实例初始化失败:", err);
      this.loading = false;
    }
  }

  // 模板固定方法：更新图表
  updateChart() {
    if (!this.chartInstance || !this.data?.value) return;
    try {
      this.beforeUpdate();
      this.chartInstance.setOption(this.getChartOption(), true);
      this.afterUpdate();
    } catch (err) {
      console.error("图表更新失败:", err);
    }
  }

  // 模板固定方法：监听数据变化
  watchDataChange() {
    if (!this.data || !this.data.value) return;
    this.data.value = new Proxy(this.data.value, {
      set: (t, p, v) => {
        t[p] = v;
        this.updateChart();
        return true;
      }
    });
  }

  // 模板固定方法：销毁图表
  destroy() {
    if (this.initTimer) clearTimeout(this.initTimer);
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }

  // -------------------------- 抽象方法：留给温度图实现（核心差异） --------------------------
  getChartOption() { throw new Error("子类必须实现getChartOption"); }
  getChartTitle() { throw new Error("子类必须实现getChartTitle"); }
  getChartUnit() { throw new Error("子类必须实现getChartUnit"); }

  // -------------------------- 钩子方法：温度图可选重写 --------------------------
  beforeInit() {}
  afterInit() {}
  beforeUpdate() {}
  afterUpdate() {}

  // -------------------------- 通用工具：温度图直接复用 --------------------------
  getTooltipConfig() {
    return { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.7)', textStyle: { color: '#fff' }, borderWidth: 0 };
  }
  getGridConfig() { return { left: '3%', right: '4%', bottom: '3%', containLabel: true }; }
  getAxisBaseConfig(type) {
    return {
      type,
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#ccc', fontSize: 12 },
      splitLine: { lineStyle: { color: '#333' } }
    };
  }
}

// 正确的 useBaseChart 实现（请逐行核对）
export const useBaseChart = (options) => {
  const chartInstance = new BaseChart(options);
  return {
    destroy: () => chartInstance.destroy(),
    getLoading: () => chartInstance.loading,
    resize: () => chartInstance.chartInstance?.resize(),
    // 以下两行必须存在，且拼写正确
    getChartTitle: () => chartInstance.getChartTitle(),  // 注意大小写和函数名
    getChartUnit: () => chartInstance.getChartUnit()
  };
};