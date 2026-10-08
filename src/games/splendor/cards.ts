import { DevCard, NobleTile, CityTile } from './types';

export const BASE_TIER_1_CARDS: DevCard[] = [
  // Diamond bonuses
  { id: 't1_d1', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { sapphire: 1, emerald: 1, ruby: 1, onyx: 1 } },
  { id: 't1_d2', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { sapphire: 1, emerald: 2, ruby: 1, onyx: 1 } },
  { id: 't1_d3', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { sapphire: 2, ruby: 2, onyx: 1 } },
  { id: 't1_d4', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { sapphire: 3 } },
  { id: 't1_d5', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { emerald: 2, ruby: 2, onyx: 1 } },
  { id: 't1_d6', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { emerald: 1, ruby: 3, onyx: 1 } },
  { id: 't1_d7', tier: 1, gemBonus: 'diamond', prestige: 0, cost: { sapphire: 2, emerald: 2, onyx: 1 } },
  { id: 't1_d8', tier: 1, gemBonus: 'diamond', prestige: 1, cost: { sapphire: 4 } },

  // Sapphire bonuses
  { id: 't1_s1', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { diamond: 1, emerald: 1, ruby: 1, onyx: 1 } },
  { id: 't1_s2', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { diamond: 1, emerald: 1, ruby: 2, onyx: 1 } },
  { id: 't1_s3', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { emerald: 2, ruby: 1, onyx: 2 } },
  { id: 't1_s4', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { onyx: 3 } },
  { id: 't1_s5', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { diamond: 1, ruby: 2, onyx: 2 } },
  { id: 't1_s6', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { diamond: 2, emerald: 2, ruby: 1 } },
  { id: 't1_s7', tier: 1, gemBonus: 'sapphire', prestige: 0, cost: { diamond: 1, emerald: 3, ruby: 1 } },
  { id: 't1_s8', tier: 1, gemBonus: 'sapphire', prestige: 1, cost: { ruby: 4 } },

  // Emerald bonuses
  { id: 't1_e1', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { diamond: 1, sapphire: 1, ruby: 1, onyx: 1 } },
  { id: 't1_e2', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { diamond: 1, sapphire: 1, ruby: 1, onyx: 2 } },
  { id: 't1_e3', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { diamond: 2, sapphire: 1, onyx: 2 } },
  { id: 't1_e4', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { ruby: 3 } },
  { id: 't1_e5', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { diamond: 2, sapphire: 2, ruby: 1 } },
  { id: 't1_e6', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { sapphire: 1, ruby: 1, onyx: 3 } },
  { id: 't1_e7', tier: 1, gemBonus: 'emerald', prestige: 0, cost: { diamond: 1, ruby: 2, onyx: 2 } },
  { id: 't1_e8', tier: 1, gemBonus: 'emerald', prestige: 1, cost: { onyx: 4 } },

  // Ruby bonuses
  { id: 't1_r1', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { diamond: 1, sapphire: 1, emerald: 1, onyx: 1 } },
  { id: 't1_r2', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { diamond: 2, sapphire: 1, emerald: 1, onyx: 1 } },
  { id: 't1_r3', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { diamond: 2, sapphire: 2, emerald: 1 } },
  { id: 't1_r4', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { diamond: 3 } },
  { id: 't1_r5', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { sapphire: 2, emerald: 1, onyx: 2 } },
  { id: 't1_r6', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { diamond: 1, sapphire: 3, onyx: 1 } },
  { id: 't1_r7', tier: 1, gemBonus: 'ruby', prestige: 0, cost: { sapphire: 2, emerald: 2, onyx: 1 } },
  { id: 't1_r8', tier: 1, gemBonus: 'ruby', prestige: 1, cost: { diamond: 4 } },

  // Onyx bonuses
  { id: 't1_o1', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { diamond: 1, sapphire: 1, emerald: 1, ruby: 1 } },
  { id: 't1_o2', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { diamond: 1, sapphire: 2, emerald: 1, ruby: 1 } },
  { id: 't1_o3', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { diamond: 1, sapphire: 2, ruby: 2 } },
  { id: 't1_o4', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { emerald: 3 } },
  { id: 't1_o5', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { diamond: 2, emerald: 2, sapphire: 1 } },
  { id: 't1_o6', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { diamond: 3, sapphire: 1, ruby: 1 } },
  { id: 't1_o7', tier: 1, gemBonus: 'onyx', prestige: 0, cost: { sapphire: 1, emerald: 2, ruby: 2 } },
  { id: 't1_o8', tier: 1, gemBonus: 'onyx', prestige: 1, cost: { emerald: 4 } },
];

