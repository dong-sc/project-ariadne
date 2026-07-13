import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

type StationId = 'capture' | 'edit' | 'delivery' | 'client';

interface Station {
  id: StationId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
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
  private readonly stationGraphics = new Map<StationId, Graphics>();
  private pressures: Record<StationId, number> = { capture: 18, edit: 8, delivery: 0, client: 4 };
  private deadline = 90;
  private combo = 0;
  private comboGrace = 0;
  private active: StationId = 'capture';

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
    this.buildRoom();
    this.buildStations();
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
    this.world.addChild(room);

    const title = new Text({
      text: '萊鳥攝影事務所',
      style: new TextStyle({ fill: 0xf4d276, fontSize: 13, fontWeight: '700' }),
    });
    title.position.set(24, 400);
    this.world.addChild(title);
  }

  private buildStations(): void {
    for (const station of STATIONS) {
      const graphic = new Graphics();
      graphic.eventMode = 'static';
      graphic.cursor = 'pointer';
      graphic.hitArea = {
        contains: (x: number, y: number) =>
          x >= station.x && x <= station.x + station.width && y >= station.y && y <= station.y + station.height,
      };
      graphic.on('pointerdown', (event) => {
        const point = event.getLocalPosition(this.world);
        this.onStationClick(station.id, point.x, point.y);
      });
      this.stationGraphics.set(station.id, graphic);
      this.world.addChild(graphic);
    }
    this.renderStations();
  }

  private update(dt: number): void {
    for (const station of STATIONS) {
      const multiplier = station.id === this.active ? 1.35 : 1;
      this.pressures[station.id] = Math.min(100, this.pressures[station.id] + dt * 1.4 * multiplier);
    }

    const stress = this.averagePressure();
    this.deadline -= dt * (stress >= 70 ? 1.35 : 1);

    if (this.comboGrace > 0) this.comboGrace -= dt;
    else this.combo = Math.max(0, this.combo - dt * 8);

    if (this.pressures[this.active] >= 100 || this.deadline <= 0) this.failStage();
    this.renderStations();
    this.renderHud(stress);
  }

  private onStationClick(id: StationId, x: number, y: number): void {
    const critical = Math.random() < 0.12;
    const multiplier = 1 + Math.min(this.combo / 55, 1.8);
    const relief = 8 * multiplier * (critical ? 2.8 : 1);
    this.pressures[id] = Math.max(0, this.pressures[id] - relief);
    this.combo += 1;
    this.comboGrace = 2.2;
    this.spawnFeedback(x, y, critical ? 'Moment!' : `-${relief.toFixed(1)}`, critical);
  }

  private failStage(): void {
    this.pressures[this.active] = Math.max(30, this.pressures[this.active] - 38);
    this.deadline += 16;
    this.combo = 0;
    const message = document.querySelector<HTMLElement>('#message');
    if (message) message.textContent = '階段失誤：進度退後，但工作室仍能救回來。';
  }

  private averagePressure(): number {
    const values = Object.values(this.pressures);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private renderStations(): void {
    for (const station of STATIONS) {
      const graphic = this.stationGraphics.get(station.id);
      if (!graphic) continue;
      const pressure = this.pressures[station.id];
      const active = station.id === this.active;
      const status = pressure >= 75 ? 0xef6676 : pressure >= 45 ? 0xe4ac55 : 0x65dc9a;

      graphic.clear();
      graphic.roundRect(station.x, station.y, station.width, station.height, 14)
        .fill({ color: station.color, alpha: active ? 1 : 0.78 })
        .stroke({ color: pressure >= 75 ? 0xef6676 : active ? 0xf3cf6c : 0xffffff, alpha: pressure >= 75 || active ? 0.9 : 0.12, width: pressure >= 75 || active ? 3 : 1 });
      graphic.roundRect(station.x, station.y + station.height + 7, station.width, 9, 5).fill({ color: 0x10141e });
      graphic.roundRect(station.x, station.y + station.height + 7, station.width * (pressure / 100), 9, 5).fill({ color: status });

      const label = new Text({
        text: `${station.label}  ${Math.floor(pressure)}%`,
        style: new TextStyle({ fill: 0xffffff, fontSize: 14, fontWeight: '700' }),
      });
      label.position.set(station.x + 10, station.y + 10);
      graphic.addChild(label);
    }
  }

  private renderHud(stress: number): void {
    this.setText('deadline', `${Math.max(0, Math.ceil(this.deadline))}s`);
    this.setText('stress', `${Math.floor(stress)}%`);
    this.setText('combo', `${Math.floor(this.combo)}`);
  }

  private spawnFeedback(x: number, y: number, text: string, critical: boolean): void {
    const label = new Text({
      text,
      style: new TextStyle({ fill: critical ? 0xffef9f : 0xe9edf5, fontSize: critical ? 22 : 14, fontWeight: '700', stroke: { color: 0x141821, width: 4 } }),
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

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
}
