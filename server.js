import express from "express";
import cors from "cors";
import fetch from "node-fetch";

/* =========================
   APP SETUP
========================= */
const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GROQ API KEY (SAFE - FROM RENDER)
========================= */
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/* =========================
   AI CHAT ENDPOINT
========================= */
app.post("/chat", async (req, res) => {

  const userMessage = req.body.message;

  try {

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + GROQ_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: "You are a friendly Ghanaian classroom teacher. Teach step-by-step in simple English with examples."
            },
            {
              role: "user",
              content: userMessage
            }
          ]
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't respond.";

    res.json({ reply });

  } catch (err) {
    console.log(err);
    res.json({ reply: "Server error. Try again later." });
  }

});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 AI Server running on port " + PORT);
});
