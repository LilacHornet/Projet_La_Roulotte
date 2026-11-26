import { config } from "./config.js";
import { createAuth } from "./fourni/auth/index.js";
import { prisma } from "./db/prisma.js";
import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { HealthService } from "./modules/health/health.service.js";
import { MenuRepository } from "./modules/menu/menu.repository.js";
import { MenuService } from "./modules/menu/menu.service.js";
import { MenuController } from "./modules/menu/menu.controller.js";
import { menuRoutes } from "./modules/menu/menu.routes.js";
import { UserRepository } from "./modules/users/user.repository.js";

const healthService = new HealthService();
const healthController = createHealthController(healthService);
const users = new UserRepository();

const auth = createAuth({
    users,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
});

const menuRepository = new MenuRepository(prisma);
const menuService = new MenuService(menuRepository);
const menuController = new MenuController(menuService);

export const container = {
    auth,
    healthRouter: createHealthRouter(healthController),
    menuRouter: menuRoutes(menuController, auth),
};