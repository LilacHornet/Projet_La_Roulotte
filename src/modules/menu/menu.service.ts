import type { MenuRepository } from "./menu.repository.js";

export class MenuService {
  constructor(private repo: MenuRepository) {}

  listCategories() {
    return this.repo.findCategories();
  }

  listAllergens() {
    return this.repo.findAllergens();
  }

}