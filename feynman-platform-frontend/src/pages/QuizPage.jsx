// src/pages/QuizPage.jsx
import { useEffect, useState } from 'react';
import AuroraBackground from '../components/AuroraBackground';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [kp, setKp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null); // { isCorrect, explanation }
  const [fetchingQuestion, setFetchingQuestion] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get(`/knowledge-points/${id}`);
        setKp(data);
      } catch (e) {
        console.error(e);
        setError('加载知识点失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getDifficultyBadge = (difficulty) => {
    if (difficulty === '基础') return { emoji: '🟢', bg: '#c8e6c9', color: '#2e7d32' };
    if (difficulty === '中等') return { emoji: '🟡', bg: '#fff9c4', color: '#f57f17' };
    return { emoji: '🔴', bg: '#ffccbc', color: '#d84315' };
  };

  const fetchQuestion = async (difficulty) => {
    if (!kp) return;
    setFetchingQuestion(true);
    setQuestion(null);
    setResult(null);
    setSelected('');
    setError('');
    try {
      const { data } = await apiClient.post('/ai/generate-question', {
        knowledgePointContent: kp.content,
        difficulty,
        questionType: 'single-choice'
      });
      setQuestion(data);
    } catch (e) {
      console.error(e);
      setError('获取题目失败，请稍后重试');
    } finally {
      setFetchingQuestion(false);
    }
  };

  const updateReviewStatus = async (needsReview) => {
    try {
      await apiClient.put(`/knowledge-points/${id}`, { reviewList: needsReview });
    } catch (e) {
      console.error('更新复习状态失败', e);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!selected) return alert('请选择一个答案');
    const isCorrect = selected === question.answer;
    setResult({ isCorrect, explanation: question.explanation });
    if (!isCorrect) updateReviewStatus(true);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>📚 正在加载...</div>
    );
  }

  if (error && !kp) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#d32f2f' }}>{error}</div>
    );
  }

  return (
    <div className="page-wrap" style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: 'white' }}>
      <AuroraBackground />
      <div className="page-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div className="card card-glass" style={{ padding: '32px', marginBottom: '24px' }}>
          <h1 className="section-title" style={{ fontSize: '32px', marginBottom: '8px' }}>📝 知识点测评</h1>
          <p className="section-sub" style={{ fontSize: '15px' }}>知识点：<strong>{kp?.title}</strong></p>
        </div>

      {!question && !result && (
        <div className="card card-glass" style={{ padding: '28px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px', fontWeight: '600', fontSize: '16px', color: '#334155' }}>🎯 选择难度开始出题</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button disabled={fetchingQuestion} onClick={() => fetchQuestion('基础')} className="kp-action-btn kp-btn-recite" style={{ minWidth: '120px' }}>🟢 基础</button>
            <button disabled={fetchingQuestion} onClick={() => fetchQuestion('中等')} className="kp-action-btn kp-btn-quiz" style={{ minWidth: '120px' }}>🟡 中等</button>
            <button disabled={fetchingQuestion} onClick={() => fetchQuestion('困难')} className="kp-action-btn kp-btn-delete" style={{ minWidth: '120px' }}>🔴 困难</button>
          </div>
        </div>
      )}

      {fetchingQuestion && (
        <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 16 }}>🤖 AI 正在出题，请稍候...</div>
      )}

      {question && !result && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            {(() => {
              const b = getDifficultyBadge(question.difficulty);
              return (
                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, background: b.bg, color: b.color, fontSize: 12, fontWeight: 'bold' }}>
                  {b.emoji} {question.difficulty}
                </span>
              );
            })()}
          </div>

          <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 'bold' }}>{question.question}</div>

          {question.type === 'single-choice' && question.options && (
            <form onSubmit={onSubmit}>
              <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                {Object.entries(question.options).map(([key, text]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #ddd', borderRadius: 6, background: selected === key ? '#e3f2fd' : '#fff' }}>
                    <input type="radio" name="opt" value={key} checked={selected === key} onChange={(e) => setSelected(e.target.value)} />
                    <span style={{ fontWeight: 'bold', color: '#2196F3' }}>{key}.</span>
                    <span style={{ color: 'black' }}>{text}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={!selected} className="kp-action-btn kp-btn-recite" style={{ width: '100%', padding: '14px', fontSize: '16px', background: !selected ? '#ccc' : undefined }}>✅ 提交答案</button>
            </form>
          )}
        </div>
      )}

      {result && (
        <div style={{ background: '#fff', border: `2px solid ${result.isCorrect ? '#4CAF50' : '#F44336'}`, borderRadius: 8, padding: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 20, fontWeight: 'bold', color: result.isCorrect ? '#4CAF50' : '#F44336' }}>
            {result.isCorrect ? '回答正确！🎉' : '回答错误 😢'}
          </div>
          <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 6, marginBottom: 10 }}>
            <div style={{ marginBottom: 6 }}>你的答案：<strong style={{ color: result.isCorrect ? '#4CAF50' : '#F44336' }}>{selected}. {question.options[selected]}</strong></div>
            <div>正确答案：<strong style={{ color: '#4CAF50' }}>{question.answer}. {question.options[question.answer]}</strong></div>
          </div>
          <div style={{ background: '#f0f7ff', padding: 12, borderRadius: 6, borderLeft: '4px solid #2196F3', marginBottom: 10 }}>
            <div style={{ fontWeight: 'bold', color: '#2196F3', marginBottom: 6 }}>解释</div>
            <div>{result.explanation}</div>
          </div>
          {!result.isCorrect && (
            <div style={{ background: '#fff3cd', padding: 12, borderRadius: 6, borderLeft: '4px solid #FF9800', color: '#856404', marginBottom: 10 }}>
              该知识点已加入你的复习列表。
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => fetchQuestion(question.difficulty)} className="kp-action-btn kp-btn-quiz" style={{ flex: 1, minWidth: 140, padding: '14px', fontSize: '16px' }}>🔄 再来一题</button>
            <button onClick={() => navigate('/dashboard')} className="kp-action-btn kp-btn-edit" style={{ flex: 1, minWidth: 140, padding: '14px', fontSize: '16px' }}>↩️ 返回主页</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default QuizPage;

