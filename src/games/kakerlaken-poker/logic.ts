import { Player, Room } from '@/types/game';
import {
  Card,
  CreatureType,
  CREATURE_METAS,
  KakerlakenPokerAction,
  KakerlakenPokerClientState,
  KakerlakenPokerSettings,
  KakerlakenPokerState,
  RoundResolution,
} from './types';

const ALL_CREATURES: CreatureType[] = [
  'cockroach',
  'bat',
  'fly',
  'toad',
  'rat',
  'scorpion',
  'stink_bug',
  'spider',
];

// Shuffle helper using Fisher-Yates
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate the 64-card deck (8 creatures x 8 cards each)
export function createDeck(): Card[] {
  const deck: Card[] = [];
  let cardSeq = 1;
  for (const creature of ALL_CREATURES) {
    for (let i = 0; i < 8; i++) {
      deck.push({
        id: `card_${creature}_${cardSeq++}`,
        creature,
      });
    }
  }
  return shuffle(deck);
}

export function initKakerlakenPokerState(
  players: Player[],
  settings?: KakerlakenPokerSettings
): KakerlakenPokerState {
  const deck = createDeck();
  const hands: Record<string, Card[]> = {};
  const tableaus: Record<string, Card[]> = {};

  players.forEach((p) => {
    hands[p.id] = [];
    tableaus[p.id] = [];
  });

  // Deal cards evenly to all players
  deck.forEach((card, idx) => {
    const playerIndex = idx % players.length;
    const recipient = players[playerIndex];
    if (recipient) {
      hands[recipient.id].push(card);
    }
  });

  // Randomize first active player
  const firstPlayerIndex = Math.floor(Math.random() * players.length);
  const firstPlayer = players[firstPlayerIndex] || players[0];

  return {
    hands,
    tableaus,
    activeCard: null,
    phase: 'offering',
    currentTurnPlayerId: firstPlayer.id,
    loserPlayerId: null,
    lossReason: null,
    lastResolution: null,
    roundNumber: 1,
    history: [
      {
        id: 'start',
        type: 'system',
        text: `🃏 Game started! 64 creature cards dealt to ${players.length} players. First turn: ${firstPlayer.name}.`,
        timestamp: Date.now(),
      },
    ],
  };
}

