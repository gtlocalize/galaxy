import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Initial State
  activeNode: 'artificial_intelligence', // Normalized ID
  graphData: {
    nodes: [
      { 
        id: 'artificial_intelligence', 
        name: 'Artificial Intelligence', 
        val: 80, 
        color: '#00ffff',
        category: 'Core AI',
        type: 'core', // Special visual treatment
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

  fetchNodeContent: async (nodeId, topicName) => {
    const { graphData } = get();
    const node = graphData.nodes.find(n => n.id === nodeId);
    const name = topicName || node?.name || 'Unknown Topic';

    if (node && node.content) return; // Already has content

    // Set initial streaming state
    set(state => ({
      graphData: {
        ...state.graphData,
        nodes: state.graphData.nodes.map(n =>
          n.id === nodeId ? { ...n, content: '', streaming: true } : n
        )
      }
    }));

    try {
      const eventSource = new EventSource(`/galaxy-api/expand-stream?topic=${encodeURIComponent(name)}`);

      eventSource.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'chunk') {
          // Append chunk to content
          set(state => ({
            graphData: {
              ...state.graphData,
              nodes: state.graphData.nodes.map(n =>
                n.id === nodeId ? { ...n, content: (n.content || '') + msg.text } : n
              )
            }
          }));
        } else if (msg.type === 'complete') {
          // Final update
          set(state => ({
            graphData: {
              ...state.graphData,
              nodes: state.graphData.nodes.map(n =>
                n.id === nodeId
                  ? { ...n, content: msg.data.content, category: msg.data.category, streaming: false }
                  : n
              )
            }
          }));
          eventSource.close();
        } else if (msg.type === 'error') {
          console.error('Stream error:', msg.message);
          set(state => ({
            graphData: {
              ...state.graphData,
              nodes: state.graphData.nodes.map(n =>
                n.id === nodeId
                  ? { ...n, content: `# ${name}\n\nFailed to load content. Try again later.`, streaming: false }
                  : n
              )
            }
          }));
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        console.error('EventSource error');
        eventSource.close();
        set(state => ({
          graphData: {
            ...state.graphData,
            nodes: state.graphData.nodes.map(n =>
              n.id === nodeId
                ? { ...n, content: `# ${name}\n\nConnection error. Try again later.`, streaming: false }
                : n
            )
          }
        }));
      };

    } catch (error) {
      console.error('Error fetching node content:', error);
      set(state => ({
        graphData: {
          ...state.graphData,
          nodes: state.graphData.nodes.map(n =>
            n.id === nodeId
              ? { ...n, content: `# ${name}\n\nFailed to load. Try again.`, streaming: false }
              : n
          )
        }
      }));
    }
  },

  handleLinkClick: async (term, parentNodeId) => {
    const { graphData, setActiveNode, fetchNodeContent } = get();

    // 1. Normalize ID to ensure graph connectivity (Graph vs Tree)
    const newNodeId = term.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
    
    // 2. Check if node already exists
    const existingNode = graphData.nodes.find(n => n.id === newNodeId);

    if (existingNode) {
      // Just link to it if not linked
      const linkExists = graphData.links.some(l => 
        (l.source.id === parentNodeId && l.target.id === newNodeId) ||
        (l.source === parentNodeId && l.target === newNodeId)
      );

      if (!linkExists) {
         set(state => ({
            graphData: {
                ...state.graphData,
                links: [...state.graphData.links, { source: parentNodeId, target: newNodeId }]
            }
         }));
      }

      setActiveNode(newNodeId);
      return;
    }

    // 3. Create new node
    // Spawn near parent to prevent physics explosion
    const parentNode = graphData.nodes.find(n => n.id === parentNodeId);
    const spawnPos = parentNode && parentNode.x !== undefined ? {
        x: parentNode.x + (Math.random() - 0.5) * 20,
        y: parentNode.y + (Math.random() - 0.5) * 20,
        z: parentNode.z + (Math.random() - 0.5) * 20
    } : {}; // Let engine decide if no parent pos

    const newNode = {
      id: newNodeId,
      name: term,
      val: 20,
      color: '#aaddff', // Default, will be updated by category later
      parent: parentNodeId,
      ...spawnPos
    };

    const newLink = {
      source: parentNodeId,
      target: newNodeId
    };

    console.log('Creating Link:', parentNodeId, '->', newNodeId);

    set(state => ({
      graphData: {
        nodes: [...state.graphData.nodes, newNode],
        links: [...state.graphData.links, newLink]
      },
      activeNode: newNodeId
    }));

    // 4. Fetch content for the new node
    await get().fetchNodeContent(newNodeId, term);
  }
}));

export default useStore;
