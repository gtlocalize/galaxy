import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import SpriteText from 'three-spritetext';
import useStore from '../store/useStore';

const GalaxyScene = () => {
  const fgRef = useRef();
  const { graphData, expandNode, setActiveNode } = useStore();
  const coreRef = useRef(null); // Ref for the Sentient Core animation

  // 1. Add Starfield, Lights, and Post-Processing
  useEffect(() => {
    if (fgRef.current) {
      // Configure Forces
      fgRef.current.d3Force('charge').strength(-80); // Low repulsion to prevent explosion
      fgRef.current.d3Force('link').distance(40).strength(2); // Strong, short links
      // fgRef.current.d3Force('center', null); // Keep default center to pull things back

      const scene = fgRef.current.scene();

      // Create stars
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.4 }); // Reduced opacity
      const starVertices = [];
      for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 3000;
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

      const pointLight = new THREE.PointLight(0xffffff, 2);
      pointLight.position.set(100, 100, 100);
      scene.add(pointLight);

      // BLOOM EFFECT - Reduced Strength
      const bloomPass = new UnrealBloomPass();
      bloomPass.strength = 0.4; // Reduced from 2.0
      bloomPass.radius = 0.5;
      bloomPass.threshold = 0.1;

      const composer = fgRef.current.postProcessingComposer();
      if (composer) {
        composer.addPass(bloomPass);
      }
    }
  }, []);

  // 2. Animation Loop (Sentient Core Pulse only)
  useEffect(() => {
    let frameId;
    const animate = (time) => {
      // Sentient Core Animation
      if (coreRef.current) {
        // Rotate whole system
        coreRef.current.rotation.y += 0.002;

        // Pulse the "Core Cloud"
        const coreCloud = coreRef.current.children.find(c => c.name === 'coreCloud');
        if (coreCloud) {
          const positions = coreCloud.geometry.attributes.position.array;
          const originals = coreCloud.geometry.userData.originalPositions;

          for (let i = 0; i < positions.length; i += 3) {
            const v = new THREE.Vector3(originals[i], originals[i + 1], originals[i + 2]);
            // Pulse math: Sine waves based on position + time
            const pulse = Math.sin(time * 0.002 + v.x * 0.05) + Math.cos(time * 0.003 + v.y * 0.05);
            const scale = 1 + (pulse * 0.3);

            positions[i] = originals[i] * scale;
            positions[i + 1] = originals[i + 1] * scale;
            positions[i + 2] = originals[i + 2] * scale;
          }
          coreCloud.geometry.attributes.position.needsUpdate = true;
        }

        // Rotate Outer Shell
        const shell = coreRef.current.children.find(c => c.name === 'outerShell');
        if (shell) {
          shell.rotation.z -= 0.001;
          shell.rotation.x -= 0.001;
        }
      }

      // LOD & Animation Loop
      if (fgRef.current) {
        const camera = fgRef.current.camera();
        const scene = fgRef.current.scene();

        if (camera && scene) {
          scene.traverse((obj) => {
            // Check if it's a SpriteText (has .text property)
            if (obj.isSprite && obj.text) {
              const dist = camera.position.distanceTo(obj.position);

              // LOD Logic
              if (dist > 600) {
                obj.visible = false; // Hide completely when very far
              } else {
                obj.visible = true;
                // Scale text based on distance to maintain readability
                // But clamp it so it doesn't get ridiculously huge or tiny
                const scale = Math.max(4, Math.min(20, dist / 15));
                obj.scale.set(scale, scale, 1); // Uniform scaling to fix squished text

                // Fade out when getting far
                obj.material.opacity = Math.max(0, 1 - (dist / 600));
              }
            }
          });
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    animate(0);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Category Colors
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Core AI': return '#00ffff';
      case 'Applications': return '#00ff00';
      case 'Theory': return '#aa00ff';
      case 'Tools': return '#ffaa00';
      default: return '#aaddff';
    }
  };

  const handleClick = useCallback(async (node) => {
    if (!fgRef.current) return;
    const { x, y, z, id } = node;
    const distance = 140; // Increased distance for better framing
    const distRatio = 1 + distance / Math.hypot(x, y, z);

    let targetX = 0, targetY = 0, targetZ = 0;
    if (!x && !y && !z) {
      targetX = 0; targetY = 0; targetZ = distance;
    } else {
      targetX = x * distRatio; targetY = y * distRatio; targetZ = z * distRatio;
    }

    fgRef.current.cameraPosition(
      { x: targetX, y: targetY, z: targetZ },
      { x: x || 0, y: y || 0, z: z || 0 },
      2000
    );
    setActiveNode(id);
  }, [setActiveNode]);

  // Create circular particle texture
  const createCircleTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Custom Node Object
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const color = new THREE.Color(getCategoryColor(node.category) || node.color || '#00ffff');
    const radius = node.val ? node.val / 5 : 4;
    const circleTexture = createCircleTexture();

    // --- SPECIAL "SENTIENT CORE" RENDERER ---
    if (node.type === 'core') {
      // 1. Core Cloud (Pulsing)
      const particleCount = 2000;
      // BufferGeometry for points
      const pGeo = new THREE.BufferGeometry();
      const pPos = [];

      for (let i = 0; i < particleCount; i++) {
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        pPos.push(x, y, z);
      }

      pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
      pGeo.userData.originalPositions = [...pPos]; // Save for animation

      const pMat = new THREE.PointsMaterial({
        color: 0xff3366, // Hot Pink/Red for Core
        size: 1.5,
        map: circleTexture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const cloud = new THREE.Points(pGeo, pMat);
      cloud.name = 'coreCloud';
      group.add(cloud);

      // Save to ref for animation loop
      coreRef.current = group;

      // 2. Outer Shell (Data Orbit)
      const shellCount = 1000;
      const shellGeo = new THREE.BufferGeometry();
      const shellPos = [];
      for (let i = 0; i < shellCount; i++) {
        // Points on sphere surface
        const r = radius * 2.5;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        shellPos.push(x, y, z);
      }
      shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(shellPos, 3));

      const shellMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.8,
        map: circleTexture,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const shellPoints = new THREE.Points(shellGeo, shellMat);
      shellPoints.name = 'outerShell';
      group.add(shellPoints);

      return group;
    }

    // --- STANDARD "SPONGEY PLANET" RENDERER ---
    // 1. Dense Particle Cloud
    const particleCount = 600;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = [];
    const particleSizes = [];

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.pow(Math.random(), 0.7) * radius;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions.push(x, y, z);
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

    // 2. Outer halo
    const haloCount = 120;
    const haloGeometry = new THREE.BufferGeometry();
    const haloPositions = [];

    for (let i = 0; i < haloCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (1 + Math.random() * 0.5);

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
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // 4. Text Label
    const sprite = new SpriteText(node.name);
    sprite.color = '#00ffff';
    sprite.textHeight = 2;
    sprite.position.set(0, radius + 4, 0);
    sprite.fontFace = 'Orbitron, sans-serif';
    group.add(sprite);

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

        // Physics - Stabilized
        d3AlphaDecay={0.05} // Higher decay = faster settling
        d3VelocityDecay={0.6} // High friction to stop explosion
        cooldownTicks={100}
        onEngineStop={() => fgRef.current.zoomToFit(400)} // Optional: fit to view when done

        // Link Styling
        linkColor={() => '#ffffff'}
        linkOpacity={0.6} // More visible links
        linkWidth={1.5}
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
