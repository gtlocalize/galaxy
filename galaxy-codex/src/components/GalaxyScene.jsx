import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
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
    if (focusNode) {
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
  
  // References for instances to update positions without React reconciler overhead
  const groupRef = useRef();
  
  // Simulation State
  const simulation = useMemo(() => {
    return forceSimulation()
      .numDimensions(3)
      .force('link', forceLink().id(d => d.id).distance(50))
      .force('charge', forceManyBody().strength(-100)) // Repel
      .force('center', forceCenter());
  }, []);

  // Update simulation when data changes
  useEffect(() => {
    // Clone data to avoid mutating store state directly in d3
    const nodes = graphData.nodes.map(n => ({ ...n }));
    const links = graphData.links.map(l => ({ ...l }));

    simulation.nodes(nodes);
    simulation.force('link').links(links);
    simulation.alpha(1).restart();

    // Cleanup not really possible for the sim instance itself, but we restart it.
  }, [graphData, simulation]);

  // Animation Loop
  useFrame(() => {
    simulation.tick(); // Tick physics
    
    // Update React/Three objects
    // This is a naive React approach (re-rendering). 
    // For 1000+ nodes we'd use instancedMesh and direct buffer updates.
    // But for < 100 nodes, mapping Components is fine and easier to read.
    
    // However, to make simulation smooth, we force update? 
    // Actually, standard React state update is too slow for 60fps physics.
    // We use a ref and imperative updates.
    if (groupRef.current) {
        // The children are updated automatically if we map them to the simulation nodes?
        // No, we need to bridge the d3 node x/y/z to the THREE object position.
        
        // Hack: We trigger a re-render or update refs?
        // Better: We map the nodes once, and in useFrame we iterate the children.
        // But the nodes list changes.
        
        // Simplest robust path for "Gemini Code": 
        // Just let React handle the structure, useFrame for positions.
    }
  });

  // We will use a "forceUpdate" hack or just use the fact that 
  // we can access the simulation nodes directly in the render loop
  // BUT reacting to graphData changes is key.
  
  // Let's try a different approach: 
  // The `nodes` array in the simulation matches `graphData.nodes` (cloned).
  // We need to render based on `simulation.nodes()`.
  // Since simulation mutates x,y,z in place, we can just read them.
  // We need to trigger a re-render of the scene to move things? No, that's slow.
  // We use refs.

  const nodes = simulation.nodes();
  const links = simulation.force('link').links();

  return (
    <>
      <CameraController focusNode={focusNode} />
      
      <group ref={groupRef}>
        {/* Links */}
        {links.map((link, i) => (
            <GraphLink key={`${link.source.id}-${link.target.id}`} link={link} />
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <GraphNode 
            key={node.id} 
            node={node} 
            onNodeClick={async () => {
                setFocusNode(node);
                setActiveNode(node.id);
                await expandNode(node.id);
                // Re-heat sim
                simulation.alpha(1).restart();
            }} 
          />
        ))}
      </group>
    </>
  );
};

// Individual Node Component (moved out for per-frame optimization potential)
const GraphNode = ({ node, onNodeClick }) => {
  const ref = useRef();
  
  useFrame(() => {
    if (ref.current && node.x) {
      ref.current.position.set(node.x, node.y, node.z);
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
          fontSize={4}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.2}
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
    if (ref.current && link.source.x && link.target.x) {
      const start = new THREE.Vector3(link.source.x, link.source.y, link.source.z);
      const end = new THREE.Vector3(link.target.x, link.target.y, link.target.z);
      
      const distance = start.distanceTo(end);
      const position = start.clone().add(end).multiplyScalar(0.5);
      
      ref.current.position.copy(position);
      ref.current.lookAt(end);
      ref.current.scale.z = distance;
    }
  });

  return (
    <mesh ref={ref}>
      {/* Box geometry with length 1 on Z axis implies we just scale Z */}
      <boxGeometry args={[0.5, 0.5, 1]} />
      <meshBasicMaterial color="#4444aa" transparent opacity={0.3} toneMapped={false} />
    </mesh>
  );
};

// Main Scene Wrapper
const GalaxyScene = () => {
  return (
    <Canvas camera={{ position: [0, 0, 100], fov: 60 }} style={{ background: '#000000' }}>
      <OrbitControls enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
      
      {/* Environment */}
      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* Post Processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2} />
      </EffectComposer>

      {/* Graph */}
      <GraphContent />
    </Canvas>
  );
};

export default GalaxyScene;
