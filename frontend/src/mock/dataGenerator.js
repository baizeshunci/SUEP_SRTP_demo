/**
 * 生成符合后端Response结构体的JavaScript数据
 * - success (bool, 必选)
 * - data (any, 可选)
 * - message (string, 可选)
 * - error (*ErrorObj, 可选)
 * - pagination (*PaginationObj, 可选)
 * - timestamp (time.Time, 必选)
 * 
 * @param {string} type - 业务类型标识（如'正常数据'、'错误数据'、'分页数据'）
 * @returns {Object} 符合格式的响应数据
 */
function generateResponseData(type) {
    // 基础结构（必选字段）
    const response = {
        success: true, // 默认为成功
        timestamp: new Date().toISOString() // 时间戳（与Go的time.Time序列化格式兼容）
    };

    // 根据业务类型生成不同数据
    switch (type) {
        // 1. 正常业务数据（带data字段）
        case 'normal':
            response.message = '操作成功'; // 可选成功消息
            response.data = {
                // 这里填充具体业务数据（示例）
                metrics: [
                    { name: '温度', value: 36.5, unit: '℃' },
                    { name: '压力', value: 1.2, unit: 'MPa' }
                ],
                trend: {
                    x: ['0s', '1s', '2s'],
                    y: [36.5, 36.6, 36.7]
                }
            };
            break;

        // 2. 分页数据（带pagination字段）
        case 'pagination':
            response.message = '分页查询成功';
            response.pagination = {
                total: 100,    // 总条数
                page: 1,       // 当前页
                pageSize: 10,  // 每页条数
                pages: 10      // 总页数
            };
            response.data = {
                list: Array(10).fill().map((_, i) => ({
                    id: i + 1,
                    name: `数据项${i + 1}`
                }))
            };
            break;

        // 3. 错误数据（带error字段）
        case 'error':
            response.success = false; // 标记失败
            response.error = {
                code: 'E1001',       // 错误码
                message: '参数错误',  // 错误信息
                detail: '温度值不能为负数' // 可选详细信息
            };
            // 错误时通常不带data，或只带错误上下文
            response.data = null;
            break;

        // 4. 默认情况（空数据）
        default:
            response.message = '无数据';
            // 可选字段可省略（利用omitempty特性）
            // 不设置data、error、pagination即表示省略
    }

    return response;
}

// 导出供Mock使用
export default generateResponseData;
