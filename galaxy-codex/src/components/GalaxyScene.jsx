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

  // Custom Node Object: Particle Cloud ("Spongey Planet" made of stars)
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const color = new THREE.Color(getCategoryColor(node.category) || node.color || '#00ffff');
    const radius = node.val ? node.val / 5 : 4;

    // 1. Dense Particle Cloud - many tiny stars forming the planet
    const particleCount = 400;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = [];
    const particleSizes = [];

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution with denser core
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      // Use power distribution for denser core
      const r = Math.pow(Math.random(), 0.7) * radius;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions.push(x, y, z);
      // Vary sizes - smaller toward edges, bigger in core
      particleSizes.push(0.3 + (1 - r / radius) * 1.2);
    }

    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      color: color,
      size: 1.0,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const cloud = new THREE.Points(particlesGeometry, particlesMaterial);
    group.add(cloud);

    // 2. Outer halo particles (sparse, larger, dimmer)
    const haloCount = 80;
    const haloGeometry = new THREE.BufferGeometry();
    const haloPositions = [];

    for (let i = 0; i < haloCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (1 + Math.random() * 0.4); // Just outside main sphere

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      haloPositions.push(x, y, z);
    }

    haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(haloPositions, 3));

    const haloMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.6,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    const halo = new THREE.Points(haloGeometry, haloMaterial);
    group.add(halo);

    // 3. Soft core glow
    const coreGeo = new THREE.SphereGeometry(radius * 0.3, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

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
