import {
  CardTier,
  CityTile,
  DevCard,
  GemColor,
  GemTokens,
  NobleTile,
  SplendorAction,
  SplendorExpansion,
  SplendorPlayer,
  SplendorState,
  TokenType,
} from './types';
import {
  BASE_TIER_1_CARDS,
  BASE_TIER_2_CARDS,
  BASE_TIER_3_CARDS,
  CITY_TILES,
  NOBLE_TILES,
  ORIENT_TIER_1_CARDS,
  ORIENT_TIER_2_CARDS,
  ORIENT_TIER_3_CARDS,
} from './cards';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initSplendorGame(
  rawPlayers: Array<{ id: string; name: string; avatar?: string }>,
  expansion: SplendorExpansion = 'none'
): SplendorState {
  const count = Math.max(2, Math.min(4, rawPlayers.length));
  const playersList = [...rawPlayers];

  while (playersList.length < 2) {
    const idx = playersList.length + 1;
    playersList.push({ id: `bot_${idx}`, name: `Merchant ${idx}`, avatar: '💎' });
  }

  // Gem tokens in bank by player count
  // 2 players: 4 each, 3 players: 5 each, 4 players: 7 each. 5 gold always.
  const gemCount = count === 2 ? 4 : count === 3 ? 5 : 7;
  const bank: GemTokens = {
    diamond: gemCount,
    sapphire: gemCount,
    emerald: gemCount,
    ruby: gemCount,
    onyx: gemCount,
    gold: 5,
  };

  // Prepare decks
  const decks: Record<CardTier, DevCard[]> = {
    1: shuffle(BASE_TIER_1_CARDS),
    2: shuffle(BASE_TIER_2_CARDS),
    3: shuffle(BASE_TIER_3_CARDS),
  };

  // Deal 4 cards per tier
  const market: Record<CardTier, (DevCard | null)[]> = {
    1: [decks[1].pop() || null, decks[1].pop() || null, decks[1].pop() || null, decks[1].pop() || null],
    2: [decks[2].pop() || null, decks[2].pop() || null, decks[2].pop() || null, decks[2].pop() || null],
    3: [decks[3].pop() || null, decks[3].pop() || null, decks[3].pop() || null, decks[3].pop() || null],
  };

  // Orient expansion setup
  let orientMarket: Record<CardTier, (DevCard | null)[]> | undefined;
  let orientDecks: Record<CardTier, DevCard[]> | undefined;

  if (expansion === 'orient') {
    orientDecks = {
      1: shuffle(ORIENT_TIER_1_CARDS),
      2: shuffle(ORIENT_TIER_2_CARDS),
      3: shuffle(ORIENT_TIER_3_CARDS),
    };
    orientMarket = {
      1: [orientDecks[1].pop() || null, orientDecks[1].pop() || null],
      2: [orientDecks[2].pop() || null, orientDecks[2].pop() || null],
      3: [orientDecks[3].pop() || null, orientDecks[3].pop() || null],
    };
  }

  // Nobles / Cities setup
  let nobles: NobleTile[] = [];
  let cities: CityTile[] | undefined;

  if (expansion === 'cities') {
    cities = shuffle(CITY_TILES).slice(0, 3);
  } else {
    // Player count + 1 nobles
    nobles = shuffle(NOBLE_TILES).slice(0, count + 1);
  }

  // Players
  const players: Record<string, SplendorPlayer> = {};
  const playerOrder: string[] = [];

  playersList.forEach((p) => {
    players[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      tokens: { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
      cards: [],
      reservedCards: [],
      nobles: [],
      claimedCity: null,
      prestige: 0,
    };
    playerOrder.push(p.id);
  });

  return {
    expansion,
    bank,
    market,
    decks,
    orientMarket,
    orientDecks,
    nobles,
    cities,
    players,
    playerOrder,
    currentTurnPlayerId: playerOrder[0],
    turnIndex: 0,
    finalRoundTriggered: false,
    roundStartPlayerId: playerOrder[0],
    phase: 'action',
    discardingPlayerId: null,
    winner: null,
    winReason: null,
    logs: [
      {
        id: `log_${Date.now()}`,
        message: 'The Renaissance gem market opens. Gem merchants take their seats!',
        timestamp: Date.now(),
      },
    ],
  };
}

export function getTotalTokens(tokens: GemTokens): number {
  return (
    tokens.diamond +
    tokens.sapphire +
    tokens.emerald +
    tokens.ruby +
    tokens.onyx +
    tokens.gold
  );
}

export function getPlayerGemBonuses(player: SplendorPlayer): Record<GemColor, number> {
  const bonuses: Record<GemColor, number> = {
    diamond: 0,
    sapphire: 0,
    emerald: 0,
    ruby: 0,
    onyx: 0,
  };
  player.cards.forEach((c) => {
    bonuses[c.gemBonus] += c.bonusCount || 1;
  });
  return bonuses;
}

export function canAffordCard(player: SplendorPlayer, card: DevCard): boolean {
  const bonuses = getPlayerGemBonuses(player);
  let goldNeeded = 0;

  for (const [colorStr, cost] of Object.entries(card.cost)) {
    const color = colorStr as GemColor;
    const effectiveCost = Math.max(0, (cost || 0) - bonuses[color]);
    const available = player.tokens[color];
    if (available < effectiveCost) {
      goldNeeded += effectiveCost - available;
    }
  }

  return player.tokens.gold >= goldNeeded;
}

export function splendorReducer(
  state: SplendorState,
  action: SplendorAction,
  actingPlayerId?: string
): SplendorState {
  if (state.phase === 'game_over' && action.type !== 'reset_game') {
    return state;
  }

  const playerId = actingPlayerId || state.currentTurnPlayerId;
  const player = state.players[playerId];
  if (!player && action.type !== 'reset_game') return state;

  switch (action.type) {
    case 'take_3_tokens': {
      if (state.phase !== 'action' || playerId !== state.currentTurnPlayerId) return state;
      const { colors } = action;

      // Must be 3 unique non-gold colors
      const uniqueColors = new Set(colors);
      if (uniqueColors.size !== 3) return state;
      for (const c of colors) {
        if (c === ('gold' as any) || state.bank[c] <= 0) {
          return state;
        }
      }

      const newBank = { ...state.bank };
      const newTokens = { ...player.tokens };

      colors.forEach((c) => {
        newBank[c]--;
        newTokens[c]++;
      });

      const updatedPlayer: SplendorPlayer = { ...player, tokens: newTokens };
      const nextState: SplendorState = {
        ...state,
        bank: newBank,
        players: { ...state.players, [playerId]: updatedPlayer },
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `${player.name} collected 3 gem tokens: ${colors.join(', ')}.`,
            timestamp: Date.now(),
          },
        ],
      };

      if (getTotalTokens(newTokens) > 10) {
        return {
          ...nextState,
          phase: 'discard_tokens',
          discardingPlayerId: playerId,
        };
      }

      return advanceTurn(nextState);
    }

    case 'take_2_tokens': {
      if (state.phase !== 'action' || playerId !== state.currentTurnPlayerId) return state;
      const { color } = action;

      // Rule: Can only take 2 tokens of same color if at least 4 available in bank
      if (color === ('gold' as any) || state.bank[color] < 4) {
        return state;
      }

      const newBank = { ...state.bank, [color]: state.bank[color] - 2 };
      const newTokens = { ...player.tokens, [color]: player.tokens[color] + 2 };

      const updatedPlayer: SplendorPlayer = { ...player, tokens: newTokens };
      const nextState: SplendorState = {
        ...state,
        bank: newBank,
        players: { ...state.players, [playerId]: updatedPlayer },
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `${player.name} collected 2 ${color} tokens from the stack.`,
            timestamp: Date.now(),
          },
        ],
      };

      if (getTotalTokens(newTokens) > 10) {
        return {
          ...nextState,
          phase: 'discard_tokens',
          discardingPlayerId: playerId,
        };
      }

      return advanceTurn(nextState);
    }

    case 'reserve_card': {
      if (state.phase !== 'action' || playerId !== state.currentTurnPlayerId) return state;
      if (player.reservedCards.length >= 3) return state; // Maximum 3 reserved cards

      const { cardId } = action;
      let targetCard: DevCard | null = null;
      let targetTier: CardTier = 1;
      let isOrient = false;
      let marketIndex = -1;

      // Check standard market
      for (const t of [1, 2, 3] as CardTier[]) {
        const idx = state.market[t].findIndex((c) => c?.id === cardId);
        if (idx !== -1) {
          targetCard = state.market[t][idx];
          targetTier = t;
          marketIndex = idx;
          break;
        }
      }

      // Check orient market if enabled
      if (!targetCard && state.orientMarket) {
        for (const t of [1, 2, 3] as CardTier[]) {
          const idx = state.orientMarket[t].findIndex((c) => c?.id === cardId);
          if (idx !== -1) {
            targetCard = state.orientMarket[t][idx];
            targetTier = t;
            isOrient = true;
            marketIndex = idx;
            break;
          }
        }
      }

      if (!targetCard) return state;

      // Grant 1 Gold Joker if available in bank
      const newBank = { ...state.bank };
      const newTokens = { ...player.tokens };
      if (newBank.gold > 0) {
        newBank.gold--;
        newTokens.gold++;
      }

      // Replace card in market
      const newDecks = { ...state.decks };
      const newMarket = { ...state.market };
      const newOrientDecks = state.orientDecks ? { ...state.orientDecks } : undefined;
      const newOrientMarket = state.orientMarket ? { ...state.orientMarket } : undefined;

      if (isOrient && newOrientMarket && newOrientDecks) {
        const tierDeck = [...newOrientDecks[targetTier]];
        const replacement = tierDeck.pop() || null;
        newOrientDecks[targetTier] = tierDeck;
        const tierCards = [...newOrientMarket[targetTier]];
        tierCards[marketIndex] = replacement;
        newOrientMarket[targetTier] = tierCards;
      } else {
        const tierDeck = [...newDecks[targetTier]];
        const replacement = tierDeck.pop() || null;
        newDecks[targetTier] = tierDeck;
        const tierCards = [...newMarket[targetTier]];
        tierCards[marketIndex] = replacement;
        newMarket[targetTier] = tierCards;
      }

      const updatedPlayer: SplendorPlayer = {
        ...player,
        tokens: newTokens,
        reservedCards: [...player.reservedCards, targetCard],
      };

      const nextState: SplendorState = {
        ...state,
        bank: newBank,
        decks: newDecks,
        market: newMarket,
        orientDecks: newOrientDecks,
        orientMarket: newOrientMarket,
        players: { ...state.players, [playerId]: updatedPlayer },
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `${player.name} reserved a Tier ${targetTier} card (${targetCard.gemBonus} bonus) and took 1 Gold Joker.`,
            timestamp: Date.now(),
          },
        ],
      };

      if (getTotalTokens(newTokens) > 10) {
        return {
          ...nextState,
          phase: 'discard_tokens',
          discardingPlayerId: playerId,
        };
      }

      return advanceTurn(nextState);
    }

    case 'reserve_from_deck': {
      if (state.phase !== 'action' || playerId !== state.currentTurnPlayerId) return state;
      if (player.reservedCards.length >= 3) return state;

      const { tier, isOrient } = action;
      const deck = isOrient && state.orientDecks ? state.orientDecks[tier] : state.decks[tier];
      if (!deck || deck.length === 0) return state;

      const newDeck = [...deck];
      const targetCard = newDeck.pop();
      if (!targetCard) return state;

      const newBank = { ...state.bank };
      const newTokens = { ...player.tokens };
      if (newBank.gold > 0) {
        newBank.gold--;
        newTokens.gold++;
      }

      const updatedPlayer: SplendorPlayer = {
        ...player,
        tokens: newTokens,
        reservedCards: [...player.reservedCards, targetCard],
      };

      const newDecks = { ...state.decks };
      const newOrientDecks = state.orientDecks ? { ...state.orientDecks } : undefined;

      if (isOrient && newOrientDecks) {
        newOrientDecks[tier] = newDeck;
      } else {
        newDecks[tier] = newDeck;
      }

      const nextState: SplendorState = {
        ...state,
        bank: newBank,
        decks: newDecks,
        orientDecks: newOrientDecks,
        players: { ...state.players, [playerId]: updatedPlayer },
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `${player.name} reserved a blind card from Tier ${tier} deck + 1 Gold Joker.`,
            timestamp: Date.now(),
          },
        ],
      };

      if (getTotalTokens(newTokens) > 10) {
        return {
          ...nextState,
          phase: 'discard_tokens',
          discardingPlayerId: playerId,
        };
      }

      return advanceTurn(nextState);
    }

    case 'buy_card': {
      if (state.phase !== 'action' || playerId !== state.currentTurnPlayerId) return state;
      const { cardId } = action;

      // Find card in reserved hand or market
      let targetCard: DevCard | null = null;
      let fromReserved = false;
      let targetTier: CardTier = 1;
      let isOrient = false;
      let marketIndex = -1;

      // 1. Check player's reserved cards
      const reservedIndex = player.reservedCards.findIndex((c) => c.id === cardId);
      if (reservedIndex !== -1) {
        targetCard = player.reservedCards[reservedIndex];
        fromReserved = true;
      }

      // 2. Check standard market
      if (!targetCard) {
        for (const t of [1, 2, 3] as CardTier[]) {
          const idx = state.market[t].findIndex((c) => c?.id === cardId);
          if (idx !== -1) {
            targetCard = state.market[t][idx];
            targetTier = t;
            marketIndex = idx;
            break;
          }
        }
      }

      // 3. Check orient market
      if (!targetCard && state.orientMarket) {
        for (const t of [1, 2, 3] as CardTier[]) {
          const idx = state.orientMarket[t].findIndex((c) => c?.id === cardId);
          if (idx !== -1) {
            targetCard = state.orientMarket[t][idx];
            targetTier = t;
            isOrient = true;
            marketIndex = idx;
            break;
          }
        }
      }

      if (!targetCard || !canAffordCard(player, targetCard)) return state;

      // Deduct gems & gold from player, return to bank
      const bonuses = getPlayerGemBonuses(player);
      const newPlayerTokens = { ...player.tokens };
      const newBank = { ...state.bank };

      for (const [colorStr, cost] of Object.entries(targetCard.cost)) {
        const color = colorStr as GemColor;
        const effectiveCost = Math.max(0, (cost || 0) - bonuses[color]);
        if (effectiveCost > 0) {
          const tokensPaid = Math.min(newPlayerTokens[color], effectiveCost);
          newPlayerTokens[color] -= tokensPaid;
          newBank[color] += tokensPaid;

          const remainder = effectiveCost - tokensPaid;
          if (remainder > 0) {
            newPlayerTokens.gold -= remainder;
            newBank.gold += remainder;
          }
        }
      }

      // Update reserved or market
      let newReservedCards = player.reservedCards;
      const newDecks = { ...state.decks };
      const newMarket = { ...state.market };
      const newOrientDecks = state.orientDecks ? { ...state.orientDecks } : undefined;
      const newOrientMarket = state.orientMarket ? { ...state.orientMarket } : undefined;

      if (fromReserved) {
        newReservedCards = player.reservedCards.filter((c) => c.id !== cardId);
      } else if (isOrient && newOrientMarket && newOrientDecks) {
        const tierDeck = [...newOrientDecks[targetTier]];
        const replacement = tierDeck.pop() || null;
        newOrientDecks[targetTier] = tierDeck;
        const tierCards = [...newOrientMarket[targetTier]];
        tierCards[marketIndex] = replacement;
        newOrientMarket[targetTier] = tierCards;
      } else {
        const tierDeck = [...newDecks[targetTier]];
        const replacement = tierDeck.pop() || null;
        newDecks[targetTier] = tierDeck;
        const tierCards = [...newMarket[targetTier]];
        tierCards[marketIndex] = replacement;
        newMarket[targetTier] = tierCards;
      }

      const updatedPlayer: SplendorPlayer = {
        ...player,
        tokens: newPlayerTokens,
        cards: [...player.cards, targetCard],
        reservedCards: newReservedCards,
        prestige: player.prestige + targetCard.prestige,
      };

      let nextState: SplendorState = {
        ...state,
        bank: newBank,
        decks: newDecks,
        market: newMarket,
        orientDecks: newOrientDecks,
        orientMarket: newOrientMarket,
        players: { ...state.players, [playerId]: updatedPlayer },
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `${player.name} bought a Tier ${targetCard.tier} card for ${targetCard.prestige} prestige (+1 ${targetCard.gemBonus} bonus).`,
            timestamp: Date.now(),
          },
        ],
      };

      // Check Noble visits (Base/Orient) or City claiming (Cities module)
      nextState = checkPatronVisits(nextState, playerId);

      return advanceTurn(nextState);
    }

    case 'discard_tokens': {
      if (state.phase !== 'discard_tokens' || playerId !== state.discardingPlayerId) {
        return state;
      }

      const newTokens = { ...player.tokens };
      const newBank = { ...state.bank };

      for (const [tType, count] of Object.entries(action.tokens)) {
        const token = tType as TokenType;
        const amount = count || 0;
        if (amount > 0 && newTokens[token] >= amount) {
          newTokens[token] -= amount;
          newBank[token] += amount;
        }
      }

      if (getTotalTokens(newTokens) > 10) {
        // Still over 10 tokens!
        return {
          ...state,
          bank: newBank,
          players: { ...state.players, [playerId]: { ...player, tokens: newTokens } },
        };
      }

      // Done discarding
      const resolvedState: SplendorState = {
        ...state,
        bank: newBank,
        players: { ...state.players, [playerId]: { ...player, tokens: newTokens } },
        phase: 'action',
        discardingPlayerId: null,
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `${player.name} discarded excess tokens down to 10.`,
            timestamp: Date.now(),
          },
        ],
      };

      return advanceTurn(resolvedState);
    }

    case 'reset_game': {
      return initSplendorGame(
        state.playerOrder.map((id) => ({
          id,
          name: state.players[id].name,
          avatar: state.players[id].avatar,
        })),
        state.expansion
      );
    }

    default:
      return state;
  }
}

