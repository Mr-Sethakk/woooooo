//D:\feynman-platform-backend\middleware\auth.js

// 确保 jwt 只声明一次
const jwt = require('jsonwebtoken');

// 中间件函数
module.exports = function (req, res, next) {
    try {
        // 从多个可能的头部获取 token
        let token = req.header('x-auth-token');

        // 如果没有在 x-auth-token 中找到，尝试从 Authorization 头中获取
        if (!token && req.header('Authorization')) {
            const authHeader = req.header('Authorization');
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // 移除 "Bearer " 前缀
            }
        }

        // 如果没有 token，返回 401 错误
        if (!token) {
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }

        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};