export function handleKakerlakenPokerAction(
  state: KakerlakenPokerState,
  action: KakerlakenPokerAction,
  playerId: string,
  room: Room<KakerlakenPokerState, KakerlakenPokerSettings>
): { newState: KakerlakenPokerState; events?: string[]; error?: string } {
  // If game is over, reject all gameplay actions
  if (state.phase === 'game_over') {
    return { newState: state, error: 'Game is already over.' };
  }

  const newState: KakerlakenPokerState = JSON.parse(JSON.stringify(state));
  const player = room.players.find((p) => p.id === playerId);
  const playerName = player?.name || 'Player';

  switch (action.type) {
    case 'OFFER_CARD': {
      if (newState.phase !== 'offering') {
        return { newState: state, error: 'Cannot offer card outside offering phase.' };
      }
      if (newState.currentTurnPlayerId !== playerId) {
        return { newState: state, error: 'Not your turn to offer a card.' };
      }
      if (action.targetPlayerId === playerId) {
        return { newState: state, error: 'Cannot offer a card to yourself.' };
      }
      const targetPlayer = room.players.find((p) => p.id === action.targetPlayerId);
      if (!targetPlayer) {
        return { newState: state, error: 'Target player not found.' };
      }

      const playerHand = newState.hands[playerId] || [];
      const cardIndex = playerHand.findIndex((c) => c.id === action.cardId);
      if (cardIndex === -1) {
        return { newState: state, error: 'Card not found in your hand.' };
      }

      // Remove card from player hand
      const [offeredCard] = playerHand.splice(cardIndex, 1);
      newState.hands[playerId] = playerHand;

      // Set active offer
      newState.activeCard = {
        card: offeredCard,
        originalSenderId: playerId,
        currentSenderId: playerId,
        currentReceiverId: action.targetPlayerId,
        declaredCreature: action.declaredCreature,
        seenByPlayerIds: [playerId],
      };

      newState.phase = 'deciding';
      const meta = CREATURE_METAS[action.declaredCreature];
      newState.history.push({
        id: `offer_${Date.now()}`,
        type: 'offer',
        text: `📤 ${playerName} slid a card face-down to ${targetPlayer.name}, declaring: ${meta.emoji} ${meta.nameEn} (${meta.nameTh})!`,
        timestamp: Date.now(),
      });

      return {
        newState,
        events: ['card_offered'],
      };
    }

    case 'PEEK_AND_PASS': {
      if (newState.phase !== 'deciding') {
        return { newState: state, error: 'Cannot pass card outside deciding phase.' };
      }
      if (!newState.activeCard) {
        return { newState: state, error: 'No active card to pass.' };
      }
      if (newState.activeCard.currentReceiverId !== playerId) {
        return { newState: state, error: 'You are not the receiver of this card.' };
      }
      if (action.targetPlayerId === playerId) {
        return { newState: state, error: 'Cannot pass card to yourself.' };
      }

      // Cannot pass to someone who has already held/seen this card this round
      if (newState.activeCard.seenByPlayerIds.includes(action.targetPlayerId)) {
        return {
          newState: state,
          error: 'Cannot pass to someone who has already held this card this round!',
        };
      }

      // Check if all other players have seen the card
      const availablePassTargets = room.players.filter(
        (p) => !newState.activeCard!.seenByPlayerIds.includes(p.id)
      );
      if (availablePassTargets.length === 0) {
        return {
          newState: state,
          error: 'You are the last player who can see this card! You must guess True or False.',
        };
      }

      const targetPlayer = room.players.find((p) => p.id === action.targetPlayerId);
      if (!targetPlayer) {
        return { newState: state, error: 'Target player not found.' };
      }

      // Record that current receiver has seen the card
      if (!newState.activeCard.seenByPlayerIds.includes(playerId)) {
        newState.activeCard.seenByPlayerIds.push(playerId);
      }

      newState.activeCard.currentSenderId = playerId;
      newState.activeCard.currentReceiverId = action.targetPlayerId;
      newState.activeCard.declaredCreature = action.declaredCreature;

      const meta = CREATURE_METAS[action.declaredCreature];
      newState.history.push({
        id: `pass_${Date.now()}`,
        type: 'pass',
        text: `👀 ${playerName} secretly peeked at the card and passed it to ${targetPlayer.name}, declaring: ${meta.emoji} ${meta.nameEn} (${meta.nameTh})!`,
        timestamp: Date.now(),
      });

      return {
        newState,
        events: ['card_passed'],
      };
    }

    case 'GUESS': {
      if (newState.phase !== 'deciding') {
        return { newState: state, error: 'Cannot guess outside deciding phase.' };
      }
      if (!newState.activeCard) {
        return { newState: state, error: 'No active card to guess on.' };
      }
      if (newState.activeCard.currentReceiverId !== playerId) {
        return { newState: state, error: 'You are not the receiver of this card.' };
      }

      const active = newState.activeCard;
      const actualCreature = active.card.creature;
      const declaredCreature = active.declaredCreature;
      const isTruth = actualCreature === declaredCreature;

      // Guess logic:
      // If guess is 'true', guesser expects isTruth === true
      // If guess is 'false', guesser expects isTruth === false
      const wasCorrect = action.guess === 'true' ? isTruth : !isTruth;

      const currentSender = room.players.find((p) => p.id === active.currentSenderId);
      const currentReceiver = room.players.find((p) => p.id === active.currentReceiverId);
      const senderName = currentSender?.name || 'Sender';
      const receiverName = currentReceiver?.name || 'Receiver';

      // If guesser was correct, the sender takes the card!
      // If guesser was wrong, the guesser (receiver) takes the card!
      const recipientId = wasCorrect ? active.currentSenderId : active.currentReceiverId;
      const recipientPlayer = room.players.find((p) => p.id === recipientId);
      const recipientName = recipientPlayer?.name || 'Player';

      const actualMeta = CREATURE_METAS[actualCreature];
      const declaredMeta = CREATURE_METAS[declaredCreature];

      // Add to recipient's tableau
      if (!newState.tableaus[recipientId]) {
        newState.tableaus[recipientId] = [];
      }
      newState.tableaus[recipientId].push(active.card);

      const resolutionText = wasCorrect
        ? `🎯 ${receiverName} correctly called "${action.guess === 'true' ? 'TRUE' : 'FALSE'}"! The card is indeed ${actualMeta.emoji} ${actualMeta.nameEn} (Declared: ${declaredMeta.nameEn}). ${senderName} must take the card face-up!`
        : `❌ ${receiverName} incorrectly called "${action.guess === 'true' ? 'TRUE' : 'FALSE'}"! The card was ${actualMeta.emoji} ${actualMeta.nameEn} (Declared: ${declaredMeta.nameEn}). ${receiverName} fell for the bluff and takes the card face-up!`;

      const resolution: RoundResolution = {
        card: active.card,
        declaredCreature,
        guesserId: playerId,
        challengerId: active.currentSenderId,
        guess: action.guess,
        wasCorrect,
        recipientId,
        reasonText: resolutionText,
        timestamp: Date.now(),
      };

      newState.lastResolution = resolution;
      newState.history.push({
        id: `challenge_${Date.now()}`,
        type: 'challenge',
        text: resolutionText,
        timestamp: Date.now(),
      });

      // Check Loss Condition 1: 4 of a kind in recipient's tableau
      const recipientTableau = newState.tableaus[recipientId] || [];
      const creatureCount: Record<string, number> = {};
      recipientTableau.forEach((c) => {
        creatureCount[c.creature] = (creatureCount[c.creature] || 0) + 1;
      });

      let hasFourOfAKind = false;
      let fourCreatureType: CreatureType | null = null;
      for (const [creature, count] of Object.entries(creatureCount)) {
        if (count >= 4) {
          hasFourOfAKind = true;
          fourCreatureType = creature as CreatureType;
          break;
        }
      }

      if (hasFourOfAKind && fourCreatureType) {
        const metaLost = CREATURE_METAS[fourCreatureType];
        newState.phase = 'game_over';
        newState.loserPlayerId = recipientId;
        newState.lossReason = 'four_of_a_kind';
        newState.history.push({
          id: `gameover_${Date.now()}`,
          type: 'game_over',
          text: `💥 GAME OVER! ${recipientName} collected 4x ${metaLost.emoji} ${metaLost.nameEn} and LOSES! Everyone else wins!`,
          timestamp: Date.now(),
        });
        return { newState, events: ['game_over', 'challenge_resolved'] };
      }

      // Check Optional Loss Condition: All 8 unique species (Menagerie variant)
      if (room.gameSettings?.menagerieVariant) {
        const uniqueSpecies = new Set(recipientTableau.map((c) => c.creature));
        if (uniqueSpecies.size >= 8) {
          newState.phase = 'game_over';
          newState.loserPlayerId = recipientId;
          newState.lossReason = 'all_eight_species';
          newState.history.push({
            id: `gameover_${Date.now()}`,
            type: 'game_over',
            text: `💥 GAME OVER! ${recipientName} collected 1 of every single creature (all 8 species) and LOSES!`,
            timestamp: Date.now(),
          });
          return { newState, events: ['game_over', 'challenge_resolved'] };
        }
      }

      // Next player to offer a card is the recipient of this card
      newState.currentTurnPlayerId = recipientId;

      // Check Loss Condition 2: Recipient must start next round, but has 0 cards left on hand!
      const recipientHand = newState.hands[recipientId] || [];
      if (recipientHand.length === 0) {
        newState.phase = 'game_over';
        newState.loserPlayerId = recipientId;
        newState.lossReason = 'empty_hand';
        newState.history.push({
          id: `gameover_${Date.now()}`,
          type: 'game_over',
          text: `💥 GAME OVER! It is ${recipientName}'s turn to offer a card, but they have NO CARDS left in their hand! ${recipientName} LOSES!`,
          timestamp: Date.now(),
        });
        return { newState, events: ['game_over', 'challenge_resolved'] };
      }

      // Transition to resolution phase for drama/animations
      newState.phase = 'resolution';
      return {
        newState,
        events: ['challenge_resolved'],
      };
    }

    case 'ACKNOWLEDGE_RESOLUTION': {
      if (newState.phase !== 'resolution') {
        return { newState: state };
      }

      // Transition to next round offering
      newState.activeCard = null;
      newState.phase = 'offering';
      newState.roundNumber += 1;

      // Verify the player who must start has cards
      const startingPlayerId = newState.currentTurnPlayerId;
      const startingHand = newState.hands[startingPlayerId] || [];
      if (startingHand.length === 0) {
        const p = room.players.find((pl) => pl.id === startingPlayerId);
        newState.phase = 'game_over';
        newState.loserPlayerId = startingPlayerId;
        newState.lossReason = 'empty_hand';
        newState.history.push({
          id: `gameover_${Date.now()}`,
          type: 'game_over',
          text: `💥 GAME OVER! ${p?.name || 'Player'} has no cards to offer! Game over!`,
          timestamp: Date.now(),
        });
        return { newState, events: ['game_over'] };
      }

      return {
        newState,
        events: ['round_started'],
      };
    }

    default:
      return { newState: state, error: 'Unknown action type.' };
  }
}

