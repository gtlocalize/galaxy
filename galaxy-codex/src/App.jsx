import React, { Suspense } from 'react';
import GalaxyScene from './components/GalaxyScene';
import LearningHUD from './components/LearningHUD';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <Suspense fallback={<div style={{ color: 'white', padding: 20 }}>Loading Galaxy...</div>}>
        <GalaxyScene />
      </Suspense>
      <LearningHUD />
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: '#888',
        fontFamily: 'sans-serif',
        fontSize: '0.8rem',
        pointerEvents: 'none'
      }}>
        Galaxy Codex v0.1
      </div>
    </div>
  );
}

export default App;
