import type { Db } from "../../db/prisma.js";
import type { DishesQuery, CreateDishInput, UpdateDishInput } from "./menu.dto.js";

export type MenuCategoryRecord = { id: number; name: string; position: number };
export type MenuAllergenRecord = { id: number; code: string; label: string };

export type MenuDishRecord = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  stock: number | null;
  imageUrl: string | null;
  category: { id: number; name: string };
  allergens: { code: string; label: string }[];
};

export interface MenuRepository {
  findCategories(): Promise<MenuCategoryRecord[]>;
  findAllergens(): Promise<MenuAllergenRecord[]>;
  findDishById(id: number): Promise<MenuDishRecord | null>;
  findDishes(query: DishesQuery): Promise<[MenuDishRecord[], number]>;
  
  findDishByName(name: string): Promise<{ id: number; name: string } | null>;
  findCategoryById(id: number): Promise<MenuCategoryRecord | null>;
  findAllergensByCodes(codes: string[]): Promise<MenuAllergenRecord[]>;
  countOrdersForDish(dishId: number): Promise<number>;

  createDish(data: CreateDishInput): Promise<MenuDishRecord>;
  updateDish(id: number, data: UpdateDishInput): Promise<MenuDishRecord>;
  deleteDish(id: number): Promise<unknown>;
  updateDishImage(id: number, imageUrl: string): Promise<MenuDishRecord>;
}

export class PrismaMenuRepository implements MenuRepository {
  constructor(private db: Db) {}

  findCategories() {
    return this.db.category.findMany({ orderBy: { position: "asc" } });
  }

  findAllergens() {
    return this.db.allergen.findMany({ orderBy: { code: "asc" } });
  }

  findDishById(id: number) {
    return this.db.dish.findUnique({ where: { id }, include: { category: true, allergens: true } });
  }

  findDishes(query: DishesQuery) {
    const codes = query.allergenFree?.split(",").map((code) => code.trim()).filter(Boolean) ?? [];

    const where = {
      categoryId: query.category,
      available: query.available,
      name: query.q ? { contains: query.q } : undefined,
      allergens: codes.length ? { none: { code: { in: codes } } } : undefined,
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

  findDishByName(name: string) {
    return this.db.dish.findUnique({ where: { name } });
  }

  findCategoryById(id: number) {
    return this.db.category.findUnique({ where: { id } });
  }

  findAllergensByCodes(codes: string[]) {
    return this.db.allergen.findMany({ where: { code: { in: codes } } });
  }

  countOrdersForDish(dishId: number) {
    return this.db.orderItem.count({ where: { dishId } });
  }

  createDish(data: CreateDishInput) {
    const { categoryId, allergens, ...rest } = data;
    return this.db.dish.create({
      data: {
        ...rest,
        category: { connect: { id: categoryId } },
        allergens: { connect: allergens.map((code) => ({ code })) },
      },
      include: { category: true, allergens: true },
    });
  }

  updateDish(id: number, data: UpdateDishInput) {
    const { categoryId, allergens, ...rest } = data;
    return this.db.dish.update({
      where: { id },
      data: {
        ...rest,
        category: categoryId !== undefined ? { connect: { id: categoryId } } : undefined,
        allergens: allergens ? { set: allergens.map((code) => ({ code })) } : undefined,
      },
      include: { category: true, allergens: true },
    });
  }

  deleteDish(id: number) {
    return this.db.dish.delete({ where: { id } });
  }

  updateDishImage(id: number, imageUrl: string) {
    return this.db.dish.update({
      where: { id },
      data: { imageUrl },
      include: { category: true, allergens: true },
    });
  }
}