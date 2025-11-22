import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData, handleLinkClick } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const mermaidRef = useRef(null);

  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
    });
  }, []);

  // Render Mermaid diagrams when tab changes or content updates
  useEffect(() => {
    if (activeTab === 'visuals' && currentNode?.content && mermaidRef.current) {
      // Extract mermaid code blocks
      const match = currentNode.content.match(/```mermaid([\s\S]*?)```/);
      if (match && match[1]) {
        mermaid.render(`mermaid-${Date.now()}`, match[1])
          .then(({ svg }) => {
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
            }
          })
          .catch(err => console.error('Mermaid render error:', err));
      } else {
        if (mermaidRef.current) mermaidRef.current.innerHTML = '<p class="no-visuals">No visualization available for this topic.</p>';
      }
    }
  }, [activeTab, currentNode]);

  // Interactive 3D tilt based on mouse position
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 12, y: -x * 12 }); // Degrees of tilt
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  if (!currentNode) return null;

  // Process [[wiki-links]] inline within text
  const processWikiLinks = (text) => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[\[(.*?)\]\]$/);
      if (match) {
        return (
          <span key={i} className="wiki-link" onClick={() => handleLinkClick(match[1], currentNode.id)}>
            {match[1]}
          </span>
        );
      }
      return part;
    });
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    p: ({ children }) => <p>{processChildren(children)}</p>,
    li: ({ children }) => <li>{processChildren(children)}</li>,
    strong: ({ children }) => <strong>{processChildren(children)}</strong>,
    em: ({ children }) => <em>{processChildren(children)}</em>,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && match[1] === 'mermaid') {
        return null; // Don't render raw mermaid code, handled by effect
      }
      return <code className={className} {...props}>{children}</code>;
    }
  };

  const processChildren = (children) => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') return processWikiLinks(child);
      return child;
    });
  };

  const tiltStyle = {
    transform: `perspective(1500px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
  };

  return (
    <div
      ref={containerRef}
      className="hud-container"
      style={tiltStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="hud-header">
        <div className="hud-title-small">Galaxy Codex v3.0</div>
        <div className="hud-category">{currentNode.category || 'Core AI'}</div>
      </div>

      {/* Body */}
      <div className="hud-body">
        <h1 className="hud-main-title">{currentNode.name}</h1>

        {/* Tabs */}
        <div className="hud-tabs">
          <button
            className={`hud-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`hud-tab ${activeTab === 'deepdive' ? 'active' : ''}`}
            onClick={() => setActiveTab('deepdive')}
          >
            Deep Dive
          </button>
          <button
            className={`hud-tab ${activeTab === 'visuals' ? 'active' : ''}`}
            onClick={() => setActiveTab('visuals')}
          >
            Visuals
          </button>
        </div>

        {currentNode.content || currentNode.streaming ? (
          <div className="hud-content-scroll">
            {activeTab === 'visuals' ? (
              <div className="visuals-container" ref={mermaidRef}>
                {/* Mermaid renders here */}
                {currentNode.streaming && <div className="spinner"></div>}
              </div>
            ) : (
              <div className="rich-content">
                <ReactMarkdown components={markdownComponents}>
                  {currentNode.content || ''}
                </ReactMarkdown>
                {currentNode.streaming && (
                  <span className="streaming-cursor">▌</span>
                )}
              </div>
            )}
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
