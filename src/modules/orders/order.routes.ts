import { Router } from "express";
import type { Auth } from "../../fourni/auth/index.js";
import type { OrderController } from "./order.controller.js";

export function createOrdersRouter(
    controller: OrderController,
    auth: Auth,
) {
    const router = Router();

    router.post("/", auth.requireAuth, controller.create);
    router.get("/", auth.requireAuth, controller.list);
    router.get("/:id", auth.requireAuth, controller.getById);

    return router;
}