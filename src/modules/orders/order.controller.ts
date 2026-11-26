import type { RequestHandler } from "express";
import { currentUser } from "../../fourni/auth/index.js";
import type { OrderService } from "./order.service.js";

export type OrderController = {
    create: RequestHandler;
};

export function createOrderController(service: OrderService): OrderController {
    return {
        create: async (req, res) => {
            const user = currentUser(req);
            const order = await service.place(user.id, req.body);

            res.status(201)
                .location(`/orders/${order.id}`)
                .json(order);
        },
    };
}