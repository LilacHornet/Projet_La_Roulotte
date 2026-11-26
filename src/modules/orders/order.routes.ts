import { Router } from "express";
import type { Auth } from "../../fourni/auth/index.js";
import type { OrderController } from "./order.controller.js";

export function createOrdersRouter(
    controller: OrderController,
    auth: Auth,
) {
    const router = Router();

    router.post("/", auth.requireAuth, controller.create);

    return router;
}