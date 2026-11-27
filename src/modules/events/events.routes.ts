import { Router } from "express";
import { currentUser, type Auth } from "../../fourni/auth/index.js";
import type { EventBus } from "./event-bus.js";

export function createEventsRouter(bus: EventBus, auth: Auth) {
  const router = Router();

  router.get("/", auth.requireAuth, (req, res) => {
    const user = currentUser(req);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(": connecté\n\n");

    const unsubscribe = bus.subscribe({ userId: user.id, role: user.role, res });
    const ping = setInterval(() => res.write(": ping\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(ping);
      unsubscribe();
    });
  });

  return router;
}