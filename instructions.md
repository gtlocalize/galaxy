Project Galaxy: The AI Codex (Interactive 3D Learning Environment)

Target Platform: Raspberry Pi 5 (Node.js/Vite hosting)
Core Stack: React, Vite, React Three Fiber (R3F), Drei, Zustand, Framer Motion.

The Vision

We are building an immersive "Memory Palace" specifically for mastering Artificial Intelligence. The interaction model is "Drill & Expand":

Initial State: A single pulsing core node (e.g., "AI").

Action: Clicking a node doesn't just open a page; it dynamically spawns a cluster of child nodes around it in 3D space.

Navigation: The user "flies" deeper into the cluster. To "back out," they zoom out to the parent cluster.

Visuals: Glowing connections line back to the parent, creating a visual "history trail" of your learning path.

Architecture & Stack

1. The "Engine" (Frontend)

Framework: Vite + React (Fast, lightweight, perfect for Pi serving).

3D Scene: @react-three/fiber (The core renderer).

Helpers: @react-three/drei (For "OrbitControls", "Stars", "Text" in 3D space).

Physics/Layout: react-force-graph-3d (Essential for the "explosion" effect when new nodes spawn).

State Management: Zustand (Tracks the currently active "path" and loaded data).

2. The "Brain" (Dynamic Data)

Instead of a static file, the app starts with a seed and fetches more data on demand.
State Structure:

{
  "activeNodeId": "ai_root",
  "graphData": {
    "nodes": [{ "id": "ai_root", "name": "Artificial Intelligence", "val": 50, "color": "#ffffff" }],
    "links": []
  }
}


3. The "Generator" (Agentic Backend)

A lightweight Node.js API that acts as the "Dungeon Master."

Input: parentNode (e.g., "Neural Networks")

Process: Uses Gemini API to generate 5-7 specific sub-topics and a brief summary for each.

Output: JSON array of new nodes + Markdown content for the parent.

Execution Steps for Gemini 3

Step 1: The Scaffold
"Initialize a new Vite project named 'galaxy-codex' with React. Install three, @react-three/fiber, @react-three/drei, react-force-graph-3d, zustand, axios, and react-markdown."

Step 2: The Cosmos (Graph Engine)
"Create a GalaxyScene.jsx component wrapping ForceGraph3D.

Config: Set cooldownTicks={100} (so it stabilizes fast).

Node Styling: Use different colors for 'explored' vs 'unexplored' nodes.

Click Handler: When a node is clicked:

Focus the camera on it.

Trigger the 'Expand' action (fetch children).

Lock the parent node in place so the new children orbit it."

Step 3: The "Drill Down" Mechanic
"Implement the expandNode(nodeId) function in Zustand.

It should check if the node has children.

If NO: Call the backend API /api/expand?topic={nodeName}.

Receive: A list of sub-topics.

Update: Add these new nodes to the graphData. Create links from nodeId -> newChildId.

Visual: The new nodes should 'pop' into existence around the parent."

Step 4: The HUD (Learning Card)
"Create a LearningHUD.jsx overlay.

Position: Floating panel on the right.

Content: Displays the summary of the currently focused node.

Context: Shows a 'breadcrumb' trail at the top (e.g., AI > ML > Neural Nets > Backprop) so the user can click to zoom back out."

Step 5: The Backend Generator
"Create a simple Express server (server.js).

Endpoint: /api/expand.

Logic: Calls Gemini Pro. Prompt: 'Given the topic "{topic}", list 5 key sub-concepts to learn next. Return JSON: [{name: "...", summary: "..."}].'

Cache: Save results to a local JSON file so we don't re-query Gemini for the same topic twice."

Future "Agentic" Features

The "Simulation" Node: If a node is about a visual concept (like "Convolution"), the HUD spawns a mini 3D playground instead of text.