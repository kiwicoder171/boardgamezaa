import { Player } from '@/types/game';
import {
  ForSaleAction,
  ForSaleLog,
  ForSalePhase,
  ForSaleSettings,
  ForSaleState,
  Phase2RoundResult,
  PlayerForSaleState,
  PropertyCard,
  CheckCard,
} from './types';
import { PROPERTY_CARDS, generateCheckDeck } from './cards';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initForSaleState(
  players: Player[],
  _settings?: ForSaleSettings
): ForSaleState {
  const numPlayers = players.length;
  // Starting coins: 3-4 players get 18 coins ($18,000), 5-6 players get 14 coins ($14,000)
  const startingCoins = numPlayers <= 4 ? 18 : 14;

  // Deck pruning:
  // 3 players: remove 6 properties & 6 checks (24 remain -> 8 rounds)
  // 4 players: remove 2 properties & 2 checks (28 remain -> 7 rounds)
  // 5 players: remove 0 (30 remain -> 6 rounds)
  // 6 players: remove 0 (30 remain -> 5 rounds)
  let pruneCount = 0;
  if (numPlayers === 3) pruneCount = 6;
  else if (numPlayers === 4) pruneCount = 2;

  const shuffledProperties = shuffle(PROPERTY_CARDS);
  const shuffledChecks = shuffle(generateCheckDeck());

  const activePropertyDeck = shuffledProperties.slice(pruneCount);
  const activeCheckDeck = shuffledChecks.slice(pruneCount);

  const totalRounds = activePropertyDeck.length / numPlayers;

  // Turn order
  const turnOrder = players.map((p) => p.id);

  const playerStates: Record<string, PlayerForSaleState> = {};
  players.forEach((p) => {
    playerStates[p.id] = {
      playerId: p.id,
      coins: startingCoins,
      currentBid: 0,
      hasPassed: false,
      properties: [],
      checks: [],
      selectedPropertyId: null,
      isLockedIn: false,
    };
  });

  // Deal first round of properties
  const tableProperties = activePropertyDeck.splice(0, numPlayers);
  tableProperties.sort((a, b) => a.rank - b.rank);

  const logs: ForSaleLog[] = [
    {
      timestamp: Date.now(),
      text: `Game started with ${numPlayers} players. Each player receives ${startingCoins} Cash Coins ($${startingCoins},000).`,
      textTh: `เกมเริ่มต้นด้วยผู้เล่น ${numPlayers} คน ทุกคนได้รับเหรียญเงินสด ${startingCoins} เหรียญ ($${startingCoins},000)`,
      type: 'system',
    },
    {
      timestamp: Date.now(),
      text: `Phase 1 (Real Estate Auction) Round 1: ${tableProperties.length} properties revealed!`,
      textTh: `รอบที่ 1 การประมูลอสังหาริมทรัพย์: เปิดการ์ดบ้าน ${tableProperties.length} หลัง!`,
      type: 'system',
    },
  ];

  return {
    phase: 'phase1_auction',
    round: 1,
    totalRounds,
    activePlayerIndex: 0,
    currentHighBid: 0,
    highBidderId: null,
    propertyDeck: activePropertyDeck,
    checkDeck: activeCheckDeck,
    tableProperties,
    tableChecks: [],
    players: playerStates,
    turnOrder,
    logs,
    winnerId: null,
  };
}

