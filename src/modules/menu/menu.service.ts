import type { MenuRepository } from "./menu.repository.js";
import { DishesQuery } from "./menu.dto.js";

export class MenuService {
  constructor(private repo: MenuRepository) {}

  listCategories() {
    return this.repo.findCategories();
  }

  listAllergens() {
    return this.repo.findAllergens();
  }

  getDish(id: number) {
    return this.repo.findDishById(id);
  }

  async listDishes(query: DishesQuery) {
    const [items, total] = await this.repo.findDishes(query);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

}