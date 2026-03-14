export type NzLocation = {
  region: string;
  areas: Array<{ area: string; suburbs: string[] }>;
};

export const NZ_LOCATIONS: NzLocation[] = [
  {
    region: 'Auckland',
    areas: [
      { area: 'Auckland City', suburbs: ['CBD', 'Mount Eden', 'Newmarket', 'Grafton', 'Epsom'] },
      { area: 'North Shore', suburbs: ['Takapuna', 'Albany', 'Birkenhead', 'Glenfield'] },
      { area: 'Manukau', suburbs: ['Papatoetoe', 'Manurewa', 'Flat Bush', 'Botany'] },
      { area: 'Waitākere', suburbs: ['Henderson', 'New Lynn', 'Te Atatū'] }
    ]
  },
  {
    region: 'Canterbury',
    areas: [
      { area: 'Christchurch City', suburbs: ['Riccarton', 'Ilam', 'Sydenham', 'Addington', 'Papanui'] },
      { area: 'Selwyn District', suburbs: ['Lincoln', 'Rolleston', 'Prebbleton', 'Leeston'] },
      { area: 'Waimakariri District', suburbs: ['Rangiora', 'Kaiapoi', 'Woodend'] },
      { area: 'Ashburton District', suburbs: ['Ashburton', 'Tinwald'] }
    ]
  },
  {
    region: 'Wellington',
    areas: [
      { area: 'Wellington City', suburbs: ['Te Aro', 'Kelburn', 'Newtown', 'Karori'] },
      { area: 'Lower Hutt', suburbs: ['Petone', 'Alicetown', 'Wainuiomata'] },
      { area: 'Upper Hutt', suburbs: ['Trentham', 'Silverstream'] },
      { area: 'Porirua', suburbs: ['Aotea', 'Tītahi Bay', 'Whitby'] }
    ]
  },
  {
    region: 'Waikato',
    areas: [
      { area: 'Hamilton City', suburbs: ['Hamilton Central', 'Hillcrest', 'Claudelands'] },
      { area: 'Waipā District', suburbs: ['Cambridge', 'Te Awamutu'] },
      { area: 'Taupō District', suburbs: ['Taupō', 'Tūrangi'] }
    ]
  },
  {
    region: 'Otago',
    areas: [
      { area: 'Dunedin City', suburbs: ['North Dunedin', 'Roslyn', 'Mornington'] },
      { area: 'Queenstown-Lakes District', suburbs: ['Queenstown', 'Frankton', 'Wānaka'] },
      { area: 'Central Otago District', suburbs: ['Alexandra', 'Cromwell'] }
    ]
  },
  {
    region: 'Bay of Plenty',
    areas: [
      { area: 'Tauranga City', suburbs: ['Tauranga Central', 'Mount Maunganui', 'Papamoa'] },
      { area: 'Rotorua District', suburbs: ['Rotorua Central', 'Ngongotahā'] },
      { area: 'Western Bay of Plenty District', suburbs: ['Te Puke', 'Katikati'] }
    ]
  },
  {
    region: 'Manawatū-Whanganui',
    areas: [
      { area: 'Palmerston North City', suburbs: ['West End', 'Awapuni', 'Hokowhitu'] },
      { area: 'Whanganui District', suburbs: ['Whanganui Central', 'Gonville'] }
    ]
  },
  {
    region: 'Northland',
    areas: [
      { area: 'Whangārei District', suburbs: ['Whangārei Central', 'Kensington', 'Tikipunga'] },
      { area: 'Far North District', suburbs: ['Kerikeri', 'Kaitaia'] }
    ]
  }
];

const NONE = '(None)';

