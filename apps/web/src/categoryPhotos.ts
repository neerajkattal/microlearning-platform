// Maps a category's display name to a real photo - same exact-match +
// keyword-fallback shape as categoryIcons.ts, and deliberately keyed
// off the same names, so a category's icon and its photo always agree
// on what that category "is".
//
// Sourced from Wikipedia's page-summary API (stable, real photos, all
// either public domain or Creative Commons via Wikimedia Commons) at
// build time - not stock photography this app can license or a
// generated image, but a real, freely-usable photo per topic rather
// than an abstract color+icon placeholder.
const EXACT: Record<string, string> = {
  "general knowledge": "https://upload.wikimedia.org/wikipedia/commons/a/a3/SanDiegoCityCollegeLearningResource_-_bookshelf.jpg",
  "entertainment: books": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Gutenberg_Bible%2C_Lenox_Copy%2C_New_York_Public_Library%2C_2009._Pic_01.jpg",
  "entertainment: film": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Ptuj%2C_city_cinema.jpg",
  "entertainment: music": "https://upload.wikimedia.org/wikipedia/commons/a/a7/D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg",
  "entertainment: musicals & theatres": "https://upload.wikimedia.org/wikipedia/commons/c/c2/Crookfinale.jpg",
  "entertainment: television": "https://upload.wikimedia.org/wikipedia/commons/4/40/Cptvdisplay.jpg",
  "entertainment: video games": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Universum_TV_Multispiel_2006.jpg",
  "entertainment: board games": "https://upload.wikimedia.org/wikipedia/commons/6/6f/ChessSet.jpg",
  "entertainment: comics": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Little_Nemo_1906-08-19.jpg",
  "entertainment: japanese anime & manga": "https://upload.wikimedia.org/wikipedia/commons/5/58/Wikipe-tan_manga_page1.jpg",
  "entertainment: cartoon & animations": "https://upload.wikimedia.org/wikipedia/commons/f/f9/SubstanceandShadow.jpg",
  "science & nature": "https://upload.wikimedia.org/wikipedia/commons/0/06/Titan_in_front_of_the_ring_and_Saturn.jpg",
  "science: computers": "https://upload.wikimedia.org/wikipedia/commons/6/68/Laptop_collage.jpg",
  "science: mathematics": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Woman_teaching_geometry.jpg",
  "science: gadgets": "https://upload.wikimedia.org/wikipedia/commons/6/68/Laptop_collage.jpg",
  mythology: "https://upload.wikimedia.org/wikipedia/commons/8/86/Achilles_Penthesileia_BM_B209.jpg",
  sports: "https://upload.wikimedia.org/wikipedia/commons/4/42/Football_in_Bloomington%2C_Indiana%2C_1995.jpg",
  geography: "https://upload.wikimedia.org/wikipedia/commons/7/70/The_Blue_Marble%2C_AS17-148-22727.jpg",
  history: "https://upload.wikimedia.org/wikipedia/commons/d/de/Colosseo_2020.jpg",
  art: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
  celebrities: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Brigitte_Bardot_Venice_1958.jpg",
  animals: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Animal_diversity_b.png",
  vehicles: "https://upload.wikimedia.org/wikipedia/commons/4/43/2005_Toyota_Corolla_1.4_T3.jpg",
};

const KEYWORDS: [RegExp, string][] = [
  [/film|movie/i, EXACT["entertainment: film"]],
  [/music/i, EXACT["entertainment: music"]],
  [/book/i, EXACT["entertainment: books"]],
  [/tv|television/i, EXACT["entertainment: television"]],
  [/game/i, EXACT["entertainment: video games"]],
  [/science/i, EXACT["science & nature"]],
  [/sport/i, EXACT.sports],
  [/geograph/i, EXACT.geography],
  [/histor/i, EXACT.history],
  [/art/i, EXACT.art],
  [/animal/i, EXACT.animals],
  [/vehicle|car/i, EXACT.vehicles],
];

const DEFAULT_PHOTO = EXACT["general knowledge"];

// A curated, visually varied spread across different topics - used by
// the landing page's rotating hero backdrop, not by category lookup
// itself, so this is a fixed handful rather than every entry above.
export const HERO_PHOTOS: string[] = [
  EXACT.history,
  EXACT["science & nature"],
  EXACT.art,
  EXACT.sports,
  EXACT.geography,
  EXACT["entertainment: film"],
  EXACT["entertainment: music"],
];

export function categoryPhoto(name: string): string {
  const exact = EXACT[name.trim().toLowerCase()];
  if (exact) return exact;
  const keywordMatch = KEYWORDS.find(([pattern]) => pattern.test(name));
  return keywordMatch ? keywordMatch[1] : DEFAULT_PHOTO;
}
