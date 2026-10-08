'use client';

import React from 'react';
import { Player, Room } from '@/types/game';
import SpyfallBoard from '@/games/spyfall/SpyfallBoard';
import BombBustersBoard from '@/games/bomb-busters/BombBustersBoard';
import SkyTeamBoard from '@/games/sky-team/SkyTeamBoard';
import WerewolfBoard from '@/games/werewolf/WerewolfBoard';
import { CheeseThiefBoard } from '@/games/cheese-thief/CheeseThiefBoard';
import SplendorBoard from '@/games/splendor/SplendorBoard';
import CodenamesBoard from '@/games/codenames/CodenamesBoard';
import WavelengthBoard from '@/games/wavelength/WavelengthBoard';
import OneNightWerewolfBoard from '@/games/one-night-werewolf/OneNightWerewolfBoard';
import ForSaleBoard from '@/games/for-sale/ForSaleBoard';

interface GameRendererProps {
  room: Room;
  currentPlayerId: string;
  isHost: boolean;
  onGameAction: (action: any) => void;
  onReturnToLobby: () => void;
}

export default function GameRenderer({
  room,
  currentPlayerId,
  isHost,
  onGameAction,
  onReturnToLobby,
}: GameRendererProps) {
  switch (room.selectedGameId) {
    case 'spyfall':
      return (
        <SpyfallBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'bomb-busters':
      return (
        <BombBustersBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'sky-team':
      return (
        <SkyTeamBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'werewolf':
      return (
        <WerewolfBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'cheese-thief':
      return (
        <CheeseThiefBoard
          state={room.gameState}
          myPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'splendor':
      return (
        <SplendorBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'codenames':
      return (
        <CodenamesBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'wavelength':
      return (
        <WavelengthBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'one-night-werewolf':
      return (
        <OneNightWerewolfBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    case 'for-sale':
      return (
        <ForSaleBoard
          state={room.gameState}
          players={room.players}
          currentPlayerId={currentPlayerId}
          isHost={isHost}
          onAction={onGameAction}
          onReturnToLobby={onReturnToLobby}
        />
      );

    default:
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md mx-auto space-y-4">
          <div className="text-4xl">🎲</div>
          <h2 className="text-xl font-bold text-white">Game in Progress</h2>
          <p className="text-sm text-slate-400">
            Game component for &quot;{room.selectedGameId}&quot; is loading or being developed.
          </p>
          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold"
            >
              Back to Lobby
            </button>
          )}
        </div>
      );
  }
}