export function forSaleReducer(
  state: ForSaleState,
  action: ForSaleAction
): ForSaleState {
  switch (action.type) {
    case 'BID': {
      if (state.phase !== 'phase1_auction') return state;
      const player = state.players[action.playerId];
      if (!player || player.hasPassed) return state;

      const activePlayerId = state.turnOrder[state.activePlayerIndex];
      if (activePlayerId !== action.playerId) return state;

      const bidAmount = action.amount;
      if (bidAmount <= state.currentHighBid || bidAmount > player.coins) {
        return state;
      }

      const updatedPlayers = {
        ...state.players,
        [action.playerId]: {
          ...player,
          currentBid: bidAmount,
        },
      };

      const newLogs: ForSaleLog[] = [
        ...state.logs,
        {
          timestamp: Date.now(),
          text: `Player raised bid to ${bidAmount} coins ($${bidAmount},000).`,
          textTh: `ผู้เล่นเพิ่มเงินประมูลเป็น ${bidAmount} เหรียญ`,
          type: 'bid',
        },
      ];

      // Advance to next active bidder
      const nextIndex = getNextActivePlayerIndex(
        state.turnOrder,
        updatedPlayers,
        state.activePlayerIndex
      );

      return {
        ...state,
        players: updatedPlayers,
        currentHighBid: bidAmount,
        highBidderId: action.playerId,
        activePlayerIndex: nextIndex,
        logs: newLogs,
      };
    }

    case 'PASS': {
      if (state.phase !== 'phase1_auction') return state;
      const player = state.players[action.playerId];
      if (!player || player.hasPassed) return state;

      const activePlayerId = state.turnOrder[state.activePlayerIndex];
      if (activePlayerId !== action.playerId) return state;

      // When passing, take the lowest property remaining on the table
      const remainingTableProps = [...state.tableProperties];
      const lowestProperty = remainingTableProps.shift();
      if (!lowestProperty) return state;

      // Half of bid rounded down is refunded, other half is paid to bank
      const refund = Math.floor(player.currentBid / 2);
      const paid = player.currentBid - refund;
      const newCoins = player.coins - paid;

      const updatedPassingPlayer: PlayerForSaleState = {
        ...player,
        coins: newCoins,
        hasPassed: true,
        lastRefund: refund,
        lastAcquiredProperty: lowestProperty,
        properties: [...player.properties, lowestProperty].sort(
          (a, b) => a.rank - b.rank
        ),
      };

      const updatedPlayers = {
        ...state.players,
        [action.playerId]: updatedPassingPlayer,
      };

      const remainingActivePlayers = state.turnOrder.filter(
        (id) => !updatedPlayers[id].hasPassed
      );

      const logs: ForSaleLog[] = [
        ...state.logs,
        {
          timestamp: Date.now(),
          text: `Passed! Paid ${paid} coins (refunded ${refund}) and claimed #${lowestProperty.rank} ${lowestProperty.name}.`,
          textTh: `ผ่าน! จ่าย ${paid} เหรียญ (ได้คืน ${refund}) ได้รับ #${lowestProperty.rank} ${lowestProperty.nameTh}`,
          type: 'pass',
        },
      ];

      // Check if only 1 player remains in this auction round
      if (remainingActivePlayers.length === 1) {
        const lastPlayerId = remainingActivePlayers[0];
        const lastPlayer = updatedPlayers[lastPlayerId];

        // Last player takes the remaining highest property on the table
        const highestProperty = remainingTableProps.pop();
        if (highestProperty) {
          // Last player pays 100% of their bid!
          const winnerNewCoins = lastPlayer.coins - lastPlayer.currentBid;
          updatedPlayers[lastPlayerId] = {
            ...lastPlayer,
            coins: winnerNewCoins,
            hasPassed: true,
            lastRefund: 0,
            lastAcquiredProperty: highestProperty,
            properties: [...lastPlayer.properties, highestProperty].sort(
              (a, b) => a.rank - b.rank
            ),
          };

          logs.push({
            timestamp: Date.now(),
            text: `Won the auction! Paid full bid of ${lastPlayer.currentBid} coins and claimed #${highestProperty.rank} ${highestProperty.name}.`,
            textTh: `ชนะการประมูล! จ่ายเต็มจำนวน ${lastPlayer.currentBid} เหรียญ ได้รับ #${highestProperty.rank} ${highestProperty.nameTh}`,
            type: 'win',
          });
        }

        // Check if there are more properties to auction
        const numPlayers = state.turnOrder.length;
        if (state.propertyDeck.length >= numPlayers) {
          // Start next auction round
          const nextPropertyDeck = [...state.propertyDeck];
          const nextTableProperties = nextPropertyDeck.splice(0, numPlayers);
          nextTableProperties.sort((a, b) => a.rank - b.rank);

          // Reset round bids and passed status
          state.turnOrder.forEach((id) => {
            updatedPlayers[id] = {
              ...updatedPlayers[id],
              currentBid: 0,
              hasPassed: false,
            };
          });

          // The winner starts the next round
          const winnerIndex = state.turnOrder.indexOf(lastPlayerId);

          logs.push({
            timestamp: Date.now(),
            text: `Phase 1 Round ${state.round + 1}: ${nextTableProperties.length} new properties on the block!`,
            textTh: `รอบที่ ${state.round + 1}: เปิดการ์ดบ้านชุดใหม่ ${nextTableProperties.length} หลัง!`,
            type: 'system',
          });

          return {
            ...state,
            round: state.round + 1,
            phase: 'phase1_auction',
            propertyDeck: nextPropertyDeck,
            tableProperties: nextTableProperties,
            players: updatedPlayers,
            currentHighBid: 0,
            highBidderId: null,
            activePlayerIndex: winnerIndex >= 0 ? winnerIndex : 0,
            logs,
          };
        } else {
          // Transition to Phase 2: Selling for Checks!
          const nextCheckDeck = [...state.checkDeck];
          const firstTableChecks = nextCheckDeck.splice(0, numPlayers);
          firstTableChecks.sort((a, b) => a.value - b.value);

          // Reset players for Phase 2
          state.turnOrder.forEach((id) => {
            updatedPlayers[id] = {
              ...updatedPlayers[id],
              currentBid: 0,
              hasPassed: false,
              selectedPropertyId: null,
              isLockedIn: false,
            };
          });

          logs.push({
            timestamp: Date.now(),
            text: `All properties acquired! Entering Phase 2: Selling Properties for Checks!`,
            textTh: `ประมูลอสังหาริมทรัพย์ครบแล้ว! เข้าสู่เฟส 2: ขายบ้านเพื่อรับเช็คเงินสด!`,
            type: 'system',
          });

          return {
            ...state,
            phase: 'phase2_selling',
            round: 1,
            checkDeck: nextCheckDeck,
            tableProperties: [],
            tableChecks: firstTableChecks,
            players: updatedPlayers,
            currentHighBid: 0,
            highBidderId: null,
            logs,
          };
        }
      }

      // More than 1 player remains in this round: continue to next bidder
      const nextIndex = getNextActivePlayerIndex(
        state.turnOrder,
        updatedPlayers,
        state.activePlayerIndex
      );

      return {
        ...state,
        tableProperties: remainingTableProps,
        players: updatedPlayers,
        activePlayerIndex: nextIndex,
        logs,
      };
    }

    case 'SELECT_PROPERTY': {
      if (state.phase !== 'phase2_selling') return state;
      const player = state.players[action.playerId];
      if (!player) return state;

      // Verify the player owns this property
      const ownsCard = player.properties.some((p) => p.id === action.propertyId);
      if (!ownsCard) return state;

      const updatedPlayers = {
        ...state.players,
        [action.playerId]: {
          ...player,
          selectedPropertyId: action.propertyId,
          isLockedIn: true,
        },
      };

      // Check if all players have locked in
      const allLocked = state.turnOrder.every(
        (id) => updatedPlayers[id].isLockedIn
      );

      if (!allLocked) {
        return {
          ...state,
          players: updatedPlayers,
        };
      }

      // All players locked in: REVEAL & DISTRIBUTE CHECKS!
      // Sort played cards in ascending order of property rank
      const playerChoices = state.turnOrder.map((id) => {
        const p = updatedPlayers[id];
        const card = p.properties.find((c) => c.id === p.selectedPropertyId)!;
        return {
          playerId: id,
          property: card,
        };
      });

      // Sort players ascending by property rank
      playerChoices.sort((a, b) => a.property.rank - b.property.rank);

      // Current table checks sorted ascending
      const sortedChecks = [...state.tableChecks].sort(
        (a, b) => a.value - b.value
      );

      const roundResults: Phase2RoundResult[] = [];
      const newLogs: ForSaleLog[] = [...state.logs];

      playerChoices.forEach((choice, index) => {
        const check = sortedChecks[index];
        const p = updatedPlayers[choice.playerId];

        // Remove played property from hand and add check to portfolio
        const remainingProps = p.properties.filter(
          (card) => card.id !== choice.property.id
        );
        updatedPlayers[choice.playerId] = {
          ...p,
          properties: remainingProps,
          checks: [...p.checks, check],
          lastAcquiredCheck: check,
        };

        roundResults.push({
          playerId: choice.playerId,
          property: choice.property,
          check,
        });

        newLogs.push({
          timestamp: Date.now(),
          text: `Sold #${choice.property.rank} ${choice.property.name} for $${check.value},000 check.`,
          textTh: `ขาย #${choice.property.rank} ${choice.property.nameTh} ได้เช็ค $${check.value},000`,
          type: 'sale',
        });
      });

      return {
        ...state,
        phase: 'phase2_reveal',
        players: updatedPlayers,
        lastRoundResults: roundResults,
        logs: newLogs,
      };
    }

    case 'CONTINUE_NEXT_ROUND': {
      if (state.phase !== 'phase2_reveal') return state;

      const numPlayers = state.turnOrder.length;
      const updatedPlayers = { ...state.players };

      // Check if more checks remain
      if (state.checkDeck.length >= numPlayers) {
        const nextCheckDeck = [...state.checkDeck];
        const nextTableChecks = nextCheckDeck.splice(0, numPlayers);
        nextTableChecks.sort((a, b) => a.value - b.value);

        // Reset lock-in status
        state.turnOrder.forEach((id) => {
          updatedPlayers[id] = {
            ...updatedPlayers[id],
            selectedPropertyId: null,
            isLockedIn: false,
            lastAcquiredCheck: null,
          };
        });

        const newLogs: ForSaleLog[] = [
          ...state.logs,
          {
            timestamp: Date.now(),
            text: `Phase 2 Round ${state.round + 1}: ${nextTableChecks.length} new checks on the market!`,
            textTh: `รอบที่ ${state.round + 1}: มีเช็คชุดใหม่ ${nextTableChecks.length} ใบในตลาด!`,
            type: 'system',
          },
        ];

        return {
          ...state,
          phase: 'phase2_selling',
          round: state.round + 1,
          checkDeck: nextCheckDeck,
          tableChecks: nextTableChecks,
          players: updatedPlayers,
          lastRoundResults: undefined,
          logs: newLogs,
        };
      } else {
        // Game Over! Tally final scores
        let bestScore = -1;
        let winnerId: string | null = null;
        let bestCoins = -1;

        state.turnOrder.forEach((id) => {
          const p = updatedPlayers[id];
          const totalCheckValue = p.checks.reduce((acc, c) => acc + c.value, 0);
          const totalScore = totalCheckValue + p.coins;

          if (
            totalScore > bestScore ||
            (totalScore === bestScore && p.coins > bestCoins)
          ) {
            bestScore = totalScore;
            bestCoins = p.coins;
            winnerId = id;
          }
        });

        return {
          ...state,
          phase: 'game_over',
          winnerId,
          logs: [
            ...state.logs,
            {
              timestamp: Date.now(),
              text: `Game concluded! Winner decided with $${bestScore},000 total wealth!`,
              textTh: `จบเกม! ผู้ชนะทำมูลค่าทรัพย์สินรวมได้ถึง $${bestScore},000!`,
              type: 'system',
            },
          ],
        };
      }
    }

    case 'RESTART_GAME': {
      const dummyPlayers = state.turnOrder.map((id) => ({
        id,
        socketId: id,
        name: `Player ${id}`,
        avatar: '🎲',
        isHost: false,
        isReady: true,
        connected: true,
      }));
      return initForSaleState(dummyPlayers);
    }

    default:
      return state;
  }
}

