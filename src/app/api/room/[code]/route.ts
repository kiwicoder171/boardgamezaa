import { NextResponse } from 'next/server';
import { roomManager } from '@/server/roomManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ code: string }>;
}

// GET /api/room/[code]?playerId=xyz&name=abc&avatar=dice
export async function GET(req: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const normalizedCode = code.toUpperCase();
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');
    const name = searchParams.get('name') || 'Player';
    const avatar = searchParams.get('avatar') || '🎲';

    let room = await roomManager.getRoomAsync(normalizedCode);
    if (!room) {
      return NextResponse.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 });
    }

    // Auto-join if playerId provided and not yet in room
    if (playerId) {
      if (room.kickedPlayerIds?.includes(playerId)) {
        return NextResponse.json(
          { error: 'You have been removed from this room by the host.', kicked: true },
          { status: 403 }
        );
      }

      const existing = room.players.find((p) => p.id === playerId);
      if (!existing && room.status === 'lobby') {
        const joinRes = await roomManager.joinRoomAsync(normalizedCode, {
          id: playerId,
          socketId: '',
          name,
          avatar,
          isHost: room.players.length === 0,
          isReady: false,
          connected: true,
        });
        if (joinRes.room) {
          room = joinRes.room;
        }
      }
    }

    const sanitized = roomManager.sanitizeRoomForPlayer(room, playerId || '');
    return NextResponse.json({ room: sanitized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch room' }, { status: 500 });
  }
}

// POST /api/room/[code]
export async function POST(req: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const normalizedCode = code.toUpperCase();
    const body = await req.json();
    const { type, playerId, ...payload } = body;

    const room = await roomManager.getRoomAsync(normalizedCode);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    let updatedRoom = room;

    switch (type) {
      case 'join': {
        const joinPlayerId = payload.id || playerId;
        const res = await roomManager.joinRoomAsync(normalizedCode, {
          id: joinPlayerId,
          socketId: '',
          name: payload.name || 'Player',
          avatar: payload.avatar || '🎲',
          isHost: false,
          isReady: Boolean(payload.isReady),
          connected: true,
        });
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'set_ready': {
        const res = await roomManager.setPlayerReadyAsync(normalizedCode, playerId, Boolean(payload.isReady));
        if (res) updatedRoom = res;
        break;
      }

      case 'select_game': {
        const res = await roomManager.selectGameAsync(normalizedCode, playerId, payload.gameId);
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'update_settings': {
        const res = await roomManager.updateGameSettingsAsync(normalizedCode, playerId, payload.settings);
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'start_game': {
        const res = await roomManager.startGameAsync(normalizedCode, playerId);
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'return_to_lobby': {
        const res = await roomManager.returnToLobbyAsync(normalizedCode, playerId);
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'game_action': {
        let actingId = playerId;
        const botCandidate =
          payload.action?._asPlayerId ||
          (typeof payload.action?.playerId === 'string' &&
          (payload.action.playerId.startsWith('bot_') ||
            payload.action.playerId.startsWith('mouse_bot_') ||
            payload.action.playerId.startsWith('spy_bot_'))
            ? payload.action.playerId
            : null);
        if (botCandidate) {
          const room = await roomManager.getRoomAsync(normalizedCode);
          if (room && room.hostId === playerId) {
            actingId = botCandidate;
          }
        }
        const res = await roomManager.dispatchActionAsync(normalizedCode, actingId, payload.action);
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'send_chat': {
        const res = await roomManager.addChatMessageAsync(normalizedCode, playerId, payload.text);
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'kick_player': {
        const res = await roomManager.kickPlayerAsync(normalizedCode, playerId, payload.targetPlayerId);
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      case 'update_profile': {
        const res = await roomManager.updatePlayerAsync(normalizedCode, playerId, {
          name: payload.name,
          avatar: payload.avatar,
        });
        if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
        if (res.room) updatedRoom = res.room;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
    }

    // Broadcast over WebSocket if connected
    roomManager.broadcastRoomState(updatedRoom);

    const sanitized = roomManager.sanitizeRoomForPlayer(updatedRoom, playerId || '');
    return NextResponse.json({ room: sanitized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
