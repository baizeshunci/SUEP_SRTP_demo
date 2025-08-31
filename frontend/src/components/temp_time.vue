<template>
    <div class="chart-stack-container relative w-full h-full overflow-hidden">
        <!-- 温度趋势图容器 -->
        <div ref="chartCard"
            class="temperature-chart-card bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out">
            <!-- 标题栏 -->
            <div class="chart-header px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
                <div class="chart-title text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">温度趋势图</div>
                <div class="chart-unit text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
                    温度 / 时间
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
import { getGridConfig, getAxisBaseConfig, getTooltipBaseConfig, getXAxisLabelFormatter, getYAxisLabelFormatter } from "../utils/chart_utils";

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
        type: 'temperature' // 对应通用配置中的温度图表规则
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
                formatter: (params) => {
                    // 1. 先获取x轴坐标（所有系列共享同一个x值）
                    let result = `${params[0].name}<br/>`;

                    // 2. 遍历所有系列，拼接每个系列的数据
                    params.forEach(item => {
                        result += `${item.seriesName}: ${item.value}°C<br/>`;
                    });

                    // 3. 去除最后一个多余的换行符
                    return result.replace(/<br\/>$/, '');
                }
            },
            grid,
            xAxis: {
                // 1. 复用通用坐标轴样式（仅样式，无数据逻辑）
                ...getAxisBaseConfig('category'),
                // 2. 业务组件自行管理数据和个性化逻辑（核心）
                data: props.data.xAxis, // 绑定x轴原始数据（如时间数组）
                boundaryGap: false, // 温度图表特有：取消坐标轴两边留白
                axisLabel: {
                    // 合并通用样式（颜色、字体）和个性化配置
                    ...getAxisBaseConfig('category').axisLabel,
                    rotate: 0, // 温度图表x轴标签不旋转
                    margin: 8, // 标签与轴线的距离
                    // 温度图表特有：控制标签显示间隔（避免拥挤）
                    formatter: getXAxisLabelFormatter({ intervalPixel: 45, target, data: props.data.xAxis })
                },
                showMaxLabel: true, // 强制显示最后一个标签
                // 如需覆盖通用样式，可在此添加（如隐藏分割线）
                // splitLine: { show: false }
            },
            // y轴核心配置（复用样式 + 温度数据特性）
            // y轴核心配置（复用样式 + 温度数据特性 + 间隔计算）
            yAxis: {
                // 1. 复用通用坐标轴样式
                ...getAxisBaseConfig('value'),
                // 2. 温度图表y轴特有的配置
                axisLabel: {
                    // 合并通用样式
                    ...getAxisBaseConfig('value').axisLabel,
                    // 结合y轴专用间隔计算 + 温度单位
                    formatter: (value, index) => {
                        // 调用y轴专用格式化工具计算是否显示标签
                        const shouldShow = getYAxisLabelFormatter({
                            intervalPixel: 30, // 垂直方向每个标签的间隔像素
                            target: target,    // 图表容器引用
                            splitNumber: 5     // 与下方splitNumber保持一致
                        })(value, index);

                        // 显示的标签添加℃单位，不显示的返回空
                        return shouldShow ? `${value}` : '';
                    }
                },
                // 3. 温度数据范围控制（支持父组件传入，无默认值则自动计算）
                min: props.minTemp !== undefined ? props.minTemp : null,
                max: props.maxTemp !== undefined ? props.maxTemp : null,
                // 4. 分割线优化（固定分割数，与间隔计算关联）
                splitNumber: 5,
                // 5. 网格线样式增强（可选优化）
                splitLine: {
                    ...getAxisBaseConfig('value').splitLine,
                    lineStyle: {
                        ...getAxisBaseConfig('value').splitLine.lineStyle,
                        type: 'dashed' // 温度图表网格线用虚线更易区分
                    }
                }
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
                        { yAxis: 30, name: '高温阈值', lineStyle: { color: '#ff4d41' } },
                        { yAxis: 10, name: '低温阈值', lineStyle: { color: '#1890ff' } },
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