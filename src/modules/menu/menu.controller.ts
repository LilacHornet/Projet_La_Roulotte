import type { Request, Response } from "express";
import type { MenuService } from "./menu.service.js";
import { dishesQuerySchema, createDishSchema, updateDishSchema, idParamSchema } from "./menu.dto.js";

export class MenuController {
  constructor(private service: MenuService) {}

  listCategories = async (_req: Request, res: Response) => {
    res.json(await this.service.listCategories());
  };

  listAllergens = async (_req: Request, res: Response) => {
    res.json(await this.service.listAllergens());
  };

  listDishes = async (req: Request, res: Response) => {
    const parsed = dishesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Paramètres invalides",
          details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      });
      return;
    }
    res.json(await this.service.listDishes(parsed.data));
  };

  getDish = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Id invalide" } });
      return;
    }

    const dish = await this.service.getDish(id);
    if (!dish) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plat introuvable" } });
      return;
    }

    res.json(dish);
  };

  createDish = async (req: Request, res: Response) => {
    const input = createDishSchema.parse(req.body);
    const dish = await this.service.createDish(input);
    res.status(201).location(`/dishes/${dish.id}`).json(dish);
  };

  updateDish = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateDishSchema.parse(req.body);
    res.json(await this.service.updateDish(id, input));
  };

  deleteDish = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    await this.service.deleteDish(id);
    res.status(204).end();
  };

  uploadImage = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.service.setDishImage(id, req.file!.buffer));
  };

}