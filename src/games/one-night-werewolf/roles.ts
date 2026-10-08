import { RoleDefinition, RoleId } from './types';

export const ROLES: Record<RoleId, RoleDefinition> = {
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    nameTh: 'มนุษย์หมาป่า',
    team: 'werewolf',
    wakeOrder: 1,
    icon: '🐺',
    description: 'Wakes up to find other Werewolves. If lone wolf, may peek at 1 center card.',
    nightInstruction: 'Look for other Werewolves. If you are alone, tap 1 center card to view it.',
  },
  minion: {
    id: 'minion',
    name: 'Minion',
    nameTh: 'สมุนหมาป่า',
    team: 'werewolf',
    wakeOrder: 2,
    icon: '👺',
    description: 'Wakes up and learns who the Werewolves are. Wins if Werewolves win, even if killed!',
    nightInstruction: 'The Werewolves raise their claws to show you who they are.',
  },
  mason: {
    id: 'mason',
    name: 'Mason',
    nameTh: 'ช่างก่ออิฐ',
    team: 'village',
    wakeOrder: 3,
    icon: '🧱',
    description: 'Wakes up and sees the other Mason. If alone, the other Mason is in the center.',
    nightInstruction: 'Look for the other Mason in the village.',
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    nameTh: 'ผู้หยั่งรู้',
    team: 'village',
    wakeOrder: 4,
    icon: '🔮',
    description: 'May view 1 other player’s card OR 2 center cards.',
    nightInstruction: 'Select 1 other player to peek at, OR select 2 center cards to inspect.',
  },
  robber: {
    id: 'robber',
    name: 'Robber',
    nameTh: 'จอมโจร',
    team: 'village',
    wakeOrder: 5,
    icon: '🗡️',
    description: 'May swap their card with another player and view their new identity.',
    nightInstruction: 'Select 1 player to rob: swap cards and see your new role.',
  },
  troublemaker: {
    id: 'troublemaker',
    name: 'Troublemaker',
    nameTh: 'ตัวป่วน',
    team: 'village',
    wakeOrder: 6,
    icon: '🎭',
    description: 'May swap 2 other players’ cards without looking at them.',
    nightInstruction: 'Select 2 other players to secretly switch their cards.',
  },
  drunk: {
    id: 'drunk',
    name: 'Drunk',
    nameTh: 'คนเมา',
    team: 'village',
    wakeOrder: 7,
    icon: '🍺',
    description: 'So drunk you must swap your card with 1 center card without looking at it!',
    nightInstruction: 'Select 1 center card to swap with your own card blind.',
  },
  insomniac: {
    id: 'insomniac',
    name: 'Insomniac',
    nameTh: 'คนนอนไม่หลับ',
    team: 'village',
    wakeOrder: 8,
    icon: '👁️',
    description: 'Wakes up at the very end of the night to view their current card.',
    nightInstruction: 'Wake up and check if your card was swapped during the night.',
  },
  tanner: {
    id: 'tanner',
    name: 'Tanner',
    nameTh: 'คนฟอกหนัง',
    team: 'tanner',
    wakeOrder: 0,
    icon: '💀',
    description: 'Hates their job and wants to die. Wins alone if voted to be executed!',
    nightInstruction: 'Sleep soundly through the night.',
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    nameTh: 'นายพราน',
    team: 'village',
    wakeOrder: 0,
    icon: '🏹',
    description: 'If executed, the player the Hunter voted for is executed as well!',
    nightInstruction: 'Sleep soundly through the night.',
  },
  villager: {
    id: 'villager',
    name: 'Villager',
    nameTh: 'ชาวบ้าน',
    team: 'village',
    wakeOrder: 0,
    icon: '🧑‍🌾',
    description: 'No special night action. Uses logic, deduction, and truth to find the Werewolves.',
    nightInstruction: 'Sleep soundly through the night.',
  },
};

export const NIGHT_WAKE_ORDER: RoleId[] = [
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
];

export function getDefaultDeckForPlayerCount(count: number): RoleId[] {
  // Always total count + 3 cards
  const targetDeckSize = count + 3;

  const baseDeck: RoleId[] = [
    'werewolf',
    'werewolf',
    'seer',
    'robber',
    'troublemaker',
    'villager',
  ];

  if (targetDeckSize >= 7) baseDeck.push('tanner');
  if (targetDeckSize >= 8) baseDeck.push('drunk');
  if (targetDeckSize >= 9) baseDeck.push('insomniac');
  if (targetDeckSize >= 10) baseDeck.push('hunter');
  if (targetDeckSize >= 11) baseDeck.push('minion');
  if (targetDeckSize >= 12) {
    baseDeck.push('mason', 'mason');
  }

  while (baseDeck.length < targetDeckSize) {
    baseDeck.push('villager');
  }

  return baseDeck.slice(0, targetDeckSize);
}
