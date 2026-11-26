import type { MenuRepository } from "./menu.repository.js";
import {
  toAllergenDto,
  toCategoryDto,
  toDishDto,
  type DishesQuery,
  type CreateDishInput,
  type UpdateDishInput,
} from "./menu.dto.js";
import { AppError } from "../../errors/app-error.js";

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
    return { items: items.map(toDishDto), total, page: query.page, pageSize: query.pageSize };
  }

  async createDish(input: CreateDishInput) {
    if (await this.repo.findDishByName(input.name)) {
      throw new AppError(409, "CONFLICT", "Nom de plat déjà pris");
    }
    await this.checkReferences(input.categoryId, input.allergens);
    return toDishDto(await this.repo.createDish(input));
  }

  async updateDish(id: number, input: UpdateDishInput) {
    const dish = await this.repo.findDishById(id);
    if (!dish) throw new AppError(404, "NOT_FOUND", "Plat introuvable");

    if (input.name && input.name !== dish.name && (await this.repo.findDishByName(input.name))) {
      throw new AppError(409, "CONFLICT", "Nom de plat déjà pris");
    }
    await this.checkReferences(input.categoryId, input.allergens);
    return toDishDto(await this.repo.updateDish(id, input));
  }

  async deleteDish(id: number) {
    const dish = await this.repo.findDishById(id);
    if (!dish) throw new AppError(404, "NOT_FOUND", "Plat introuvable");

    if ((await this.repo.countOrdersForDish(id)) > 0) {
      throw new AppError(409, "CONFLICT", "Plat déjà commandé : rendez-le indisponible plutôt");
    }
    await this.repo.deleteDish(id);
  }

  private async checkReferences(categoryId?: number, codes?: string[]) {
    if (categoryId !== undefined && !(await this.repo.findCategoryById(categoryId))) {
      throw new AppError(422, "INVALID_REFERENCE", "Catégorie inconnue");
    }
    if (codes?.length) {
      const found = await this.repo.findAllergensByCodes(codes);
      if (found.length !== new Set(codes).size) {
        throw new AppError(422, "INVALID_REFERENCE", "Code allergène inconnu");
      }
    }
  }
}