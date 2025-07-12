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
You are a terminal-based Git assistant.

Instruction:
The user will describe a Git-related goal. You must respond in this format:

1. Summary (max 2 lines)
2. Clear step-by-step actions in bullet/numbered form
3. Then: list only the Git commands, one per line — without explanation
4. End with: "Do you want me to run these commands?"

DO NOT repeat or explain the commands again.

Now respond to this user input:
"${prompt.trim()}"

User's Git context:
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
        onData(text);
      }
    }

  } catch (err) {
    console.error('Gemini API Error:', err.message);
    throw err;
  }
}

module.exports = { GeminiRes };