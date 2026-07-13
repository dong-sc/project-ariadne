import './style.css';
import { AriadneGame } from './runtime/AriadneGame';

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw new Error('Missing #app root.');

  root.innerHTML = `
    <section class="game-shell">
      <header class="game-hud">
        <h1>Project Ariadne</h1>
        <p>點一次派人工作；觀察壓力，再決定下一步。</p>
        <div class="metrics">
          <div class="metric"><b id="cash">$3,000</b><span>現金</span></div>
          <div class="metric"><b id="deadline">105s</b><span>截止</span></div>
          <div class="metric"><b id="stress">0%</b><span>混亂</span></div>
          <div class="metric"><b id="combo">待命</b><span>狀態</span></div>
        </div>
      </header>
      <div class="game-canvas" id="game-canvas"></div>
      <div class="bottom-copy" id="message">點一次派人工作。不必連點。</div>
    </section>
  `;

  const host = document.querySelector<HTMLDivElement>('#game-canvas');
  if (!host) throw new Error('Missing game canvas host.');

  const game = new AriadneGame(host);
  await game.start();
}

void bootstrap();
