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
      // Extract mermaid code blocks - lenient regex
      const match = currentNode.content.match(/```(mermaid|graph)([\s\S]*?)```/i);
      if (match && match[2]) {
        // Clear previous content safely
        mermaidRef.current.innerHTML = '';

        // Create a unique ID for the diagram
        const id = `mermaid-${Date.now()}`;

        try {
            mermaid.render(id, match[2].trim())
            .then(({ svg }) => {
                if (mermaidRef.current) {
                mermaidRef.current.innerHTML = svg;
                }
            });
        } catch (err) {
             console.error('Mermaid render error:', err);
             if (mermaidRef.current) {
               mermaidRef.current.innerHTML = '<p class="error-msg">Failed to render visualization.</p>';
             }
        }
      } else {
        // No mermaid code found
        mermaidRef.current.innerHTML = '<p class="no-visuals">No visualization available for this topic.</p>';
      }
    }
  }, [activeTab, currentNode]);

  // Interactive 3D tilt based on mouse position
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Normalized coordinates (-0.5 to 0.5) relative to center of HUD
    const x = (e.clientX - rect.left) / rect.width - 0.5; 
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Reversed tilt: Push away from cursor (Positive X -> Positive Y rotation)
    setTilt({ x: -y * 15, y: x * 15 }); 
  };

  // REMOVED handleMouseLeave to persist tilt state

  if (!currentNode) return null;

  // Robust Content Splitting
  let overviewContent = currentNode.content || '';
  let deepDiveContent = '';

  // Try to split by "## Deep Dive" or "## How It Works" or generic header if strict match fails
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
    // Deep Dive contains everything after the marker
    deepDiveContent = currentNode.content.substring(splitIndex);
  } else {
      // Fallback: If no Deep Dive header, everything is overview.
      // But we check if there's a lot of content, maybe we can split?
      // For now, just leave deepDiveContent empty or show a message.
      deepDiveContent = "### No detailed technical breakdown available for this summary.";
  }

  // Helper to strip Visuals section and Mermaid blocks from text views
  const cleanText = (text) => {
      if (!text) return '';
      // Remove the Visuals section entirely (header + content until end or next major section)
      // Actually, regex is hard if we don't know next section. 
      // Prompt puts Visuals near end.
      let cleaned = text.replace(/## (Visuals|Diagram|Architecture)[\s\S]*?$/, '');
      // Also strip any remaining mermaid code blocks just in case
      cleaned = cleaned.replace(/```(mermaid|graph)[\s\S]*?```/gi, '');
      return cleaned;
  };

  overviewContent = cleanText(overviewContent);
  deepDiveContent = cleanText(deepDiveContent);

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
      if (!inline && match && (match[1] === 'mermaid' || match[1] === 'graph')) {
        return null; // Don't render raw mermaid code in text tabs
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
      // No onMouseLeave
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
