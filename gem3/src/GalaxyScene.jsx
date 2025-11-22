import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useStore } from './store';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

const GalaxyScene = () => {
  const fgRef = useRef();
  const { graphData, expandNode, setActiveNode } = useStore();

  // 1. Add Starfield Background on Mount
  useEffect(() => {
    if (fgRef.current) {
      const scene = fgRef.current.scene();
      // Create stars
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
      const starVertices = [];
      for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);
      
      // Add ambient glow
      const ambientLight = new THREE.AmbientLight(0x404040, 2); 
      scene.add(ambientLight);
    }
  }, []);

  const handleClick = useCallback(node => {
    if (!fgRef.current) return;

    // Fly camera to node
    const distance = 60;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

    fgRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // Target pos
      node, // Look at node
      2000  // Transition time
    );

    setActiveNode(node);
    expandNode(node);
  }, [fgRef, expandNode, setActiveNode]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      
      // Global Config
      backgroundColor="#000005"
      showNavInfo={false}
      
      // Physics - Low gravity for "floating in space" feel
      d3VelocityDecay={0.1}
      cooldownTicks={100}
      
      // Link Styling
      linkColor={() => '#ffffff'}
      linkOpacity={0.2}
      linkWidth={0.5}
      linkDirectionalParticles={2} // Particles flowing along links
      linkDirectionalParticleWidth={2}
      
      // CUSTOM NODE RENDERING (The Fix)
      nodeThreeObjectExtend={false} // False = we completely replace the default node
      nodeThreeObject={node => {
        const group = new THREE.Group();

        // 1. The Glowing Sphere (Planet)
        const geometry = new THREE.SphereGeometry(node.val / 2, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
          color: node.color,
          emissive: node.color,
          emissiveIntensity: 0.8, // Make it glow
          roughness: 0.1,
          metalness: 0.5
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // 2. The Floating Label
        const sprite = new SpriteText(node.name);
        sprite.color = 'rgba(255,255,255,0.9)';
        sprite.textHeight = 4;
        sprite.position.set(0, node.val / 2 + 4, 0); // Float above sphere
        group.add(sprite);

        return group;
      }}
      
      onNodeClick={handleClick}
    />
  );
};

export default GalaxyScene;