function checkPatronVisits(state: SplendorState, playerId: string): SplendorState {
  const player = state.players[playerId];
  if (!player) return state;

  const bonuses = getPlayerGemBonuses(player);

  if (state.expansion === 'cities' && state.cities) {
    // Check if player qualifies for any available City tile
    const claimedCity = state.cities.find((city) => {
      if (player.prestige < city.minPrestige) return false;
      for (const [color, req] of Object.entries(city.requirements)) {
        if (bonuses[color as GemColor] < (req || 0)) return false;
      }
      return true;
    });

    if (claimedCity && !player.claimedCity) {
      return {
        ...state,
        finalRoundTriggered: true,
        cities: state.cities.filter((c) => c.id !== claimedCity.id),
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            claimedCity,
          },
        },
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            message: `🏛️ ${player.name} has fulfilled the conditions of ${claimedCity.name} and claimed the city! Final round triggered!`,
            timestamp: Date.now(),
          },
        ],
      };
    }
    return state;
  }

  // Base Game / Orient: Check Noble visit (max 1 noble per turn)
  const eligibleNoble = state.nobles.find((noble) => {
    for (const [color, req] of Object.entries(noble.requirements)) {
      if (bonuses[color as GemColor] < (req || 0)) return false;
    }
    return true;
  });

  if (eligibleNoble) {
    const updatedPlayer: SplendorPlayer = {
      ...player,
      nobles: [...player.nobles, eligibleNoble],
      prestige: player.prestige + eligibleNoble.prestige,
    };

    const nextState: SplendorState = {
      ...state,
      nobles: state.nobles.filter((n) => n.id !== eligibleNoble.id),
      players: {
        ...state.players,
        [playerId]: updatedPlayer,
      },
      logs: [
        ...state.logs,
        {
          id: `log_${Date.now()}`,
          message: `👑 Noble Patron ${eligibleNoble.name} was impressed by ${player.name}'s gems and granted 3 Prestige!`,
          timestamp: Date.now(),
        },
      ],
    };

    if (updatedPlayer.prestige >= 15) {
      nextState.finalRoundTriggered = true;
    }

    return nextState;
  }

  if (player.prestige >= 15) {
    return {
      ...state,
      finalRoundTriggered: true,
    };
  }

  return state;
}

