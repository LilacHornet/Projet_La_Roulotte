import type { MenuRepository } from "./menu.repository.js";
import {
  toAllergenDto,
  toCategoryDto,
  toDishDto,
  type DishesQuery,
} from "./menu.dto.js";

export class MenuService {
  constructor(private repo: MenuRepository) {}

  async listCategories() {
    return (await this.repo.findCategories()).map(toCategoryDto);
  }

  async listAllergens() {
    return (await this.repo.findAllergens()).map(toAllergenDto);
  }

  async getDish(id: number) {
    const dish = await this.repo.findDishById(id);
    return dish ? toDishDto(dish) : null;
  }

  async listDishes(query: DishesQuery) {
    const [items, total] = await this.repo.findDishes(query);
    return {
      items: items.map(toDishDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}