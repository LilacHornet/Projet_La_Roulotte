import type { MenuRepository } from "./menu.repository.js";
import type { DishesQuery, CreateDishInput, UpdateDishInput } from "./menu.dto.js";

export class CachedMenuRepository implements MenuRepository {
  private cache = new Map<string, unknown>();

  constructor(private inner: MenuRepository) {}

  private async remember<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (this.cache.has(key)) return this.cache.get(key) as T;
    const value = await load();
    this.cache.set(key, value);
    return value;
  }

  invalidate() {
    this.cache.clear();
  }

  findCategories() {
    return this.remember("categories", () => this.inner.findCategories());
  }
  findAllergens() {
    return this.remember("allergens", () => this.inner.findAllergens());
  }
  findDishById(id: number) {
    return this.remember(`dish:${id}`, () => this.inner.findDishById(id));
  }
  findDishes(query: DishesQuery) {
    return this.remember(`dishes:${JSON.stringify(query)}`, () => this.inner.findDishes(query));
  }

  findDishByName(name: string) {
    return this.inner.findDishByName(name);
  }
  findCategoryById(id: number) {
    return this.inner.findCategoryById(id);
  }
  findAllergensByCodes(codes: string[]) {
    return this.inner.findAllergensByCodes(codes);
  }
  countOrdersForDish(dishId: number) {
    return this.inner.countOrdersForDish(dishId);
  }

  async createDish(data: CreateDishInput) {
    const dish = await this.inner.createDish(data);
    this.invalidate();
    return dish;
  }
  async updateDish(id: number, data: UpdateDishInput) {
    const dish = await this.inner.updateDish(id, data);
    this.invalidate();
    return dish;
  }
  async deleteDish(id: number) {
    const result = await this.inner.deleteDish(id);
    this.invalidate();
    return result;
  }
  async updateDishImage(id: number, imageUrl: string) {
    const dish = await this.inner.updateDishImage(id, imageUrl);
    this.invalidate();
    return dish;
  }
}