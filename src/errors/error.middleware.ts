import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details === undefined ? {} : { details: err.details }),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } });
};