function getNextActivePlayerIndex(
  turnOrder: string[],
  players: Record<string, PlayerForSaleState>,
  currentIndex: number
): number {
  const total = turnOrder.length;
  for (let i = 1; i <= total; i++) {
    const idx = (currentIndex + i) % total;
    const pid = turnOrder[idx];
    if (!players[pid].hasPassed) {
      return idx;
    }
  }
  return currentIndex;
}

/**
 * Anti-cheat state sanitizer:
 * In Phase 2 before reveal, hides the selected property of other players.
 */
export function sanitizeForSaleState(
  state: ForSaleState,
  viewerPlayerId: string
): ForSaleState {
  if (state.phase !== 'phase2_selling') {
    return state;
  }

  const sanitizedPlayers: Record<string, PlayerForSaleState> = {};
  Object.keys(state.players).forEach((id) => {
    const player = state.players[id];
    if (id === viewerPlayerId) {
      sanitizedPlayers[id] = player;
    } else {
      sanitizedPlayers[id] = {
        ...player,
        selectedPropertyId: null, // Masked!
        isLockedIn: player.isLockedIn,
      };
    }
  });

  return {
    ...state,
    players: sanitizedPlayers,
  };
}

/**
 * Intelligent Bot AI for For Sale:
 * Automatically plays in Phase 1 (bidding/passing) and Phase 2 (card matching).
 */
