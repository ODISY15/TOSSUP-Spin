export type Variant = { name: string; base: string; end: string; ink: string; surface: string; colors: string[] };
export type Theme = { id: number; slug: string; name: string; symbol: string; variants: Variant[] };
export type Suggestion = { id: number; label: string };
export type Collection = { id: number; category: string; name: string; mode: string; options: string[] };
export type ResultMessage = { id: number; message: string; animation: string };

const makeVariants = (name: string, base: string, end: string, ink: string, surface: string, colors: string[]) =>
  Array.from({ length: 6 }, (_, index) => ({ name: `${name} ${index + 1}`, base, end, ink, surface, colors }));

export const themeCatalog: Theme[] = [
  { id: 1, slug: 'sunroom', name: 'Sunroom', symbol: '☀', variants: makeVariants('Sunroom', '#fff1bf', '#d66c58', '#172622', '#fffaf0', ['#f5bd63', '#ef886b', '#78b8a7', '#e7d38d']) },
  { id: 2, slug: 'terra', name: 'Terra', symbol: '◒', variants: makeVariants('Terra', '#f5c1a7', '#713f4f', '#352523', '#fff7f0', ['#c96954', '#e2a06f', '#8f5960', '#e4c18e']) },
];

export const suggestionCatalog: Suggestion[] = ['Coffee', 'Tea', 'Take a walk', 'Watch a movie', 'Cook dinner', 'Read', 'Call a friend', 'Stay home'].map((label, id) => ({ id: id + 1, label }));
export const optionCollections: Collection[] = [
  { id: 1, category: 'Everyday', name: 'Weekend plans', mode: 'random', options: ['Go out', 'Stay in', 'Try something new', 'Relax'] },
  { id: 2, category: 'Food', name: 'Dinner ideas', mode: 'random', options: ['Pizza', 'Tacos', 'Pasta', 'Stir-fry', 'Salad'] },
];
export const resultMessages: ResultMessage[] = [
  { id: 1, message: 'Trust your first instinct.', animation: 'jackpot' },
  { id: 2, message: 'That sounds like a plan.', animation: 'bounce' },
];

export const backgroundFor = (themeSlug: string, variantIndex: number, _appearance: 'light' | 'dark') => {
  const prefix = themeSlug === 'terra' ? 'terra' : 'sunroom';
  return `/backgrounds/${prefix}-${String((Math.abs(variantIndex) % 6) + 1).padStart(2, '0')}.svg`;
};
