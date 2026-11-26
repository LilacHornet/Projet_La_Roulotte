import { Router } from "express";
import type { HealthController } from "./health.controller.js";

export function createHealthRouter(controller: HealthController) {
    const router = Router();
    router.get("/", controller.getHealth);
    return router;
}