'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Room, Player } from '@/types/game';
import { getAllGames } from '@/games/registry';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/storage';
import RoomLobby from '@/components/RoomLobby';
import GameRenderer from '@/components/GameRenderer';
import RoomChat from '@/components/RoomChat';
import RulesModal from '@/components/RulesModal';
import { soundFX } from '@/lib/sounds';
import { AlertCircle, ArrowLeft, Loader2, Settings, Volume2, VolumeX, BookOpen } from 'lucide-react';
import { GameSettingsModal } from '@/components/ui/GameSettingsModal';
import { getSupabaseClient } from '@/lib/supabase';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isKicked, setIsKicked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInGameRules, setShowInGameRules] = useState(false);

  const prevTurnRef = React.useRef<string | null>(null);

  // Fetch room via REST API for instant initial load and fallback
  const fetchRoomState = async (userProfile?: UserProfile | null) => {
    try {
      const u = userProfile || profile || getUserProfile();
      const params = new URLSearchParams({
        playerId: u.id,
        name: u.name,
        avatar: u.avatar,
      });
      const res = await fetch(`/api/room/${roomCode}?${params.toString()}`);
      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.kicked) {
          setIsKicked(true);
          setLoading(false);
          return null;
        }
      }
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          if (u && data.room.kickedPlayerIds?.includes(u.id)) {
            setIsKicked(true);
            setLoading(false);
            return null;
          }
          setRoom(data.room);
          setLoading(false);
          setError(null);
          return data.room;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          setError(errData.error);
          setLoading(false);
        }
      }
    } catch (err) {
      console.warn('HTTP room sync error:', err);
    }
  };

  // Dual transport: Immediate HTTP fetch + Socket.IO + Auto polling fallback
  useEffect(() => {
    const user = getUserProfile();
    setProfile(user);

    // 1. Immediately fetch room state over HTTP (sub-20ms)
    fetchRoomState(user);

    // 2. Setup Socket.IO for real-time push (Only on custom server or localhost; Vercel uses Supabase Realtime)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    let s: Socket | null = null;
    if (socketUrl || isLocalhost) {
      try {
        s = io(socketUrl || undefined, {
          reconnectionAttempts: 2,
          timeout: 2500,
          transports: ['websocket', 'polling'],
        });
        setSocket(s);

        s.on('connect', () => {
          s?.emit('join_room', {
            code: roomCode,
            player: user,
          });
        });

        s.on('room_state_update', (updatedRoom: Room) => {
          if (user && updatedRoom.kickedPlayerIds?.includes(user.id)) {
            setIsKicked(true);
            setLoading(false);
            return;
          }
          setRoom(updatedRoom);
          setLoading(false);
          setError(null);
        });

        s.on('kicked_notification', () => {
          setIsKicked(true);
          setLoading(false);
        });

        s.on('error_notification', ({ message }: { message: string }) => {
          setError(message);
          setLoading(false);
        });

        s.on('connect_error', () => {
          fetchRoomState(user);
        });
      } catch {
        // Socket creation fallback
      }
    }

    // 3. Supabase Realtime Channel (Instant sub-30ms WebSocket updates on Vercel)
    const supabase = getSupabaseClient();
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel(`room:${roomCode}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rooms',
              filter: `code=eq.${roomCode}`,
            },
            () => {
              fetchRoomState(user);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase Realtime subscription error:', err);
      }
    }

    // 4. Lightweight safety polling (only when tab is visible, 6s when Supabase is active)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchRoomState(user);
    }, supabase ? 6000 : 3000);

    return () => {
      clearInterval(pollInterval);
      if (s) s.disconnect();
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode]);

  // Turn arrival chime detection
  useEffect(() => {
    if (room?.status === 'playing' && room?.gameState && profile?.id) {
      const gs: any = room.gameState;
      const currentTurn = gs.currentTurnPlayerId || gs.activePlayerId || (gs.turn ? gs.turn.playerId : null);
      if (currentTurn && currentTurn === profile.id && prevTurnRef.current !== profile.id) {
        soundFX.playTurnPing();
      }
      prevTurnRef.current = currentTurn || null;
    } else {
      prevTurnRef.current = null;
    }
  }, [room?.status, room?.gameState, profile?.id]);

  // Audio preference sync
  useEffect(() => {
    setSoundEnabled(soundFX.isEnabled());
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFX.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundFX.playClick();
  };

  const handleUpdateProfile = (name: string, avatar: string) => {
    const u = profile || getUserProfile();
    saveUserProfile(name, avatar);
    const updated = { ...u, name, avatar };
    setProfile(updated);
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === u.id ? { ...p, name, avatar } : p
        ),
      };
    });
    if (socket && socket.connected) {
      socket.emit('update_profile', { code: roomCode, updates: { name, avatar } });
    } else {
      postRoomAction('update_profile', { name, avatar });
    }
  };

  // Dual Action Dispatcher (Socket.IO with HTTP POST fallback)
  const postRoomAction = async (type: string, payload: any = {}) => {
    try {
      const u = profile || getUserProfile();
      const actionPlayerId = payload.playerId || payload.id || u.id;
      const res = await fetch(`/api/room/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, playerId: actionPlayerId, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRoom(data.room);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Action POST failed:', err);
    }
  };

  const handleSelectGame = (gameId: string) => {
    soundFX.playClick();
    setRoom((prev) => {
      if (!prev) return prev;
      const gameDef = allGames.find((g) => g.id === gameId);
      return {
        ...prev,
        selectedGameId: gameId,
        gameSettings: gameDef ? { ...gameDef.defaultSettings } : prev.gameSettings,
      };
    });
    if (socket && socket.connected) {
      socket.emit('select_game', { code: roomCode, gameId });
    } else {
      postRoomAction('select_game', { gameId });
    }
  };

  const handleUpdateSettings = (settings: any) => {
    soundFX.playClick();
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gameSettings: { ...prev.gameSettings, ...settings },
      };
    });
    if (socket && socket.connected) {
      socket.emit('update_settings', { code: roomCode, settings });
    } else {
      postRoomAction('update_settings', { settings });
    }
  };

  const handleToggleReady = (isReady: boolean) => {
    soundFX.playClick();
    const u = profile || getUserProfile();
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === u.id ? { ...p, isReady } : p
        ),
      };
    });
    if (socket && socket.connected) {
      socket.emit('set_ready', { code: roomCode, isReady });
    } else {
      postRoomAction('set_ready', { isReady });
    }
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    soundFX.playClick();
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.filter((p) => p.id !== targetPlayerId),
      };
    });
    if (socket && socket.connected) {
      socket.emit('kick_player', { code: roomCode, targetPlayerId });
    } else {
      postRoomAction('kick_player', { targetPlayerId });
    }
  };

  const handleStartGame = () => {
    soundFX.playStart();
    if (socket && socket.connected) {
      socket.emit('start_game', { code: roomCode });
    } else {
      postRoomAction('start_game');
    }
  };

  const handleReturnToLobby = () => {
    soundFX.playClick();
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'lobby',
        gameState: null,
      };
    });
    if (socket && socket.connected) {
      socket.emit('return_to_lobby', { code: roomCode });
    } else {
      postRoomAction('return_to_lobby');
    }
  };

  const handleGameAction = (action: any) => {
    soundFX.playClick();
    if (socket && socket.connected) {
      socket.emit('game_action', { code: roomCode, action });
    } else {
      postRoomAction('game_action', { action });
    }
  };

  const handleSendMessage = (text: string) => {
    soundFX.playClick();
    const u = profile || getUserProfile();
    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      senderId: u.id,
      senderName: u.name,
      text: text.slice(0, 300),
      timestamp: Date.now(),
    };
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chatMessages: [...prev.chatMessages, optimisticMsg].slice(-50),
      };
    });
    if (socket && socket.connected) {
      socket.emit('send_chat', { code: roomCode, text });
    } else {
      postRoomAction('send_chat', { text });
    }
  };

  // Helper: Add simulated bot player for quick solo testing (instant 0ms response)
  const handleAddBotPlayer = () => {
    soundFX.playClick();
    const currentCount = room?.players.length || 1;
    const botAvatars = ['🤖', '🦊', '🐯', '🐼', '🧙‍♂️', '🦁', '🦉', '👾'];
    const botNames = ['PixelBot', 'Echo', 'Nexus', 'Cypher', 'Gizmo', 'Nova', 'Atlas', 'Vortex'];
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const botName = botNames[(currentCount - 1) % botNames.length];
    const botAvatar = botAvatars[(currentCount - 1) % botAvatars.length];

    const optimisticBot: Player = {
      id: botId,
      socketId: '',
      name: botName,
      avatar: botAvatar,
      isHost: false,
      isReady: true,
      connected: true,
    };

    // Instant 0ms optimistic UI update
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: [...prev.players, optimisticBot],
      };
    });

    // Notify backend (instant over socket or HTTP fallback)
    if (socket && socket.connected) {
      socket.emit('add_bot', { code: roomCode, bot: optimisticBot });
    } else {
      postRoomAction('join', {
        id: botId,
        playerId: botId,
        name: botName,
        avatar: botAvatar,
        isReady: true,
      });
    }
  };

  const allGames = getAllGames();
  const isHost = room?.hostId === profile?.id;

  if (isKicked) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4">
        <div className="bg-[#111215] border border-rose-900/40 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl">
            🚪
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Removed From Room</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You were removed from this room by the table host.
          </p>
          <button
            onClick={() => {
              soundFX.playClick();
              router.push('/');
            }}
            className="btn-tactile w-full py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
        <p className="text-zinc-500 font-mono text-xs">Joining room {roomCode}...</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4">
        <div className="bg-[#111215] border border-[#222429] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Could Not Join Room</h2>
          <p className="text-xs text-zinc-400">{error}</p>
          <button
            onClick={() => {
              soundFX.playClick();
              router.push('/');
            }}
            className="btn-tactile w-full py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f4f4f5] flex flex-col selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-[#1e2025] bg-[#090a0c]/80 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                router.push('/');
              }}
              className="btn-tactile p-2 rounded-lg bg-[#18191e] hover:bg-[#202228] text-zinc-300 border border-[#272930] transition"
              title="Leave Room & Go Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎲</span>
              <span className="font-bold text-base tracking-tight text-white">
                BoardgameZaa
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {profile && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#18191e] border border-[#272930]">
                <span>{profile.avatar}</span>
                <span className="font-medium text-zinc-300">{profile.name}</span>
              </div>
            )}

            {/* In-game quick rules reference button */}
            {room?.status === 'playing' && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  setShowInGameRules(true);
                }}
                className="btn-tactile px-2.5 py-1.5 rounded-lg bg-[#18191e] hover:bg-[#202228] text-zinc-300 hover:text-white border border-[#272930] transition flex items-center gap-1.5 font-medium"
                title="View Rules & Objectives"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Rules</span>
              </button>
            )}

            {/* Global sound toggle */}
            <button
              onClick={toggleSound}
              className={`btn-tactile p-2 rounded-lg border transition ${
                soundEnabled
                  ? 'bg-[#18191e] text-zinc-300 hover:text-white border-[#272930]'
                  : 'bg-zinc-900/60 text-zinc-600 border-zinc-800'
              }`}
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
              aria-label="Toggle Sound Effects"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-600" />
              )}
            </button>

            <button
              onClick={() => {
                soundFX.playClick();
                setIsSettingsOpen(true);
              }}
              className="btn-tactile p-2 rounded-lg bg-[#18191e] hover:bg-[#202228] text-zinc-400 hover:text-white border border-[#272930] transition"
              title="Preferences"
              aria-label="Table Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
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
                onKickPlayer={handleKickPlayer}
                onUpdateProfile={handleUpdateProfile}
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

            {/* Room Settings Modal */}
            <GameSettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              roomCode={room.code}
              gameTitle={allGames.find((g) => g.id === room.selectedGameId)?.name}
            />

            {/* Mid-game Rules Reference Modal */}
            {showInGameRules && (
              <RulesModal
                isOpen={showInGameRules}
                onClose={() => setShowInGameRules(false)}
                game={allGames.find((g) => g.id === room.selectedGameId) || allGames[0]}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
