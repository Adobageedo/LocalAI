import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//
// 1. Paths & Ensure directory
//
const logsDir = path.resolve(__dirname, '../../logs');
await fs.mkdir(logsDir, { recursive: true });

//
// 2. Environment config
//
const logLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
const logFile = process.env.LOG_FILE || path.join(logsDir, 'mcp-server.log');

//
// 3. Custom formats
//
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

//
// 4. Logger instance
//
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'mcp-pdp-generator' },
  transports: [
    new winston.transports.File({
      filename: logFile,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    // 👉 Add this transport for info.log
    new winston.transports.File({
      filename: path.join(logsDir, 'info.log'),
      level: 'info',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  ]});

//
// 5. Optional console transport (TTY only)
//
const isTty = process.stdout.isTTY === true;
const isMcpStdio = process.env.MCP_STDIO === '1';

if (process.env.NODE_ENV !== 'production' && isTty && !isMcpStdio) {
  logger.add(
    new winston.transports.Console({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const upper = level.toUpperCase();
          const coloredLevel = winston.format.colorize().colorize(level, upper);

          const base = `[${timestamp}] ${coloredLevel}: ${message}`;

          return stack
            ? `${base}\n${stack}`
            : Object.keys(meta).length
            ? `${base} ${JSON.stringify(meta)}`
            : base;
        })
      ),
    })
  );
}

export default logger;
