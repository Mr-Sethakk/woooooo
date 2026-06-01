// src/components/Layout.jsx
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

function Layout() {
  const { token, logout } = useAuth();
  const [navVisible, setNavVisible] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouseY(e.clientY);
      // 鼠标在顶部80px内显示导航栏
      if (e.clientY < 80) {
        setNavVisible(true);
      } else if (e.clientY > 150) {
        setNavVisible(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="app-layout">
      <div 
        className={`navbar navbar-auto-hide ${navVisible ? 'navbar-visible' : ''}`}
        onMouseEnter={() => setNavVisible(true)}
        onMouseLeave={() => mouseY > 150 && setNavVisible(false)}
      >
        <div className="navbar-inner">
          <div className="nav-brand">Feynman 学习平台</div>
          <Link className="nav-link" to="/dashboard">主页</Link>
          <Link className="nav-link" to="/qa">知识库问答</Link>
          <Link className="nav-link" to="/graph">知识图谱</Link>
          <Link className="nav-link" to="/universe">知识宇宙</Link>
          <div style={{ flex: 1 }} />
          {!token ? (
            <>
              <Link className="nav-link" to="/login">登录</Link>
              <Link className="nav-link" to="/register">注册</Link>
            </>
          ) : (
            <button className="btn-secondary" onClick={logout}>退出登录</button>
          )}
        </div>
      </div>

      <main style={{ padding: '1rem', paddingTop: '0' }}>
        <Outlet /> 
      </main>
    </div>
  );
}
export default Layout;