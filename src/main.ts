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
        <div class="loadout-strip" id="loadout-strip" aria-label="本輪隨身裝備">
          <span>隨身</span><b id="loadout-one">尚未整備</b><b id="loadout-two">—</b>
        </div>
        <div class="crew-strip" aria-live="polite">
          <span>搭檔</span><b id="crew-specialist">尚未選人</b><i id="field-rumor">現場還沒有風聲</i>
        </div>
      </header>
      <div class="game-canvas" id="game-canvas"></div>
      <section class="preflight" id="preflight" aria-labelledby="preflight-title">
        <span>PRE-FLIGHT · 情報不完整</span>
        <h2 id="preflight-title">今晚只帶兩樣</h2>
        <p>這些風聲不一定都會發生，也沒有人能替你保證順序。</p>
        <ul id="field-signals" class="field-signals"></ul>
        <div class="equipment-grid" id="equipment-grid"></div>
        <small id="preflight-count">已選 0/2 · 留下什麼，也是一個決定</small>
        <div class="crew-pick">
          <span>今晚和誰搭檔</span>
          <div class="specialist-grid" id="specialist-grid"></div>
        </div>
        <button id="start-shift" type="button" disabled>收好兩樣，出發</button>
      </section>
      <div class="completion" id="completion" role="status" aria-live="polite">
        <span id="completion-kicker">DELIVERED · 1/3</span>
        <strong id="completion-title">本案已交件</strong>
        <p id="completion-copy">壓力歸零。流程替你把混亂留在身後。</p>
        <div class="completion-insight">
          <b id="outcome-title">流程已收束</b>
          <small id="outcome-detail">完成交件後，工作室會留下下一案的餘裕。</small>
        </div>
        <div class="incident-debrief">
          <span>FIELD NOTE · 現場留下的痕跡</span>
          <b id="incident-title">今晚沒有足夠資料</b>
          <small id="incident-detail">有些風險只能在真正發生後被看見。</small>
        </div>
        <div class="rumor-debrief">
          <span>TEAM CHAT · 大拜拜留下的話</span>
          <b id="rumor-title">現場暫時沒有耳語</b>
          <small id="rumor-detail">真正麻煩的，常常不是工作，而是沒有人確認過的話。</small>
        </div>
        <div class="upgrade-panel" id="upgrade-panel">
          <span>SOP INVESTMENT · 把一次經驗留下來</span>
          <small id="upgrade-copy">交件後選一處改善，下一案就少一點臨場負擔。</small>
          <div class="upgrade-grid" id="upgrade-grid"></div>
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
