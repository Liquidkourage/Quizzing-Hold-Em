import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createEmptyGame,
  addPlayer,
  removePlayer,
  startGame,
  setQuestion,
  dealInitialCards,
  dealCommunityCards,
  placeBet,
  foldPlayer,
  submitAnswer,
  revealAnswer,
  endRound,
  isSubmittedAnswerComposableFromDeal,
  adminCloseBetting,
  adminAdvanceTurn,
  adminSetBlinds,
  computeOptimalTableCount,
  splitIntoTableSizes,
  shuffle,
  LOBBY_TABLE_ID,
  pickRandomQuestion,
  playerCheck,
  playerCall,
  playerRaise,
  playerAllIn,
  SAMPLE_QUESTIONS,
  buildDisplayPreviewGameState,
  displayActingSeatIndex,
  displayBlindSeatIndices,
  chipsRequiredToCall,
  pctOfStackToCall,
} from '@qhe/core'
import type { Question, GameState } from '@qhe/core'
import type { 
  ClientHello,
  DisplayLayoutPayload,
  DisplayVenueTileSnapshot,
  DisplayVenueWallSnapshot,
  HostVenueFeltBeatRow,
  ServerAck, 
  DealCardsAction,
  BetAction,
  FoldAction,
  SubmitAnswerAction,
  StartAnsweringAction,
  RevealAnswerAction,
  EndRoundAction,
  NewGameAction,
  CheckAction,
  CallAction,
  RaiseAction,
  AllInAction,
  AdminCloseBettingAction,
  AdminAdvanceTurnAction,
  AdminSetBlindsAction
} from '@qhe/net'
import {
  addVirtualPlayers as spawnVirtualPlayers,
  removeAllVirtualPlayers,
  advanceVirtualBettingStep,
  runVirtualPlayerSimulation,
  tableIsCpuOnly,
  liveVirtualCount,
} from './virtual-players'
import {
  coerceImportQuestions,
  pruneSetlistRefs,
  type VenueLibraryData,
} from './venue-library-persist'
import { loadVenueLibraries, persistVenueLibraries } from './venue-library-db'
import {
  loadVenueAnswerWindowSettingsFromDisk,
  initAnswerWindowEnvDefault,
  getVenueAnswerWindowSeconds,
  setVenueAnswerWindowSecondsPersist,
  resolveAnswerWindowSecondsForStart,
  ANSWER_WINDOW_MIN_SEC,
  ANSWER_WINDOW_MAX_SEC,
} from './venue-answer-window-settings'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())

