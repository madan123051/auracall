const MAX_TEXT_LENGTH = 8000;

function extractOutputText(payload) {
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("\n")
    .trim();
}

function fallbackResult(action, text) {
  if (action === "smart_reply") {
    const normalized = text.toLowerCase();
    if (normalized.includes("?")) return "Yes, that works for me. Please share the details.";
    if (normalized.includes("thank")) return "You are welcome. Happy to help.";
    if (normalized.includes("call")) return "Sure, tell me what time works best for the call.";
    return "Sounds good. I will get back to you shortly.";
  }

  if (action === "summarize") {
    return "AI summaries become available after OPENAI_API_KEY is added to the server environment.";
  }

  return text;
}

function buildPrompt(action, text, targetLanguage) {
  if (action === "translate") {
    return {
      instructions:
        "Translate the user's text into the requested target language. Return only the translation. Preserve names, links, numbers, and the original tone.",
      input: `Target language: ${targetLanguage || "English"}\n\nText:\n${text}`,
    };
  }

  if (action === "smart_reply") {
    return {
      instructions:
        "Write one natural, concise reply to the latest chat context. Return only the reply, with no quotation marks or explanation.",
      input: text,
    };
  }

  return {
    instructions:
      "Summarize this conversation in no more than four short bullets. Focus on decisions, requests, dates, and next actions.",
    input: text,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action = "smart_reply", text = "", targetLanguage = "English" } = req.body || {};
  const safeText = String(text).trim().slice(0, MAX_TEXT_LENGTH);

  if (!safeText) return res.status(400).json({ error: "Text is required" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      text: fallbackResult(action, safeText),
      fallback: true,
    });
  }

  const prompt = buildPrompt(action, safeText, targetLanguage);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: prompt.instructions,
        input: prompt.input,
        max_output_tokens: action === "summarize" ? 350 : 220,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error("[AI] OpenAI request failed:", payload);
      return res.status(502).json({ error: "AI service is temporarily unavailable" });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) return res.status(502).json({ error: "AI returned an empty response" });

    return res.status(200).json({ text: outputText, fallback: false });
  } catch (error) {
    console.error("[AI] Request error:", error);
    return res.status(502).json({ error: "AI service is temporarily unavailable" });
  }
}
