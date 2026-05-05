// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FeynmanRecordPage from './pages/FeynmanRecordPage';
import QuizPage from './pages/QuizPage';
import KnowledgeQAPage from './pages/KnowledgeQAPage'; // 知识库问答页
import GraphPage from './pages/GraphPage';
import ThreeDUniversePage from './pages/ThreeDUniversePage'; // 旧3D示例页面
import KnowledgeUniversePage from './pages/KnowledgeUniversePage'; // 新力导向3D知识宇宙页面
import WelcomePage from './pages/WelcomePage';

function App() {
  return (
    <Routes>
      {/* 欢迎页面（无Layout） - 首页 */}
      <Route path="/" element={<WelcomePage />} />
      
      <Route element={<Layout />}>
        {/* 公共路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 受保护的路由 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/qa" element={<KnowledgeQAPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/3d-universe" element={<ThreeDUniversePage />} />
          <Route path="/universe" element={<KnowledgeUniversePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;