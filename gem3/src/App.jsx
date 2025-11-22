import React from 'react';
import GalaxyScene from './GalaxyScene';
import { useStore } from './store';
import { motion, AnimatePresence } from 'framer-motion';

const HUD = () => {
  const { activeNode } = useStore();

  return (
    <AnimatePresence>
      {activeNode && (
        <motion.div 
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '400px',
            background: 'rgba(10, 10, 15, 0.85)', // Darker background for readability
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2.5rem',
            color: 'white',
            fontFamily: '"Inter", system-ui, sans-serif',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            overflowY: 'auto'
          }}
        >
          <h5 style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Knowledge Node
          </h5>
          
          <h1 style={{ 
            color: activeNode.color, 
            fontSize: '2rem', 
            margin: '0 0 1.5rem 0',
            textShadow: `0 0 20px ${activeNode.color}40` // Glow text
          }}>
            {activeNode.name}
          </h1>

          <div style={{
            width: '100%',
            height: '1px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
            marginBottom: '1.5rem'
          }} />

          <p style={{ lineHeight: 1.7, fontSize: '1.1rem', color: '#ddd' }}>
            {activeNode.desc}
          </p>
          
          {/* Placeholder for Gemini 3 "Nano Banana" Image */}
          <div style={{ 
            marginTop: '2rem', 
            height: '250px', 
            background: `linear-gradient(180deg, ${activeNode.color}10 0%, rgba(255,255,255,0.02) 100%)`,
            borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: '#666'
          }}>
            <span style={{ fontSize: '2rem' }}>🍌</span>
            <span style={{ fontSize: '0.9rem' }}>Dynamic Visualization Slot</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <GalaxyScene />
      <HUD />
    </div>
  );
}

export default App;