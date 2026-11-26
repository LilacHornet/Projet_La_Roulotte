import type { ErrorRequestHandler } from "express";
import { AppError } from "./app-error.js";

export const errorHandler: ErrorRequestHandler = (
    err,
    _req,
    res,
    _next,
) => {
    console.error(err);

    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: {
                code: err.code,
                message: err.message,
                ...(err.details === undefined ? {} : { details: err.details }),
            },
        });
    }

    res.status(500).json({
        error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne",
        },
    });
};