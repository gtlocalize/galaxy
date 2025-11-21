import React from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';

const LearningHUD = () => {
  const { activeNode, graphData } = useStore();
  
  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  if (!currentNode) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '300px',
      maxHeight: '80vh',
      overflowY: 'auto',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #333',
      fontFamily: 'sans-serif',
      backdropFilter: 'blur(5px)'
    }}>
      <h2 style={{ marginTop: 0, color: currentNode.color || '#fff' }}>
        {currentNode.name}
      </h2>
      
      <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
        {currentNode.summary ? (
          <ReactMarkdown>{currentNode.summary}</ReactMarkdown>
        ) : (
          <p>Click to expand and learn more.</p>
        )}
      </div>

      <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #444' }}>
        <small style={{ color: '#888' }}>ID: {currentNode.id}</small>
      </div>
    </div>
  );
};

export default LearningHUD;