// Client State Sanitization to prevent cheating via inspect element
export function sanitizeKakerlakenPokerState(
  state: KakerlakenPokerState,
  playerId: string,
  settings: KakerlakenPokerSettings = { turnTimerSeconds: 30 }
): KakerlakenPokerClientState {
  const myHand = state.hands[playerId] || [];
  const handCounts: Record<string, number> = {};

  Object.keys(state.hands).forEach((pId) => {
    handCounts[pId] = state.hands[pId]?.length || 0;
  });

  let sanitizedActiveCard: KakerlakenPokerClientState['activeCard'] = null;

  if (state.activeCard) {
    const isGameOver = state.phase === 'game_over';
    const isResolution = state.phase === 'resolution';
    const hasSeenCard = state.activeCard.seenByPlayerIds.includes(playerId);

    sanitizedActiveCard = {
      card: isGameOver || isResolution || hasSeenCard ? state.activeCard.card : null,
      originalSenderId: state.activeCard.originalSenderId,
      currentSenderId: state.activeCard.currentSenderId,
      currentReceiverId: state.activeCard.currentReceiverId,
      declaredCreature: state.activeCard.declaredCreature,
      seenByPlayerIds: state.activeCard.seenByPlayerIds,
      hasSeenCard,
    };
  }

  return {
    myHand,
    handCounts,
    tableaus: state.tableaus,
    activeCard: sanitizedActiveCard,
    phase: state.phase,
    currentTurnPlayerId: state.currentTurnPlayerId,
    loserPlayerId: state.loserPlayerId,
    lossReason: state.lossReason,
    lastResolution: state.lastResolution,
    history: state.history,
    roundNumber: state.roundNumber,
    settings,
  };
}

