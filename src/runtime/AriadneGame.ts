import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  AriadneLoop,
  EQUIPMENT,
  JOB_BRIEFS,
  STAGE_ORDER,
  type DispatchResult,
  type EquipmentId,
  type IncidentOutcome,
  type JobOutcome,
  type LoopEvent,
  type ProductionStationId,
  type StationId,
} from './AriadneLoop';
import { calculateWorldLayout } from './layout';

type RiskState = 'calm' | 'busy' | 'danger';

interface Station {
  id: StationId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

interface StationView {
  root: Container;
  body: Graphics;
  detail: Graphics;
  pressureBar: Graphics;
  progressBar: Graphics;
  label: Text;
  statusLabel: Text;
  queueDots: Graphics[];
}

const STATIONS: readonly Station[] = [
  { id: 'capture', label: '拍攝', x: 32, y: 344, width: 120, height: 112, color: 0x537fc9 },
  { id: 'edit', label: '修圖', x: 181, y: 302, width: 148, height: 142, color: 0x725ac0 },
  { id: 'delivery', label: '交件', x: 358, y: 344, width: 120, height: 112, color: 0xb97f4d },
  { id: 'client', label: '客戶窗口', x: 172, y: 166, width: 176, height: 98, color: 0xa95563 },
];

export class AriadneGame {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly loop = new AriadneLoop();
  private readonly stationViews = new Map<StationId, StationView>();
  private readonly ambientLayer = new Graphics();
  private readonly briefBoard = new Graphics();
  private readonly briefTitle = new Text({
    text: '',
    style: new TextStyle({ fill: 0xf4d276, fontSize: 12, fontWeight: '800' }),
  });
  private readonly briefCue = new Text({
    text: '',
    style: new TextStyle({ fill: 0xcbd3e0, fontSize: 9, lineHeight: 13, wordWrap: true, wordWrapWidth: 168 }),
  });
  private readonly briefProgress = new Text({
    text: '',
    style: new TextStyle({ fill: 0x8f9aae, fontSize: 8, fontWeight: '700' }),
  });
  private readonly routeLayer = new Graphics();
  private readonly attentionLayer = new Graphics();
  private readonly actionRing = new Graphics();
  private readonly completionLayer = new Graphics();
  private readonly chaosVeil = new Graphics();
  private readonly photographer = new Container();
  private readonly photographerBody = new Graphics();
  private readonly photographerHead = new Graphics();
  private readonly photographerCamera = new Graphics();
  private readonly photographerRole = new Text({
    text: '攝影師',
    style: new TextStyle({ fill: 0xf4d276, fontSize: 9, fontWeight: '800', stroke: { color: 0x111620, width: 3 } }),
  });
  private readonly assistant = new Container();
  private readonly assistantRole = new Text({
    text: '流程助理',
    style: new TextStyle({ fill: 0x9edcff, fontSize: 9, fontWeight: '800', stroke: { color: 0x111620, width: 3 } }),
  });
  private elapsed = 0;
  private readonly selectedEquipment = new Set<EquipmentId>();

  public constructor(private readonly host: HTMLDivElement) {}

  public async start(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      antialias: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    this.app.canvas.style.touchAction = 'none';
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.fitWorld();
    window.addEventListener('resize', () => this.fitWorld());
    this.world.addChild(this.ambientLayer);
    this.buildRoom();
    this.buildStations();
    this.buildPeople();
    this.world.addChild(
      this.routeLayer,
      this.attentionLayer,
      this.actionRing,
      this.completionLayer,
      this.chaosVeil,
    );

    document.querySelector<HTMLButtonElement>('#next-job')?.addEventListener('click', () => this.startNextJob());
    this.loop.prepareShift();
    this.setupPreflight();
    this.openPreflight();
    this.app.ticker.add((ticker) => this.update(Math.min(ticker.deltaMS / 1000, 0.05)));
  }

  private buildRoom(): void {
    const room = new Graphics();
    room.rect(0, 0, 520, 650).fill({ color: 0x2b3241 });
    room.rect(0, 430, 520, 220).fill({ color: 0x684b34 });

    for (let x = -100; x < 620; x += 52) {
      room.moveTo(x, 430).lineTo(x + 90, 650).stroke({ color: 0xffffff, alpha: 0.045, width: 1 });
    }

    room.rect(25, 42, 110, 88).fill({ color: 0x91c9e9 }).stroke({ color: 0xe4dfd3, width: 7 });
    room.moveTo(80, 42).lineTo(80, 130).stroke({ color: 0xe4dfd3, width: 5 });
    room.moveTo(25, 86).lineTo(135, 86).stroke({ color: 0xe4dfd3, width: 5 });

    room.roundRect(372, 54, 112, 90, 8).fill({ color: 0x1c2230 }).stroke({ color: 0xb88b4f, width: 5 });
    room.rect(387, 70, 82, 8).fill({ color: 0xeee5c6, alpha: 0.8 });
    room.rect(387, 88, 64, 8).fill({ color: 0xeee5c6, alpha: 0.6 });
    room.rect(387, 106, 74, 8).fill({ color: 0xeee5c6, alpha: 0.6 });
    this.world.addChild(room);

    this.briefTitle.position.set(171, 57);
    this.briefCue.position.set(171, 77);
    this.briefProgress.position.set(171, 111);
    this.world.addChild(this.briefBoard, this.briefTitle, this.briefCue, this.briefProgress);

    const title = new Text({
      text: '萊鳥攝影事務所',
      style: new TextStyle({ fill: 0xf4d276, fontSize: 13, fontWeight: '700' }),
    });
    title.position.set(24, 404);
    this.world.addChild(title);

    const checklist = new Text({
      text: '記憶卡  電池  備份  交件',
      style: new TextStyle({ fill: 0xcfd6e4, fontSize: 9, fontWeight: '600' }),
    });
    checklist.position.set(382, 122);
    this.world.addChild(checklist);
  }

