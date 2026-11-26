import { describe, expect, it } from "vitest";
import { AppError } from "../../../src/errors/app-error.js";
import type { AuthUser } from "../../../src/fourni/auth/index.js";
import { OrderService } from "../../../src/modules/orders/order.service.js";
import type {
    DishForOrder,
    NewOrder,
    OrderRecord,
    OrderRepository,
} from "../../../src/modules/orders/order.repository.js";

type ListResult = Awaited<ReturnType<OrderRepository["list"]>>;

function makeOrderRecord(
    data: NewOrder,
    dishes: DishForOrder[],
    id: number,
): OrderRecord {
    return {
        id,
        status: "RECEIVED",
        note: data.note,
        totalCents: data.totalCents,
        createdAt: new Date("2026-11-26T10:00:00.000Z"),
        updatedAt: new Date("2026-11-26T10:00:00.000Z"),
        user: { id: data.userId, name: "Test Client" },
        items: data.items.map((item) => ({
            ...item,
            dish: {
                name: `Dish ${dishes.find((dish) => dish.id === item.dishId)?.id ?? item.dishId}`,
            },
        })),
    };
}

function makeOrderRecordForOwner(ownerId: number): OrderRecord {
    return {
        id: 21,
        status: "RECEIVED",
        note: null,
        totalCents: 2300,
        createdAt: new Date("2026-11-26T10:00:00.000Z"),
        updatedAt: new Date("2026-11-26T10:00:00.000Z"),
        user: { id: ownerId, name: "Test Client" },
        items: [
            {
                dishId: 7,
                quantity: 2,
                unitPriceCents: 1150,
                dish: { name: "Le Classique" },
            },
        ],
    };
}

function makeRepository(options: {
    dishes?: DishForOrder[];
    orderById?: OrderRecord | null;
    listResult?: ListResult;
} = {}) {
    const calls = {
        dishLookups: [] as number[][],
        createdOrders: [] as NewOrder[],
        listFilters: [] as Parameters<OrderRepository["list"]>[0][],
        foundIds: [] as number[],
    };

    const repository: OrderRepository = {
        async findDishesByIds(ids) {
            calls.dishLookups.push(ids);
            return options.dishes ?? [];
        },
        async create(data) {
            calls.createdOrders.push(data);
            return makeOrderRecord(data, options.dishes ?? [], calls.createdOrders.length);
        },
        async list(filters) {
            calls.listFilters.push(filters);
            return options.listResult ?? { items: [], total: 0 };
        },
        async findById(id) {
            calls.foundIds.push(id);
            return options.orderById ?? null;
        },
        async updateStatus(id, expectedStatus, newStatus) {
            const order = options.orderById;

            if (!order || order.id !== id || order.status !== expectedStatus) {
                return null;
            }

            const updatedOrder = {
                ...order,
                status: newStatus,
                updatedAt: new Date("2026-11-26T10:05:00.000Z"),
            };

            options.orderById = updatedOrder;
            return updatedOrder;
        },
    };

    return { repository, calls };
}

const customer: AuthUser = { id: 5, role: "CUSTOMER" };

