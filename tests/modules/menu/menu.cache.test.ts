import { describe, it, expect, vi } from "vitest";
import { CachedMenuRepository } from "../../../src/modules/menu/menu.cache.js";
import type { MenuRepository } from "../../../src/modules/menu/menu.repository.js";

function fakeRepository() {
  return {
    findCategories: vi.fn(async () => [{ id: 1, name: "Burgers", position: 1 }]),
    findDishById: vi.fn(async (id: number) => ({ id, name: "Frites maison", priceCents: 350 })),
    findDishByName: vi.fn(async () => null),
    updateDish: vi.fn(async (id: number) => ({ id, name: "Frites maison", priceCents: 400 })),
  };
}

function setup() {
  const inner = fakeRepository();
  const cache = new CachedMenuRepository(inner as unknown as MenuRepository);
  return { inner, cache };
}

describe("CachedMenuRepository (Decorator)", () => {
  it("renvoie la même chose que le vrai repository", async () => {
    const { cache } = setup();
    expect(await cache.findCategories()).toEqual([{ id: 1, name: "Burgers", position: 1 }]);
  });

  it("ne va en base qu'une seule fois pour la même lecture", async () => {
    const { inner, cache } = setup();
    await cache.findCategories();
    await cache.findCategories();
    expect(inner.findCategories).toHaveBeenCalledTimes(1);
  });

  it("garde une entrée différente par plat", async () => {
    const { inner, cache } = setup();
    await cache.findDishById(1);
    await cache.findDishById(2);
    expect(inner.findDishById).toHaveBeenCalledTimes(2);
  });

  it("vide le cache après une écriture (pas de données périmées)", async () => {
    const { inner, cache } = setup();
    await cache.findDishById(1);
    await cache.updateDish(1, { priceCents: 400 });
    await cache.findDishById(1);
    expect(inner.findDishById).toHaveBeenCalledTimes(2);
  });

  it("invalidate() vide le cache (utilisé par les commandes)", async () => {
    const { inner, cache } = setup();
    await cache.findCategories();
    cache.invalidate();
    await cache.findCategories();
    expect(inner.findCategories).toHaveBeenCalledTimes(2);
  });

  it("ne met jamais les vérifications en cache", async () => {
    const { inner, cache } = setup();
    await cache.findDishByName("Brownie");
    await cache.findDishByName("Brownie");
    expect(inner.findDishByName).toHaveBeenCalledTimes(2);
  });
});