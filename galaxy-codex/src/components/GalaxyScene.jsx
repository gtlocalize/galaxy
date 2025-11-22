import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d';
import useStore from '../store/useStore';

// Shared scratch vectors to avoid garbage collection
const _vec3_1 = new THREE.Vector3();
const _vec3_2 = new THREE.Vector3();
const _vec3_3 = new THREE.Vector3();

// A component to handle the camera flying to a target
const CameraController = ({ focusNode }) => {
  const { camera, controls } = useThree();

  useFrame((state, delta) => {
    if (focusNode && focusNode.x !== undefined) {
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(focusNode.x, focusNode.y, focusNode.z);
      
      const tx = focusNode.x * distRatio;
      const ty = focusNode.y * distRatio;
      const tz = focusNode.z * distRatio;

      // Lerp camera
      _vec3_1.set(tx, ty, tz);
      state.camera.position.lerp(_vec3_1, delta * 2);
      
      // Lerp target
      if (controls) {
        _vec3_2.set(focusNode.x, focusNode.y, focusNode.z);
        controls.target.lerp(_vec3_2, delta * 2);
        controls.update();
      }
    }
  });
  return null;
};

const GraphContent = () => {
  const { graphData, expandNode, setActiveNode } = useStore();
  const [focusNode, setFocusNode] = useState(null);
  const [renderNodes, setRenderNodes] = useState([]);
  const [renderLinks, setRenderLinks] = useState([]);
  
  const simulation = useMemo(() => {
    return forceSimulation()
      .numDimensions(3)
      .force('link', forceLink().id(d => d.id).distance(60))
      .force('charge', forceManyBody().strength(-150))
      .force('center', forceCenter());
  }, []);

  useEffect(() => {
    const currentSimNodes = simulation.nodes();
    const simNodeMap = new Map(currentSimNodes.map(n => [n.id, n]));

    const newNodes = graphData.nodes.map(n => {
        const existing = simNodeMap.get(n.id);
        if (existing) {
            return { 
              ...n, 
              x: existing.x, y: existing.y, z: existing.z, 
              vx: existing.vx, vy: existing.vy, vz: existing.vz 
            };
        } else {
            return { ...n }; 
        }
    });

    const nodeMap = new Map(newNodes.map(n => [n.id, n]));
    
    const newLinks = graphData.links.map(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;

        return {
            ...l,
            source: nodeMap.get(sourceId),
            target: nodeMap.get(targetId)
        };
    }).filter(l => l.source && l.target);

    simulation.nodes(newNodes);
    simulation.force('link').links(newLinks);
    
    if (newNodes.length !== currentSimNodes.length) {
        simulation.alpha(1).restart();
    }

    setRenderNodes(newNodes);
    setRenderLinks(newLinks);

  }, [graphData, simulation]);

  useFrame(() => {
    simulation.tick();
  });

  return (
    <>
      <CameraController focusNode={focusNode} />
      
      <group>
        {renderLinks.map((link) => (
            <GraphLink key={`${link.source.id}-${link.target.id}`} link={link} />
        ))}

        {renderNodes.map((node) => (
          <GraphNode 
            key={node.id} 
            node={node} 
            onNodeClick={async () => {
                setFocusNode(node);
                setActiveNode(node.id);
                await expandNode(node.id);
                simulation.alpha(0.3).restart();
            }} 
          />
        ))}
      </group>
    </>
  );
};

const GraphNode = ({ node, onNodeClick }) => {
  const ref = useRef();
  
  useFrame(() => {
    if (ref.current && node.x !== undefined) {
      if (!isNaN(node.x) && !isNaN(node.y) && !isNaN(node.z)) {
        ref.current.position.set(node.x, node.y, node.z);
      }
    }
  });

  const color = node.color || '#00ffff';
  const size = (node.val || 20) / 10;

  return (
    <group ref={ref} onClick={(e) => { e.stopPropagation(); onNodeClick(); }}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      
      <mesh>
        <icosahedronGeometry args={[size * 1.4, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.2} toneMapped={false} />
      </mesh>

      {/* Removed 3D Text to fix Context Lost crash */}
      {/* Replaced with HTML label for stability */}
      <Html position={[0, size * 2 + 2, 0]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
        <div style={{ 
            color: color, 
            fontFamily: 'sans-serif', 
            fontSize: '12px', 
            textShadow: '0 0 2px black',
            whiteSpace: 'nowrap'
        }}>
            {node.name}
        </div>
      </Html>
    </group>
  );
};

const GraphLink = ({ link }) => {
  const ref = useRef();
  
  useFrame(() => {
    if (ref.current && link.source && link.target && link.source.x !== undefined && link.target.x !== undefined) {
        const sx = link.source.x, sy = link.source.y, sz = link.source.z;
        const tx = link.target.x, ty = link.target.y, tz = link.target.z;

        if (!isNaN(sx) && !isNaN(tx)) {
            // Optimize: Use shared vectors
            _vec3_1.set(sx, sy, sz); // Start
            _vec3_2.set(tx, ty, tz); // End
            
            const distance = _vec3_1.distanceTo(_vec3_2);
            
            // Midpoint: (Start + End) * 0.5
            _vec3_3.copy(_vec3_1).add(_vec3_2).multiplyScalar(0.5);
            
            ref.current.position.copy(_vec3_3);
            ref.current.lookAt(_vec3_2);
            ref.current.scale.z = distance;
        }
    }
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.1, 0.1, 1]} />
      <meshBasicMaterial color="#4444aa" transparent opacity={0.3} toneMapped={false} />
    </mesh>
  );
};

const GalaxyScene = () => {
  return (
    <Canvas 
      camera={{ position: [0, 0, 100], fov: 60 }} 
      style={{ background: '#000000' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000');
      }}
    >
      <OrbitControls enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
      
      <Stars radius={300} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* Bloom still disabled for this test step */}
      {/* <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
      </EffectComposer> */}

      <GraphContent />
    </Canvas>
  );
};

export default GalaxyScene;