/** Vite SPAs: never cache `index.html` (avoids stale chunk references after deploy); hashed assets may be immutable. */
function mountSpaStatic(urlPath: string, distRelFromCompiledServer: string) {
  const rootDir = path.join(__dirname, distRelFromCompiledServer)
  app.use(
    urlPath,
    express.static(rootDir, {
      index: 'index.html',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
          res.setHeader('Pragma', 'no-cache')
          res.setHeader('Expires', '0')
          return
        }
        const norm = filePath.replace(/\\/g, '/')
        if (norm.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
}

// Lightweight health checks (Railway / load balancers)
app.get('/health', (_req, res) => {
  res.status(200).type('text').send('ok')
})

// Serve static files for all apps
mountSpaStatic('/host', '../../host/dist')
mountSpaStatic('/player', '../../player/dist')
mountSpaStatic('/display', '../../display/dist')

// Test route for debugging cards
app.get('/test-cards', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Card Variants Test</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        .card-variant {
          width: 96px;
          height: 144px;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          margin: 10px;
          display: inline-block;
        }
        
        .card-glass {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(0,255,180,0.8);
          box-shadow: 0 4px 12px rgba(0,255,180,0.3);
        }
        
        .card-solid {
          background: linear-gradient(135deg, rgba(0,255,180,0.4), rgba(0,255,180,0.2));
          border: 3px solid rgb(0,255,180);
          box-shadow: 0 4px 12px rgba(0,255,180,0.3);
        }
        
        .card-gradient {
          background: linear-gradient(135deg, rgba(0,255,180,0.6), rgba(0,255,180,0.3), rgba(0,255,180,0.1));
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 6px 20px rgba(0,255,180,0.3);
        }
        
        .card-neon {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
        }
        
        .card-neon-pulse {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-pulse 2s ease-in-out infinite;
        }
        
        .card-neon-flicker {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-flicker 0.5s ease-in-out infinite;
        }
        
        .card-neon-rainbow {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-rainbow 3s linear infinite;
        }
        
        .card-neon-matrix {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2);
          animation: neon-matrix 4s ease-in-out infinite;
        }
        
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2); }
          50% { box-shadow: 0 0 30px rgb(0,255,180), 0 0 60px rgba(0,255,180,0.6), inset 0 0 30px rgba(0,255,180,0.3); }
        }
        
        @keyframes neon-flicker {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2); }
          25% { box-shadow: 0 0 10px rgb(0,255,180), 0 0 20px rgba(0,255,180,0.2), inset 0 0 10px rgba(0,255,180,0.1); }
          50% { box-shadow: 0 0 25px rgb(0,255,180), 0 0 50px rgba(0,255,180,0.5), inset 0 0 25px rgba(0,255,180,0.25); }
          75% { box-shadow: 0 0 15px rgb(0,255,180), 0 0 30px rgba(0,255,180,0.3), inset 0 0 15px rgba(0,255,180,0.15); }
        }
        
        @keyframes neon-rainbow {
          0% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, 0 0 40px rgba(255,0,0,0.4), inset 0 0 20px rgba(255,0,0,0.2); }
          16.66% { border-color: #ff8000; box-shadow: 0 0 20px #ff8000, 0 0 40px rgba(255,128,0,0.4), inset 0 0 20px rgba(255,128,0,0.2); }
          33.33% { border-color: #ffff00; box-shadow: 0 0 20px #ffff00, 0 0 40px rgba(255,255,0,0.4), inset 0 0 20px rgba(255,255,0,0.2); }
          50% { border-color: #00ff00; box-shadow: 0 0 20px #00ff00, 0 0 40px rgba(0,255,0,0.4), inset 0 0 20px rgba(0,255,0,0.2); }
          66.66% { border-color: #0080ff; box-shadow: 0 0 20px #0080ff, 0 0 40px rgba(0,128,255,0.4), inset 0 0 20px rgba(0,128,255,0.2); }
          83.33% { border-color: #8000ff; box-shadow: 0 0 20px #8000ff, 0 0 40px rgba(128,0,255,0.4), inset 0 0 20px rgba(128,0,255,0.2); }
          100% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, 0 0 40px rgba(255,0,0,0.4), inset 0 0 20px rgba(255,0,0,0.2); }
        }
        
        @keyframes neon-matrix {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,180), 0 0 40px rgba(0,255,180,0.4), inset 0 0 20px rgba(0,255,180,0.2); }
          25% { box-shadow: 0 0 25px rgb(0,255,180), 0 0 50px rgba(0,255,180,0.5), inset 0 0 25px rgba(0,255,180,0.25); }
          50% { box-shadow: 0 0 30px rgb(0,255,180), 0 0 60px rgba(0,255,180,0.6), inset 0 0 30px rgba(0,255,180,0.3); }
          75% { box-shadow: 0 0 25px rgb(0,255,180), 0 0 50px rgba(0,255,180,0.5), inset 0 0 25px rgba(0,255,180,0.25); }
        }
        
        .card-neon-matrix-cyan {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(0,255,255);
          box-shadow: 0 0 20px rgb(0,255,255), 0 0 40px rgba(0,255,255,0.4), inset 0 0 20px rgba(0,255,255,0.2);
          animation: neon-matrix-cyan 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-pink {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(255,105,180);
          box-shadow: 0 0 20px rgb(255,105,180), 0 0 40px rgba(255,105,180,0.4), inset 0 0 20px rgba(255,105,180,0.2);
          animation: neon-matrix-pink 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-orange {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(255,165,0);
          box-shadow: 0 0 20px rgb(255,165,0), 0 0 40px rgba(255,165,0,0.4), inset 0 0 20px rgba(255,165,0,0.2);
          animation: neon-matrix-orange 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-lime {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(50,205,50);
          box-shadow: 0 0 20px rgb(50,205,50), 0 0 40px rgba(50,205,50,0.4), inset 0 0 20px rgba(50,205,50,0.2);
          animation: neon-matrix-lime 4s ease-in-out infinite;
        }
        
        .card-neon-matrix-violet {
          background: rgba(0,0,0,0.8);
          border: 2px solid rgb(148,0,211);
          box-shadow: 0 0 20px rgb(148,0,211), 0 0 40px rgba(148,0,211,0.4), inset 0 0 20px rgba(148,0,211,0.2);
          animation: neon-matrix-violet 4s ease-in-out infinite;
        }
        
        @keyframes neon-matrix-cyan {
          0%, 100% { box-shadow: 0 0 20px rgb(0,255,255), 0 0 40px rgba(0,255,255,0.4), inset 0 0 20px rgba(0,255,255,0.2); }
          25% { box-shadow: 0 0 25px rgb(0,255,255), 0 0 50px rgba(0,255,255,0.5), inset 0 0 25px rgba(0,255,255,0.25); }
          50% { box-shadow: 0 0 30px rgb(0,255,255), 0 0 60px rgba(0,255,255,0.6), inset 0 0 30px rgba(0,255,255,0.3); }
          75% { box-shadow: 0 0 25px rgb(0,255,255), 0 0 50px rgba(0,255,255,0.5), inset 0 0 25px rgba(0,255,255,0.25); }
        }
        
        @keyframes neon-matrix-pink {
          0%, 100% { box-shadow: 0 0 20px rgb(255,105,180), 0 0 40px rgba(255,105,180,0.4), inset 0 0 20px rgba(255,105,180,0.2); }
          25% { box-shadow: 0 0 25px rgb(255,105,180), 0 0 50px rgba(255,105,180,0.5), inset 0 0 25px rgba(255,105,180,0.25); }
          50% { box-shadow: 0 0 30px rgb(255,105,180), 0 0 60px rgba(255,105,180,0.6), inset 0 0 30px rgba(255,105,180,0.3); }
          75% { box-shadow: 0 0 25px rgb(255,105,180), 0 0 50px rgba(255,105,180,0.5), inset 0 0 25px rgba(255,105,180,0.25); }
        }
        
        @keyframes neon-matrix-orange {
          0%, 100% { box-shadow: 0 0 20px rgb(255,165,0), 0 0 40px rgba(255,165,0,0.4), inset 0 0 20px rgba(255,165,0,0.2); }
          25% { box-shadow: 0 0 25px rgb(255,165,0), 0 0 50px rgba(255,165,0,0.5), inset 0 0 25px rgba(255,165,0,0.25); }
          50% { box-shadow: 0 0 30px rgb(255,165,0), 0 0 60px rgba(255,165,0,0.6), inset 0 0 30px rgba(255,165,0,0.3); }
          75% { box-shadow: 0 0 25px rgb(255,165,0), 0 0 50px rgba(255,165,0,0.5), inset 0 0 25px rgba(255,165,0,0.25); }
        }
        
        @keyframes neon-matrix-lime {
          0%, 100% { box-shadow: 0 0 20px rgb(50,205,50), 0 0 40px rgba(50,205,50,0.4), inset 0 0 20px rgba(50,205,50,0.2); }
          25% { box-shadow: 0 0 25px rgb(50,205,50), 0 0 50px rgba(50,205,50,0.5), inset 0 0 25px rgba(50,205,50,0.25); }
          50% { box-shadow: 0 0 30px rgb(50,205,50), 0 0 60px rgba(50,205,50,0.6), inset 0 0 30px rgba(50,205,50,0.3); }
          75% { box-shadow: 0 0 25px rgb(50,205,50), 0 0 50px rgba(50,205,50,0.5), inset 0 0 25px rgba(50,205,50,0.25); }
        }
        
        @keyframes neon-matrix-violet {
          0%, 100% { box-shadow: 0 0 20px rgb(148,0,211), 0 0 40px rgba(148,0,211,0.4), inset 0 0 20px rgba(148,0,211,0.2); }
          25% { box-shadow: 0 0 25px rgb(148,0,211), 0 0 50px rgba(148,0,211,0.5), inset 0 0 25px rgba(148,0,211,0.25); }
          50% { box-shadow: 0 0 30px rgb(148,0,211), 0 0 60px rgba(148,0,211,0.6), inset 0 0 30px rgba(148,0,211,0.3); }
          75% { box-shadow: 0 0 25px rgb(148,0,211), 0 0 50px rgba(148,0,211,0.5), inset 0 0 25px rgba(148,0,211,0.25); }
        }
        
        .card-back {
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 2px solid rgba(0,255,180,0.8);
          box-shadow: 0 0 20px rgba(0,255,180,0.3);
        }
        
        .card-back::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: repeating-linear-gradient(
            45deg,
            rgba(0,255,180,0.2),
            rgba(0,255,180,0.2) 2px,
            transparent 2px,
            transparent 8px
          );
          border-radius: 8px;
        }
        
        .card-back-diamond::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: 
            radial-gradient(circle at 25% 25%, rgba(0,255,180,0.3) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(0,255,180,0.3) 2px, transparent 2px);
          border-radius: 8px;
        }
        
        .card-back-heart::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: conic-gradient(
            from 0deg,
            rgba(0,255,180,0.4),
            transparent 60deg,
            rgba(0,255,180,0.4),
            transparent 120deg,
            rgba(0,255,180,0.4),
            transparent 180deg,
            rgba(0,255,180,0.4),
            transparent 240deg,
            rgba(0,255,180,0.4),
            transparent 300deg,
            rgba(0,255,180,0.4)
          );
          border-radius: 8px;
        }
        
        .card-back-crown::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: linear-gradient(
            45deg,
            rgba(0,255,180,0.4) 25%,
            transparent 25%,
            transparent 75%,
            rgba(0,255,180,0.4) 75%
          );
          border-radius: 8px;
        }
        
        .card-back-circuit::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: 
            repeating-linear-gradient(90deg, rgba(0,255,180,0.25) 1px, transparent 1px, transparent 3px),
            repeating-linear-gradient(0deg, rgba(0,255,180,0.25) 1px, transparent 1px, transparent 3px);
          border-radius: 8px;
        }
        
        .card-back-cosmic::before {
          content: '';
          position: absolute;
          inset: 8px;
          background: 
            radial-gradient(circle at 20% 20%, rgba(0,255,180,0.4) 2px, transparent 2px),
            radial-gradient(circle at 80% 80%, rgba(0,255,180,0.35) 2px, transparent 2px),
            radial-gradient(circle at 40% 60%, rgba(0,255,180,0.3) 2px, transparent 2px),
            radial-gradient(circle at 60% 40%, rgba(0,255,180,0.35) 2px, transparent 2px);
          border-radius: 8px;
        }
        
        .card-digit {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 48px;
          font-weight: bold;
          color: black;
          z-index: 10;
        }
        
        .card-digit.neon {
          color: rgb(0,255,180);
          text-shadow: 0 0 12px rgb(0,255,180);
        }
        
        .card-corner {
          position: absolute;
          font-weight: bold;
          color: rgb(0,255,180);
          z-index: 10;
          font-size: 18px;
        }
        
        .card-corner.top-left {
          top: 4px;
          left: 4px;
        }
        
        .card-corner.bottom-right {
          bottom: 4px;
          right: 4px;
          transform: rotate(180deg);
        }
        
        .card-corner.neon {
          text-shadow: 0 0 8px rgb(0,255,180);
        }
        
        .card-center-logo {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: rgb(0,255,180);
          font-weight: bold;
          transform: translateY(-7px);
        }
        
        .card-center-logo > div {
          background: rgba(0,0,0,0.3);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgb(0,255,180);
          box-shadow: 0 0 10px rgb(0,255,180);
        }
      </style>
    </head>
    <body style="background: linear-gradient(135deg, #1f2937, #7c3aed, #1f2937); min-height: 100vh; padding: 20px;">
      <h1 style="color: white; text-align: center; margin-bottom: 30px;">🎰 Card Variants Test</h1>
      
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="color: white; margin-bottom: 20px;">Front Card Styles</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Glass Style (Default)</h3>
          <div class="card-variant card-glass">
            <div class="card-corner top-left">7</div>
            <div class="card-corner bottom-right">7</div>
            <div class="card-digit">
              <span style="background: linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5)); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">7</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Solid Style</h3>
          <div class="card-variant card-solid">
            <div class="card-corner top-left">7</div>
            <div class="card-corner bottom-right">7</div>
            <div class="card-digit">
              <span style="background: linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5)); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">7</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Gradient Style</h3>
          <div class="card-variant card-gradient">
            <div class="card-corner top-left">7</div>
            <div class="card-corner bottom-right">7</div>
            <div class="card-digit">
              <span style="background: linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5)); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">7</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: white; margin-bottom: 10px;">Neon Variants</h3>
          <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Standard</h4>
              <div class="card-variant card-neon">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Pulse</h4>
              <div class="card-variant card-neon-pulse">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Flicker</h4>
              <div class="card-variant card-neon-flicker">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Rainbow</h4>
              <div class="card-variant card-neon-rainbow">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Emerald)</h4>
              <div class="card-variant card-neon-matrix">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,180); border: 1px solid rgb(0,255,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Cyan)</h4>
              <div class="card-variant card-neon-matrix-cyan">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(0,255,255); border: 1px solid rgb(0,255,255);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Pink)</h4>
              <div class="card-variant card-neon-matrix-pink">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(255,105,180); border: 1px solid rgb(255,105,180);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Orange)</h4>
              <div class="card-variant card-neon-matrix-orange">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(255,165,0); border: 1px solid rgb(255,165,0);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Lime)</h4>
              <div class="card-variant card-neon-matrix-lime">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(50,205,50); border: 1px solid rgb(50,205,50);">7</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="color: white; margin-bottom: 10px;">Matrix (Violet)</h4>
              <div class="card-variant card-neon-matrix-violet">
                <div class="card-corner top-left neon">7</div>
                <div class="card-corner bottom-right neon">7</div>
                <div class="card-digit neon">
                  <span style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; box-shadow: 0 0 8px rgb(148,0,211); border: 1px solid rgb(148,0,211);">7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="color: white; margin-bottom: 20px;">Card Back Designs</h2>
        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Spade</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>♠</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Diamond</h4>
            <div class="card-variant card-back card-back-diamond">
              <div class="card-center-logo">
                <div>♦</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Club</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>♣</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Heart</h4>
            <div class="card-variant card-back card-back-heart">
              <div class="card-center-logo">
                <div>✦</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Star</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>★</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Crown</h4>
            <div class="card-variant card-back card-back-crown">
              <div class="card-center-logo">
                <div>👑</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Joker</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>🃏</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Geometric</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>◆</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Circuit</h4>
            <div class="card-variant card-back card-back-circuit">
              <div class="card-center-logo">
                <div>⚡</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Cosmic</h4>
            <div class="card-variant card-back card-back-cosmic">
              <div class="card-center-logo">
                <div>⭐</div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Neon</h4>
            <div class="card-variant card-back">
              <div class="card-center-logo">
                <div>✦</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <h2 style="color: white; margin-bottom: 20px;">Color Variants</h2>
        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Emerald</h4>
            <div class="card-variant card-glass"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Gold</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(255,215,0,0.8); box-shadow: 0 4px 12px rgba(255,215,0,0.3);"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Purple</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(139,92,246,0.8); box-shadow: 0 4px 12px rgba(139,92,246,0.3);"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Red</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(255,68,68,0.8); box-shadow: 0 4px 12px rgba(255,68,68,0.3);"></div>
          </div>
          <div>
            <h4 style="color: white; margin-bottom: 10px;">Blue</h4>
            <div class="card-variant" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 2px solid rgba(59,130,246,0.8); box-shadow: 0 4px 12px rgba(59,130,246,0.3);"></div>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 40px; text-align: center;">
        <p style="color: white;">These are the different card styles available in the game!</p>
        <p style="color: white;">Use <code>style="neon"</code> with <code>neonVariant</code>: 'standard', 'pulse', 'flicker', 'rainbow', or 'matrix'</p>
        <p style="color: white;">Use <code>faceDown={true}</code> with <code>backDesign</code>: 'spade', 'diamond', 'club', 'heart', 'star', 'crown', or 'joker'</p>
      </div>
    </body>
    </html>
  `)
})

// Serve the main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
              <title>Quizz\u2019em</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%);
          color: white;
          margin: 0;
          padding: 20px;
          min-height: 100vh;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 2rem;
          text-shadow: 0 0 20px #00FFB4;
        }
        .links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 2rem;
        }
        .link {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 10px;
          text-decoration: none;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        .link:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }
        .link h2 {
          margin: 0 0 10px 0;
          color: #00FFB4;
        }
        .link p {
          margin: 0;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎰 Quizz\u2019em</h1>
        <p>Welcome to the ultimate Vegas casino experience!</p>
        
        <div class="links">
          <a href="/host" class="link">
            <h2>🎮 Host Control Panel</h2>
            <p>Manage the game and control the flow</p>
          </a>
          <a href="/player" class="link">
            <h2>👤 Player Interface</h2>
            <p>Join the game and play your hand</p>
          </a>
          <a href="/display" class="link">
            <h2>📺 Display Screen</h2>
            <p>Public display for spectators</p>
          </a>
        </div>
      </div>
    </body>
    </html>
  `)
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

