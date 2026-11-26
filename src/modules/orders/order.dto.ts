import type { OrderRecord } from "./order.repository.js";
import { z } from "zod";

export const orderStatusSchema = z.enum([
  "RECEIVED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
]);

export const updateOrderStatusSchema = z.strictObject({
  status: orderStatusSchema,
});

export function toOrderDto(order: OrderRecord) {
  return {
    id: order.id,
    status: order.status,
    note: order.note,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: {
      id: order.user.id,
      name: order.user.name,
    },
    items: order.items.map((item) => ({
      dishId: item.dishId,
      name: item.dish.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.unitPriceCents * item.quantity,
    })),
  };
}