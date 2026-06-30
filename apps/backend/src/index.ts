import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import uploadRoutes from './routes/upload.routes';
import jobsRoutes from './routes/jobs.routes';
import streamRoutes from './routes/stream.routes';
import reportRoutes from './routes/report.routes';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import analyticsRoutes from './routes/analytics.routes';
import cookieParser from 'cookie-parser';
import { worker } from './queue/jobQueue'; // Start BullMQ worker

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const allowedOrigins = [
      env.FRONTEND_URL?.replace(/\/$/, ''),
      'http://localhost:3000',
    ].filter(Boolean) as string[];
    
    const isAllowed = 
      allowedOrigins.includes(origin) || 
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:') ||
      origin.endsWith('.vercel.app');
      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// ─── Observability ────────────────────────────────────────────────────────────

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' ? 99999 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
  skip: () => env.NODE_ENV === 'development',
});

const jobCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: env.NODE_ENV === 'development' ? 99999 : env.JOB_RATE_LIMIT_MAX,
  message: { success: false, error: 'Job creation limit reached. Max 10 jobs per hour.' },
  skip: () => env.NODE_ENV === 'development',
});

app.use('/api/v1/', apiLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/jobs', jobCreationLimiter, jobsRoutes);
app.use('/api/v1/stream', streamRoutes);
app.use('/api/v1/report', reportRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[express] Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`🚀 StartupAI Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
