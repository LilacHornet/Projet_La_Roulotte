import express from "express";
import { container } from "./container.js";
import { notFoundHandler } from "./errors/not-found.middleware.js";

export function createApp() {
    const app = express();

    app.use("/health", container.healthRouter);

    app.use(notFoundHandler);

    return app;
}