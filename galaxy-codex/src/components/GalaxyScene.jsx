import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d';
import useStore from '../store/useStore';

// A component to handle the camera flying to a target
const CameraController = ({ focusNode }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state, delta) => {
    if (focusNode && focusNode.x !== undefined) {
      // Calculate target position (offset from node)
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(focusNode.x, focusNode.y, focusNode.z);
      
      const targetPos = {
        x: focusNode.x * distRatio,
        y: focusNode.y * distRatio,
        z: focusNode.z * distRatio
      };

      // Lerp camera position
      state.camera.position.lerp(vec.set(targetPos.x, targetPos.y, targetPos.z), delta * 2);
      
      // Make camera look at the node
      // controls.target is used by OrbitControls
      if (controls) {
        controls.target.lerp(vec.set(focusNode.x, focusNode.y, focusNode.z), delta * 2);
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
  
  // Simulation State
  const simulation = useMemo(() => {
    return forceSimulation()
      .numDimensions(3)
      .force('link', forceLink().id(d => d.id).distance(60)) // Increased distance
      .force('charge', forceManyBody().strength(-150)) // Increased repulsion
      .force('center', forceCenter());
  }, []);

  // Update simulation when data changes - preserving state to avoid crashes
  useEffect(() => {
    // 1. Get current simulation nodes (to preserve their positions/velocity)
    const currentSimNodes = simulation.nodes();
    
    // 2. Create a map for fast lookup of existing physics state
    const simNodeMap = new Map(currentSimNodes.map(n => [n.id, n]));

    // 3. Prepare new nodes, preserving state if exists
    const newNodes = graphData.nodes.map(n => {
        const existing = simNodeMap.get(n.id);
        if (existing) {
            // Update properties (like color/val) but keep physics state (x, y, z, vx, vy, vz)
            return { 
              ...n, 
              x: existing.x, 
              y: existing.y, 
              z: existing.z, 
              vx: existing.vx, 
              vy: existing.vy, 
              vz: existing.vz 
            };
        } else {
            // New node - D3 will initialize x,y,z
            // Can optionally set initial position near parent if we knew who triggered it, 
            // but for now random spawn is fine (or 0,0,0)
            return { ...n }; 
        }
    });

    // 4. Prepare links
    // D3 mutates links to replace string IDs with object references.
    // We must ensure we pass object references that match the 'newNodes' array exactly.
    const nodeMap = new Map(newNodes.map(n => [n.id, n]));
    
    const newLinks = graphData.links.map(l => {
        // The source/target in graphData might be strings (IDs) or objects (if came from store that way)
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;

        return {
            ...l,
            source: nodeMap.get(sourceId),
            target: nodeMap.get(targetId)
        };
    }).filter(l => l.source && l.target); // Safety filter

    // 5. Update simulation
    simulation.nodes(newNodes);
    simulation.force('link').links(newLinks);
    
    // 6. Re-heat simulation slightly if nodes changed
    if (newNodes.length !== currentSimNodes.length || newLinks.length !== simulation.force('link').links().length) {
        simulation.alpha(1).restart();
    }

    setRenderNodes(newNodes);
    setRenderLinks(newLinks);

  }, [graphData, simulation]);

  // Animation Loop
  useFrame(() => {
    simulation.tick(); // Tick physics
  });

  return (
    <>
      <CameraController focusNode={focusNode} />
      
      <group>
        {/* Links */}
        {renderLinks.map((link) => (
            <GraphLink key={`${link.source.id}-${link.target.id}`} link={link} />
        ))}

        {/* Nodes */}
        {renderNodes.map((node) => (
          <GraphNode 
            key={node.id} 
            node={node} 
            onNodeClick={async () => {
                setFocusNode(node);
                setActiveNode(node.id);
                await expandNode(node.id);
                simulation.alpha(0.3).restart(); // Gentle restart
            }} 
          />
        ))}
      </group>
    </>
  );
};

// Individual Node Component
const GraphNode = ({ node, onNodeClick }) => {
  const ref = useRef();
  
  useFrame(() => {
    if (ref.current && node.x !== undefined) {
      // Check for NaN to prevent crashes
      if (!isNaN(node.x) && !isNaN(node.y) && !isNaN(node.z)) {
        ref.current.position.set(node.x, node.y, node.z);
      }
    }
  });

  const color = node.color || '#00ffff';
  const size = (node.val || 20) / 10;

  return (
    <group ref={ref} onClick={(e) => { e.stopPropagation(); onNodeClick(); }}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      
      {/* Wireframe Shell */}
      <mesh>
        <icosahedronGeometry args={[size * 1.4, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.2} toneMapped={false} />
      </mesh>

      {/* Label */}
      <Billboard>
        <Text
          position={[0, size * 2, 0]}
          fontSize={3} // Slightly smaller text
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {node.name}
        </Text>
      </Billboard>
    </group>
  );
};

// Link Component
const GraphLink = ({ link }) => {
  const ref = useRef();
  
  useFrame(() => {
    if (ref.current && link.source && link.target && link.source.x !== undefined && link.target.x !== undefined) {
        const sx = link.source.x, sy = link.source.y, sz = link.source.z;
        const tx = link.target.x, ty = link.target.y, tz = link.target.z;

        if (!isNaN(sx) && !isNaN(tx)) {
            const start = new THREE.Vector3(sx, sy, sz);
            const end = new THREE.Vector3(tx, ty, tz);
            
            const distance = start.distanceTo(end);
            const position = start.clone().add(end).multiplyScalar(0.5);
            
            ref.current.position.copy(position);
            ref.current.lookAt(end);
            ref.current.scale.z = distance;
        }
    }
  });

  return (
    <mesh ref={ref}>
      {/* Thin laser beam */}
      <boxGeometry args={[0.1, 0.1, 1]} />
      <meshBasicMaterial color="#4444aa" transparent opacity={0.3} toneMapped={false} />
    </mesh>
  );
};

// Main Scene Wrapper
const GalaxyScene = () => {
  return (
    <Canvas 
      camera={{ position: [0, 0, 100], fov: 60 }} 
      style={{ background: '#000000' }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000');
      }}
    >
      <OrbitControls enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
      
      {/* Environment */}
      <Stars radius={300} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
      </EffectComposer>

      {/* Graph */}
      <GraphContent />
    </Canvas>
  );
};

export default GalaxyScene;
