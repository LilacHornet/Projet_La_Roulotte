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

export type CategoryDto = {
  id: number;
  name: string;
  position: number;
};

type CategoryRecord = CategoryDto;

export function toCategoryDto(category: CategoryRecord): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    position: category.position,
  };
}

export type AllergenDto = {
  id: number;
  code: string;
  label: string;
};

type AllergenRecord = AllergenDto;

export function toAllergenDto(allergen: AllergenRecord): AllergenDto {
  return {
    id: allergen.id,
    code: allergen.code,
    label: allergen.label,
  };
}

export type DishDto = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  category: {
    id: number;
    name: string;
  };
  allergens: {
    code: string;
    label: string;
  }[];
};

type DishRecord = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  category: DishDto["category"];
  allergens: DishDto["allergens"];
};

export function toDishDto(dish: DishRecord): DishDto {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    priceCents: dish.priceCents,
    available: dish.available,
    category: {
      id: dish.category.id,
      name: dish.category.name,
    },
    allergens: dish.allergens.map(({ code, label }) => ({ code, label })),
  };
}