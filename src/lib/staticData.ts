export type Variant = { name: string; base: string; end: string; ink: string; surface: string; colors: string[] };
export type Theme = { id: number; slug: string; name: string; symbol: string; variants: Variant[]; backgrounds: string[] };
export type Suggestion = { id: number; label: string };
export type Collection = { id: number; category: string; name: string; mode: string; options: string[] };
export type ResultMessage = { id: number; message: string; animation: string };

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2200&q=85`;
const sixPhotos = (ids: string[]) => ids.map(photo);
const makeVariants = (name: string, base: string, end: string, ink: string, surface: string, colors: string[]) =>
  Array.from({ length: 6 }, (_, index) => ({ name: `${name} ${index + 1}`, base, end, ink, surface, colors }));

const photoSets = {
  sunroom: sixPhotos(['photo-1500534623283-312aade485b7', 'photo-1506744038136-46273834b3fb', 'photo-1500530855697-b586d89ba3ee', 'photo-1497250681960-ef046c08a56e', 'photo-1507525428034-b723cf961d3e', 'photo-1518837695005-2083093ee35b']),
  terra: sixPhotos(['photo-1515377905703-c4788e51af15', 'photo-1494438639946-1ebd1d20bf85', 'photo-1519710164239-da123dc03ef4', 'photo-1524758631624-e2822e304c36', 'photo-1497366811353-6870744d04b2', 'photo-1505693416388-ac5ce068fe85']),
  aurora: sixPhotos(['photo-1511497584788-876760111969', 'photo-1534088568595-a066f410bcda', 'photo-1500534314209-a25ddb2bd429', 'photo-1470770841072-f978cf4d019e', 'photo-1499346030926-9a72daac6c63', 'photo-1534447677768-be436bb09401']),
  forest: sixPhotos(['photo-1441974231531-c6227db76b6e', 'photo-1473448912268-2022ce9509d8', 'photo-1448375240586-882707db888b', 'photo-1511497584788-876760111969', 'photo-1469474968028-56623f02e42e', 'photo-1500534623283-312aade485b7']),
  citrus: sixPhotos(['photo-1490474418585-ba9bad8fd0ea', 'photo-1542838132-92c53300491e', 'photo-1601004890684-d8cbf643f5f2', 'photo-1557800636-894a64c1696f', 'photo-1512621776951-a57141f2eefd', 'photo-1498837167922-ddd27525d352']),
  lavender: sixPhotos(['photo-1499002238440-d264edd596ec', 'photo-1470509037663-253afd7f0f51', 'photo-1487070183336-b863922373d4', 'photo-1490750967868-88aa4486c946', 'photo-1518709268805-4e9042af9f23', 'photo-1509228468518-180dd4864904']),
  coral: sixPhotos(['photo-1490750967868-88aa4486c946', 'photo-1526047932273-341f2a7631f9', 'photo-1495231916356-a86217efff12', 'photo-1518709268805-4e9042af9f23', 'photo-1465146344425-f00d5f5c8f07', 'photo-1501004318641-b39e6451bec6']),
  midnight: sixPhotos(['photo-1519608487953-e999c86e7455', 'photo-1482192505345-5655af888cc4', 'photo-1472120435266-53107fd0c44a', 'photo-1500534623283-312aade485b7', 'photo-1519681393784-d120267933ba', 'photo-1534791547706-7b8f0f7f8c2f']),
  rose: sixPhotos(['photo-1518199266791-5375a83190b7', 'photo-1495231916356-a86217efff12', 'photo-1523438885200-e635ba2c371e', 'photo-1501004318641-b39e6451bec6', 'photo-1455582916367-25f75bfc2e2b', 'photo-1518709268805-4e9042af9f23']),
  dusk: sixPhotos(['photo-1500530855697-b586d89ba3ee', 'photo-1500534623283-312aade485b7', 'photo-1499346030926-9a72daac6c63', 'photo-1470252649378-9c29740c9fa8', 'photo-1497435334941-8c899ee9e8e9', 'photo-1470770841072-f978cf4d019e']),
};

const themeSeeds = [
  ['sunroom', 'Sunroom', '☀', '#fff1bf', '#d66c58', '#172622', '#fffaf0', ['#f5bd63', '#ef886b', '#78b8a7', '#e7d38d']],
  ['terra', 'Terra', '◒', '#f5c1a7', '#713f4f', '#352523', '#fff7f0', ['#c96954', '#e2a06f', '#8f5960', '#e4c18e']],
  ['aurora', 'Aurora', '✦', '#d8f3ff', '#6a7cff', '#172935', '#f4fbff', ['#8ed8ff', '#7f9cff', '#90d9c9', '#f7d98d']],
  ['forest', 'Forest', '❋', '#dcefd9', '#2d5a4d', '#172820', '#f0faf1', ['#99c9a5', '#6aa77b', '#3b7d62', '#d9ec80']],
  ['citrus', 'Citrus', '◉', '#fff2bf', '#ef8b3d', '#2b1d10', '#fffaf1', ['#f6cf5f', '#f9a14d', '#f07d4e', '#95d9b3']],
  ['lavender', 'Lavender', '✧', '#f0dfff', '#7257d2', '#201836', '#f9f4ff', ['#c9b4f8', '#9a84f0', '#8cc9d9', '#ffcfb1']],
  ['coral', 'Coral', '☼', '#ffdcd0', '#d65d6d', '#2d1b1d', '#fff6f2', ['#ffb19a', '#ff7b7b', '#ef9fd6', '#ffd97d']],
  ['midnight', 'Midnight', '✹', '#111a2a', '#2f4d78', '#edf5ff', '#121d2f', ['#4a7de0', '#86baf6', '#4cc9b0', '#b7d2ff']],
  ['rose', 'Rose', '✿', '#ffdfe9', '#a64d7d', '#2c1821', '#fff6fb', ['#ff9db7', '#f28ca7', '#c28df2', '#ffd5a1']],
  ['dusk', 'Dusk', '✺', '#f7d6b2', '#5b457c', '#261c2e', '#fff5ec', ['#f3b87d', '#d78d8d', '#7f6be1', '#f7dba2']],
] as const;

export const themeCatalog: Theme[] = themeSeeds.map(([slug, name, symbol, base, end, ink, surface, colors], index) => ({
  id: index + 1,
  slug,
  name,
  symbol,
  variants: makeVariants(name, base, end, ink, surface, colors),
  backgrounds: photoSets[slug as keyof typeof photoSets],
}));

export const suggestionCatalog: Suggestion[] = ['Coffee', 'Tea', 'Take a walk', 'Watch a movie', 'Cook dinner', 'Read', 'Call a friend', 'Stay home'].map((label, id) => ({ id: id + 1, label }));
export const optionCollections: Collection[] = [];
export const resultMessages: ResultMessage[] = [
  { id: 1, message: 'Trust your first instinct.', animation: 'jackpot' },
  { id: 2, message: 'That sounds like a plan.', animation: 'bounce' },
];

export const backgroundFor = (themeSlug: string, variantIndex: number, _appearance: 'light' | 'dark') => {
  const theme = themeCatalog.find((item) => item.slug === themeSlug) ?? themeCatalog[0];
  return theme.backgrounds[Math.abs(variantIndex) % theme.backgrounds.length];
};
