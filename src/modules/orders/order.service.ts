import { z } from "zod";
import { AppError } from "../../errors/app-error.js";
import { toOrderDto } from "./order.dto.js";
import type { OrderRepository } from "./order.repository.js";

const orderSchema = z.strictObject({
    items: z.array(
        z.strictObject({
            dishId: z.number().int().min(1),
            quantity: z.number().int().min(1).max(10),
        }),
    ).min(1).max(20),
    note: z.string().max(200).optional(),
});

export class OrderService {
    constructor(private readonly orders: OrderRepository) {}

    async place(userId: number, body: unknown) {
        const parsed = orderSchema.safeParse(body);

        if (!parsed.success) {
            throw new AppError(
                400,
                "VALIDATION_ERROR",
                "Données invalides",
                parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            );
        }

        const input = parsed.data;
        const seen = new Set<number>();
        const hasDuplicateDish = input.items.some(({ dishId }) => {
            if (seen.has(dishId)) return true;
            seen.add(dishId);
            return false;
        });

        if (hasDuplicateDish) {
            throw new AppError(400, "VALIDATION_ERROR", "Données invalides", [
                { path: "items", message: "Un plat ne peut apparaître qu'une fois" },
            ]);
        }

        const dishes = await this.orders.findDishesByIds(
            input.items.map(({ dishId }) => dishId),
        );
        const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));

        const rejectedDishes = input.items.flatMap(({ dishId }) => {
            const dish = dishesById.get(dishId);
            if (!dish) return [{ dishId, reason: "NOT_FOUND" }];
            if (!dish.available) return [{ dishId, reason: "UNAVAILABLE" }];
            return [];
        });

        if (rejectedDishes.length > 0) {
            throw new AppError(
                422,
                "DISH_UNAVAILABLE",
                "Un ou plusieurs plats ne sont pas disponibles",
                rejectedDishes,
            );
        }

        const items = input.items.flatMap(({ dishId, quantity }) => {
            const dish = dishesById.get(dishId);
            return dish && dish.available
                ? [{ dishId, quantity, unitPriceCents: dish.priceCents }]
                : [];
        });

        const totalCents = items.reduce(
            (total, item) => total + item.unitPriceCents * item.quantity,
            0,
        );

        const order = await this.orders.create({
            userId,
            note: input.note ?? null,
            totalCents,
            items,
        });

        return toOrderDto(order);
    }
}