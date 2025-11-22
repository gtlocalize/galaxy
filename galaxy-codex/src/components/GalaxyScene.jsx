import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import useStore from '../store/useStore';

const GalaxyScene = () => {
  const fgRef = useRef();
  const { graphData, expandNode, setActiveNode } = useStore();
  const rotationRef = useRef(0);

  // 1. Add Starfield, Lights, and Post-Processing
  useEffect(() => {
    if (fgRef.current) {
      const scene = fgRef.current.scene();

      // Create stars
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.8 });
      const starVertices = [];
      for (let i = 0; i < 5000; i++) { // Increased star count
        const x = (Math.random() - 0.5) * 3000; // Wider field
        const y = (Math.random() - 0.5) * 3000;
        const z = (Math.random() - 0.5) * 3000;
        starVertices.push(x, y, z);
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Add ambient glow/lights
      const ambientLight = new THREE.AmbientLight(0x404040, 2);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 2); // Brighter
      pointLight.position.set(100, 100, 100);
      scene.add(pointLight);

      // BLOOM EFFECT (The "Pizzaz")
      const bloomPass = new UnrealBloomPass();
      bloomPass.strength = 2.0; // High glow
      bloomPass.radius = 0.5;
      bloomPass.threshold = 0.1;

      // Access the internal composer if available
      const composer = fgRef.current.postProcessingComposer();
      if (composer) {
        composer.addPass(bloomPass);
      }
    }
  }, []);

  // Auto-rotation logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (fgRef.current) {
        // Gentle rotation
        rotationRef.current += 0.0005;
        const dist = 400;
        const x = dist * Math.sin(rotationRef.current);
        const z = dist * Math.cos(rotationRef.current);

        // Only rotate if not interacting (simple check: we just set camera pos)
        // Note: This might fight with user controls. 
        // Better approach: Just rotate the SCENE or the stars?
        // Let's rotate the camera gently.
        fgRef.current.cameraPosition({ x, z });
      }
    }, 30);

    return () => clearInterval(interval);
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

  // Create circular particle texture
  const createCircleTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Draw soft circular gradient
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Custom Node Object: Particle Cloud ("Spongey Planet" made of stars)
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const color = new THREE.Color(getCategoryColor(node.category) || node.color || '#00ffff');
    const radius = node.val ? node.val / 5 : 4;
    const circleTexture = createCircleTexture();

    // 1. Dense Particle Cloud - many tiny stars forming the planet
    const particleCount = 600; // Increased density
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
      size: 1.2,
      map: circleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    const cloud = new THREE.Points(particlesGeometry, particlesMaterial);
    group.add(cloud);

    // 2. Outer halo particles (sparse, larger, dimmer)
    const haloCount = 120; // More halo
    const haloGeometry = new THREE.BufferGeometry();
    const haloPositions = [];

    for (let i = 0; i < haloCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (1 + Math.random() * 0.5); // Wider halo

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      haloPositions.push(x, y, z);
    }

    haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(haloPositions, 3));

    const haloMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.8,
      map: circleTexture,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const halo = new THREE.Points(haloGeometry, haloMaterial);
    group.add(halo);

    // 3. Soft core glow
    const coreGeo = new THREE.SphereGeometry(radius * 0.3, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6, // Brighter core
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    return group;
  }, [createCircleTexture]);

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
        linkOpacity={0.4} // More visible links
        linkWidth={0.8}
        linkDirectionalParticles={3} // More particles
        linkDirectionalParticleWidth={2.5}
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
