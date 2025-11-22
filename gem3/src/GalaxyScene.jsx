import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useStore } from './store';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

const GalaxyScene = () => {
  const fgRef = useRef();
  const { graphData, expandNode, setActiveNode } = useStore();
  
  // Ref to store our "Sentient Core" so we can animate it
  const coreRef = useRef(null);

  // 1. VISUALS: Starfield & Animation Loop
  useEffect(() => {
    if (fgRef.current) {
      const scene = fgRef.current.scene();
      
      // --- A. Background Stars ---
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 4000;
      const positions = new Float32Array(starCount * 3);
      for(let i=0; i<starCount*3; i++) {
        positions[i] = (Math.random() - 0.5) * 4000;
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const starMaterial = new THREE.PointsMaterial({ size: 1.2, color: 0x88ccff, transparent: true, opacity: 0.4 });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // --- B. Lighting ---
      const ambient = new THREE.AmbientLight(0xbbbbbb, 1);
      scene.add(ambient);
      const point = new THREE.PointLight(0xffffff, 2);
      point.position.set(0, 0, 0);
      scene.add(point);

      // --- C. The "Sentient" Animation Loop ---
      let frameId;
      const animateCore = (time) => {
        if (coreRef.current) {
          // 1. Rotate the whole system
          coreRef.current.rotation.y += 0.002;
          
          // 2. Animate the "Spikes" (The Red Cloud)
          const coreCloud = coreRef.current.children.find(c => c.name === 'coreCloud');
          if (coreCloud) {
            const positions = coreCloud.geometry.attributes.position.array;
            const originals = coreCloud.geometry.userData.originalPositions;
            
            // Loop through particles and "breathe" them
            for (let i = 0; i < positions.length; i += 3) {
              // Basic noise math (Sine waves based on position + time)
              const v = new THREE.Vector3(originals[i], originals[i+1], originals[i+2]);
              const pulse = Math.sin(time * 0.002 + v.x * 0.05) + Math.cos(time * 0.003 + v.y * 0.05);
              const scale = 1 + (pulse * 0.3); // Expansion factor

              positions[i] = originals[i] * scale;
              positions[i+1] = originals[i+1] * scale;
              positions[i+2] = originals[i+2] * scale;
            }
            coreCloud.geometry.attributes.position.needsUpdate = true;
          }

          // 3. Animate the Outer Shell (The White Dots)
          const shell = coreRef.current.children.find(c => c.name === 'outerShell');
          if (shell) {
            shell.rotation.z -= 0.001;
            shell.rotation.x -= 0.001;
          }
        }
        frameId = requestAnimationFrame(animateCore);
      };
      
      animateCore(0);

      // Cleanup
      return () => cancelAnimationFrame(frameId);
    }
  }, []);

  const handleClick = useCallback(node => {
    const distance = 120;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
    fgRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      2000
    );
    setActiveNode(node);
    expandNode(node);
  }, [fgRef, expandNode, setActiveNode]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      backgroundColor="#030008"
      showNavInfo={false}
      
      // Links
      linkColor={() => '#44aaff'}
      linkOpacity={0.3}
      linkWidth={1}
      linkDirectionalParticles={4}
      linkDirectionalParticleWidth={2}
      
      // CUSTOM NODE RENDERER
      nodeThreeObjectExtend={false}
      nodeThreeObject={node => {
        const group = new THREE.Group();

        if (node.type === 'core') {
          // --- 1. THE SENTIENT CORE (Particle Cloud) ---
          // Create dense particles
          const particleCount = 2000;
          const geo = new THREE.SphereGeometry(node.val, 64, 64);
          const posAttribute = geo.attributes.position;
          
          // We need to create a new buffer geometry for points because SphereGeometry is efficient/indexed
          const pGeo = new THREE.BufferGeometry();
          const pPos = [];
          
          // Randomly sample points on surface/volume
          for(let i=0; i<particleCount; i++) {
            // Random point in sphere
            const r = node.val * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            pPos.push(x, y, z);
          }
          
          pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
          // Save original positions for animation reference
          pGeo.userData.originalPositions = [...pPos];

          const pMat = new THREE.PointsMaterial({
            color: 0xff3366, // Hot Pink/Red
            size: 1.5,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
          });
          
          const cloud = new THREE.Points(pGeo, pMat);
          cloud.name = 'coreCloud'; // Tag it for animation
          group.add(cloud);
          
          // Save reference to the global variable so useEffect can find it
          coreRef.current = group;

          // --- 2. THE OUTER SHELL (Data Orbit) ---
          const shellGeo = new THREE.SphereGeometry(node.val * 2.5, 64, 64);
          const shellMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.8,
            transparent: true,
            opacity: 0.3
          });
          // Convert sphere mesh to points
          const shellPoints = new THREE.Points(shellGeo, shellMat);
          shellPoints.name = 'outerShell';
          group.add(shellPoints);

        } else {
          // --- STANDARD NODE (Satellite) ---
          const geometry = new THREE.SphereGeometry(node.val / 2, 32, 32);
          const material = new THREE.MeshPhysicalMaterial({
            color: node.color,
            emissive: node.color,
            emissiveIntensity: 1.5,
            clearcoat: 1,
          });
          const sphere = new THREE.Mesh(geometry, material);
          group.add(sphere);
        }

        // --- TEXT LABEL (Shared) ---
        const sprite = new SpriteText(node.name);
        sprite.color = 'rgba(255,255,255,0.9)';
        sprite.textHeight = node.type === 'core' ? 8 : 5;
        sprite.position.y = node.val / 2 + (node.type === 'core' ? 25 : 8);
        group.add(sprite);

        return group;
      }}
      
      onNodeClick={handleClick}
    />
  );
};

export default GalaxyScene;