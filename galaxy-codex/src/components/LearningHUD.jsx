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
  const [mermaidSvg, setMermaidSvg] = useState('');

  const currentNode = graphData.nodes.find(n => n.id === activeNode);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('overview');
    setMermaidSvg(''); 
  }, [activeNode]);

  // Initialize Mermaid with Holographic Theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base', // Use base to override easier
      securityLevel: 'loose',
      fontFamily: 'Inter',
      themeVariables: {
        darkMode: true,
        background: 'transparent',
        mainBkg: 'rgba(0, 20, 40, 0.5)', // Dark glass node background
        nodeBorder: '#00ffff', // Neon Cyan
        clusterBkg: 'rgba(255, 255, 255, 0.05)',
        titleColor: '#00ffff',
        edgeLabelBackground: 'rgba(0, 0, 0, 0.8)',
        lineColor: '#0088ff',
        textColor: '#e0f0ff',
        primaryColor: '#002244',
        primaryTextColor: '#00ffff',
        primaryBorderColor: '#00ffff'
      }
    });
  }, []);

  // Render Mermaid diagrams
  useEffect(() => {
    if (activeTab === 'visuals' && currentNode?.content) {
      const match = currentNode.content.match(/```(mermaid|graph)([\s\S]*?)```/i);
      
      if (match && match[2]) {
        const id = `mermaid-${Date.now()}`;
        const graphDefinition = match[2].trim();

        try {
            mermaid.render(id, graphDefinition)
            .then(({ svg }) => {
                setMermaidSvg(svg);
            })
            .catch(err => {
                 console.error('Mermaid render error:', err);
                 setMermaidSvg('<p class="error-msg">Failed to render visualization syntax.</p>');
            });
        } catch (err) {
             console.error('Mermaid sync error:', err);
             setMermaidSvg('<p class="error-msg">Failed to parse visualization.</p>');
        }
      } else {
        setMermaidSvg('<p class="no-visuals">No visualization available for this topic.</p>');
      }
    }
  }, [activeTab, currentNode]);

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

  // Helper to strip Visuals section and Mermaid blocks
  const cleanText = (text) => {
      if (!text) return '';
      let cleaned = text.replace(/## (Visuals|Diagram|Architecture)[\s\S]*?$/, '');
      cleaned = cleaned.replace(/```(mermaid|graph)[\s\S]*?```/gi, '');
      return cleaned;
  };

  overviewContent = cleanText(overviewContent);
  deepDiveContent = cleanText(deepDiveContent);

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
                {mermaidSvg ? (
                    <div 
                        className="mermaid-wrapper"
                        dangerouslySetInnerHTML={{ __html: mermaidSvg }} 
                    />
                ) : (
                    currentNode.streaming ? <div className="spinner"></div> : <p className="no-visuals">Generating diagram...</p>
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
