import { CategoryData } from '../types';

/**
 * Sorts categories strictly by their configured 'order' (ascending),
 * with alphabetical fallback in Hindi.
 */
export const sortCategoriesByOrder = (cats: CategoryData[]): CategoryData[] => {
  if (!Array.isArray(cats)) return [];
  return [...cats].sort((a, b) => {
    const numA = typeof a.order === 'number' ? a.order : (a.order !== undefined && a.order !== null ? Number(a.order) : 9999);
    const numB = typeof b.order === 'number' ? b.order : (b.order !== undefined && b.order !== null ? Number(b.order) : 9999);
    const orderA = isNaN(numA) ? 9999 : numA;
    const orderB = isNaN(numB) ? 9999 : numB;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '', 'hi');
  });
};
