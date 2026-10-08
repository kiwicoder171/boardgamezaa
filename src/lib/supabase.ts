import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Room } from '@/types/game';

export interface DbRoom {
  code: string;
  host_id: string;
  selected_game_id: string;
  status: string;
  game_settings: any;
  game_state: any;
  players: any;
  chat_messages: any;
  created_at: number;
  last_activity: number;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function roomToDb(room: Room): DbRoom {
  return {
    code: room.code,
    host_id: room.hostId,
    selected_game_id: room.selectedGameId,
    status: room.status,
    game_settings: room.gameSettings ?? {},
    game_state: room.gameState ?? null,
    players: room.players ?? [],
    chat_messages: room.chatMessages ?? [],
    created_at: Number(room.createdAt) || Date.now(),
    last_activity: Number(room.lastActivity) || Date.now(),
  };
}

export function dbToRoom(db: DbRoom): Room {
  return {
    code: db.code,
    hostId: db.host_id,
    selectedGameId: db.selected_game_id,
    status: db.status as any,
    gameSettings: db.game_settings ?? {},
    gameState: db.game_state ?? null,
    players: Array.isArray(db.players) ? db.players : [],
    chatMessages: Array.isArray(db.chat_messages) ? db.chat_messages : [],
    createdAt: Number(db.created_at) || Date.now(),
    lastActivity: Number(db.last_activity) || Date.now(),
  };
}
