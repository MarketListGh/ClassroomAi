// server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Optional in-memory cache for lessons (keyed by subject+topic+duration)
const lessonCache = {};

// Endpoint: /lesson
app.post('/lesson', async (req, res) => {
  const { subject, topic, duration, extra } = req.body;

  if (!subject || !topic) {
    return res.status(400).json({ error: "Missing subject or topic" });
  }

  const cacheKey = `${subject}_${topic}_${duration}`;
  if (lessonCache[cacheKey]) {
    console.log("Returning cached lesson...");
    return res.json({ lesson: lessonCache[cacheKey] });
  }

  try {
    // Create prompt for OpenAI
    const prompt = `Create a detailed ${duration}-minute lesson on ${topic} for ${subject}. ${extra || ""}`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(500).json({ error: "Failed to generate lesson" });
    }

    const lesson = data.choices[0].message.content;
    lessonCache[cacheKey] = lesson; // cache it
    res.json({ lesson });

  } catch (err) {
    console.error("Error generating lesson:", err);
    res.status(500).json({ error: "Server failed to generate lesson" });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send("AI Classroom Backend is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
