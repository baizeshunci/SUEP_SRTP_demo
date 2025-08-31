import Mock from 'mockjs';

// 测试接口：直接写出完整响应结构，确保包含success和timestamp
Mock.mock('/api/dashboard/test', 'get', function() {
  // 直接返回完整格式，不依赖任何工具函数
  return {
    "success": true,  // 明确包含success
    "timestamp": new Date().toISOString(),  // 明确包含timestamp
    "data": {
      "message": "测试接口响应成功"
    },
    "message": "操作成功"
  };
});

// 业务接口：同样直接写出完整结构
Mock.mock('/api/dashboard/data', 'get', function(config) {
  return {
    "success": true,
    "timestamp": new Date().toISOString(),
    "data": {
      "temperature": { "xAxis": [], "series": [] },
      "pressure": { "xAxis": [], "series": [] },
      "pulse": { "xAxis": [], "series": [] },
      "timeDomain": { "xAxis": [], "series": [] },
      "frequency": { "xAxis": [], "series": [] }
    }
  };
});