function advanceTurn(state: SplendorState): SplendorState {
  const currentIndex = state.playerOrder.indexOf(state.currentTurnPlayerId);
  const nextIndex = (currentIndex + 1) % state.playerOrder.length;
  const nextPlayerId = state.playerOrder[nextIndex];
  const newTurnIndex = state.turnIndex + 1;

  // Check if round completed and final round was triggered
  if (state.finalRoundTriggered && nextPlayerId === state.roundStartPlayerId) {
    return resolveGameOver(state);
  }

  return {
    ...state,
    currentTurnPlayerId: nextPlayerId,
    turnIndex: newTurnIndex,
    phase: 'action',
    discardingPlayerId: null,
  };
}

function resolveGameOver(state: SplendorState): SplendorState {
  let winnerId = state.playerOrder[0];
  let highestPrestige = -1;
  let fewestCards = 9999;

  if (state.expansion === 'cities') {
    // City claims take priority
    const cityClaimants = state.playerOrder.filter((id) => Boolean(state.players[id].claimedCity));
    if (cityClaimants.length > 0) {
      cityClaimants.sort((a, b) => state.players[b].prestige - state.players[a].prestige);
      winnerId = cityClaimants[0];
    }
  } else {
    // Highest prestige; tiebreaker: fewest dev cards
    state.playerOrder.forEach((id) => {
      const p = state.players[id];
      if (
        p.prestige > highestPrestige ||
        (p.prestige === highestPrestige && p.cards.length < fewestCards)
      ) {
        highestPrestige = p.prestige;
        fewestCards = p.cards.length;
        winnerId = id;
      }
    });
  }

  const winner = state.players[winnerId];
  const winReason = `${winner.name} triumphed with ${winner.prestige} prestige points (${winner.cards.length} cards, ${winner.nobles.length} nobles)!`;

  return {
    ...state,
    phase: 'game_over',
    winner: winnerId,
    winReason,
    logs: [
      ...state.logs,
      {
        id: `log_${Date.now()}`,
        message: `🏆 GAME OVER! ${winReason}`,
        timestamp: Date.now(),
      },
    ],
  };
}
