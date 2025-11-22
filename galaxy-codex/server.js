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
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  try {
    console.log(`Streaming content for: ${topic}`);

    const prompt = `You are an expert tutor creating educational content about "${topic}".

Write a comprehensive educational article (600-1000 words) with this structure:

# ${topic}

[Opening paragraph: What it is and why it matters]

## Key Concepts
[Core ideas explained clearly with [[wiki-links]] to related topics]

## How It Works
[Detailed explanation of mechanics/process]

## Real-World Applications
[Practical uses and examples]

## Connections
[How it relates to other fields - use [[wiki-links]]]

IMPORTANT:
- Wrap 6-10 key related terms in [[double brackets]] like [[Neural Networks]]
- Be thorough and educational, not surface-level
- Use markdown formatting`;

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

// Non-streaming fallback
app.get('/galaxy-api/expand', async (req, res) => {
  const { topic } = req.query;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Check cache
  if (cache[topic]) {
    console.log(`Returning cached result for: ${topic}`);
    return res.json(cache[topic]);
  }

  try {
    console.log(`Generating content for: ${topic}`);

    const prompt = `You are an expert tutor creating educational content about "${topic}".

Write a comprehensive educational article (600-1000 words) with this structure:

# ${topic}

[Opening paragraph: What it is and why it matters]

## Key Concepts
[Core ideas explained clearly with [[wiki-links]] to related topics]

## How It Works
[Detailed explanation of mechanics/process]

## Real-World Applications
[Practical uses and examples]

## Connections
[How it relates to other fields - use [[wiki-links]]]

IMPORTANT:
- Wrap 6-10 key related terms in [[double brackets]] like [[Neural Networks]]
- Be thorough and educational, not surface-level
- Use markdown formatting`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const data = {
      name: topic,
      category: 'Core AI',
      content: text
    };

    // Update cache
    cache[topic] = data;
    await saveCache();

    res.json(data);

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate content', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