export function getForSaleBotAction(
  state: ForSaleState,
  botPlayerId: string
): ForSaleAction | null {
  const bot = state.players[botPlayerId];
  if (!bot) return null;

  // Phase 1: Bidding
  if (state.phase === 'phase1_auction') {
    const activePlayerId = state.turnOrder[state.activePlayerIndex];
    if (activePlayerId !== botPlayerId || bot.hasPassed) return null;

    const currentHigh = state.currentHighBid;
    const availableCoins = bot.coins;

    // Table property spread
    const maxRankOnTable =
      state.tableProperties[state.tableProperties.length - 1]?.rank || 15;
    const minRankOnTable = state.tableProperties[0]?.rank || 1;
    const rankSpread = maxRankOnTable - minRankOnTable;

    // If bot cannot raise, must pass
    if (currentHigh >= availableCoins) {
      return { type: 'PASS', playerId: botPlayerId };
    }

    // If nobody has bid yet (high bid = 0)
    if (currentHigh === 0) {
      return { type: 'BID', playerId: botPlayerId, amount: 1 };
    }

    // Bid ceiling based on property value and remaining liquid coins
    // High rank houses (20-30) are worth fighting for, low ones (1-10) are passed early.
    const maxWillingToBid = Math.min(
      availableCoins,
      Math.max(1, Math.floor(maxRankOnTable / 4) + (rankSpread > 10 ? 2 : 0))
    );

    if (currentHigh + 1 <= maxWillingToBid) {
      // Small chance to bluff or raise
      return { type: 'BID', playerId: botPlayerId, amount: currentHigh + 1 };
    } else {
      return { type: 'PASS', playerId: botPlayerId };
    }
  }

  // Phase 2: Selling
  if (state.phase === 'phase2_selling') {
    if (bot.isLockedIn || bot.properties.length === 0) return null;

    // Check table checks
    const sortedChecks = [...state.tableChecks].sort((a, b) => a.value - b.value);
    const maxCheck = sortedChecks[sortedChecks.length - 1]?.value || 0;
    const minCheck = sortedChecks[0]?.value || 0;

    const sortedBotProps = [...bot.properties].sort((a, b) => a.rank - b.rank);

    // If max check is huge ($12k-$15k), play our highest card!
    if (maxCheck >= 12) {
      const bestCard = sortedBotProps[sortedBotProps.length - 1];
      return {
        type: 'SELECT_PROPERTY',
        playerId: botPlayerId,
        propertyId: bestCard.id,
      };
    }

    // If min check is $0k and average is low, dump our lowest card!
    if (minCheck === 0 && maxCheck <= 6) {
      const lowestCard = sortedBotProps[0];
      return {
        type: 'SELECT_PROPERTY',
        playerId: botPlayerId,
        propertyId: lowestCard.id,
      };
    }

    // Otherwise pick a balanced card proportional to the top check
    const ratio = Math.min(1, maxCheck / 15);
    const targetIndex = Math.min(
      sortedBotProps.length - 1,
      Math.floor(ratio * sortedBotProps.length)
    );
    const chosenCard = sortedBotProps[targetIndex] || sortedBotProps[0];

    return {
      type: 'SELECT_PROPERTY',
      playerId: botPlayerId,
      propertyId: chosenCard.id,
    };
  }

  return null;
}
