import { create } from 'zustand';

// Mock generator - Gemini 3 will replace this later
const generateSubTopics = (topicId) => {
  const topics = [
    "Neural Architecture", "Loss Functions", "Optimization", 
    "Data Pipelines", "Inference", "Hardware Acceleration"
  ];
  return topics.map((t, i) => ({
    id: `${topicId}_${i}`,
    name: t,
    val: 10, 
    color: "#00ccff", 
    parent: topicId,
    desc: `Deep dive into ${t}. Understanding this component is crucial for mastering the parent concept.`
  }));
};

export const useStore = create((set, get) => ({
  graphData: {
    nodes: [{ 
      id: "root", 
      name: "Artificial Intelligence", 
      val: 40, 
      color: "#ff0055", 
      desc: "The simulation of human intelligence processes by machines."
    }],
    links: []
  },
  
  activeNode: null,

  expandNode: (node) => {
    const { graphData } = get();
    
    // Prevent duplicate expansion
    const isExpanded = graphData.links.some(l => l.source.id === node.id || l.source === node.id);
    if (isExpanded) return;

    // Generate children
    const newNodes = generateSubTopics(node.id);
    const newLinks = newNodes.map(child => ({
      source: node.id,
      target: child.id
    }));

    set({
      graphData: {
        nodes: [...graphData.nodes, ...newNodes],
        links: [...graphData.links, ...newLinks]
      }
    });
  },

  setActiveNode: (node) => set({ activeNode: node })
}));