import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 5000
});

request.interceptors.response.use(
  (response) => {
    const res = response.data;

    // 校验必选字段（success 和 timestamp）
    if (res.success === undefined || !res.timestamp) {
      console.error('后端响应格式错误：缺少 success 或 timestamp');
      return Promise.reject(new Error('格式错误')); // 这里会抛出错误
    }

    // 校验通过，返回数据
    return res;
  },
  (error) => {
    console.error('请求失败：', error.message);
    return Promise.reject(error);
  }
);

export default request;