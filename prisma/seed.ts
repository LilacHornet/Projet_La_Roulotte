import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/fourni/auth/index.js";

type Menu = {
  categories: { name: string; position: number }[];
  allergens: { code: string; label: string }[];
  dishes: {
    name: string;
    description: string;
    priceCents: number;
    category: string;
    allergens: string[];
    available: boolean;
    stock: number | null;
  }[];
  users: { email: string; name: string; password: string; role: "CUSTOMER" | "STAFF" | "ADMIN" }[];
};

const menu: Menu = JSON.parse(
  readFileSync(new URL("../donnees/menu.json", import.meta.url), "utf-8"),
);

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.category.deleteMany();
  await prisma.allergen.deleteMany();
  await prisma.user.deleteMany();

  await prisma.category.createMany({ data: menu.categories });
  await prisma.allergen.createMany({ data: menu.allergens });

  for (const d of menu.dishes) {
    await prisma.dish.create({
      data: {
        name: d.name,
        description: d.description,
        priceCents: d.priceCents,
        available: d.available,
        stock: d.stock,
        category: { connect: { name: d.category } },
        allergens: { connect: d.allergens.map((code) => ({ code })) },
      },
    });
  }

  for (const u of menu.users) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: await hashPassword(u.password),
      },
    });
  }

  console.log(
    `Seed OK : ${menu.categories.length} catégories, ${menu.allergens.length} allergènes, ` +
      `${menu.dishes.length} plats, ${menu.users.length} comptes`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());