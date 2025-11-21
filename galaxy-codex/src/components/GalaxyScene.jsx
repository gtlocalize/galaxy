import React, { useRef, useCallback, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';

const GalaxyScene = () => {
  const fgRef = useRef();
  const { graphData, expandNode, setActiveNode } = useStore();

  const handleNodeClick = useCallback(async (node) => {
    // Focus camera on node
    const distance = 40;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      );
    }

    // Set active and expand
    setActiveNode(node.id);
    await expandNode(node.id);
  }, [expandNode, setActiveNode]);

  // Custom Node Object: A glowing core with a wireframe shell
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    
    // Color based on node type/depth (using the node.color from store or default)
    const color = new THREE.Color(node.color || '#00ffff');

    // 1. Core Sphere (Glowing)
    const coreGeometry = new THREE.SphereGeometry(node.val / 10, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: color });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // 2. Wireframe Shell (The "Matrix" look)
    const shellGeometry = new THREE.IcosahedronGeometry((node.val / 10) * 1.4, 1);
    const shellMaterial = new THREE.MeshBasicMaterial({ 
      color: color, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.3 
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    group.add(shell);

    return group;
  }, []);

  return (
    <>
      {/* Background Environment */}
      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Post Processing for the "Glow" */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} intensity={1.5} />
      </EffectComposer>

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        
        // Visuals
        backgroundColor="#000005"
        showNavInfo={false}
        
        // Custom Renderers
        nodeThreeObject={nodeThreeObject}
        nodeLabel="name"
        
        // Links
        linkColor={() => '#4444aa'}
        linkWidth={1}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() => '#00ffff'}
        
        // Physics
        cooldownTicks={100}
        onNodeClick={handleNodeClick}
        
        // Container params
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </>
  );
};

export default GalaxyScene;
