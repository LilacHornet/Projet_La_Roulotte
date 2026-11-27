import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const id = randomUUID();
  const start = Date.now();

  res.setHeader("X-Request-Id", id);

  res.on("finish", () => {
    console.log(`[${id}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start} ms)`);
  });

  next();
};