function normalizeVenueCode(roomCode: string): string {
  return roomCode.trim().toUpperCase()
}

function normalizeTableId(tableId: string | undefined): string {
  const t = (tableId ?? '1').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || '1'
  return t
}

/** One isolated table roster + deck + phase inside a venue (maps to sockets + persisted state key). */
function tableSessionKey(venueCode: string, tableId?: string): string {
  return `${normalizeVenueCode(venueCode)}:${normalizeTableId(tableId)}`
}

const rooms = new Map<string, any>()
const answerTimers = new Map<string, NodeJS.Timeout>()
let venueLibraries!: Map<string, VenueLibraryData>
const venuePlayhead = new Map<string, { setlistId: string | null; nextIndex: number }>()

async function persistVenues() {
  await persistVenueLibraries(venueLibraries)
}

function hostVenueRoom(venueCode: string): string {
  return `HOST:${normalizeVenueCode(venueCode)}`
}

function displayVenueRoom(venueCode: string): string {
  return `DISPLAY:${normalizeVenueCode(venueCode)}`
}

const venueDisplayLayouts = new Map<string, DisplayLayoutPayload>()

function normalizeDisplayFocusTable(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    if (raw >= 1 && raw <= 8) return raw
    return null
  }
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw.trim(), 10)
    if (Number.isInteger(n) && n >= 1 && n <= 8) return n
    return null
  }
  return null
}

function parseDisplaySetLayoutPayload(payload: unknown): DisplayLayoutPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.layout !== 'venueWall') return null
  return { layout: 'venueWall', focusTable: normalizeDisplayFocusTable(p.focusTable) }
}

/** Normalize persisted or legacy payloads (older builds stored `singleTable`). */
function coerceDisplayLayoutPayload(raw: unknown): DisplayLayoutPayload {
  if (!raw || typeof raw !== 'object') return { layout: 'venueWall', focusTable: null }
  const o = raw as Record<string, unknown>
  if (o.layout === 'singleTable' && typeof o.tableId === 'string') {
    const tid = normalizeTableId(o.tableId.trim())
    const n = Number.parseInt(String(tid), 10)
    return {
      layout: 'venueWall',
      focusTable: Number.isInteger(n) && n >= 1 && n <= 8 ? n : null,
    }
  }
  if (o.layout === 'venueWall') {
    return { layout: 'venueWall', focusTable: normalizeDisplayFocusTable(o.focusTable) }
  }
  return { layout: 'venueWall', focusTable: null }
}

function resolveDisplayLayoutForHello(venueCode: string, data: ClientHello): DisplayLayoutPayload {
  const k = normalizeVenueCode(venueCode)
  const stored = venueDisplayLayouts.get(k)
  if (stored != null) return coerceDisplayLayoutPayload(stored)
  if (data.displayVenueWall) {
    return {
      layout: 'venueWall',
      focusTable: normalizeDisplayFocusTable(data.displayFocusTable),
    }
  }
  const tid = normalizeTableId(data.tableId ?? '1')
  const n = Number.parseInt(String(tid), 10)
  const focus = Number.isInteger(n) && n >= 1 && n <= 8 ? n : null
  return { layout: 'venueWall', focusTable: focus }
}

const DISPLAY_PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short code ↔ waiting display socket until host claims pairing */
type DisplayPairingPending = { socketId: string; created: number }
const displayPairByCode = new Map<string, DisplayPairingPending>()
const displayPairCodeBySocketId = new Map<string, string>()

type DisplaySockData = {
  sessionKey?: string
  role?: string
  hostAuthed?: boolean
  displayAwaitPairing?: boolean
  displayClientName?: string
}

function clearDisplayPairingForSocket(socketId: string) {
  const code = displayPairCodeBySocketId.get(socketId)
  if (!code) return
  displayPairCodeBySocketId.delete(socketId)
  displayPairByCode.delete(code)
}

function mintDisplayPairingCode(): string {
  for (let attempts = 0; attempts < 120; attempts++) {
    let s = ''
    for (let i = 0; i < 4; i++) {
      s += DISPLAY_PAIRING_ALPHABET[Math.floor(Math.random() * DISPLAY_PAIRING_ALPHABET.length)]!
    }
    if (!displayPairByCode.has(s)) return s
  }
  return `Z${(100 + Math.floor(Math.random() * 900)).toString()}`
}

function assignDisplayPairing(socket: Socket): string {
  clearDisplayPairingForSocket(socket.id)
  const code = mintDisplayPairingCode()
  displayPairByCode.set(code, { socketId: socket.id, created: Date.now() })
  displayPairCodeBySocketId.set(socket.id, code)
  return code
}

/** Join DISPLAY:{venue}, route layouts & felt session — shared by hello + pairing attach */
function wireDisplaySocketToVenue(socket: Socket, venueCodeRaw: string, data: ClientHello) {
  const vn = normalizeVenueCode(venueCodeRaw)
  const sockData = socket.data as DisplaySockData
  sockData.displayAwaitPairing = false

  socket.join(displayVenueRoom(vn))
  const layout = resolveDisplayLayoutForHello(vn, data)
  socket.emit('displayLayout', layout)

  const spotlightWatchTableId =
    layout.focusTable != null &&
    Number.isInteger(layout.focusTable) &&
    layout.focusTable >= 1 &&
    layout.focusTable <= 8
      ? String(layout.focusTable)
      : null

  let sessionTableIdRaw = spotlightWatchTableId

  if (
    !sessionTableIdRaw &&
    layout.focusTable == null &&
    typeof data.displayFocusTable === 'number'
  ) {
    const ftJoin = normalizeDisplayFocusTable(data.displayFocusTable)
    if (ftJoin != null) sessionTableIdRaw = String(ftJoin)
  }

  if (!sessionTableIdRaw) {
    sockData.sessionKey = undefined
    const ackWall: ServerAck = { ok: true, message: 'Connected successfully' }
    socket.emit('ack', ackWall)
    emitDisplayVenueSnapshotNow(vn)
    return
  }

  const watchKey = tableSessionKey(vn, normalizeTableId(sessionTableIdRaw))
  socket.join(watchKey)
  sockData.sessionKey = watchKey
  const gs = rooms.get(watchKey)
  if (!gs) {
    /** Spotlight / felt preview only — numbered sessions are created when the host seats the lobby */
    const tid = normalizeTableId(sessionTableIdRaw)
    const tidN = Number.parseInt(String(tid), 10)
    const synthetic =
      Number.isInteger(tidN) && tidN >= 1 && tidN <= 8
        ? buildDisplayPreviewGameState(normalizeVenueCode(vn), tid)
        : createEmptyGame(vn, '', tid)
    socket.emit('ack', { ok: true, message: 'Connected successfully' } satisfies ServerAck)
    socket.emit('state', runVirtualPlayerSimulation(synthetic))
    emitDisplayVenueSnapshotNow(vn)
    return
  }

  let gsLive = gs
  gsLive = runVirtualPlayerSimulation(gsLive)
  rooms.set(watchKey, gsLive)
  const ackDs: ServerAck = { ok: true, message: 'Connected successfully' }
  socket.emit('ack', ackDs)
  emitVenueTableState(watchKey, gsLive)
}

async function ensureVenueLibrary(venueCode: string): Promise<VenueLibraryData> {
  const k = normalizeVenueCode(venueCode)
  if (!venueLibraries.has(k)) {
    venueLibraries.set(k, {
      questions: SAMPLE_QUESTIONS.map((q) => ({ ...q })),
      setlists: [],
    })
    await persistVenues()
  }
  return venueLibraries.get(k)!
}

function getPlayhead(venueCode: string) {
  return (
    venuePlayhead.get(normalizeVenueCode(venueCode)) ?? {
      setlistId: null,
      nextIndex: 0,
    }
  )
}

async function buildHostLibraryPayload(venueCode: string) {
  const k = normalizeVenueCode(venueCode)
  const lib = await ensureVenueLibrary(k)
  const ph = getPlayhead(k)
  return {
    questions: lib.questions.map((q) => ({ ...q })),
    setlists: lib.setlists.map((s) => ({
      ...s,
      questionIds: [...s.questionIds],
    })),
    activeSetlistId: ph.setlistId,
    activeSetlistNextIndex: ph.nextIndex,
    answerWindowSeconds: getVenueAnswerWindowSeconds(k),
  }
}

async function emitHostLibrary(venueCode: string) {
  io.to(hostVenueRoom(venueCode)).emit('hostLibrary', await buildHostLibraryPayload(venueCode))
}

function pruneIdFromAllSetlists(lib: VenueLibraryData, questionId: string) {
  for (const sl of lib.setlists) {
    sl.questionIds = sl.questionIds.filter((id) => id !== questionId)
  }
}

function sanitizeSetlistQuestionIds(lib: VenueLibraryData, ids: string[]): string[] {
  const known = new Set(lib.questions.map((q) => q.id))
  return ids.filter((id) => known.has(id))
}

function assertVenueHost(socket: Socket, gs: { hostId: string }): boolean {
  const sd = socket.data as { role?: string; hostAuthed?: boolean }
  if (sd.role !== 'host') {
    socket.emit('toast', 'Only the host can perform this action.')
    return false
  }
  const required = process.env.HOST_SECRET?.trim()
  if (required && !sd.hostAuthed) {
    socket.emit('toast', 'Host session is not authenticated (check HOST_SECRET).')
    return false
  }
  if (socket.id !== gs.hostId) {
    socket.emit('toast', 'Only the venue host for this bound table can control the game.')
    return false
  }
  return true
}

function getActiveSessionKey(socket: Socket): string | undefined {
  const fromData = (socket.data as { sessionKey?: string }).sessionKey
  if (typeof fromData === 'string' && fromData.length > 0) return fromData
  const ids = Array.from(socket.rooms)
  return ids.length > 1 ? ids[1] : undefined
}

/** Socket map keys belonging to every table in one venue (`VENUE:tableId`). */
function venueSessionKeyPrefix(venueCode: string): string {
  return `${normalizeVenueCode(venueCode)}:`
}

function isLobbySessionKey(sessionKey: string): boolean {
  return sessionKey.endsWith(`:${LOBBY_TABLE_ID}`)
}

function allVenueSessionKeys(venueCode: string): string[] {
  const pref = venueSessionKeyPrefix(venueCode)
  return [...rooms.keys()].filter(k => k.startsWith(pref)).sort()
}

