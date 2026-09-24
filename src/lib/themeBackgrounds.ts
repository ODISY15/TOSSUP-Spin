/**
 * Local, deterministic artwork for the theme scene carousel.
 * Keep these assets in /public/backgrounds so themes work without a third-party
 * image request or an additional Supabase table. Each theme gets six scenes.
 */
export const themeBackgrounds: Record<string, string[]> = {
  sunroom: [
    '/backgrounds/sunroom-01.svg', '/backgrounds/sunroom-02.svg', '/backgrounds/sunroom-03.svg',
    '/backgrounds/sunroom-04.svg', '/backgrounds/sunroom-05.svg', '/backgrounds/sunroom-06.svg',
  ],
  terra: [
    '/backgrounds/terra-01.svg', '/backgrounds/terra-02.svg', '/backgrounds/terra-03.svg',
    '/backgrounds/terra-04.svg', '/backgrounds/terra-05.svg', '/backgrounds/terra-06.svg',
  ],
};

export const backgroundFor = (themeSlug: string, variantIndex: number, appearance: 'light' | 'dark') => {
  const scenes = themeBackgrounds[themeSlug] || themeBackgrounds.sunroom;
  const index = Math.abs(variantIndex) % scenes.length;
  return scenes[index];
};
