# 🎲 BoardgameZaa (บอร์ดเกมซ่า)

**BoardgameZaa** is an extensible online multiplayer board game platform built with Next.js, TypeScript, Tailwind CSS, and Socket.io.

Think of it as your private digital board game parlor where you and your friends can hang out, create a room, share an invite link, select any game from the catalog (e.g., **Spyfall**), and play together in real-time. Whenever you or your friends want a new game (like *Bomb Busters*, *The Resistance: Avalon*, or *Cards Against Humanity*), you can code it as a modular plugin and drop it straight into the platform!

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the game server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🕹️ Features

- **Multiplayer Lobby & Room System**:
  - Instant 4-character room codes (`/room/ABCD`)
  - One-click invite link copying
  - Player profiles with fun customizable avatars and nicknames
  - Host controls (select game, configure settings, start game)
  - Real-time room chat with sound effects
  - Solo/Dev testing helper: `+ Add Test Player` button to easily test multi-player scenarios in a single tab!

- **Flagship Game: Spyfall (สายลับจับโกหก)**:
  - 24 rich thematic locations (Airplane, Space Station, Casino, Hospital, etc.)
  - Secret roles assigned to non-spy citizens
  - The Spy does not know the location, but receives the complete location list to blend in or make a deduction!
  - State sanitization: The server scrubs secret information per player, preventing cheating via browser devtools.
  - Interactive turn tracker ("Player A is asking Player B")
  - Live accusation and unanimous guilty/innocent voting modal with alarms and countdown
  - Spy "Guess Location" instant reveal and deduction modal
  - Web Audio API retro sound synthesis and victory confetti

- **Zero-Friction Extensibility**:
  - Clean TypeScript interfaces (`GameDefinition`, `initGame`, `handleAction`, `sanitizeState`)
  - Drop a new folder in `src/games/<your-game>/`, register in `registry.ts`, and it is immediately available in the lobby!

---

## 🛠️ How to Code and Add a New Game (e.g., Bomb Busters)

Adding a new game to BoardgameZaa takes 3 simple steps:

### Step 1: Create your game folder
Create `src/games/bomb-busters/` with:
- `index.ts` (Manifest and Game Definition)
- `logic.ts` (Rules, state reducer, action handlers)
- `BombBustersBoard.tsx` (React UI)

### Step 2: Implement the Game Contract
```typescript
import { GameDefinition } from '@/types/game';

export const bombBustersGame: GameDefinition = {
  id: 'bomb-busters',
  name: 'Bomb Busters',
  description: 'Cooperative wire-cutting game. Guess wires and cut them together!',
  minPlayers: 2,
  maxPlayers: 5,
  tags: ['Co-op', 'Deduction', 'Numbers'],
  durationMinutes: '15 min',
  icon: '💣',
  coverGradient: 'from-amber-600 to-rose-700',
  defaultSettings: { difficulty: 'normal' },
  settingsSchema: [
    { key: 'difficulty', label: 'Difficulty', type: 'select', 
      options: [{ label: 'Normal', value: 'normal' }, { label: 'Hard', value: 'hard' }], 
      default: 'normal' }
  ],
  initGame: (players, settings) => {
    // Return initial board state
  },
  handleAction: (state, action, playerId, room) => {
    // Process game move (e.g. cut wire, guess number)
    return { newState: updatedState };
  },
  sanitizeState: (state, playerId) => {
    // CRITICAL: Hide secret cards/wires of other players from this player!
    return maskedState;
  },
};
```

### Step 3: Register in 2 lines
1. Add to `src/games/registry.ts`:
   ```typescript
   import { bombBustersGame } from './bomb-busters';
   export const GAME_REGISTRY = {
     spyfall: spyfallGameDefinition,
     'bomb-busters': bombBustersGame, // <-- Added here
   };
   ```
2. Add your board to `src/components/GameRenderer.tsx`:
   ```typescript
   case 'bomb-busters':
     return <BombBustersBoard ... />;
   ```

Your new game will instantly appear in every room's game selection carousel!

---

## 📁 Project Structure

```text
BoardgameZaa/
├── server.ts                  # Node HTTP + Socket.io + Next.js custom server
├── src/
│   ├── app/                   # Next.js App Router (Home, Room, APIs)
│   │   ├── page.tsx           # Home page, profile setup, game showcase & dev guide
│   │   ├── room/[code]/page.tsx # Room live socket connection & game controller
│   │   └── api/room/create/   # Room generation API
│   ├── components/            # Shared UI
│   │   ├── RoomLobby.tsx      # Lobby waiting room, game switcher, settings
│   │   ├── RoomChat.tsx       # Real-time room chat drawer
│   │   └── GameRenderer.tsx   # Dynamic game board router
│   ├── games/                 # Modular games directory
│   │   ├── registry.ts        # Game catalog
│   │   └── spyfall/           # Spyfall game implementation
│   │       ├── index.ts       # Manifest & rules definition
│   │       ├── data.ts        # 24 Locations & roles
│   │       ├── logic.ts       # Turn, timer, accusation, state sanitizer
│   │       ├── types.ts       # State & action types
│   │       └── SpyfallBoard.tsx # Interactive board UI
│   ├── lib/
│   │   ├── sounds.ts          # Synthesized Web Audio API sound effects
│   │   └── storage.ts         # Player profile persistence
│   └── types/
│       └── game.ts            # Core GameDefinition & Room interfaces
```
