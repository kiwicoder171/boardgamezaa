import { GameDefinition } from '@/types/game';
import { spyfallGameDefinition } from './spyfall';
import { bombBustersGameDefinition } from './bomb-busters';
import { skyTeamGameDefinition } from './sky-team';
import { werewolfGameDefinition } from './werewolf';
import { cheeseThiefGameDefinition } from './cheese-thief';
import { splendorGameDefinition } from './splendor';
import { codenamesGameDefinition } from './codenames';
import { wavelengthGameDefinition } from './wavelength';
import { oneNightWerewolfGameDefinition } from './one-night-werewolf';
import { forSaleGameDefinition } from './for-sale';
import { coupGameDefinition } from './coup';
import { kakerlakenPokerGameDefinition } from './kakerlaken-poker';

// Central Registry of all games available on BoardgameZaa
export const GAME_REGISTRY: Record<string, GameDefinition<any, any, any>> = {
  [spyfallGameDefinition.id]: spyfallGameDefinition,
  [bombBustersGameDefinition.id]: bombBustersGameDefinition,
  [skyTeamGameDefinition.id]: skyTeamGameDefinition,
  [werewolfGameDefinition.id]: werewolfGameDefinition,
  [cheeseThiefGameDefinition.id]: cheeseThiefGameDefinition,
  [splendorGameDefinition.id]: splendorGameDefinition,
  [codenamesGameDefinition.id]: codenamesGameDefinition,
  [wavelengthGameDefinition.id]: wavelengthGameDefinition,
  [oneNightWerewolfGameDefinition.id]: oneNightWerewolfGameDefinition,
  [forSaleGameDefinition.id]: forSaleGameDefinition,
  [coupGameDefinition.id]: coupGameDefinition,
  [kakerlakenPokerGameDefinition.id]: kakerlakenPokerGameDefinition,
};

export function getAllGames(): GameDefinition[] {
  return Object.values(GAME_REGISTRY);
}

export function getGame(id: string): GameDefinition | undefined {
  return GAME_REGISTRY[id];
}
