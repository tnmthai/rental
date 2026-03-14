export type NzLocation = {
  region: string;
  areas: Array<{ area: string; suburbs: string[] }>;
};

export const NZ_LOCATIONS: NzLocation[] = [
  {
    region: 'Northland',
    areas: [
      { area: 'Whangārei District', suburbs: ['Whangārei Central', 'Kensington', 'Tikipunga'] },
      { area: 'Far North District', suburbs: ['Kerikeri', 'Kaitaia', 'Paihia'] },
      { area: 'Kaipara District', suburbs: ['Dargaville', 'Mangawhai'] }
    ]
  },
  {
    region: 'Auckland',
    areas: [
      { area: 'Auckland City', suburbs: ['CBD', 'Mount Eden', 'Newmarket', 'Grafton', 'Epsom'] },
      { area: 'North Shore', suburbs: ['Takapuna', 'Albany', 'Birkenhead', 'Glenfield'] },
      { area: 'Manukau', suburbs: ['Papatoetoe', 'Manurewa', 'Flat Bush', 'Botany'] },
      { area: 'Waitākere', suburbs: ['Henderson', 'New Lynn', 'Te Atatū'] },
      { area: 'Franklin', suburbs: ['Pukekohe', 'Waiuku'] }
    ]
  },
  {
    region: 'Waikato',
    areas: [
      { area: 'Hamilton City', suburbs: ['Hamilton Central', 'Hillcrest', 'Claudelands'] },
      { area: 'Waipā District', suburbs: ['Cambridge', 'Te Awamutu'] },
      { area: 'South Waikato District', suburbs: ['Tokoroa', 'Putāruru'] },
      { area: 'Ōtorohanga District', suburbs: ['Ōtorohanga', 'Kawhia'] },
      { area: 'Waitomo District', suburbs: ['Te Kūiti', 'Piopio'] },
      { area: 'Thames-Coromandel District', suburbs: ['Thames', 'Whitianga', 'Tairua'] },
      { area: 'Hauraki District', suburbs: ['Paeroa', 'Waihi', 'Ngatea'] },
      { area: 'Matamata-Piako District', suburbs: ['Matamata', 'Morrinsville', 'Te Aroha'] },
      { area: 'Taupō District', suburbs: ['Taupō', 'Tūrangi'] }
    ]
  },
  {
    region: 'Bay of Plenty',
    areas: [
      { area: 'Tauranga City', suburbs: ['Tauranga Central', 'Mount Maunganui', 'Papamoa'] },
      { area: 'Rotorua District', suburbs: ['Rotorua Central', 'Ngongotahā', 'Fairy Springs'] },
      { area: 'Western Bay of Plenty District', suburbs: ['Te Puke', 'Katikati'] },
      { area: 'Whakatāne District', suburbs: ['Whakatāne', 'Ōhope'] },
      { area: 'Kawerau District', suburbs: ['Kawerau'] },
      { area: 'Ōpōtiki District', suburbs: ['Ōpōtiki'] }
    ]
  },
  {
    region: 'Gisborne',
    areas: [
      { area: 'Gisborne District', suburbs: ['Gisborne Central', 'Kaiti', 'Te Hapara'] }
    ]
  },
  {
    region: "Hawke's Bay",
    areas: [
      { area: 'Napier City', suburbs: ['Napier South', 'Taradale', 'Ahuriri'] },
      { area: 'Hastings District', suburbs: ['Hastings Central', 'Havelock North', 'Flaxmere'] },
      { area: 'Wairoa District', suburbs: ['Wairoa'] },
      { area: "Central Hawke's Bay District", suburbs: ['Waipawa', 'Waipukurau'] }
    ]
  },
  {
    region: 'Taranaki',
    areas: [
      { area: 'New Plymouth District', suburbs: ['New Plymouth Central', 'Bell Block', 'Fitzroy'] },
      { area: 'Stratford District', suburbs: ['Stratford'] },
      { area: 'South Taranaki District', suburbs: ['Hāwera', 'Eltham'] }
    ]
  },
  {
    region: 'Manawatū-Whanganui',
    areas: [
      { area: 'Palmerston North City', suburbs: ['West End', 'Awapuni', 'Hokowhitu'] },
      { area: 'Whanganui District', suburbs: ['Whanganui Central', 'Gonville'] },
      { area: 'Manawatū District', suburbs: ['Feilding', 'Bunnythorpe'] },
      { area: 'Horowhenua District', suburbs: ['Levin', 'Foxton'] },
      { area: 'Tararua District', suburbs: ['Dannevirke', 'Pahiatua'] },
      { area: 'Rangitīkei District', suburbs: ['Marton', 'Bulls'] },
      { area: 'Ruapehu District', suburbs: ['Taumarunui', 'Ōhākune'] }
    ]
  },
  {
    region: 'Wellington',
    areas: [
      { area: 'Wellington City', suburbs: ['Te Aro', 'Kelburn', 'Newtown', 'Karori'] },
      { area: 'Lower Hutt', suburbs: ['Petone', 'Alicetown', 'Wainuiomata'] },
      { area: 'Upper Hutt', suburbs: ['Trentham', 'Silverstream'] },
      { area: 'Porirua', suburbs: ['Aotea', 'Tītahi Bay', 'Whitby'] },
      { area: 'Kapiti Coast District', suburbs: ['Paraparaumu', 'Waikanae', 'Ōtaki'] },
      { area: 'South Wairarapa District', suburbs: ['Martinborough', 'Featherston'] },
      { area: 'Carterton District', suburbs: ['Carterton'] },
      { area: 'Masterton District', suburbs: ['Masterton'] }
    ]
  },
  {
    region: 'Tasman',
    areas: [
      { area: 'Tasman District', suburbs: ['Richmond', 'Motueka', 'Takaka'] }
    ]
  },
  {
    region: 'Nelson',
    areas: [
      { area: 'Nelson City', suburbs: ['Nelson Central', 'Stoke', 'Tahunanui'] }
    ]
  },
  {
    region: 'Marlborough',
    areas: [
      { area: 'Marlborough District', suburbs: ['Blenheim', 'Picton'] }
    ]
  },
  {
    region: 'West Coast',
    areas: [
      { area: 'Buller District', suburbs: ['Westport', 'Reefton'] },
      { area: 'Grey District', suburbs: ['Greymouth', 'Runanga'] },
      { area: 'Westland District', suburbs: ['Hokitika', 'Franz Josef'] }
    ]
  },
  {
    region: 'Canterbury',
    areas: [
      { area: 'Christchurch City', suburbs: ['Riccarton', 'Ilam', 'Sydenham', 'Addington', 'Papanui'] },
      { area: 'Selwyn District', suburbs: ['Lincoln', 'Rolleston', 'Prebbleton', 'Leeston'] },
      { area: 'Waimakariri District', suburbs: ['Rangiora', 'Kaiapoi', 'Woodend'] },
      { area: 'Ashburton District', suburbs: ['Ashburton', 'Tinwald'] },
      { area: 'Timaru District', suburbs: ['Timaru', 'Temuka'] },
      { area: 'Mackenzie District', suburbs: ['Fairlie', 'Twizel'] },
      { area: 'Waimate District', suburbs: ['Waimate'] },
      { area: 'Hurunui District', suburbs: ['Amberley', 'Hanmer Springs'] },
      { area: 'Kaikōura District', suburbs: ['Kaikōura'] }
    ]
  },
  {
    region: 'Otago',
    areas: [
      { area: 'Dunedin City', suburbs: ['North Dunedin', 'Roslyn', 'Mornington'] },
      { area: 'Queenstown-Lakes District', suburbs: ['Queenstown', 'Frankton', 'Wānaka'] },
      { area: 'Central Otago District', suburbs: ['Alexandra', 'Cromwell'] },
      { area: 'Waitaki District', suburbs: ['Oamaru', 'Kurow'] },
      { area: 'Clutha District', suburbs: ['Balclutha', 'Milton'] }
    ]
  },
  {
    region: 'Southland',
    areas: [
      { area: 'Invercargill City', suburbs: ['Invercargill Central', 'Waikiwi'] },
      { area: 'Southland District', suburbs: ['Winton', 'Te Anau', 'Riverton'] },
      { area: 'Gore District', suburbs: ['Gore', 'Mataura'] }
    ]
  }
];

