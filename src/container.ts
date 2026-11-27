import { config } from "./config.js";
import { createAuth } from "./fourni/auth/index.js";
import { prisma } from "./db/prisma.js";
import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { HealthService } from "./modules/health/health.service.js";
import { PrismaMenuRepository } from "./modules/menu/menu.repository.js";
import { MenuService } from "./modules/menu/menu.service.js";
import { MenuController } from "./modules/menu/menu.controller.js";
import { menuRoutes } from "./modules/menu/menu.routes.js";
import { UserRepository } from "./modules/users/user.repository.js";
import { PrismaOrderRepository } from "./modules/orders/order.repository.js";
import { OrderService } from "./modules/orders/order.service.js";
import { createOrderController } from "./modules/orders/order.controller.js";
import { createOrdersRouter } from "./modules/orders/order.routes.js";
import { CachedMenuRepository } from "./modules/menu/menu.cache.js";

const healthService = new HealthService();
const healthController = createHealthController(healthService);
const users = new UserRepository();

const auth = createAuth({
    users,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
});

const menuRepository = new CachedMenuRepository(new PrismaMenuRepository(prisma));
const menuService = new MenuService(menuRepository);
const menuController = new MenuController(menuService);
const orderRepository = new PrismaOrderRepository();
const orderService = new OrderService(orderRepository, menuRepository);
const orderController = createOrderController(orderService);
const ordersRouter = createOrdersRouter(orderController, auth);


export const container = {
    auth,
    healthRouter: createHealthRouter(healthController),
    menuRouter: menuRoutes(menuController, auth),
    ordersRouter,
    corsOrigin: config.corsOrigin,
};