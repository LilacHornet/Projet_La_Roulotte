import express from "express";
import {authErrorHandler,installSecurity,} from "./fourni/auth/index.js";
import { config } from "./config.js";
import { container } from "./container.js";
import { notFoundHandler } from "./errors/not-found.middleware.js";
import { errorHandler } from "./errors/error.middleware.js";

export function createApp() {
    const app = express();

    installSecurity(app, { corsOrigin: config.corsOrigin });

    app.use("/auth", container.auth.router);
    app.use("/health", container.healthRouter);

    app.use(container.menuRouter);

    app.use(notFoundHandler);
    app.use(authErrorHandler);
    app.use(errorHandler);

    return app;
}