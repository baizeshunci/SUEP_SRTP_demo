<template>
    <div class="chart-stack-container relative w-full h-full overflow-hidden">
        <!-- 压力趋势图容器 -->
        <div ref="chartCard"
            class="temperature-chart-card bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out">
            <!-- 标题栏 -->
            <div class="chart-header px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
                <div class="chart-title text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">压力趋势图</div>
                <div class="chart-unit text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
                    压力 / 时间
                </div>
            </div>
            <!-- 图表容器 -->
            <div ref="target" class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
import { useBaseChart } from "./utils_js/base-chart";
import { getGridConfig, getAxisBaseConfig, getTooltipBaseConfig, getXAxisLabelFormatter, getYAxisLabelFormatter } from "./utils_js/chart_utils";

// 接收父组件传入的数据
const props = defineProps({
    data: {
        type: Object,
        required: true,
        validator: (value) => {
            return value.xAxis && value.series &&
                Array.isArray(value.xAxis) &&
                Array.isArray(value.series) &&
                value.xAxis.length > 0 &&
                value.series.length > 0;
        }
    }
});

// 引用DOM容器
const target = ref(null);


const getGrid = () => {
    return getGridConfig(target.value, {
        type: 'Stress_time' // 对应通用配置中的温度图表规则
    });
};

useBaseChart({
    target: target, // 图表容器的ref（已在组件中定义）
    getOption: () => { // 生成当前图表的个性化配置
        const grid = getGrid();
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                ...getTooltipBaseConfig(),
                textStyle: { color: '#e5e7eb' },
                formatter: (params) => {
                    // 1. 先获取x轴坐标（所有系列共享同一个x值）
                    let result = `${params[0].name}<br/>`;

                    // 2. 遍历所有系列，拼接每个系列的数据
                    params.forEach(item => {
                        result += `${item.seriesName}: ${item.value}<br/>`;
                    });

                    // 3. 去除最后一个多余的换行符
                    return result.replace(/<br\/>$/, '');
                }
            },
            grid,
            xAxis: {
                ...getAxisBaseConfig('category'),
                data: props.data.xAxis,
                boundaryGap: false,
                axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
                axisLabel: {
                    ...getAxisBaseConfig('category').axisLabel,
                    rotate: 0,
                    margin: 8,
                    formatter: getXAxisLabelFormatter({ intervalPixel: 45, target, data: props.data.xAxis })
                },
                showMaxLabel: true,
            },
            yAxis: {
                ...getAxisBaseConfig('value'),
                axisLabel: {
                    ...getAxisBaseConfig('value').axisLabel,
                    formatter: (value, index) => {
                        // 调用y轴专用格式化工具计算是否显示标签
                        const shouldShow = getYAxisLabelFormatter({
                            intervalPixel: 30, // 垂直方向每个标签的间隔像素
                            target: target,    // 图表容器引用
                            splitNumber: 4     // 与下方splitNumber保持一致
                        })(value, index);

                        // 显示的标签，不显示的返回空
                        return shouldShow ? `${value}` : '';
                    }
                },
            },
            series: props.data.series.map((item) => ({
                name: item.name || '温度',
                type: 'line',
                smooth: item.smooth !== undefined ? item.smooth : true,
                symbol: 'circle',
                symbolSize: 6,
                showSymbol: false,
                emphasis: {
                    showSymbol: true,
                    symbolSize: 8
                },
                lineStyle: {
                    width: 2,
                    color: item.color || '#FF5722'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: `${item.color || '#FF5722'}33` },
                            { offset: 1, color: `${item.color || '#FF5722'}00` }
                        ]
                    }
                },
                data: item.data,
                markLine: {
                    silent: false,
                    tooltip: {
                        show: true,
                        trigger: 'item',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        textStyle: { color: '#fff' },
                        formatter: (params) => `${params.data.name}: ${params.data.yAxis || params.value.toFixed(1)}°C`
                    },
                    label: { show: false },
                    symbol: 'none',
                    lineStyle: { type: 'dashed', width: 1.5 },
                    data: [
                        { type: 'average', name: '平均温度', lineStyle: { color: '#52c41a' } }
                    ]
                }
            }))
        };
    },
    watchSource: () => props.data // 监听数据变化
});

</script>
<style lang="scss" scoped>

@use "../styles/chart_common" as *; 

.temperature-chart-card {
    width: 100%;
    height: 100%;
    position: relative;
    box-sizing: border-box;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        border: 0.1em solid rgba(255, 87, 34, 0.3);
        border-radius: 0.4em;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s;
    }

    &:hover::before {
        opacity: 1;
    }
}
</style>