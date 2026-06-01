// src/pages/ThreeDUniversePage.jsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import apiClient from '../api/axios';

function ThreeDUniversePage() {
    const mountRef = useRef(null);
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });

    // 1. 获取图谱数据
    useEffect(() => {
        apiClient.get('/graph/knowledge-map')
            .then(response => setGraphData(response.data))
            .catch(error => console.error('Failed to fetch graph data:', error));
    }, []);

    // 2. Three.js 的主 useEffect，依赖 graphData
    useEffect(() => {
        // 添加防护检查，确保数据存在且为数组
        if (!graphData || !graphData.nodes || !Array.isArray(graphData.nodes) || graphData.nodes.length === 0) return;

        const currentMount = mountRef.current;

        // --- 基础设置 (场景, 相机, 渲染器) ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // 深邃的宇宙背景

        const camera = new THREE.PerspectiveCamera(
            75,
            currentMount.clientWidth / currentMount.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 15;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        currentMount.appendChild(renderer.domElement);

        // --- 核心改造部分：根据数据创建物体 ---
        const nodeObjects = new Map();
        const lineObjects = []; // 存储所有线条对象，用于高亮

        // 3. 创建节点 (星球)
        const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32); // 统一大小的星球
        graphData.nodes.forEach(node => {
            const nodeMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 75%)`),
                roughness: 0.5,
                metalness: 0.5,
                emissive: 0x000000 // 添加自发光属性，初始为黑色
            });
            const sphere = new THREE.Mesh(sphereGeometry, nodeMaterial);
            
            // 随机放置在半径为10的球体内
            const phi = Math.acos(-1 + (2 * Math.random()));
            const theta = Math.sqrt(4 * Math.PI) * Math.random();
            const radius = Math.pow(Math.random(), 1/3) * 10;
            sphere.position.setFromSphericalCoords(radius, phi, theta);
            
            sphere.userData = { id: node.id, label: node.label, originalEmissive: 0x000000 }; // 存储元数据
            scene.add(sphere);
            nodeObjects.set(node.id, sphere);
        });

        // 4. 创建边 (星际航线)
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3 
        });
        (Array.isArray(graphData.edges) ? graphData.edges : []).forEach(edge => {
            const sourceNode = nodeObjects.get(edge.source);
            const targetNode = nodeObjects.get(edge.target);
            if (sourceNode && targetNode) {
                const points = [sourceNode.position, targetNode.position];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                line.userData = { source: edge.source, target: edge.target }; // 存储边数据
                scene.add(line);
                lineObjects.push(line);
            }
        });

        // 5. 添加光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 1.5);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);
        const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
        pointLight2.position.set(-10, -10, -5);
        scene.add(pointLight2);

        // 6. 添加轨道控制器
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // --- 挑战目标：实现鼠标悬停高亮 ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredNode = null; // 当前悬停的节点

        const handleMouseMove = (event) => {
            // 计算鼠标的归一化坐标 (-1 到 1)
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // 使用 Raycaster 检测相交
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            // 找到第一个相交的节点（忽略线条）
            let newHoveredNode = null;
            for (const intersect of intersects) {
                if (intersect.object.type === 'Mesh') {
                    newHoveredNode = intersect.object;
                    break;
                }
            }

            // 如果悬停的节点发生变化，则更新高亮
            if (newHoveredNode !== hoveredNode) {
                // 恢复之前悬停节点和其相关线条的颜色
                if (hoveredNode) {
                    hoveredNode.material.emissive.setHex(hoveredNode.userData.originalEmissive);
                    lineObjects.forEach(line => {
                        if (line.userData.source === hoveredNode.userData.id || line.userData.target === hoveredNode.userData.id) {
                            line.material.color.setHex(0xffffff);
                            line.material.opacity = 0.3;
                        }
                    });
                }

                // 高亮新的悬停节点和其相关线条
                if (newHoveredNode) {
                    newHoveredNode.material.emissive.setHex(0xff0000); // 红色高亮
                    lineObjects.forEach(line => {
                        if (line.userData.source === newHoveredNode.userData.id || line.userData.target === newHoveredNode.userData.id) {
                            line.material.color.setHex(0xff0000); // 红色高亮
                            line.material.opacity = 0.8; // 提高不透明度
                        }
                    });
                }

                hoveredNode = newHoveredNode;
            }
        };

        renderer.domElement.addEventListener('mousemove', handleMouseMove);

        // 7. 创建动画循环
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // 8. 处理窗口大小变化
        const handleResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // 9. 组件卸载时清理资源
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('mousemove', handleMouseMove);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
        };
    }, [graphData]);

    return <div ref={mountRef} style={{ width: '100%', height: 'calc(100vh - 64px)' }} />;
}

export default ThreeDUniversePage;