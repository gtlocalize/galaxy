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
      width: '350px',
      maxHeight: '80vh',
      overflowY: 'auto',
      backgroundColor: 'rgba(10, 10, 20, 0.7)', // Darker blue-ish tint
      color: '#e0f0ff',
      padding: '25px',
      borderRadius: '12px',
      border: '1px solid rgba(0, 255, 255, 0.3)', // Cyan subtle border
      boxShadow: '0 0 20px rgba(0, 150, 255, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.5)', // Glow + Depth
      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    }}>
      <h2 style={{ 
        marginTop: 0, 
        color: currentNode.color || '#00ffff',
        textShadow: '0 0 10px rgba(0,255,255,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '10px',
        fontSize: '1.5rem',
        fontWeight: '300',
        letterSpacing: '1px'
      }}>
        {currentNode.name.toUpperCase()}
      </h2>
      
      <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#ccc' }}>
        {currentNode.summary ? (
          <ReactMarkdown>{currentNode.summary}</ReactMarkdown>
        ) : (
          <p style={{ fontStyle: 'italic', opacity: 0.7 }}>Accessing Neural Database...</p>
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        paddingTop: '10px', 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.7rem',
        color: '#555'
      }}>
        <span style={{ fontFamily: 'monospace' }}>ID: {currentNode.id.substring(0, 8)}...</span>
        <span style={{ 
          display: 'inline-block', 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: '#00ff00', 
          boxShadow: '0 0 5px #00ff00' 
        }}></span>
      </div>
    </div>
  );
};

export default LearningHUD;
