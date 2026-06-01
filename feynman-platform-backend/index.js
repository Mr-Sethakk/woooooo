// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // 添加path模块
const fs = require('fs'); // 添加fs模块
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting server...');

// 环境变量健康检查（掩码输出）
(() => {
  const mask = (v) => (v ? String(v).slice(0, 12) + '...' : 'MISSING');
  console.log('🧪 ENV CHECK:', {
    EMBEDDINGS_PROVIDER: process.env.EMBEDDINGS_PROVIDER || 'MISSING',
    QIANFAN_V2_EMBEDDING_ENDPOINT: process.env.QIANFAN_V2_EMBEDDING_ENDPOINT ? 'OK' : 'MISSING',
    QIANFAN_V2_MODEL: process.env.QIANFAN_V2_MODEL || 'MISSING',
    QIANFAN_V2_API_KEY: mask(process.env.QIANFAN_V2_API_KEY),
    DEEPSEEK_API_KEY: mask(process.env.DEEPSEEK_API_KEY),
  });
})();

// 中间件 - 确保CORS配置正确
app.use(cors({
  origin: function (origin, callback) {
    // 允许的前端地址列表
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    // 允许无 origin 的请求（比如 curl、Postman）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// 数据库连接
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 🔧 调试：检查路由文件是否存在
const routesDir = path.join(__dirname, 'routes');
console.log('📁 Routes directory:', routesDir);

const routesToCheck = [
  'users.js',
  'knowledgePoints.js', 
  'feynmanRecords.js',
  'ai.js',
  'graph.js'
];

routesToCheck.forEach(routeFile => {
  const filePath = path.join(routesDir, routeFile);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found route file: ${routeFile}`);
  } else {
    console.log(`❌ Missing route file: ${routeFile}`);
  }
});

// API 路由配置 - 添加错误处理
try {
  console.log('🔧 Loading routes...');
  
  app.use('/api/users', require('./routes/users'));
  console.log('✅ Loaded /api/users route');
  
  app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
  console.log('✅ Loaded /api/knowledge-points route');
  
  app.use('/api/feynman-records', require('./routes/feynmanRecords'));
  console.log('✅ Loaded /api/feynman-records route');
  
  app.use('/api/ai', require('./routes/ai'));
  console.log('✅ Loaded /api/ai route');
  
  app.use('/api/rag', require('./routes/rag'));
  console.log('✅ Loaded /api/rag route');

  app.use('/api/debug', require('./routes/debug'));
  console.log('✅ Loaded /api/debug route');
  
  app.use('/api/graph', require('./routes/graph'));
  console.log('✅ Loaded /api/graph route');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// 测试路由（不需要认证）
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint works!',
    timestamp: new Date().toISOString(),
    status: 'active'
  });
});

app.get('/api/knowledge-points/test', (req, res) => {
  res.json({ 
    message: 'knowledge-points test endpoint works!',
    timestamp: new Date().toISOString(),
    path: '/api/knowledge-points/test'
  });
});

// 根路由测试
app.get('/', (req, res) => {
  res.json({ 
    message: 'Feynman Platform API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/users',
      knowledgePoints: '/api/knowledge-points', 
      feynmanRecords: '/api/feynman-records',
      ai: '/api/ai',
      test: '/api/test',
      knowledgePointsTest: '/api/knowledge-points/test'
    }
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 正确的 404 处理 - 放在所有路由之后
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Feynman Platform backend is running at http://localhost:${port}`);
  console.log(`📚 Available endpoints:`);
  console.log(`   - http://localhost:${port}/ (API信息)`);
  console.log(`   - http://localhost:${port}/health (健康检查)`);
  console.log(`   - http://localhost:${port}/api/test (测试路由)`);
  console.log(`   - http://localhost:${port}/api/knowledge-points/test (知识点测试)`);
  console.log(`   - http://localhost:${port}/api/users (用户认证)`);
  console.log(`   - http://localhost:${port}/api/knowledge-points (知识点)`);
  console.log(`   - http://localhost:${port}/api/feynman-records (费曼记录)`);
  console.log(`   - http://localhost:${port}/api/ai (AI服务)`);
});