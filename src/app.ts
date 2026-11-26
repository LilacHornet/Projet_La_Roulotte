import express, { type Router } from "express";
import {
  authErrorHandler,
  installSecurity,
  type Auth,
} from "./fourni/auth/index.js";
import { notFoundHandler } from "./errors/not-found.middleware.js";
import { errorHandler } from "./errors/error.middleware.js";

export type AppContainer = {
  auth: Auth;
  healthRouter: Router;
  menuRouter: Router;
  ordersRouter: Router;
  corsOrigin: string;
};

export function createApp(container: AppContainer) {
  const app = express();

  installSecurity(app, { corsOrigin: container.corsOrigin });

  app.use(
      "/uploads",
      express.static("uploads", {
        setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
      }),
    );

    app.use("/auth", container.auth.router);
    app.use("/health", container.healthRouter);
    app.use(container.menuRouter);
    app.use("/orders", container.ordersRouter);
    app.use(notFoundHandler);
    app.use(authErrorHandler);
    app.use(errorHandler);

    return app;
    }