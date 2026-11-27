import type { RequestHandler } from "express";
import type { HealthService } from "./health.service.js";

export type HealthController = {
    getHealth: RequestHandler;
};

export function createHealthController(service: HealthService): HealthController {
    return {
        getHealth: async (_req, res) => {
            const result = await service.getStatus();
            res.status(result.database === "up" ? 200 : 503).json(result);
        },
    };
}