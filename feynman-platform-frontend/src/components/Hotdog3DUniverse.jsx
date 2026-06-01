// src/components/Hotdog3DUniverse.jsx - "去塑料感" 视觉优化版 (完全离线)
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Line } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

// 增强的相机控制器 - 聚焦拉近版 (无修改)
function CameraController({ focusedNode, onFocusChange }) {
  const { camera, scene } = useThree();
  const controls = useRef();

  useFrame(() => {
    if (focusedNode) {
      const targetObject = scene.getObjectByName(`dollar_${focusedNode.id}`);
      if (targetObject) {
        const targetPosition = new THREE.Vector3();
        targetObject.getWorldPosition(targetPosition);

        controls.current.target.lerp(targetPosition, 0.1);

        const targetQuaternion = targetObject.getWorldQuaternion(new THREE.Quaternion());
        const localOffset = new THREE.Vector3(0, 0, 6);
        localOffset.applyQuaternion(targetQuaternion);

        const idealPosition = targetPosition.clone().add(localOffset);
        camera.position.lerp(idealPosition, 0.08);
      }
    } else {
      controls.current.autoRotate = true;
      controls.current.autoRotateSpeed = 0.1;
    }
    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 1.9}
      enableDamping={true}
      dampingFactor={0.05}
      onStart={() => {
        controls.current.autoRotate = false;
        if (focusedNode) onFocusChange(null);
      }}
    />
  );
}

