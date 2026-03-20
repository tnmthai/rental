export type UniversityLocation = {
  slug: string;
  location: string;
  university: string;
  regionHint?: string;
};

export const UNIVERSITY_LOCATIONS: UniversityLocation[] = [
  { slug: 'auckland', location: 'Auckland', university: 'University of Auckland' },
  { slug: 'auckland-aut', location: 'Auckland', university: 'AUT' },
  { slug: 'hamilton', location: 'Hamilton', university: 'University of Waikato' },
  { slug: 'wellington', location: 'Wellington', university: 'Victoria University of Wellington' },
  { slug: 'christchurch', location: 'Christchurch', university: 'University of Canterbury' },
  { slug: 'lincoln', location: 'Lincoln', university: 'Lincoln University', regionHint: 'Canterbury' },
  { slug: 'dunedin', location: 'Dunedin', university: 'University of Otago' },
  { slug: 'palmerston-north', location: 'Palmerston North', university: 'Massey University' }
];

export function getUniversityLocationBySlug(slug: string) {
  return UNIVERSITY_LOCATIONS.find((x) => x.slug === slug) || null;
}
