import React from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData, handleLinkClick } = useStore();

  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  if (!currentNode) return null;

  // Custom renderer for [[wiki-links]]
  // Pre-process the content to turn [[link]] into [link](wiki:link)
  const processedContent = currentNode.content
    ? currentNode.content.replace(/\[\[(.*?)\]\]/g, '[$1](wiki:$1)')
    : '_Loading knowledge base..._';

  const components = {
    a: ({ href, children }) => {
      if (href && href.startsWith('wiki:')) {
        const term = href.replace('wiki:', '');
        return (
          <span
            className="wiki-link"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick(term, currentNode.id);
            }}
            style={{
              color: '#00ffff',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 'bold'
            }}
          >
            {children}
          </span>
        );
      }
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    }
  };

  return (
    <div className="hud-container">
      {/* Header */}
      <div className="hud-header">
        <div className="hud-title-small">System Interface</div>
        <div style={{ color: '#557799', fontSize: '12px' }}>v2.1.0</div>
      </div>

      {/* Body */}
      <div className="hud-body">
        <h1 className="hud-main-title">{currentNode.name}</h1>

        <div className="hud-description rich-content">
          <ReactMarkdown components={components}>
            {processedContent}
          </ReactMarkdown>
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
        <div style={{ fontSize: '0.7rem', color: '#557799', fontFamily: 'monospace' }}>
          CATEGORY: {currentNode.category || 'UNKNOWN'}
        </div>
      </div>
    </div>
  );
};

export default LearningHUD;
