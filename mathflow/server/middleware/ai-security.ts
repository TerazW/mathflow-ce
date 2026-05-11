import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' },
  validate: { trustProxy: false },
});

export function validateAIRequest(req: Request, res: Response, next: NextFunction) {
  const { apiKey } = req.body;
  // The text field can be named prompt, expression, or description depending on the endpoint
  const textInput = req.body.prompt ?? req.body.expression ?? req.body.description;

  if (typeof textInput !== 'string' || textInput.length > 5000) {
    res.status(400).json({ error: 'Input too long (maximum 5000 characters)' });
    return;
  }

  if (typeof apiKey !== 'string' || apiKey.length > 200) {
    res.status(400).json({ error: 'API Key format is incorrect' });
    return;
  }

  next();
}
