// src/pages/KnowledgePointFormPage.jsx
import { useState, useEffect } from 'react';
import AuroraBackground from '../components/AuroraBackground';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import MDEditor from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

function KnowledgePointFormPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    // 初始化 Mermaid
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            flowchart: {
                htmlLabels: true,
                curve: 'basis'
            }
        });
    }, []);

    // 加载知识点数据（编辑模式）
    useEffect(() => {
        const fetchKnowledgePoint = async () => {
            if (isEditing) {
                try {
                    setDataLoading(true);
                    setError('');
                    console.log('正在获取知识点数据，ID:', id);
                    
                    const response = await apiClient.get(`/knowledge-points/${id}`);
                    console.log('获取到的数据:', response.data);
                    
                    setTitle(response.data.title || '');
                    setContent(response.data.content || '');
                    
                } catch (err) {
                    console.error('获取知识点失败:', err);
                    setError('获取知识点失败: ' + (err.response?.data?.message || err.message));
                } finally {
                    setDataLoading(false);
                }
            }
        };

        fetchKnowledgePoint();
    }, [id, isEditing]);

    // 渲染 Mermaid 图表
    useEffect(() => {
        if (content && content.includes('```mermaid')) {
            setTimeout(() => {
                try {
                    mermaid.run({
                        querySelector: '.mermaid',
                        suppressErrors: true
                    });
                } catch (error) {
                    console.warn('Mermaid渲染警告:', error);
                }
            }, 500);
        }
    }, [content]);

    // 自定义渲染组件用于支持 Mermaid
    const renderMermaid = (source) => {
        try {
            const mermaidCode = source.replace(/```mermaid/g, '').replace(/```/g, '').trim();
            if (!mermaidCode) return null;
            
            const containerId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            return (
                <div 
                    className="mermaid"
                    data-processed="true"
                    key={containerId}
                    style={{
                        background: '#f8fafc',
                        padding: '20px',
                        borderRadius: '8px',
                        margin: '20px 0',
                        border: '1px solid #e2e8f0',
                        overflow: 'auto'
                    }}
                >
                    {mermaidCode}
                </div>
            );
        } catch (error) {
            return (
                <div style={{
                    background: '#fff5f5',
                    border: '1px solid #fed7d7',
                    padding: '16px',
                    borderRadius: '4px',
                    color: '#c53030',
                    margin: '20px 0'
                }}>
                    图表渲染错误: {error.message}
                </div>
            );
        }
    };

    // 自定义预览组件
    const CustomPreview = (source) => {
        if (!source) return null;
        
        // 检查是否有 Mermaid 代码
        if (source.includes('```mermaid')) {
            const parts = source.split(/```mermaid[\s\S]*?```/g);
            const mermaidMatches = source.match(/```mermaid[\s\S]*?```/g) || [];
            
            return (
                <div style={{ overflow: 'auto', maxHeight: '400px' }}>
                    {parts.map((part, index) => (
                        <div key={`part-${index}`}>
                            <div dangerouslySetInnerHTML={{ __html: part }} />
                            {mermaidMatches[index] && renderMermaid(mermaidMatches[index])}
                        </div>
                    ))}
                </div>
            );
        }
        
        return <div dangerouslySetInnerHTML={{ __html: source }} />;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('提交的数据:', { title, content });
        
        if (!title.trim()) {
            setError('标题不能为空');
            return;
        }
        
        if (!content.trim()) {
            setError('内容不能为空');
            return;
        }
        
        const kpData = { title, content };
        try {
            setLoading(true);
            setError('');
            
            if (isEditing) {
                await apiClient.put(`/knowledge-points/${id}`, kpData);
            } else {
                await apiClient.post('/knowledge-points', kpData);
            }
            
            navigate('/');
            
        } catch (error) {
            console.error('保存失败:', error);
            setError('保存知识点失败: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrap" style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: '#333' }}>
            <AuroraBackground />
            <div className="page-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
                <div className="card card-glass" style={{ padding: '32px', marginBottom: '24px' }}>
                    <h1 className="section-title" style={{ fontSize: '32px', marginBottom: '8px' }}>
                        {isEditing ? '✏️ 编辑知识点' : '➕ 新建知识点'}
                    </h1>
                    <p className="section-sub" style={{ fontSize: '15px' }}>
                        {isEditing ? '修改并完善你的知识点内容' : '创建新的知识点，开启学习之旅'}
                    </p>
                </div>
            
            {(loading || dataLoading) && (
                <div style={{ 
                    color: '#666', 
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '6px'
                }}>
                    {dataLoading ? '📚 加载中...' : '💾 保存中...'}
                </div>
            )}
            
            {error && (
                <div style={{ 
                    color: '#c53030', 
                    marginBottom: '16px', 
                    padding: '12px', 
                    backgroundColor: '#fff5f5',
                    borderRadius: '6px',
                    border: '1px solid #fed7d7'
                }}>
                    ⚠️ {error}
                </div>
            )}
            
            <div className="card card-glass" style={{ padding: '28px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '28px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '12px', 
                            fontWeight: '600',
                            fontSize: '16px',
                            color: '#334155'
                        }}>
                            📝 标题
                        </label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className="input-text"
                            style={{ 
                                width: '100%', 
                                padding: '16px', 
                                fontSize: '17px'
                            }} 
                            disabled={loading || dataLoading}
                            placeholder="请输入知识点标题..."
                            required
                        />
                    </div>
                
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <label style={{ 
                            fontWeight: 'bold',
                            fontSize: '16px',
                            color: '#4a5568'
                        }}>
                            内容:
                        </label>
                        <div style={{ fontSize: '14px', color: '#718096' }}>
                            支持 Markdown、LaTeX 和 Mermaid 图表
                        </div>
                    </div>
                    
                    {/* 使用增强版的 MDEditor */}
                    <div data-color-mode="light" style={{ border: '2px solid #e2e8f0', borderRadius: '8px' }}>
                        <MDEditor
                            value={content}
                            onChange={setContent}
                            height={500}
                            previewOptions={{
                                remarkPlugins: [remarkGfm, remarkMath],
                                rehypePlugins: [rehypeKatex],
                                components: {
                                    code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        
                                        if (match && match[1] === 'mermaid') {
                                            // 在编辑器中显示Mermaid代码
                                            return (
                                                <pre style={{
                                                    background: '#f8fafc',
                                                    padding: '16px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e2e8f0',
                                                    margin: '16px 0',
                                                    overflow: 'auto'
                                                }}>
                                                    <code style={{ 
                                                        color: '#2d3748',
                                                        fontFamily: 'monospace',
                                                        fontSize: '14px'
                                                    }}>
                                                        {children}
                                                    </code>
                                                </pre>
                                            );
                                        }
                                        
                                        if (!inline && match) {
                                            return (
                                                <pre style={{
                                                    background: '#edf2f7',
                                                    padding: '12px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <code style={{ 
                                                        color: '#4a5568',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {children}
                                                    </code>
                                                </pre>
                                            );
                                        }
                                        
                                        return (
                                            <code 
                                                className={className} 
                                                {...props}
                                                style={{
                                                    background: '#edf2f7',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '0.9em'
                                                }}
                                            >
                                                {children}
                                            </code>
                                        );
                                    }
                                }
                            }}
                            // 预览时的高度
                            preview="live"
                            // 修复这里：正确的属性名是 visibleDragbar
                            visibleDragbar={true}
                        />
                    </div>
                    
                    {/* 使用说明卡片 */}
                    <div style={{ 
                        marginTop: '20px',
                        padding: '16px',
                        background: '#f7fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#4a5568' }}>📝 使用说明：</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                            <div>
                                <strong>Markdown:</strong>
                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
                                    <li># 标题</li>
                                    <li>**粗体**</li>
                                    <li>*斜体*</li>
                                    <li>- 列表项</li>
                                </ul>
                            </div>
                            <div>
                                <strong>数学公式:</strong>
                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
                                    <li>行内: $E=mc^2$</li>
                                    <li>块级: $$E=mc^2$$</li>
                                </ul>
                            </div>
                            <div>
                                <strong>Mermaid图表:</strong>
                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
                                    <li>流程图</li>
                                    <li>序列图</li>
                                    <li>饼图</li>
                                    <li>甘特图</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    {/* Mermaid 示例 */}
                    <div style={{ 
                        marginTop: '20px',
                        padding: '16px',
                        background: '#ebf8ff',
                        borderRadius: '8px',
                        border: '1px solid #bee3f8'
                    }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#2b6cb0' }}>🌊 Mermaid 流程图示例：</h5>
                        <pre style={{ 
                            background: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            overflow: 'auto',
                            margin: 0
                        }}>
{`\`\`\`mermaid
graph TD
    A[开始学习] --> B{是否理解?}
    B -->|是| C[应用知识]
    B -->|否| D[重新学习]
    C --> E[掌握知识]
    D --> B
\`\`\``}
                        </pre>
                    </div>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    gap: '16px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0'
                }}>
                    <button 
                        type="submit" 
                        style={{ 
                            padding: '14px 32px', 
                            fontSize: '16px', 
                            fontWeight: 'bold',
                            backgroundColor: '#4CAF50', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: (loading || dataLoading) ? 'not-allowed' : 'pointer',
                            opacity: (loading || dataLoading) ? 0.6 : 1,
                            transition: 'opacity 0.2s, transform 0.2s',
                            flex: 1
                        }}
                        disabled={loading || dataLoading}
                        onMouseOver={(e) => {
                            if (!loading && !dataLoading) {
                                e.target.style.opacity = '0.9';
                                e.target.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!loading && !dataLoading) {
                                e.target.style.opacity = '1';
                                e.target.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {loading ? '💾 保存中...' : (isEditing ? '📝 更新知识点' : '✨ 创建知识点')}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => navigate('/dashboard')}
                        style={{ 
                            padding: '14px 32px', 
                            fontSize: '16px', 
                            fontWeight: 'bold',
                            backgroundColor: '#718096', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            transition: 'opacity 0.2s, transform 0.2s',
                            flex: 1
                        }}
                        onMouseOver={(e) => {
                            e.target.style.opacity = '0.9';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.opacity = '1';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        ↩️ 返回列表
                    </button>
                </div>
            </form>
            </div>
        </div>
        </div>
    );
}

export default KnowledgePointFormPage;