  private fitWorld(): void {
    const layout = calculateWorldLayout(this.host.clientWidth, this.host.clientHeight);
    this.world.scale.set(layout.scale);
    this.world.position.set(layout.x, layout.y);
  }

  private buildStations(): void {
    for (const station of STATIONS) {
      const root = new Container();
      root.eventMode = 'static';
      root.cursor = 'pointer';
      root.hitArea = {
        contains: (x: number, y: number) =>
          x >= station.x && x <= station.x + station.width && y >= station.y && y <= station.y + station.height,
      };

      const body = new Graphics();
      const detail = new Graphics();
      const pressureBar = new Graphics();
      const progressBar = new Graphics();
      const label = new Text({
        text: station.label,
        style: new TextStyle({ fill: 0xffffff, fontSize: 14, fontWeight: '700' }),
      });
      const statusLabel = new Text({
        text: '等待',
        style: new TextStyle({ fill: 0xe6ebf3, fontSize: 10, fontWeight: '700' }),
      });
      const queueDots = Array.from({ length: 6 }, () => new Graphics());

      label.position.set(station.x + 10, station.y + 10);
      statusLabel.anchor.set(1, 0);
      statusLabel.position.set(station.x + station.width - 10, station.y + 11);
      root.addChild(body, detail, pressureBar, progressBar, label, statusLabel, ...queueDots);
      root.on('pointerdown', () => this.onStationClick(station.id));

      this.stationViews.set(station.id, {
        root,
        body,
        detail,
        pressureBar,
        progressBar,
        label,
        statusLabel,
        queueDots,
      });
      this.world.addChild(root);
    }

    this.renderStations();
  }

  private buildPeople(): void {
    this.photographerBody.roundRect(-14, -26, 28, 36, 8).fill({ color: 0x202a3c });
    this.photographerHead.circle(0, -38, 11).fill({ color: 0xf0c4a4 });
    this.photographerCamera.roundRect(8, -23, 17, 12, 3).fill({ color: 0x252a31 });
    this.photographerCamera.circle(20, -17, 4).fill({ color: 0x7ab6e8 });
    this.photographerRole.anchor.set(0.5);
    this.photographerRole.position.set(0, -61);
    this.photographer.addChild(this.photographerBody, this.photographerHead, this.photographerCamera, this.photographerRole);
    this.photographer.position.set(112, 528);

    const assistantBody = new Graphics();
    assistantBody.roundRect(-13, -24, 26, 34, 8).fill({ color: 0x5a477e });
    const assistantHead = new Graphics();
    assistantHead.circle(0, -36, 10).fill({ color: 0xe8ba9d });
    const assistantTablet = new Graphics();
    assistantTablet.roundRect(7, -21, 14, 19, 3).fill({ color: 0x252a31 });
    this.assistantRole.anchor.set(0.5);
    this.assistantRole.position.set(0, -59);
    this.assistant.addChild(assistantBody, assistantHead, assistantTablet, this.assistantRole);
    this.assistant.position.set(420, 520);
    this.world.addChild(this.photographer, this.assistant);
  }

  private setupPreflight(): void {
    const grid = document.querySelector<HTMLDivElement>('#equipment-grid');
    if (grid) {
      grid.replaceChildren(...EQUIPMENT.map((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'equipment-option';
        button.dataset.equipment = item.id;
        button.setAttribute('aria-pressed', 'false');
        const label = document.createElement('b');
        label.textContent = item.label;
        const purpose = document.createElement('small');
        purpose.textContent = item.purpose;
        button.append(label, purpose);
        button.addEventListener('click', () => this.toggleEquipment(item.id));
        return button;
      }));
    }

    document.querySelector<HTMLButtonElement>('#start-shift')?.addEventListener('click', () => {
      const loadout = [...this.selectedEquipment];
      if (!this.loop.configureLoadout(loadout) || !this.loop.startShift()) return;
      document.querySelector('#preflight')?.classList.remove('is-visible');
      document.querySelector('.game-shell')?.classList.remove('is-preflight');
      this.setMessage('裝備收好了。簡報只是一部分，先看現場，再派工。');
      this.renderLoadout();
    });
  }

  private openPreflight(): void {
    this.selectedEquipment.clear();
    const signals = document.querySelector<HTMLUListElement>('#field-signals');
    if (signals) {
      signals.replaceChildren(...this.loop.preflightSignals().map((signal) => {
        const item = document.createElement('li');
        item.textContent = signal;
        return item;
      }));
    }
    document.querySelector('#preflight')?.classList.add('is-visible');
    document.querySelector('.game-shell')?.classList.add('is-preflight');
    this.setMessage('出發前聽到四段風聲，其中一段今晚不會發生。你能帶兩樣，不能把未知全部消掉。');
    this.renderPreflightSelection();
    this.renderLoadout();
  }

