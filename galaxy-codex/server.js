import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
    console.log(`Generating rich content for: ${topic}`);
    
    const prompt = `
      Write a comprehensive educational entry about "${topic}" for an interactive learning graph.
      Target audience: University students or self-learners.
      
      Requirements:
      1. Content Length: 300-500 words.
      2. Structure: Use Markdown headers (# Overview, ## Key Concepts, ## Applications, ## History).
      3. Interactivity: Identify 5-10 key terms or related concepts that a user might want to explore next. Wrap these terms in double brackets like [[Machine Learning]] or [[Neural Networks]].
      4. Context: Assign a "category" to this topic (e.g., "Core AI", "Math", "History", "Tools", "Applications", "Ethics").
      
      Return the result strictly as a JSON object with the following keys:
      {
        "name": "${topic}",
        "category": "Category Name",
        "content": "Markdown string..."
      }
      
      Do not include markdown code blocks (like \`\`\`json) in the response, just the raw JSON string.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown code blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(cleanText);

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
