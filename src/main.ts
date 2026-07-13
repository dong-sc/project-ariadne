import './style.css';
import { AriadneGame } from './runtime/AriadneGame';

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw new Error('Missing #app root.');

  root.innerHTML = `
    <section class="game-shell">
      <header class="game-hud">
        <div class="title-row">
          <h1>Project Ariadne</h1>
          <span class="sprint-label">ONE CLICK · ONE DECISION</span>
        </div>
        <p id="next-action">下一步｜派工拍攝</p>
        <div class="metrics">
          <div class="metric metric-brief"><b id="job-title">活動快訊</b><span id="job-focus">1/3 · 三站平衡</span></div>
          <div class="metric"><b id="deadline">78s</b><span>截止</span></div>
          <div class="metric"><b id="studio-state">穩定</b><span>工作室</span></div>
          <div class="metric"><b id="assistant-state">待命</b><span>流程助理</span></div>
        </div>
      </header>
      <div class="game-canvas" id="game-canvas"></div>
      <div class="completion" id="completion" role="status" aria-live="polite">
        <span id="completion-kicker">DELIVERED · 1/3</span>
        <strong id="completion-title">本案已交件</strong>
        <p id="completion-copy">壓力歸零。流程替你把混亂留在身後。</p>
        <div class="completion-insight">
          <b id="outcome-title">流程已收束</b>
          <small id="outcome-detail">完成交件後，工作室會留下下一案的餘裕。</small>
        </div>
        <button id="next-job" type="button">準備好，再接下一案</button>
      </div>
      <div class="bottom-copy" id="message" aria-live="polite">先觀察，再點一下派工。</div>
    </section>
  `;

  const host = document.querySelector<HTMLDivElement>('#game-canvas');
  if (!host) throw new Error('Missing game canvas host.');

  const game = new AriadneGame(host);
  await game.start();
}

void bootstrap();
