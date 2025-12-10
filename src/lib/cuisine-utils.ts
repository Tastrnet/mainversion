export type NormalizedCuisines = string[] | undefined;

/**
 * Normalize cuisines from various database formats into a string array.
 * Supports JSON arrays, JSON strings, comma-separated strings, and objects.
 */
export const normalizeCuisines = (cuisinesData: any): NormalizedCuisines => {
  if (!cuisinesData) return undefined;

  if (Array.isArray(cuisinesData)) {
    const normalized = cuisinesData
      .map((cuisine) => {
        if (typeof cuisine === "string") return cuisine.trim();
        if (cuisine && typeof cuisine === "object" && "name" in cuisine) {
          return String(cuisine.name);
        }
        return cuisine != null ? String(cuisine) : "";
      })
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  if (typeof cuisinesData === "string") {
    try {
      const parsed = JSON.parse(cuisinesData);
      return normalizeCuisines(parsed);
    } catch {
      const normalized = cuisinesData
        .split(",")
        .map((cuisine) => cuisine.trim())
        .filter(Boolean);
      return normalized.length ? normalized : undefined;
    }
  }

  if (typeof cuisinesData === "object") {
    const values = Object.values(cuisinesData)
      .map((cuisine) => {
        if (typeof cuisine === "string") return cuisine.trim();
        if (cuisine && typeof cuisine === "object" && "name" in cuisine) {
          return String(cuisine.name);
        }
        return cuisine != null ? String(cuisine) : "";
      })
      .filter(Boolean);
    return values.length ? values : undefined;
  }

  return undefined;
};


