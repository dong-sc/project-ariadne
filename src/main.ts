import './style.css';
import { AriadneGame } from './runtime/AriadneGame';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root.');

root.innerHTML = `
  <section class="game-shell">
    <header class="game-hud">
      <h1>Project Ariadne</h1>
      <p>分配注意力，阻止工作室雪崩。</p>
      <div class="metrics">
        <div class="metric"><b id="cash">$3,000</b><span>現金</span></div>
        <div class="metric"><b id="deadline">90s</b><span>截止</span></div>
        <div class="metric"><b id="stress">0%</b><span>混亂</span></div>
        <div class="metric"><b id="combo">0</b><span>專注</span></div>
      </div>
    </header>
    <div class="game-canvas" id="game-canvas"></div>
    <div class="bottom-copy" id="message">點擊工作站投入注意力。真正的高手，會讓火越來越少。</div>
  </section>
`;

const host = document.querySelector<HTMLDivElement>('#game-canvas');
if (!host) throw new Error('Missing game canvas host.');

const game = new AriadneGame(host);
await game.start();
