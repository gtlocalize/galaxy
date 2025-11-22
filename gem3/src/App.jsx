import React from 'react';
import GalaxyScene from './GalaxyScene';
import { useStore } from './store';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENTS ---

const GridModule = ({ items }) => (
  <div className="mb-6">
    <h3 className="text-gray-400 text-sm mb-3 uppercase tracking-wider">Sub Topic</h3>
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <button 
          key={item.id}
          className="bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400/30 text-blue-100 text-xs py-3 rounded-lg transition-all backdrop-blur-md"
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>
);

const ChartModule = ({ data }) => (
  <div className="mb-6">
    <h3 className="text-gray-400 text-sm mb-3 uppercase tracking-wider">Pros/Cons</h3>
    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
      <div className="flex justify-between text-xs text-gray-500 mb-2 border-b border-white/5 pb-1">
        <span>Metric</span>
        <span>Rating</span>
      </div>
      {data.map((d, i) => (
        <div key={i} className="flex items-center justify-between mb-3 last:mb-0">
          <span className="text-gray-300 text-xs font-mono w-12">{d.label}</span>
          <div className="flex-1 mx-3 h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full" 
              style={{ width: `${d.val}%`, backgroundColor: d.color }}
            />
          </div>
          <span className="text-white text-xs">{d.val}</span>
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN HUD ---

const HUD = () => {
  const { activeNode } = useStore();

  return (
    <AnimatePresence>
      {activeNode && (
        <motion.div 
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed right-6 top-6 bottom-6 w-96 z-50"
        >
          {/* The Glass Container */}
          <div className="h-full w-full bg-[#0a0f1c]/70 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">Summary HUD</span>
                <div className="flex gap-2">
                  <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">🔍</span>
                  <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">≡</span>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">{activeNode.name}</h1>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {activeNode.modules?.map((mod, i) => {
                if (mod.type === 'summary') return (
                  <p key={i} className="text-gray-300 text-sm leading-relaxed mb-6">{mod.content}</p>
                );
                if (mod.type === 'grid') return <GridModule key={i} items={mod.items} />;
                if (mod.type === 'chart') return <ChartModule key={i} data={mod.data} />;
                return null;
              })}
            </div>

            {/* Footer Decor */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-50" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black selection:bg-pink-500 selection:text-white">
      <GalaxyScene />
      <HUD />
    </div>
  );
}

export default App;