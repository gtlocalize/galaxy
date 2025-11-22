import React, { useMemo } from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData, expandNode, setActiveNode } = useStore();
  
  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  if (!currentNode) return null;

  // Pre-process content to turn [[link]] into standard markdown links [link](#wiki-link)
  const processedContent = useMemo(() => {
    if (!currentNode.content) return '';
    return currentNode.content.replace(/\[\[(.*?)\]\]/g, (match, term) => {
      return `[${term}](#wiki-${encodeURIComponent(term)})`;
    });
  }, [currentNode.content]);

  const handleLinkClick = async (e, href) => {
    e.preventDefault();
    if (href.startsWith('#wiki-')) {
      const term = decodeURIComponent(href.replace('#wiki-', ''));
      console.log('Wiki Link Clicked:', term);
      
      // 1. Set Active (Focus HUD)
      setActiveNode(term);
      
      // 2. Expand (Fetch content & spawn children)
      // We might need to find the node object if it exists to get coordinates for camera?
      // The store handles the fetch. The Scene handles the camera if we pass a signal?
      // Currently Scene reacts to 'activeNode' change? No, Scene reacts to its own internal state or store.
      // We need to trigger the Scene to fly to the new node.
      // Scene listens to 'activeNode' changes? No.
      
      // IMPORTANT: We call expandNode. The Scene should observe activeNode changes to fly?
      // Currently Scene only flies on click.
      // We might need to improve Scene to fly on activeNode change too.
      
      await expandNode(term);
    }
  };

  return (
    <div className="hud-container">
      {/* Header */}
      <div className="hud-header">
        <div className="hud-title-small">
            <span>{currentNode.category || 'System Data'}</span>
        </div>
        <div style={{ color: '#557799', fontSize: '12px' }}>Galaxy v2.0</div>
      </div>

      {/* Body */}
      <div className="hud-body">
        <h1 className="hud-main-title">{currentNode.name}</h1>
        
        <div className="hud-content-scroll">
          {processedContent ? (
             <ReactMarkdown 
                components={{
                    a: ({node, ...props}) => (
                        <a 
                            {...props} 
                            className="wiki-link"
                            onClick={(e) => handleLinkClick(e, props.href)} 
                        />
                    ),
                    h1: ({node, ...props}) => <h2 {...props} style={{ fontSize: '1.4rem', color: '#aaddff' }} />,
                    h2: ({node, ...props}) => <h3 {...props} style={{ fontSize: '1.1rem', color: '#00ffff', marginTop: '20px' }} />,
                    p: ({node, ...props}) => <p {...props} style={{ marginBottom: '12px', lineHeight: '1.6', color: '#cceeff' }} />
                }}
             >
                {processedContent}
             </ReactMarkdown>
          ) : (
             <div style={{ fontStyle: 'italic', opacity: 0.7 }}>Loading neural data...</div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
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
        <div style={{ fontSize: '0.7rem', color: '#557799' }}>
            ID: {currentNode.id}
        </div>
      </div>
    </div>
  );
};

export default LearningHUD;
