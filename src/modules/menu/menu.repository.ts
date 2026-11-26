import type { Db } from "../../db/prisma.js";

export class MenuRepository {
  constructor(private db: Db) {}

  findCategories() {
    return this.db.category.findMany({ orderBy: { position: "asc" } });
  }

  findAllergens() {
    return this.db.allergen.findMany({ orderBy: { code: "asc" } });
  }
}