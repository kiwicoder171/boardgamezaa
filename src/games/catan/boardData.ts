import {
  CatanEdge,
  CatanHex,
  CatanVertex,
  DevCardType,
  HarborType,
  ResourceCount,
  ResourceType,
  TerrainType,
} from './types';

export const HEX_RADIUS = 76;
export const BOARD_WIDTH = 760;
export const BOARD_HEIGHT = 720;
export const CENTER_X = BOARD_WIDTH / 2;
export const CENTER_Y = BOARD_HEIGHT / 2;

export const BUILDING_COSTS: Record<'road' | 'settlement' | 'city' | 'dev_card', Partial<ResourceCount>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  dev_card: { sheep: 1, wheat: 1, ore: 1 },
};

export const TERRAIN_TO_RESOURCE: Record<TerrainType, ResourceType | null> = {
  forest: 'wood',
  hills: 'brick',
  pasture: 'sheep',
  fields: 'wheat',
  mountains: 'ore',
  desert: null,
};

export function getNumberPips(num: number | null): number {
  if (!num) return 0;
  switch (num) {
    case 2:
    case 12:
      return 1;
    case 3:
    case 11:
      return 2;
    case 4:
    case 10:
      return 3;
    case 5:
    case 9:
      return 4;
    case 6:
    case 8:
      return 5;
    default:
      return 0;
  }
}

export function generateDevCardDeck(): DevCardType[] {
  const cards: DevCardType[] = [];
  // 14 Knights
  for (let i = 0; i < 14; i++) cards.push('knight');
  // 5 Victory Points
  for (let i = 0; i < 5; i++) cards.push('victory_point');
  // 2 Road Building
  for (let i = 0; i < 2; i++) cards.push('road_building');
  // 2 Year of Plenty
  for (let i = 0; i < 2; i++) cards.push('year_of_plenty');
  // 2 Monopoly
  for (let i = 0; i < 2; i++) cards.push('monopoly');

  // Shuffle deck
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

interface RawBoardData {
  hexes: CatanHex[];
  vertices: CatanVertex[];
  edges: CatanEdge[];
}

export function buildGraphTopology(): RawBoardData {
  const R = HEX_RADIUS;
  const W = Math.sqrt(3) * R;
  const H = 1.5 * R;
  const rowCounts = [3, 4, 5, 4, 3];

  const hexList: { id: number; x: number; y: number }[] = [];
  rowCounts.forEach((count, r) => {
    const y = CENTER_Y + (r - 2) * H;
    const startX = CENTER_X - ((count - 1) * W) / 2;
    for (let c = 0; c < count; c++) {
      const x = startX + c * W;
      hexList.push({ id: hexList.length, x, y });
    }
  });

  const verticesMap = new Map<string, { id: number; x: number; y: number; hexes: number[] }>();
  const edgesMap = new Map<string, { id: number; v1: number; v2: number; hexes: number[] }>();

  function getKey(x: number, y: number): string {
    return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
  }

  const hexVertices: number[][] = [];
  const hexEdges: number[][] = [];

  hexList.forEach((hex) => {
    const vIds: number[] = [];
    const angles = [0, 60, 120, 180, 240, 300]; // degrees from top
    const pts = angles.map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const vx = hex.x + R * Math.sin(rad);
      const vy = hex.y - R * Math.cos(rad);
      return { x: vx, y: vy };
    });

    pts.forEach((pt) => {
      const key = getKey(pt.x, pt.y);
      if (!verticesMap.has(key)) {
        verticesMap.set(key, { id: verticesMap.size, x: pt.x, y: pt.y, hexes: [] });
      }
      const v = verticesMap.get(key)!;
      if (!v.hexes.includes(hex.id)) {
        v.hexes.push(hex.id);
      }
      vIds.push(v.id);
    });
    hexVertices.push(vIds);

    const eIds: number[] = [];
    for (let i = 0; i < 6; i++) {
      const v1 = vIds[i];
      const v2 = vIds[(i + 1) % 6];
      const eKey = [Math.min(v1, v2), Math.max(v1, v2)].join('-');
      if (!edgesMap.has(eKey)) {
        edgesMap.set(eKey, { id: edgesMap.size, v1, v2, hexes: [] });
      }
      const edge = edgesMap.get(eKey)!;
      if (!edge.hexes.includes(hex.id)) {
        edge.hexes.push(hex.id);
      }
      eIds.push(edge.id);
    }
    hexEdges.push(eIds);
  });

  const vertices: CatanVertex[] = Array.from(verticesMap.values()).map((v) => ({
    id: v.id,
    x: v.x,
    y: v.y,
    adjacentVertices: [],
    adjacentEdges: [],
    adjacentHexes: v.hexes,
    building: null,
    harbor: null,
  }));

  const edges: CatanEdge[] = Array.from(edgesMap.values()).map((e) => ({
    id: e.id,
    vertices: [e.v1, e.v2],
    road: null,
  }));

  // Populate vertex adjacency
  edges.forEach((edge) => {
    const [v1Id, v2Id] = edge.vertices;
    const v1 = vertices[v1Id];
    const v2 = vertices[v2Id];

    if (!v1.adjacentVertices.includes(v2Id)) v1.adjacentVertices.push(v2Id);
    if (!v2.adjacentVertices.includes(v1Id)) v2.adjacentVertices.push(v1Id);

    if (!v1.adjacentEdges.includes(edge.id)) v1.adjacentEdges.push(edge.id);
    if (!v2.adjacentEdges.includes(edge.id)) v2.adjacentEdges.push(edge.id);
  });

  const hexes: CatanHex[] = hexList.map((h, i) => ({
    id: i,
    terrain: 'forest',
    resource: 'wood',
    number: 6,
    pips: 5,
    vertices: hexVertices[i],
    edges: hexEdges[i],
    x: h.x,
    y: h.y,
  }));

  return { hexes, vertices, edges };
}

