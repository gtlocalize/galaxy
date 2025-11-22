import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Initial State
  activeNode: 'Artificial Intelligence', // Start focused on root
  graphData: {
    nodes: [
      { 
        id: 'Artificial Intelligence', 
        name: 'Artificial Intelligence', 
        val: 80, 
        color: '#00ffff',
        category: 'Core AI',
        // Initial content to get started without API call if needed
        content: `
# Artificial Intelligence

Artificial Intelligence (AI) is the simulation of human intelligence processes by computer systems. These processes include learning (the acquisition of information and rules for using the information), reasoning (using rules to reach approximate or definite conclusions), and self-correction.

## Key Concepts

At the heart of AI lies [[Machine Learning]], which enables systems to learn from data. More advanced forms include [[Deep Learning]] and [[Neural Networks]], which mimic the human brain's structure.

AI is often categorized into [[Narrow AI]] (designed for specific tasks) and [[General AI]] (hypothetical systems with human-level cognition).

## Applications

AI is transforming fields such as [[Natural Language Processing]], [[Computer Vision]], and [[Robotics]].
        `
      }
    ],
    links: []
  },

  // Actions
  setActiveNode: (nodeId) => set({ activeNode: nodeId }),

  // Expand Node: Fetches rich content and spawns children based on [[wikilinks]]
  expandNode: async (nodeId) => {
    const { graphData } = get();
    const node = graphData.nodes.find(n => n.id === nodeId);
    
    // If node already has processed content (and thus children spawned), we might just want to ensure it's active.
    // But maybe we want to re-fetch if it was just a stub?
    // We check if 'content' is fully populated (length > 100 is a heuristic, or a flag).
    const isStub = !node.content || node.content.length < 100;

    if (!isStub) {
      console.log('Node already expanded/loaded:', nodeId);
      return;
    }

    try {
      // Call backend API
      const response = await fetch(`/galaxy-api/expand?topic=${encodeURIComponent(node.name)}`);
      
      let data;
      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error('Backend failed');
      }

      // 1. Update the current node with rich content
      const updatedNode = {
        ...node,
        category: data.category,
        content: data.content
      };

      // 2. Parse [[wikilinks]] to find children
      const linkRegex = /\[\[(.*?)\]\]/g;
      const matches = [...data.content.matchAll(linkRegex)];
      const childNames = matches.map(m => m[1]); // Extract term inside brackets
      
      const uniqueChildren = [...new Set(childNames)]; // Dedupe

      // 3. Create new Stub Nodes for children
      const newNodes = [];
      const newLinks = [];

      uniqueChildren.forEach(childName => {
        // Check if node exists
        const exists = graphData.nodes.find(n => n.id === childName);
        
        if (!exists) {
          newNodes.push({
            id: childName,
            name: childName,
            val: 20, // Smaller size for children
            color: '#aaddff', // Default color, could be based on category later
            content: '' // Stub content
          });
        }

        // Check if link exists
        const linkExists = graphData.links.some(l => 
          (l.source === nodeId || l.source.id === nodeId) && 
          (l.target === childName || l.target.id === childName)
        );

        if (!linkExists) {
          newLinks.push({
            source: nodeId,
            target: childName
          });
        }
      });

      // 4. Update Graph Data
      // We replace the expanded node in the array and add new ones
      const updatedNodes = graphData.nodes.map(n => n.id === nodeId ? updatedNode : n);

      set(state => ({
        graphData: {
          nodes: [...updatedNodes, ...newNodes],
          links: [...state.graphData.links, ...newLinks]
        }
      }));

    } catch (error) {
      console.error('Error expanding node:', error);
      // Fallback for demo/offline
      console.log('Using offline fallback');
      
      const fallbackContent = `
# ${node.name} (Offline)

Content could not be fetched. Imagine a great article here about **${node.name}**.

## Related Topics
- [[Machine Learning]]
- [[Neural Networks]]
- [[Data Science]]
      `;
      
      const updatedNode = { ...node, content: fallbackContent };
      // We won't spawn children in fallback to avoid infinite loops of bad data, 
      // unless we parse the fallback content specifically.
      
      const updatedNodes = graphData.nodes.map(n => n.id === nodeId ? updatedNode : n);
      set({ graphData: { ...graphData, nodes: updatedNodes } });
    }
  }
}));

export default useStore;
