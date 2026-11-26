import { config } from "./config.js";
import { createAuth } from "./fourni/auth/index.js";
import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { HealthService } from "./modules/health/health.service.js";
import { UserRepository } from "./modules/users/user.repository.js";
import { PrismaOrderRepository } from "./modules/orders/order.repository.js";
import { OrderService } from "./modules/orders/order.service.js";
import { createOrderController } from "./modules/orders/order.controller.js";
import { createOrdersRouter } from "./modules/orders/order.routes.js";

const healthService = new HealthService();
const healthController = createHealthController(healthService);
const users = new UserRepository();

const auth = createAuth({
    users,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
});

const orderRepository = new PrismaOrderRepository();
const orderService = new OrderService(orderRepository);
const orderController = createOrderController(orderService);
const ordersRouter = createOrdersRouter(orderController, auth);

export const container = {
    auth,
    healthRouter: createHealthRouter(healthController),
    ordersRouter,
};