// 9 Official Harbors positioned around perimeter edges
export function assignHarbors(vertices: CatanVertex[], edges: CatanEdge[]) {
  // Find coastal vertices (vertices that touch < 3 hexes)
  const coastalVertices = vertices.filter((v) => v.adjacentHexes.length <= 2);
  
  // Angle from center
  const sortedCoastal = [...coastalVertices].sort((a, b) => {
    const angleA = Math.atan2(a.y - CENTER_Y, a.x - CENTER_X);
    const angleB = Math.atan2(b.y - CENTER_Y, b.x - CENTER_X);
    return angleA - angleB;
  });

  // Pick 9 well-spaced perimeter pairs
  // In Catan, 9 harbors (4 generic 3:1, 5 special 2:1 for wood, brick, sheep, wheat, ore)
  const harborTypes: { type: HarborType; ratio: number }[] = [
    { type: 'generic', ratio: 3 },
    { type: 'wheat', ratio: 2 },
    { type: 'ore', ratio: 2 },
    { type: 'generic', ratio: 3 },
    { type: 'sheep', ratio: 2 },
    { type: 'generic', ratio: 3 },
    { type: 'wood', ratio: 2 },
    { type: 'brick', ratio: 2 },
    { type: 'generic', ratio: 3 },
  ];

  // We can group adjacent coastal vertex pairs that form an outer edge
  const candidatePairs: [number, number][] = [];
  for (let i = 0; i < sortedCoastal.length; i++) {
    const v1 = sortedCoastal[i];
    const nextIdx = (i + 1) % sortedCoastal.length;
    const v2 = sortedCoastal[nextIdx];
    // Check if directly connected by an edge
    if (v1.adjacentVertices.includes(v2.id)) {
      candidatePairs.push([v1.id, v2.id]);
    }
  }

  // Pick 9 distributed pairs from candidate outer edges
  const step = candidatePairs.length / 9;
  for (let i = 0; i < 9; i++) {
    const pairIdx = Math.floor(i * step) % candidatePairs.length;
    const [v1Id, v2Id] = candidatePairs[pairIdx];
    const harborDef = harborTypes[i];
    vertices[v1Id].harbor = harborDef;
    vertices[v2Id].harbor = harborDef;
  }
}

// Standard Beginner Board layout
const STANDARD_TILES: { terrain: TerrainType; number: number | null }[] = [
  // Row 0 (3 hexes)
  { terrain: 'mountains', number: 10 },
  { terrain: 'pasture', number: 2 },
  { terrain: 'forest', number: 9 },
  // Row 1 (4 hexes)
  { terrain: 'fields', number: 12 },
  { terrain: 'hills', number: 6 },
  { terrain: 'pasture', number: 4 },
  { terrain: 'hills', number: 10 },
  // Row 2 (5 hexes)
  { terrain: 'fields', number: 9 },
  { terrain: 'forest', number: 11 },
  { terrain: 'desert', number: null }, // Center
  { terrain: 'forest', number: 3 },
  { terrain: 'mountains', number: 8 },
  // Row 3 (4 hexes)
  { terrain: 'forest', number: 8 },
  { terrain: 'mountains', number: 3 },
  { terrain: 'fields', number: 4 },
  { terrain: 'pasture', number: 5 },
  // Row 4 (3 hexes)
  { terrain: 'hills', number: 5 },
  { terrain: 'fields', number: 11 },
  { terrain: 'pasture', number: 6 },
];

export function createCatanBoard(layout: 'standard' | 'random' = 'standard'): {
  hexes: CatanHex[];
  vertices: CatanVertex[];
  edges: CatanEdge[];
  robberHexId: number;
} {
  const { hexes, vertices, edges } = buildGraphTopology();
  assignHarbors(vertices, edges);

  let tileDefs = [...STANDARD_TILES];
  if (layout === 'random') {
    // Collect all terrains and numbers, shuffle terrains
    const terrains: TerrainType[] = STANDARD_TILES.map((t) => t.terrain);
    const numbers: (number | null)[] = STANDARD_TILES.map((t) => t.number).filter((n) => n !== null);
    
    // Shuffle terrains
    for (let i = terrains.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [terrains[i], terrains[j]] = [terrains[j], terrains[i]];
    }

    // Shuffle numbers
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    let numIdx = 0;
    tileDefs = terrains.map((terrain) => {
      if (terrain === 'desert') {
        return { terrain, number: null };
      }
      return { terrain, number: numbers[numIdx++] };
    });
  }

  let robberHexId = 9; // Default center
  hexes.forEach((hex, i) => {
    const def = tileDefs[i] || { terrain: 'forest', number: 6 };
    hex.terrain = def.terrain;
    hex.resource = TERRAIN_TO_RESOURCE[def.terrain];
    hex.number = def.number;
    hex.pips = getNumberPips(def.number);
    if (def.terrain === 'desert') {
      robberHexId = hex.id;
    }
  });

  return { hexes, vertices, edges, robberHexId };
}
