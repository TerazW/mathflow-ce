// SPDX-License-Identifier: AGPL-3.0-only
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests, please try again later' },
});

export function validateAIRequest(req: Request, res: Response, next: NextFunction) {
  const { prompt, provider, apiKey } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'A valid prompt is required' });
    return;
  }

  if (!provider || typeof provider !== 'string') {
    res.status(400).json({ error: 'A valid provider is required' });
    return;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(400).json({ error: 'A valid API key is required' });
    return;
  }

  next();
}
