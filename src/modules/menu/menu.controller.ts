import type { Request, Response } from "express";
import type { MenuService } from "./menu.service.js";

export class MenuController {
  constructor(private service: MenuService) {}

  listCategories = async (_req: Request, res: Response) => {
    res.json(await this.service.listCategories());
  };
}