/** Playable tables only (excludes lobby pool). */
function allTableSessionsInVenue(venueCode: string): string[] {
  return allVenueSessionKeys(venueCode).filter(k => !isLobbySessionKey(k))
}

/** Seats labeled on the public venue-wall mosaic (matches felt chair count in UI). */
const VENUE_WALL_SEAT_COUNT = 8

/** Seats wired into the venue wall / welcome mosaic (human + rehearsal CPU vp:*). */
function welcomeWallSeatCount(gs: GameState): number {
  return gs.players.length
}

/** Hidden on displays after venue-wide Start Game until New Game resets the venue. */
const venueAudienceWelcomeExpired = new Set<string>()

function markVenueShowStarted(code: string): void {
  const vn = normalizeVenueCode(code)
  if (!venueAudienceWelcomeExpired.has(vn)) {
    venueAudienceWelcomeExpired.add(vn)
    emitDisplayVenueSnapshotNow(vn)
  }
}

function tableNumFromSessionKey(venueCode: string, sessionKey: string): number | null {
  const vn = normalizeVenueCode(venueCode)
  const pref = `${vn}:`
  if (!sessionKey.startsWith(pref)) return null
  const rest = sessionKey.slice(pref.length)
  if (rest === LOBBY_TABLE_ID) return null
  const n = Number.parseInt(rest, 10)
  if (!Number.isInteger(n) || n < 1 || n > 8 || String(n) !== rest) return null
  return n
}

/**
 * Phase / street fingerprint for lockstep venues: every playable table session must match
 * before cross-table host actions advance the show together.
 */
function phaseStrictSignature(gs: GameState): string {
  const r = gs.round
  const phase = gs.phase
  if (phase === 'betting') {
    const br = typeof r?.bettingRound === 'number' && Number.isFinite(r.bettingRound) ? Math.floor(r.bettingRound) : '?'
    const openRaw = r?.isBettingOpen
    const open = openRaw === true ? 'T' : openRaw === false ? 'F' : '?'
    const cc = Array.isArray(r?.communityCards) ? r.communityCards.length : 0
    return `bet|${br}|${open}|cc${cc}`
  }
  if (phase === 'answering') {
    const dl = typeof r?.answerDeadline === 'number' && Number.isFinite(r.answerDeadline) ? Math.floor(r.answerDeadline) : '?'
    return `answer|dl${dl}`
  }
  return String(phase)
}

function humanReadableStrictState(gs: GameState): string {
  const ph = gs.phase
  const r = gs.round
  if (ph === 'betting') {
    const rnd = typeof r?.bettingRound === 'number' ? r.bettingRound : '?'
    const street = rnd === 1 ? 'pre-board' : rnd === 2 ? 'after board' : `round ${String(rnd)}`
    const clock = r?.isBettingOpen === true ? 'clock open' : r?.isBettingOpen === false ? 'clock closed' : 'clock unclear'
    const cc = r?.communityCards?.length ?? 0
    return `${street}, ${clock}, ${cc}/5 board`
  }
  if (ph === 'answering') return 'answer window'
  if (ph === 'showdown') return 'showdown'
  if (ph === 'question') return 'deal setup'
  if (ph === 'lobby') return 'lobby between hands'
  return ph
}

function venuePlayableSnapshots(venueCode: string): { tk: string; n: number; gs: GameState }[] {
  const vn = normalizeVenueCode(venueCode)
  const playable = allTableSessionsInVenue(vn)
  const out: { tk: string; n: number; gs: GameState }[] = []
  for (const tk of playable) {
    const gs = rooms.get(tk)
    if (!gs) continue
    const tn = tableNumFromSessionKey(vn, tk)
    out.push({ tk, n: tn ?? NaN, gs })
  }
  out.sort((a, b) => {
    const ax = Number.isFinite(a.n) ? a.n : 99
    const bx = Number.isFinite(b.n) ? b.n : 99
    return ax - bx || a.tk.localeCompare(b.tk)
  })
  return out
}

function toastVenueMisaligned(socket: Socket, rows: { n: number; gs: GameState }[]): void {
  const seenSig = new Set<string>()
  const parts: string[] = []
  for (const row of rows) {
    const sig = phaseStrictSignature(row.gs)
    if (seenSig.has(sig)) continue
    seenSig.add(sig)
    const nums = rows
      .filter((r) => phaseStrictSignature(r.gs) === sig)
      .map((r) => (Number.isFinite(r.n) ? String(r.n) : '?'))
      .sort()
    parts.push(`${nums.join(',')}→${humanReadableStrictState(row.gs)}`)
  }
  socket.emit(
    'toast',
    `Tables are out of sync (${parts.join(' · ')}). Fix the stragglers so every felt matches before advancing.`,
  )
}

/**
 * Ensures every existing numbered session in `venueCode` shares the same strict phase fingerprint
 * and satisfies `predicate` for the initiating action — otherwise emits a toast and returns null.
 */
function requireVenueLockstepTables(
  socket: Socket,
  venueCode: string,
  predicate: (gs: GameState) => boolean,
  readinessHint: string
): { tk: string; n: number; gs: GameState }[] | null {
  const rows = venuePlayableSnapshots(venueCode)
  if (rows.length === 0) {
    socket.emit('toast', 'No playable tables yet — assign the lobby first.')
    return null
  }
  const sig0 = phaseStrictSignature(rows[0].gs)
  for (let i = 1; i < rows.length; i++) {
    if (phaseStrictSignature(rows[i].gs) !== sig0) {
      toastVenueMisaligned(socket, rows)
      return null
    }
  }
  if (!predicate(rows[0].gs)) {
    const found = humanReadableStrictState(rows[0].gs)
    socket.emit('toast', `Every table must ${readinessHint} (yours collectively: ${found}).`)
    return null
  }
  return rows
}

/** Phases where the current hand’s `round.question` should drive the shared venue-wall headline strip. */
const VENUE_WALL_HEADLINE_PHASES = new Set<string>([
  'question',
  'betting',
  'answering',
  'reveal',
  'showdown',
  'payout',
])

/**
 * Prefer the most “interesting” numbered felt for the shared TV headline bar:
 * answering (with deadline) → question setup → wagering (same question persists) → showdown family → fallback first seated table (may be lobby).
 */
function pickVenueHeadlineGameState(venueCode: string): GameState | null {
  const vn = normalizeVenueCode(venueCode)

  function firstSeated(predicate: (gs: GameState) => boolean): GameState | null {
    for (let n = 1; n <= 8; n++) {
      const key = tableSessionKey(vn, String(n))
      const gs = rooms.get(key)
      if (gs != null && gs.players.length > 0 && predicate(gs)) return gs
    }
    return null
  }

  const answering = firstSeated(
    (gs) =>
      gs.phase === 'answering' &&
      gs.round?.answerDeadline != null &&
      Number.isFinite(gs.round.answerDeadline)
  )
  if (answering) return answering

  const question = firstSeated((gs) => gs.phase === 'question')
  if (question) return question

  const wagering = firstSeated((gs) => {
    if (gs.phase !== 'betting') return false
    const t = gs.round?.question?.text
    return typeof t === 'string' && t.trim() !== ''
  })
  if (wagering) return wagering

  const post = firstSeated(
    (gs) => gs.phase === 'reveal' || gs.phase === 'showdown' || gs.phase === 'payout'
  )
  if (post) return post

  for (let n = 1; n <= 8; n++) {
    const key = tableSessionKey(vn, String(n))
    const gs = rooms.get(key)
    if (gs != null && gs.players.length > 0) return gs
  }
  return null
}

function buildHostVenueFeltBeatPayload(vnRaw: string): { felts: HostVenueFeltBeatRow[] } {
  const vn = normalizeVenueCode(vnRaw)
  const felts: HostVenueFeltBeatRow[] = []
  for (let n = 1; n <= 8; n++) {
    const key = tableSessionKey(vn, String(n))
    const gs = rooms.get(key) as GameState | undefined
    if (!gs) {
      felts.push({
        tableNum: n,
        active: false,
        seated: 0,
        phase: 'inactive',
        street: '—',
        clock: '—',
        answerDeadlineMs: null,
        phaseStrictSig: null,
      })
      continue
    }
    const seated = welcomeWallSeatCount(gs)
    const phase = gs.phase
    let street = '—'
    let clock = '—'
    let answerDeadlineMs: number | null = null

    if (phase === 'betting') {
      const br = typeof gs.round.bettingRound === 'number' ? Math.floor(gs.round.bettingRound) : 0
      const cc = gs.round.communityCards?.length ?? 0
      street = br === 1 ? 'Pre-board' : br === 2 ? `Board ${cc}/5` : `Bet rnd ${br}`
      if (gs.round.isBettingOpen === true) clock = 'Clock open'
      else if (gs.round.isBettingOpen === false) clock = 'Clock closed'
      else clock = 'Clock unclear'
    } else if (phase === 'answering') {
      street = 'Trivia lock-in'
      const dl = gs.round.answerDeadline
      answerDeadlineMs =
        typeof dl === 'number' && Number.isFinite(dl) ? Math.floor(dl) : null
      clock = answerDeadlineMs != null ? 'Countdown' : '—'
    } else if (phase === 'showdown') {
      street = 'Showdown'
      clock = '—'
    } else if (phase === 'lobby') {
      street = 'Between hands'
      clock = '—'
    } else if (phase === 'question') {
      street = 'Deal setup'
      clock = '—'
    } else {
      street = phase
    }

    felts.push({
      tableNum: n,
      active: true,
      seated,
      phase,
      street,
      clock,
      answerDeadlineMs,
      phaseStrictSig: phaseStrictSignature(gs),
    })
  }
  return { felts }
}

