
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Classroom AI Backend is running!");
});

// Generate a lesson dynamically using OpenAI
app.post("/lesson", async (req, res) => {
  try {
    const { subject, topic, duration } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required." });
    }

    // Build a detailed, realistic teaching prompt
    const prompt = `
    You are a patient, detailed high school teacher. 
    Teach the topic "${topic}" in "${subject}" for about ${duration} minutes.
    Structure it like this:
    1. Introduction (engaging opening)
    2. Main Explanation (clear and detailed)
    3. Step-by-step teaching (if applicable)
    4. Examples and real-life connections
    5. Summary and key takeaways
    6. 3 quiz questions for the student
    Make it sound like a real teacher talking to a class.
    `;

    // Call OpenAI API securely using your environment key
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a high school teacher AI." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "AI response failed." });
    }

    const lesson = data.choices[0].message.content.trim();

    res.json({ lesson });
  } catch (error) {
    console.error("Error generating lesson:", error);
    res.status(500).json({ error: "Failed to generate lesson" });
  }
});

// Render uses the PORT environment variable automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