// 热狗模型 - 最终版
function Hotdog3D() {
  const groupRef = useRef();
  const textRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 2) * 0.2 + 0.2;
      groupRef.current.rotation.y = t * 0.1;
    }
    if (textRef.current && textRef.current.style) {
      textRef.current.style.transform = `translateY(${Math.sin(t * 2) * 5}px) rotateY(${Math.sin(t * 1) * 0.2}rad)`;
    }
  });

  return (
    <group ref={groupRef}>
      <group scale={0.6} position={[0, 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 2.5, 48, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#ffc978" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI]}>
          <cylinderGeometry args={[0.58, 0.58, 2.5, 48, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#d4a373" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.40, 2.1, 32, 48]} />
          <meshStandardMaterial color="#a54c2a" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh>
          <tubeGeometry args={[ new THREE.CatmullRomCurve3([...Array(80).fill().map((_, i) => { const a=i/80*Math.PI*6; const r=.15+Math.sin(a*3)*.05; return new THREE.Vector3(-1.2+(i/80)*2.4, .15+Math.sin(a*2)*.1, Math.cos(a)*r)})]), 128, 0.06, 12, false]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={0.5} roughness={0.2} metalness={0.1} />
        </mesh>
      </group>
      <group position={[0, 1.8, 0]}>
        <Html center ref={textRef}>
          <div style={{background:'linear-gradient(135deg, #ffd700, #ff8800, #ff6600)',color:'white',padding:'12px 20px',borderRadius:'12px',fontSize:'20px',fontWeight:'bold',textShadow:'0 0 15px rgba(0,0,0,0.8)',whiteSpace:'nowrap',boxShadow:'0 0 30px rgba(255, 215, 0, 0.9), inset 0 2px 4px rgba(255,255,255,0.3)',border:'2px solid rgba(255, 255, 255, 0.6)',backdropFilter:'blur(5px)'}}>
            🌭 热狗元宇宙
          </div>
        </Html>
      </group>
    </group>
  );
}

// 面向屏幕的科技感聚焦光环 - 样式优化版
function BillboardFocusRing() {
  const groupRef = useRef();
  const innerRingRef = useRef();
  const outerRingRef = useRef();
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 1.5;
      const scale = 1 + Math.sin(t * 3) * 0.1;
      innerRingRef.current.scale.set(scale, scale, scale);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={outerRingRef}>
        <ringGeometry args={[1.8, 1.9, 128]} />
        <meshBasicMaterial color="#7adfff" side={THREE.DoubleSide} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={innerRingRef}>
        <ringGeometry args={[1.4, 1.55, 128]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// 美元钞票 - 材质优化版
function Dollar3D({ node, onClick, isFocused }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  const dollarInfo = useMemo(() => {
    const statusMap = {
      not_started: { v: 1,  c:'#85bb65', g:'#a8e6a3'  },
      in_progress: { v: 5,  c:'#f59e0b', g:'#fbbf24'  },
      review:      { v:20,  c:'#ef4444', g:'#f87171'  },
      mastered:    { v:100, c:'#10b981', g:'#34d399' },
    };
    return statusMap[node.status] || statusMap.not_started;
  }, [node.status]);

  const wrinkledGeometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.6, 0.75, 16, 8); const p=g.attributes.position; for(let i=0;i<p.count;i++){const x=p.getX(i);const y=p.getY(i);p.setZ(i,p.getZ(i)+Math.sin(x*10)*.02+Math.sin(y*15)*.015)} g.computeVertexNormals(); return g;
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const scale = isFocused ? 2.5 : (hovered ? 1.3 : 1);

  return (
    <group name={`dollar_${node.id}`}>
      <mesh visible={false} scale={scale} onClick={(e)=>{e.stopPropagation();onClick(node)}} onPointerOver={(e)=>{e.stopPropagation();setHovered(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}}>
        <planeGeometry args={[2.2, 1.2]} />
      </mesh>

      <mesh ref={meshRef} geometry={wrinkledGeometry} scale={scale} pointerEvents="none">
        <meshStandardMaterial
          color={dollarInfo.c}
          side={THREE.DoubleSide}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      
      <Html position={[0,0,0.02]} center transform scale={scale}>
        <div style={{color:'#1a5f3a',fontSize:isFocused?'24px':'36px',fontWeight:'bold',pointerEvents:'none',textShadow:'0 0 10px rgba(255,255,255,0.5)',fontFamily:'Arial Black, sans-serif'}}>
          ${dollarInfo.v}
        </div>
      </Html>
      
      {isFocused && (
        <Html position={[0,0.7,0]} center>
          <div style={{background:'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,40,0.95) 100%)',color:'#fff',padding:'12px 18px',borderRadius:'12px',border:`2px solid ${dollarInfo.c}`,boxShadow:`0 0 20px ${dollarInfo.g}`,whiteSpace:'nowrap',fontSize:'14px',fontWeight:'600',backdropFilter:'blur(10px)'}}>
            <div style={{marginBottom:'4px'}}>{node.name}</div>
            <div style={{fontSize:'11px',color:'#aaa'}}>{node.status==='mastered'?'✅ 已掌握':node.status==='in_progress'?'📚 学习中':node.status === 'review' ? '🔄 复习中' : '⭐ 未开始'}</div>
          </div>
        </Html>
      )}
      
      {isFocused && <BillboardFocusRing />}
    </group>
  );
}

// 知识关系光束 (无修改)
function KnowledgeStream({ links, focusedNode, nodes }) {
  const visibleLinks = useMemo(() => { if (!focusedNode) return []; return links.filter(link => link.source === focusedNode.id || link.target === focusedNode.id); }, [links, focusedNode]);
  if (!visibleLinks.length) return null;
  return (<group>{visibleLinks.map((link, i) => { const s=nodes.find(n=>n.id===link.source); const t=nodes.find(n=>n.id===link.target); if(!s||!t)return null; return (<AnimatedBeam key={i} sourceId={s.id} targetId={t.id} isSource={link.source===focusedNode.id} />)})}</group>);
}

// 动画光束 (无修改)
function AnimatedBeam({ sourceId, targetId, isSource }) {
  const tubeRef=useRef(); const particlesRef=useRef(); const{scene}=useThree();
  useFrame((state)=>{ const t=state.clock.elapsedTime; const s=scene.getObjectByName(`dollar_${sourceId}`); const tg=scene.getObjectByName(`dollar_${targetId}`); if(s&&tg){const p1=new THREE.Vector3();s.getWorldPosition(p1);const p2=new THREE.Vector3();tg.getWorldPosition(p2);const m=new THREE.Vector3().lerpVectors(p1,p2,0.5);m.y+=1;const c=new THREE.QuadraticBezierCurve3(p1,m,p2);if(tubeRef.current){const pts=c.getPoints(50);tubeRef.current.geometry.setFromPoints(pts)}if(particlesRef.current){const prog=(t*0.5)%1;const pos=c.getPoint(prog);particlesRef.current.position.copy(pos)}}});
  const color=isSource?'#ff9900':'#00ffff'; const glowColor=isSource?'#ffcc00':'#66ffff';
  return (<group><line ref={tubeRef}><bufferGeometry/><lineBasicMaterial color={color} linewidth={3} transparent opacity={0.8}/></line><line ref={tubeRef}><bufferGeometry/><lineBasicMaterial color={glowColor} linewidth={6} transparent opacity={0.3} blending={THREE.AdditiveBlending}/></line><mesh ref={particlesRef}><sphereGeometry args={[0.1,8,8]}/><meshBasicMaterial color={glowColor} transparent opacity={0.9}/></mesh><mesh ref={particlesRef}><sphereGeometry args={[0.2,8,8]}/><meshBasicMaterial color={glowColor} transparent opacity={0.3} blending={THREE.AdditiveBlending}/></mesh></group>);
}

// 轨道路径 (无修改)
function OrbitPath({ orbitParams }) {
  const points = useMemo(() => { const p=[]; const seg=128; const{radiusA,radiusB,u,v}=orbitParams; for(let i=0;i<seg;i++){const t=(i/seg)*Math.PI*2; const pos=new THREE.Vector3().copy(u).multiplyScalar(Math.cos(t)*radiusA).add(new THREE.Vector3().copy(v).multiplyScalar(Math.sin(t)*radiusB)); p.push(pos)} return p; }, [orbitParams]);
  return <Line points={points} color="#ffffff" lineWidth={0.5} transparent opacity={0.15} />;
}

// 轨道上的美元 (无修改)
function OrbitingDollar({ node, orbitParams, onClick, isFocused }) {
  const groupRef = useRef();
  useFrame((state) => { const t=state.clock.getElapsedTime()*orbitParams.speed+orbitParams.startAngle; const{radiusA,radiusB,u,v}=orbitParams; const pos=new THREE.Vector3().copy(u).multiplyScalar(Math.cos(t)*radiusA).add(new THREE.Vector3().copy(v).multiplyScalar(Math.sin(t)*radiusB)); groupRef.current.position.copy(pos); groupRef.current.lookAt(0,0,0); });
  return (<group><group ref={groupRef}><Dollar3D node={node} onClick={onClick} isFocused={isFocused} /></group><OrbitPath orbitParams={orbitParams} /></group>);
}

// 主场景 - 完全离线版
function Scene({ nodes, links, focusedNode, onNodeClick }) {
  const orbitParams = useMemo(() => { const r=8; return nodes.map(() => { let n; do{n=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1)}while(n.length()<0.4); n.normalize(); const up=new THREE.Vector3(0,1,0); let u=new THREE.Vector3().crossVectors(n,up); if(u.length()<0.01){u=new THREE.Vector3().crossVectors(n,new THREE.Vector3(1,0,0))} u.normalize(); const v=new THREE.Vector3().crossVectors(n,u).normalize(); return{radiusA:r,radiusB:r*(0.6+Math.random()*0.2),speed:0.06+Math.random()*0.04,startAngle:Math.random()*Math.PI*2,u,v};});}, [nodes]);

  return (
    <>
      {/* 纯代码光照，确保可见性 */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 10, 5]} intensity={2.5} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#ffd700" distance={30} decay={2} />
      
      <Stars radius={150} depth={80} count={2500} factor={6} saturation={0.6} fade speed={1.2} />
      
      <Hotdog3D />
      
      {nodes.map((node, i) => (
        <OrbitingDollar key={node.id} node={node} orbitParams={orbitParams[i]} onClick={onNodeClick} isFocused={focusedNode?.id === node.id} />
      ))}

      <KnowledgeStream links={links} focusedNode={focusedNode} nodes={nodes} />

      {/* 优化后的后期处理 */}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.2} luminanceThreshold={0.5} luminanceSmoothing={0.9} />
        <ToneMapping exposure={1.1} whitePoint={1} />
      </EffectComposer>
    </>
  );
}

// 导出组件 (无修改)
export default function Hotdog3DUniverse({ nodes, links, onNodeClick, focusedNode }) {
  return (
    <div style={{ width: '100%', height: '88vh', background: '#0d1117', borderRadius: '16px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 10, 25], fov: 75 }} gl={{ antialias: true }}>
        <color attach="background" args={['#0d1117']} />
        <fog attach="fog" args={['#0d1117', 25, 55]} />
        <CameraController focusedNode={focusedNode} onFocusChange={onNodeClick} />
        <Scene nodes={nodes} links={links} focusedNode={focusedNode} onNodeClick={onNodeClick} />
      </Canvas>
          {/* 图例 */}
      <div style={{marginTop:'8px',color:'#fff',fontSize:'14px',display:'flex',gap:'16px',justifyContent:'center'}}>
        <span><strong>$1</strong>：未开始</span>
        <span><strong>$5</strong>：学习中</span>
        <span><strong>$20</strong>：复习中</span>
        <span><strong>$100</strong>：已掌握</span>
      </div>
    </div>
  );
}