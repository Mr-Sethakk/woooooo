# 费曼学习平台 (Feynman Learning Platform)

> 基于费曼学习法的智能化知识管理与学习系统

---

## 📖 项目简介

费曼学习平台是一个融合现代Web技术与人工智能的学习管理系统，旨在帮助用户通过"以教代学"的费曼技巧来深化知识理解。平台提供知识点管理、AI智能评测、语音讲解分析、知识图谱可视化等核心功能。

---

## ✨ 核心功能

| 功能模块 | 描述 |
|---------|------|
| 🔐 **用户认证** | JWT 安全认证，支持注册/登录/权限管理 |
| 📝 **知识点管理** | 创建、编辑、删除知识点，支持 Markdown 富文本 |
| 🎙️ **费曼记录** | 录音讲解、语音转文字、AI 智能润色 |
| 🤖 **AI 助手** | DeepSeek 大模型驱动的智能评测与出题 |
| 🔍 **RAG 检索** | 私有知识库检索增强生成 |
| 🕸️ **知识图谱** | 知识点关系可视化（ECharts） |
| 🌍 **3D 可视化** | Three.js / CesiumJS 三维学习宇宙 |

---

## 🛠️ 技术栈

### 后端 (Backend)
- **Node.js** + **Express** - Web 服务框架
- **MongoDB** + **Mongoose** - 数据库与 ORM
- **JWT** - 身份认证
- **Multer** - 文件上传处理
- **DeepSeek API** - AI 能力集成
- **Bcryptjs** - 密码加密

### 前端 (Frontend)
- **React 18** + **Vite** - 前端框架与构建工具
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Quill** - 富文本编辑器
- **React-MD-Editor** - Markdown 编辑器
- **ECharts** - 数据可视化
- **Three.js / CesiumJS** - 3D 渲染引擎
- **React-Three-Fiber** - React Three.js 集成

---

## 📁 项目结构

```
feynman-platform/
├── feynman-platform-backend/          # 后端服务
│   ├── controllers/                   # 控制器层
│   ├── middleware/                    # 中间件
│   ├── models/                        # 数据模型
│   ├── routes/                        # 路由定义
│   ├── services/                      # 业务服务层
│   ├── utils/                         # 工具函数
│   ├── uploads/                       # 上传文件存储
│   ├── vector_store/                  # 向量数据库
│   ├── index.js                       # 入口文件
│   └── package.json
│
├── feynman-platform-frontend/         # 前端应用
│   ├── src/                           # 源代码
│   ├── public/                        # 静态资源
│   ├── dist/                          # 构建输出
│   └── package.json
│
└── README.md                          # 项目说明
```

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm >= 9.0 或 yarn >= 1.22

### 后端部署

```bash
cd feynman-platform-backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写以下配置：
# - MONGO_URI: MongoDB 连接字符串
# - JWT_SECRET: JWT 密钥
# - DEEPSEEK_API_KEY: DeepSeek API 密钥
# - FRONTEND_URL: 前端地址（默认 http://localhost:5173）

# 启动服务
npm start
```

后端服务默认运行在 `http://localhost:3000`

### 前端部署

```bash
cd feynman-platform-frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
```

前端开发服务器默认运行在 `http://localhost:5173`

---

## 📚 API 接口文档

### 用户认证
| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/api/users/register` | 用户注册 |
| POST | `/api/users/login` | 用户登录 |
| GET | `/api/users/profile` | 获取用户信息 |

### 知识点管理
| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/api/knowledge-points` | 获取知识点列表 |
| POST | `/api/knowledge-points` | 创建知识点 |
| GET | `/api/knowledge-points/:id` | 获取知识点详情 |
| PUT | `/api/knowledge-points/:id` | 更新知识点 |
| DELETE | `/api/knowledge-points/:id` | 删除知识点 |

### 费曼记录
| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/api/feynman-records` | 获取记录列表 |
| POST | `/api/feynman-records` | 创建费曼记录 |
| POST | `/api/feynman-records/:id/polish` | AI 润色讲解 |

### AI 服务
| 方法 | 路径 | 描述 |
|-----|------|------|
| POST | `/api/ai/evaluate` | AI 评测讲解 |
| POST | `/api/ai/generate-questions` | AI 生成题目 |
| POST | `/api/rag/ask` | RAG 知识问答 |

---

## 🔧 环境变量配置

### 后端 .env 示例

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库
MONGO_URI=mongodb://localhost:27017/feynman_platform

# JWT 密钥
JWT_SECRET=your_jwt_secret_key_here

# 前端地址
FRONTEND_URL=http://localhost:5173

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key

# 百度千帆 Embedding（可选）
QIANFAN_V2_API_KEY=your_qianfan_key
QIANFAN_V2_MODEL=your_model_name
```

---

## 🎯 核心流程

### 费曼学习流程
1. **选择知识点** - 从知识库中选择要学习的主题
2. **录音讲解** - 用自己的语言讲解该知识点（录音）
3. **语音转文字** - 系统自动将录音转为文字
4. **AI 润色** - DeepSeek 优化讲解内容
5. **智能评测** - AI 评估讲解质量并给出建议
6. **生成题目** - AI 根据知识点生成练习题

### RAG 检索流程
1. 用户输入问题
2. 系统进行向量相似度搜索
3. 检索相关知识片段
4. 结合上下文调用 LLM 生成答案
5. 返回答案及引用来源

---

## 🌟 项目亮点

- ✅ **模块化架构** - Controller / Service / Model 分层设计
- ✅ **AI 深度集成** - DeepSeek 大模型赋能全流程
- ✅ **RAG 知识库** - 支持私有知识检索增强
- ✅ **3D 可视化** - Three.js + CesiumJS 双引擎渲染
- ✅ **响应式设计** - 适配桌面端与移动端
- ✅ **JWT 安全认证** - 完善的权限控制机制

---

## 📝 待优化项

- [ ] 单元测试覆盖（Jest / Vitest）
- [ ] 集中式日志系统（Pino + ElasticStack）
- [ ] 向量数据库升级（Milvus / PGVector）
- [ ] Docker 容器化部署
- [ ] CI/CD 自动化流水线

---

## 📄 许可证

ISC License

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

---

> 基于《大前端与AI实战》课程项目开发
> 
> © 2025 Feynman Learning Platform. All rights reserved.
