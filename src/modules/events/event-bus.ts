import type { Response } from "express";
import type { Role } from "../../fourni/auth/index.js";

type Client = { userId: number; role: Role; res: Response };
export type OrderEventType = "order.created" | "order.updated";
type OrderPayload = { id: number; customer: { id: number } };

export class EventBus {
  private clients = new Set<Client>();

  subscribe(client: Client) {
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  publish(type: OrderEventType, order: OrderPayload) {
    const message = `event: ${type}\ndata: ${JSON.stringify(order)}\n\n`;

    for (const client of this.clients) {
      const isKitchen = client.role === "STAFF" || client.role === "ADMIN";
      const isOwner = client.userId === order.customer.id;
      const allowed = type === "order.created" ? isKitchen : isKitchen || isOwner;
      if (allowed) client.res.write(message);
    }
  }
}