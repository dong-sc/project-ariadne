import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

type StationId = 'capture' | 'edit' | 'delivery' | 'client';
type ProductionStationId = Exclude<StationId, 'client'>;
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
  label: Text;
  pressureLabel: Text;
  queueDots: Graphics[];
}

const STATIONS: readonly Station[] = [
  { id: 'capture', label: '拍攝', x: 36, y: 335, width: 118, height: 112, color: 0x537fc9 },
  { id: 'edit', label: '修圖', x: 181, y: 290, width: 148, height: 142, color: 0x725ac0 },
  { id: 'delivery', label: '交件', x: 350, y: 335, width: 112, height: 112, color: 0xb97f4d },
  { id: 'client', label: '客戶', x: 184, y: 153, width: 140, height: 88, color: 0xa95563 },
];

const STAGE_ORDER: readonly ProductionStationId[] = ['capture', 'edit', 'delivery'];
const WORK_DURATION: Record<ProductionStationId, number> = {
  capture: 5.2,
  edit: 6.4,
  delivery: 4.8,
};

export class AriadneGame {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly stationViews = new Map<StationId, StationView>();
  private readonly ambientLayer = new Graphics();
  private readonly chaosVeil = new Graphics();
  private readonly photographer = new Container();
  private readonly photographerBody = new Graphics();
  private readonly photographerHead = new Graphics();
  private readonly photographerCamera = new Graphics();
  private readonly assistant = new Container();
  private readonly actionRing = new Graphics();
  private pressures: Record<StationId, number> = { capture: 18, edit: 8, delivery: 0, client: 7 };
  private deadline = 105;
  private active: ProductionStationId = 'capture';
  private assigned: ProductionStationId | null = null;
  private workRemaining = 0;
  private workTotal = 0;
  private stageProgress = 0;
  private clientCooldown = 0;
  private elapsed = 0;
  private calmPause = 0;

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
    this.world.addChild(this.ambientLayer);
    this.buildRoom();
    this.buildStations();
    this.buildPeople();
    this.world.addChild(this.actionRing, this.chaosVeil);
    this.setMessage('點一次派人工作。先觀察，再決定下一步。');
    this.app.ticker.add((ticker) => this.update(Math.min(ticker.deltaMS / 1000, 0.05)));
  }

  private buildRoom(): void {
    const room = new Graphics();
    room.rect(0, 0, 520, 650).fill({ color: 0x2b3241 });
    room.rect(0, 425, 520, 225).fill({ color: 0x684b34 });

    for (let x = -100; x < 620; x += 52) {
      room.moveTo(x, 425).lineTo(x + 90, 650).stroke({ color: 0xffffff, alpha: 0.045, width: 1 });
    }

    room.rect(25, 35, 110, 90).fill({ color: 0x91c9e9 }).stroke({ color: 0xe4dfd3, width: 7 });
    room.moveTo(80, 35).lineTo(80, 125).stroke({ color: 0xe4dfd3, width: 5 });
    room.moveTo(25, 80).lineTo(135, 80).stroke({ color: 0xe4dfd3, width: 5 });

    room.roundRect(372, 50, 112, 90, 8).fill({ color: 0x1c2230 }).stroke({ color: 0xb88b4f, width: 5 });
    room.rect(387, 66, 82, 8).fill({ color: 0xeee5c6, alpha: 0.8 });
    room.rect(387, 84, 64, 8).fill({ color: 0xeee5c6, alpha: 0.6 });
    room.rect(387, 102, 74, 8).fill({ color: 0xeee5c6, alpha: 0.6 });
    this.world.addChild(room);

    const title = new Text({
      text: '萊鳥攝影事務所',
      style: new TextStyle({ fill: 0xf4d276, fontSize: 13, fontWeight: '700' }),
    });
    title.position.set(24, 400);
    this.world.addChild(title);

    const checklist = new Text({
      text: '記憶卡  電池  備份  交件',
      style: new TextStyle({ fill: 0xcfd6e4, fontSize: 9, fontWeight: '600' }),
    });
    checklist.position.set(382, 118);
    this.world.addChild(checklist);
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
      const label = new Text({
        text: station.label,
        style: new TextStyle({ fill: 0xffffff, fontSize: 14, fontWeight: '700' }),
      });
      const pressureLabel = new Text({
        text: '0%',
        style: new TextStyle({ fill: 0xe6ebf3, fontSize: 11, fontWeight: '700' }),
      });
      const queueDots = Array.from({ length: 6 }, () => new Graphics());

      label.position.set(station.x + 10, station.y + 10);
      pressureLabel.anchor.set(1, 0);
      pressureLabel.position.set(station.x + station.width - 10, station.y + 10);
      root.addChild(body, detail, pressureBar, label, pressureLabel, ...queueDots);
      root.on('pointerdown', () => this.onStationClick(station.id));

      this.stationViews.set(station.id, { root, body, detail, pressureBar, label, pressureLabel, queueDots });
      this.world.addChild(root);
    }

    this.renderStations();
  }

  private buildPeople(): void {
    this.photographerBody.roundRect(-14, -26, 28, 36, 8).fill({ color: 0x202a3c });
    this.photographerHead.circle(0, -38, 11).fill({ color: 0xf0c4a4 });
    this.photographerCamera.roundRect(8, -23, 17, 12, 3).fill({ color: 0x252a31 });
    this.photographerCamera.circle(20, -17, 4).fill({ color: 0x7ab6e8 });
    this.photographer.addChild(this.photographerBody, this.photographerHead, this.photographerCamera);
    this.photographer.position.set(260, 520);

    const assistantBody = new Graphics();
    assistantBody.roundRect(-13, -24, 26, 34, 8).fill({ color: 0x5a477e });
    const assistantHead = new Graphics();
    assistantHead.circle(0, -36, 10).fill({ color: 0xe8ba9d });
    this.assistant.addChild(assistantBody, assistantHead);
    this.assistant.position.set(420, 500);
    this.world.addChild(this.photographer, this.assistant);
  }

  private update(dt: number): void {
    this.elapsed += dt;
    this.clientCooldown = Math.max(0, this.clientCooldown - dt);

    if (this.calmPause > 0) {
      this.calmPause -= dt;
      this.animateRoom(0);
      this.renderStations();
      this.renderHud(0);
      if (this.calmPause <= 0) this.startNextJob();
      return;
    }

    for (const station of STATIONS) {
      const stageMultiplier = station.id === this.active ? 1.24 : 1;
      const clientMultiplier = station.id === 'client' ? 1.36 : 1;
      const workingRelief = this.assigned === station.id ? -2.8 : 0;
      const nextPressure = this.pressures[station.id] + dt * (1.05 * stageMultiplier * clientMultiplier + workingRelief);
      this.pressures[station.id] = Math.max(0, Math.min(100, nextPressure));
    }

    if (this.assigned) {
      this.workRemaining = Math.max(0, this.workRemaining - dt);
      const completedRatio = 1 - this.workRemaining / this.workTotal;
      this.stageProgress = Math.max(this.stageProgress, completedRatio * 100);
      if (this.workRemaining <= 0) this.finishAssignment();
    }

    const stress = this.averagePressure();
    this.deadline -= dt * (stress >= 70 ? 1.3 : 1);

    if (this.pressures[this.active] >= 100 || this.deadline <= 0) this.failStage();

    this.animateRoom(stress);
    this.renderStations();
    this.renderHud(stress);
  }

  private onStationClick(id: StationId): void {
    if (this.calmPause > 0) return;

    if (id === 'client') {
      if (this.clientCooldown > 0) {
        this.setMessage('剛回覆過客戶。現在先把手上的事完成。');
        return;
      }
      this.pressures.client = Math.max(0, this.pressures.client - 36);
      this.clientCooldown = 12;
      this.setMessage('已主動更新進度，客戶暫時安心。');
      this.spawnFeedback(254, 185, '已回覆');
      this.pulseStation('client');
      return;
    }

    if (id !== this.active) {
      this.setMessage(`現在要先完成${this.stationLabel(this.active)}。`);
      this.pulseStation(this.active);
      return;
    }

    if (this.assigned) {
      this.setMessage(`${this.stationLabel(this.assigned)}正在進行，不用連點。`);
      return;
    }

    this.assigned = id;
    this.workTotal = WORK_DURATION[id];
    this.workRemaining = this.workTotal;
    this.stageProgress = 0;
    this.setMessage(`已派攝影師處理${this.stationLabel(id)}。觀察其他壓力。`);
    this.spawnFeedback(this.stationCenter(id).x, this.stationCenter(id).y, '開始');
    this.pulseStation(id);
  }

  private finishAssignment(): void {
    const completed = this.assigned;
    if (!completed) return;

    this.pressures[completed] = Math.max(0, this.pressures[completed] - 46);
    this.assigned = null;
    this.stageProgress = 100;
    this.advanceStage();
  }

  private advanceStage(): void {
    const index = STAGE_ORDER.indexOf(this.active);
    const next = STAGE_ORDER[index + 1];

    if (!next) {
      this.completeJob();
      return;
    }

    this.active = next;
    this.stageProgress = 0;
    this.deadline += 14;
    this.setMessage(`${this.stationLabel(STAGE_ORDER[index])}完成。下一步：${this.stationLabel(next)}。`);
  }

  private completeJob(): void {
    this.assigned = null;
    this.stageProgress = 100;
    this.pressures = { capture: 0, edit: 0, delivery: 0, client: 0 };
    this.calmPause = 4.5;
    this.setMessage('交件完成。電話停了，工作室終於安靜。');
    this.spawnFeedback(260, 270, '完成交件');
  }

  private startNextJob(): void {
    this.active = 'capture';
    this.deadline = 105;
    this.stageProgress = 0;
    this.pressures = { capture: 15, edit: 6, delivery: 0, client: 8 };
    this.setMessage('下一個案件到了。點一次派人工作，不必狂按。');
  }

  private failStage(): void {
    this.assigned = null;
    this.workRemaining = 0;
    this.pressures[this.active] = 42;
    this.stageProgress = 0;
    this.deadline += 22;
    this.pressures.client = Math.min(100, this.pressures.client + 18);
    this.setMessage(`${this.stationLabel(this.active)}出了差錯。進度退回，但案件仍救得回來。`);
  }

  private averagePressure(): number {
    const values = Object.values(this.pressures);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private riskState(pressure: number): RiskState {
    if (pressure >= 75) return 'danger';
    if (pressure >= 45) return 'busy';
    return 'calm';
  }

  private animateRoom(stress: number): void {
    const destination = this.assigned ? this.stationCenter(this.assigned) : { x: 260, y: 520 };
    const targetY = this.assigned ? destination.y + 115 : destination.y;
    this.photographer.x += (destination.x - this.photographer.x) * 0.085;
    this.photographer.y += (targetY - this.photographer.y) * 0.085;
    this.photographer.rotation = this.assigned ? Math.sin(this.elapsed * 12) * 0.015 : 0;
    this.assistant.y = 500 + Math.sin(this.elapsed * 2.2) * 2;

    this.ambientLayer.clear();
    const sunlight = this.calmPause > 0 ? 0.14 : 0.055 + Math.sin(this.elapsed * 0.35) * 0.012;
    this.ambientLayer.circle(80, 82, 160).fill({ color: 0xbfe5ff, alpha: sunlight });

    this.actionRing.clear();
    if (this.assigned) {
      const station = STATIONS.find((candidate) => candidate.id === this.assigned);
      if (station) {
        const ratio = this.workRemaining / this.workTotal;
        this.actionRing
          .circle(station.x + station.width / 2, station.y + station.height / 2, 34 + ratio * 8)
          .stroke({ color: 0xf3cf6c, alpha: 0.3 + (1 - ratio) * 0.55, width: 3 });
      }
    }

    this.chaosVeil.clear();
    if (stress > 45) {
      const alpha = Math.min(0.18, (stress - 45) / 300);
      this.chaosVeil.rect(0, 0, 520, 650).fill({ color: stress >= 75 ? 0x8f2e35 : 0x8b5d2e, alpha });
    }
  }

  private renderStations(): void {
    for (const station of STATIONS) {
      const view = this.stationViews.get(station.id);
      if (!view) continue;

      const pressure = this.pressures[station.id];
      const isNext = station.id === this.active;
      const isWorking = station.id === this.assigned;
      const risk = this.riskState(pressure);
      const statusColor = risk === 'danger' ? 0xef6676 : risk === 'busy' ? 0xe4ac55 : 0x65dc9a;
      const pulse = risk === 'danger' ? 0.78 + Math.sin(this.elapsed * 9) * 0.22 : 1;

      view.body.clear();
      view.body.roundRect(station.x, station.y, station.width, station.height, 14)
        .fill({ color: station.color, alpha: isNext || station.id === 'client' ? 1 : 0.64 })
        .stroke({
          color: isWorking ? 0xffffff : risk === 'danger' ? 0xef6676 : isNext ? 0xf3cf6c : 0xffffff,
          alpha: isWorking || risk === 'danger' || isNext ? pulse : 0.12,
          width: isWorking ? 4 : risk === 'danger' || isNext ? 3 : 1,
        });

      this.drawStationDetail(station, view.detail, pressure);
      view.pressureBar.clear();
      view.pressureBar.roundRect(station.x, station.y + station.height + 7, station.width, 9, 5).fill({ color: 0x10141e });
      view.pressureBar.roundRect(station.x, station.y + station.height + 7, station.width * (pressure / 100), 9, 5).fill({ color: statusColor });
      view.label.alpha = isNext || station.id === 'client' ? 1 : 0.58;
      view.pressureLabel.text = isWorking ? '執行中' : `${Math.floor(pressure)}%`;
      view.pressureLabel.style.fill = risk === 'danger' ? 0xffc0c8 : risk === 'busy' ? 0xffd99a : 0xe6ebf3;

      const visibleDots = Math.ceil(pressure / 17);
      view.queueDots.forEach((dot, index) => {
        dot.clear();
        if (index >= visibleDots) return;
        dot.circle(station.x + 12 + index * 14, station.y + station.height - 17, 4)
          .fill({ color: statusColor, alpha: 0.55 + index * 0.06 });
      });
    }
  }

  private drawStationDetail(station: Station, detail: Graphics, pressure: number): void {
    detail.clear();
    const shake = pressure >= 75 ? Math.sin(this.elapsed * 22) * 2 : 0;

    if (station.id === 'capture') {
      detail.roundRect(station.x + 23 + shake, station.y + 42, 70, 28, 5).fill({ color: 0xd7dce5 });
      detail.roundRect(station.x + 50 + shake, station.y + 65, 13, 33, 3).fill({ color: 0x3b4451 });
      detail.circle(station.x + 83 + shake, station.y + 56, 10).fill({ color: 0x26303c });
      detail.circle(station.x + 83 + shake, station.y + 56, 5).fill({ color: 0x7db8e8 });
    } else if (station.id === 'edit') {
      detail.roundRect(station.x + 24, station.y + 38, 100, 58, 6).fill({ color: 0x141922 });
      detail.roundRect(station.x + 31, station.y + 45, 86, 44, 3).fill({ color: pressure >= 75 ? 0xc05062 : 0x65a7dc });
      const stack = Math.min(5, Math.ceil(pressure / 18));
      for (let i = 0; i < stack; i += 1) {
        detail.rect(station.x + 16 + i * 13, station.y + 108 - i * 3, 22, 17).fill({ color: 0xe8e2d5, alpha: 0.9 });
      }
    } else if (station.id === 'delivery') {
      detail.roundRect(station.x + 24 + shake, station.y + 42, 64, 45, 6).fill({ color: 0xd8dbe1 });
      detail.rect(station.x + 35 + shake, station.y + 30, 42, 30).fill({ color: 0xf3f1ea });
      detail.circle(station.x + 78 + shake, station.y + 77, 4).fill({ color: pressure >= 75 ? 0xef6676 : 0x65dc9a });
    } else {
      detail.roundRect(station.x + 48 + shake, station.y + 31, 44, 35, 9).fill({ color: 0xe9edf4 });
      detail.circle(station.x + 70 + shake, station.y + 48, 4).fill({ color: pressure >= 75 ? 0xef6676 : 0x557dbd });
      if (pressure >= 35) {
        detail.circle(station.x + 104, station.y + 24, 3).fill({ color: 0xffffff, alpha: 0.75 });
        if (pressure >= 55) detail.circle(station.x + 116, station.y + 24, 3).fill({ color: 0xffffff, alpha: 0.75 });
        if (pressure >= 75) detail.circle(station.x + 128, station.y + 24, 3).fill({ color: 0xffffff, alpha: 0.75 });
      }
    }
  }

  private pulseStation(id: StationId): void {
    const view = this.stationViews.get(id);
    if (!view) return;
    view.root.scale.set(0.985);
    setTimeout(() => view.root.scale.set(1), 90);
  }

  private renderHud(stress: number): void {
    this.setText('deadline', `${Math.max(0, Math.ceil(this.deadline))}s`);
    this.setText('stress', `${Math.floor(stress)}%`);
    this.setText('combo', this.assigned ? '執行中' : '待命');
  }

  private spawnFeedback(x: number, y: number, text: string): void {
    const label = new Text({
      text,
      style: new TextStyle({
        fill: 0xffef9f,
        fontSize: 18,
        fontWeight: '700',
        stroke: { color: 0x141821, width: 4 },
      }),
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.world.addChild(label);

    let lifetime = 0;
    const animate = () => {
      lifetime += this.app.ticker.deltaMS / 1000;
      label.y -= this.app.ticker.deltaMS * 0.025;
      label.alpha = Math.max(0, 1 - lifetime / 1.1);
      if (lifetime >= 1.1) {
        this.app.ticker.remove(animate);
        label.destroy();
      }
    };
    this.app.ticker.add(animate);
  }

  private stationCenter(id: StationId): { x: number; y: number } {
    const station = STATIONS.find((candidate) => candidate.id === id);
    return station
      ? { x: station.x + station.width / 2, y: station.y + station.height / 2 }
      : { x: 260, y: 520 };
  }

  private stationLabel(id: StationId): string {
    return STATIONS.find((station) => station.id === id)?.label ?? id;
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
