// SPDX-License-Identifier: AGPL-3.0-only
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import aiRouter from './routes/ai';
import authRouter from './routes/auth';
import notebooksRouter from './routes/notebooks';
import notesRouter from './routes/notes';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust first proxy for correct req.ip and X-Forwarded-* headers
app.set('trust proxy', 1);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = process.env.FRONTEND_URL;
    if (allowed && (origin === allowed || origin === allowed.replace(/\/+$/, ''))) {
      return callback(null, true);
    }
    if (!allowed && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/notebooks', notebooksRouter);
app.use('/api/notes', notesRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files (Vite build output) for single-service deployment
const distPath = path.resolve(__dirname, '../../dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Catch-all JSON error handler
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`MathFlow CE server running on port ${PORT}`);
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    console.log(`Serving frontend from ${distPath}`);
  }
});

export default app;
