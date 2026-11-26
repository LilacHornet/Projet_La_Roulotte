import { Router, type RequestHandler } from "express";
import { updateOrderStatusSchema } from "./order.dto.js";
import type { Auth } from "../../fourni/auth/index.js";
import type { OrderController } from "./order.controller.js";

export function createOrdersRouter(
    controller: OrderController,
    auth: Auth,
) {
    const router = Router();

    const requireRoleForStatus: RequestHandler = (req, res, next) => {
        const parsed = updateOrderStatusSchema.safeParse(req.body);

        if (!parsed.success || parsed.data.status === "CANCELLED") {
            next();
            return;
        }

        return auth.requireRole("STAFF", "ADMIN")(req, res, next);
    };

    router.post("/", auth.requireAuth, controller.create);
    router.get("/", auth.requireAuth, controller.list);
    router.patch(
        "/:id/status",
        auth.requireAuth,
        requireRoleForStatus,
        controller.updateStatus,
    );
    router.get("/:id", auth.requireAuth, controller.getById);

    return router;
}