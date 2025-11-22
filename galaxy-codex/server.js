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
      You are an expert tutor building a knowledge graph about "${topic}".
      
      GOAL: Create a deep, interactive educational module about this topic.
      
      OUTPUT FORMAT:
      Return a JSON object with the following structure:
      {
        "name": "${topic}",
        "category": "One of: Core AI, Applications, Theory, Tools",
        "tabs": [
          {
            "id": "overview",
            "label": "Overview",
            "content": "Markdown content (300 words). Introduction, importance, and high-level summary. Use [[wiki-links]]."
          },
          {
            "id": "deep_dive",
            "label": "Deep Dive",
            "content": "Markdown content (500-800 words). Detailed explanation, how it works, math/logic if applicable, and challenges. Use [[wiki-links]]."
          },
          {
            "id": "visuals",
            "label": "Visuals",
            "content": "Explain the concept using a diagram.",
            "diagram": "Mermaid.js code string (e.g., graph TD...)"
          }
        ]
      }

      DIAGRAM INSTRUCTIONS:
      - Create a Mermaid.js diagram that best explains the concept (flowchart, sequence diagram, or class diagram).
      - Keep it simple but informative.
      - Do NOT wrap the mermaid code in markdown blocks in the JSON field. Just the raw string.

      CRITICAL:
      - Identify 5-8 key terms in the text and wrap them in [[double brackets]].
      - Ensure the JSON is valid.
      - Do not include markdown formatting (like \`\`\`json) around the JSON response.
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
