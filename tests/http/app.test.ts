import { Router, type Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {  createAuth,  type AuthUserStore,  type StoredUser,} from "../../src/fourni/auth/index.js";
import { createHealthController } from "../../src/modules/health/health.controller.js";
import { createHealthRouter } from "../../src/modules/health/health.routes.js";
import { HealthService } from "../../src/modules/health/health.service.js";
import { createOrderController } from "../../src/modules/orders/order.controller.js";
import {  type DishForOrder,  type NewOrder,  type OrderRecord,  type OrderRepository,} from "../../src/modules/orders/order.repository.js";
import { createOrdersRouter } from "../../src/modules/orders/order.routes.js";
import { OrderService } from "../../src/modules/orders/order.service.js";
import { OrderStatus } from "../../src/generated/prisma/enums.js";
import { EventBus } from "../../src/modules/events/event-bus.js";
import { createEventsRouter } from "../../src/modules/events/events.routes.js";

function makeTestApp() {
  const users: StoredUser[] = [];

  const userStore: AuthUserStore = {
    async findByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async create(data) {
      const user: StoredUser = { id: users.length + 1, ...data };
      users.push(user);
      return user;
    },
  };

  const auth = createAuth({
    users: userStore,
    jwtSecret: "test-secret-with-more-than-16-characters",
  });

  const dishes: DishForOrder[] = [
    { id: 7, priceCents: 1150, available: true, stock: null },
  ];
  const orders: OrderRecord[] = [];

  const orderRepository: OrderRepository = {
    async findDishesByIds(ids) {
      return dishes.filter((dish) => ids.includes(dish.id));
    },
    async create(data: NewOrder) {
      const user = users.find((candidate) => candidate.id === data.userId);
      if (!user) {
        throw new Error("Utilisateur de test introuvable");
      }

      const now = new Date("2026-11-26T10:00:00.000Z");
      const order: OrderRecord = {
        id: orders.length + 1,
        status: "RECEIVED",
        note: data.note,
        totalCents: data.totalCents,
        createdAt: now,
        updatedAt: now,
        user: { id: user.id, name: user.name },
        items: data.items.map((item) => ({
          ...item,
          dish: { name: "Le Classique" },
        })),
      };

      orders.push(order);
      return order;
    },
    async list(filters) {
      const filtered = orders.filter(
        (order) => filters.userId === undefined || order.user.id === filters.userId
      );

      return {
        items: filtered.slice(filters.skip, filters.skip + filters.take),
        total: filtered.length,
      };
    },
    async findById(id) {
      return orders.find((order) => order.id === id) ?? null;
    },
    updateStatus: async function (id: number, expectedStatus: OrderStatus, newStatus: OrderStatus): Promise<OrderRecord | null> {
      const index = orders.findIndex(
        (order) => order.id === id && order.status === expectedStatus,
      );

      if (index === -1) {
        return null;
      }

      const order = orders[index];
      if (!order) {
        return null;
      }

      const updatedOrder: OrderRecord = {
        ...order,
        status: newStatus,
        updatedAt: new Date("2026-11-26T10:05:00.000Z"),
      };

      orders[index] = updatedOrder;
      return updatedOrder;
    }
  };

  const healthRouter = createHealthRouter(
    createHealthController(new HealthService(async () => {})),
  );
  const ordersRouter = createOrdersRouter(
    createOrderController(new OrderService(orderRepository)),
    auth,
  );

  return createApp({
    auth,
    healthRouter,
    menuRouter: Router(),
    ordersRouter,
    corsOrigin: "http://localhost:5173",
    eventsRouter: createEventsRouter(new EventBus(), auth),
  });
}

async function registerAndLogin(app: Express): Promise<string> {
  const credentials = {
    email: "client@test.local",
    name: "Client Test",
    password: "Client123!",
  };

  const registration = await request(app)
    .post("/auth/register")
    .send(credentials);
  expect(registration.status).toBe(201);

  const login = await request(app)
    .post("/auth/login")
    .send({ email: credentials.email, password: credentials.password });
  expect(login.status).toBe(200);

  if (typeof login.body.token !== "string") {
    throw new Error("Le endpoint de connexion n'a pas renvoyé de jeton");
  }

  return login.body.token;
}

describe("HTTP API", () => {
  it("expose le healthcheck publiquement", async () => {
    const app = makeTestApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "up" });
  });

  it("protège les commandes et traite une commande authentifiée", async () => {
    const app = makeTestApp();

    const anonymous = await request(app).get("/orders");
    expect(anonymous.status).toBe(401);

    const token = await registerAndLogin(app);
    const authorization = `Bearer ${token}`;

    const invalid = await request(app)
      .post("/orders")
      .set("Authorization", authorization)
      .send({ items: [{ dishId: 7, quantity: 1, unitPriceCents: 1 }] });
    expect(invalid.status).toBe(400);

    const created = await request(app)
      .post("/orders")
      .set("Authorization", authorization)
      .send({ items: [{ dishId: 7, quantity: 2 }] });

    expect(created.status).toBe(201);
    expect(created.headers.location).toBe("/orders/1");
    expect(created.body.totalCents).toBe(2300);

    const list = await request(app)
      .get("/orders")
      .set("Authorization", authorization);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);

    const missing = await request(app)
      .get("/orders/999")
      .set("Authorization", authorization);
    expect(missing.status).toBe(404);
  });

  it("permet au client d’annuler une commande reçue via l’API", async () => {
    const app = makeTestApp();
    const token = await registerAndLogin(app);
    const authorization = `Bearer ${token}`;

    const created = await request(app)
      .post("/orders")
      .set("Authorization", authorization)
      .send({ items: [{ dishId: 7, quantity: 1 }] });

    expect(created.status).toBe(201);

    const forbidden = await request(app)
      .patch("/orders/1/status")
      .set("Authorization", authorization)
      .send({ status: "PREPARING" });

    expect(forbidden.status).toBe(403);

    const cancelled = await request(app)
      .patch("/orders/1/status")
      .set("Authorization", authorization)
      .send({ status: "CANCELLED" });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    const repeated = await request(app)
      .patch("/orders/1/status")
      .set("Authorization", authorization)
      .send({ status: "CANCELLED" });

    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe("INVALID_TRANSITION");
  });
});