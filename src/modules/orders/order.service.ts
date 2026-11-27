import { z } from "zod";
import { AppError } from "../../errors/app-error.js";
import { toOrderDto, updateOrderStatusSchema } from "./order.dto.js";
import type { OrderRepository } from "./order.repository.js";
import type { AuthUser } from "../../fourni/auth/index.js";
import type { OrderStatus } from "../../generated/prisma/enums.js";

const orderSchema = z.strictObject({
    items: z.array(
        z.strictObject({
            dishId: z.number().int().min(1),
            quantity: z.number().int().min(1).max(10),
        }),
    ).min(1).max(20),
    note: z.string().max(200).optional(),
});

const statusSchema = z.enum([
    "RECEIVED",
    "PREPARING",
    "READY",
    "PICKED_UP",
    "CANCELLED",
]);

const listOrdersQuerySchema = z.strictObject({
    status: z.string().optional(),
    sort: z.enum(["createdAt", "-createdAt"]).default("-createdAt"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const orderIdSchema = z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine(Number.isSafeInteger);

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
    RECEIVED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: [],
    CANCELLED: [],
};

export class OrderService {
    constructor(
        private readonly orders: OrderRepository,
        private readonly menuCache: { invalidate(): void } = { invalidate() {} },
    ) {}

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

        const outOfStock = input.items.flatMap(({ dishId, quantity }) => {
            const dish = dishesById.get(dishId);

            return dish && dish.stock !== null && quantity > dish.stock
                ? [{ dishId, available: dish.stock }]
                : [];
        });

        if (outOfStock.length > 0) {
            throw new AppError(
                409,
                "OUT_OF_STOCK",
                "Stock insuffisant",
                outOfStock,
            );
        }

        const order = await this.orders.create({
            userId,
            note: input.note ?? null,
            totalCents,
            items,
        });

        this.menuCache.invalidate();

        return toOrderDto(order);
    }

    async list(user: AuthUser, rawQuery: unknown) {
        const parsed = listOrdersQuerySchema.safeParse(rawQuery);

        if (!parsed.success) {
            throw new AppError(
                400,
                "VALIDATION_ERROR",
                "Paramètres invalides",
                parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            );
        }

        const query = parsed.data;
        const rawStatuses = query.status
            ? query.status.split(",").map((status) => status.trim())
            : undefined;

        let statuses: OrderStatus[] | undefined;

        if (rawStatuses?.length) {
            const parsedStatuses = z.array(statusSchema).safeParse(rawStatuses);

            if (!parsedStatuses.success) {
                throw new AppError(
                    400,
                    "VALIDATION_ERROR",
                    "Statut de commande invalide",
                    parsedStatuses.error.issues.map((issue) => ({
                        path: "status",
                        message: issue.message,
                    })),
                );
            }

            statuses = parsedStatuses.data;
        }

        const { items, total } = await this.orders.list({
            userId: user.role === "CUSTOMER" ? user.id : undefined,
            statuses,
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            sort: query.sort === "createdAt" ? "asc" : "desc",
        });

        return {
            items: items.map(toOrderDto),
            total,
            page: query.page,
            pageSize: query.pageSize,
        };
    }

    async getById(user: AuthUser, rawId: unknown) {
        const parsedId = orderIdSchema.safeParse(rawId);

        if (!parsedId.success) {
            throw new AppError(400, "VALIDATION_ERROR", "Identifiant invalide", [
                { path: "id", message: "L'identifiant doit être un entier positif" },
            ]);
        }

        const order = await this.orders.findById(parsedId.data);

        if (!order || (user.role === "CUSTOMER" && order.user.id !== user.id)) {
            throw new AppError(404, "NOT_FOUND", "Commande introuvable");
        }

        return toOrderDto(order);
    }

    async updateStatus(user: AuthUser, rawId: unknown, rawBody: unknown) {
        const parsedId = orderIdSchema.safeParse(rawId);

        if (!parsedId.success) {
            throw new AppError(400, "VALIDATION_ERROR", "Identifiant invalide", [
                { path: "id", message: "L'identifiant doit être un entier positif" },
            ]);
        }

        const parsedBody = updateOrderStatusSchema.safeParse(rawBody);

        if (!parsedBody.success) {
            throw new AppError(
                400,
                "VALIDATION_ERROR",
                "Données invalides",
                parsedBody.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            );
        }

        const order = await this.orders.findById(parsedId.data);

        if (!order) {
            throw new AppError(404, "NOT_FOUND", "Commande introuvable");
        }

        if (user.role === "CUSTOMER" && order.user.id !== user.id) {
            throw new AppError(404, "NOT_FOUND", "Commande introuvable");
        }

        const newStatus = parsedBody.data.status;

        if (user.role === "CUSTOMER") {
            if (newStatus !== "CANCELLED") {
                throw new AppError(403, "FORBIDDEN", "Un client peut seulement annuler sa commande");
            }

            if (order.status !== "RECEIVED") {
                throw new AppError(
                    409,
                    "INVALID_TRANSITION",
                    "Transition de statut interdite",
                );
            }
        }

        if (!allowedTransitions[order.status].includes(newStatus)) {
            throw new AppError(409, "INVALID_TRANSITION", "Transition de statut interdite");
        }

        const updatedOrder = await this.orders.updateStatus(
            order.id,
            order.status,
            newStatus,
        );

        if (!updatedOrder) {
            const currentOrder = await this.orders.findById(order.id);

            if (!currentOrder) {
                throw new AppError(404, "NOT_FOUND", "Commande introuvable");
            }

            throw new AppError(409, "INVALID_TRANSITION", "La commande a déjà changé de statut");
        }

        return toOrderDto(updatedOrder);
    }
}