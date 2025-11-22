import React from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData } = useStore();
  
  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  if (!currentNode) return null;

  // Find connected children to display as "Sub Topics"
  const children = graphData.links
    .filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === activeNode)
    .map(l => {
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return graphData.nodes.find(n => n.id === targetId);
    })
    .filter(Boolean)
    .slice(0, 4); // Show max 4 in the grid

  // Mock stats for the visual footer
  const stats = [
    { label: 'CONN', val: children.length + 1 }, // Connections
    { label: 'REL', val: Math.floor(Math.random() * 100) + '%' }, // Relevance
    { label: 'DEPTH', val: 'Lvl 1' }
  ];

  return (
    <div className="hud-container">
      {/* Header */}
      <div className="hud-header">
        <div className="hud-title-small">System Interface</div>
        <div style={{ color: '#557799', fontSize: '12px' }}>v2.0.4</div>
      </div>

      {/* Body */}
      <div className="hud-body">
        <h1 className="hud-main-title">{currentNode.name}</h1>
        
        <div className="hud-description">
          {currentNode.summary ? (
             <ReactMarkdown>{currentNode.summary}</ReactMarkdown>
          ) : (
             <div style={{ fontStyle: 'italic', opacity: 0.7 }}>Accessing neural database...</div>
          )}
        </div>

        {/* Sub Topics Grid */}
        <div className="hud-section-label">Related Nodes</div>
        <div className="hud-grid">
            {children.length > 0 ? children.map(child => (
                <div key={child.id} className="hud-chip">
                    {child.name}
                </div>
            )) : (
                <>
                    <div className="hud-chip" style={{ opacity: 0.5 }}>Scanning...</div>
                    <div className="hud-chip" style={{ opacity: 0.3 }}>-</div>
                </>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="hud-footer">
        <div className="visual-graph">
            {[40, 70, 30, 80, 50, 90, 20].map((h, i) => (
                <div 
                    key={i} 
                    className="graph-bar" 
                    style={{ 
                        height: `${h}%`, 
                        animationDelay: `${i * 0.1}s`,
                        backgroundColor: currentNode.color || '#00ffff' 
                    }} 
                />
            ))}
        </div>
        
        <div style={{ display: 'flex', gap: '15px', fontSize: '0.7rem', color: '#557799', fontFamily: 'monospace' }}>
            {stats.map(s => (
                <div key={s.label}>
                    <div style={{ marginBottom: '2px' }}>{s.label}</div>
                    <div style={{ color: '#aaddff' }}>{s.val}</div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default LearningHUD;
