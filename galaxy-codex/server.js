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
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

// Streaming endpoint using Server-Sent Events
app.get('/galaxy-api/expand-stream', async (req, res) => {
  const { topic } = req.query;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Check cache first
  if (cache[topic]) {
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

    const prompt = `You are an expert tutor creating educational content about "${topic}".

Write a comprehensive educational article with this EXACT structure. Ensure there are blank lines between headers and content.

# ${topic}

## Overview
[Brief high-level summary: What it is and why it matters. Keep it under 150 words.]

## Key Concepts
[3-5 core ideas explained clearly with [[wiki-links]] to related topics]

## Deep Dive
[Detailed technical explanation of mechanics, algorithms, or processes. Go into depth here.]
[Include Real-World Applications here as well]

## Visuals
Create a complex Mermaid diagram to visualize this concept. Use the syntax:
\`\`\`mermaid
graph TD
...
\`\`\`
Try to make it detailed (e.g., a process flow, hierarchy, or decision tree).
If appropriate, include a second diagram (e.g. a sequence diagram or mindmap) below the first one.

## Connections
[How it relates to other fields - use [[wiki-links]]]

IMPORTANT:
- Wrap 6-10 key related terms in [[double brackets]] like [[Neural Networks]]
- Use markdown formatting
- STRICTLY use the headers provided above so the UI can split the content correctly.
- ENSURE NEWLINES after headers.`;

    const result = await model.generateContentStream(prompt);
    let fullText = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      // Send chunk to client
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
    }

    // Build final data object
    const data = {
      name: topic,
      category: 'Core AI',
      content: fullText
    };

    // Cache it
    cache[topic] = data;
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
