import { Router } from "express";
import type { MenuController } from "./menu.controller.js";

export function menuRoutes(controller: MenuController) {
  const router = Router();
  router.get("/categories", controller.listCategories);
  router.get("/allergens", controller.listAllergens);
  return router;
}