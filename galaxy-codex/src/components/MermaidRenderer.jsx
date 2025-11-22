import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif'
});

const MermaidRenderer = ({ chart }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current && chart) {
            mermaid.render(`mermaid-${Date.now()}`, chart).then(({ svg }) => {
                ref.current.innerHTML = svg;
            }).catch(err => {
                console.error('Mermaid render error:', err);
                ref.current.innerHTML = '<div style="color:red">Failed to render diagram</div>';
            });
        }
    }, [chart]);

    return <div ref={ref} className="mermaid-container" style={{ overflowX: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }} />;
};

export default MermaidRenderer;
