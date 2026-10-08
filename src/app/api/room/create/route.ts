import { NextResponse } from 'next/server';
import { roomManager } from '@/server/roomManager';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { player, gameId = 'spyfall' } = body;

    if (!player || !player.id) {
      return NextResponse.json({ error: 'Player data required' }, { status: 400 });
    }

    const room = await roomManager.createRoomAsync(
      {
        id: player.id,
        socketId: '',
        name: player.name || 'Host',
        avatar: player.avatar || '🎲',
        isHost: true,
        isReady: true,
        connected: true,
      },
      gameId
    );

    return NextResponse.json({ code: room.code, room });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create room' }, { status: 500 });
  }
}
