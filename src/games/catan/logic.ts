import {
  BUILDING_COSTS,
  createCatanBoard,
  generateDevCardDeck,
} from './boardData';
import {
  CatanAction,
  CatanLogEntry,
  CatanPlayerState,
  CatanSettings,
  CatanState,
  DevCardType,
  ResourceCount,
  ResourceType,
} from './types';

const PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#f59e0b', // Amber/Orange
  '#10b981', // Emerald
];

export function emptyResources(): ResourceCount {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

export function totalResourceCount(res: ResourceCount): number {
  return res.wood + res.brick + res.sheep + res.wheat + res.ore;
}

export function canAfford(
  playerRes: ResourceCount,
  cost: Partial<ResourceCount>
): boolean {
  for (const [key, val] of Object.entries(cost)) {
    const resKey = key as ResourceType;
    if ((playerRes[resKey] || 0) < (val || 0)) {
      return false;
    }
  }
  return true;
}

export function deductResources(
  playerRes: ResourceCount,
  cost: Partial<ResourceCount>
): ResourceCount {
  const updated = { ...playerRes };
  for (const [key, val] of Object.entries(cost)) {
    const resKey = key as ResourceType;
    updated[resKey] = Math.max(0, updated[resKey] - (val || 0));
  }
  return updated;
}

export function addResources(
  playerRes: ResourceCount,
  addition: Partial<ResourceCount>
): ResourceCount {
  const updated = { ...playerRes };
  for (const [key, val] of Object.entries(addition)) {
    const resKey = key as ResourceType;
    updated[resKey] = (updated[resKey] || 0) + (val || 0);
  }
  return updated;
}

export function isValidSettlementPlacement(
  state: CatanState,
  vertexId: number,
  playerId: string,
  isSetup: boolean
): { valid: boolean; reason?: string } {
  const vertex = state.vertices[vertexId];
  if (!vertex) return { valid: false, reason: 'Invalid vertex' };
  if (vertex.building) return { valid: false, reason: 'Vertex already occupied' };

  // Distance rule: no adjacent vertex can have a building
  for (const adjVId of vertex.adjacentVertices) {
    const adjV = state.vertices[adjVId];
    if (adjV && adjV.building) {
      return { valid: false, reason: 'Too close to another settlement (Distance Rule)' };
    }
  }

  if (isSetup) {
    return { valid: true };
  }

  // In main game, must connect to at least one of player's roads
  let connectedToRoad = false;
  for (const edgeId of vertex.adjacentEdges) {
    const edge = state.edges[edgeId];
    if (edge && edge.road && edge.road.playerId === playerId) {
      connectedToRoad = true;
      break;
    }
  }

  if (!connectedToRoad) {
    return { valid: false, reason: 'Settlement must connect to your road network' };
  }

  return { valid: true };
}

export function isValidRoadPlacement(
  state: CatanState,
  edgeId: number,
  playerId: string,
  isSetup: boolean,
  setupConnectedVertexId?: number
): { valid: boolean; reason?: string } {
  const edge = state.edges[edgeId];
  if (!edge) return { valid: false, reason: 'Invalid edge' };
  if (edge.road) return { valid: false, reason: 'Edge already has a road' };

  const [v1Id, v2Id] = edge.vertices;

  if (isSetup && setupConnectedVertexId !== undefined) {
    if (v1Id === setupConnectedVertexId || v2Id === setupConnectedVertexId) {
      return { valid: true };
    }
    return { valid: false, reason: 'Road must connect to your newly placed settlement' };
  }

  // Must connect to player's road, settlement, or city
  for (const vId of [v1Id, v2Id]) {
    const v = state.vertices[vId];
    if (v.building && v.building.playerId === playerId) {
      return { valid: true };
    }
    // If not blocked by an enemy building, check connected edges
    if (!v.building || v.building.playerId === playerId) {
      for (const adjEId of v.adjacentEdges) {
        if (adjEId !== edgeId) {
          const adjE = state.edges[adjEId];
          if (adjE && adjE.road && adjE.road.playerId === playerId) {
            return { valid: true };
          }
        }
      }
    }
  }

  return { valid: false, reason: 'Road must connect to your existing network' };
}

// Calculate longest road using DFS
export function calculateLongestRoad(state: CatanState, playerId: string): number {
  const playerRoadEdgeIds = state.edges
    .filter((e) => e.road && e.road.playerId === playerId)
    .map((e) => e.id);

  if (playerRoadEdgeIds.length === 0) return 0;

  let maxLen = 0;

  function dfs(currentVertex: number, visitedEdges: Set<number>, currentLen: number) {
    if (currentLen > maxLen) maxLen = currentLen;

    const v = state.vertices[currentVertex];
    // If enemy building is on this vertex, road cannot continue through it
    if (v.building && v.building.playerId !== playerId && currentLen > 0) {
      return;
    }

    for (const edgeId of v.adjacentEdges) {
      if (!visitedEdges.has(edgeId)) {
        const edge = state.edges[edgeId];
        if (edge && edge.road && edge.road.playerId === playerId) {
          visitedEdges.add(edgeId);
          const nextVertex = edge.vertices[0] === currentVertex ? edge.vertices[1] : edge.vertices[0];
          dfs(nextVertex, visitedEdges, currentLen + 1);
          visitedEdges.delete(edgeId);
        }
      }
    }
  }

  for (const edgeId of playerRoadEdgeIds) {
    const edge = state.edges[edgeId];
    const visited = new Set<number>([edgeId]);
    dfs(edge.vertices[0], visited, 1);
    dfs(edge.vertices[1], visited, 1);
  }

  return maxLen;
}

export function updateAchievements(state: CatanState): void {
  // Update Longest Road
  for (const pid of state.turnOrder) {
    const roadLen = calculateLongestRoad(state, pid);
    if (roadLen >= 5) {
      if (!state.longestRoad.playerId && roadLen >= 5) {
        state.longestRoad = { playerId: pid, length: roadLen };
        state.logs.unshift({
          id: `lr-${Date.now()}`,
          timestamp: Date.now(),
          text: `${state.players[pid].name} claimed Longest Road (2 VP) with ${roadLen} segments!`,
          textTh: `${state.players[pid].name} คว้าการ์ดถนนสายยาวที่สุด (+2 คะแนน) ด้วยความยาว ${roadLen} เส้น!`,
          type: 'victory',
        });
      } else if (state.longestRoad.playerId && state.longestRoad.playerId !== pid && roadLen > state.longestRoad.length) {
        state.longestRoad = { playerId: pid, length: roadLen };
        state.logs.unshift({
          id: `lr-${Date.now()}`,
          timestamp: Date.now(),
          text: `${state.players[pid].name} stole Longest Road (2 VP) with ${roadLen} segments!`,
          textTh: `${state.players[pid].name} แย่งชิงการ์ดถนนสายยาวที่สุด (+2 คะแนน) สำเร็จด้วยความยาว ${roadLen} เส้น!`,
          type: 'victory',
        });
      } else if (state.longestRoad.playerId === pid) {
        state.longestRoad.length = Math.max(state.longestRoad.length, roadLen);
      }
    }
  }

  // Update Largest Army
  for (const pid of state.turnOrder) {
    const knights = state.players[pid].playedKnights;
    if (knights >= 3) {
      if (!state.largestArmy.playerId) {
        state.largestArmy = { playerId: pid, count: knights };
        state.logs.unshift({
          id: `la-${Date.now()}`,
          timestamp: Date.now(),
          text: `${state.players[pid].name} claimed Largest Army (2 VP) with ${knights} knights!`,
          textTh: `${state.players[pid].name} คว้าการ์ดกองทัพที่ยิ่งใหญ่ที่สุด (+2 คะแนน) ด้วยอัศวิน ${knights} นาย!`,
          type: 'victory',
        });
      } else if (state.largestArmy.playerId !== pid && knights > state.largestArmy.count) {
        state.largestArmy = { playerId: pid, count: knights };
        state.logs.unshift({
          id: `la-${Date.now()}`,
          timestamp: Date.now(),
          text: `${state.players[pid].name} took Largest Army (2 VP) with ${knights} knights!`,
          textTh: `${state.players[pid].name} แย่งชิงการ์ดกองทัพที่ยิ่งใหญ่ที่สุด (+2 คะแนน) ด้วยอัศวิน ${knights} นาย!`,
          type: 'victory',
        });
      } else if (state.largestArmy.playerId === pid) {
        state.largestArmy.count = Math.max(state.largestArmy.count, knights);
      }
    }
  }

  // Update VP counts for all players
  for (const pid of state.turnOrder) {
    const p = state.players[pid];
    let vp = p.settlementsCount * 1 + p.citiesCount * 2;
    if (state.longestRoad.playerId === pid) vp += 2;
    if (state.largestArmy.playerId === pid) vp += 2;
    // Secret VP cards
    const vpCards = p.devCards.filter((c) => c === 'victory_point').length;
    vp += vpCards;
    p.victoryPoints = vp;
  }
}

export function initCatanGame(
  players: { id: string; name: string; avatar: string }[],
  settings: CatanSettings
): CatanState {
  const { hexes, vertices, edges, robberHexId } = createCatanBoard(settings.boardLayout || 'standard');
  const devCardDeck = generateDevCardDeck();
  const turnOrder = players.map((p) => p.id);

  const playerStates: Record<string, CatanPlayerState> = {};
  players.forEach((p, index) => {
    playerStates[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      resources: emptyResources(),
      devCards: [],
      playedKnights: 0,
      roadsCount: 0,
      settlementsCount: 0,
      citiesCount: 0,
      victoryPoints: 0,
      hasPlayedDevCardThisTurn: false,
    };
  });

  return {
    phase: 'setup_round_1',
    turnOrder,
    currentTurnPlayerId: turnOrder[0],
    activeSetupStep: 'settlement',
    setupRound: 1,
    setupTurnIndex: 0,
    turnStep: 'roll',
    dice: null,
    diceTotal: null,
    robberHexId,
    hexes,
    vertices,
    edges,
    players: playerStates,
    devCardDeck,
    longestRoad: { playerId: null, length: 0 },
    largestArmy: { playerId: null, count: 0 },
    pendingTrade: null,
    winner: null,
    winnerName: null,
    logs: [
      {
        id: `init-${Date.now()}`,
        timestamp: Date.now(),
        text: 'The island of Catan awaits! Starting initial settlement placements.',
        textTh: 'ยินดีต้อนรับสู่เกาะ Catan! เริ่มต้นรอบวางที่ตั้งถิ่นฐานแห่งแรก',
        type: 'system',
      },
    ],
  };
}

export function catanReducer(
  state: CatanState,
  action: CatanAction,
  playerId: string
): { newState: CatanState; error?: string } {
  const newState: CatanState = JSON.parse(JSON.stringify(state));
  const activePlayer = newState.players[playerId];

  if (!activePlayer) {
    return { newState: state, error: 'Player not recognized' };
  }

  // Handle Setup Rounds
  if (newState.phase === 'setup_round_1' || newState.phase === 'setup_round_2') {
    if (playerId !== newState.currentTurnPlayerId) {
      return { newState: state, error: 'Not your turn to place setup pieces' };
    }

    if (action.type === 'BUILD_INITIAL_SETTLEMENT') {
      if (newState.activeSetupStep !== 'settlement') {
        return { newState: state, error: 'You need to place a road next' };
      }

      const validCheck = isValidSettlementPlacement(newState, action.vertexId, playerId, true);
      if (!validCheck.valid) {
        return { newState: state, error: validCheck.reason };
      }

      const vertex = newState.vertices[action.vertexId];
      vertex.building = { type: 'settlement', playerId };
      activePlayer.settlementsCount += 1;
      activePlayer.victoryPoints += 1;

      // In Round 2, grant starting resources from adjacent terrain hexes
      if (newState.setupRound === 2) {
        const grantedRes: Partial<ResourceCount> = {};
        for (const hexId of vertex.adjacentHexes) {
          const hex = newState.hexes[hexId];
          if (hex && hex.resource) {
            grantedRes[hex.resource] = (grantedRes[hex.resource] || 0) + 1;
          }
        }
        activePlayer.resources = addResources(activePlayer.resources, grantedRes);
        const resourceList = Object.entries(grantedRes)
          .map(([res, count]) => `${count} ${res}`)
          .join(', ');
        if (resourceList) {
          newState.logs.unshift({
            id: `start-res-${Date.now()}`,
            timestamp: Date.now(),
            text: `${activePlayer.name} received starting resources: ${resourceList}`,
            textTh: `${activePlayer.name} ได้รับทรัพยากรเริ่มต้น: ${resourceList}`,
            type: 'system',
          });
        }
      }

      newState.activeSetupStep = 'road';
      newState.logs.unshift({
        id: `setup-settle-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} founded a settlement. Now place an adjoining road.`,
        textTh: `${activePlayer.name} วางบ้านที่ตั้งถิ่นฐาน กรุณาวางถนนเชื่อมต่อ`,
        type: 'build',
      });

      return { newState };
    }

    if (action.type === 'BUILD_INITIAL_ROAD') {
      if (newState.activeSetupStep !== 'road') {
        return { newState: state, error: 'Place a settlement first' };
      }

      // Find the settlement just placed by this player
      const playerSettlementVertices = newState.vertices.filter(
        (v) => v.building && v.building.playerId === playerId
      );
      const latestVertex = playerSettlementVertices[playerSettlementVertices.length - 1];

      const validCheck = isValidRoadPlacement(
        newState,
        action.edgeId,
        playerId,
        true,
        latestVertex?.id
      );
      if (!validCheck.valid) {
        return { newState: state, error: validCheck.reason };
      }

      const edge = newState.edges[action.edgeId];
      edge.road = { playerId };
      activePlayer.roadsCount += 1;

      newState.logs.unshift({
        id: `setup-road-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} laid an initial road.`,
        textTh: `${activePlayer.name} วางถนนเส้นแรกสำเร็จ`,
        type: 'build',
      });

      // Advance setup turn
      const n = newState.turnOrder.length;
      if (newState.setupRound === 1) {
        if (newState.setupTurnIndex < n - 1) {
          newState.setupTurnIndex += 1;
          newState.currentTurnPlayerId = newState.turnOrder[newState.setupTurnIndex];
          newState.activeSetupStep = 'settlement';
        } else {
          // Switch to Round 2 (snake draft: last player goes again)
          newState.setupRound = 2;
          newState.activeSetupStep = 'settlement';
          // Current player remains the last player
        }
      } else {
        // Round 2 (counting down)
        if (newState.setupTurnIndex > 0) {
          newState.setupTurnIndex -= 1;
          newState.currentTurnPlayerId = newState.turnOrder[newState.setupTurnIndex];
          newState.activeSetupStep = 'settlement';
        } else {
          // Setup complete! Transition to main_game
          newState.phase = 'main_game';
          newState.currentTurnPlayerId = newState.turnOrder[0];
          newState.turnStep = 'roll';
          delete newState.activeSetupStep;
          newState.logs.unshift({
            id: `game-start-${Date.now()}`,
            timestamp: Date.now(),
            text: `Setup complete! The match begins with ${newState.players[newState.currentTurnPlayerId].name}.`,
            textTh: `การตั้งเกาะเสร็จสิ้น! เริ่มเกมอย่างเป็นทางการที่ ${newState.players[newState.currentTurnPlayerId].name}`,
            type: 'system',
          });
        }
      }

      return { newState };
    }

    return { newState: state, error: 'Action not allowed during setup phase' };
  }

  // Main Game Actions
  if (newState.phase === 'main_game') {
    // Dice Rolling
    if (action.type === 'ROLL_DICE') {
      if (playerId !== newState.currentTurnPlayerId) {
        return { newState: state, error: 'Not your turn to roll dice' };
      }
      if (newState.turnStep !== 'roll') {
        return { newState: state, error: 'Dice already rolled this turn' };
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      newState.dice = [d1, d2];
      newState.diceTotal = total;

      newState.logs.unshift({
        id: `dice-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} rolled [${d1} + ${d2} = ${total}] 🎲`,
        textTh: `${activePlayer.name} ทอยลูกเต๋าได้ [${d1} + ${d2} = ${total}] 🎲`,
        type: 'roll',
      });

      if (total === 7) {
        // Check for players with > 7 cards needing to discard
        let someoneMustDiscard = false;
        for (const pid of newState.turnOrder) {
          const p = newState.players[pid];
          const count = totalResourceCount(p.resources);
          if (count > 7) {
            p.toDiscardCount = Math.floor(count / 2);
            someoneMustDiscard = true;
          }
        }

        if (someoneMustDiscard) {
          newState.phase = 'discarding';
          newState.logs.unshift({
            id: `discard-${Date.now()}`,
            timestamp: Date.now(),
            text: 'Rolled 7! Players holding more than 7 resource cards must discard half.',
            textTh: 'ทอยได้ 7! ผู้เล่นที่ถือการ์ดเกิน 7 ใบ ต้องทิ้งการ์ดครึ่งหนึ่ง',
            type: 'robber',
          });
        } else {
          newState.phase = 'moving_robber';
          newState.logs.unshift({
            id: `robber-${Date.now()}`,
            timestamp: Date.now(),
            text: `${activePlayer.name} must move the Robber to a new tile.`,
            textTh: `${activePlayer.name} ต้องย้ายโจรไปยังพื้นที่ใหม่`,
            type: 'robber',
          });
        }
      } else {
        // Resource distribution
        const matchingHexes = newState.hexes.filter(
          (h) => h.number === total && h.id !== newState.robberHexId && h.resource !== null
        );

        const payouts: Record<string, Partial<ResourceCount>> = {};

        matchingHexes.forEach((hex) => {
          const res = hex.resource!;
          hex.vertices.forEach((vId) => {
            const v = newState.vertices[vId];
            if (v.building) {
              const bPlayerId = v.building.playerId;
              const amount = v.building.type === 'city' ? 2 : 1;
              if (!payouts[bPlayerId]) payouts[bPlayerId] = {};
              payouts[bPlayerId][res] = (payouts[bPlayerId][res] || 0) + amount;
            }
          });
        });

        for (const [pId, resMap] of Object.entries(payouts)) {
          const p = newState.players[pId];
          p.resources = addResources(p.resources, resMap);
          const gained = Object.entries(resMap)
            .map(([r, c]) => `${c} ${r}`)
            .join(', ');
          newState.logs.unshift({
            id: `harvest-${Date.now()}-${pId}`,
            timestamp: Date.now(),
            text: `${p.name} harvested: ${gained}`,
            textTh: `${p.name} ได้รับผลผลิต: ${gained}`,
            type: 'system',
          });
        }

        newState.turnStep = 'actions';
      }

      return { newState };
    }

    // Trade responses can be handled by other players
    if (action.type === 'RESPOND_TRADE') {
      if (!newState.pendingTrade) return { newState: state, error: 'No active trade offer' };
      if (newState.pendingTrade.senderId === playerId) {
        return { newState: state, error: 'Cannot accept your own trade' };
      }

      // Check if responder has required cards
      if (action.accept) {
        if (!canAfford(activePlayer.resources, newState.pendingTrade.request)) {
          return { newState: state, error: 'You do not have the required resources to trade' };
        }
        if (!newState.pendingTrade.acceptedPlayerIds.includes(playerId)) {
          newState.pendingTrade.acceptedPlayerIds.push(playerId);
        }
      } else {
        newState.pendingTrade.acceptedPlayerIds = newState.pendingTrade.acceptedPlayerIds.filter(
          (id) => id !== playerId
        );
      }
      return { newState };
    }

    if (action.type === 'EXECUTE_TRADE') {
      if (playerId !== newState.currentTurnPlayerId) {
        return { newState: state, error: 'Only active player can confirm trade execution' };
      }
      if (!newState.pendingTrade) return { newState: state, error: 'No trade to execute' };
      const partner = newState.players[action.partnerPlayerId];
      if (!partner) return { newState: state, error: 'Partner not found' };

      const offer = newState.pendingTrade.offer;
      const request = newState.pendingTrade.request;

      if (!canAfford(activePlayer.resources, offer)) {
        return { newState: state, error: 'You no longer have the offered resources' };
      }
      if (!canAfford(partner.resources, request)) {
        return { newState: state, error: 'Partner no longer has the requested resources' };
      }

      activePlayer.resources = deductResources(activePlayer.resources, offer);
      activePlayer.resources = addResources(activePlayer.resources, request);

      partner.resources = deductResources(partner.resources, request);
      partner.resources = addResources(partner.resources, offer);

      newState.logs.unshift({
        id: `trade-${Date.now()}`,
        timestamp: Date.now(),
        text: `Deal completed between ${activePlayer.name} and ${partner.name}!`,
        textTh: `การแลกเปลี่ยนเสร็จสิ้นระหว่าง ${activePlayer.name} และ ${partner.name}!`,
        type: 'trade',
      });

      newState.pendingTrade = null;
      return { newState };
    }

    if (action.type === 'CANCEL_TRADE') {
      if (newState.pendingTrade && newState.pendingTrade.senderId === playerId) {
        newState.pendingTrade = null;
      }
      return { newState };
    }

    // All actions below require playerId === currentTurnPlayerId
    if (playerId !== newState.currentTurnPlayerId) {
      return { newState: state, error: 'Not your turn' };
    }

    if (newState.turnStep !== 'actions') {
      return { newState: state, error: 'You must roll the dice first' };
    }

    // Build Road
    if (action.type === 'BUILD_ROAD') {
      if (activePlayer.roadsCount >= 15) {
        return { newState: state, error: 'Maximum 15 roads built' };
      }

      const isFreeRoad = (newState.roadBuildingRemaining || 0) > 0;
      if (!isFreeRoad && !canAfford(activePlayer.resources, BUILDING_COSTS.road)) {
        return { newState: state, error: 'Not enough resources for road (Needs 1 Wood + 1 Brick)' };
      }

      const validCheck = isValidRoadPlacement(newState, action.edgeId, playerId, false);
      if (!validCheck.valid) {
        return { newState: state, error: validCheck.reason };
      }

      if (!isFreeRoad) {
        activePlayer.resources = deductResources(activePlayer.resources, BUILDING_COSTS.road);
      } else {
        newState.roadBuildingRemaining = (newState.roadBuildingRemaining || 0) - 1;
      }

      const edge = newState.edges[action.edgeId];
      edge.road = { playerId };
      activePlayer.roadsCount += 1;

      updateAchievements(newState);

      newState.logs.unshift({
        id: `road-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} constructed a road.`,
        textTh: `${activePlayer.name} สร้างถนนใหม่`,
        type: 'build',
      });

      return { newState };
    }

    // Build Settlement
    if (action.type === 'BUILD_SETTLEMENT') {
      if (activePlayer.settlementsCount >= 5) {
        return { newState: state, error: 'Maximum 5 settlements built (upgrade to city first)' };
      }
      if (!canAfford(activePlayer.resources, BUILDING_COSTS.settlement)) {
        return {
          newState: state,
          error: 'Not enough resources (Needs 1 Wood + 1 Brick + 1 Sheep + 1 Wheat)',
        };
      }

      const validCheck = isValidSettlementPlacement(newState, action.vertexId, playerId, false);
      if (!validCheck.valid) {
        return { newState: state, error: validCheck.reason };
      }

      activePlayer.resources = deductResources(activePlayer.resources, BUILDING_COSTS.settlement);
      const vertex = newState.vertices[action.vertexId];
      vertex.building = { type: 'settlement', playerId };
      activePlayer.settlementsCount += 1;

      updateAchievements(newState);

      newState.logs.unshift({
        id: `settle-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} built a new settlement! (+1 VP)`,
        textTh: `${activePlayer.name} สร้างที่ตั้งถิ่นฐานใหม่! (+1 คะแนน)`,
        type: 'build',
      });

      return { newState };
    }

    // Upgrade to City
    if (action.type === 'UPGRADE_CITY') {
      if (activePlayer.citiesCount >= 4) {
        return { newState: state, error: 'Maximum 4 cities built' };
      }
      if (!canAfford(activePlayer.resources, BUILDING_COSTS.city)) {
        return { newState: state, error: 'Not enough resources for City (Needs 2 Wheat + 3 Ore)' };
      }

      const vertex = newState.vertices[action.vertexId];
      if (!vertex || !vertex.building || vertex.building.playerId !== playerId) {
        return { newState: state, error: 'You do not own a settlement on this vertex' };
      }
      if (vertex.building.type === 'city') {
        return { newState: state, error: 'Already upgraded to a city' };
      }

      activePlayer.resources = deductResources(activePlayer.resources, BUILDING_COSTS.city);
      vertex.building.type = 'city';
      activePlayer.settlementsCount -= 1;
      activePlayer.citiesCount += 1;

      updateAchievements(newState);

      newState.logs.unshift({
        id: `city-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} upgraded settlement to a thriving City! (+1 VP)`,
        textTh: `${activePlayer.name} อัปเกรดเป็นเมืองใหญ่! (+1 คะแนน)`,
        type: 'build',
      });

      return { newState };
    }

    // Buy Development Card
    if (action.type === 'BUY_DEV_CARD') {
      if (newState.devCardDeck.length === 0) {
        return { newState: state, error: 'No development cards remaining in deck' };
      }
      if (!canAfford(activePlayer.resources, BUILDING_COSTS.dev_card)) {
        return {
          newState: state,
          error: 'Not enough resources for Dev Card (Needs 1 Sheep + 1 Wheat + 1 Ore)',
        };
      }

      activePlayer.resources = deductResources(activePlayer.resources, BUILDING_COSTS.dev_card);
      const card = newState.devCardDeck.pop()!;
      activePlayer.devCards.push(card);

      updateAchievements(newState);

      newState.logs.unshift({
        id: `buy-dev-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} bought a secret Development Card.`,
        textTh: `${activePlayer.name} ซื้อการ์ดพัฒนาความก้าวหน้า 1 ใบ`,
        type: 'dev_card',
      });

      return { newState };
    }

    // Play Development Card
    if (action.type === 'PLAY_DEV_CARD') {
      if (activePlayer.hasPlayedDevCardThisTurn) {
        return { newState: state, error: 'Can only play 1 development card per turn' };
      }
      const cardIdx = activePlayer.devCards.indexOf(action.card);
      if (cardIdx === -1) {
        return { newState: state, error: `You do not own a ${action.card} card` };
      }

      if (action.card === 'knight') {
        activePlayer.devCards.splice(cardIdx, 1);
        activePlayer.playedKnights += 1;
        activePlayer.hasPlayedDevCardThisTurn = true;
        updateAchievements(newState);
        newState.phase = 'moving_robber';
        newState.logs.unshift({
          id: `play-knight-${Date.now()}`,
          timestamp: Date.now(),
          text: `${activePlayer.name} summoned a Knight! Move the robber to strike.`,
          textTh: `${activePlayer.name} สั่งการอัศวิน! เคลื่อนย้ายโจรเพื่อปล้นสะดม`,
          type: 'dev_card',
        });
        return { newState };
      }

      if (action.card === 'road_building') {
        activePlayer.devCards.splice(cardIdx, 1);
        activePlayer.hasPlayedDevCardThisTurn = true;
        newState.roadBuildingRemaining = 2;
        newState.logs.unshift({
          id: `play-rb-${Date.now()}`,
          timestamp: Date.now(),
          text: `${activePlayer.name} played Road Building: Place 2 free roads!`,
          textTh: `${activePlayer.name} ใช้การ์ดสร้างถนน: วางฟรี 2 เส้น!`,
          type: 'dev_card',
        });
        return { newState };
      }

      if (action.card === 'year_of_plenty') {
        const r1 = action.params?.resource1 as ResourceType;
        const r2 = action.params?.resource2 as ResourceType;
        if (!r1 || !r2) return { newState: state, error: 'Select 2 resources to claim' };
        activePlayer.devCards.splice(cardIdx, 1);
        activePlayer.hasPlayedDevCardThisTurn = true;
        activePlayer.resources[r1] += 1;
        activePlayer.resources[r2] += 1;
        newState.logs.unshift({
          id: `play-yop-${Date.now()}`,
          timestamp: Date.now(),
          text: `${activePlayer.name} claimed Year of Plenty (+1 ${r1}, +1 ${r2})!`,
          textTh: `${activePlayer.name} ใช้การ์ดปีแห่งความอุดมสมบูรณ์ (+1 ${r1}, +1 ${r2})!`,
          type: 'dev_card',
        });
        return { newState };
      }

      if (action.card === 'monopoly') {
        const targetRes = action.params?.resource as ResourceType;
        if (!targetRes) return { newState: state, error: 'Choose a resource to monopolize' };
        activePlayer.devCards.splice(cardIdx, 1);
        activePlayer.hasPlayedDevCardThisTurn = true;
        let stolenTotal = 0;
        for (const pid of newState.turnOrder) {
          if (pid !== playerId) {
            const victim = newState.players[pid];
            const amount = victim.resources[targetRes] || 0;
            if (amount > 0) {
              stolenTotal += amount;
              victim.resources[targetRes] = 0;
            }
          }
        }
        activePlayer.resources[targetRes] += stolenTotal;
        newState.logs.unshift({
          id: `play-mono-${Date.now()}`,
          timestamp: Date.now(),
          text: `${activePlayer.name} monopolized ${targetRes}, seizing ${stolenTotal} cards from rivals!`,
          textTh: `${activePlayer.name} ผูกขาด ${targetRes} ยึดการ์ดทั้งหมด ${stolenTotal} ใบจากคู่แข่ง!`,
          type: 'dev_card',
        });
        return { newState };
      }
    }

    // Bank / Harbor Trade
    if (action.type === 'BANK_TRADE') {
      const { giveResource, giveAmount, getResource } = action;
      if (!giveResource || !getResource || giveResource === getResource) {
        return { newState: state, error: 'Invalid trade resources' };
      }

      // Check player's best trade ratio for giveResource
      let bestRatio = 4; // Default bank ratio
      // Check harbors on player's vertices
      for (const v of newState.vertices) {
        if (v.building && v.building.playerId === playerId && v.harbor) {
          if (v.harbor.type === 'generic') {
            bestRatio = Math.min(bestRatio, 3);
          } else if (v.harbor.type === giveResource) {
            bestRatio = Math.min(bestRatio, 2);
          }
        }
      }

      if (giveAmount < bestRatio) {
        return { newState: state, error: `Trade requires at least ${bestRatio} ${giveResource}` };
      }

      if ((activePlayer.resources[giveResource] || 0) < giveAmount) {
        return { newState: state, error: `You do not have ${giveAmount} ${giveResource}` };
      }

      activePlayer.resources[giveResource] -= giveAmount;
      activePlayer.resources[getResource] += 1;

      newState.logs.unshift({
        id: `bank-trade-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} traded ${giveAmount} ${giveResource} for 1 ${getResource} with the harbor.`,
        textTh: `${activePlayer.name} แลกเปลี่ยน ${giveAmount} ${giveResource} เป็น 1 ${getResource} ผ่านท่าเรือ`,
        type: 'trade',
      });

      return { newState };
    }

    // Propose Domestic Trade
    if (action.type === 'PROPOSE_TRADE') {
      if (!canAfford(activePlayer.resources, action.offer)) {
        return { newState: state, error: 'You do not have the resources offered' };
      }

      newState.pendingTrade = {
        id: `trade-${Date.now()}`,
        senderId: playerId,
        targetPlayerId: action.targetPlayerId || null,
        offer: action.offer,
        request: action.request,
        acceptedPlayerIds: [],
      };

      newState.logs.unshift({
        id: `prop-trade-${Date.now()}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} announced a trade offer to the table.`,
        textTh: `${activePlayer.name} เสนอข้อตกลงแลกเปลี่ยนทรัพยากรกลางโต๊ะ`,
        type: 'trade',
      });

      return { newState };
    }

    // End Turn
    if (action.type === 'END_TURN') {
      updateAchievements(newState);

      // Check win condition (>= 10 VP)
      if (activePlayer.victoryPoints >= 10) {
        newState.phase = 'game_over';
        newState.winner = playerId;
        newState.winnerName = activePlayer.name;
        newState.logs.unshift({
          id: `win-${Date.now()}`,
          timestamp: Date.now(),
          text: `👑 ${activePlayer.name} conquered Catan with ${activePlayer.victoryPoints} Victory Points!`,
          textTh: `👑 ${activePlayer.name} พิชิตเกาะ Catan ด้วย ${activePlayer.victoryPoints} คะแนน ชนะเกม!`,
          type: 'victory',
        });
        return { newState };
      }

      // Reset turn flags and advance
      activePlayer.hasPlayedDevCardThisTurn = false;
      newState.pendingTrade = null;
      newState.dice = null;
      newState.diceTotal = null;
      newState.turnStep = 'roll';
      delete newState.roadBuildingRemaining;

      const currentIndex = newState.turnOrder.indexOf(playerId);
      const nextIndex = (currentIndex + 1) % newState.turnOrder.length;
      newState.currentTurnPlayerId = newState.turnOrder[nextIndex];

      return { newState };
    }
  }

  // Discarding phase (rolled 7)
  if (newState.phase === 'discarding') {
    if (action.type === 'DISCARD_CARDS') {
      const needed = activePlayer.toDiscardCount || 0;
      if (needed <= 0) {
        return { newState: state, error: 'You do not need to discard' };
      }
      const discardedCount = totalResourceCount(action.cards as ResourceCount);
      if (discardedCount !== needed) {
        return { newState: state, error: `Must discard exactly ${needed} cards` };
      }
      if (!canAfford(activePlayer.resources, action.cards)) {
        return { newState: state, error: 'You do not have those cards to discard' };
      }

      activePlayer.resources = deductResources(activePlayer.resources, action.cards);
      delete activePlayer.toDiscardCount;

      newState.logs.unshift({
        id: `discarded-${Date.now()}-${playerId}`,
        timestamp: Date.now(),
        text: `${activePlayer.name} discarded ${needed} cards.`,
        textTh: `${activePlayer.name} ทิ้งการ์ดไป ${needed} ใบ`,
        type: 'robber',
      });

      // Check if any other players still need to discard
      const stillNeedsDiscard = Object.values(newState.players).some(
        (p) => (p.toDiscardCount || 0) > 0
      );
      if (!stillNeedsDiscard) {
        newState.phase = 'moving_robber';
        newState.logs.unshift({
          id: `ready-robber-${Date.now()}`,
          timestamp: Date.now(),
          text: 'Discards complete. Current player moves the Robber.',
          textTh: 'ทิ้งการ์ดครบทุกคนแล้ว ถึงเวลาผู้เล่นปัจจุบันย้ายโจร',
          type: 'robber',
        });
      }

      return { newState };
    }
  }

  // Moving Robber phase
  if (newState.phase === 'moving_robber') {
    if (playerId !== newState.currentTurnPlayerId) {
      return { newState: state, error: 'Only active player can move the robber' };
    }

    if (action.type === 'MOVE_ROBBER') {
      if (action.hexId === newState.robberHexId) {
        return { newState: state, error: 'Must move the Robber to a different hex' };
      }
      const targetHex = newState.hexes[action.hexId];
      if (!targetHex) return { newState: state, error: 'Invalid hex' };

      newState.robberHexId = action.hexId;

      // Find players with settlements/cities touching this hex
      const adjacentVictimIds = new Set<string>();
      targetHex.vertices.forEach((vId) => {
        const v = newState.vertices[vId];
        if (v.building && v.building.playerId !== playerId) {
          adjacentVictimIds.add(v.building.playerId);
        }
      });

      // If a valid target is selected, steal 1 random card
      if (action.targetPlayerId && adjacentVictimIds.has(action.targetPlayerId)) {
        const victim = newState.players[action.targetPlayerId];
        const victimCards: ResourceType[] = [];
        for (const [r, count] of Object.entries(victim.resources)) {
          for (let i = 0; i < count; i++) victimCards.push(r as ResourceType);
        }

        if (victimCards.length > 0) {
          const stolenRes = victimCards[Math.floor(Math.random() * victimCards.length)];
          victim.resources[stolenRes] -= 1;
          activePlayer.resources[stolenRes] += 1;
          newState.logs.unshift({
            id: `steal-${Date.now()}`,
            timestamp: Date.now(),
            text: `${activePlayer.name} relocated the Robber and stole a resource from ${victim.name}!`,
            textTh: `${activePlayer.name} ย้ายโจรและขโมยทรัพยากร 1 ชิ้นจาก ${victim.name}!`,
            type: 'robber',
          });
        }
      } else {
        newState.logs.unshift({
          id: `robber-moved-${Date.now()}`,
          timestamp: Date.now(),
          text: `${activePlayer.name} moved the Robber to hex #${action.hexId}.`,
          textTh: `${activePlayer.name} ย้ายโจรไปที่พื้นที่ #${action.hexId}`,
          type: 'robber',
        });
      }

      newState.phase = 'main_game';
      newState.turnStep = 'actions';
      return { newState };
    }
  }

  return { newState: state, error: 'Unrecognized action or phase' };
}

// Bot AI for automated players
export function getBotAction(state: CatanState, botPlayerId: string): CatanAction | null {
  const bot = state.players[botPlayerId];
  if (!bot) return null;

  // Setup phase
  if (state.phase === 'setup_round_1' || state.phase === 'setup_round_2') {
    if (state.currentTurnPlayerId !== botPlayerId) return null;

    if (state.activeSetupStep === 'settlement') {
      // Pick best vertex: highest sum of pips among adjacent hexes
      const validVertices = state.vertices
        .filter((v) => isValidSettlementPlacement(state, v.id, botPlayerId, true).valid)
        .map((v) => {
          const score = v.adjacentHexes.reduce((acc, hId) => {
            const h = state.hexes[hId];
            return acc + (h ? h.pips : 0);
          }, 0);
          return { id: v.id, score };
        })
        .sort((a, b) => b.score - a.score);

      if (validVertices.length > 0) {
        return { type: 'BUILD_INITIAL_SETTLEMENT', vertexId: validVertices[0].id };
      }
    }

    if (state.activeSetupStep === 'road') {
      const settlements = state.vertices.filter(
        (v) => v.building && v.building.playerId === botPlayerId
      );
      const latestVertex = settlements[settlements.length - 1];
      if (latestVertex) {
        const validEdges = latestVertex.adjacentEdges.filter(
          (eId) => isValidRoadPlacement(state, eId, botPlayerId, true, latestVertex.id).valid
        );
        if (validEdges.length > 0) {
          return { type: 'BUILD_INITIAL_ROAD', edgeId: validEdges[0] };
        }
      }
    }
  }

  // Discarding
  if (state.phase === 'discarding') {
    const toDiscard = bot.toDiscardCount || 0;
    if (toDiscard > 0) {
      const cardsToDrop: Partial<ResourceCount> = emptyResources();
      let dropped = 0;
      const resTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
      for (const r of resTypes) {
        while ((bot.resources[r] - (cardsToDrop[r] || 0) > 0) && dropped < toDiscard) {
          cardsToDrop[r] = (cardsToDrop[r] || 0) + 1;
          dropped += 1;
        }
      }
      return { type: 'DISCARD_CARDS', cards: cardsToDrop };
    }
  }

  // Moving Robber
  if (state.phase === 'moving_robber' && state.currentTurnPlayerId === botPlayerId) {
    // Pick opponent hex with highest pips
    const candidateHexes = state.hexes
      .filter((h) => h.id !== state.robberHexId && h.terrain !== 'desert')
      .map((h) => {
        let opponentScore = 0;
        let victimId: string | undefined;
        h.vertices.forEach((vId) => {
          const v = state.vertices[vId];
          if (v.building && v.building.playerId !== botPlayerId) {
            opponentScore += (v.building.type === 'city' ? 2 : 1) * h.pips;
            victimId = v.building.playerId;
          }
        });
        return { id: h.id, score: opponentScore, victimId };
      })
      .sort((a, b) => b.score - a.score);

    const chosen = candidateHexes[0] || { id: (state.robberHexId + 1) % 19, victimId: undefined };
    return { type: 'MOVE_ROBBER', hexId: chosen.id, targetPlayerId: chosen.victimId };
  }

  // Main turn loop
  if (state.phase === 'main_game' && state.currentTurnPlayerId === botPlayerId) {
    if (state.turnStep === 'roll') {
      return { type: 'ROLL_DICE' };
    }

    if (state.turnStep === 'actions') {
      // 1. Upgrade to City if affordable
      if (canAfford(bot.resources, BUILDING_COSTS.city) && bot.citiesCount < 4) {
        const upgradeable = state.vertices.find(
          (v) => v.building && v.building.playerId === botPlayerId && v.building.type === 'settlement'
        );
        if (upgradeable) {
          return { type: 'UPGRADE_CITY', vertexId: upgradeable.id };
        }
      }

      // 2. Build Settlement if affordable
      if (canAfford(bot.resources, BUILDING_COSTS.settlement) && bot.settlementsCount < 5) {
        const validV = state.vertices.find(
          (v) => isValidSettlementPlacement(state, v.id, botPlayerId, false).valid
        );
        if (validV) {
          return { type: 'BUILD_SETTLEMENT', vertexId: validV.id };
        }
      }

      // 3. Build Road if affordable
      if (canAfford(bot.resources, BUILDING_COSTS.road) && bot.roadsCount < 15) {
        const validE = state.edges.find(
          (e) => isValidRoadPlacement(state, e.id, botPlayerId, false).valid
        );
        if (validE) {
          return { type: 'BUILD_ROAD', edgeId: validE.id };
        }
      }

      // 4. Buy Dev card if affordable
      if (canAfford(bot.resources, BUILDING_COSTS.dev_card) && state.devCardDeck.length > 0) {
        return { type: 'BUY_DEV_CARD' };
      }

      // 5. End Turn
      return { type: 'END_TURN' };
    }
  }

  return null;
}