function emitDisplayVenueSnapshotNow(vnRaw: string) {
  const vn = normalizeVenueCode(vnRaw)
  const lobbyKey = tableSessionKey(vn, LOBBY_TABLE_ID)
  const lobbyGs = rooms.get(lobbyKey)
  const lobbyPlayerCount = lobbyGs != null ? welcomeWallSeatCount(lobbyGs) : 0

  const tiles: DisplayVenueTileSnapshot[] = []
  let totalSeatedAtTables = 0
  const tableKeys = allTableSessionsInVenue(vn).sort((a, b) => {
    const na = tableNumFromSessionKey(vn, a) ?? 99
    const nb = tableNumFromSessionKey(vn, b) ?? 99
    return na - nb
  })
  for (const key of tableKeys) {
    const n = tableNumFromSessionKey(vn, key)
    if (n == null) continue
    const gs = rooms.get(key)
    if (!gs) continue
    const seated = welcomeWallSeatCount(gs)
    totalSeatedAtTables += seated
    const seatNames = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      if (p == null) return ''
      const nm = typeof p.name === 'string' ? p.name.trim() : ''
      return nm
    })
    const seatBankrolls = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      if (p == null) return 0
      const br = p.bankroll
      return typeof br === 'number' && Number.isFinite(br) ? br : 0
    })
    const seatFolded = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      return p != null && p.hasFolded === true
    })
    const seatLastBettingAction = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const arr = gs.round.lastSeatBettingAction
      if (arr != null && i < arr.length) {
        const v = arr[i]
        return v === undefined || v === null ? null : v
      }
      return null
    })
    let actingCallAmount: number | null = null
    let actingCallPctOfStack: number | null = null
    if (gs.phase === 'betting' && gs.round.isBettingOpen !== false) {
      const idx =
        typeof gs.round.currentPlayerIndex === 'number' && Number.isFinite(gs.round.currentPlayerIndex)
          ? Math.floor(gs.round.currentPlayerIndex)
          : -1
      if (idx >= 0 && idx < gs.players.length) {
        const actor = gs.players[idx]
        if (actor && !actor.hasFolded && !actor.isAllIn) {
          actingCallAmount = chipsRequiredToCall(gs, actor.id)
          actingCallPctOfStack = pctOfStackToCall(gs, actor.id)
        }
      }
    }
    const interestingAction =
      seated >= 2 &&
      ((gs.phase === 'betting' && gs.round.isBettingOpen === true) ||
        gs.phase === 'answering' ||
        gs.phase === 'reveal' ||
        gs.phase === 'showdown')
    const seatHoleDigits = Array.from({ length: VENUE_WALL_SEAT_COUNT }, (_, i) => {
      const p = gs.players[i]
      if (p == null || p.hand.length < 2) return null
      const d0 = p.hand[0]?.digit
      const d1 = p.hand[1]?.digit
      if (
        typeof d0 !== 'number' ||
        typeof d1 !== 'number' ||
        !Number.isInteger(d0) ||
        !Number.isInteger(d1) ||
        d0 < 0 ||
        d0 > 9 ||
        d1 < 0 ||
        d1 > 9
      ) {
        return null
      }
      return [d0, d1] as [number, number]
    })
    const communityDigits =
      gs.round.communityCards.length > 0
        ? gs.round.communityCards.map((c) => c.digit)
        : undefined
    tiles.push({
      tableNum: n,
      seated,
      pot: gs.round.pot ?? 0,
      phase: gs.phase,
      seatNames,
      seatBankrolls,
      seatFolded,
      seatLastBettingAction,
      actingCallAmount,
      actingCallPctOfStack,
      ...(seatHoleDigits.some((h) => h != null) ? { seatHoleDigits } : {}),
      ...(communityDigits != null && communityDigits.length > 0 ? { communityDigits } : {}),
      ...displayBlindSeatIndices(seated, gs.round.dealerIndex),
      currentPlayerIndex:
        typeof gs.round.currentPlayerIndex === 'number' && Number.isFinite(gs.round.currentPlayerIndex)
          ? Math.floor(gs.round.currentPlayerIndex)
          : null,
      isBettingOpen: typeof gs.round.isBettingOpen === 'boolean' ? gs.round.isBettingOpen : null,
      actingSeatIndex: displayActingSeatIndex(gs.phase, seated, gs.round),
      ...(interestingAction ? { interestingAction: true } : {}),
    })
  }

  const headlineGs = pickVenueHeadlineGameState(vn)
  let headlineQuestionText: string | null = null
  let answerDeadlineMs: number | null = null
  if (headlineGs != null && VENUE_WALL_HEADLINE_PHASES.has(headlineGs.phase)) {
    const q = headlineGs.round?.question
    if (q != null && typeof q.text === 'string' && q.text.trim() !== '') {
      headlineQuestionText = q.text.trim()
    }
    if (
      headlineGs.phase === 'answering' &&
      headlineGs.round?.answerDeadline != null &&
      Number.isFinite(headlineGs.round.answerDeadline)
    ) {
      answerDeadlineMs = headlineGs.round.answerDeadline
    }
  }

  const payload: DisplayVenueWallSnapshot = {
    tiles,
    headlineQuestionText,
    answerDeadlineMs,
    lobbyPlayerCount,
    totalSeatedAtTables,
    showAudienceWelcome: !venueAudienceWelcomeExpired.has(vn),
  }
  io.to(displayVenueRoom(vn)).emit('displayVenueSnapshot', payload)
  const livelyTableNums = tiles
    .filter((t) => t.interestingAction === true)
    .map((t) => t.tableNum)
    .sort((a, b) => a - b)
  io.to(hostVenueRoom(vn)).emit('hostVenueGameplayHints', { livelyTableNums })
  io.to(hostVenueRoom(vn)).emit('hostVenueFeltBeat', buildHostVenueFeltBeatPayload(vn))
}

function afterTableStateBroadcast(gs: GameState, _sessionKey: string) {
  /** Immediate refresh — debouncing was dropping every intermediate state during VP sims. */
  emitDisplayVenueSnapshotNow(gs.code)
}

/** Emit felt state then refresh DISPLAY:{venue} wall summaries for numbered felts */
function emitVenueTableState(sessionKey: string, gs: GameState) {
  io.to(sessionKey).emit('state', gs)
  afterTableStateBroadcast(gs, sessionKey)
}

/**
 * Pure `vp:*` felts — advance one bot step at a time with a human-visible pause so the
 * venue wall can be read between decisions (demo / watch mode).
 */
const cpuVpDrainPending = new Set<string>()
/** One wagering/answering VP step per timer tick (not 72 micro-steps at once). */
const CPU_VP_STEPS_PER_CHUNK = 1

/**
 * Pace between paced CPU-only wagering steps (`drainCpuVpSessionChain`).
 * Default ~3–7s random so the venue wall stays readable during demos.
 * Set **`QHE_CPU_VP_ACTION_DELAY_MS`** on the server to a nonnegative integer (e.g. `0` or `50`)
 * when rehearsing large all-CPU fields (many seats × multiple felts → venue lockstep).
 */
function cpuVpDelayMsBetweenActions(): number {
  const raw = process.env.QHE_CPU_VP_ACTION_DELAY_MS?.trim()
  if (raw !== undefined && raw !== '') {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 0) return Math.min(n, 120_000)
  }
  const min = 3000
  const max = 7000
  return min + Math.floor(Math.random() * (max - min + 1))
}

function enqueueCpuOnlyVpDrain(sessionKey: string) {
  if (cpuVpDrainPending.has(sessionKey)) return
  cpuVpDrainPending.add(sessionKey)
  setImmediate(() => drainCpuVpSessionChain(sessionKey))
}

function drainCpuVpSessionChain(sessionKey: string) {
  let gs = rooms.get(sessionKey)
  if (!gs || !tableIsCpuOnly(gs)) {
    cpuVpDrainPending.delete(sessionKey)
    return
  }

  let s = gs
  let steps = 0
  while (steps < CPU_VP_STEPS_PER_CHUNK) {
    const next = advanceVirtualBettingStep(s)
    if (next === s) break
    s = next
    steps++
  }

  rooms.set(sessionKey, s)
  emitVenueTableState(sessionKey, s)

  gs = rooms.get(sessionKey)
  if (!gs || !tableIsCpuOnly(gs)) {
    cpuVpDrainPending.delete(sessionKey)
    return
  }

  const hitChunkCap = steps === CPU_VP_STEPS_PER_CHUNK
  if (hitChunkCap) {
    setTimeout(() => drainCpuVpSessionChain(sessionKey), cpuVpDelayMsBetweenActions())
  } else {
    cpuVpDrainPending.delete(sessionKey)
  }
}

function applyQuestionToAllPlayable(venueCode: string, picked: Question) {
  const playable = allTableSessionsInVenue(venueCode)
  for (const tk of playable) {
    let gs = rooms.get(tk)
    gs = setQuestion(gs, picked)
    gs = runVirtualPlayerSimulation(gs)
    rooms.set(tk, gs)
    emitVenueTableState(tk, gs!)
  }
}

