import type { Ingredient, IngredientGroup } from "@/types";

export interface GroupedIngredients {
  group: IngredientGroup | null;
  ingredients: Ingredient[];
}

export function groupIngredientsByGroup(
  ingredients: Ingredient[],
  groups: IngredientGroup[],
): GroupedIngredients[] {
  const buckets = new Map<number | null, Ingredient[]>();

  for (const ing of ingredients) {
    const key = ing.group_id ?? null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(ing);
    else buckets.set(key, [ing]);
  }

  const result: GroupedIngredients[] = [];

  // Named groups sorted alphabetically
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name, "es"));
  for (const group of sortedGroups) {
    const items = buckets.get(group.id);
    if (items?.length) result.push({ group, ingredients: items });
  }

  // Ungrouped last
  const ungrouped = buckets.get(null);
  if (ungrouped?.length) result.push({ group: null, ingredients: ungrouped });

  return result;
}
