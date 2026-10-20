import type { Ingredient } from "./types";

export const INGREDIENTS: Ingredient[] = [
  { id: "tomato", emoji: "🍅", label: "Tomato" },
  { id: "onion", emoji: "🧅", label: "Onion" },
  { id: "carrot", emoji: "🥕", label: "Carrot" },
  { id: "potato", emoji: "🥔", label: "Potato" },
  { id: "chili", emoji: "🌶️", label: "Chili" },
  { id: "garlic", emoji: "🧄", label: "Garlic" },
  { id: "chicken", emoji: "🍗", label: "Chicken" },
  { id: "coconut", emoji: "🥥", label: "Coconut" },
];

export function ingredientsByIds(ids: string[]): Ingredient[] {
  const byId = new Map(INGREDIENTS.map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((i): i is Ingredient => Boolean(i));
}

export function ingredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find((i) => i.id === id);
}
