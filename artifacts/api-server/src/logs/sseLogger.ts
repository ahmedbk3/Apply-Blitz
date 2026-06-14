import { Response } from "express";

export type LogLevel = "success" | "warn" | "error" | "info" | "skip";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
}

const MAX_ENTRIES = 500;
const logHistory: LogEntry[] = [];
const clients: Set<Response> = new Set();

export function addLog(level: LogLevel, message: string) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  logHistory.push(entry);
  if (logHistory.length > MAX_ENTRIES) {
    logHistory.shift();
  }
  broadcast(entry);
}

function broadcast(entry: LogEntry) {
  const data = `data: ${JSON.stringify({ type: "log", data: entry })}\n\n`;
  for (const client of clients) {
    try {
      client.write(data);
    } catch {
      clients.delete(client);
    }
  }
}

export function registerSseClient(res: Response) {
  clients.add(res);
  for (const entry of logHistory.slice(-50)) {
    try {
      res.write(`data: ${JSON.stringify({ type: "log", data: entry })}\n\n`);
    } catch {
      break;
    }
  }
  res.on("close", () => clients.delete(res));
}

export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

export const log = {
  info: (msg: string) => addLog("info", msg),
  success: (msg: string) => addLog("success", msg),
  warn: (msg: string) => addLog("warn", msg),
  error: (msg: string) => addLog("error", msg),
  skip: (msg: string) => addLog("skip", msg),
};
