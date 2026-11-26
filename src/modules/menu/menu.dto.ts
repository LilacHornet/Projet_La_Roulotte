import { z } from "zod";

export const dishesQuerySchema = z.strictObject({
  category: z.coerce.number().int().min(1).optional(),
  available: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  allergenFree: z.string().optional(),
  q: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type DishesQuery = z.infer<typeof dishesQuerySchema>;

const dishFields = {
  name: z.string().trim().min(2).max(80),
  description: z.string().max(300),
  priceCents: z.number().int().min(50).max(10000),
  categoryId: z.number().int().positive(),
  allergens: z.array(z.string()),
  available: z.boolean(),
  stock: z.number().int().min(0).nullable(),
};

export const createDishSchema = z.strictObject({
  ...dishFields,
  description: dishFields.description.default(""),
  allergens: dishFields.allergens.default([]),
  available: dishFields.available.default(true),
  stock: dishFields.stock.default(null),
});

export const updateDishSchema = z
  .strictObject(dishFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "Au moins un champ à modifier" });

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreateDishInput = z.infer<typeof createDishSchema>;
export type UpdateDishInput = z.infer<typeof updateDishSchema>;

export type CategoryDto = { id: number; name: string; position: number };

export function toCategoryDto(category: CategoryDto): CategoryDto {
  return { id: category.id, name: category.name, position: category.position };
}

export type AllergenDto = { id: number; code: string; label: string };

export function toAllergenDto(allergen: AllergenDto): AllergenDto {
  return { id: allergen.id, code: allergen.code, label: allergen.label };
}

export type DishDto = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  stock: number | null;
  category: { id: number; name: string };
  allergens: { code: string; label: string }[];
};

type DishRecord = Omit<DishDto, "allergens"> & { allergens: { code: string; label: string }[] };

export function toDishDto(dish: DishRecord): DishDto {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    priceCents: dish.priceCents,
    available: dish.available,
    stock: dish.stock,
    category: { id: dish.category.id, name: dish.category.name },
    allergens: dish.allergens.map(({ code, label }) => ({ code, label })),
  };
}