// Bot AI support for solo testing or offline players
export function getKakerlakenPokerBotAction(
  state: KakerlakenPokerState,
  botPlayerId: string,
  players: Player[]
): KakerlakenPokerAction | null {
  if (state.phase === 'offering' && state.currentTurnPlayerId === botPlayerId) {
    const myHand = state.hands[botPlayerId] || [];
    if (myHand.length === 0) return null;

    const randomCard = myHand[Math.floor(Math.random() * myHand.length)];
    const otherPlayers = players.filter((p) => p.id !== botPlayerId);
    if (otherPlayers.length === 0) return null;

    const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

    // 60% chance to tell the truth, 40% chance to bluff a random creature
    const tellTruth = Math.random() < 0.6;
    const declared = tellTruth
      ? randomCard.creature
      : ALL_CREATURES[Math.floor(Math.random() * ALL_CREATURES.length)];

    return {
      type: 'OFFER_CARD',
      cardId: randomCard.id,
      targetPlayerId: randomTarget.id,
      declaredCreature: declared,
    };
  }

  if (state.phase === 'deciding' && state.activeCard?.currentReceiverId === botPlayerId) {
    const availablePassTargets = players.filter(
      (p) => !state.activeCard!.seenByPlayerIds.includes(p.id)
    );

    // If can pass and feeling sneaky (40% chance to pass)
    if (availablePassTargets.length > 0 && Math.random() < 0.4) {
      const randomPassTarget =
        availablePassTargets[Math.floor(Math.random() * availablePassTargets.length)];
      const declared =
        Math.random() < 0.5
          ? state.activeCard.declaredCreature
          : ALL_CREATURES[Math.floor(Math.random() * ALL_CREATURES.length)];

      return {
        type: 'PEEK_AND_PASS',
        targetPlayerId: randomPassTarget.id,
        declaredCreature: declared,
      };
    }

    // Otherwise challenge: guess true or false
    const guess: 'true' | 'false' = Math.random() < 0.5 ? 'true' : 'false';
    return {
      type: 'GUESS',
      guess,
    };
  }

  if (state.phase === 'resolution') {
    return {
      type: 'ACKNOWLEDGE_RESOLUTION',
    };
  }

  return null;
}