  private toggleEquipment(id: EquipmentId): void {
    if (this.selectedEquipment.has(id)) {
      this.selectedEquipment.delete(id);
    } else if (this.selectedEquipment.size < 2) {
      this.selectedEquipment.add(id);
    }
    this.renderPreflightSelection();
    this.renderLoadout();
  }

  private renderPreflightSelection(): void {
    document.querySelectorAll<HTMLButtonElement>('.equipment-option').forEach((button) => {
      const id = button.dataset.equipment as EquipmentId | undefined;
      const selected = Boolean(id && this.selectedEquipment.has(id));
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this.setText('preflight-count', `已選 ${this.selectedEquipment.size}/2 · 留下什麼，也是一個決定`);
    const start = document.querySelector<HTMLButtonElement>('#start-shift');
    if (start) start.disabled = this.selectedEquipment.size !== 2;
  }

  private renderLoadout(): void {
    const loadout = this.loop.state.loadout.length > 0
      ? this.loop.state.loadout
      : [...this.selectedEquipment];
    const slots = ['loadout-one', 'loadout-two'];
    slots.forEach((id, index) => {
      const element = document.getElementById(id);
      if (!element) return;
      const equipment = loadout[index];
      const used = equipment
        ? this.loop.state.incidentHistory.some((outcome) => outcome.mitigated && outcome.equipmentId === equipment)
        : false;
      element.textContent = equipment ? `${this.loop.equipmentLabel(equipment)}${used ? ' · 接住' : ''}` : index === 0 ? '尚未整備' : '—';
      element.classList.toggle('is-used', used);
    });
  }

  private handleIncident(outcome: IncidentOutcome): void {
    const incident = this.loop.currentIncidentDefinition();
    const station = incident?.station ?? this.loop.state.active;
    this.setMessage(`${outcome.title}。${outcome.detail}`);
    this.spawnFeedback(
      this.stationCenter(station).x,
      this.stationCenter(station).y,
      outcome.mitigated ? '備援接住' : '現場失速',
    );
    const shell = document.querySelector('.game-shell');
    shell?.classList.remove('is-incident-contained', 'is-incident-exposed');
    shell?.classList.add(outcome.mitigated ? 'is-incident-contained' : 'is-incident-exposed');
    window.setTimeout(() => shell?.classList.remove('is-incident-contained', 'is-incident-exposed'), 1800);
    this.renderLoadout();
  }

  private update(dt: number): void {
    this.elapsed += dt;
    this.animatePeople();
    const events = this.loop.tick(dt);
    events.forEach((event) => this.handleLoopEvent(event));

    const stress = this.loop.averagePressure();
    this.animateRoom(stress);
    this.renderBriefBoard();
    this.renderStations();
    this.renderHud(stress);
    this.renderLoadout();
  }

  private onStationClick(id: StationId): void {
    const result = this.loop.dispatch(id);
    this.handleDispatch(result);
    if (result.type !== 'job-complete') this.pulseStation(id);
  }

  private handleDispatch(result: DispatchResult): void {
    if (result.type === 'production-assigned') {
      this.setMessage(`已派攝影師前往${this.stationLabel(result.station)}。先看他抵達；工作開始後可安排助理準備下一站。`);
      this.spawnFeedback(this.stationCenter(result.station).x, this.stationCenter(result.station).y, '已派工');
    } else if (result.type === 'handoff-prep-assigned') {
      this.setMessage(`已派流程助理準備「${this.stationLabel(result.station)}」。準備完成才會自動交接；這段時間客戶仍會等待。`);
      this.spawnFeedback(this.stationCenter(result.station).x, this.stationCenter(result.station).y, '準備交接');
    } else if (result.type === 'client-assigned') {
      this.setMessage('已派助理回覆客戶。攝影師的工作會繼續進行。');
      const client = this.stationCenter('client');
      this.spawnFeedback(client.x, client.y, '助理前往');
    } else if (result.type === 'production-busy') {
      this.setMessage(`${this.stationLabel(result.station)}已經在執行。連點不會加速，請觀察下一個風險。`);
    } else if (result.type === 'production-queue-busy') {
      this.setMessage(`${this.stationLabel(result.station)}的交接已經備妥。這次不用再操心，助理可處理客戶。`);
    } else if (result.type === 'handoff-prep-busy') {
      this.setMessage(`流程助理正在準備${this.stationLabel(result.station)}，不需要重複派工。`);
    } else if (result.type === 'assistant-busy') {
      this.setMessage(result.task === 'client'
        ? '流程助理正在回覆客戶。等她完成後，再安排下一站交接。'
        : '流程助理正在準備交接。客戶仍在等待，準備完成後再決定是否回覆。');
    } else if (result.type === 'handoff-not-ready') {
      this.setMessage(`攝影師還在前往${this.stationLabel(result.station)}。先看移動，抵達後才能預排${this.stationLabel(result.next)}。`);
    } else if (result.type === 'client-busy') {
      this.setMessage('助理正在回覆客戶，不需要重複派工。');
    } else if (result.type === 'client-cooling') {
      this.setMessage(`進度剛更新過，客戶暫時安心。約 ${Math.ceil(result.remaining)} 秒後再觀察。`);
    } else if (result.type === 'wrong-stage') {
      this.setMessage(`這一步還沒到。現在先派工「${this.stationLabel(result.expected)}」。`);
      this.pulseStation(result.expected);
    } else if (result.type === 'shift-not-started') {
      this.setMessage('先完成出發整備。今晚只能帶兩樣，留下什麼也會產生後果。');
    } else {
      this.setMessage('本案已交付。先喘口氣，準備好再接下一案。');
    }
  }

  private handleLoopEvent(event: LoopEvent): void {
    if (event.type === 'handoff-prepared') {
      this.setMessage(`${this.stationLabel(event.station)}已備妥。攝影師完成目前工作後會自動交接，流程助理現在可以回覆客戶。`);
      this.spawnFeedback(this.stationCenter(event.station).x, this.stationCenter(event.station).y, '交接備妥');
    } else if (event.type === 'production-complete') {
      this.setMessage(event.autoStarted
        ? `${this.stationLabel(event.station)}完成，已無縫交接${this.stationLabel(event.next)}；攝影師正在前往。`
        : `${this.stationLabel(event.station)}完成。下一個決策：派工「${this.stationLabel(event.next)}」。`);
      this.spawnFeedback(this.stationCenter(event.station).x, this.stationCenter(event.station).y, '完成');
      if (event.autoStarted) {
        this.spawnFeedback(this.stationCenter(event.next).x, this.stationCenter(event.next).y, '自動交接');
      }
      this.pulseStation(event.next);
    } else if (event.type === 'delivery-complete') {
      this.completeJob();
    } else if (event.type === 'client-complete') {
      this.setMessage('客戶已收到進度，壓力降下來了。繼續觀察手上的工作。');
      const client = this.stationCenter('client');
      this.spawnFeedback(client.x, client.y, '已安心');
    } else if (event.type === 'client-escalated') {
      this.setMessage('客戶追問了，交件時間被壓縮。下次要更早派助理更新進度。');
      this.spawnFeedback(this.stationCenter('client').x, this.stationCenter('client').y, '追問');
    } else if (event.type === 'incident-triggered') {
      this.handleIncident(event.outcome);
    } else {
      this.setMessage(`${this.stationLabel(event.station)}出了差錯。流程退回，但案件仍救得回來。`);
      this.spawnFeedback(this.stationCenter(event.station).x, this.stationCenter(event.station).y, '需要重派');
    }
  }

  private animatePeople(): void {
    const production = this.loop.state.production;
    const productionTarget = production ? this.stationCenter(production.station) : { x: 112, y: 528 };
    const photographerTargetY = production ? productionTarget.y + 116 : productionTarget.y;
    this.photographer.x += (productionTarget.x - this.photographer.x) * 0.11;
    this.photographer.y += (photographerTargetY - this.photographer.y) * 0.11;

    if (production?.phase === 'moving') {
      const distance = Math.hypot(productionTarget.x - this.photographer.x, photographerTargetY - this.photographer.y);
      if (distance < 8) {
        this.loop.reachProductionStation();
        const next = this.nextProductionStation();
        this.setMessage(next
          ? `攝影師已到${this.stationLabel(production.station)}站。可點「${this.stationLabel(next)}」預排交接，或先處理客戶。`
          : `攝影師已到${this.stationLabel(production.station)}站，工作開始。先觀察客戶，不必連點。`);
      }
    }

    this.photographer.rotation = production?.phase === 'working' ? Math.sin(this.elapsed * 12) * 0.015 : 0;

    const client = this.loop.state.client;
    const handoffPrep = this.loop.state.handoffPrep;
    const assistantStation = handoffPrep?.station ?? (client ? 'client' : null);
    const assistantTarget = assistantStation ? this.stationCenter(assistantStation) : { x: 420, y: 520 };
    const assistantTargetY = assistantStation ? assistantTarget.y + 104 : assistantTarget.y;
    this.assistant.x += (assistantTarget.x - this.assistant.x) * 0.12;
    this.assistant.y += (assistantTargetY - this.assistant.y) * 0.12;

    if (assistantStation) {
      const distance = Math.hypot(assistantTarget.x - this.assistant.x, assistantTargetY - this.assistant.y);
      if (distance < 8) {
        if (handoffPrep?.phase === 'moving') this.loop.reachHandoffStation();
        if (client?.phase === 'moving') this.loop.reachClientStation();
      }
    }

    if (!client && !handoffPrep) this.assistant.y += Math.sin(this.elapsed * 2.2) * 0.04;
  }

  private animateRoom(stress: number): void {
    const isComplete = this.loop.state.completed;
    this.ambientLayer.clear();
    const sunlight = isComplete ? 0.2 : 0.055 + Math.sin(this.elapsed * 0.35) * 0.012;
    this.ambientLayer.circle(80, 92, isComplete ? 210 : 160).fill({ color: 0xbfe5ff, alpha: sunlight });

    this.routeLayer.clear();
    const production = this.loop.state.production;
    if (production) {
      const destination = this.stationCenter(production.station);
      const targetY = destination.y + 104;
      this.drawRoute(this.routeLayer, this.photographer.x, this.photographer.y - 10, destination.x, targetY, 0xf3cf6c);
    }

    const queuedProduction = this.loop.state.queuedProduction;
    if (production && queuedProduction) {
      const current = this.stationCenter(production.station);
      const queued = this.stationCenter(queuedProduction);
      this.drawRoute(this.routeLayer, current.x, current.y, queued.x, queued.y, 0x9edcff);
    }

    const client = this.loop.state.client;
    const handoffPrep = this.loop.state.handoffPrep;
    if (client || handoffPrep) {
      const destination = this.stationCenter(handoffPrep?.station ?? 'client');
      this.drawRoute(this.routeLayer, this.assistant.x, this.assistant.y - 10, destination.x, destination.y + 94, 0x9edcff);
    }

    this.actionRing.clear();
    if (production) {
      const station = this.stationById(production.station);
      if (station) {
        const ratio = production.remaining / production.total;
        this.actionRing
          .circle(station.x + station.width / 2, station.y + station.height / 2, 35 + ratio * 7)
          .stroke({ color: 0xf3cf6c, alpha: 0.35 + (1 - ratio) * 0.5, width: 3 });
      }
    }
    if (queuedProduction) {
      const station = this.stationById(queuedProduction);
      if (station) {
        this.actionRing
          .circle(station.x + station.width / 2, station.y + station.height / 2, 42 + Math.sin(this.elapsed * 3) * 2)
          .stroke({ color: 0x9edcff, alpha: 0.72, width: 3 });
      }
    }
    if (handoffPrep) {
      const station = this.stationById(handoffPrep.station);
      if (station) {
        this.actionRing
          .circle(station.x + station.width / 2, station.y + station.height / 2, 42 + Math.sin(this.elapsed * 3) * 2)
          .stroke({ color: 0x9edcff, alpha: 0.52, width: 2 });
      }
    }

    this.attentionLayer.clear();
    const clientPressure = this.loop.state.pressures.client;
    const clientStation = this.stationById('client');
    if (clientStation && !isComplete && (clientPressure >= 38 || client)) {
      const pulse = 0.55 + Math.sin(this.elapsed * 5.5) * 0.22;
      this.attentionLayer
        .roundRect(clientStation.x - 7, clientStation.y - 7, clientStation.width + 14, clientStation.height + 14, 19)
        .stroke({ color: client ? 0x9edcff : 0xff9caa, alpha: pulse, width: client ? 3 : 4 });
      if (!client) {
        const signalX = clientStation.x + 142;
        const signalY = clientStation.y + 44;
        this.attentionLayer.moveTo(signalX + Math.cos(-0.8) * 18, signalY + Math.sin(-0.8) * 18)
          .arc(signalX, signalY, 18, -0.8, 0.8)
          .stroke({ color: 0xffc0c8, alpha: pulse, width: 2 });
        this.attentionLayer.moveTo(signalX + Math.cos(-0.8) * 27, signalY + Math.sin(-0.8) * 27)
          .arc(signalX, signalY, 27, -0.8, 0.8)
          .stroke({ color: 0xffc0c8, alpha: pulse * 0.7, width: 2 });
      }
    }

    this.completionLayer.clear();
    if (isComplete) {
      const pulse = 0.16 + Math.sin(this.elapsed * 1.8) * 0.025;
      this.completionLayer.circle(260, 330, 230).fill({ color: 0xf4d276, alpha: pulse });
    }

    this.chaosVeil.clear();
    if (!isComplete && stress > 45) {
      const alpha = Math.min(0.18, (stress - 45) / 300);
      this.chaosVeil.rect(0, 0, 520, 650).fill({ color: stress >= 75 ? 0x8f2e35 : 0x8b5d2e, alpha });
    }
  }

  private renderBriefBoard(): void {
    const brief = this.loop.currentBrief();
    const accent = brief.id === 'portrait' ? 0xd29aa9 : brief.id === 'rush' ? 0xe4ac55 : 0x8fb6dd;
    const caseNumber = this.loop.state.jobIndex + 1;
    const bufferCopy = this.loop.state.workflowBuffer > 0 ? ' · 已留餘裕' : '';

    this.briefBoard.clear();
    this.briefBoard.roundRect(158, 45, 198, 86, 10)
      .fill({ color: 0x171d28, alpha: 0.94 })
      .stroke({ color: accent, alpha: 0.58, width: 2 });
    this.briefBoard.circle(344, 57, 4).fill({ color: accent, alpha: 0.88 });
    this.briefTitle.text = brief.title;
    this.briefTitle.style.fill = accent;
    this.briefCue.text = brief.cue;
    this.briefProgress.text = `CASE ${caseNumber}/${JOB_BRIEFS.length} · ${brief.focus}${bufferCopy}`;
  }

  private renderStations(): void {
    for (const station of STATIONS) {
      const view = this.stationViews.get(station.id);
      if (!view) continue;

      const pressure = this.loop.state.pressures[station.id];
      const production = this.loop.state.production;
      const client = this.loop.state.client;
      const handoffPrep = this.loop.state.handoffPrep;
      const isActive = station.id === this.loop.state.active;
      const isWorking = production?.station === station.id;
      const isQueued = this.loop.state.queuedProduction === station.id;
      const isPreparing = handoffPrep?.station === station.id;
      const isClientWorking = station.id === 'client' && Boolean(client);
      const risk = this.riskState(pressure);
      const statusColor = risk === 'danger' ? 0xef6676 : risk === 'busy' ? 0xe4ac55 : 0x65dc9a;
      const pulse = risk === 'danger' ? 0.78 + Math.sin(this.elapsed * 9) * 0.22 : 1;
      const emphasized = isActive || station.id === 'client' || isWorking || isQueued || isPreparing;
      const strongOutline = isWorking || isClientWorking || isQueued || isPreparing || risk === 'danger' || isActive;
      const outlineColor = isQueued || isPreparing
        ? 0x9edcff
        : isWorking || isClientWorking
          ? 0xffffff
          : risk === 'danger'
            ? 0xef6676
            : isActive
              ? 0xf3cf6c
              : 0xffffff;

      view.body.clear();
      view.body.roundRect(station.x, station.y, station.width, station.height, 14)
        .fill({ color: station.color, alpha: this.loop.state.completed ? 0.45 : emphasized ? 1 : 0.62 })
        .stroke({
          color: outlineColor,
          alpha: strongOutline ? pulse : 0.12,
          width: isWorking || isClientWorking ? 4 : strongOutline ? 3 : 1,
        });

      this.drawStationDetail(station, view.detail, pressure);
      view.pressureBar.clear();
      view.pressureBar.roundRect(station.x, station.y + station.height + 7, station.width, 8, 4).fill({ color: 0x10141e });
      view.pressureBar.roundRect(station.x, station.y + station.height + 7, station.width * (pressure / 100), 8, 4)
        .fill({ color: statusColor });

      view.progressBar.clear();
      const assignment = isWorking ? production : isClientWorking ? client : isPreparing ? handoffPrep : null;
      if (assignment?.phase === 'working') {
        const progress = 1 - assignment.remaining / assignment.total;
        view.progressBar.roundRect(station.x + 8, station.y + station.height - 12, station.width - 16, 5, 3)
          .fill({ color: 0x111722, alpha: 0.72 });
        view.progressBar.roundRect(station.x + 8, station.y + station.height - 12, (station.width - 16) * progress, 5, 3)
          .fill({ color: 0xffffff, alpha: 0.92 });
      }

      view.label.alpha = this.loop.state.completed ? 0.64 : emphasized ? 1 : 0.58;
      view.statusLabel.text = this.stationStatus(station.id);
      view.statusLabel.style.fill = isQueued || isPreparing ? 0xd7f3ff : risk === 'danger' ? 0xffc0c8 : risk === 'busy' ? 0xffd99a : 0xe6ebf3;

      const visibleDots = Math.ceil(pressure / 18);
      view.queueDots.forEach((dot, index) => {
        dot.clear();
        if (index >= visibleDots || assignment?.phase === 'working') return;
        dot.circle(station.x + 12 + index * 14, station.y + station.height - 17, 4)
          .fill({ color: statusColor, alpha: 0.55 + index * 0.06 });
      });
    }
  }

  private stationStatus(id: StationId): string {
    if (!this.loop.state.shiftStarted) return '整備後出發';
    if (this.loop.state.completed) return '完成';

    if (id === 'client') {
      const client = this.loop.state.client;
      if (client?.phase === 'moving') return '助理前往';
      if (client?.phase === 'working') return `回覆 ${Math.ceil(client.remaining)}s`;
      if (this.loop.state.clientCooldown > 0) return '已更新';
      if (this.loop.state.handoffPrep && this.loop.state.pressures.client >= 38) return '等待助理';
      return this.loop.state.pressures.client >= 38 ? '需要回覆' : '觀察中';
    }

    const assignment = this.loop.state.production;
    const handoffPrep = this.loop.state.handoffPrep;
    if (assignment?.station === id) {
      return assignment.phase === 'moving' ? '前往中' : `工作 ${Math.ceil(assignment.remaining)}s`;
    }
    if (handoffPrep?.station === id) {
      return handoffPrep.phase === 'moving' ? '助理前往' : `準備 ${Math.ceil(handoffPrep.remaining)}s`;
    }
    if (this.loop.state.queuedProduction === id) return '交接備妥';
    if (id === this.loop.state.active) return '點一下派工';
    const currentIndex = STAGE_ORDER.indexOf(this.loop.state.active);
    const stationIndex = STAGE_ORDER.indexOf(id);
    return stationIndex === currentIndex + 1
      ? assignment?.phase === 'working' ? this.loop.state.client ? '助理忙碌' : '可準備' : '下一步'
      : stationIndex < currentIndex ? '已完成' : '等待';
  }

  private drawStationDetail(station: Station, detail: Graphics, pressure: number): void {
    detail.clear();
    const shake = pressure >= 75 ? Math.sin(this.elapsed * 22) * 2 : 0;

    if (station.id === 'capture') {
      detail.roundRect(station.x + 24 + shake, station.y + 42, 70, 28, 5).fill({ color: 0xd7dce5 });
      detail.roundRect(station.x + 51 + shake, station.y + 65, 13, 33, 3).fill({ color: 0x3b4451 });
      detail.circle(station.x + 84 + shake, station.y + 56, 10).fill({ color: 0x26303c });
      detail.circle(station.x + 84 + shake, station.y + 56, 5).fill({ color: 0x7db8e8 });
    } else if (station.id === 'edit') {
      detail.roundRect(station.x + 24, station.y + 38, 100, 58, 6).fill({ color: 0x141922 });
      detail.roundRect(station.x + 31, station.y + 45, 86, 44, 3).fill({ color: pressure >= 75 ? 0xc05062 : 0x65a7dc });
      const stack = Math.min(5, Math.ceil(pressure / 18));
      for (let i = 0; i < stack; i += 1) {
        detail.rect(station.x + 16 + i * 13, station.y + 108 - i * 3, 22, 17).fill({ color: 0xe8e2d5, alpha: 0.9 });
      }
    } else if (station.id === 'delivery') {
      detail.roundRect(station.x + 27 + shake, station.y + 42, 64, 45, 6).fill({ color: 0xd8dbe1 });
      detail.rect(station.x + 38 + shake, station.y + 30, 42, 30).fill({ color: 0xf3f1ea });
      detail.circle(station.x + 81 + shake, station.y + 77, 4).fill({ color: pressure >= 75 ? 0xef6676 : 0x65dc9a });
    } else {
      detail.roundRect(station.x + 58 + shake, station.y + 36, 50, 38, 10).fill({ color: 0xe9edf4 });
      detail.circle(station.x + 83 + shake, station.y + 55, 5).fill({ color: pressure >= 75 ? 0xef6676 : 0x557dbd });
      detail.moveTo(station.x + 108, station.y + 50).lineTo(station.x + 121, station.y + 42).lineTo(station.x + 119, station.y + 57)
        .fill({ color: 0xe9edf4 });
    }
  }

  private drawRoute(layer: Graphics, fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    layer.moveTo(fromX, fromY).lineTo(toX, toY).stroke({ color, alpha: 0.38, width: 2 });
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const size = 8;
    layer.moveTo(toX, toY)
      .lineTo(toX - Math.cos(angle - 0.55) * size, toY - Math.sin(angle - 0.55) * size)
      .lineTo(toX - Math.cos(angle + 0.55) * size, toY - Math.sin(angle + 0.55) * size)
      .closePath()
      .fill({ color, alpha: 0.7 });
  }

  private pulseStation(id: StationId): void {
    const view = this.stationViews.get(id);
    if (!view) return;
    view.root.scale.set(0.985);
    setTimeout(() => view.root.scale.set(1), 100);
  }

  private renderHud(stress: number): void {
    const production = this.loop.state.production;
    const queuedProduction = this.loop.state.queuedProduction;
    const handoffPrep = this.loop.state.handoffPrep;
    const client = this.loop.state.client;
    const nextProduction = this.nextProductionStation();
    const nextAction = !this.loop.state.shiftStarted
      ? '出發前｜只能帶兩樣'
      : production
        ? production.phase === 'moving'
        ? `攝影師正前往${this.stationLabel(production.station)}`
        : handoffPrep
          ? `${this.stationLabel(production.station)}中｜助理準備${this.stationLabel(handoffPrep.station)}`
          : queuedProduction
            ? `${this.stationLabel(production.station)}中｜交接已備妥`
            : client
              ? `${this.stationLabel(production.station)}中｜助理回覆客戶`
              : nextProduction
                ? `${this.stationLabel(production.station)}中｜選擇助理下一步`
                : `${this.stationLabel(production.station)}中｜觀察客戶`
        : this.loop.state.completed
          ? '本案完成｜工作室已安靜'
          : `下一步｜派工${this.stationLabel(this.loop.state.active)}`;

    this.setText('next-action', nextAction);
    const brief = this.loop.currentBrief();
    this.setText('job-title', brief.title);
    this.setText('job-focus', `${this.loop.state.jobIndex + 1}/${JOB_BRIEFS.length} · ${brief.focus}`);
    this.setText('deadline', !this.loop.state.shiftStarted ? '—' : this.loop.state.completed ? '完成' : `${Math.max(0, Math.ceil(this.loop.state.deadline))}s`);
    this.setText('studio-state', !this.loop.state.shiftStarted
      ? '整備中'
      : this.loop.state.completed
        ? '安靜'
        : stress >= 75
          ? '危險'
          : stress >= 45
            ? '忙亂'
            : this.loop.state.workflowBuffer > 0 ? '有餘裕' : '穩定');
    this.setText('assistant-state', !this.loop.state.shiftStarted
      ? '盤點中'
      : handoffPrep
        ? handoffPrep.phase === 'moving' ? '前往交接' : '準備中'
        : client
          ? client.phase === 'moving' ? '前往客戶' : '回覆中'
          : '待命');
  }

  private completeJob(): void {
    const outcome = this.loop.state.lastOutcome;
    const shiftComplete = this.loop.isShiftComplete();
    const nextBrief = this.loop.nextBrief();
    const currentCase = this.loop.state.jobIndex + 1;

    this.setMessage(shiftComplete
      ? '今天的三種案件都交完了。工作室真正安靜下來，沒有下一個紅點在催你。'
      : `交件完成。下一案是${nextBrief.title}，但現在先讓工作室安靜一下。`);
    this.setText('completion-kicker', shiftComplete ? 'SHIFT CLEAR' : `DELIVERED · ${currentCase}/${JOB_BRIEFS.length}`);
    this.setText('completion-title', shiftComplete ? '今天可以收工了' : '本案已交件');
    this.setText('completion-copy', shiftComplete
      ? '三種風險節奏都已處理完畢。好的流程不是更忙，而是讓忙亂有結束。'
      : `壓力歸零。下一案「${nextBrief.title}」會帶來不同的觀察順序。`);
    const insight = this.outcomeCopy(outcome);
    this.setText('outcome-title', insight.title);
    this.setText('outcome-detail', insight.detail);
    const incidentOutcome = this.loop.state.lastIncidentOutcome;
    this.setText('incident-title', incidentOutcome
      ? incidentOutcome.mitigated
        ? `${this.loop.equipmentLabel(incidentOutcome.equipmentId)}接住了：${incidentOutcome.title}`
        : `沒帶${this.loop.equipmentLabel(incidentOutcome.equipmentId)}：${incidentOutcome.title}`
      : '今晚沒有留下足夠紀錄');
    this.setText('incident-detail', incidentOutcome?.detail ?? '有些風險只能在真正發生後被看見。');
    this.setText('next-job', shiftComplete ? '重新開始一輪工作日' : `接下一案｜${nextBrief.title}`);

    this.spawnFeedback(260, 310, shiftComplete ? '今日收工' : '完成交件');
    document.querySelector('.game-shell')?.classList.add('is-complete');
    document.querySelector('.game-shell')?.classList.toggle('is-shift-complete', shiftComplete);
    document.querySelector('#completion')?.classList.add('is-visible');
    if ('vibrate' in navigator) navigator.vibrate(45);
  }

  private startNextJob(): void {
    const shiftComplete = this.loop.isShiftComplete();
    this.loop.startNextJob();
    document.querySelector('.game-shell')?.classList.remove('is-complete');
    document.querySelector('.game-shell')?.classList.remove('is-shift-complete');
    document.querySelector('#completion')?.classList.remove('is-visible');
    this.photographer.position.set(112, 528);
    this.assistant.position.set(420, 520);
    if (shiftComplete) {
      this.loop.prepareShift();
      this.openPreflight();
      return;
    }
    const brief = this.loop.currentBrief();
    this.setMessage(`${brief.title}進場。${brief.cue}。先讀現場，再點拍攝站派工。`);
  }

  private outcomeCopy(outcome: JobOutcome | null): { title: string; detail: string } {
    if (!outcome) {
      return { title: '流程已收束', detail: '完成交件後，工作室會留下下一案的餘裕。' };
    }
    if (outcome.cleanWorkflow) {
      return {
        title: '流程留下了餘裕',
        detail: '助理完成兩次交接準備，也主動更新過窗口；下一案的起始壓力會更低。',
      };
    }
    if (outcome.stageFailures > 0 || outcome.clientEscalations > 0) {
      return {
        title: '救回來了，但還有雜訊',
        detail: '案件完成了；下一輪若更早看見交接與客戶風險，工作室會更安靜。',
      };
    }
    if (outcome.clientUpdates === 0) {
      return {
        title: '交件完成，窗口仍在等',
        detail: '生產線很順，但少了一次主動更新；完整流程也包含讓客戶知道正在發生什麼。',
      };
    }
    return {
      title: '本案已穩穩落地',
      detail: '有照顧窗口，也完成交件；再多一次交接準備，下一案就能少一個臨場決定。',
    };
  }

  private spawnFeedback(x: number, y: number, text: string): void {
    const label = new Text({
      text,
      style: new TextStyle({
        fill: 0xffef9f,
        fontSize: text === '完成交件' ? 24 : 16,
        fontWeight: '700',
        stroke: { color: 0x141821, width: 4 },
      }),
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.world.addChild(label);

    let lifetime = 0;
    const duration = text === '完成交件' || text === '今日收工' ? 2.2 : 1.15;
    const animate = () => {
      lifetime += this.app.ticker.deltaMS / 1000;
      label.y -= this.app.ticker.deltaMS * 0.018;
      label.alpha = Math.max(0, 1 - lifetime / duration);
      if (lifetime >= duration) {
        this.app.ticker.remove(animate);
        label.destroy();
      }
    };
    this.app.ticker.add(animate);
  }

  private riskState(pressure: number): RiskState {
    if (pressure >= 75) return 'danger';
    if (pressure >= 45) return 'busy';
    return 'calm';
  }

  private stationById(id: StationId): Station | undefined {
    return STATIONS.find((station) => station.id === id);
  }

  private stationCenter(id: StationId): { x: number; y: number } {
    const station = this.stationById(id);
    return station
      ? { x: station.x + station.width / 2, y: station.y + station.height / 2 }
      : { x: 260, y: 520 };
  }

  private stationLabel(id: StationId): string {
    return this.stationById(id)?.label ?? id;
  }

  private nextProductionStation(): ProductionStationId | null {
    const currentIndex = STAGE_ORDER.indexOf(this.loop.state.active);
    return STAGE_ORDER[currentIndex + 1] ?? null;
  }

  private setMessage(message: string): void {
    const element = document.querySelector<HTMLElement>('#message');
    if (element) element.textContent = message;
  }

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
}
