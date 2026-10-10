import { Player } from '@/types/game';

export type CreatureType =
  | 'cockroach'
  | 'bat'
  | 'fly'
  | 'toad'
  | 'rat'
  | 'scorpion'
  | 'stink_bug'
  | 'spider';

export interface CreatureMeta {
  type: CreatureType;
  nameEn: string;
  nameTh: string;
  emoji: string;
  image: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  descriptionTh: string;
}

export const CREATURE_METAS: Record<CreatureType, CreatureMeta> = {
  cockroach: {
    type: 'cockroach',
    nameEn: 'Cockroach',
    nameTh: 'แมลงสาบ',
    emoji: '🪳',
    image: '/games/kakerlaken-poker/cards/cockroach.jpg',
    accentColor: '#d97706',
    bgColor: 'from-amber-950/70 to-stone-900',
    borderColor: 'border-amber-600',
    descriptionTh: 'เจ้าแมลงสาบสุดแสบ ทำปากจู๋ตาเหล่หนวดยาว',
  },
  bat: {
    type: 'bat',
    nameEn: 'Bat',
    nameTh: 'ค้างคาว',
    emoji: '🦇',
    image: '/games/kakerlaken-poker/cards/bat.jpg',
    accentColor: '#a855f7',
    bgColor: 'from-purple-950/70 to-slate-900',
    borderColor: 'border-purple-600',
    descriptionTh: 'ค้างคาวสาวแว่นยิ้มหวาน หูฟูตาแป๋ว',
  },
  fly: {
    type: 'fly',
    nameEn: 'Fly',
    nameTh: 'แมลงวัน',
    emoji: '🪰',
    image: '/games/kakerlaken-poker/cards/fly.jpg',
    accentColor: '#06b6d4',
    bgColor: 'from-cyan-950/70 to-slate-900',
    borderColor: 'border-cyan-600',
    descriptionTh: 'แมลงวันยิ้มแป้นถูมือ ปีกบางระยิบระยับ',
  },
  toad: {
    type: 'toad',
    nameEn: 'Toad',
    nameTh: 'คางคก',
    emoji: '🐸',
    image: '/games/kakerlaken-poker/cards/toad.jpg',
    accentColor: '#84cc16',
    bgColor: 'from-lime-950/70 to-stone-900',
    borderColor: 'border-lime-600',
    descriptionTh: 'คางคกพุงพลุ้ยเสื้อยืด Don’t aim for success... just do',
  },
  rat: {
    type: 'rat',
    nameEn: 'Rat',
    nameTh: 'หนู',
    emoji: '🐀',
    image: '/games/kakerlaken-poker/cards/rat.jpg',
    accentColor: '#f59e0b',
    bgColor: 'from-amber-950/70 to-stone-900',
    borderColor: 'border-amber-700',
    descriptionTh: 'หนูฟันจอบถือชีสยิ้มเจ้าเล่ห์ในป่าลึกลับ',
  },
  scorpion: {
    type: 'scorpion',
    nameEn: 'Scorpion',
    nameTh: 'แมงป่อง',
    emoji: '🦂',
    image: '/games/kakerlaken-poker/cards/scorpion.jpg',
    accentColor: '#ea580c',
    bgColor: 'from-orange-950/70 to-stone-900',
    borderColor: 'border-orange-600',
    descriptionTh: 'แมงป่องตากลมตลก ชูกล้ามท้าดวลกลางทะเลทราย',
  },
  stink_bug: {
    type: 'stink_bug',
    nameEn: 'Stink Bug',
    nameTh: 'ตัวเหม็น / มวน',
    emoji: '🪲',
    image: '/games/kakerlaken-poker/cards/stink_bug.jpg',
    accentColor: '#10b981',
    bgColor: 'from-emerald-950/70 to-stone-900',
    borderColor: 'border-emerald-600',
    descriptionTh: 'ตัวเหม็นเกราะมรกตสุดมั่น ปล่อยควันเขียวจอมกวน',
  },
  spider: {
    type: 'spider',
    nameEn: 'Spider',
    nameTh: 'แมงมุม',
    emoji: '🕷️',
    image: '/games/kakerlaken-poker/cards/spider.png',
    accentColor: '#8b5cf6',
    bgColor: 'from-violet-950/70 to-slate-900',
    borderColor: 'border-violet-600',
    descriptionTh: 'แมงมุมหมวก Top Hat ตาโตหวานแหววโรยตัวจากใย',
  },
};

export const CARD_BACK_IMAGE = '/games/kakerlaken-poker/cards/card_back.jpg';

export interface Card {
  id: string;
  creature: CreatureType;
}

export interface ActiveOffer {
  card: Card; // Secret: sanitized for unauthorized players
  originalSenderId: string;
  currentSenderId: string;
  currentReceiverId: string;
  declaredCreature: CreatureType;
  seenByPlayerIds: string[]; // Players who have held/peeked at this card this round
}

export type RoundResolution = {
  card: Card;
  declaredCreature: CreatureType;
  guesserId: string;
  challengerId: string; // The person being challenged (currentSenderId)
  guess: 'true' | 'false';
  wasCorrect: boolean;
  recipientId: string; // Person who was forced to take the card into their tableau
  reasonText: string;
  timestamp: number;
};

export type GameLog = {
  id: string;
  type: 'offer' | 'pass' | 'challenge' | 'penalty' | 'game_over' | 'system';
  text: string;
  timestamp: number;
};

export interface KakerlakenPokerSettings {
  turnTimerSeconds: number; // e.g. 30 seconds for deciding
  menagerieVariant?: boolean; // lose if collecting all 8 different creatures
}

export interface KakerlakenPokerState {
  hands: Record<string, Card[]>; // Server: full card objects; Sanitized: only own cards, others masked
  tableaus: Record<string, Card[]>; // Face-up cards collected on the table for each player
  activeCard: ActiveOffer | null;
  phase: 'offering' | 'deciding' | 'resolution' | 'game_over';
  currentTurnPlayerId: string;
  loserPlayerId: string | null;
  lossReason: 'four_of_a_kind' | 'all_eight_species' | 'empty_hand' | null;
  lastResolution: RoundResolution | null;
  history: GameLog[];
  roundNumber: number;
}

// Client-sanitized version of the state
export interface KakerlakenPokerClientState {
  myHand: Card[];
  handCounts: Record<string, number>;
  tableaus: Record<string, Card[]>;
  activeCard: {
    card: Card | null; // null if player has not peeked and round is not resolved
    originalSenderId: string;
    currentSenderId: string;
    currentReceiverId: string;
    declaredCreature: CreatureType;
    seenByPlayerIds: string[];
    hasSeenCard: boolean; // boolean convenience for current client
  } | null;
  phase: 'offering' | 'deciding' | 'resolution' | 'game_over';
  currentTurnPlayerId: string;
  loserPlayerId: string | null;
  lossReason: 'four_of_a_kind' | 'all_eight_species' | 'empty_hand' | null;
  lastResolution: RoundResolution | null;
  history: GameLog[];
  roundNumber: number;
  settings: KakerlakenPokerSettings;
}

// Player actions
export type KakerlakenPokerAction =
  | {
      type: 'OFFER_CARD';
      cardId: string;
      targetPlayerId: string;
      declaredCreature: CreatureType;
    }
  | {
      type: 'GUESS';
      guess: 'true' | 'false';
    }
  | {
      type: 'PEEK_AND_PASS';
      targetPlayerId: string;
      declaredCreature: CreatureType;
    }
  | {
      type: 'ACKNOWLEDGE_RESOLUTION';
    };
