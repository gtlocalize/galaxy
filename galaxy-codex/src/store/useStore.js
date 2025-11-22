import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Initial State
  activeNode: 'ai_root',
  graphData: {
    nodes: [
      { 
        id: 'ai_root', 
        name: 'Artificial Intelligence', 
        val: 80, 
        color: '#00ffff',
        summary: 'The simulation of human intelligence processes by computer systems.'
      }
    ],
    links: []
  },

  // Actions
  setActiveNode: (nodeId) => set({ activeNode: nodeId }),

  expandNode: async (nodeId) => {
    const { graphData } = get();
    const node = graphData.nodes.find(n => n.id === nodeId);
    
    // Basic check to see if we've already expanded this node (simple heuristic: does it have outgoing links?)
    // In a real app, we might track 'expanded' state on the node itself.
    const hasChildren = graphData.links.some(l => l.source === nodeId || l.source.id === nodeId);
    
    if (hasChildren) {
      console.log('Node already expanded:', nodeId);
      return;
    }

    try {
      // Call backend API
      // The backend is running on /galaxy-api/expand
      const response = await fetch(`/galaxy-api/expand?topic=${encodeURIComponent(node.name)}`);
      if (!response.ok) throw new Error('Failed to fetch expansion data');
      
      const data = await response.json(); 
      // Expected data format: [{ name: "...", summary: "..." }, ...]

      // Process new nodes
      const newNodes = data.map((item, index) => ({
        id: `${nodeId}_${index}`, // Unique ID
        name: item.name,
        summary: item.summary,
        val: 20, // Smaller size for children
        color: '#aaddff' // Light blue for children
      }));

      // Create links from parent to new children
      const newLinks = newNodes.map(child => ({
        source: nodeId,
        target: child.id
      }));

      set(state => ({
        graphData: {
          nodes: [...state.graphData.nodes, ...newNodes],
          links: [...state.graphData.links, ...newLinks]
        }
      }));

    } catch (error) {
      console.error('Error expanding node:', error);
      // Fallback/Mock for demo if backend fails
      console.log('Using fallback mock data');
      const mockChildren = [
        { name: 'Machine Learning', summary: 'Algorithms that improve through experience.' },
        { name: 'Neural Networks', summary: 'Computing systems inspired by biological brains.' },
        { name: 'Robotics', summary: 'Design and construction of robots.' },
        { name: 'NLP', summary: 'Interaction between computers and human language.' }
      ];
      
      const newNodes = mockChildren.map((item, index) => ({
        id: `${nodeId}_mock_${index}`,
        name: item.name,
        summary: item.summary,
        val: 20,
        color: '#ffaa00' // Orange for mock data
      }));

      const newLinks = newNodes.map(child => ({
        source: nodeId,
        target: child.id
      }));

      set(state => ({
        graphData: {
          nodes: [...state.graphData.nodes, ...newNodes],
          links: [...state.graphData.links, ...newLinks]
        }
      }));
    }
  }
}));

export default useStore;

