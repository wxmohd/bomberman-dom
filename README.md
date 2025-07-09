# Bomberman DOM

A multiplayer Bomberman game built using a custom mini-framework and DOM manipulation (no canvas/WebGL). This project implements classic Bomberman gameplay with modern web technologies, featuring an Egyptian theme and background music "Wayah" by Amr Diab.

## Features

- **Classic Bomberman Gameplay**: Place bombs, destroy blocks, and defeat opponents
- **Smooth Animations**: All game elements feature fluid animations using CSS and DOM manipulation
- **Multiplayer Support**: Play with friends over WebSocket connections
- **Responsive Design**: Adapts to different screen sizes
- **Custom Framework**: Built with a lightweight custom framework for DOM manipulation


## Project Structure

```
bomberman-dom/
├── public/                     # Static files (HTML, favicon, assets)
│   ├── index.html              # Main HTML file
│   └── img/                    # Game images and sprites
│       └── Bomb.png            # Bomb sprite used in animations
│
├── src/                        # Source code
│   ├── framework/              # Mini-framework (DOM utils, animation, etc.)
│   ├── game/                   # Game logic and state
│   │   └── BombRenderer.ts     # Handles bomb animations and effects
│   ├── entities/               # Game entities (player, bomb, block, etc.)
│   ├── multiplayer/            # WebSocket networking logic
│   ├── ui/                     # UI rendering logic
│   ├── styles/                 # CSS files
│   └── main.ts                 # Entry point
│
├── server/                     # Node.js WebSocket server (for multiplayer/chat)
│
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://learn.reboot01.com/git/wamohamed/bomberman-dom.git
   cd bomberman-dom
   ```

2. Install dependencies
   ```bash
   npm install
   ```

### Running the Game

1. Start the WebSocket server for multiplayer functionality
   ```bash
   cd server
   node server.js
   ```

2. In a new terminal, start the development server
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to http://localhost:5173

## Game Controls

- **Arrow Keys**: Move your character
- **Space**: Place a bomb


## License

MIT
