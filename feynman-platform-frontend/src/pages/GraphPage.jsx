// src/pages/GraphPage.jsx (深色主题 + Aurora 背景)
import { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import AuroraBackground from '../components/AuroraBackground';

function GraphPage() {
    const [option, setOption] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiClient.get('/graph/knowledge-map');
                const graphData = response.data || {};

                const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
                const links = Array.isArray(graphData.links) ? graphData.links : [];

                // 为节点分配颜色 & 大小，增强视觉
                const palette = [
                    '#ff9f1c', '#2ec4b6', '#e71d36', '#ffbf69', '#7b2cbf',
                    '#f72585', '#3a86ff', '#06d6a0', '#b5179e', '#4895ef'
                ];
                const styledNodes = nodes.map((n, idx) => ({
                    ...n,
                    symbolSize: n.symbolSize || 40,
                    itemStyle: {
                        color: palette[idx % palette.length],
                        shadowBlur: 20,
                        shadowColor: palette[idx % palette.length]
                    },
                    label: {
                        color: '#fff',
                        fontSize: 12
                    }
                }));

                const chartOption = {
                    backgroundColor: 'transparent',
                    tooltip: {
                        backgroundColor: 'rgba(40,40,40,0.85)',
                        borderColor: '#999',
                        textStyle: { color: '#fff' },
                        formatter: (params) => {
                            if (params.dataType === 'node') {
                                return `<strong>${params.data.name}</strong>`;
                            }
                            return '';
                        }
                    },
                    series: [
                        {
                            type: 'graph',
                            layout: 'force',
                            data: styledNodes,
                            links: links,
                            roam: true,
                            lineStyle: {
                                color: 'rgba(255,255,255,0.3)',
                                width: 1
                            },
                            force: {
                                repulsion: 200,
                                edgeLength: 120,
                                gravity: 0.08
                            },
                            emphasis: {
                                focus: 'adjacency',
                                lineStyle: {
                                    width: 4,
                                    color: '#fff'
                                }
                            }
                        }
                    ]
                };
                setOption(chartOption);
            } catch (err) {
                console.error('获取图谱数据失败', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const onChartClick = (params) => {
        if (params.componentType === 'series' && params.dataType === 'node') {
            const nodeId = params.data.id;
            navigate(`/kp/edit/${nodeId}`);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: '#fff' }}>
            {/* 背景 */}
            <AuroraBackground />

            {/* 前景内容 */}
            <div style={{ position: 'relative', zIndex: 1, padding: '40px 20px' }}>
                <h1 style={{
                    fontSize: 48,
                    fontWeight: 900,
                    textAlign: 'center',
                    marginBottom: 10,
                    background: 'linear-gradient(120deg, #fff 0%, #f0f9ff 50%, #fff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'shimmer 3s ease-in-out infinite',
                    backgroundSize: '200% 100%'
                }}>知识图谱</h1>
                <p style={{ textAlign: 'center', marginBottom: 30, fontSize: 18, color: 'rgba(255,255,255,0.9)' }}>
                    展示知识点之间的引用关系 · 点击节点可跳转编辑
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', marginTop: 80 }}>图谱加载中...</p>
                ) : (
                    <div style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 16,
                        padding: 16,
                        backdropFilter: 'blur(8px)'
                    }}>
                        <ReactECharts
                            option={option}
                            style={{ height: '70vh', width: '100%' }}
                            onEvents={{ click: onChartClick }}
                            notMerge
                            lazyUpdate
                        />
                    </div>
                )}
            </div>

            {/* 局部动画 keyframes */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
}

export default GraphPage;