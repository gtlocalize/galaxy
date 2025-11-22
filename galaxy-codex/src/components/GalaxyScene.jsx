import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import useStore from '../store/useStore';

const GalaxyScene = () => {
  const fgRef = useRef();
  const { graphData, expandNode, setActiveNode } = useStore();

  // 1. Add Starfield Background on Mount
  useEffect(() => {
    if (fgRef.current) {
      const scene = fgRef.current.scene();
      
      // Create stars
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.8 });
      const starVertices = [];
      for (let i = 0; i < 3000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);
      
      // Add ambient glow/lights
      const ambientLight = new THREE.AmbientLight(0x404040, 2); 
      scene.add(ambientLight);
      
      const pointLight = new THREE.PointLight(0xffffff, 1);
      pointLight.position.set(100, 100, 100);
      scene.add(pointLight);
    }
  }, []);

  const handleClick = useCallback(async (node) => {
    if (!fgRef.current) return;

    // FIX: Capture coordinates immediately so we don't track a stale object reference
    // if the graph re-generates the node object during expansion.
    const { x, y, z, id } = node;

    // Fly camera to these static coordinates
    const distance = 60;
    const distRatio = 1 + distance/Math.hypot(x, y, z);

    fgRef.current.cameraPosition(
      { x: x * distRatio, y: y * distRatio, z: z * distRatio }, // Target pos
      { x, y, z }, // Look at (static coords)
      2000  // Transition time
    );

    setActiveNode(id);
    await expandNode(id);
  }, [expandNode, setActiveNode]);

  // Custom Node Object: Glowing Sphere
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();

    // 1. The Glowing Sphere
    const geometry = new THREE.SphereGeometry(node.val ? node.val / 5 : 4, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: node.color || '#00ffff',
      emissive: node.color || '#00ffff',
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // 2. Wireframe Overlay
    const wireGeo = new THREE.IcosahedronGeometry((node.val ? node.val / 5 : 4) * 1.2, 1);
    const wireMat = new THREE.MeshBasicMaterial({
        color: node.color || '#00ffff',
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    group.add(wire);

    return group;
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          
          // Global Config
          backgroundColor="#000000"
          showNavInfo={false}
          
          // Physics
          d3VelocityDecay={0.1}
          cooldownTicks={100}
          
          // Link Styling
          linkColor={() => '#4444aa'}
          linkOpacity={0.3}
          linkWidth={0.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          
          // Custom Node Rendering
          nodeThreeObjectExtend={false}
          nodeThreeObject={nodeThreeObject}
          
          onNodeClick={handleClick}
        />
    </div>
  );
};

export default GalaxyScene;
