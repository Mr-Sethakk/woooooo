// src/pages/RegisterPage.jsx
import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.username || !formData.email || !formData.password) {
      setError('请完整填写用户名、邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/users/register', formData);
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.msg || err.response?.data?.error || '注册失败，请稍后再试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <div className="auth-card fade-up" style={{ animationDelay: '.02s' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div className="brand-text" style={{ fontSize: 28, fontWeight: 900 }}>创建账户</div>
          <div className="subtle" style={{ marginTop: 6 }}>欢迎加入 Feynman 学习平台</div>
        </div>

        {error && (
          <div className="alert-error fade-up" style={{ marginBottom: 12, animationDelay: '.05s' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div className="fade-up" style={{ animationDelay: '.08s' }}>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>用户名</label>
            <input
              className="input-text"
              name="username"
              type="text"
              placeholder="请输入用户名"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div className="fade-up" style={{ animationDelay: '.11s' }}>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>邮箱</label>
            <input
              className="input-text"
              name="email"
              type="email"
              placeholder="请输入邮箱"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="fade-up" style={{ animationDelay: '.14s' }}>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>密码</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-text"
                name="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="btn-secondary"
                style={{ position: 'absolute', right: 6, top: 6, padding: '6px 10px' }}
                aria-label={showPwd ? '隐藏密码' : '显示密码'}
              >
                {showPwd ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary fade-up" style={{ animationDelay: '.17s' }} disabled={loading}>
            {loading ? '注册中…' : '注册'}
          </button>
        </form>

        <div className="fade-up" style={{ marginTop: 12, fontSize: 13, color: '#6b7280', textAlign: 'center', animationDelay: '.2s' }}>
          已有账户？
          <Link to="/login" style={{ marginLeft: 6, color: '#2563eb', textDecoration: 'none' }}>去登录</Link>
        </div>
      </div>
    </div>
  );
}
export default RegisterPage;