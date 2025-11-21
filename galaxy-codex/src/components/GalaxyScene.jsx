import React, { useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
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

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      nodeLabel="name"
      nodeColor="color"
      nodeVal="val"
      
      // Visuals
      backgroundColor="#000003"
      showNavInfo={false}
      
      // Physics
      cooldownTicks={100}
      onNodeClick={handleNodeClick}
      
      // Particles/Links
      linkWidth={1.5}
      linkDirectionalParticles={2}
      linkDirectionalParticleSpeed={0.005}
      
      // Node object customization (optional, simple spheres by default)
      // We could use nodeThreeObject to return a mesh for more control
    />
  );
};

export default GalaxyScene;

