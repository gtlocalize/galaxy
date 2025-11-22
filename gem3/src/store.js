import { create } from 'zustand';

export const useStore = create((set, get) => ({
  graphData: {
    nodes: [{ 
      id: "root", 
      name: "Artificial Intelligence", 
      val: 60, // Bigger root
      color: "#ff0055", 
      type: "core", // Mark as core to add rings
      modules: [
        {
          type: 'summary',
          title: 'Summary',
          content: 'Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. Specific applications include expert systems, NLP, and machine vision.'
        },
        {
          type: 'grid',
          title: 'Sub Topic',
          items: [
            { id: 'nn', label: 'Neural Networks' },
            { id: 'ml', label: 'Machine Learning' },
            { id: 'nlp', label: 'NLP' },
            { id: 'cv', label: 'Computer Vision' },
            { id: 'robotics', label: 'Robotics' },
            { id: 'genai', label: 'Generative AI' }
          ]
        },
        {
          type: 'chart',
          title: 'Pros/Cons', // The bar chart from your image
          data: [
            { label: 'Cost', val: 80, color: '#ef4444' },
            { label: 'Speed', val: 40, color: '#3b82f6' },
            { label: 'Acc', val: 90, color: '#10b981' }
          ]
        }
      ]
    }],
    links: []
  },
  
  activeNode: null,

  expandNode: (node) => {
    const { graphData } = get();
    if (graphData.links.some(l => l.source.id === node.id || l.source === node.id)) return;

    // Spawn blue children
    const subTopics = ["Neural Networks", "Machine Learning", "Deep Learning", "Robotics"];
    const newNodes = subTopics.map((t, i) => ({
      id: `${node.id}_${i}`,
      name: t,
      val: 20,
      color: "#00ccff", // Neon Blue
      type: "satellite",
      parent: node.id,
      modules: [
        { type: 'summary', title: t, content: `Deep dive into ${t}.` }
      ]
    }));

    const newLinks = newNodes.map(child => ({ source: node.id, target: child.id }));

    set({
      graphData: {
        nodes: [...graphData.nodes, ...newNodes],
        links: [...graphData.links, ...newLinks]
      }
    });
  },

  setActiveNode: (node) => set({ activeNode: node })
}));