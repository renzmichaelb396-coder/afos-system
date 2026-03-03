/**
 * lib/logger.ts
 *
 * Structured server-side logger for AFOS.
 *
 * Outputs JSON-formatted log lines in production for easy ingestion by
 * log aggregation services (Datadog, Logtail, Vercel Log Drains, etc.).
 * Uses human-readable format in development.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("[login]", { userId, ip });
 *   logger.error("[clients]", err, { userId });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === "production";

function serialize(level: LogLevel, message: string, meta?: LogMeta, err?: unknown): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  };

  if (err) {
    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: IS_PROD ? undefined : err.stack,
      };
      // Capture Prisma / Node error codes
      if ("code" in err) entry.error_code = (err as { code?: unknown }).code;
    } else {
      entry.error = String(err);
    }
  }

  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, metaOrErr?: LogMeta | unknown, meta?: LogMeta) {
  let resolvedMeta: LogMeta | undefined;
  let resolvedErr: unknown;

  // Overload: log(level, msg, err, meta) or log(level, msg, meta)
  if (metaOrErr instanceof Error || (metaOrErr && typeof metaOrErr === "object" && "message" in (metaOrErr as object))) {
    resolvedErr = metaOrErr;
    resolvedMeta = meta;
  } else {
    resolvedMeta = metaOrErr as LogMeta | undefined;
  }

  if (IS_PROD) {
    const line = serialize(level, message, resolvedMeta, resolvedErr);
    if (level === "error" || level === "warn") {
      console.error(line);
    } else {
      console.log(line);
    }
  } else {
    // Development: human-readable
    const prefix = `[${level.toUpperCase()}] ${message}`;
    if (resolvedErr) {
      console[level === "error" ? "error" : "log"](prefix, resolvedMeta ?? "", resolvedErr);
    } else {
      console[level === "error" ? "error" : "log"](prefix, resolvedMeta ?? "");
    }
  }
}

export const logger = {
  debug: (msg: string, meta?: LogMeta) => log("debug", msg, meta),
  info: (msg: string, meta?: LogMeta) => log("info", msg, meta),
  warn: (msg: string, meta?: LogMeta) => log("warn", msg, meta),
  error: (msg: string, err?: unknown, meta?: LogMeta) => log("error", msg, err, meta),
};

/**
 * Produce a safe, client-facing error message.
 * Never leaks internal details to the browser.
 */
export function safeErrorMessage(err: unknown, fallback = "An unexpected error occurred."): string {
  if (!IS_PROD && err instanceof Error) {
    return err.message;
  }
  return fallback;
}
