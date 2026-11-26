import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { HealthService } from "./modules/health/health.service.js";
import { prisma } from "./db/prisma.js";
import { MenuRepository } from "./modules/menu/menu.repository.js";
import { MenuService } from "./modules/menu/menu.service.js";
import { MenuController } from "./modules/menu/menu.controller.js";
import { menuRoutes } from "./modules/menu/menu.routes.js";

const healthService = new HealthService();
const healthController = createHealthController(healthService);

const menuRepository = new MenuRepository(prisma);
const menuService = new MenuService(menuRepository);
const menuController = new MenuController(menuService);

export const container = {
    healthRouter: createHealthRouter(healthController),
    menuRouter: menuRoutes(menuController),
};