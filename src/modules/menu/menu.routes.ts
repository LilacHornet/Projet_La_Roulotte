import { Router } from "express";
import type { Auth } from "../../fourni/auth/index.js";
import type { MenuController } from "./menu.controller.js";

export function menuRoutes(controller: MenuController, auth: Auth) {
  const router = Router();
  const adminOnly = [auth.requireAuth, auth.requireRole("ADMIN")];
  router.get("/categories", controller.listCategories);
  router.get("/allergens", controller.listAllergens);
  router.get("/dishes", controller.listDishes);
  router.get("/dishes/:id", controller.getDish);

  router.post("/dishes", adminOnly, controller.createDish);
  router.patch("/dishes/:id", adminOnly, controller.updateDish);
  router.delete("/dishes/:id", adminOnly, controller.deleteDish);

  return router;
}