import express from "express";
import { container } from "./container.ts";

export function createApp() {
    const app = express();

    app.use("/health", container.healthRouter);

    return app;
}