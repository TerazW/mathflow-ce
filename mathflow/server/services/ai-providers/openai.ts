const OPENAI_DEFAULT_MODEL = 'gpt-4o';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || OPENAI_DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error: any = new Error(`OpenAI API error: ${response.statusText}`);
    error.status = response.status;
    try {
      const body: any = await response.json();
      error.message = body.error?.message || response.statusText;
    } catch {}
    throw error;
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty or invalid response');
  }
  return content;
}