describe("OrderService.place", () => {
    it("uses database prices and calculates line and order totals", async () => {
        const { repository, calls } = makeRepository({
            dishes: [
                { id: 7, priceCents: 1150, available: true },
                { id: 8, priceCents: 400, available: true },
            ],
        });
        const service = new OrderService(repository);

        const result = await service.place(5, {
            items: [
                { dishId: 7, quantity: 2 },
                { dishId: 8, quantity: 1 },
            ],
            note: "Sans oignons",
        });

        expect(calls.createdOrders).toEqual([{
            userId: 5,
            note: "Sans oignons",
            totalCents: 2700,
            items: [
                { dishId: 7, quantity: 2, unitPriceCents: 1150 },
                { dishId: 8, quantity: 1, unitPriceCents: 400 },
            ],
        }]);
        expect(result.items.map((item) => item.lineTotalCents)).toEqual([2300, 400]);
    });

    it("rejects unknown client-supplied prices and totals", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        await expect(service.place(5, {
            items: [{ dishId: 7, quantity: 1, unitPriceCents: 1 }],
            totalCents: 1,
        })).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        expect(calls.dishLookups).toHaveLength(0);
        expect(calls.createdOrders).toHaveLength(0);
    });

    it("rejects duplicate dish lines before querying the repository", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        await expect(service.place(5, {
            items: [
                { dishId: 7, quantity: 1 },
                { dishId: 7, quantity: 2 },
            ],
        })).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        expect(calls.dishLookups).toHaveLength(0);
        expect(calls.createdOrders).toHaveLength(0);
    });

    it("rejects invalid quantities", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        await expect(service.place(5, {
            items: [{ dishId: 7, quantity: 11 }],
        })).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        expect(calls.dishLookups).toHaveLength(0);
    });

    it("reports every missing or unavailable dish without creating an order", async () => {
        const { repository, calls } = makeRepository({
            dishes: [
                { id: 7, priceCents: 1150, available: false },
                { id: 8, priceCents: 400, available: false },
            ],
        });
        const service = new OrderService(repository);

        let thrown: unknown;
        try {
            await service.place(5, {
                items: [
                    { dishId: 7, quantity: 1 },
                    { dishId: 99, quantity: 1 },
                    { dishId: 8, quantity: 1 },
                ],
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(AppError);
        expect(thrown).toMatchObject({
            status: 422,
            code: "DISH_UNAVAILABLE",
            details: [
                { dishId: 7, reason: "UNAVAILABLE" },
                { dishId: 99, reason: "NOT_FOUND" },
                { dishId: 8, reason: "UNAVAILABLE" },
            ],
        });
        expect(calls.createdOrders).toHaveLength(0);
    });
});

describe("OrderService.list", () => {
    it("defaults pagination and restricts customers to their own orders", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        const result = await service.list(customer, {});

        expect(calls.listFilters).toEqual([{
            userId: 5,
            statuses: undefined,
            skip: 0,
            take: 20,
            sort: "desc",
        }]);
        expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    it("applies status, sort and pagination filters for staff", async () => {
        const { repository, calls } = makeRepository({
            listResult: { items: [], total: 12 },
        });
        const service = new OrderService(repository);

        const result = await service.list(
            { id: 6, role: "STAFF" },
            {
                status: "RECEIVED,READY",
                sort: "createdAt",
                page: "2",
                pageSize: "5",
            },
        );

        expect(calls.listFilters).toEqual([{
            userId: undefined,
            statuses: ["RECEIVED", "READY"],
            skip: 5,
            take: 5,
            sort: "asc",
        }]);
        expect(result).toEqual({ items: [], total: 12, page: 2, pageSize: 5 });
    });

    it("rejects unknown statuses and page sizes above 50", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        await expect(service.list(customer, { status: "UNKNOWN" }))
            .rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        await expect(service.list(customer, { pageSize: "51" }))
            .rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        expect(calls.listFilters).toHaveLength(0);
    });

    it("rejects unknown query parameters", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        await expect(service.list(customer, { unexpected: "value" }))
            .rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        expect(calls.listFilters).toHaveLength(0);
    });
});

describe("OrderService.getById", () => {
    it("returns the customer's own order", async () => {
        const { repository, calls } = makeRepository({
            orderById: makeOrderRecordForOwner(customer.id),
        });
        const service = new OrderService(repository);

        const result = await service.getById(customer, "21");

        expect(calls.foundIds).toEqual([21]);
        expect(result.customer).toEqual({ id: 5, name: "Test Client" });
        expect(result.items[0].lineTotalCents).toBe(2300);
    });

    it("returns 404 for another customer's order and for a missing order", async () => {
        const foreignOrder = makeOrderRecordForOwner(12);
        const foreign = makeRepository({ orderById: foreignOrder });
        const missing = makeRepository();

        await expect(new OrderService(foreign.repository).getById(customer, "21"))
            .rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
        await expect(new OrderService(missing.repository).getById(customer, "21"))
            .rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    });

    it("rejects invalid identifiers before querying the repository", async () => {
        const { repository, calls } = makeRepository();
        const service = new OrderService(repository);

        await expect(service.getById(customer, "not-an-id"))
            .rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

        expect(calls.foundIds).toHaveLength(0);
    });
});

