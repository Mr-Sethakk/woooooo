// src/pages/DashboardPage.jsx
import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import knowledgePointService from '../services/knowledgePointService';
import 'katex/dist/katex.min.css';

function DashboardPage() {
    const [knowledgePoints, setKnowledgePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overview, setOverview] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('updatedAt');
    const mermaidRenderedRef = useRef(false);

    // 初始化 Mermaid - 增加更多配置
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            flowchart: {
                htmlLabels: true,
                curve: 'basis'
            },
            sequence: {
                diagramMarginX: 50,
                diagramMarginY: 10,
                actorMargin: 50,
                width: 150,
                height: 65,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35,
                mirrorActors: true,
                bottomMarginAdj: 1,
                useMaxWidth: true,
                rightAngles: false,
                showSequenceNumbers: false
            }
        });
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/knowledge-points');
                setKnowledgePoints(response.data);
                
                // 获取学习概览
                try {
                    const overviewData = await knowledgePointService.getLearningOverview();
                    setOverview(overviewData);
                } catch (overviewError) {
                    console.error('获取学习概览失败:', overviewError);
                }
                
                setError('');
            } catch (err) {
                setError('获取知识点失败');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 当知识点变化时，重新渲染 Mermaid 图表
    useEffect(() => {
        if (knowledgePoints.length > 0 && !mermaidRenderedRef.current) {
            setTimeout(() => {
                try {
                    mermaid.run({
                        querySelector: '.mermaid',
                        suppressErrors: true
                    }).then(() => {
                        console.log('✅ Mermaid图表渲染完成');
                    }).catch(err => {
                        console.warn('⚠️ Mermaid渲染警告:', err);
                    });
                } catch (error) {
                    console.error('Mermaid 渲染错误:', error);
                }
                mermaidRenderedRef.current = true;
            }, 300);
        }
    }, [knowledgePoints]);

    // Mermaid 代码块组件 - 优化版
    const MermaidComponent = ({ children, id }) => {
        const [svg, setSvg] = useState('');
        const [mermaidError, setMermaidError] = useState('');
        const [isRendering, setIsRendering] = useState(false);

        useEffect(() => {
            const renderMermaid = async () => {
                if (isRendering) return;
                
                try {
                    setIsRendering(true);
                    const code = String(children).trim();
                    
                    if (!code || code.length < 10) {
                        setSvg('');
                        setMermaidError('Mermaid代码太短或为空');
                        return;
                    }

                    // 清理代码
                    const cleanCode = code
                        .replace(/```mermaid/g, '')
                        .replace(/```/g, '')
                        .trim();
                    
                    if (!cleanCode) {
                        setSvg('');
                        setMermaidError('没有有效的Mermaid代码');
                        return;
                    }

                    const uniqueId = `mermaid-${id || 'dashboard'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    try {
                        const { svg } = await mermaid.render(uniqueId, cleanCode);
                        setSvg(svg);
                        setMermaidError('');
                    } catch (renderError) {
                        console.error('Mermaid渲染失败:', renderError);
                        setMermaidError('图表渲染失败: ' + renderError.message);
                        setSvg('');
                    }
                } catch (err) {
                    console.error('Mermaid处理错误:', err);
                    setMermaidError('处理错误: ' + err.message);
                    setSvg('');
                } finally {
                    setIsRendering(false);
                }
            };

            renderMermaid();
        }, [children, id]);

        if (mermaidError) {
            return (
                <div style={{
                    background: '#fff5f5',
                    border: '1px solid #fed7d7',
                    padding: '16px',
                    borderRadius: '4px',
                    color: '#c53030',
                    margin: '16px 0'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>图表渲染错误:</div>
                    <div style={{ fontSize: '14px', marginBottom: '12px' }}>{mermaidError}</div>
                    <pre style={{ 
                        background: '#f7fafc', 
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto',
                        border: '1px solid #e2e8f0',
                        maxHeight: '200px'
                    }}>
                        {String(children).substring(0, 500)}
                    </pre>
                </div>
            );
        }

        if (svg) {
            return (
                <div 
                    className="mermaid-container"
                    dangerouslySetInnerHTML={{ __html: svg }} 
                    style={{ 
                        textAlign: 'center',
                        margin: '20px 0',
                        padding: '20px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        overflow: 'auto',
                        minHeight: '200px'
                    }}
                />
            );
        }

        return (
            <div style={{
                background: '#f7fafc',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#718096',
                border: '1px dashed #cbd5e0',
                margin: '16px 0'
            }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔄</div>
                <div style={{ fontSize: '14px' }}>正在渲染图表...</div>
            </div>
        );
    };

    // 状态显示映射函数
    const getStatusDisplay = (status) => {
        const statusMap = {
            'not_started': { text: '未开始', color: '#e3f2fd', icon: '🆕', bgColor: '#e3f2fd', textColor: '#1976d2' },
            'in_progress': { text: '学习中', color: '#fff3cd', icon: '📖', bgColor: '#fff3cd', textColor: '#ff8f00' },
            'mastered': { text: '已掌握', color: '#c8e6c9', icon: '✅', bgColor: '#c8e6c9', textColor: '#2e7d32' },
            'review': { text: '需复习', color: '#ffcdd2', icon: '🔄', bgColor: '#ffcdd2', textColor: '#c62828' }
        };
        return statusMap[status] || { text: status, color: '#f5f5f5', icon: '❓', bgColor: '#f5f5f5', textColor: '#757575' };
    };

    // 掌握程度颜色和文本
    const getMasteryInfo = (level) => {
        if (level >= 85) return { color: '#4CAF50', text: '精通', emoji: '🎯' };
        if (level >= 70) return { color: '#8BC34A', text: '良好', emoji: '👍' };
        if (level >= 60) return { color: '#FFC107', text: '一般', emoji: '😐' };
        if (level >= 40) return { color: '#FF9800', text: '基础', emoji: '📚' };
        return { color: '#F44336', text: '入门', emoji: '👶' };
    };

    // 获取进度条宽度
    const getProgressWidth = (level) => {
        return level || 0;
    };

    // 过滤和排序知识点
    const filteredAndSortedPoints = knowledgePoints
        .filter(kp => {
            if (filterStatus === 'all') return true;
            return kp.status === filterStatus;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'masteryLevel':
                    return (b.masteryLevel || 0) - (a.masteryLevel || 0);
                case 'createdAt':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'updatedAt':
                default:
                    return new Date(b.updatedAt) - new Date(a.createdAt);
            }
        });

    const handleDelete = async (id) => {
        if (window.confirm('你确定要删除这个知识点吗？')) {
            try {
                console.log('正在删除知识点，ID:', id);
                const response = await apiClient.delete(`/knowledge-points/${id}`);
                console.log('删除成功，响应:', response.data);
                setKnowledgePoints(prev => prev.filter(kp => kp._id !== id));
                alert('删除成功！');
            } catch (error) {
                console.error('删除失败:', error);
                const errorMessage = 
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.response?.data ||
                    error.message;
                alert(`删除失败: ${errorMessage || '服务器内部错误'}`);
            }
        }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '24px' }}>📚 加载中...</div>
            <div style={{ marginTop: '20px' }}>正在获取您的学习数据</div>
        </div>
    );

    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className="page-wrap">
            <div className="page-bg" aria-hidden>
                <span className="b1" />
                <span className="b2" />
                <span className="b3" />
                <div className="aurora-lite" />
            </div>
            <div className="page-content">
            <h1 className="section-title" style={{ marginBottom: '6px' }}>我的知识点</h1>
            <div className="section-sub" style={{ marginBottom: '24px' }}>
                管理您的知识点，跟踪学习进度
            </div>

            {/* 学习概览卡片 */}
            {overview && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '15px',
                    marginBottom: '30px'
                }}>
                    <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>📚 总知识点</div>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '5px 0' }}>{overview.total}</div>
                    </div>
                    
                    <div style={{ 
                        background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>✅ 已掌握</div>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '5px 0' }}>{overview.mastered}</div>
                    </div>
                    
                    <div style={{ 
                        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>📖 学习中</div>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '5px 0' }}>{overview.inProgress}</div>
                    </div>
                    
                    <div style={{ 
                        background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>🔄 需复习</div>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '5px 0' }}>{overview.needReview}</div>
                    </div>
                </div>
            )}

            {/* 控制栏 */}
            <div className="card-glass" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '15px',
                padding: '15px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold' }}>筛选:</span>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="all">全部</option>
                        <option value="not_started">未开始</option>
                        <option value="in_progress">学习中</option>
                        <option value="mastered">已掌握</option>
                        <option value="review">需复习</option>
                    </select>

                    <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>排序:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="updatedAt">最近更新</option>
                        <option value="masteryLevel">掌握程度</option>
                        <option value="createdAt">创建时间</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link to="/kp/new">
                        <button className="btn-gradient" style={{
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            ➕ 新建知识点
                        </button>
                    </Link>
                    <button 
                        onClick={() => window.location.reload()}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        🔄 刷新
                    </button>
                </div>
            </div>

            {/* 知识点列表 */}
            {filteredAndSortedPoints.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '50px',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    marginTop: '20px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
                    <h3 style={{ color: '#666' }}>
                        {filterStatus === 'all' ? '还没有知识点' : '没有符合条件的知识点'}
                    </h3>
                    <p style={{ color: '#999', marginBottom: '20px' }}>
                        {filterStatus === 'all' 
                            ? '创建一个新知识点开始学习吧！' 
                            : '尝试更改筛选条件或创建一个新知识点'}
                    </p>
                    <Link to="/kp/new">
                        <button style={{
                            padding: '12px 24px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}>
                            🚀 创建知识点
                        </button>
                    </Link>
                </div>
            ) : (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', 
                        gap: '20px'
                    }}>
                        {filteredAndSortedPoints.map((kp) => {
                            const statusInfo = getStatusDisplay(kp.status);
                            const masteryInfo = getMasteryInfo(kp.masteryLevel || 0);
                            
                            return (
                                <div key={kp._id} className="kp-card">
                                    {/* 知识点头部 - 包含状态和标题 */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <h2 className="kp-card-title" style={{ margin: 0, flex: 1, marginRight: '10px' }}>
                                                {kp.title}
                                            </h2>
                                            <span style={{ 
                                                padding: '6px 12px',
                                                borderRadius: '15px',
                                                backgroundColor: statusInfo.bgColor,
                                                color: statusInfo.textColor,
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                {statusInfo.icon} {statusInfo.text}
                                            </span>
                                        </div>
                                        
                                        {/* 学习进度条 */}
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <span>{masteryInfo.emoji}</span>
                                                    <span>掌握程度: {masteryInfo.text}</span>
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: masteryInfo.color }}>
                                                    {kp.masteryLevel || 0}%
                                                </div>
                                            </div>
                                            <div style={{ 
                                                height: '8px',
                                                background: '#f0f0f0',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${getProgressWidth(kp.masteryLevel)}%`,
                                                    height: '100%',
                                                    background: masteryInfo.color,
                                                    borderRadius: '4px',
                                                    transition: 'width 0.3s'
                                                }}></div>
                                            </div>
                                        </div>
                                        
                                        {/* 学习统计和日期 */}
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '12px', 
                                            color: '#95a5a6'
                                        }}>
                                            <div>
                                                📅 创建于 {new Date(kp.createdAt).toLocaleDateString()}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {kp.stats?.totalAttempts > 0 && (
                                                    <span title="尝试次数">
                                                        📊 {kp.stats.totalAttempts}次
                                                    </span>
                                                )}
                                                {kp.stats?.averageScore > 0 && (
                                                    <span title="平均分数">
                                                        ⭐ {kp.stats.averageScore.toFixed(1)}分
                                                    </span>
                                                )}
                                                {kp.reviewList && (
                                                    <span style={{ color: '#d32f2f' }} title="在复习列表中">
                                                        🔄 需复习
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 知识点内容预览 - 修改这里支持滚动 */}
                                    <div style={{ 
                                        background: '#f9f9f9', 
                                        padding: '15px', 
                                        borderRadius: '8px',
                                        marginBottom: '20px',
                                        minHeight: '120px',
                                        maxHeight: '400px',  // 增加高度
                                        overflow: 'auto',    // 改为auto支持滚动
                                        position: 'relative',
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#c1c1c1 #f1f1f1'
                                    }}>
                                        <div style={{ 
                                            fontSize: '14px',
                                            lineHeight: 1.6,
                                            color: '#555'
                                        }}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        
                                                        if (match && match[1] === 'mermaid') {
                                                            // 关键修改：使用MermaidComponent组件
                                                            return (
                                                                <MermaidComponent id={kp._id}>
                                                                    {String(children)}
                                                                </MermaidComponent>
                                                            );
                                                        }
                                                        
                                                        if (!inline && match) {
                                                            return (
                                                                <div style={{ 
                                                                    background: '#f4f4f4', 
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '12px',
                                                                    border: '1px solid #ddd'
                                                                }}>
                                                                    💻 [代码块]
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <code 
                                                                className={className} 
                                                                {...props}
                                                                style={{
                                                                    background: '#edf2f7',
                                                                    padding: '2px 4px',
                                                                    borderRadius: '3px',
                                                                    fontSize: '0.85em'
                                                                }}
                                                            >
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    // 简化其他元素的显示
                                                    h1: ({node, ...props}) => <div style={{ fontSize: '16px', fontWeight: 'bold' }} {...props} />,
                                                    h2: ({node, ...props}) => <div style={{ fontSize: '15px', fontWeight: 'bold' }} {...props} />,
                                                    h3: ({node, ...props}) => <div style={{ fontSize: '14px', fontWeight: 'bold' }} {...props} />,
                                                }}
                                            >
                                                {kp.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* 操作按钮 */}
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '10px',
                                        borderTop: '1px solid #f0f0f0',
                                        paddingTop: '15px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <Link to={`/feynman/${kp._id}`} style={{ flex: 1, minWidth: '120px' }}>
                                            <button className="kp-action-btn kp-btn-recite" style={{ width: '100%' }}>
                                                🎤 开始复述
                                            </button>
                                        </Link>
                                        
                                        <Link to={`/quiz/${kp._id}`} style={{ flex: 1, minWidth: '120px' }}>
                                            <button className="kp-action-btn kp-btn-quiz" style={{ width: '100%' }}>
                                                📝 开始测评
                                            </button>
                                        </Link>
                                        
                                        <Link to={`/kp/edit/${kp._id}`} style={{ flex: 1, minWidth: '80px' }}>
                                            <button className="kp-action-btn kp-btn-edit" style={{ width: '100%' }}>
                                                ✏️ 编辑
                                            </button>
                                        </Link>
                                        
                                        <button 
                                            onClick={() => handleDelete(kp._id)} 
                                            className="kp-action-btn kp-btn-delete"
                                            style={{ flex: 1, minWidth: '80px' }}
                                        >
                                            🗑️ 删除
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
    );
}

export default DashboardPage;