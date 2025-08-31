import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 导入 Mock 配置（关键：让 Mock 拦截请求）
// 注意路径：如果 mock 文件夹在 src 下，路径是 './mock/dashboardMock.js'
import './mock/dashboardMock.js';

createApp(App).mount('#app')