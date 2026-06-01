// src/pages/KnowledgeQAPage.jsx
import { useEffect, useMemo, useState } from 'react';
import ragService from '../services/ragService';
import apiClient from '../api/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';


function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button onClick={copy} className="btn-secondary" style={{ minWidth: 90 }}>
      {copied ? '已复制 ✓' : '复制答案'}
    </button>
  );
}

function ConfidenceBar({ score }) {
  const pct = Math.max(0, Math.min(1, score || 0)) * 100;
  const color = pct > 80 ? '#4CAF50' : pct > 60 ? '#8BC34A' : pct > 40 ? '#FFC107' : '#FF9800';
  return (
    <div style={{ background: '#f1f1f1', borderRadius: 6, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}

export default function KnowledgeQAPage() {
  // 取消手动选择知识点，默认检索全部
  // const [kps, setKps] = useState([]);
  // const [selectedIds, setSelectedIds] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.2);
  const [history, setHistory] = useState([]);
  const [indexStatus, setIndexStatus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const load = async () => {
      // 加载索引状态
      try {
        const statusRes = await apiClient.get('/rag/index/status');
        setIndexStatus(statusRes.data);
      } catch (e) {
        console.error('获取索引状态失败:', e);
      }

      // 从 localStorage 加载历史记录
      const savedHistory = localStorage.getItem('qa_history');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('解析历史记录失败:', e);
        }
      }
    };
    load();
  }, []);


  const canAsk = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  const rebuildIndex = async () => {
    if (!window.confirm('确定要重建向量索引吗？这可能需要几分钟时间。')) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post('/rag/index/rebuild');
      alert(`重建完成！成功: ${data.success}, 失败: ${data.fail}`);
      const statusRes = await apiClient.get('/rag/index/status');
      setIndexStatus(statusRes.data);
    } catch (e) {
      alert('重建失败: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空历史记录吗？')) {
      setHistory([]);
      localStorage.removeItem('qa_history');
    }
  };

  const loadFromHistory = (item) => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setSources(item.sources);
  };

  const onAsk = async (e) => {
    e?.preventDefault();
    if (!canAsk) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);
    try {
      const data = await ragService.query({
        question: question.trim(),
        topK,
        minScore,
      });
      const ans = data.answer || '';
      const srcs = Array.isArray(data.sources) ? data.sources : [];
      setAnswer(ans);
      setSources(srcs);
      // 保存历史
      const item = { id: Date.now(), question: question.trim(), answer: ans, sources: srcs, time: new Date().toISOString() };
      const newHistory = [item, ...history].slice(0, 20);
      setHistory(newHistory);
      try { localStorage.setItem('qa_history', JSON.stringify(newHistory)); } catch {}
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-bg" aria-hidden>
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
        <div className="aurora-lite" />
      </div>
      <div className="page-content">
      <div className="container">
      {/* 索引状态卡片 */}
      {indexStatus && (
        <div className="card card-glass" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
          <div className="card-header" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
            📊 向量索引状态
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>总向量数</div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{indexStatus.totalItems}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>我的向量数</div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{indexStatus.userItems}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>已索引知识点</div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{Object.keys(indexStatus.byKp || {}).length}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>向量模型</div>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>{indexStatus.model || 'N/A'}</div>
              </div>
            </div>
            <button onClick={rebuildIndex} disabled={loading} className="btn-secondary" style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
              🔄 重建索引
            </button>
          </div>
        </div>
      )}

      <div className="card card-glass" style={{ marginBottom: 16 }}>
        <div className="card-header row" style={{ justifyContent: 'space-between' }}>
          <span>💬 知识库问答</span>
          <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }}>
            {showSettings ? '隐藏设置' : '显示设置'}
          </button>
        </div>
        <div className="card-body">
          <form onSubmit={onAsk} style={{ display: 'grid', gap: 12 }}>
            <textarea
              className="input-textarea"
              rows={4}
              placeholder="请输入你的问题，例如：对比 React 类组件与函数组件的生命周期差异？"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            {showSettings && (
              <div style={{ display: 'grid', gap: 12, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <label style={{ minWidth: 100 }}>检索数量 (TopK):</label>
                  <input type="range" min={1} max={10} value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ minWidth: 30, textAlign: 'right' }}>{topK}</span>
                </div>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <label style={{ minWidth: 100 }}>最低相似度:</label>
                  <input type="range" min={0} max={1} step={0.05} value={minScore} onChange={(e) => setMinScore(parseFloat(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ minWidth: 30, textAlign: 'right' }}>{(minScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => { setQuestion(''); setAnswer(''); setSources([]); setError(''); }} className="btn-secondary">
                清空
              </button>
              <button type="submit" className="btn-gradient" disabled={!canAsk}>
                {loading ? '🤔 思考中…' : '🚀 开始检索并作答'}
              </button>
            </div>
          </form>
        </div>
      </div>


      {error && (
        <div className="alert-error">{error}</div>
      )}

      {answer && (
        <div className="card card-glass" style={{ marginBottom: 16 }}>
          <div className="card-header row" style={{ justifyContent: 'space-between' }}>
            <div>AI 回答</div>
            <CopyButton text={answer} />
          </div>
          <div className="card-body">
            <div className="answer-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
              >
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div className="card card-glass" style={{ marginBottom: 16 }}>
          <div className="card-header">📚 引用来源</div>
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            {sources.map(src => (
              <div key={src.index} className="source-item">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>[{src.index}] {src.title || src.kpId}</div>
                  <div style={{ minWidth: 120, textAlign: 'right', color: '#777' }}>相似度 {(src.score * 100).toFixed(1)}%</div>
                </div>
                <ConfidenceBar score={src.score} />
                <div className="source-preview">{src.preview}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="card card-glass">
          <div className="card-header row" style={{ justifyContent: 'space-between' }}>
            <span>📜 历史记录 ({history.length})</span>
            <button onClick={clearHistory} className="btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }}>
              清空历史
            </button>
          </div>
          <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {history.map(item => (
              <div 
                key={item.id} 
                onClick={() => loadFromHistory(item)}
                style={{ 
                  padding: 12, 
                  marginBottom: 8, 
                  background: '#f8f9fa', 
                  borderRadius: 8, 
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e3f2fd'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#1976d2' }}>
                  Q: {item.question}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                  A: {item.answer.substring(0, 100)}{item.answer.length > 100 ? '...' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {new Date(item.time).toLocaleString()} · {item.sources?.length || 0} 个来源
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

