import type { Db } from "../../db/prisma.js";
import type { DishesQuery } from "./menu.dto.js";

export type MenuCategoryRecord = {
  id: number;
  name: string;
  position: number;
};

export type MenuAllergenRecord = {
  id: number;
  code: string;
  label: string;
};

export type MenuDishRecord = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  category: {
    id: number;
    name: string;
  };
  allergens: {
    code: string;
    label: string;
  }[];
};

export interface MenuRepository {
  findCategories(): Promise<MenuCategoryRecord[]>;
  findAllergens(): Promise<MenuAllergenRecord[]>;
  findDishById(id: number): Promise<MenuDishRecord | null>;
  findDishes(query: DishesQuery): Promise<[MenuDishRecord[], number]>;
}

export class PrismaMenuRepository implements MenuRepository {
  constructor(private db: Db) {}

  findCategories() {
    return this.db.category.findMany({
      orderBy: { position: "asc" },
    });
  }

  findAllergens() {
    return this.db.allergen.findMany({
      orderBy: { code: "asc" },
    });
  }

  findDishById(id: number) {
    return this.db.dish.findUnique({
      where: { id },
      include: { category: true, allergens: true },
    });
  }

  findDishes(query: DishesQuery) {
    const codes =
      query.allergenFree?.split(",").map((code) => code.trim()).filter(Boolean) ?? [];

    const where = {
      categoryId: query.category,
      available: query.available,
      name: query.q ? { contains: query.q } : undefined,
      allergens: codes.length
        ? { none: { code: { in: codes } } }
        : undefined,
    };

    return this.db.$transaction([
      this.db.dish.findMany({
        where,
        include: { category: true, allergens: true },
        orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.dish.count({ where }),
    ]);
  }
}