import { createHealthController } from "./modules/health/health.controller.ts";
import { createHealthRouter } from "./modules/health/health.routes.ts";
import { HealthService } from "./modules/health/health.service.ts";

const healthService = new HealthService();
const healthController = createHealthController(healthService);

export const container = {
    healthRouter: createHealthRouter(healthController),
};