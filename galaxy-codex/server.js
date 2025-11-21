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

app.get('/api/expand', async (req, res) => {
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
    console.log(`Generating expansion for: ${topic}`);
    
    const prompt = `
      You are an expert tutor building a knowledge graph.
      Given the topic "${topic}", list 5-7 key sub-concepts or related topics that a student should learn next.
      For each sub-concept, provide a concise 1-sentence summary.
      
      Return the result strictly as a JSON array of objects with keys: "name" and "summary".
      Example: [{"name": "Concept", "summary": "Description..."}]
      Do not include markdown formatting or backticks in the response.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown code blocks if the model ignores instruction
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

