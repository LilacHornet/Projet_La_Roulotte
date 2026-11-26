import { config } from "./config.js";
import { createAuth } from "./fourni/auth/index.js";
import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { HealthService } from "./modules/health/health.service.js";
import { UserRepository } from "./modules/users/user.repository.js";

const healthService = new HealthService();
const healthController = createHealthController(healthService);
const users = new UserRepository();

const auth = createAuth({
    users,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
});

export const container = {
    auth,
    healthRouter: createHealthRouter(healthController),
};