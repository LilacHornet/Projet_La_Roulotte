import { prisma } from "../../db/prisma.js";

export type DishForOrder = {
    id: number;
    priceCents: number;
    available: boolean;
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
}

export class PrismaOrderRepository implements OrderRepository {
    findDishesByIds(ids: number[]): Promise<DishForOrder[]> {
        return prisma.dish.findMany({
            where: { id: { in: ids } },
            select: { id: true, priceCents: true, available: true },
        });
    }

    create(data: NewOrder): Promise<OrderRecord> {
        return prisma.order.create({
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
    }
}