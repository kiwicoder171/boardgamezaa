'use client';

import React, { useState } from 'react';
import { GameDefinition, Player, Room } from '@/types/game';
import { soundFX } from '@/lib/sounds';
import {
  BookOpen,
  Check,
  Clock,
  Copy,
  Crown,
  Play,
  Settings,
  Share2,
  Users,
  Bot,
} from 'lucide-react';

interface RoomLobbyProps {
  room: Room;
  games: GameDefinition[];
  currentPlayerId: string;
  isHost: boolean;
  onSelectGame: (gameId: string) => void;
  onUpdateSettings: (settings: any) => void;
  onToggleReady: (isReady: boolean) => void;
  onStartGame: () => void;
  onAddBotPlayer?: () => void;
}

export default function RoomLobby({
  room,
  games,
  currentPlayerId,
  isHost,
  onSelectGame,
  onUpdateSettings,
  onToggleReady,
  onStartGame,
  onAddBotPlayer,
}: RoomLobbyProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const selectedGame = games.find((g) => g.id === room.selectedGameId) || games[0];
  const me = room.players.find((p) => p.id === currentPlayerId);

  const copyRoomCode = () => {
    soundFX.playClick();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = () => {
    soundFX.playClick();
    const link = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const hasEnoughPlayers = selectedGame
    ? room.players.length >= selectedGame.minPlayers
    : false;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Top Invite Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase">
            Game Room Lobby
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <h1 className="text-4xl font-black text-white font-mono tracking-widest">
              {room.code}
            </h1>
            <button
              onClick={copyRoomCode}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Copy Room Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Send this 4-letter code or invite link to your friends to join!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyRoomLink}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 text-indigo-400" />
            )}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>

          {onAddBotPlayer && isHost && (
            <button
              onClick={onAddBotPlayer}
              className="px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
              title="Add a simulated player for testing without needing multiple browsers"
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>+ Add Test Player</span>
            </button>
          )}

          <button
            onClick={() => setShowRulesModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Rules & How To Play</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Game Picker & Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎮</span> Select Game to Play
                </h2>
                <p className="text-xs text-slate-400">
                  {isHost
                    ? 'As host, pick the game you and your friends want to play right now.'
                    : 'The host chooses which game to play.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {games.map((game) => {
                const isSelected = game.id === room.selectedGameId;
                return (
                  <div
                    key={game.id}
                    onClick={() => {
                      if (isHost && !isSelected) {
                        soundFX.playClick();
                        onSelectGame(game.id);
                      }
                    }}
                    className={`relative rounded-2xl p-5 border transition-all text-left flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl'
                        : isHost
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl p-2.5 rounded-xl bg-slate-800 border border-slate-700 inline-block">
                          {game.icon}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                            Active Game
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold text-white mt-3">{game.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {game.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {game.minPlayers} - {game.maxPlayers} players
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {game.durationMinutes}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Settings Customization */}
          {selectedGame && selectedGame.settingsSchema.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <span>{selectedGame.name} Settings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedGame.settingsSchema.map((field) => {
                  const currentValue =
                    room.gameSettings[field.key] ?? field.default;

                  return (
                    <div
                      key={field.key}
                      className="bg-slate-800/50 rounded-2xl p-4 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">
                          {field.label}
                        </label>
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          {currentValue}
                        </span>
                      </div>
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}

                      {field.type === 'number' && (
                        <input
                          type="range"
                          disabled={!isHost}
                          min={field.min ?? 1}
                          max={field.max ?? 20}
                          step={field.step ?? 1}
                          value={currentValue}
                          onChange={(e) => {
                            if (isHost) {
                              onUpdateSettings({
                                [field.key]: parseInt(e.target.value, 10),
                              });
                            }
                          }}
                          className="w-full accent-indigo-500 disabled:opacity-50"
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          disabled={!isHost}
                          value={currentValue}
                          onChange={(e) => {
                            if (isHost) {
                              onUpdateSettings({
                                [field.key]: isNaN(Number(e.target.value))
                                  ? e.target.value
                                  : Number(e.target.value),
                              });
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 disabled:opacity-50"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Player Roster & Start Button */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Players in Room ({room.players.length})</span>
              </h2>
              {selectedGame && (
                <span className="text-xs text-slate-400">
                  Min: {selectedGame.minPlayers}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {room.players.map((player) => {
                const isMe = player.id === currentPlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isMe
                        ? 'bg-slate-800/90 border-slate-700 ring-1 ring-slate-600'
                        : 'bg-slate-800/40 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl p-1.5 bg-slate-700/50 rounded-xl">
                        {player.avatar}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {isMe && (
                            <span className="text-[10px] text-slate-400 bg-slate-700/60 px-1 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          {player.isHost && (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> Host
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                          Ready ✓
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-700/40 text-slate-400 px-2 py-0.5 rounded-full">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready Toggle Button for non-host */}
            {me && !isHost && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onToggleReady(!me.isReady);
                }}
                className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition ${
                  me.isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {me.isReady ? 'You Are Ready ✓' : 'Mark Ready'}
              </button>
            )}

            {/* Big Start Game Button for Host */}
            {isHost && (
              <div className="space-y-2 pt-2">
                <button
                  disabled={!hasEnoughPlayers}
                  onClick={() => {
                    soundFX.playStart();
                    onStartGame();
                  }}
                  className={`w-full py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl ${
                    hasEnoughPlayers
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:via-purple-500 hover:to-pink-400 text-white shadow-indigo-900/40 transform hover:-translate-y-0.5 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Game</span>
                </button>

                {!hasEnoughPlayers && selectedGame && (
                  <p className="text-[11px] text-center text-amber-400/90 font-medium">
                    Need at least {selectedGame.minPlayers} players to start (currently{' '}
                    {room.players.length}). Invite friends or click &quot;+ Add Test Player&quot; above!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRulesModal && selectedGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedGame.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedGame.name} Rules</h3>
                  <div className="text-xs text-slate-400">{selectedGame.description}</div>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-sm text-slate-300">
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200">
                {selectedGame.rules.summary}
              </div>

              {selectedGame.rules.sections.map((sec, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-amber-300">
                    {sec.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
