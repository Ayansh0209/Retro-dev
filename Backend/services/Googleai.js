const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'google-api.json');

const { VertexAI } = require('@google-cloud/vertexai');

const vertexAI = new VertexAI({
  project: 'solar-bebop-465607-i2',
  location: 'us-central1',
});


/**
 * Gemini AI call with system + user prompts.
 * @param {string} systemPrompt
 * @param {string} prompt
 * @param {(chunk: string) => void} onData
 */
async function GeminiRes(prompt, systemPrompt, onData) {
  try {
    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    });


  const SystemPrompt = `
You are a terminal-style Git assistant.

Your output must follow this exact format:

- A brief summary (max 2 lines)
- Step-by-step actions starting with "→"
- Git commands (one per line, NO formatting)
- End with: "Do you want me to continue?"

Strict rules:
- DO NOT use backticks, asterisks, markdown, bullets, or numbers
- DO NOT write "Git commands:" or anything like it
- DO NOT wrap any Git command in code blocks or quotes
- DO NOT repeat the Git commands after listing them
- DO NOT use headings like "Actions:" or "Summary:"
- DO NOT invent or modify real Git commands
- DO NOT ask "Do you want me to run..." — only ask: "Do you want me to continue?"



---

User input:
${prompt.trim()}

Git context:
${systemPrompt.trim()}
`.trim();

    const stream = await model.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [{
              text: SystemPrompt}]
        }
      ],

    });
   for await (const chunk of stream.stream) {
  const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) {

    const lines = text.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        onData(line); 
      }
    }
  }
}

  } catch (err) {
    console.error('Gemini API Error:', err.message);
    throw err;
  }
}

/**
 * Summarize GitHub notifications using Gemini
 * @param {Array} notifications - GitHub notifications
 * @param {(line: string) => void} onData - Streaming handler
 */
/**
 * Summarize GitHub activity from helper context
 * @param {string} githubContext - Clean text from GithubData()
 * @param {(line: string) => void} onData
 */
async function summarizeGithubContext(githubContext, onData) {
  const systemPrompt = `
You are a GitHub assistant helping users understand their GitHub activity.

Summarize the user's GitHub status in a friendly, natural tone. Highlight:
- Any PRs, issues, discussions, or mentions
- Repo activity grouped by project
- Suggestions or reminders (like pending reviews)

Avoid raw data. Sound like a helpful daily digest.
`.trim();

  await GeminiRes(githubContext, systemPrompt, onData);
}

module.exports = {
  GeminiRes,
  summarizeGithubContext,
};


