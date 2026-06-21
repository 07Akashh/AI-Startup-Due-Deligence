import winston from 'winston';
import { env, isDev } from '../config/env';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// ─── Dev console format ───────────────────────────────────────────────────────

const devFormat = printf(({ level, message, timestamp: ts, stack, service, ...meta }: any) => {
  const metaStr = Object.keys(meta).length ? ` \x1b[90m${JSON.stringify(meta)}\x1b[0m` : '';
  return `${ts} [${level}] ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
});

// ─── Production JSON format ───────────────────────────────────────────────────

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ─── Logger ───────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'startupai-backend' },
  transports: [
    new winston.transports.Console({
      format: isDev
        ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat)
        : prodFormat,
    }),
  ],
});

// ─── Scoped child logger factory ─────────────────────────────────────────────

export function createLogger(context: string, meta?: Record<string, unknown>) {
  return logger.child({ context, ...meta });
}

// ─── Agent-scoped logger ─────────────────────────────────────────────────────

export function agentLogger(agentName: string, jobId: string) {
  return createLogger('agent', { agentName, jobId });
}

export default logger;
