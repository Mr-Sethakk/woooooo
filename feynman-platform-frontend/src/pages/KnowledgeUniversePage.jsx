// src/pages/KnowledgeUniversePage.jsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import apiClient from '../api/axios';
import AuroraBackground from '../components/AuroraBackground';

function KnowledgeUniversePage() {
    const mountRef = useRef(null);
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [hoveredNodeData, setHoveredNodeData] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        let animationFrameId;
        const currentMount = mountRef.current;

        // --- 1. 基础设置 ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 5000);
        camera.position.set(0, 150, 450);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        currentMount.appendChild(renderer.domElement);

        // CSS2D 渲染器（用于文字标签）
        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        currentMount.appendChild(labelRenderer.domElement);

        // --- 2. 加载中心 GLTF 模型 ---
        let centerModel = new THREE.Group();
        scene.add(centerModel);
        
        // 先加载纹理
        const textureLoader = new THREE.TextureLoader();
        const modelTexture = textureLoader.load(
            '/textures/Material_baseColor.png',
            (texture) => {
                console.log('✅ 纹理加载成功！', texture);
                texture.flipY = false; // GLTF 纹理通常不需要翻转
                texture.needsUpdate = true;
            },
            (progress) => {
                console.log('纹理加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
            },
            (error) => {
                console.error('❌ 纹理加载失败:', error);
            }
        );
        
        // 设置纹理参数
        modelTexture.flipY = false;
        modelTexture.encoding = THREE.sRGBEncoding;
        
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
            '/models/scene.gltf',
            (gltf) => {
                console.log('✅ GLTF 模型加载成功', gltf);
                centerModel.add(gltf.scene);
                
                // 调整模型大小和位置
                centerModel.scale.set(30, 30, 30);
                centerModel.position.set(0, 0, 0);
                
                // 遍历模型的所有网格，应用纹理材质
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        console.log('🎨 应用纹理到网格:', child.name);
                        
                        // 创建带纹理的标准材质
                        child.material = new THREE.MeshStandardMaterial({
                            map: modelTexture,
                            color: 0xffffff,
                            emissive: 0xff8800,
                            emissiveIntensity: 0.2,
                            roughness: 0.6,
                            metalness: 0.1,
                            side: THREE.DoubleSide,
                            transparent: true,
                            alphaTest: 0.5
                        });
                        
                        child.material.needsUpdate = true;
                    }
                });
                
                // 在热狗上方添加标签（类似美元标签的样式）
                const hotdogLabelDiv = document.createElement('div');
                hotdogLabelDiv.className = 'dollar-label';
                hotdogLabelDiv.textContent = '🌭 热狗元宇宙！';
                
                // 使用和美元标签相同的样式
                hotdogLabelDiv.style.color = '#ff6b00';
                hotdogLabelDiv.style.fontSize = '28px';
                hotdogLabelDiv.style.fontWeight = 'bold';
                hotdogLabelDiv.style.textShadow = '0 0 10px rgba(255, 107, 0, 0.6), 0 0 20px rgba(255, 107, 0, 0.6), 0 2px 4px rgba(0,0,0,0.8)';
                hotdogLabelDiv.style.fontFamily = 'Arial, sans-serif';
                hotdogLabelDiv.style.padding = '6px 12px';
                hotdogLabelDiv.style.background = 'rgba(0, 0, 0, 0.75)';
                hotdogLabelDiv.style.borderRadius = '6px';
                hotdogLabelDiv.style.border = '2px solid #ff8800';
                hotdogLabelDiv.style.boxShadow = '0 0 20px rgba(255, 136, 0, 0.6)';
                
                const hotdogLabel = new CSS2DObject(hotdogLabelDiv);
                hotdogLabel.position.set(0, 1, 0); // 在热狗上方（几乎紧贴模型）
                centerModel.add(hotdogLabel);
                console.log('🏷️ 热狗标签已添加');
            },
            (progress) => {
                console.log('模型加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
            },
            (error) => {
                console.error('❌ GLTF 模型加载失败:', error);
            }
        );

        const centerLight = new THREE.PointLight(0xffaa00, 2.5, 500);
        centerLight.position.set(0, 0, 0);
        scene.add(centerLight);

        // --- 3. 环境光照 ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));

        // --- 4. 轨道控制器 ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // --- 5. 交互变量 ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let selectedNode = null;
        let hoveredNode = null;
        let nodes = [];
        let links = [];

        // 相机跟随变量
        let isFollowing = false;
        let followOffset = new THREE.Vector3();
        let targetCameraPos = new THREE.Vector3();
        let targetLookAt = new THREE.Vector3();

        // --- 6. 创建选中和悬停圆环 ---
        const createRing = (color, size = 15, thickness = 1) => {
            const ringGeometry = new THREE.TorusGeometry(size, thickness, 16, 100);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.visible = false;
            scene.add(ring);
            return ring;
        };

        const selectedRing = createRing(0xffff00, 15, 1);
        const hoverRing = createRing(0x00ffff, 15, 0.8);

        // --- 7. 美元纸币创建函数 ---
        const getDollarStyle = (mastery) => {
            if (mastery < 0.2) return { color: 0xcccccc, text: '$1', value: 1, bgColor: '#cccccc' };
            if (mastery < 0.4) return { color: 0xe8d4a0, text: '$5', value: 5, bgColor: '#e8d4a0' };
            if (mastery < 0.6) return { color: 0x90ee90, text: '$10', value: 10, bgColor: '#90ee90' };
            if (mastery < 0.8) return { color: 0x87ceeb, text: '$20', value: 20, bgColor: '#87ceeb' };
            if (mastery < 0.95) return { color: 0xffc0cb, text: '$50', value: 50, bgColor: '#ffc0cb' };
            return { color: 0xffd700, text: '$100', value: 100, bgColor: '#ffd700' };
        };

        const shadeColor = (color, percent) => {
            const num = parseInt(color.slice(1), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255))
                .toString(16).slice(1);
        };

        const createDollarBill = (style, kp) => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createLinearGradient(0, 0, 512, 256);
            gradient.addColorStop(0, style.bgColor);
            gradient.addColorStop(1, shadeColor(style.bgColor, -20));
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 256);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 8;
            ctx.strokeRect(10, 10, 492, 236);
            
            ctx.beginPath();
            ctx.arc(128, 128, 60, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(style.text, 128, 128);
            
            ctx.font = 'bold 60px Arial';
            ctx.fillText(style.text, 400, 128);
            
            ctx.font = '20px Arial';
            ctx.fillStyle = '#333';
            const name = kp.name || '知识点';
            ctx.fillText(name.substring(0, 15), 256, 220);
            
            const texture = new THREE.CanvasTexture(canvas);
            const geo = new THREE.PlaneGeometry(96, 48); // 原来是 24x12，现在是四倍大小
            const mat = new THREE.MeshStandardMaterial({ 
                map: texture, 
                side: THREE.DoubleSide,
                roughness: 0.4,
                metalness: 0.2,
                emissive: style.color,
                emissiveIntensity: 0.3
            });
            
            const mesh = new THREE.Mesh(geo, mat);
            
            // 创建文字标签 - 每个面值不同颜色
            const labelDiv = document.createElement('div');
            labelDiv.className = 'dollar-label';
            labelDiv.textContent = style.text;
            
            // 根据面值设置不同颜色（更鲜艳的配色）
            let labelColor, borderColor, glowColor;
            switch(style.value) {
                case 1:
                    labelColor = '#ef4444'; // 红色 - $1
                    borderColor = '#dc2626';
                    glowColor = 'rgba(239, 68, 68, 0.6)';
                    break;
                case 5:
                    labelColor = '#f59e0b'; // 橙色 - $5
                    borderColor = '#d97706';
                    glowColor = 'rgba(245, 158, 11, 0.6)';
                    break;
                case 10:
                    labelColor = '#10b981'; // 绿色 - $10
                    borderColor = '#059669';
                    glowColor = 'rgba(16, 185, 129, 0.6)';
                    break;
                case 20:
                    labelColor = '#3b82f6'; // 蓝色 - $20
                    borderColor = '#2563eb';
                    glowColor = 'rgba(59, 130, 246, 0.6)';
                    break;
                case 50:
                    labelColor = '#a855f7'; // 紫色 - $50
                    borderColor = '#9333ea';
                    glowColor = 'rgba(168, 85, 247, 0.6)';
                    break;
                case 100:
                    labelColor = '#fbbf24'; // 金色 - $100
                    borderColor = '#f59e0b';
                    glowColor = 'rgba(251, 191, 36, 0.6)';
                    break;
                default:
                    labelColor = '#ffffff';
                    borderColor = '#cccccc';
                    glowColor = 'rgba(255, 255, 255, 0.6)';
            }
            
            labelDiv.style.color = labelColor;
            labelDiv.style.fontSize = '28px';
            labelDiv.style.fontWeight = 'bold';
            labelDiv.style.textShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 2px 4px rgba(0,0,0,0.8)`;
            labelDiv.style.fontFamily = 'Arial, sans-serif';
            labelDiv.style.padding = '6px 12px';
            labelDiv.style.background = 'rgba(0, 0, 0, 0.75)';
            labelDiv.style.borderRadius = '6px';
            labelDiv.style.border = `2px solid ${borderColor}`;
            labelDiv.style.boxShadow = `0 0 20px ${glowColor}`;
            
            console.log(`创建标签: ${style.text}, 颜色: ${labelColor}`);
            
            const label = new CSS2DObject(labelDiv);
            label.position.set(0, -10, 0); // 在美元下方
            mesh.add(label);
            
            return mesh;
        };

        // --- 8. 创建轨道线 ---
        const createOrbitLine = (orbitRadius, orbitInclination, orbitLongitude) => {
            const orbitGeometry = new THREE.BufferGeometry();
            const orbitPoints = [];
            const segments = 128;
            
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = orbitRadius * Math.cos(angle);
                const y = orbitRadius * Math.sin(angle) * Math.sin(orbitInclination);
                const z = orbitRadius * Math.sin(angle) * Math.cos(orbitInclination);
                const finalX = x * Math.cos(orbitLongitude) - z * Math.sin(orbitLongitude);
                const finalY = y;
                const finalZ = x * Math.sin(orbitLongitude) + z * Math.cos(orbitLongitude);
                orbitPoints.push(finalX, finalY, finalZ);
            }
            
            orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
            const orbitMaterial = new THREE.LineBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.15 
            });
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            scene.add(orbitLine);
            return orbitLine;
        };

        // --- 9. 鼠标事件 ---
        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            setMousePosition({ x: event.clientX, y: event.clientY });

            raycaster.setFromCamera(mouse, camera);
            const meshes = nodes.map(n => n.mesh).filter(m => m);
            const intersects = raycaster.intersectObjects(meshes);

            if (intersects.length > 0) {
                const hoveredObject = intersects[0].object;
                document.body.style.cursor = 'pointer';
                setHoveredNodeData(hoveredObject.userData.kp);
                
                if (hoveredNode !== hoveredObject) {
                    if (hoveredNode && hoveredNode !== selectedNode) {
                        hoveredNode.scale.set(1, 1, 1);
                    }
                    hoveredNode = hoveredObject;
                    if (hoveredObject !== selectedNode) {
                        hoveredObject.scale.set(1.1, 1.1, 1.1);
                        hoverRing.position.copy(hoveredObject.position);
                        hoverRing.visible = true;
                    }
                }
            } else {
                document.body.style.cursor = 'default';
                setHoveredNodeData(null);
                if (hoveredNode && hoveredNode !== selectedNode) {
                    hoveredNode.scale.set(1, 1, 1);
                    hoveredNode = null;
                }
                hoverRing.visible = false;
            }
        };

        const onMouseClick = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const meshes = nodes.map(n => n.mesh).filter(m => m);
            const intersects = raycaster.intersectObjects(meshes);

            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                
                if (selectedNode && selectedNode !== clickedObject) {
                    selectedNode.scale.set(1, 1, 1);
                }
                
                hoverRing.visible = false;
                selectedNode = clickedObject;
                selectedNode.scale.set(1.2, 1.2, 1.2);
                setSelectedNodeData(selectedNode.userData.kp);
                selectedRing.position.copy(selectedNode.position);
                selectedRing.visible = true;

                // 计算跟随偏移
                const direction = selectedNode.position.clone().sub(camera.position).normalize();
                const distance = 50;
                followOffset.copy(direction).multiplyScalar(-distance);
                
                // 启动跟随模式
                isFollowing = true;

            } else {
                if (selectedNode) {
                    selectedNode.scale.set(1, 1, 1);
                    selectedNode = null;
                    setSelectedNodeData(null);
                    selectedRing.visible = false;
                    isFollowing = false;
                }
            }
        };

        currentMount.addEventListener('mousemove', onMouseMove);
        currentMount.addEventListener('click', onMouseClick);

        // --- 10. 创建文字标签 ---
        const createTextLabel = (text, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // 背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.roundRect(10, 30, 236, 68, 10);
            ctx.fill();
            
            // 文字
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(15, 7.5, 1);
            return sprite;
        };

        // --- 11. 加载数据 ---
        apiClient.get('/graph/knowledge-map').then(({ data }) => {
            console.log('知识图谱数据:', data);
            console.log('第一个节点的完整数据:', data.nodes[0]);
            
            nodes = data.nodes.map((node, index) => {
                // 检查各种可能的掌握度字段
                let mastery;
                if (node.mastery !== undefined) {
                    mastery = node.mastery;
                } else if (node.progress !== undefined) {
                    mastery = node.progress;
                } else if (node.completionRate !== undefined) {
                    mastery = node.completionRate;
                } else {
                    // 如果没有掌握度信息，根据索引生成固定值（不会每次刷新都变）
                    mastery = ((index * 0.173 + 0.3) % 1);
                }
                
                console.log(`节点 ${node.name}: mastery = ${mastery.toFixed(2)}, 面值: ${getDollarStyle(mastery).text}`);
                const style = getDollarStyle(mastery);
                const mesh = createDollarBill(style, node);
                
                // 创建文字标签
                const label = createTextLabel(style.text, style.bgColor);
                mesh.add(label);
                label.position.set(0, -10, 0); // 放在美元下方
                
                const orbitRadius = 120 + Math.random() * 80;
                const orbitSpeed = 0.0008 + Math.random() * 0.0008;
                const orbitInclination = Math.random() * Math.PI;
                const orbitLongitude = Math.random() * Math.PI * 2;
                const orbitAngle = Math.random() * Math.PI * 2;
                const selfRotationSpeed = 0.01 + Math.random() * 0.02;
                
                const x = orbitRadius * Math.cos(orbitAngle);
                const y = orbitRadius * Math.sin(orbitAngle) * Math.sin(orbitInclination);
                const z = orbitRadius * Math.sin(orbitAngle) * Math.cos(orbitInclination);
                const finalX = x * Math.cos(orbitLongitude) - z * Math.sin(orbitLongitude);
                const finalY = y;
                const finalZ = x * Math.sin(orbitLongitude) + z * Math.cos(orbitLongitude);
                
                mesh.position.set(finalX, finalY, finalZ);
                
                const orbitLine = createOrbitLine(orbitRadius, orbitInclination, orbitLongitude);
                
                mesh.userData = { 
                    kp: node,
                    orbitRadius,
                    orbitSpeed,
                    orbitAngle,
                    orbitInclination,
                    orbitLongitude,
                    selfRotationSpeed,
                    orbitLine
                };
                scene.add(mesh);
                return { ...node, mesh };
            });

            links = data.links.map((link) => {
                const material = new THREE.LineBasicMaterial({ 
                    color: 0x4488ff, 
                    transparent: true, 
                    opacity: 0.2 
                });
                const geometry = new THREE.BufferGeometry();
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                return { line, geometry, source: link.source, target: link.target };
            });
        });

        // --- 11. 动画循环 ---
        const clock = new THREE.Clock();
        let lastTime = 0;
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();
            const delta = elapsed - lastTime;
            lastTime = elapsed;
            
            // 中心模型动画
            if (centerModel) {
                centerModel.rotation.y += 0.02;
                centerModel.position.y = Math.sin(elapsed * 1.8) * 10;
                centerModel.rotation.x = Math.sin(elapsed * 2.2) * 0.1;
                centerModel.rotation.z = Math.cos(elapsed * 2.5) * 0.08;
            }
            
            // 美元运动
            nodes.forEach(node => {
                if (node.mesh && node.mesh.userData) {
                    const userData = node.mesh.userData;
                    userData.orbitAngle += userData.orbitSpeed;
                    
                    const x = userData.orbitRadius * Math.cos(userData.orbitAngle);
                    const y = userData.orbitRadius * Math.sin(userData.orbitAngle) * Math.sin(userData.orbitInclination);
                    const z = userData.orbitRadius * Math.sin(userData.orbitAngle) * Math.cos(userData.orbitInclination);
                    const finalX = x * Math.cos(userData.orbitLongitude) - z * Math.sin(userData.orbitLongitude);
                    const finalY = y;
                    const finalZ = x * Math.sin(userData.orbitLongitude) + z * Math.cos(userData.orbitLongitude);
                    
                    node.mesh.position.set(finalX, finalY, finalZ);
                    node.mesh.rotation.y += userData.selfRotationSpeed;
                    node.mesh.rotation.x += userData.selfRotationSpeed * 0.5;
                }
            });
            
            // 相机跟随（丝滑版本）
            if (isFollowing && selectedNode) {
                targetCameraPos.copy(selectedNode.position).add(followOffset);
                targetLookAt.copy(selectedNode.position);
                
                // 使用lerp实现平滑跟随
                camera.position.lerp(targetCameraPos, 0.1);
                controls.target.lerp(targetLookAt, 0.1);
                camera.lookAt(controls.target);
            }
            
            // 圆环跟随
            if (selectedRing.visible && selectedNode) {
                selectedRing.rotation.z += 0.02;
                selectedRing.position.copy(selectedNode.position);
            }
            
            if (hoverRing.visible && hoveredNode) {
                hoverRing.rotation.z -= 0.03;
                hoverRing.position.copy(hoveredNode.position);
            }
            
            // 更新连线
            links.forEach(link => {
                const sourceNode = nodes.find(n => n.id === link.source);
                const targetNode = nodes.find(n => n.id === link.target);
                
                if (sourceNode && targetNode && sourceNode.mesh && targetNode.mesh) {
                    const positions = new Float32Array([
                        sourceNode.mesh.position.x, sourceNode.mesh.position.y, sourceNode.mesh.position.z,
                        targetNode.mesh.position.x, targetNode.mesh.position.y, targetNode.mesh.position.z
                    ]);
                    link.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    link.geometry.attributes.position.needsUpdate = true;
                }
            });
            
            controls.update();
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        };
        animate();

        // --- 12. 响应式 ---
        const handleResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // --- 13. 清理 ---
        return () => {
            window.removeEventListener('resize', handleResize);
            currentMount.removeEventListener('click', onMouseClick);
            currentMount.removeEventListener('mousemove', onMouseMove);
            document.body.style.cursor = 'default';
            if (currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement);
            }
            if (currentMount.contains(labelRenderer.domElement)) {
                currentMount.removeChild(labelRenderer.domElement);
            }
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', color: 'white' }}>
            <AuroraBackground />
            <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

            {/* 悬停提示 */}
            {hoveredNodeData && !selectedNodeData && (
                <div style={{
                    position: 'fixed',
                    left: mousePosition.x + 15,
                    top: mousePosition.y + 15,
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 215, 0, 0.5)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                }}>
                    💵 {hoveredNodeData.name || '知识点'}
                    {hoveredNodeData.mastery !== undefined && (
                        <span style={{ 
                            marginLeft: '10px',
                            color: hoveredNodeData.mastery > 0.8 ? '#4ade80' : 
                                   hoveredNodeData.mastery > 0.5 ? '#fbbf24' : '#ef4444'
                        }}>
                            {(hoveredNodeData.mastery * 100).toFixed(0)}%
                        </span>
                    )}
                </div>
            )}

            {/* 选中信息面板 */}
            {selectedNodeData && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: '30px',
                    transform: 'translateY(-50%)',
                    padding: '25px',
                    background: 'rgba(0, 0, 0, 0.85)',
                    border: '2px solid rgba(255, 215, 0, 0.6)',
                    borderRadius: '12px',
                    maxWidth: '400px',
                    backdropFilter: 'blur(15px)',
                    animation: 'slideIn 0.5s ease',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}>
                    <h2 style={{ 
                        margin: '0 0 15px 0', 
                        color: '#ffd700',
                        fontSize: '24px',
                        borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
                        paddingBottom: '10px'
                    }}>
                        💵 {selectedNodeData.name || '知识点'}
                    </h2>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ color: '#aaa', fontSize: '14px' }}>ID：</span>
                        <span style={{ color: '#fff', fontSize: '14px' }}>{selectedNodeData.id}</span>
                    </div>
                    
                    {selectedNodeData.mastery !== undefined && (
                        <div style={{ marginBottom: '12px' }}>
                            <span style={{ color: '#aaa', fontSize: '14px' }}>掌握度：</span>
                            <span style={{ 
                                color: selectedNodeData.mastery > 0.8 ? '#4ade80' : 
                                       selectedNodeData.mastery > 0.5 ? '#fbbf24' : '#ef4444',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}>
                                {(selectedNodeData.mastery * 100).toFixed(1)}%
                            </span>
                        </div>
                    )}
                    
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#ccc'
                    }}>
                        💡 提示：点击空白区域取消跟随
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { 
                        opacity: 0; 
                        transform: translateY(-50%) translateX(50px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(-50%) translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}

export default KnowledgeUniversePage;
