import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
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
  revealAnswer,
  determineWinner,
  payoutWinner,
  endRound
} from '@qhe/core'
import type { 
  ClientHello, 
  ServerAck, 
  StartGameAction,
  SetQuestionAction,
  DealCardsAction,
  BetAction,
  FoldAction,
  RevealAnswerAction,
  EndRoundAction,
  NewGameAction
} from '@qhe/net'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// Serve static files for all apps
app.use('/host', express.static(path.join(__dirname, '../../host/dist')))
app.use('/player', express.static(path.join(__dirname, '../../player/dist')))
app.use('/display', express.static(path.join(__dirname, '../../display/dist')))

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
              <title>All*InQuizition</title>
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
        <h1>🎰 ALL*INQUIZITION</h1>
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

const rooms = new Map<string, any>()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('hello', (data: ClientHello) => {
    const { role, name, roomCode } = data
    
    // Join the room
    socket.join(roomCode)
    
    // Get or create game state
    let gameState = rooms.get(roomCode)
    if (!gameState) {
      gameState = createEmptyGame(roomCode)
      rooms.set(roomCode, gameState)
    }
    
    // Add player if it's a player role
    if (role === 'player') {
      gameState = addPlayer(gameState, socket.id, name)
      rooms.set(roomCode, gameState)
    }
    
    // Send acknowledgment
    const ack: ServerAck = { ok: true, message: 'Connected successfully' }
    socket.emit('ack', ack)
    
    // Broadcast updated state to all clients in the room
    io.to(roomCode).emit('state', gameState)
  })

  socket.on('action', (data: any) => {
    const { type, payload } = data
    const roomCode = Array.from(socket.rooms)[1] // Get the room code (first room is socket.id)
    
    if (!roomCode) {
      socket.emit('toast', 'No room found')
      return
    }
    
    let gameState = rooms.get(roomCode)
    if (!gameState) {
      socket.emit('toast', 'Game not found')
      return
    }

    try {
      switch (type) {
        case 'startGame':
          gameState = startGame(gameState)
          io.to(roomCode).emit('toast', 'Game started!')
          break
          
        case 'setQuestion':
          console.log('🎰 Server: Received setQuestion action')
          gameState = setQuestion(gameState)
          console.log('🎰 Server: Question set:', gameState.round.question)
          console.log('🎰 Server: New phase:', gameState.phase)
          
          // Update the room state and emit to all clients
          rooms.set(roomCode, gameState)
          io.to(roomCode).emit('state', gameState)
          io.to(roomCode).emit('toast', 'Question set!')
          break
          
        case 'dealInitialCards':
          gameState = dealInitialCards(gameState)
          io.to(roomCode).emit('dealingCards') // Trigger dealing animation
          io.to(roomCode).emit('toast', 'Initial cards dealt!')
          break
          
        case 'dealCommunityCards':
          console.log('🎰 Server: Received dealCommunityCards action')
          gameState = dealCommunityCards(gameState)
          console.log('🎰 Server: Generated community cards:', gameState.round.communityCards)
          console.log('🎰 Server: Community cards count:', gameState.round.communityCards.length)
          
          // Update the room state FIRST
          rooms.set(roomCode, gameState)
          io.to(roomCode).emit('state', gameState)
          
          // THEN emit the animation event
          console.log('🎰 Server: Emitting dealingCommunityCards event to room:', roomCode)
          io.to(roomCode).emit('dealingCommunityCards') // Trigger community card dealing animation
          io.to(roomCode).emit('toast', 'Community cards dealt!')
          break
          
        case 'bet':
          const betAction = payload as BetAction
          gameState = placeBet(gameState, betAction.playerId, betAction.amount)
          io.to(roomCode).emit('toast', `${betAction.playerId} bet $${betAction.amount}`)
          break
          
        case 'fold':
          const foldAction = payload as FoldAction
          gameState = foldPlayer(gameState, foldAction.playerId)
          io.to(roomCode).emit('toast', `${foldAction.playerId} folded`)
          break
          
        case 'revealAnswer':
          gameState = revealAnswer(gameState)
          io.to(roomCode).emit('toast', 'Answer revealed!')
          break
          
        case 'endRound':
          gameState = endRound(gameState)
          io.to(roomCode).emit('toast', 'Round ended!')
          break
          
        case 'newGame':
          // Create a completely new game with the same room code - remove all players
          gameState = createEmptyGame(roomCode, gameState.hostId)
          io.to(roomCode).emit('toast', 'New game started! All players removed.')
          break
          
        default:
          socket.emit('toast', 'Unknown action')
          return
      }
      
      // Only update state here for non-community card actions
      if (type !== 'dealCommunityCards') {
        rooms.set(roomCode, gameState)
        io.to(roomCode).emit('state', gameState)
      }
      
    } catch (error) {
      console.error('Action error:', error)
      socket.emit('toast', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    
    // Remove player from all rooms they were in
    socket.rooms.forEach(roomCode => {
      if (roomCode !== socket.id) {
        const gameState = rooms.get(roomCode)
        if (gameState) {
          // Find and remove the player
          const updatedState = removePlayer(gameState, socket.id)
          rooms.set(roomCode, updatedState)
          io.to(roomCode).emit('state', updatedState)
        }
      }
    })
  })
})

const PORT = 7777
httpServer.listen(PORT, () => {
      console.log(`🎰 All*InQuizition Server running on port ${PORT}`)
  console.log(`🌐 WebSocket server ready for connections`)
  console.log(`📱 Host: http://localhost:${PORT}/host`)
  console.log(`👤 Player: http://localhost:${PORT}/player`)
  console.log(`📺 Display: http://localhost:${PORT}/display`)
})
