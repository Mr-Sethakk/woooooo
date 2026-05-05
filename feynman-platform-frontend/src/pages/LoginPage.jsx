// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wrapRef = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const px = ((e.clientX - cx) / rect.width) * 100;
      const py = ((e.clientY - cy) / rect.height) * 100;
      wrap.style.setProperty('--px', px.toFixed(2));
      wrap.style.setProperty('--py', py.toFixed(2));
    };
    const onLeave = () => {
      wrap.style.setProperty('--px', '0');
      wrap.style.setProperty('--py', '0');
    };
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', onLeave);
    return () => {
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/users/login', { email, password });
      login(response.data.token);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.msg || err.response?.data?.error || '登录失败，请检查邮箱或密码';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap" ref={wrapRef}>
      <div className="auth-bg" aria-hidden>
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
        <div className="aurora" />
        <div className="grid" />
        <div className="twinkle" />
      </div>

      <div className="auth-card">
        <div className="brand">
          <div className="logo" />
          <div className="title">Feynman 学习平台</div>
          <div className="subtitle">欢迎回来，请登录账户</div>
        </div>

        {error && <div className="alert-error" style={{ marginTop: 10, marginBottom: 10 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <input
              className="input"
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <span className="label">邮箱</span>
          </div>

          <div className="field">
            <input
              className="input"
              type={showPwd ? 'text' : 'password'}
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <span className="label">密码</span>
            <button type="button" className="icon-btn" onClick={() => setShowPwd(v => !v)}>
              {showPwd ? '隐藏' : '显示'}
            </button>
          </div>

          <button type="submit" className="btn-gradient" disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="helper" style={{ marginTop: 10 }}>
          还没有账户？<Link to="/register">去注册</Link>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;