/** Host controls that apply everywhere in the venue — rosters/hand/pot stay separate per session key. */
const VENUE_SYNC_ACTION_TYPES = new Set<string>([
  'startGame',
  'setQuestion',
  'nextQuestionFromSetlist',
  'dealInitialCards',
  'dealCommunityCards',
  'startAnswering',
  'revealAnswer',
  'endRound',
  'newGame',
  'adminSetBlinds',
  'adminCloseBetting',
  'assignTablesFromLobby'
])

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('hello', async (data: ClientHello) => {
    const { role, name, roomCode } = data

    const requiredHostSecret = process.env.HOST_SECRET?.trim()
    if (role === 'host' && requiredHostSecret) {
      const provided =
        typeof (data as { hostSecret?: string }).hostSecret === 'string'
          ? (data as { hostSecret: string }).hostSecret.trim()
          : ''
      if (provided !== requiredHostSecret) {
        socket.emit('ack', { ok: false, message: 'Invalid host credentials.' })
        socket.disconnect(true)
        return
      }
    }

    if (role === 'display' && data.displayAwaitPairing === true) {
      const sd = socket.data as DisplaySockData
      sd.role = 'display'
      sd.displayAwaitPairing = true
      sd.displayClientName = name
      clearDisplayPairingForSocket(socket.id)
      const code = assignDisplayPairing(socket)
      socket.emit('displayPairingCode', { code })
      socket.emit('ack', { ok: true, message: 'Await pairing from host.' })
      return
    }

    const venueCode = normalizeVenueCode(roomCode)
    const tableId = normalizeTableId(data.tableId)
    const helloSessionKey = tableSessionKey(venueCode, tableId)

    if (role !== 'display') {
      const candidateExists = !!rooms.get(helloSessionKey)
      if (
        tableId !== LOBBY_TABLE_ID &&
        role === 'player' &&
        !candidateExists
      ) {
        socket.emit('ack', {
          ok: false,
          message:
            'That table has not opened yet. Join via the lobby until the host seats everyone.',
        })
        return
      }
      if (tableId !== LOBBY_TABLE_ID && role === 'host' && !candidateExists) {
        socket.emit('ack', {
          ok: false,
          message:
            'Host from LOBBY until tables exist. Connect with ?table=LOBBY (default) until after Assign from lobby.',
        })
        return
      }
    }

    const sockData = socket.data as DisplaySockData
    sockData.role = role
    if (role === 'host') {
      sockData.hostAuthed = true
    }

    if (role === 'host') {
      socket.join(hostVenueRoom(venueCode))
      socket.emit('hostLibrary', await buildHostLibraryPayload(venueCode))
    }

    if (role === 'display') {
      wireDisplaySocketToVenue(socket, venueCode, data)
      return
    }

    socket.join(helloSessionKey)
    sockData.sessionKey = helloSessionKey

    let gameState = rooms.get(helloSessionKey)
    if (!gameState) {
      gameState = createEmptyGame(venueCode, '', tableId)
      rooms.set(helloSessionKey, gameState)
    }

    if (role === 'host') {
      gameState = { ...gameState, hostId: socket.id }
    }

    if (role === 'player') {
      gameState = addPlayer(gameState, socket.id, name)
    }

    gameState = runVirtualPlayerSimulation(gameState)
    rooms.set(helloSessionKey, gameState)

    const ack: ServerAck = { ok: true, message: 'Connected successfully' }
    socket.emit('ack', ack)

    emitVenueTableState(helloSessionKey, gameState)
  })

  socket.on('action', async (data: any) => {
    const { type, payload } = data

    if (type === 'displaySetLayout') {
      const sessionKey = getActiveSessionKey(socket)
      if (!sessionKey) {
        socket.emit('toast', 'No room found')
        return
      }
      const gsCtl = rooms.get(sessionKey)
      if (!gsCtl) {
        socket.emit('toast', 'Game not found')
        return
      }
      if (!assertVenueHost(socket, gsCtl)) {
        return
      }
      const nextLayout = parseDisplaySetLayoutPayload(payload)
      if (!nextLayout) {
        socket.emit('toast', 'Invalid TV layout (send venue wall + optional focus table 1–8).')
        return
      }
      venueDisplayLayouts.set(normalizeVenueCode(gsCtl.code), nextLayout)
      io.to(displayVenueRoom(gsCtl.code)).emit('displayLayout', nextLayout)
      emitDisplayVenueSnapshotNow(gsCtl.code)
      socket.emit('toast', 'TV / display layout updated for the venue.')
      return
    }

    if (type === 'pairDisplayWithHost') {
      const sessionKey = getActiveSessionKey(socket)
      if (!sessionKey) {
        socket.emit('toast', 'No room found')
        return
      }
      const gsCtl = rooms.get(sessionKey)
      if (!gsCtl) {
        socket.emit('toast', 'Game not found')
        return
      }
      if (!assertVenueHost(socket, gsCtl)) {
        return
      }
      const raw = typeof payload?.code === 'string' ? payload.code : ''
      const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (code.length !== 4) {
        socket.emit('toast', 'Enter the 4-character code from the TV.')
        socket.emit('ack', { ok: false, message: 'Invalid code length' })
        return
      }
      const pend = displayPairByCode.get(code)
      if (!pend) {
        socket.emit('toast', 'No display is waiting with that code.')
        socket.emit('ack', { ok: false, message: 'Unknown code' })
        return
      }
      const dSock = io.sockets.sockets.get(pend.socketId)
      if (!dSock) {
        displayPairByCode.delete(code)
        displayPairCodeBySocketId.delete(pend.socketId)
        socket.emit('toast', 'That display went offline. Refresh the TV to get a new code.')
        socket.emit('ack', { ok: false, message: 'Display offline' })
        return
      }
      const dsd = dSock.data as DisplaySockData
      if (!dsd.displayAwaitPairing) {
        socket.emit('toast', 'That code was already used.')
        socket.emit('ack', { ok: false, message: 'Code consumed' })
        return
      }

      clearDisplayPairingForSocket(pend.socketId)

      const vn = normalizeVenueCode(gsCtl.code)
      const displayName = typeof dsd.displayClientName === 'string' && dsd.displayClientName.trim() !== ''
        ? dsd.displayClientName.trim()
        : "Quizz'em TV"

      const bindHello: ClientHello = {
        role: 'display',
        name: displayName,
        roomCode: vn,
        tableId: '1',
        displayVenueWall: true,
        displayFocusTable: null,
      }

      wireDisplaySocketToVenue(dSock, vn, bindHello)
      dSock.emit('displayVenueAssigned', { venueCode: vn })

      socket.emit('ack', { ok: true, message: 'Display paired.' })
      socket.emit('toast', 'TV paired — it should join this venue now.')
      return
    }

    const sessionKey = getActiveSessionKey(socket)
    
    if (!sessionKey) {
      socket.emit('toast', 'No room found')
      return
    }
    
    let gameState = rooms.get(sessionKey)
    if (!gameState) {
      socket.emit('toast', 'Game not found')
      return
    }

    try {
      switch (type) {
        case 'startGame': {
          if (!assertVenueHost(socket, gameState)) break
          const lockStart = requireVenueLockstepTables(socket, gameState.code, (gs) => gs.phase === 'lobby', 'be in lobby before starting the trivia wave')
          if (!lockStart) break
          for (const { tk } of lockStart) {
            let gs = rooms.get(tk)
            gs = startGame(gs)
            gs = runVirtualPlayerSimulation(gs)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit('toast', 'Game started — synced to all tables at this venue.')
          markVenueShowStarted(gameState.code)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setQuestion': {
          if (!assertVenueHost(socket, gameState)) break
          const lockQ = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'lobby' || gs.phase === 'question',
            'stay together in lobby or deal setup before changing the question'
          )
          if (!lockQ) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const questionIdRaw = payload?.questionId
          const questionId = typeof questionIdRaw === 'string' ? questionIdRaw.trim() : ''
          let picked: Question | undefined
          if (questionId.length > 0) {
            picked = bank.find((q) => q.id === questionId)
            if (!picked) {
              socket.emit('toast', 'That question is not in your bank.')
              break
            }
          } else {
            picked = pickRandomQuestion(bank)
            if (!picked) {
              socket.emit('toast', 'Question bank is empty — add questions or restore the starter pack.')
              break
            }
          }
          applyQuestionToAllPlayable(gameState.code, picked)
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question synced to all tables at this venue.')
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'nextQuestionFromSetlist': {
          if (!assertVenueHost(socket, gameState)) break
          const lockSl = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'lobby' || gs.phase === 'question',
            'stay together in lobby or deal setup before the next setlist cue'
          )
          if (!lockSl) break
          const venue = normalizeVenueCode(gameState.code)
          const lib = await ensureVenueLibrary(gameState.code)
          let ph = getPlayhead(venue)
          if (!ph.setlistId) {
            socket.emit('toast', 'Select a setlist for this game first.')
            break
          }
          const sl = lib.setlists.find((s) => s.id === ph.setlistId)
          if (!sl) {
            socket.emit('toast', 'Active setlist was removed — pick another.')
            venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
            await emitHostLibrary(venue)
            break
          }
          let dispatched = false
          while (ph.nextIndex < sl.questionIds.length) {
            const qid = sl.questionIds[ph.nextIndex]
            const pos = ph.nextIndex + 1
            ph = { ...ph, nextIndex: ph.nextIndex + 1 }
            venuePlayhead.set(venue, ph)
            const qFound = lib.questions.find((q) => q.id === qid)
            if (qFound) {
              applyQuestionToAllPlayable(gameState.code, qFound)
              await emitHostLibrary(gameState.code)
              socket.emit(
                'toast',
                `Setlist “${sl.name}”: question ${pos} of ${sl.questionIds.length} → all tables.`
              )
              gameState = rooms.get(sessionKey)!
              dispatched = true
              break
            }
          }
          if (!dispatched && ph.nextIndex >= sl.questionIds.length) {
            await emitHostLibrary(venue)
            socket.emit(
              'toast',
              `End of setlist “${sl.name}” (or remaining ids missing from bank). Pick another rundown or free play.`
            )
          }
          break
        }

        case 'selectTriviaSetlist': {
          if (!assertVenueHost(socket, gameState)) break
          const venue = normalizeVenueCode(gameState.code)
          const lib = await ensureVenueLibrary(venue)
          const raw = payload?.setlistId
          if (raw == null || raw === '') {
            venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
            await emitHostLibrary(venue)
            socket.emit('toast', 'Setlist rundown cleared — free play from the full bank.')
            break
          }
          const id = String(raw).trim()
          if (!lib.setlists.some((s) => s.id === id)) {
            socket.emit('toast', 'That setlist does not exist.')
            break
          }
          venuePlayhead.set(venue, { setlistId: id, nextIndex: 0 })
          await emitHostLibrary(venue)
          const sel = lib.setlists.find((s) => s.id === id)!
          socket.emit(
            'toast',
            `Active rundown: “${sel.name}” — ${sel.questionIds.length} question(s); use Next from setlist for cue 1.`
          )
          break
        }

        case 'setlistCreate': {
          if (!assertVenueHost(socket, gameState)) break
          const name = String(payload?.name ?? '').trim()
          if (!name) {
            socket.emit('toast', 'Setlist needs a name.')
            break
          }
          const lib = await ensureVenueLibrary(gameState.code)
          const id = `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
          lib.setlists.push({ id, name, questionIds: [] })
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', `Setlist created: ${name}`)
          break
        }

        case 'setlistSave': {
          if (!assertVenueHost(socket, gameState)) break
          const id = String(payload?.id ?? '').trim()
          if (!id) {
            socket.emit('toast', 'setlistSave requires id.')
            break
          }
          const lib = await ensureVenueLibrary(gameState.code)
          const idx = lib.setlists.findIndex((s) => s.id === id)
          if (idx < 0) {
            socket.emit('toast', 'Setlist not found.')
            break
          }
          const prev = lib.setlists[idx]
          const name =
            typeof payload?.name === 'string' && payload.name.trim()
              ? payload.name.trim()
              : prev.name
          let questionIds = prev.questionIds
          if (Array.isArray(payload?.questionIds)) {
            questionIds = sanitizeSetlistQuestionIds(
              lib,
              (payload.questionIds as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.trim()),
            )
          }
          lib.setlists[idx] = { id: prev.id, name, questionIds }
          await persistVenues()
          const ph = getPlayhead(normalizeVenueCode(gameState.code))
          if (ph.setlistId === id && ph.nextIndex > questionIds.length) {
            venuePlayhead.set(normalizeVenueCode(gameState.code), {
              setlistId: id,
              nextIndex: Math.max(0, questionIds.length),
            })
          }
          await emitHostLibrary(gameState.code)
          socket.emit('toast', `Setlist “${name}” saved (${questionIds.length} questions).`)
          break
        }

        case 'setlistDelete': {
          if (!assertVenueHost(socket, gameState)) break
          const id = String(payload?.id ?? '').trim()
          const venue = normalizeVenueCode(gameState.code)
          const lib = await ensureVenueLibrary(venue)
          const next = lib.setlists.filter((s) => s.id !== id)
          if (next.length === lib.setlists.length) {
            socket.emit('toast', 'Setlist not found.')
            break
          }
          lib.setlists = next
          await persistVenues()
          const ph = getPlayhead(venue)
          if (ph.setlistId === id) {
            venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
          }
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Setlist removed.')
          break
        }

        case 'dealInitialCards': {
          if (!assertVenueHost(socket, gameState)) break
          const lockDeal = requireVenueLockstepTables(socket, gameState.code, (gs) => gs.phase === 'question', 'wait in deal setup before hole cards + blinds')
          if (!lockDeal) break
          for (const { tk } of lockDeal) {
            let gs = rooms.get(tk)
            gs = dealInitialCards(gs)
            rooms.set(tk, gs)
            io.to(tk).emit('dealingCards')
            emitVenueTableState(tk, gs)
            if (tableIsCpuOnly(gs)) {
              enqueueCpuOnlyVpDrain(tk)
            } else {
              gs = runVirtualPlayerSimulation(gs)
              rooms.set(tk, gs)
              emitVenueTableState(tk, gs)
            }
          }
          socket.emit('toast', 'Hole cards dealt — wagering round 1 (all tables).')
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'dealCommunityCards': {
          if (!assertVenueHost(socket, gameState)) break
          const lockBoard = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) =>
              gs.phase === 'betting' &&
              gs.round.bettingRound === 1 &&
              gs.round.isBettingOpen === false &&
              (gs.round.communityCards?.length ?? 0) < 5,
            'finish pre-board wagering (clock closed) so all felts match before dealing the board',
          )
          if (!lockBoard) break
          let anyDealt = false
          for (const { tk } of lockBoard) {
            let gs = rooms.get(tk)
            const communityBefore = gs.round.communityCards.length
            gs = dealCommunityCards(gs)
            const dealt = gs.round.communityCards.length > communityBefore
            if (dealt) anyDealt = true
            rooms.set(tk, gs)
            if (dealt) {
              emitVenueTableState(tk, gs)
              if (tableIsCpuOnly(gs)) {
                enqueueCpuOnlyVpDrain(tk)
              } else {
                gs = runVirtualPlayerSimulation(gs)
                rooms.set(tk, gs)
                emitVenueTableState(tk, gs)
              }
              io.to(tk).emit('dealingCommunityCards')
            } else {
              emitVenueTableState(tk, gs)
            }
          }
          if (anyDealt) {
            socket.emit('toast', 'Board complete — wagering round 2 (every table at this venue).')
          } else {
            socket.emit('toast', 'Board failed to deal — reload from host if this persists.')
          }
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'startAnswering': {
          if (!assertVenueHost(socket, gameState)) break
          const lockAns = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) =>
              gs.phase === 'betting' &&
              gs.round.isBettingOpen === false &&
              gs.round.bettingRound === 2 &&
              (gs.round.communityCards?.length ?? 0) >= 5,
            'finish post-board wagering (clock closed) with a complete board before trivia answers open',
          )
          if (!lockAns) break
          const vn = normalizeVenueCode(gameState.code)
          const durationSec = resolveAnswerWindowSecondsForStart(vn, payload)
          const durationMs = durationSec * 1000
          const deadlineMs2 = Date.now() + durationMs
          for (const { tk } of lockAns) {
            let gs = rooms.get(tk)
            gs = {
              ...gs,
              phase: 'answering',
              round: { ...gs.round, answerDeadline: deadlineMs2 }
            }
            gs = runVirtualPlayerSimulation(gs)
            const prev = answerTimers.get(tk)
            if (prev) clearTimeout(prev)
            const timer2 = setTimeout(() => {
              const cur = rooms.get(tk)
              if (!cur) return
              if (cur.phase === 'answering') {
                const revealed = revealAnswer(cur)
                rooms.set(tk, revealed)
                emitVenueTableState(tk, revealed)
                io.to(tk).emit('toast', '⏱️ Time up! Revealing answers...')
              }
            }, durationMs)
            answerTimers.set(tk, timer2)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit(
            'toast',
            `Answering opened — ${lockAns.length} table(s); ${durationSec}s countdown at each felt.`,
          )
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'setVenueAnswerWindow': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const raw = Number((payload as { seconds?: unknown })?.seconds)
          if (!Number.isFinite(raw)) {
            socket.emit(
              'toast',
              `Set answer window to a number between ${ANSWER_WINDOW_MIN_SEC} and ${ANSWER_WINDOW_MAX_SEC} seconds.`,
            )
            break
          }
          const sec = setVenueAnswerWindowSecondsPersist(vn, raw)
          await emitHostLibrary(vn)
          socket.emit(
            'toast',
            `Default trivia answer window for ${vn} is now ${sec}s (${ANSWER_WINDOW_MIN_SEC}–${ANSWER_WINDOW_MAX_SEC}).`,
          )
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'bet':
          const betAction = payload as BetAction
          gameState = placeBet(gameState, betAction.playerId, betAction.amount)
          io.to(sessionKey).emit('toast', `${betAction.playerId} bet $${betAction.amount}`)
          break
        case 'check':
          gameState = playerCheck(gameState, (payload as CheckAction).playerId)
          io.to(sessionKey).emit('toast', `Check`)
          break
        case 'call':
          gameState = playerCall(gameState, (payload as CallAction).playerId)
          io.to(sessionKey).emit('toast', `Call`)
          break
        case 'raise':
          gameState = playerRaise(gameState, (payload as RaiseAction).playerId, (payload as RaiseAction).amount)
          io.to(sessionKey).emit('toast', `Raise`)
          break
        case 'allIn':
          gameState = playerAllIn(gameState, (payload as AllInAction).playerId)
          io.to(sessionKey).emit('toast', `All-in!`)
          break
        case 'adminCloseBetting': {
          if (!assertVenueHost(socket, gameState)) break
          const lockClose = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'betting' && gs.round.isBettingOpen === true,
            'have wagering open on every felt so closing the street applies to the whole room together',
          )
          if (!lockClose) break
          for (const { tk } of lockClose) {
            let gs = rooms.get(tk)
            gs = adminCloseBetting(gs)
            gs = runVirtualPlayerSimulation(gs)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit('toast', 'Betting closed — entire venue in sync.')
          gameState = rooms.get(sessionKey)!
          break
        }
        case 'adminAdvanceTurn':
          if (!assertVenueHost(socket, gameState)) break
          gameState = adminAdvanceTurn(gameState)
          io.to(sessionKey).emit('toast', `Advanced to next player`)
          break
        case 'adminSetBlinds': {
          if (!assertVenueHost(socket, gameState)) break
          const { smallBlind, bigBlind } = payload as any
          const sb = Number(smallBlind)
          const bb = Number(bigBlind)
          for (const tk of allVenueSessionKeys(gameState.code)) {
            let gs = rooms.get(tk)
            gs = adminSetBlinds(gs, sb, bb)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit('toast', `Blinds synced: SB ${sb}, BB ${bb}`)
          gameState = rooms.get(sessionKey)!
          break
        }
          
        case 'fold':
          const foldAction = payload as FoldAction
          gameState = foldPlayer(gameState, foldAction.playerId)
          io.to(sessionKey).emit('toast', `${foldAction.playerId} folded`)
          break
          
        case 'submitAnswer': {
          const submitAnswerAction = payload as SubmitAnswerAction
          if (gameState.phase !== 'answering') {
            socket.emit('toast', 'Not accepting answers right now.')
            socket.emit('ack', { ok: false, message: 'Not accepting answers right now.' })
            break
          }
          const deadline = gameState.round.answerDeadline ?? 0
          if (Date.now() > deadline) {
            socket.emit('toast', '⏱️ Too late! Answer window has closed.')
            socket.emit('ack', { ok: false, message: 'Answer window has closed.' })
            break
          }
          if (
            !isSubmittedAnswerComposableFromDeal(
              gameState,
              submitAnswerAction.playerId,
              submitAnswerAction.answer
            )
          ) {
            socket.emit(
              'toast',
              'That number cannot be built from your two hole cards and the five board cards (exactly five digit picks, optional decimal).'
            )
            socket.emit('ack', {
              ok: false,
              message: 'Answer is not constructible from the dealt digit cards.',
            })
            break
          }
          gameState = submitAnswer(gameState, submitAnswerAction.playerId, submitAnswerAction.answer)
          io.to(sessionKey).emit('toast', `Answer submitted: ${submitAnswerAction.answer}`)
          socket.emit('ack', { ok: true, message: 'Answer recorded.' })
          break
        }
          
        case 'revealAnswer': {
          if (!assertVenueHost(socket, gameState)) break
          const lockRev = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'answering',
            'wait until every table is in the same trivia answer window before revealing',
          )
          if (!lockRev) break
          for (const { tk } of lockRev) {
            let gs = rooms.get(tk)
            gs = revealAnswer(gs)
            rooms.set(tk, gs)
            emitVenueTableState(tk, gs)
          }
          socket.emit('toast', 'Answers revealed — every table at this venue.')
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'endRound': {
          if (!assertVenueHost(socket, gameState)) break
          const lockEnd = requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'showdown',
            'bring every felt to showdown (reveal trivia) before paying / resetting the wave',
          )
          if (!lockEnd) break
          for (const { tk } of lockEnd) {
            const gs = rooms.get(tk)
            const next = endRound(gs!)
            rooms.set(tk, next)
            emitVenueTableState(tk, next)
          }
          socket.emit('toast', `Round cleared — lobby on all ${lockEnd.length} felts at this venue.`)
          gameState = rooms.get(sessionKey)!
          break
        }

        case 'newGame': {
          if (!assertVenueHost(socket, gameState)) break
          const vn = normalizeVenueCode(gameState.code)
          const hostIdSnap = gameState.hostId
          const lobbyKey = tableSessionKey(vn, LOBBY_TABLE_ID)
          for (const tk of allTableSessionsInVenue(vn)) {
            io.to(tk).emit('toast', 'Venue reset — use the lobby link to rejoin.')
            rooms.delete(tk)
          }
          const freshLobby = {
            ...createEmptyGame(vn, hostIdSnap, LOBBY_TABLE_ID),
            smallBlind: gameState.smallBlind,
            bigBlind: gameState.bigBlind,
          }
          rooms.set(lobbyKey, freshLobby)
          const hostSock = io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            for (const r of [...hostSock.rooms]) {
              if (r === hostSock.id) continue
              if (typeof r === 'string' && r.startsWith(venueSessionKeyPrefix(vn))) {
                hostSock.leave(r)
              }
            }
            hostSock.join(lobbyKey)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = lobbyKey
          }
          emitVenueTableState(lobbyKey, freshLobby)
          socket.emit('toast', 'New game — numbered tables cleared; lobby reset.')
          venueAudienceWelcomeExpired.delete(vn)
          emitDisplayVenueSnapshotNow(gameState.code)
          gameState = rooms.get(lobbyKey)!
          break
        }

        case 'assignTablesFromLobby': {
          if (!isLobbySessionKey(sessionKey)) {
            socket.emit(
              'toast',
              'Run “Assign” from the lobby session only (join host as table LOBBY).'
            )
            break
          }
          if (!assertVenueHost(socket, gameState)) break
          if (gameState.phase !== 'lobby') {
            socket.emit('toast', 'Assign only while still in lobby phase.')
            break
          }
          const lobbyKey = sessionKey
          const lobbyGs = rooms.get(lobbyKey)
          const roster = [...lobbyGs.players]
          if (roster.length === 0) {
            socket.emit('toast', 'No players in the lobby.')
            break
          }
          const hostIdSnap = lobbyGs.hostId
          const N = roster.length
          const tableCount = computeOptimalTableCount(N, lobbyGs.maxPlayers, lobbyGs.minPlayers)
          const sizes = splitIntoTableSizes(N, tableCount)
          const shuffled = shuffle(roster)
          let offset = 0
          for (let ti = 0; ti < tableCount; ti++) {
            const slice = shuffled.slice(offset, offset + sizes[ti])
            offset += sizes[ti]
            const tid = String(ti + 1)
            const tk = tableSessionKey(lobbyGs.code, tid)
            let gsNew = createEmptyGame(lobbyGs.code, hostIdSnap, tid)
            gsNew = {
              ...gsNew,
              smallBlind: lobbyGs.smallBlind,
              bigBlind: lobbyGs.bigBlind,
              players: slice,
            }
            /** Humans expect lobby after assign until the host starts play — VP auto-run skips unless the table is CPU-only. */
            if (tableIsCpuOnly(gsNew)) {
              gsNew = runVirtualPlayerSimulation(gsNew)
            }
            rooms.set(tk, gsNew)
            for (const p of slice) {
              if (p.id.startsWith('vp:')) continue
              const sock = io.sockets.sockets.get(p.id)
              if (sock) {
                sock.leave(lobbyKey)
                sock.join(tk)
                ;(sock.data as { sessionKey?: string }).sessionKey = tk
                sock.emit('seated', { tableId: tid })
              }
            }
            emitVenueTableState(tk, gsNew)
          }

          const emptyLobby = {
            ...createEmptyGame(normalizeVenueCode(lobbyGs.code), hostIdSnap, LOBBY_TABLE_ID),
            smallBlind: lobbyGs.smallBlind,
            bigBlind: lobbyGs.bigBlind,
          }
          rooms.set(lobbyKey, emptyLobby)
          io.to(lobbyKey).emit('state', emptyLobby)

          const t1Key = tableSessionKey(lobbyGs.code, '1')
          const hostSock = io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            hostSock.leave(lobbyKey)
            hostSock.join(t1Key)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = t1Key
          }

          socket.emit(
            'toast',
            `Seated ${N} players randomly across ${tableCount} tables (${sizes.join(', ')}). You are now on table 1.`
          )
          markVenueShowStarted(lobbyGs.code)
          gameState = rooms.get(t1Key)!
          break
        }

        case 'addVirtualPlayers': {
          if (!assertVenueHost(socket, gameState)) break
          const raw = Number((payload as { count?: number })?.count ?? 2)
          const asked = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2
          gameState = spawnVirtualPlayers(gameState, asked)
          const nVirt = liveVirtualCount(gameState)
          io.to(sessionKey).emit('toast', `Test mode: added virtual seats (CPU total: ${nVirt}).`)
          break
        }

        case 'clearVirtualPlayers': {
          if (!assertVenueHost(socket, gameState)) break
          const cleared = liveVirtualCount(gameState)
          gameState = removeAllVirtualPlayers(gameState)
          io.to(sessionKey).emit(
            'toast',
            cleared > 0 ? `Removed ${cleared} virtual seat(s).` : 'No virtual seats to remove.'
          )
          break
        }

        case 'questionBankAdd': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const text = String(payload?.text ?? '').trim()
          const answer = Number(payload?.answer)
          if (!text || Number.isNaN(answer)) {
            socket.emit('toast', 'Question text and a numeric answer are required.')
            break
          }
          const id = `qb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
          const catRaw = payload?.category != null ? String(payload.category).trim() : ''
          const diff = Number(payload?.difficulty)
          const q: Question = {
            id,
            text,
            answer,
            category: catRaw.length > 0 ? catRaw : undefined,
            difficulty: Number.isFinite(diff) && diff >= 1 && diff <= 5 ? diff : undefined,
          }
          bank.push(q)
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question added.')
          break
        }

        case 'questionBankUpdate': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const id = String(payload?.id ?? '').trim()
          const idx = bank.findIndex((q) => q.id === id)
          if (idx < 0) {
            socket.emit('toast', 'Question not found.')
            break
          }
          const prev = bank[idx]
          const text =
            typeof payload?.text === 'string' ? payload.text.trim() : prev.text
          const ans =
            payload?.answer !== undefined ? Number(payload.answer) : prev.answer
          if (!text || Number.isNaN(ans)) {
            socket.emit('toast', 'Invalid text or answer.')
            break
          }
          let cat: string | undefined
          if (!('category' in (payload ?? {}))) {
            cat = prev.category
          } else if (payload?.category === null || payload?.category === '') {
            cat = undefined
          } else {
            const c = typeof payload.category === 'string' ? payload.category.trim() : ''
            cat = c.length > 0 ? c : undefined
          }
          let diff: number | undefined
          if (!('difficulty' in (payload ?? {}))) {
            diff = prev.difficulty
          } else if (payload?.difficulty === null) {
            diff = undefined
          } else {
            const d = Number(payload.difficulty)
            diff = Number.isFinite(d) && d >= 1 && d <= 5 ? d : undefined
          }
          bank[idx] = {
            ...prev,
            id: prev.id,
            text,
            answer: ans,
            category: cat,
            difficulty: diff,
          }
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question saved.')
          break
        }

        case 'questionBankDelete': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const id = String(payload?.id ?? '').trim()
          const filtered = bank.filter((q) => q.id !== id)
          if (filtered.length === bank.length) {
            socket.emit('toast', 'Question not found.')
            break
          }
          pruneIdFromAllSetlists(lib, id)
          lib.questions = filtered
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question removed.')
          break
        }

        case 'questionBankMove': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          const bank = [...lib.questions]
          const id = String(payload?.id ?? '').trim()
          const dir = payload?.direction === 'down' ? 'down' : 'up'
          const idx = bank.findIndex((q) => q.id === id)
          if (idx < 0) break
          const j = dir === 'up' ? idx - 1 : idx + 1
          if (j < 0 || j >= bank.length) break
          ;[bank[idx], bank[j]] = [bank[j], bank[idx]]
          lib.questions = bank
          await persistVenues()
          await emitHostLibrary(gameState.code)
          break
        }

        case 'questionBankImportRows': {
          if (!assertVenueHost(socket, gameState)) break
          const replace = !!payload?.replace
          const rows = payload?.rows
          if (!Array.isArray(rows) || rows.length === 0) {
            socket.emit('toast', 'Import payload must contain a rows array.')
            break
          }
          const venue = normalizeVenueCode(gameState.code)
          const validated = coerceImportQuestions(venue, rows)
          if (validated.length === 0) {
            socket.emit('toast', 'No valid rows (each needs text plus a numeric answer).')
            break
          }
          const lib = await ensureVenueLibrary(venue)
          if (replace) {
            lib.questions = validated
          } else {
            lib.questions = [...lib.questions, ...validated]
          }
          pruneSetlistRefs(lib)
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit(
            'toast',
            replace
              ? `Replaced bank with ${validated.length} question(s); setlists pruned to valid ids.`
              : `Appended ${validated.length} question(s).`
          )
          break
        }

        case 'questionBankResetSamples': {
          if (!assertVenueHost(socket, gameState)) break
          const lib = await ensureVenueLibrary(gameState.code)
          lib.questions = SAMPLE_QUESTIONS.map((q) => ({ ...q }))
          pruneSetlistRefs(lib)
          await persistVenues()
          await emitHostLibrary(gameState.code)
          socket.emit('toast', 'Starter pack restored.')
          break
        }
          
        default:
          socket.emit('toast', 'Unknown action')
          return
      }
      
      if (!VENUE_SYNC_ACTION_TYPES.has(type)) {
        gameState = runVirtualPlayerSimulation(gameState)
        rooms.set(sessionKey, gameState)
        emitVenueTableState(sessionKey, gameState)
      }
      
    } catch (error) {
      console.error('Action error:', error)
      socket.emit('toast', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)

    clearDisplayPairingForSocket(socket.id)
    
    // Remove player from all rooms they were in
    socket.rooms.forEach(joinedRoom => {
      if (joinedRoom !== socket.id) {
        const gameState = rooms.get(joinedRoom)
        if (gameState) {
          // Find and remove the player
          let updatedState = removePlayer(gameState, socket.id)
          updatedState = runVirtualPlayerSimulation(updatedState)
          rooms.set(joinedRoom, updatedState)
          emitVenueTableState(joinedRoom, updatedState)
        }
      }
    })
  })
})

