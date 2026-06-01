// src/pages/WelcomePage.jsx - 炫酷欢迎动画
import { useEffect, useState } from 'react';
import AuroraBackground from '../components/AuroraBackground';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function WelcomePage() {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    // 如果已经看过欢迎动画，直接跳转
    if (sessionStorage.getItem('welcomePlayed')) {
      navigate(token ? '/dashboard' : '/login', { replace: true });
      return;
    }

    // 进度条动画
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setShowContent(true), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(progressInterval);
  }, [token, navigate]);

  const handleEnter = () => {
    const overlay = document.querySelector('.welcome-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.8s ease-out forwards';
      setTimeout(() => {
        // 标记已看过欢迎动画
        sessionStorage.setItem('welcomePlayed', 'true');
        // 如果已登录，跳转到主页，否则跳转到登录页
        navigate(token ? '/dashboard' : '/login');
      }, 800);
    }
  };

  return (
    <div className="welcome-overlay">
      <AuroraBackground />

      {/* 主内容 */}
      <div className="welcome-content">
        {!showContent ? (
          <div className="loading-section">
            <div className="logo-animation">
              <div className="logo-ring logo-ring-1"></div>
              <div className="logo-ring logo-ring-2"></div>
              <div className="logo-ring logo-ring-3"></div>
              <div className="logo-center">
                <span style={{ fontSize: 64 }}>🌭</span>
              </div>
            </div>
            
            <h1 className="welcome-title">Feynman 学习平台</h1>
            <p className="welcome-subtitle">知识热狗宇宙正在初始化...</p>
            
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">{progress}%</div>
          </div>
        ) : (
          <div className="enter-section">
            <div className="welcome-logo-large">
              <div className="logo-glow"></div>
              <span style={{ fontSize: 120 }}>🌭</span>
            </div>
            
            <h1 className="main-title">
              <span className="title-word">Feynman</span>
              <span className="title-word">学习平台</span>
            </h1>
            
            <p className="main-subtitle">
              用费曼学习法掌握知识 | 在热狗宇宙中探索真理
            </p>
            
            <button className="enter-button" onClick={handleEnter}>
              <span className="button-text">进入宇宙</span>
              <span className="button-icon">🚀</span>
            </button>
            
            <div className="features">
              <div className="feature-item">
                <span className="feature-icon">🎤</span>
                <span className="feature-text">语音复述</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span className="feature-text">AI评价</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">知识图谱</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💡</span>
                <span className="feature-text">智能测评</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .welcome-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
        }

        .welcome-content {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .loading-section, .enter-section {
          text-align: center;
          animation: fadeIn 1s ease-out;
        }

        .logo-animation {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 40px;
        }

        .logo-ring {
          position: absolute;
          inset: 0;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: rotate 3s linear infinite;
        }

        .logo-ring-1 { animation-duration: 3s; }
        .logo-ring-2 { animation-duration: 4s; animation-direction: reverse; }
        .logo-ring-3 { animation-duration: 5s; }

        .logo-center {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s ease-in-out infinite;
        }

        .welcome-title {
          font-size: 48px;
          font-weight: 900;
          margin-bottom: 16px;
          background: linear-gradient(120deg, #fff, #f0f9ff, #fff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 3s ease-in-out infinite;
          background-size: 200% 100%;
        }

        .welcome-subtitle {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 40px;
        }

        .progress-container {
          width: 300px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          margin: 0 auto 16px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #fff, #f0f9ff, #fff);
          border-radius: 10px;
          transition: width 0.3s ease;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
        }

        .progress-text {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .welcome-logo-large {
          position: relative;
          margin-bottom: 40px;
          animation: logoFloat 3s ease-in-out infinite;
        }

        .logo-glow {
          position: absolute;
          inset: -40px;
          background: radial-gradient(circle, rgba(255, 215, 0, 0.4), transparent 70%);
          animation: glowPulse 2s ease-in-out infinite;
        }

        .main-title {
          font-size: 72px;
          font-weight: 900;
          margin-bottom: 24px;
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .title-word {
          background: linear-gradient(120deg, #fff 0%, #f0f9ff 50%, #fff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 3s ease-in-out infinite;
          background-size: 200% 100%;
          text-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
        }

        .title-word:nth-child(2) {
          animation-delay: 0.5s;
        }

        .main-subtitle {
          font-size: 22px;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 60px;
          font-weight: 300;
          letter-spacing: 1px;
        }

        .enter-button {
          padding: 20px 60px;
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #f0f9ff 100%);
          color: #667eea;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 40px rgba(255, 255, 255, 0.3);
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 60px;
        }

        .enter-button:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 15px 60px rgba(255, 255, 255, 0.5);
        }

        .button-text {
          letter-spacing: 2px;
        }

        .button-icon {
          font-size: 28px;
          animation: rocketBounce 1s ease-in-out infinite;
        }

        .features {
          display: flex;
          gap: 40px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          opacity: 0;
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .feature-item:nth-child(1) { animation-delay: 0.2s; }
        .feature-item:nth-child(2) { animation-delay: 0.4s; }
        .feature-item:nth-child(3) { animation-delay: 0.6s; }
        .feature-item:nth-child(4) { animation-delay: 0.8s; }

        .feature-icon {
          font-size: 48px;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
        }

        .feature-text {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(30px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0% { 
            transform: translateY(100vh) translateX(0); 
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { 
            transform: translateY(-100vh) translateX(50px); 
            opacity: 0;
          }
        }

        @keyframes gradientShift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(180deg); }
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }

        @keyframes rocketBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

export default WelcomePage;

