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

  expandNode: async (nodeId) => {
    // This is now mostly internal or used for initial expansion
    // Real expansion happens via handleLinkClick
  },

  fetchNodeContent: async (nodeId, topicName) => {
    const { graphData } = get();
    const node = graphData.nodes.find(n => n.id === nodeId);
    const name = topicName || node?.name || 'Unknown Topic';

    if (node && (node.content || node.tabs)) return; // Already has content

    // Fallback content when API fails
    const fallbackTabs = [
      {
        id: 'overview',
        label: 'Overview',
        content: `# ${name}\n\nContent temporarily unavailable due to API limits. This topic covers important concepts in AI and machine learning.\n\n**Key areas to explore:**\n- [[Machine Learning]] fundamentals\n- [[Neural Networks]] architecture\n- [[Deep Learning]] applications\n\nTry again later for full content.`
      }
    ];

    try {
      const response = await fetch(`/galaxy-api/expand?topic=${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();

      // Check if we got an error response
      if (data.error) throw new Error(data.error);

      set(state => ({
        graphData: {
          ...state.graphData,
          nodes: state.graphData.nodes.map(n =>
            n.id === nodeId
              ? { ...n, tabs: data.tabs, category: data.category || 'Core AI' }
              : n
          )
        }
      }));
    } catch (error) {
      console.error('Error fetching node content:', error);
      // Set fallback content so UI doesn't spin forever
      set(state => ({
        graphData: {
          ...state.graphData,
          nodes: state.graphData.nodes.map(n =>
            n.id === nodeId
              ? { ...n, tabs: fallbackTabs, category: 'Core AI', apiError: true }
              : n
          )
        }
      }));
    }
  },

  handleLinkClick: async (term, parentNodeId) => {
    const { graphData, setActiveNode, fetchNodeContent } = get();

    // 1. Check if node already exists
    const existingNode = graphData.nodes.find(n => n.name.toLowerCase() === term.toLowerCase());

    if (existingNode) {
      setActiveNode(existingNode.id);
      // Fly to it (handled by GalaxyScene observing activeNode)
      return;
    }

    // 2. Create new node
    const newNodeId = `${parentNodeId}_${term.replace(/\s+/g, '_')}`;
    const newNode = {
      id: newNodeId,
      name: term,
      val: 20,
      color: '#aaddff', // Default, will be updated by category later
      parent: parentNodeId
    };

    const newLink = {
      source: parentNodeId,
      target: newNodeId
    };

    set(state => ({
      graphData: {
        nodes: [...state.graphData.nodes, newNode],
        links: [...state.graphData.links, newLink]
      },
      activeNode: newNodeId
    }));

    // 3. Fetch content for the new node
    await get().fetchNodeContent(newNodeId, term);
  }
}));

export default useStore;
