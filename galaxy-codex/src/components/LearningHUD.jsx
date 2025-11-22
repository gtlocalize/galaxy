import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import MermaidRenderer from './MermaidRenderer';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData, handleLinkClick } = useStore();
  const [activeTab, setActiveTab] = useState('overview');

  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('overview');
  }, [activeNode]);

  if (!currentNode) return null;

  const currentTabContent = currentNode.tabs?.find(t => t.id === activeTab);

  // Custom renderer - split content by [[wiki-links]] and render them as buttons
  const renderContent = (content) => {
    if (!content) return null;

    // Split by [[wiki-links]] keeping the delimiters
    const parts = content.split(/(\[\[.*?\]\])/g);

    return parts.map((part, index) => {
      // Check if this is a wiki link
      const match = part.match(/^\[\[(.*?)\]\]$/);
      if (match) {
        const term = match[1];
        return (
          <button
            key={index}
            type="button"
            className="wiki-link"
            onClick={() => handleLinkClick(term, currentNode.id)}
          >
            {term}
          </button>
        );
      }
      // Regular markdown - render without wiki links
      if (!part.trim()) return null;
      return <ReactMarkdown key={index}>{part}</ReactMarkdown>;
    });
  };

  return (
    <div className="hud-container">
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
                </div>
              )}
            </div>
          </>
        ) : currentNode.content ? (
          // Legacy format - just content string, no tabs
          <div className="hud-content-scroll">
            <div className="rich-content">
              {renderContent(currentNode.content)}
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
