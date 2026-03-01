const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || ANTHROPIC_DEFAULT_MODEL,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error: any = new Error(`Anthropic API error: ${response.statusText}`);
    error.status = response.status;
    try {
      const body: any = await response.json();
      error.message = body.error?.message || response.statusText;
    } catch {}
    throw error;
  }

  const data: any = await response.json();
  if (!data.content || !Array.isArray(data.content)) {
    throw new Error('Anthropic returned an empty or invalid response');
  }
  const text = data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('');
  if (!text) {
    throw new Error('Anthropic returned an empty response');
  }
  return text;
}