const NONE = '(None)';

const SCHOOLS_BY_REGION_AREA: Record<string, string[]> = {
  'Auckland::Auckland City': [NONE, 'University of Auckland (UoA)', 'AUT (Auckland University of Technology)'],
  'Auckland::North Shore': [NONE, 'Massey University (Albany Campus)', 'AUT (Akoranga Campus)'],
  'Auckland::Manukau': [NONE, 'MIT (Manukau Institute of Technology)', 'AUT South Campus'],
  'Auckland::Waitākere': [NONE, 'Unitec (Mt Albert Campus)'],
  'Auckland::Franklin': [NONE, 'University of Auckland (UoA)', 'AUT'],

  'Canterbury::Christchurch City': [NONE, 'University of Canterbury (UC)', 'Ara Institute of Canterbury (Polytechnic)'],
  'Canterbury::Selwyn District': [NONE, 'Lincoln University (LU)', 'Ara Institute of Canterbury (Christchurch Campus)'],
  'Canterbury::Waimakariri District': [NONE, 'University of Canterbury (UC)', 'Ara Institute of Canterbury (Polytechnic)'],
  'Canterbury::Ashburton District': [NONE, 'Ara Institute of Canterbury (Polytechnic)'],
  'Canterbury::Timaru District': [NONE, 'Ara Institute of Canterbury (Timaru Campus)'],

  'Wellington::Wellington City': [NONE, 'Te Herenga Waka—Victoria University of Wellington', 'Massey University (Wellington Campus)', 'Whitireia & WelTec (Wellington)'],
  'Wellington::Lower Hutt': [NONE, 'WelTec (Wellington Institute of Technology)'],
  'Wellington::Upper Hutt': [NONE, 'Whitireia & WelTec'],
  'Wellington::Porirua': [NONE, 'Whitireia New Zealand'],

  'Waikato::Hamilton City': [NONE, 'University of Waikato', 'Wintec (Waikato Institute of Technology)'],
  'Waikato::Waipā District': [NONE, 'University of Waikato', 'Wintec'],
  'Waikato::Taupō District': [NONE, 'Toi Ohomai Institute of Technology'],

  'Otago::Dunedin City': [NONE, 'University of Otago', 'Otago Polytechnic'],
  'Otago::Queenstown-Lakes District': [NONE, 'Otago Polytechnic (Queenstown Campus)'],

  'Bay of Plenty::Tauranga City': [NONE, 'University of Waikato (Tauranga Campus)', 'Toi Ohomai Institute of Technology'],
  'Bay of Plenty::Rotorua District': [NONE, 'Toi Ohomai Institute of Technology (Rotorua Campus)'],

  'Manawatū-Whanganui::Palmerston North City': [NONE, 'Massey University (Manawatū Campus)', 'UCOL (Universal College of Learning)'],
  'Manawatū-Whanganui::Whanganui District': [NONE, 'UCOL Whanganui'],

  'Northland::Whangārei District': [NONE, 'NorthTec (Northland Polytechnic)'],
  'Northland::Far North District': [NONE, 'NorthTec (Northland Polytechnic)'],

  'Nelson::Nelson City': [NONE, 'NMIT (Nelson Marlborough Institute of Technology)'],
  'Marlborough::Marlborough District': [NONE, 'NMIT (Nelson Marlborough Institute of Technology)'],
  'Southland::Invercargill City': [NONE, 'SIT (Southern Institute of Technology)'],
  'Taranaki::New Plymouth District': [NONE, 'WITT (Western Institute of Technology at Taranaki)'],
  "Hawke's Bay::Napier City": [NONE, 'EIT (Eastern Institute of Technology)'],
  "Hawke's Bay::Hastings District": [NONE, 'EIT (Eastern Institute of Technology)'],
  'Gisborne::Gisborne District': [NONE, 'EIT (Tairāwhiti Campus)']
};