export const BASE_TIER_2_CARDS: DevCard[] = [
  // Diamond
  { id: 't2_d1', tier: 2, gemBonus: 'diamond', prestige: 1, cost: { emerald: 3, ruby: 2, onyx: 2 } },
  { id: 't2_d2', tier: 2, gemBonus: 'diamond', prestige: 2, cost: { ruby: 5 } },
  { id: 't2_d3', tier: 2, gemBonus: 'diamond', prestige: 2, cost: { sapphire: 4, emerald: 2, ruby: 1 } },
  { id: 't2_d4', tier: 2, gemBonus: 'diamond', prestige: 3, cost: { diamond: 6 } },
  { id: 't2_d5', tier: 2, gemBonus: 'diamond', prestige: 1, cost: { sapphire: 2, emerald: 3, onyx: 3 } },
  { id: 't2_d6', tier: 2, gemBonus: 'diamond', prestige: 2, cost: { diamond: 2, sapphire: 3, onyx: 3 } },

  // Sapphire
  { id: 't2_s1', tier: 2, gemBonus: 'sapphire', prestige: 1, cost: { diamond: 2, emerald: 2, ruby: 3 } },
  { id: 't2_s2', tier: 2, gemBonus: 'sapphire', prestige: 2, cost: { sapphire: 5 } },
  { id: 't2_s3', tier: 2, gemBonus: 'sapphire', prestige: 2, cost: { diamond: 2, emerald: 4, onyx: 1 } },
  { id: 't2_s4', tier: 2, gemBonus: 'sapphire', prestige: 3, cost: { sapphire: 6 } },
  { id: 't2_s5', tier: 2, gemBonus: 'sapphire', prestige: 1, cost: { diamond: 3, ruby: 2, onyx: 3 } },
  { id: 't2_s6', tier: 2, gemBonus: 'sapphire', prestige: 2, cost: { diamond: 3, sapphire: 2, emerald: 3 } },

  // Emerald
  { id: 't2_e1', tier: 2, gemBonus: 'emerald', prestige: 1, cost: { diamond: 3, sapphire: 2, onyx: 2 } },
  { id: 't2_e2', tier: 2, gemBonus: 'emerald', prestige: 2, cost: { diamond: 5 } },
  { id: 't2_e3', tier: 2, gemBonus: 'emerald', prestige: 2, cost: { diamond: 3, sapphire: 1, ruby: 4 } },
  { id: 't2_e4', tier: 2, gemBonus: 'emerald', prestige: 3, cost: { emerald: 6 } },
  { id: 't2_e5', tier: 2, gemBonus: 'emerald', prestige: 1, cost: { sapphire: 3, ruby: 3, onyx: 2 } },
  { id: 't2_e6', tier: 2, gemBonus: 'emerald', prestige: 2, cost: { sapphire: 3, emerald: 2, onyx: 3 } },

  // Ruby
  { id: 't2_r1', tier: 2, gemBonus: 'ruby', prestige: 1, cost: { diamond: 2, sapphire: 3, onyx: 3 } },
  { id: 't2_r2', tier: 2, gemBonus: 'ruby', prestige: 2, cost: { onyx: 5 } },
  { id: 't2_r3', tier: 2, gemBonus: 'ruby', prestige: 2, cost: { sapphire: 3, emerald: 3, ruby: 2 } },
  { id: 't2_r4', tier: 2, gemBonus: 'ruby', prestige: 3, cost: { ruby: 6 } },
  { id: 't2_r5', tier: 2, gemBonus: 'ruby', prestige: 1, cost: { diamond: 2, emerald: 3, onyx: 3 } },
  { id: 't2_r6', tier: 2, gemBonus: 'ruby', prestige: 2, cost: { diamond: 1, sapphire: 4, emerald: 2 } },

  // Onyx
  { id: 't2_o1', tier: 2, gemBonus: 'onyx', prestige: 1, cost: { diamond: 3, sapphire: 3, emerald: 2 } },
  { id: 't2_o2', tier: 2, gemBonus: 'onyx', prestige: 2, cost: { emerald: 5 } },
  { id: 't2_o3', tier: 2, gemBonus: 'onyx', prestige: 2, cost: { diamond: 4, ruby: 3, onyx: 1 } },
  { id: 't2_o4', tier: 2, gemBonus: 'onyx', prestige: 3, cost: { onyx: 6 } },
  { id: 't2_o5', tier: 2, gemBonus: 'onyx', prestige: 1, cost: { diamond: 3, sapphire: 2, ruby: 3 } },
  { id: 't2_o6', tier: 2, gemBonus: 'onyx', prestige: 2, cost: { emerald: 3, ruby: 3, onyx: 2 } },
];

