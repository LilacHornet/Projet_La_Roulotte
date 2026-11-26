import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { HealthService } from "./modules/health/health.service.js";

const healthService = new HealthService();
const healthController = createHealthController(healthService);

export const container = {
    healthRouter: createHealthRouter(healthController),
};