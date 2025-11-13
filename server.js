// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Keep short-term conversation memory per student/session
const conversationMemory = {};
// Cache lessons by subject + topic + duration
const lessonCache = {};

// 🟢 Ping route (to keep Render awake)
app.get("/ping", (req, res) => res.send("pong — server is awake!"));

// 🏫 Main Lesson Endpoint
app.post("/lesson", async (req, res) => {
  const { subject, topic, duration, extra, student } = req.body;

  if (!subject || !topic) {
    return res.status(400).json({ error: "Missing subject or topic" });
  }

  const cacheKey = `${subject}_${topic}_${duration}`;
  if (lessonCache[cacheKey]) {
    console.log("✅ Returning cached lesson...");
    return res.json({ lesson: lessonCache[cacheKey] });
  }

  try {
    // Build a more human teaching prompt
    const prompt = `
You are a friendly and patient teacher. 
Teach the student named ${student || "Student"} in a natural, conversational way. 
The subject is ${subject}, and the topic is ${topic}.
Make the explanation detailed, step-by-step, and interactive — 
include examples, ask questions, and pause for short reflections.
Keep teaching continuously for about ${duration} minutes.
If it’s ICT or Math, give real examples and short exercises.
If the student responds, continue from where you left off.
${extra || ""}
`;

    // Store conversation history
    if (!conversationMemory[subject]) conversationMemory[subject] = [];
    conversationMemory[subject].push({ role: "user", content: prompt });

    // Timeout setup (avoid hanging forever)
    const timeout = (ms) =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    // Call OpenAI API with fallback timeout
    const data = await Promise.race([
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an AI teacher that teaches senior high school students. Speak naturally like a real tutor.",
            },
            ...conversationMemory[subject],
          ],
          max_tokens: 800,
          temperature: 0.8,
        }),
      }),
      timeout(20000), // 20-second safety limit
    ]);

    // Parse response
    const json = await data.json();
    if (!json.choices || !json.choices[0] || !json.choices[0].message) {
      throw new Error("Incomplete AI response");
    }

    const lesson = json.choices[0].message.content.trim();
    conversationMemory[subject].push({ role: "assistant", content: lesson });
    lessonCache[cacheKey] = lesson;

    res.json({ lesson });
  } catch (err) {
    console.error("❌ Error generating lesson:", err.message);
    res.json({
      lesson:
        "⚠️ The teacher is reconnecting to the classroom. Please wait a few seconds and try again.",
    });
  }
});

// Root route (basic info)
app.get("/", (req, res) => {
  res.send("🎓 AI Classroom Backend is running successfully!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