export const BASE_TIER_3_CARDS: DevCard[] = [
  // Diamond
  { id: 't3_d1', tier: 3, gemBonus: 'diamond', prestige: 3, cost: { sapphire: 3, emerald: 3, ruby: 5, onyx: 3 } },
  { id: 't3_d2', tier: 3, gemBonus: 'diamond', prestige: 4, cost: { onyx: 7 } },
  { id: 't3_d3', tier: 3, gemBonus: 'diamond', prestige: 4, cost: { diamond: 3, ruby: 3, onyx: 6 } },
  { id: 't3_d4', tier: 3, gemBonus: 'diamond', prestige: 5, cost: { diamond: 7, sapphire: 3 } },

  // Sapphire
  { id: 't3_s1', tier: 3, gemBonus: 'sapphire', prestige: 3, cost: { diamond: 3, emerald: 3, ruby: 3, onyx: 5 } },
  { id: 't3_s2', tier: 3, gemBonus: 'sapphire', prestige: 4, cost: { diamond: 7 } },
  { id: 't3_s3', tier: 3, gemBonus: 'sapphire', prestige: 4, cost: { diamond: 6, sapphire: 3, emerald: 3 } },
  { id: 't3_s4', tier: 3, gemBonus: 'sapphire', prestige: 5, cost: { sapphire: 7, emerald: 3 } },

  // Emerald
  { id: 't3_e1', tier: 3, gemBonus: 'emerald', prestige: 3, cost: { diamond: 5, sapphire: 3, ruby: 3, onyx: 3 } },
  { id: 't3_e2', tier: 3, gemBonus: 'emerald', prestige: 4, cost: { ruby: 7 } },
  { id: 't3_e3', tier: 3, gemBonus: 'emerald', prestige: 4, cost: { sapphire: 6, emerald: 3, ruby: 3 } },
  { id: 't3_e4', tier: 3, gemBonus: 'emerald', prestige: 5, cost: { emerald: 7, ruby: 3 } },

  // Ruby
  { id: 't3_r1', tier: 3, gemBonus: 'ruby', prestige: 3, cost: { diamond: 3, sapphire: 5, emerald: 3, onyx: 3 } },
  { id: 't3_r2', tier: 3, gemBonus: 'ruby', prestige: 4, cost: { emerald: 7 } },
  { id: 't3_r3', tier: 3, gemBonus: 'ruby', prestige: 4, cost: { emerald: 6, ruby: 3, onyx: 3 } },
  { id: 't3_r4', tier: 3, gemBonus: 'ruby', prestige: 5, cost: { ruby: 7, onyx: 3 } },

  // Onyx
  { id: 't3_o1', tier: 3, gemBonus: 'onyx', prestige: 3, cost: { diamond: 3, sapphire: 3, emerald: 5, ruby: 3 } },
  { id: 't3_o2', tier: 3, gemBonus: 'onyx', prestige: 4, cost: { sapphire: 7 } },
  { id: 't3_o3', tier: 3, gemBonus: 'onyx', prestige: 4, cost: { diamond: 3, onyx: 3, ruby: 6 } },
  { id: 't3_o4', tier: 3, gemBonus: 'onyx', prestige: 5, cost: { onyx: 7, diamond: 3 } },
];

