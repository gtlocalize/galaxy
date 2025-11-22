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

  // Category Colors
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Core AI': return '#00ffff'; // Cyan
      case 'Applications': return '#00ff00'; // Green
      case 'Theory': return '#aa00ff'; // Purple
      case 'Tools': return '#ffaa00'; // Orange
      default: return '#aaddff'; // Default Light Blue
    }
  };

  const handleClick = useCallback(async (node) => {
    if (!fgRef.current) return;

    // Capture coords immediately
    const { x, y, z, id } = node;

    console.log('Clicking node at:', x, y, z);

    // Fly camera logic
    const distance = 60;
    const distRatio = 1 + distance / Math.hypot(x, y, z);

    // Handle origin case (0,0,0) to prevent Infinity/NaN
    let targetX = 0, targetY = 0, targetZ = 0;
    if (!x && !y && !z) {
      targetX = 0;
      targetY = 0;
      targetZ = distance;
    } else {
      targetX = x * distRatio;
      targetY = y * distRatio;
      targetZ = z * distRatio;
    }

    fgRef.current.cameraPosition(
      { x: targetX, y: targetY, z: targetZ }, // Target pos
      { x: x || 0, y: y || 0, z: z || 0 }, // Look at
      2000  // Transition time
    );

    setActiveNode(id);
    // NO EXPANSION ON CLICK - Interaction Model Change
    // await expandNode(id); 
  }, [setActiveNode]);

  // Custom Node Object: Glowing Sphere
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const color = getCategoryColor(node.category) || node.color || '#00ffff';

    // 1. The Glowing Sphere
    const geometry = new THREE.SphereGeometry(node.val ? node.val / 5 : 4, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
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
      color: color,
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