const PORT = Number(process.env.PORT) || 7777
const HOST = process.env.HOST ?? '0.0.0.0'
const publicOrigin =
  process.env.RAILWAY_PUBLIC_DOMAIN != null && process.env.RAILWAY_PUBLIC_DOMAIN !== ''
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null

async function bootstrap(): Promise<void> {
  venueLibraries = await loadVenueLibraries()
  const dbMode = process.env.DATABASE_URL?.trim() ? 'PostgreSQL (DATABASE_URL)' : 'SQLite file (VENUE_DATABASE_PATH or default under apps/server/data)'
  console.log(`📚 Venue libraries: ${dbMode}`)
  initAnswerWindowEnvDefault()
  loadVenueAnswerWindowSettingsFromDisk()
  console.log(
    '⏱️ Trivia answer window: default from ANSWER_WINDOW_SECONDS (see server); venue overrides in data/venue-answer-settings.json.',
  )

  httpServer.listen(PORT, HOST, () => {
    console.log(`🎰 Quizz\u2019em server running on ${HOST}:${PORT}`)
    console.log(`🌐 WebSocket server ready for connections`)
    const base = publicOrigin ?? `http://localhost:${PORT}`
    console.log(`📱 Host: ${base}/host`)
    console.log(`👤 Player: ${base}/player`)
    console.log(`📺 Display: ${base}/display`)
  })
}

bootstrap().catch((err) => {
  console.error('Fatal: failed to start server (venue library load):', err)
  process.exit(1)
})
