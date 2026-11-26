import { prisma } from "../../db/prisma.js";
import type { OrderStatus } from "../../generated/prisma/enums.js";
import { AppError } from "../../errors/app-error.js";

export type DishForOrder = {
    id: number;
    priceCents: number;
    available: boolean;
    stock: number | null;
};

export type OrderRecord = {
    id: number;
    status: "RECEIVED" | "PREPARING" | "READY" | "PICKED_UP" | "CANCELLED";
    note: string | null;
    totalCents: number;
    createdAt: Date;
    updatedAt: Date;
    user: { id: number; name: string };
    items: {
        dishId: number;
        quantity: number;
        unitPriceCents: number;
        dish: { name: string };
    }[];
};

export type NewOrder = {
    userId: number;
    note: string | null;
    totalCents: number;
    items: {
        dishId: number;
        quantity: number;
        unitPriceCents: number;
    }[];
};

export interface OrderRepository {
    findDishesByIds(ids: number[]): Promise<DishForOrder[]>;
    create(data: NewOrder): Promise<OrderRecord>;
    list(filters: {
        userId?: number;
        statuses?: OrderStatus[];
        skip: number;
        take: number;
        sort: "asc" | "desc";
    }): Promise<{ items: OrderRecord[]; total: number }>;
    findById(id: number): Promise<OrderRecord | null>;
    updateStatus(
        id: number,
        expectedStatus: OrderStatus,
        newStatus: OrderStatus,
    ): Promise<OrderRecord | null>;
}

export class PrismaOrderRepository implements OrderRepository {
    findDishesByIds(ids: number[]): Promise<DishForOrder[]> {
        return prisma.dish.findMany({
            where: { id: { in: ids } },
            select: { id: true, priceCents: true, available: true, stock: true },
        });
    }

    async create(data: NewOrder): Promise<OrderRecord> {
        return prisma.$transaction(async (tx) => {
            const dishes = await tx.dish.findMany({
                where: { id: { in: data.items.map((item) => item.dishId) } },
                select: { id: true, stock: true },
            });
            const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));

            const missingDishes = data.items.flatMap(({ dishId }) =>
                dishesById.has(dishId) ? [] : [{ dishId, reason: "NOT_FOUND" }],
            );

            if (missingDishes.length > 0) {
                throw new AppError(
                    422,
                    "DISH_UNAVAILABLE",
                    "Un ou plusieurs plats ne sont pas disponibles",
                    missingDishes,
                );
            }

            const outOfStock = data.items.flatMap(({ dishId, quantity }) => {
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

            for (const item of data.items) {
                const dish = dishesById.get(item.dishId);

                if (!dish || dish.stock === null) {
                    continue;
                }

                const result = await tx.dish.updateMany({
                    where: {
                        id: item.dishId,
                        stock: { gte: item.quantity },
                    },
                    data: {
                        stock: { decrement: item.quantity },
                    },
                });

                if (result.count === 0) {
                    const currentDish = await tx.dish.findUnique({
                        where: { id: item.dishId },
                        select: { stock: true },
                    });

                    if (currentDish?.stock === null) {
                        continue;
                    }

                    throw new AppError(
                        409,
                        "OUT_OF_STOCK",
                        "Stock insuffisant",
                        [{
                            dishId: item.dishId,
                            available: currentDish?.stock ?? 0,
                        }],
                    );
                }
            }

            return tx.order.create({
                data: {
                    status: "RECEIVED",
                    note: data.note,
                    totalCents: data.totalCents,
                    user: { connect: { id: data.userId } },
                    items: {
                        create: data.items.map((item) => ({
                            quantity: item.quantity,
                            unitPriceCents: item.unitPriceCents,
                            dish: { connect: { id: item.dishId } },
                        })),
                    },
                },
                include: {
                    user: { select: { id: true, name: true } },
                    items: {
                        include: { dish: { select: { name: true } } },
                    },
                },
            });
        });
    }

    async list(filters: {
        userId?: number;
        statuses?: OrderStatus[];
        skip: number;
        take: number;
        sort: "asc" | "desc";
    }): Promise<{ items: OrderRecord[]; total: number }> {
        const where = {
            ...(filters.userId === undefined ? {} : { userId: filters.userId }),
            ...(filters.statuses?.length
                ? { status: { in: filters.statuses } }
                : {}),
        };

        const [items, total] = await prisma.$transaction([
            prisma.order.findMany({
                where,
                skip: filters.skip,
                take: filters.take,
                orderBy: { createdAt: filters.sort },
                include: {
                    user: { select: { id: true, name: true } },
                    items: { include: { dish: { select: { name: true } } } },
                },
            }),
            prisma.order.count({ where }),
        ]);

        return { items, total };
    }

    findById(id: number): Promise<OrderRecord | null> {
        return prisma.order.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true } },
                items: {
                    include: { dish: { select: { name: true } } },
                },
            },
        });
    }

    async updateStatus(
        id: number,
        expectedStatus: OrderStatus,
        newStatus: OrderStatus,
    ): Promise<OrderRecord | null> {
        return prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findUnique({
                where: { id },
                select: {
                    items: {
                        select: {
                            dishId: true,
                            quantity: true,
                        },
                    },
                },
            });

            if (!currentOrder) {
                return null;
            }

            const result = await tx.order.updateMany({
                where: { id, status: expectedStatus },
                data: { status: newStatus },
            });

            if (result.count === 0) {
                return null;
            }

            if (newStatus === "CANCELLED") {
                for (const item of currentOrder.items) {
                    await tx.dish.updateMany({
                        where: {
                            id: item.dishId,
                            stock: { not: null },
                        },
                        data: {
                            stock: { increment: item.quantity },
                        },
                    });
                }
            }

            return tx.order.findUnique({
                where: { id },
                include: {
                    user: { select: { id: true, name: true } },
                    items: {
                        include: { dish: { select: { name: true } } },
                    },
                },
            });
        });
    }
}