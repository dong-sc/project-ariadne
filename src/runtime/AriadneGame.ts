import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

type StationId = 'capture' | 'edit' | 'delivery' | 'client';

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
  private pressures: Record<StationId, number> = { capture: 18, edit: 8, delivery: 0, client: 4 };
  private deadline = 90;
  private combo = 0;
  private comboGrace = 0;
  private active: StationId = 'capture';
  private elapsed = 0;
  private stageProgress = 0;

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
    this.world.addChild(this.chaosVeil);
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
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
      root.on('pointerdown', (event) => {
        const point = event.getLocalPosition(this.world);
        this.onStationClick(station.id, point.x, point.y);
      });

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
    this.photographer.position.set(95, 490);

    const assistantBody = new Graphics();
    assistantBody.roundRect(-13, -24, 26, 34, 8).fill({ color: 0x5a477e });
    const assistantHead = new Graphics();
    assistantHead.circle(0, -36, 10).fill({ color: 0xe8ba9d });
    this.assistant.addChild(assistantBody, assistantHead);
    this.assistant.position.set(260, 485);

    this.world.addChild(this.photographer, this.assistant);
  }

  private update(dt: number): void {
    this.elapsed += dt;
    this.stageProgress += dt * (2.4 + this.combo * 0.015);

    for (const station of STATIONS) {
      const multiplier = station.id === this.active ? 1.35 : 1;
      this.pressures[station.id] = Math.min(100, this.pressures[station.id] + dt * 1.4 * multiplier);
    }

    const stress = this.averagePressure();
    this.deadline -= dt * (stress >= 70 ? 1.35 : 1);

    if (this.comboGrace > 0) this.comboGrace -= dt;
    else this.combo = Math.max(0, this.combo - dt * 8);

    if (this.stageProgress >= 100) this.advanceStage();
    if (this.pressures[this.active] >= 100 || this.deadline <= 0) this.failStage();

    this.animateRoom(stress);
    this.renderStations();
    this.renderHud(stress);
  }

  private onStationClick(id: StationId, x: number, y: number): void {
    const critical = Math.random() < 0.12;
    const multiplier = 1 + Math.min(this.combo / 55, 1.8);
    const relief = 8 * multiplier * (critical ? 2.8 : 1);
    this.pressures[id] = Math.max(0, this.pressures[id] - relief);

    if (id === this.active) {
      this.stageProgress = Math.min(100, this.stageProgress + 5.5 * multiplier * (critical ? 2.5 : 1));
    }

    this.combo += 1;
    this.comboGrace = 2.2;
    this.spawnFeedback(x, y, critical ? 'Moment' : `-${relief.toFixed(1)}`, critical);
    this.pulseStation(id);
  }

  private advanceStage(): void {
    const order: StationId[] = ['capture', 'edit', 'delivery'];
    const index = order.indexOf(this.active);
    const next = order[index + 1];

    if (!next) {
      this.active = 'capture';
      this.deadline = 90;
      this.stageProgress = 0;
      this.pressures = { capture: 16, edit: 7, delivery: 0, client: 3 };
      this.setMessage('準時交件。工作室安靜了下來。');
      return;
    }

    this.active = next;
    this.stageProgress = 0;
    this.deadline += 12;
    this.setMessage(`進入${this.stationLabel(next)}階段。`);
  }

  private failStage(): void {
    this.pressures[this.active] = Math.max(30, this.pressures[this.active] - 38);
    this.stageProgress = Math.max(0, this.stageProgress - 30);
    this.deadline += 16;
    this.combo = 0;
    this.setMessage(`${this.stationLabel(this.active)}失誤：進度退後，但仍然救得回來。`);
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
    const activeStation = STATIONS.find((station) => station.id === this.active);
    if (activeStation) {
      const targetX = activeStation.x + activeStation.width * 0.5;
      const targetY = activeStation.y + activeStation.height + 62;
      this.photographer.x += (targetX - this.photographer.x) * 0.035;
      this.photographer.y += (targetY - this.photographer.y) * 0.035;
    }

    const bob = Math.sin(this.elapsed * 4.2) * (stress > 70 ? 3 : 1.3);
    this.photographer.y += bob * 0.03;
    this.assistant.y = 485 + Math.sin(this.elapsed * 2.2) * 2;

    this.ambientLayer.clear();
    const sunlight = 0.055 + Math.sin(this.elapsed * 0.35) * 0.012;
    this.ambientLayer.circle(80, 82, 160).fill({ color: 0xbfe5ff, alpha: sunlight });

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
      const active = station.id === this.active;
      const risk = this.riskState(pressure);
      const statusColor = risk === 'danger' ? 0xef6676 : risk === 'busy' ? 0xe4ac55 : 0x65dc9a;
      const pulse = risk === 'danger' ? 0.78 + Math.sin(this.elapsed * 9) * 0.22 : 1;

      view.body.clear();
      view.body.roundRect(station.x, station.y, station.width, station.height, 14)
        .fill({ color: station.color, alpha: active ? 1 : 0.78 })
        .stroke({
          color: risk === 'danger' ? 0xef6676 : active ? 0xf3cf6c : 0xffffff,
          alpha: risk === 'danger' || active ? pulse : 0.12,
          width: risk === 'danger' || active ? 3 : 1,
        });

      this.drawStationDetail(station, view.detail, pressure);

      view.pressureBar.clear();
      view.pressureBar.roundRect(station.x, station.y + station.height + 7, station.width, 9, 5).fill({ color: 0x10141e });
      view.pressureBar.roundRect(station.x, station.y + station.height + 7, station.width * (pressure / 100), 9, 5).fill({ color: statusColor });

      view.label.alpha = active ? 1 : 0.82;
      view.pressureLabel.text = `${Math.floor(pressure)}%`;
      view.pressureLabel.style.fill = risk === 'danger' ? 0xffc0c8 : risk === 'busy' ? 0xffd99a : 0xe6ebf3;

      const visibleDots = Math.ceil(pressure / 17);
      view.queueDots.forEach((dot, index) => {
        dot.clear();
        if (index >= visibleDots) return;
        const dotX = station.x + 12 + index * 14;
        const dotY = station.y + station.height - 17;
        dot.circle(dotX, dotY, 4).fill({ color: statusColor, alpha: 0.55 + index * 0.06 });
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
      if (pressure >= 45) {
        detail.circle(station.x + 104, station.y + 24, 3).fill({ color: 0xffffff, alpha: 0.75 });
        if (pressure >= 60) detail.circle(station.x + 116, station.y + 24, 3).fill({ color: 0xffffff, alpha: 0.75 });
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
    this.setText('combo', `${Math.floor(this.combo)}`);
  }

  private spawnFeedback(x: number, y: number, text: string, critical: boolean): void {
    const label = new Text({
      text,
      style: new TextStyle({
        fill: critical ? 0xffef9f : 0xe9edf5,
        fontSize: critical ? 22 : 14,
        fontWeight: '700',
        stroke: { color: 0x141821, width: 4 },
      }),
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.world.addChild(label);

    let elapsed = 0;
    const animate = () => {
      elapsed += this.app.ticker.deltaMS / 1000;
      label.y -= this.app.ticker.deltaMS * 0.035;
      label.alpha = Math.max(0, 1 - elapsed / 0.85);
      if (elapsed >= 0.85) {
        this.app.ticker.remove(animate);
        label.destroy();
      }
    };
    this.app.ticker.add(animate);
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
