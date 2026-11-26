import { z } from "zod";

export const dishesQuerySchema = z.object({
  category: z.coerce.number().int().min(1).optional(),
  available: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  allergenFree: z.string().optional(),
  q: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type DishesQuery = z.infer<typeof dishesQuerySchema>;