const SCHOOLS_BY_REGION_AREA: Record<string, string[]> = {
  'Auckland::Auckland City': [NONE, 'University of Auckland (UoA)', 'AUT (Auckland University of Technology)'],
  'Auckland::North Shore': [NONE, 'Massey University (Albany Campus)', 'AUT (Akoranga Campus)'],
  'Auckland::Manukau': [NONE, 'MIT (Manukau Institute of Technology)', 'AUT South Campus'],
  'Auckland::Waitākere': [NONE, 'Unitec (Mt Albert Campus)'],

  'Canterbury::Christchurch City': [NONE, 'University of Canterbury (UC)', 'Ara Institute of Canterbury (Polytechnic)'],
  'Canterbury::Selwyn District': [NONE, 'Lincoln University (LU)', 'Ara Institute of Canterbury (Christchurch Campus)'],
  'Canterbury::Waimakariri District': [NONE, 'University of Canterbury (UC)', 'Ara Institute of Canterbury (Polytechnic)'],
  'Canterbury::Ashburton District': [NONE, 'Ara Institute of Canterbury (Polytechnic)'],

  'Wellington::Wellington City': [NONE, 'Te Herenga Waka—Victoria University of Wellington', 'Massey University (Wellington Campus)', 'Whitireia & WelTec (Wellington)'],
  'Wellington::Lower Hutt': [NONE, 'WelTec (Wellington Institute of Technology)'],
  'Wellington::Upper Hutt': [NONE, 'Whitireia & WelTec'],
  'Wellington::Porirua': [NONE, 'Whitireia New Zealand'],

  'Waikato::Hamilton City': [NONE, 'University of Waikato', 'Wintec (Waikato Institute of Technology)'],
  'Waikato::Waipā District': [NONE, 'University of Waikato', 'Wintec'],
  'Waikato::Taupō District': [NONE, 'Toi Ohomai Institute of Technology'],

  'Otago::Dunedin City': [NONE, 'University of Otago', 'Otago Polytechnic'],
  'Otago::Queenstown-Lakes District': [NONE, 'Otago Polytechnic (Queenstown Campus)'],
  'Otago::Central Otago District': [NONE, 'Otago Polytechnic'],

  'Bay of Plenty::Tauranga City': [NONE, 'University of Waikato (Tauranga Campus)', 'Toi Ohomai Institute of Technology'],
  'Bay of Plenty::Rotorua District': [NONE, 'Toi Ohomai Institute of Technology (Rotorua Campus)'],
  'Bay of Plenty::Western Bay of Plenty District': [NONE, 'Toi Ohomai Institute of Technology'],

  'Manawatū-Whanganui::Palmerston North City': [NONE, 'Massey University (Manawatū Campus)', 'UCOL (Universal College of Learning)'],
  'Manawatū-Whanganui::Whanganui District': [NONE, 'UCOL Whanganui'],

  'Northland::Whangārei District': [NONE, 'NorthTec (Northland Polytechnic)'],
  'Northland::Far North District': [NONE, 'NorthTec (Northland Polytechnic)']
};

const SCHOOLS_BY_REGION: Record<string, string[]> = {
  Auckland: [NONE, 'University of Auckland (UoA)', 'AUT', 'Massey University (Albany)', 'MIT'],
  Canterbury: [NONE, 'University of Canterbury (UC)', 'Lincoln University (LU)', 'Ara Institute of Canterbury'],
  Wellington: [NONE, 'Victoria University of Wellington', 'Massey University (Wellington)', 'WelTec', 'Whitireia New Zealand'],
  Waikato: [NONE, 'University of Waikato', 'Wintec'],
  Otago: [NONE, 'University of Otago', 'Otago Polytechnic'],
  'Bay of Plenty': [NONE, 'University of Waikato (Tauranga)', 'Toi Ohomai Institute of Technology'],
  'Manawatū-Whanganui': [NONE, 'Massey University (Manawatū)', 'UCOL'],
  Northland: [NONE, 'NorthTec']
};

export function getSchools(region: string, area: string) {
  const areaKey = `${region}::${area}`;
  const scoped = SCHOOLS_BY_REGION_AREA[areaKey];
  if (scoped?.length) return scoped;
  return SCHOOLS_BY_REGION[region] || [NONE];
}
