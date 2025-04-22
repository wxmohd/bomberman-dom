# Bomberman DOM

A multiplayer Bomberman game built using a custom mini-framework and DOM manipulation (no canvas/WebGL).

## Project Structure

```
bomberman-dom/
├── public/                     # Static files (HTML, favicon, assets)
│   └── index.html
│
├── src/                        # Source code
│   ├── framework/              # Mini-framework (DOM utils, animation, etc.)
│   ├── game/                   # Game logic and state
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
- Run the server (see `server/`)
- Open `public/index.html` in your browser (or serve via local dev server)

## License
MIT
