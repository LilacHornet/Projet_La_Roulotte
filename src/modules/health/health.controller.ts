import type { RequestHandler } from "express";
import type { HealthService } from "./health.service.ts";

export type HealthController = {
    getHealth: RequestHandler;
};

export function createHealthController(service: HealthService): HealthController {
    return {
        getHealth: (_req, res) => {
            res.status(200).json(service.getStatus());
        },
    };
}