import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import './HUD.css';

const LearningHUD = () => {
  const { activeNode, graphData, handleLinkClick } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [visualUrl, setVisualUrl] = useState(null);
  const [loadingVisual, setLoadingVisual] = useState(false);

  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('overview');
    setVisualUrl(null);
  }, [activeNode]);

  // Fetch Visualization (Nano Banana)
  useEffect(() => {
    if (activeTab === 'visuals' && currentNode && !visualUrl && !loadingVisual) {
        setLoadingVisual(true);
        fetch(`/galaxy-api/visualize?topic=${encodeURIComponent(currentNode.name)}`)
            .then(res => res.json())
            .then(data => {
                setVisualUrl(data.imageUrl);
                setLoadingVisual(false);
            })
            .catch(err => {
                console.error('Visual fetch error:', err);
                setLoadingVisual(false);
            });
    }
  }, [activeTab, currentNode, visualUrl, loadingVisual]);

  // Interactive 3D tilt
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; 
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 15, y: x * 15 }); 
  };

  if (!currentNode) return null;

  // Robust Content Splitting
  let overviewContent = currentNode.content || '';
  let deepDiveContent = '';

  const deepDiveMarkers = ['## Deep Dive', '## How It Works', '## Technical Details'];
  let splitIndex = -1;
  
  for (const marker of deepDiveMarkers) {
      const idx = currentNode.content?.indexOf(marker);
      if (idx !== -1) {
          splitIndex = idx;
          break;
      }
  }

  if (splitIndex !== -1) {
    overviewContent = currentNode.content.substring(0, splitIndex);
    deepDiveContent = currentNode.content.substring(splitIndex);
  } else {
      deepDiveContent = "### No detailed technical breakdown available for this summary.";
  }

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

  const markdownComponents = {
    p: ({ children }) => <p>{processChildren(children)}</p>,
    li: ({ children }) => <li>{processChildren(children)}</li>,
    strong: ({ children }) => <strong>{processChildren(children)}</strong>,
    em: ({ children }) => <em>{processChildren(children)}</em>,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && (match[1] === 'mermaid' || match[1] === 'graph')) {
        return null;
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
              <div className="visuals-container">
                {visualUrl ? (
                    <div className="image-wrapper">
                        <img src={visualUrl} alt={currentNode.name} className="visual-image" />
                        <div className="image-caption">Generated Visualization: {currentNode.name}</div>
                    </div>
                ) : (
                    loadingVisual ? 
                    <div className="spinner-container"><div className="spinner"></div><p>Generating Nano Banana Visual...</p></div> : 
                    <div className="no-visuals">Click to generate visualization</div>
                )}
              </div>
            ) : (
              <div key="text" className="rich-content">
                <ReactMarkdown components={markdownComponents}>
                  {activeTab === 'deepdive' ? deepDiveContent : overviewContent}
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
