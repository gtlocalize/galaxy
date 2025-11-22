import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import MermaidRenderer from './MermaidRenderer';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData, handleLinkClick } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('overview');
  }, [activeNode]);

  if (!currentNode) return null;

  const currentTabContent = currentNode.tabs?.find(t => t.id === activeTab);

  // Tilt Effect Logic
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate rotation (max 10 degrees)
    // If mouse is left (x < w/2), rotateY should be negative (tilt left)
    // If mouse is top (y < h/2), rotateX should be positive (tilt up)
    const rotateY = ((x / rect.width) - 0.5) * 20;
    const rotateX = -((y / rect.height) - 0.5) * 20;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Custom renderer for [[wiki-links]]
  const renderContent = (content) => {
    if (!content) return null;

    // Pre-process: Convert [[link]] to [link](wiki:link)
    // URL encode the term to handle spaces correctly
    const processed = content.replace(/\[\[(.*?)\]\]/g, (match, term) => {
      return `[${term}](wiki:${encodeURIComponent(term)})`;
    });

    return (
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href && href.startsWith('wiki:')) {
              const term = decodeURIComponent(href.replace('wiki:', ''));
              return (
                <span
                  className="wiki-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent bubbling
                    handleLinkClick(term, currentNode.id);
                  }}
                >
                  {children}
                </span>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
          }
        }}
      >
        {processed}
      </ReactMarkdown>
    );
  };

  return (
    <div
      className="hud-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.1s ease-out' // Fast response for mouse follow
      }}
    >
      {/* Header */}
      <div className="hud-header">
        <div className="hud-title-small">Galaxy Codex v3.0</div>
        <div className="hud-category">{currentNode.category || 'System Data'}</div>
      </div>

      {/* Body */}
      <div className="hud-body">
        <h1 className="hud-main-title">{currentNode.name}</h1>

        {/* Content - handle both tabs format and legacy content format */}
        {currentNode.tabs ? (
          <>
            <div className="hud-tabs">
              {currentNode.tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`hud-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hud-content-scroll">
              {activeTab === 'visuals' && currentTabContent?.diagram ? (
                <MermaidRenderer chart={currentTabContent.diagram} />
              ) : (
                <div className="rich-content">
                  {renderContent(currentTabContent?.content)}
                  {currentTabContent?.streaming && (
                    <span className="streaming-cursor">▌</span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : currentNode.content ? (
          // Legacy format - just content string, no tabs
          <div className="hud-content-scroll">
            <div className="rich-content">
              {renderContent(currentNode.content)}
              {currentNode.streaming && (
                <span className="streaming-cursor">▌</span>
              )}
            </div>
          </div>
        ) : (
          <div className="hud-loading">
            <div className="spinner"></div>
            <p>Accessing Neural Database...</p>
          </div>
        )}
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
      </div>
    </div>
  );
};

export default LearningHUD;
