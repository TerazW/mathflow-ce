const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> {
  const modelId = model || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/${modelId}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!response.ok) {
    const error: any = new Error(`Gemini API error: ${response.statusText}`);
    error.status = response.status;
    try {
      const body: any = await response.json();
      error.message = body.error?.message || response.statusText;
    } catch {}
    throw error;
  }

  const data: any = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts || !Array.isArray(parts)) {
    throw new Error('Gemini returned an empty or invalid response');
  }
  const text = parts.map((part: any) => part.text).join('');
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}