export const NOBLE_TILES: NobleTile[] = [
  { id: 'noble_1', name: 'Francis I', avatar: '👑', prestige: 3, requirements: { diamond: 3, sapphire: 3, emerald: 3 } },
  { id: 'noble_2', name: 'Mary Stuart', avatar: '👸', prestige: 3, requirements: { sapphire: 3, emerald: 3, ruby: 3 } },
  { id: 'noble_3', name: 'Anne of Brittany', avatar: '🏰', prestige: 3, requirements: { emerald: 3, ruby: 3, onyx: 3 } },
  { id: 'noble_4', name: 'Henry VIII', avatar: '🍷', prestige: 3, requirements: { ruby: 3, onyx: 3, diamond: 3 } },
  { id: 'noble_5', name: 'Charles V', avatar: '⚔️', prestige: 3, requirements: { onyx: 3, diamond: 3, sapphire: 3 } },
  { id: 'noble_6', name: 'Catherine de Medici', avatar: '📜', prestige: 3, requirements: { diamond: 4, sapphire: 4 } },
  { id: 'noble_7', name: 'Isabella I of Castile', avatar: '👑', prestige: 3, requirements: { emerald: 4, ruby: 4 } },
  { id: 'noble_8', name: 'Suleiman the Magnificent', avatar: '🌙', prestige: 3, requirements: { sapphire: 4, emerald: 4 } },
  { id: 'noble_9', name: 'Niccolò Machiavelli', avatar: '🦊', prestige: 3, requirements: { ruby: 4, onyx: 4 } },
  { id: 'noble_10', name: 'Elisabeth of Austria', avatar: '💎', prestige: 3, requirements: { diamond: 4, onyx: 4 } },
];

export const CITY_TILES: CityTile[] = [
  { id: 'city_bruges', name: 'Bruges', avatar: '🏛️', minPrestige: 14, requirements: { emerald: 4 } },
  { id: 'city_venice', name: 'Venice', avatar: '🎭', minPrestige: 13, requirements: { sapphire: 3, ruby: 3 } },
  { id: 'city_seville', name: 'Seville', avatar: '💃', minPrestige: 15, requirements: { diamond: 4, onyx: 4 } },
  { id: 'city_lisbon', name: 'Lisbon', avatar: '⛵', minPrestige: 16, requirements: {} },
  { id: 'city_florence', name: 'Florence', avatar: '🎨', minPrestige: 11, requirements: { diamond: 4, sapphire: 4 } },
  { id: 'city_antwerp', name: 'Antwerp', avatar: '💎', minPrestige: 14, requirements: { diamond: 5 } },
  { id: 'city_lyon', name: 'Lyon', avatar: '🦁', minPrestige: 13, requirements: { ruby: 4, emerald: 3 } },
];

export const ORIENT_TIER_1_CARDS: DevCard[] = [
  { id: 'o1_1', tier: 1, gemBonus: 'diamond', bonusCount: 2, prestige: 0, cost: { sapphire: 2, emerald: 2 }, isOrient: true },
  { id: 'o1_2', tier: 1, gemBonus: 'ruby', bonusCount: 2, prestige: 0, cost: { diamond: 2, onyx: 2 }, isOrient: true },
  { id: 'o1_3', tier: 1, gemBonus: 'sapphire', bonusCount: 2, prestige: 0, cost: { emerald: 2, ruby: 2 }, isOrient: true },
  { id: 'o1_4', tier: 1, gemBonus: 'emerald', bonusCount: 2, prestige: 0, cost: { diamond: 2, sapphire: 2 }, isOrient: true },
  { id: 'o1_5', tier: 1, gemBonus: 'onyx', bonusCount: 2, prestige: 0, cost: { ruby: 2, emerald: 2 }, isOrient: true },
];

export const ORIENT_TIER_2_CARDS: DevCard[] = [
  { id: 'o2_1', tier: 2, gemBonus: 'diamond', bonusCount: 2, prestige: 1, cost: { sapphire: 4, ruby: 3 }, isOrient: true },
  { id: 'o2_2', tier: 2, gemBonus: 'sapphire', bonusCount: 2, prestige: 1, cost: { emerald: 4, onyx: 3 }, isOrient: true },
  { id: 'o2_3', tier: 2, gemBonus: 'ruby', bonusCount: 2, prestige: 1, cost: { diamond: 4, emerald: 3 }, isOrient: true },
  { id: 'o2_4', tier: 2, gemBonus: 'emerald', bonusCount: 2, prestige: 2, cost: { diamond: 5 }, isOrient: true },
];

export const ORIENT_TIER_3_CARDS: DevCard[] = [
  { id: 'o3_1', tier: 3, gemBonus: 'ruby', bonusCount: 2, prestige: 3, cost: { diamond: 4, sapphire: 4, emerald: 4 }, isOrient: true },
  { id: 'o3_2', tier: 3, gemBonus: 'sapphire', bonusCount: 2, prestige: 4, cost: { ruby: 7, onyx: 3 }, isOrient: true },
  { id: 'o3_3', tier: 3, gemBonus: 'diamond', bonusCount: 2, prestige: 4, cost: { emerald: 7, sapphire: 3 }, isOrient: true },
];