const SCHOOLS_BY_REGION: Record<string, string[]> = {
  Northland: [NONE, 'NorthTec'],
  Auckland: [NONE, 'University of Auckland (UoA)', 'AUT', 'Massey University (Albany)', 'MIT', 'Unitec'],
  Waikato: [NONE, 'University of Waikato', 'Wintec', 'Toi Ohomai Institute of Technology'],
  'Bay of Plenty': [NONE, 'University of Waikato (Tauranga)', 'Toi Ohomai Institute of Technology'],
  Gisborne: [NONE, 'EIT (Tairāwhiti Campus)'],
  "Hawke's Bay": [NONE, 'EIT (Eastern Institute of Technology)'],
  Taranaki: [NONE, 'WITT (Western Institute of Technology at Taranaki)'],
  'Manawatū-Whanganui': [NONE, 'Massey University (Manawatū)', 'UCOL'],
  Wellington: [NONE, 'Victoria University of Wellington', 'Massey University (Wellington)', 'WelTec', 'Whitireia New Zealand'],
  Tasman: [NONE, 'NMIT (Nelson Marlborough Institute of Technology)'],
  Nelson: [NONE, 'NMIT (Nelson Marlborough Institute of Technology)'],
  Marlborough: [NONE, 'NMIT (Nelson Marlborough Institute of Technology)'],
  'West Coast': [NONE],
  Canterbury: [NONE, 'University of Canterbury (UC)', 'Lincoln University (LU)', 'Ara Institute of Canterbury'],
  Otago: [NONE, 'University of Otago', 'Otago Polytechnic'],
  Southland: [NONE, 'SIT (Southern Institute of Technology)']
};

export function getSchools(region: string, area: string) {
  const areaKey = `${region}::${area}`;
  const scoped = SCHOOLS_BY_REGION_AREA[areaKey];
  if (scoped?.length) return scoped;
  return SCHOOLS_BY_REGION[region] || [NONE];
}
