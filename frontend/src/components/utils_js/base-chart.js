import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";

export function useBaseChart(options) {
    const { 
        target, 
        getOption, 
        watchSource,
        // 尺寸监听与处理配置（新增更多可控参数）
        resizeOptions = { 
            includeParent: true, // 是否监听父元素
            extraElements: [], // 额外监听元素
            resizeMode: 'rerender', // 尺寸变化处理模式：'resize'（仅调整）/'rerender'（重新渲染，默认）
            debounceTime: 10 // 防抖时间（ms）
        } 
    } = options;

    let eChart = null;
    let isRendering = false;
    let resizeObserver = null;
    const observedElements = ref([]); // 记录已监听元素
    let resizeTimer = null; // 防抖计时器

    // 防抖处理（支持自定义时间）
    const debounce = (fn) => {
        return (...args) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => fn.apply(this, args), resizeOptions.debounceTime);
        };
    };

    // 尺寸变化核心处理（根据模式选择策略）
    const handleResize = debounce(async () => {
        if (!eChart || !target.value) return;

        // 模式1：仅调整大小（适合配置不依赖容器尺寸的场景）
        if (resizeOptions.resizeMode === 'resize') {
            eChart.resize();
            return;
        }

        // 模式2：重新渲染（适合配置依赖容器尺寸的场景，默认）
        if (resizeOptions.resizeMode === 'rerender') {
            await nextTick(); // 等待DOM尺寸稳定
            // 重新生成配置（此时getOption会基于最新容器尺寸计算）
            const newOption = getOption();
            eChart.setOption(newOption, true);
            eChart.resize(); // 确保尺寸同步
        }
    });

    // 初始化尺寸监听（逻辑优化）
    const initResizeObserver = () => {
        if (resizeObserver) cleanupResizeObserver(); // 先清理旧监听
        if (!target.value) return;

        // 构建监听列表（容器自身 + 父元素 + 额外元素）
        const observeElements = [target.value];
        if (resizeOptions.includeParent && target.value.parentElement) {
            observeElements.push(target.value.parentElement);
        }
        if (Array.isArray(resizeOptions.extraElements)) {
            observeElements.push(...resizeOptions.extraElements.filter(Boolean));
        }

        // 创建监听器（触发防抖处理）
        resizeObserver = new ResizeObserver(entries => {
            handleResize();
        });

        // 启动监听（去重处理）
        observeElements.forEach(el => {
            if (!observedElements.value.includes(el)) {
                resizeObserver.observe(el, { box: 'border-box' });
                observedElements.value.push(el);
            }
        });
    };

    // 清理尺寸监听（彻底移除所有关联）
    const cleanupResizeObserver = () => {
        if (resizeObserver) {
            observedElements.value.forEach(el => {
                try { resizeObserver.unobserve(el); } catch (e) {} // 兼容已移除的DOM
            });
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        observedElements.value = [];
        clearTimeout(resizeTimer);
    };

    // 渲染图表（核心方法）
// 渲染图表（核心方法）
const renderChart = async () => {
    
    if (isRendering || !target.value) return;
    isRendering = true;

    try {
        await nextTick();
        // 👇 新增：通过DOM查询所有残留实例并销毁（原代码无这部分）
        const existingInstance = echarts.getInstanceByDom(target.value);
        if (existingInstance) {
            existingInstance.dispose();
        }
        // 👇 保留初始化新实例，但无需再判断eChart（已通过DOM清理）
        eChart = echarts.init(target.value);
        // 生成并应用配置
        const option = getOption();
        eChart.setOption(option, true);
        // 初始化尺寸监听（确保监听生效）
        initResizeObserver();
    } catch (error) {
        console.error("图表渲染失败:", error);
    } finally {
        isRendering = false;
    }
};
    // 手动触发重新渲染（暴露给外部调用）
    const rerender = async () => {
        await renderChart();
    };

    // 挂载时初始化
    onMounted(() => {
        renderChart();
    });

    // 监听数据变化（支持立即执行）
    if (watchSource) {
        watch(watchSource, () => renderChart(), { 
            deep: true,
            immediate: true 
        });
    }

    // 卸载时彻底清理
    onUnmounted(() => {
        if (eChart) {
            eChart.dispose();
            eChart = null;
        }
        cleanupResizeObserver();
    });

    // 暴露外部控制方法
    return { 
        renderChart, 
        rerender, // 手动重新渲染（含配置更新）
        resize: handleResize, // 手动触发尺寸调整
        getChartInstance: () => eChart 
    };
}