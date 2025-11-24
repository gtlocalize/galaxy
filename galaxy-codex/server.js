import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Cache setup
const CACHE_FILE = 'cache.json';
let cache = {};

async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    cache = JSON.parse(data);
  } catch (error) {
    cache = {};
  }
}

async function saveCache() {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

loadCache();

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');
// Text Model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Using 1.5 Pro for better reasoning
// Image Model (Nano Banana)
const imageModel = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

const SYSTEM_PROMPT_TEMPLATE = `
You are the Galaxy Codex, an advanced AI interface for exploring human knowledge.
Your goal is to provide structured, educational content about any topic requested.

Format your response in strictly structured Markdown:

# {TOPIC_PLACEHOLDER}

## Overview
A concise, high-level summary of the topic (2-3 sentences).

## Key Concepts
- **Concept 1**: Definition
- **Concept 2**: Definition
- **Concept 3**: Definition

## Deep Dive
Detailed explanation, history, or technical breakdown. Use subsections if needed.

## Visuals
Create a Mermaid.js diagram (graph TD, sequenceDiagram, or mindmap) illustrating the concept, process, or hierarchy.
Wrap it in a \`\`\`mermaid code block.

## Connections
List 3-5 related topics for further exploration.

IMPORTANT:
- Wrap 6-10 key related terms in [[double brackets]] like [[Neural Networks]]
- Use markdown formatting
- STRICTLY use the headers provided above so the UI can split the content correctly.
- ENSURE NEWLINES after headers.
`;

// Streaming endpoint using Server-Sent Events
app.get('/galaxy-api/expand-stream', async (req, res) => {
  const { topic } = req.query;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Check cache first
  if (cache[topic] && cache[topic].content) {
    console.log(`Returning cached result for: ${topic}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'complete', data: cache[topic] })}\n\n`);
    res.end();
    return;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevent buffering by proxies

  // Send initial ping to establish connection immediately
  res.write(': ping\n\n');

  try {
    console.log(`Streaming content for: ${topic}`);

    const prompt = SYSTEM_PROMPT_TEMPLATE.replace('{TOPIC_PLACEHOLDER}', topic);

    const result = await model.generateContentStream(prompt);
    let fullText = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      // Send chunk to client
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
    }

    // Build final data object (without image yet)
    const data = {
      name: topic,
      category: 'Core AI',
      content: fullText
    };

    // Cache text content
    cache[topic] = { ...cache[topic], ...data };
    await saveCache();

    // Send complete signal
    res.write(`data: ${JSON.stringify({ type: 'complete', data })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Image Generation Endpoint
app.get('/galaxy-api/visualize', async (req, res) => {
  const { topic } = req.query;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  // Check cache
  if (cache[topic] && cache[topic].imageUrl) {
    return res.json({ imageUrl: cache[topic].imageUrl });
  }

  try {
    console.log(`Generating Nano Banana visualization for: ${topic}`);
    // Strict prompt for technical accuracy
    const prompt = `Technical diagram, flowchart, or schematic of ${topic}. 
        Style: Blueprint, Neon Schematic, Network Graph, White lines on dark background. 
        High contrast, educational, informative, detailed.`;

    // Attempt to use Imagen model
    // Note: This requires an API key with access to Imagen
    const imageModel = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    // This is a speculative call structure for Imagen in the SDK. 
    // If this fails, we catch the error and inform the user.
    // We do NOT silently fallback to "AI slop".
    const result = await imageModel.generateContent(prompt);
    const response = await result.response;

    // Assuming response contains image data (this varies by SDK version/model)
    // If we can't get a URL, we might get base64.
    // For now, if this throws, we go to catch.

    // If the SDK returns text instead of image (common with wrong model), throw.
    if (!response.candidates || !response.candidates[0].content.parts[0].inlineData) {
      throw new Error("Model returned text, not image. Check model permissions.");
    }

    const base64Image = response.candidates[0].content.parts[0].inlineData.data;
    const mimeType = response.candidates[0].content.parts[0].inlineData.mimeType;
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // Cache it
    if (!cache[topic]) cache[topic] = {};
    cache[topic].imageUrl = imageUrl;
    await saveCache();

    res.json({ imageUrl });

  } catch (error) {
    console.error('Image generation error:', error);
    // Return explicit error to user so they know to check API key
    res.status(500).json({
      error: 'Image Generation Failed',
      details: error.message,
      hint: 'Ensure GEMINI_API_KEY has access to imagen-3.0-generate-001'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
