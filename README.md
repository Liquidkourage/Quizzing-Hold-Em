# All*InQuizition

A real-time trivia and Texas Hold-Em hybrid game where players use numeric cards to get closest to the correct answer.

##  Quick Start

\\\ash
# Install dependencies
npm install

# Start all services (server + 3 apps)
npm run dev
\\\

##  Apps

- **Host** (http://localhost:5173) - Game control panel for the host
- **Player** (http://localhost:5175) - Player interface for joining games
- **Display** (http://localhost:5176) - Public display for streaming/audience
- **Server** (http://localhost:5174) - WebSocket server

##  How to Play

1. Host creates a room and shares the room code
2. Players join using the room code and their name
3. Host asks a trivia question with a numeric answer
4. Players receive 2 numeric cards (0-9)
5. Host deals 3 community cards
6. Players arrange their cards to get closest to the answer
7. Closest player wins the pot!

##  Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + Socket.IO
- **Monorepo**: npm workspaces
- **Build**: tsup for packages

##  Project Structure

\\\
all-in-quizition/
 apps/
    host/          # Host control panel
    player/        # Player interface
    display/       # Public display
    server/        # WebSocket server
 packages/
    core/          # Game logic & types
    net/           # Networking contracts
    ui/            # Shared UI components
 package.json       # Root workspace config
\\\

##  Features

- Real-time multiplayer gameplay
- Casino-themed UI with animations
- Responsive design for all screen sizes
- Automatic room management
- Live game state synchronization

##  Development

\\\ash
# Build all packages and apps
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format
\\\

##  License

MIT
