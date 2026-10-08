import { CoupCard, CoupRole } from './types';

export interface RoleMetadata {
  role: CoupRole;
  name: string;
  nameTh: string;
  icon: string;
  actionName: string;
  actionNameTh: string;
  actionDesc: string;
  actionCost: number;
  counterActionName: string | null;
  counterActionNameTh: string | null;
  counterActionDesc: string | null;
  color: string;
  gradient: string;
}

export const ROLE_METADATA: Record<CoupRole, RoleMetadata> = {
  duke: {
    role: 'duke',
    name: 'Duke',
    nameTh: 'ดยุก (ขุนนาง)',
    icon: '👑',
    actionName: 'Tax',
    actionNameTh: 'เก็บภาษี (Tax)',
    actionDesc: 'Take 3 coins from the Treasury.',
    actionCost: 0,
    counterActionName: 'Block Foreign Aid',
    counterActionNameTh: 'ขัดขวางเงินช่วยเหลือ (Block Foreign Aid)',
    counterActionDesc: 'Prevents any player from taking Foreign Aid.',
    color: 'text-purple-400',
    gradient: 'from-purple-950 via-zinc-900 to-indigo-950 border-purple-500/40',
  },
  assassin: {
    role: 'assassin',
    name: 'Assassin',
    nameTh: 'มือสังหาร',
    icon: '🗡️',
    actionName: 'Assassinate',
    actionNameTh: 'ลอบสังหาร (Assassinate)',
    actionDesc: 'Pay 3 coins to force a target player to lose 1 influence.',
    actionCost: 3,
    counterActionName: null,
    counterActionNameTh: null,
    counterActionDesc: null,
    color: 'text-rose-400',
    gradient: 'from-rose-950 via-zinc-900 to-red-950 border-rose-500/40',
  },
  captain: {
    role: 'captain',
    name: 'Captain',
    nameTh: 'กัปตัน',
    icon: '⚓',
    actionName: 'Steal',
    actionNameTh: 'ปล้นเหรียญ (Steal)',
    actionDesc: 'Take 2 coins from another player (or 1 if they only have 1).',
    actionCost: 0,
    counterActionName: 'Block Stealing',
    counterActionNameTh: 'ขัดขวางการปล้น (Block Stealing)',
    counterActionDesc: 'Prevents another Captain from stealing from you.',
    color: 'text-sky-400',
    gradient: 'from-sky-950 via-zinc-900 to-cyan-950 border-sky-500/40',
  },
  ambassador: {
    role: 'ambassador',
    name: 'Ambassador',
    nameTh: 'เอกอัครราชทูต',
    icon: '📜',
    actionName: 'Exchange',
    actionNameTh: 'แลกเปลี่ยนการ์ด (Exchange)',
    actionDesc: 'Draw 2 cards from the Court deck, choose which 2 to keep, return 2.',
    actionCost: 0,
    counterActionName: 'Block Stealing',
    counterActionNameTh: 'ขัดขวางการปล้น (Block Stealing)',
    counterActionDesc: 'Prevents a Captain from stealing from you.',
    color: 'text-emerald-400',
    gradient: 'from-emerald-950 via-zinc-900 to-teal-950 border-emerald-500/40',
  },
  contessa: {
    role: 'contessa',
    name: 'Contessa',
    nameTh: 'เคาน์เตส',
    icon: '🛡️',
    actionName: 'None',
    actionNameTh: 'ไม่มี',
    actionDesc: 'The Contessa has no active action.',
    actionCost: 0,
    counterActionName: 'Block Assassination',
    counterActionNameTh: 'ขัดขวางการลอบสังหาร (Block Assassination)',
    counterActionDesc: 'Blocks an Assassin from eliminating your influence.',
    color: 'text-amber-400',
    gradient: 'from-amber-950 via-zinc-900 to-yellow-950 border-amber-500/40',
  },
};

export const ALL_ROLES: CoupRole[] = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

/**
 * 15 Court Cards Deck (3 copies of each role)
 */
export function generateCoupDeck(): CoupCard[] {
  const deck: CoupCard[] = [];
  ALL_ROLES.forEach((role) => {
    for (let i = 1; i <= 3; i++) {
      deck.push({
        id: `card_${role}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        role,
        isRevealed: false,
      });
    }
  });
  return deck;
}
