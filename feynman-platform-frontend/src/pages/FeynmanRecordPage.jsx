// src/pages/FeynmanRecordPage.jsx
import { useState, useEffect, useRef } from 'react';
import AuroraBackground from '../components/AuroraBackground';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axios';
import aiService from '../services/aiService';
import knowledgePointService from '../services/knowledgePointService';

function FeynmanRecordPage() {
    const { id } = useParams();
    
    // 基础状态
    const [kpTitle, setKpTitle] = useState('');
    const [kpContent, setKpContent] = useState('');
    const [error, setError] = useState('');
    
    // 语音识别状态
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [finalText, setFinalText] = useState(''); // 最终识别结果
    const [interimText, setInterimText] = useState(''); // 临时识别结果
    
    // AI 相关状态
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [polishedText, setPolishedText] = useState('');
    const [showAIResults, setShowAIResults] = useState(false);
    
    // 状态更新相关状态
    const [statusUpdate, setStatusUpdate] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const recognitionRef = useRef(null);

    // 显示文本 = 最终文本 + 临时文本
    const displayText = finalText + (interimText ? ` ${interimText}` : '');

    // 状态显示映射函数
    const getStatusDisplay = (status) => {
        const statusMap = {
            'not_started': { text: '🆕 未开始', color: '#e3f2fd' },
            'in_progress': { text: '📖 学习中', color: '#fff3cd' },
            'mastered': { text: '✅ 已掌握', color: '#c8e6c9' },
            'review': { text: '🔄 需复习', color: '#ffcdd2' }
        };
        return statusMap[status] || { text: status, color: '#f5f5f5' };
    };

    useEffect(() => {
        console.log('组件挂载，开始初始化...');
        
        const fetchKnowledgePoint = async () => {
            try {
                console.log('获取知识点信息...');
                const response = await apiClient.get(`/knowledge-points/${id}`);
                setKpTitle(response.data.title);
                setKpContent(response.data.content || '暂无详细内容');
                console.log('知识点获取成功:', response.data.title);
            } catch (error) {
                console.error('获取知识点失败:', error);
                setKpTitle('未知知识点');
                setKpContent('无法获取知识点内容');
                setError('获取知识点失败');
            }
        };

        fetchKnowledgePoint();
        initializeSpeechRecognition();

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [id]);

    // 语音识别初始化
    const initializeSpeechRecognition = () => {
        console.log('初始化语音识别...');
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('浏览器不支持语音识别');
            setIsSupported(false);
            setError('您的浏览器不支持语音识别功能。请使用 Chrome、Edge 或 Safari 浏览器。');
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'zh-CN';
            recognitionRef.current.maxAlternatives = 1;

            recognitionRef.current.onstart = () => {
                console.log('✅ 语音识别开始');
                setIsListening(true);
                setError('');
                setInterimText('');
            };

            recognitionRef.current.onresult = (event) => {
                console.log('收到识别结果，结果数量:', event.results.length);
                
                let newFinal = '';
                let newInterim = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const text = result[0].transcript;
                    
                    if (result.isFinal) {
                        newFinal += text;
                        console.log('最终结果:', text);
                    } else {
                        newInterim = text;
                        console.log('临时结果:', text);
                    }
                }

                if (newFinal) {
                    setFinalText(prev => {
                        const updated = prev + newFinal;
                        console.log('更新最终文本，新长度:', updated.length);
                        return updated;
                    });
                }
                
                setInterimText(newInterim);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                setIsListening(false);
                setInterimText('');
                
                switch (event.error) {
                    case 'not-allowed':
                        setError('麦克风访问被拒绝。请允许浏览器访问麦克风。');
                        break;
                    case 'network':
                        setError('网络错误，语音识别服务不可用。');
                        break;
                    default:
                        setError(`识别错误: ${event.error}`);
                }
            };

            recognitionRef.current.onend = () => {
                console.log('语音识别结束');
                setIsListening(false);
                setInterimText('');
            };

            console.log('语音识别初始化完成');

        } catch (error) {
            console.error('初始化语音识别失败:', error);
            setError('初始化语音识别失败');
            setIsSupported(false);
        }
    };

    // 开始录音
    const startListening = async () => {
        console.log('点击开始录音按钮');
        
        if (recognitionRef.current && !isListening) {
            setError('');
            setFinalText('');
            setInterimText('');
            
            try {
                console.log('请求麦克风权限...');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => {
                    console.log('停止音轨:', track);
                    track.stop();
                });
                
                console.log('开始语音识别...');
                recognitionRef.current.start();
            } catch (error) {
                console.error('麦克风权限错误:', error);
                setError('麦克风访问被拒绝。请允许浏览器访问麦克风。');
            }
        } else {
            console.log('无法开始录音，状态:', { 
                hasRecognition: !!recognitionRef.current, 
                isListening 
            });
        }
    };

    // 停止录音
    const stopListening = () => {
        console.log('点击停止录音按钮');
        
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            console.log('已停止语音识别');
        } else {
            console.log('无法停止录音，状态:', { 
                hasRecognition: !!recognitionRef.current, 
                isListening 
            });
        }
    };

    // AI文本润色
    const handlePolishText = async () => {
        console.log('点击AI文本润色按钮，当前文本长度:', displayText.length);
        
        if (!displayText.trim()) {
            setError('请先输入或录制复述内容');
            return;
        }
        
        setIsPolishing(true);
        setError('');
        
        try {
            console.log('调用AI文本润色服务...');
            const result = await aiService.polishText(displayText);
            console.log('AI润色结果:', result);
            
            setPolishedText(result);
            setShowAIResults(true);
            
            setTimeout(() => {
                document.getElementById('ai-results-section')?.scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }, 100);
            
        } catch (error) {
            console.error('文本润色失败:', error);
            setError(`润色失败: ${error.message}`);
        } finally {
            setIsPolishing(false);
        }
    };

    // AI评价
    const handleEvaluate = async () => {
        console.log('点击AI评价按钮，当前文本长度:', displayText.length);
        
        if (!displayText.trim()) {
            setError('请先输入或录制复述内容');
            return;
        }
        
        if (!kpContent || kpContent === '无法获取知识点内容') {
            setError('无法获取原始知识点内容，无法进行评价');
            return;
        }
        
        setIsEvaluating(true);
        setError('');
        
        try {
            console.log('调用AI评价服务...');
            const feedback = await aiService.evaluateFeynmanAttempt(kpContent, displayText);
            console.log('AI评价结果:', feedback);
            
            setAiFeedback(feedback);
            setShowAIResults(true);

            // 自动更新知识点状态
            await updateKnowledgeStatus(feedback.score, feedback);
            
            setTimeout(() => {
                document.getElementById('ai-results-section')?.scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }, 100);
            
        } catch (error) {
            console.error('AI评价失败:', error);
            setError(`评价失败: ${error.message}`);
        } finally {
            setIsEvaluating(false);
        }
    };

    // 更新知识点状态
    const updateKnowledgeStatus = async (score, feedback) => {
        setIsUpdatingStatus(true);
        try {
            console.log('更新知识点状态:', { id, score });
            const result = await knowledgePointService.updateKnowledgeStatus(
                id,
                score,
                feedback,
                displayText
            );
            setStatusUpdate(result);
            console.log('知识点状态更新成功:', result);
        } catch (error) {
            console.error('更新知识点状态失败:', error);
            // 不阻止用户继续，只是记录错误
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // 清空所有内容
    const clearAll = () => {
        console.log('清空所有内容');
        setFinalText('');
        setInterimText('');
        setError('');
        setAiFeedback(null);
        setPolishedText('');
        setShowAIResults(false);
        setStatusUpdate(null);
    };

    // 只清空AI结果
    const clearAIResults = () => {
        console.log('清空AI结果');
        setAiFeedback(null);
        setPolishedText('');
        setShowAIResults(false);
        setStatusUpdate(null);
    };

    // 如果不支持语音识别
    if (!isSupported) {
        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                <h1>复述知识点: {kpTitle}</h1>
                <div style={{ color: 'red', padding: '20px', background: '#ffe6e6', borderRadius: '8px', marginBottom: '20px' }}>
                    ❌ {error}
                </div>
                
                <div style={{ marginTop: '30px' }}>
                    <h3>📝 手动输入复述内容</h3>
                    <textarea
                        value={displayText}
                        onChange={(e) => {
                            setFinalText(e.target.value);
                            setInterimText('');
                        }}
                        placeholder="请在此输入您的复述内容..."
                        style={{
                            width: '100%',
                            height: '200px',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '2px solid #4CAF50',
                            fontSize: '16px',
                            marginBottom: '15px'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handlePolishText}
                            disabled={!displayText.trim()}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            ✨ AI文本润色
                        </button>
                        <button 
                            onClick={handleEvaluate}
                            disabled={!displayText.trim()}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            📊 AI评价打分
                        </button>
                        <button 
                            onClick={clearAll}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🗑️ 清空
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feynman-page-wrap" style={{ position: 'relative', zIndex: 1 }}>
            <AuroraBackground />
            <div className="feynman-card" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <h1 className="feynman-title">🎤 费曼复述练习: {kpTitle}</h1>
                <p className="feynman-subtitle">
                    用简单的语言复述知识点，检验你的理解程度
                </p>
            
            {/* 知识点卡片 */}
            <div className="feynman-card" style={{ marginBottom: '24px' }}>
                <h2 className="kp-card-title" style={{ fontSize: '24px', marginBottom: '16px' }}>
                    📚 {kpTitle}
                </h2>
                <div className="kp-card-content" style={{ 
                    background: 'linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%)', 
                    padding: '20px', 
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '15px',
                    lineHeight: '1.8'
                }}>
                    {kpContent}
                </div>
            </div>

            {/* 语音识别区域 */}
            <div className="feynman-card" style={{ marginBottom: '24px' }}>
                <h3 className="kp-card-title" style={{ fontSize: '20px', marginBottom: '20px' }}>
                    🎤 语音复述
                </h3>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', justifyContent: 'center' }}>
                    <button 
                        onClick={startListening} 
                        disabled={isListening}
                        className={isListening ? 'record-btn record-btn-active' : 'record-btn record-btn-idle'}
                    >
                        {isListening ? '🔴' : '🎤'}
                    </button>
                    <button 
                        onClick={stopListening} 
                        disabled={!isListening}
                        className="kp-action-btn kp-btn-delete"
                        style={{ minWidth: '140px' }}
                    >
                        ⏹️ 停止识别
                    </button>
                    <button 
                        onClick={clearAll}
                        className="kp-action-btn kp-btn-edit"
                        style={{ minWidth: '140px' }}
                    >
                        🗑️ 清空文本
                    </button>
                </div>

                <textarea
                    value={displayText}
                    onChange={(e) => {
                        setFinalText(e.target.value);
                        setInterimText('');
                    }}
                    placeholder="点击'开始语音识别'后，您说话的内容将显示在这里...或者直接在此输入您的复述内容"
                    className="transcript-box"
                    style={{
                        width: '100%',
                        minHeight: '200px',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                    }}
                />

                {displayText && (
                    <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                        字数: {displayText.length} | 字符数: {displayText.replace(/\s/g, '').length}
                    </div>
                )}
            </div>

            {/* AI 功能区域 */}
            <div className="feynman-card" style={{ marginBottom: '24px' }}>
                <h3 className="kp-card-title" style={{ fontSize: '20px', marginBottom: '20px' }}>
                    🤖 AI 智能辅助
                </h3>
                
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button 
                        onClick={handlePolishText}
                        disabled={isPolishing || !displayText.trim()}
                        className="kp-action-btn kp-btn-recite"
                        style={{ minWidth: '160px' }}
                    >
                        {isPolishing ? '🔄 润色中...' : '✨ AI文本润色'}
                    </button>
                    
                    <button 
                        onClick={handleEvaluate}
                        disabled={isEvaluating || !displayText.trim()}
                        className="kp-action-btn kp-btn-quiz"
                        style={{ minWidth: '160px', background: isEvaluating ? '#ccc' : undefined }}
                    >
                        {isEvaluating ? '🔄 评价中...' : '📊 AI评价打分'}
                    </button>
                    
                    {(polishedText || aiFeedback) && (
                        <button 
                            onClick={clearAIResults}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                minWidth: '120px'
                            }}
                        >
                            🗑️ 清空AI结果
                        </button>
                    )}
                </div>
                
                <div style={{ fontSize: '14px', color: '#388e3c' }}>
                    💡 提示：先完成复述，然后使用AI功能获得智能反馈
                </div>
            </div>

            {/* AI 结果显示区域 */}
            {showAIResults && (
                <div id="ai-results-section" style={{ marginBottom: '25px' }}>
                    {/* AI润色结果 */}
                    {polishedText && (
                        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                            <h3 style={{ color: '#1565c0', marginTop: 0 }}>✨ AI润色结果</h3>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #bbdefb', lineHeight: '1.6' }}>
                                {polishedText}
                            </div>
                        </div>
                    )}

                    {/* AI评价结果 */}
                    {aiFeedback && (
                        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '10px' }}>
                            <h3 style={{ color: '#e65100', marginTop: 0 }}>📊 AI评价结果</h3>
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
                                    <div style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', color: 'white', padding: '30px 20px', borderRadius: '12px', marginBottom: '15px' }}>
                                        <div style={{ fontSize: '12px', opacity: 0.9 }}>综合得分</div>
                                        <div style={{ fontSize: '2.5em', fontWeight: 'bold', lineHeight: 1 }}>
                                            {aiFeedback.score}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ color: '#e65100', marginBottom: '10px' }}>📝 润色文本</h4>
                                        <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #ffcc80', lineHeight: '1.5' }}>
                                            {aiFeedback.polishedText}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ color: '#e65100', marginBottom: '10px' }}>💬 综合评价</h4>
                                        <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #ffcc80' }}>
                                            {aiFeedback.evaluation}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <h4 style={{ color: '#388e3c', marginBottom: '10px' }}>👍 优点</h4>
                                            <ul style={{ background: 'white', padding: '15px 15px 15px 30px', borderRadius: '6px', border: '1px solid #a5d6a7', margin: 0 }}>
                                                {aiFeedback.strengths.map((item, index) => (
                                                    <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 style={{ color: '#d32f2f', marginBottom: '10px' }}>👎 待改进</h4>
                                            <ul style={{ background: 'white', padding: '15px 15px 15px 30px', borderRadius: '6px', border: '1px solid #ef9a9a', margin: 0 }}>
                                                {aiFeedback.weaknesses.map((item, index) => (
                                                    <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 状态更新显示 */}
            {statusUpdate && (
                <div style={{ 
                    background: '#e8f5e8',
                    padding: '20px',
                    borderRadius: '10px',
                    marginBottom: '25px',
                    border: '2px solid #4CAF50'
                }}>
                    <h3 style={{ color: '#2e7d32', marginTop: 0 }}>📚 学习状态更新</h3>
                    
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ 
                            background: 'white',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #c8e6c9',
                            minWidth: '120px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>掌握程度</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                                {statusUpdate.knowledgePoint.masteryLevel}%
                            </div>
                        </div>
                        
                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>状态:</strong> 
                                <span style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '4px',
                                    backgroundColor: getStatusDisplay(statusUpdate.knowledgePoint.status).color,
                                    marginLeft: '8px'
                                }}>
                                    {getStatusDisplay(statusUpdate.knowledgePoint.status).text}
                                </span>
                            </div>
                            
                            <div style={{ marginBottom: '10px' }}>
                                <strong>复习列表:</strong> 
                                <span style={{ marginLeft: '8px' }}>
                                    {statusUpdate.knowledgePoint.reviewList ? '✅ 已加入' : '❌ 未加入'}
                                </span>
                            </div>
                            
                            <div style={{ color: '#666', fontSize: '14px' }}>
                                💡 {statusUpdate.analysis.suggestion}
                            </div>
                        </div>
                    </div>
                    
                    {statusUpdate.knowledgePoint.nextReviewDate && (
                        <div style={{ 
                            marginTop: '15px',
                            padding: '10px',
                            background: '#fff3cd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}>
                            ⏰ 建议下次复习: {new Date(statusUpdate.knowledgePoint.nextReviewDate).toLocaleDateString()}
                        </div>
                    )}
                </div>
            )}

            {/* 错误提示 */}
            {error && (
                <div style={{ color: '#721c24', padding: '15px', background: '#f8d7da', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f5c6cb' }}>
                    ❌ {error}
                </div>
            )}
            </div>
        </div>
    );
}

export default FeynmanRecordPage;