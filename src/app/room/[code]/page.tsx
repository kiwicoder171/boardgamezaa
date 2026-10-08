'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Room } from '@/types/game';
import { getAllGames } from '@/games/registry';
import { getUserProfile, UserProfile } from '@/lib/storage';
import RoomLobby from '@/components/RoomLobby';
import GameRenderer from '@/components/GameRenderer';
import RoomChat from '@/components/RoomChat';
import { soundFX } from '@/lib/sounds';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const unwrappedParams = use(params);
  const roomCode = unwrappedParams.code.toUpperCase();
  const router = useRouter();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize socket and profile
  useEffect(() => {
    const user = getUserProfile();
    setProfile(user);

    const s = io();
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_room', {
        code: roomCode,
        player: user,
      });
    });

    s.on('room_state_update', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setLoading(false);
      setError(null);
    });

    s.on('error_notification', ({ message }: { message: string }) => {
      setError(message);
      setLoading(false);
    });

    return () => {
      s.disconnect();
    };
  }, [roomCode]);

  // Actions
  const handleSelectGame = (gameId: string) => {
    if (!socket) return;
    socket.emit('select_game', { code: roomCode, gameId });
  };

  const handleUpdateSettings = (settings: any) => {
    if (!socket) return;
    socket.emit('update_settings', { code: roomCode, settings });
  };

  const handleToggleReady = (isReady: boolean) => {
    if (!socket) return;
    socket.emit('set_ready', { code: roomCode, isReady });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('start_game', { code: roomCode });
  };

  const handleReturnToLobby = () => {
    if (!socket) return;
    socket.emit('return_to_lobby', { code: roomCode });
  };

  const handleGameAction = (action: any) => {
    if (!socket) return;
    socket.emit('game_action', { code: roomCode, action });
  };

  const handleSendMessage = (text: string) => {
    if (!socket) return;
    socket.emit('send_chat', { code: roomCode, text });
  };

  // Helper: Add simulated bot player for quick solo testing
  const handleAddBotPlayer = () => {
    const botIndex = (room?.players.length || 1);
    const botAvatars = ['🤖', '🦊', '🐯', '🐼', '🧙‍♂️'];
    const botNames = ['PixelBot', 'Echo', 'Nexus', 'Cypher', 'Gizmo'];
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Create a temporary secondary socket connection to join as bot
    const botSocket = io();
    botSocket.on('connect', () => {
      botSocket.emit('join_room', {
        code: roomCode,
        player: {
          id: botId,
          name: botNames[botIndex % botNames.length],
          avatar: botAvatars[botIndex % botAvatars.length],
        },
      });
    });
  };

  const allGames = getAllGames();
  const isHost = room?.hostId === profile?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-sm">Joining room {roomCode}...</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Could Not Join Room</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                router.push('/');
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title="Leave Room & Go Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎲</span>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                BoardgameZaa
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {profile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80">
                <span>{profile.avatar}</span>
                <span className="font-semibold text-slate-300">{profile.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Room Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="max-w-6xl mx-auto mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {room && (
          <>
            {room.status === 'lobby' ? (
              <RoomLobby
                room={room}
                games={allGames}
                currentPlayerId={profile?.id || ''}
                isHost={isHost}
                onSelectGame={handleSelectGame}
                onUpdateSettings={handleUpdateSettings}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
                onAddBotPlayer={handleAddBotPlayer}
              />
            ) : (
              <GameRenderer
                room={room}
                currentPlayerId={profile?.id || ''}
                isHost={isHost}
                onGameAction={handleGameAction}
                onReturnToLobby={handleReturnToLobby}
              />
            )}

            {/* Room Chat Component */}
            <RoomChat
              messages={room.chatMessages}
              currentPlayerId={profile?.id || ''}
              onSendMessage={handleSendMessage}
              isOpen={isChatOpen}
              onToggle={() => setIsChatOpen(!isChatOpen)}
            />
          </>
        )}
      </main>
    </div>
  );
}
