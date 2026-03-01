import express from 'express';
import { callOpenAI, callAnthropic, callGemini } from '../services/ai-providers';
import { buildSystemPrompt, buildUserPrompt, buildComputeSystemPrompt, buildComputeUserPrompt, buildTikZSystemPrompt, buildTikZUserPrompt, buildExplainSystemPrompt, buildExplainUserPrompt } from '../services/ai-prompts';
import { aiRateLimit, validateAIRequest } from '../middleware/ai-security';

const router = express.Router();

router.post('/generate-latex', aiRateLimit, validateAIRequest, async (req, res) => {
  try {
    const { prompt, provider, apiKey, model, context } = req.body;

    if (!prompt || !provider || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!['openai', 'anthropic', 'gemini'].includes(provider)) {
      res.status(400).json({ error: 'Unsupported AI provider' });
      return;
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prompt, context);

    let latex: string;
    switch (provider) {
      case 'openai':
        latex = await callOpenAI(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'anthropic':
        latex = await callAnthropic(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'gemini':
        latex = await callGemini(apiKey, systemPrompt, userPrompt, model);
        break;
      default:
        res.status(400).json({ error: 'Unsupported provider' });
        return;
    }

    latex = cleanLatexOutput(latex);
    if (!latex.trim()) {
      res.status(400).json({ error: 'AI returned an empty response. Please try rephrasing your request.' });
      return;
    }
    res.json({ latex });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      res.status(401).json({ error: 'API Key is invalid or expired. Please check your settings.' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later (this is your API quota limit).' });
    } else if (error.status === 400) {
      res.status(400).json({ error: `AI service returned an error: ${error.message}` });
    } else {
      console.error('AI proxy error:', error.message);
      res.status(500).json({ error: 'Service temporarily unavailable. Please try again later.' });
    }
  }
});

router.post('/test-connection', aiRateLimit, validateAIRequest, async (req, res) => {
  const { provider, apiKey, model } = req.body;

  try {
    const systemPrompt = 'You are a test assistant. Respond with exactly: OK';
    const userPrompt = 'Respond with exactly: OK';

    switch (provider) {
      case 'openai':
        await callOpenAI(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'anthropic':
        await callAnthropic(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'gemini':
        await callGemini(apiKey, systemPrompt, userPrompt, model);
        break;
      default:
        res.status(400).json({ success: false, error: 'Unsupported provider' });
        return;
    }

    res.json({ success: true, message: 'Connection successful, model responded' });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.status === 401
        ? 'API Key is invalid'
        : `Connection failed: ${error.message}`,
    });
  }
});

// SymPy computation endpoint
router.post('/compute', aiRateLimit, validateAIRequest, async (req, res) => {
  try {
    const { expression, provider, apiKey, model } = req.body;

    if (!expression || !provider || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!['openai', 'anthropic', 'gemini'].includes(provider)) {
      res.status(400).json({ error: 'Unsupported AI provider' });
      return;
    }

    const systemPrompt = buildComputeSystemPrompt();
    const userPrompt = buildComputeUserPrompt(expression);

    let latex: string;
    switch (provider) {
      case 'openai':
        latex = await callOpenAI(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'anthropic':
        latex = await callAnthropic(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'gemini':
        latex = await callGemini(apiKey, systemPrompt, userPrompt, model);
        break;
      default:
        res.status(400).json({ error: 'Unsupported provider' });
        return;
    }

    latex = cleanLatexOutput(latex);
    if (!latex.trim()) {
      res.status(400).json({ error: 'Computation returned an empty result. Please try a different expression.' });
      return;
    }
    res.json({ latex });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      res.status(401).json({ error: 'API Key is invalid or expired.' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else {
      console.error('Compute error:', error.message);
      res.status(500).json({ error: 'Computation failed. Please try again.' });
    }
  }
});

// TikZ generation endpoint
router.post('/generate-tikz', aiRateLimit, validateAIRequest, async (req, res) => {
  try {
    const { description, provider, apiKey, model } = req.body;

    if (!description || !provider || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!['openai', 'anthropic', 'gemini'].includes(provider)) {
      res.status(400).json({ error: 'Unsupported AI provider' });
      return;
    }

    const systemPrompt = buildTikZSystemPrompt();
    const userPrompt = buildTikZUserPrompt(description);

    let tikzCode: string;
    switch (provider) {
      case 'openai':
        tikzCode = await callOpenAI(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'anthropic':
        tikzCode = await callAnthropic(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'gemini':
        tikzCode = await callGemini(apiKey, systemPrompt, userPrompt, model);
        break;
      default:
        res.status(400).json({ error: 'Unsupported provider' });
        return;
    }

    tikzCode = cleanTikZOutput(tikzCode);
    res.json({ tikzCode });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      res.status(401).json({ error: 'API Key is invalid or expired.' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else {
      console.error('TikZ generation error:', error.message);
      res.status(500).json({ error: 'TikZ generation failed. Please try again.' });
    }
  }
});

// Formula explanation endpoint
router.post('/explain', aiRateLimit, validateAIRequest, async (req, res) => {
  try {
    const { prompt, provider, apiKey, model } = req.body;

    if (!prompt || !provider || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!['openai', 'anthropic', 'gemini'].includes(provider)) {
      res.status(400).json({ error: 'Unsupported AI provider' });
      return;
    }

    const systemPrompt = buildExplainSystemPrompt();
    const userPrompt = buildExplainUserPrompt(prompt);

    let explanation: string;
    switch (provider) {
      case 'openai':
        explanation = await callOpenAI(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'anthropic':
        explanation = await callAnthropic(apiKey, systemPrompt, userPrompt, model);
        break;
      case 'gemini':
        explanation = await callGemini(apiKey, systemPrompt, userPrompt, model);
        break;
      default:
        res.status(400).json({ error: 'Unsupported provider' });
        return;
    }

    res.json({ explanation: explanation.trim() });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      res.status(401).json({ error: 'API Key is invalid or expired.' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else {
      console.error('Explain error:', error.message);
      res.status(500).json({ error: 'Explanation failed. Please try again.' });
    }
  }
});

function cleanTikZOutput(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code fences
  cleaned = cleaned.replace(/^```(?:latex|tex|tikz)?\n?/i, '');
  cleaned = cleaned.replace(/\n?```$/i, '');
  return cleaned.trim();
}

function cleanLatexOutput(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:latex|tex)?\n?/i, '');
  cleaned = cleaned.replace(/\n?```$/i, '');
  // Use non-greedy matching to avoid truncating content between multiple $$ delimiters
  cleaned = cleaned.replace(/^\$\$([\s\S]*?)\$\$$/m, '$1');
  cleaned = cleaned.replace(/^\$(.*?)\$$/m, '$1');
  cleaned = cleaned.replace(/^\\\[([\s\S]*?)\\\]$/m, '$1');
  return cleaned.trim();
}

export default router;
