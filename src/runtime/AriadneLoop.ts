export type StationId = 'capture' | 'edit' | 'delivery' | 'client';
export type ProductionStationId = Exclude<StationId, 'client'>;
export type AssignmentPhase = 'moving' | 'working';
export type JobBriefId = 'event' | 'portrait' | 'rush';
export type AssistantTask = 'client' | 'handoff';
export type EquipmentId = 'backup-body' | 'dual-reader' | 'hotspot' | 'paper-runbook';
export type IncidentId = 'shutter-failure' | 'reader-crawl' | 'dead-wifi' | 'schedule-drift';

export interface EquipmentDefinition {
  id: EquipmentId;
  label: string;
  shortLabel: string;
  purpose: string;
}

export interface IncidentDefinition {
  id: IncidentId;
  title: string;
  signal: string;
  station: ProductionStationId;
  equipment: EquipmentId;
  pressureTarget: StationId;
  pressurePenalty: number;
  deadlinePenalty: number;
  workDelay: number;
  containedCopy: string;
  exposedCopy: string;
}

export interface IncidentOutcome {
  incidentId: IncidentId;
  equipmentId: EquipmentId;
  title: string;
  mitigated: boolean;
  detail: string;
}

export interface JobBrief {
  id: JobBriefId;
  title: string;
  focus: string;
  cue: string;
  initialPressures: Record<StationId, number>;
  deadline: number;
  workDuration: Record<ProductionStationId, number>;
  clientGrowth: number;
}

export interface JobOutcome {
  smoothHandoffs: number;
  clientUpdates: number;
  clientEscalations: number;
  stageFailures: number;
  cleanWorkflow: boolean;
  workflowBuffer: number;
}

export interface ProductionAssignment {
  station: ProductionStationId;
  phase: AssignmentPhase;
  remaining: number;
  total: number;
}

export interface ClientAssignment {
  phase: AssignmentPhase;
  remaining: number;
  total: number;
}

export interface HandoffPreparation extends ClientAssignment {
  station: ProductionStationId;
}

export interface LoopState {
  pressures: Record<StationId, number>;
  deadline: number;
  jobIndex: number;
  active: ProductionStationId;
  production: ProductionAssignment | null;
  queuedProduction: ProductionStationId | null;
  client: ClientAssignment | null;
  handoffPrep: HandoffPreparation | null;
  clientCooldown: number;
  completed: boolean;
  deliveredJobs: number;
  workflowBuffer: number;
  smoothHandoffs: number;
  clientUpdates: number;
  clientEscalations: number;
  stageFailures: number;
  lastOutcome: JobOutcome | null;
  shiftStarted: boolean;
  loadout: EquipmentId[];
  currentIncident: IncidentId | null;
  incidentTriggered: boolean;
  lastIncidentOutcome: IncidentOutcome | null;
  incidentHistory: IncidentOutcome[];
}

export type DispatchResult =
  | { type: 'production-assigned'; station: ProductionStationId }
  | { type: 'handoff-prep-assigned'; station: ProductionStationId }
  | { type: 'client-assigned' }
  | { type: 'production-busy'; station: ProductionStationId }
  | { type: 'production-queue-busy'; station: ProductionStationId }
  | { type: 'handoff-prep-busy'; station: ProductionStationId }
  | { type: 'assistant-busy'; task: AssistantTask }
  | { type: 'handoff-not-ready'; station: ProductionStationId; next: ProductionStationId }
  | { type: 'client-busy' }
  | { type: 'client-cooling'; remaining: number }
  | { type: 'wrong-stage'; expected: ProductionStationId }
  | { type: 'shift-not-started' }
  | { type: 'job-complete' };

export type LoopEvent =
  | { type: 'production-complete'; station: ProductionStationId; next: ProductionStationId; autoStarted: boolean }
  | { type: 'handoff-prepared'; station: ProductionStationId }
  | { type: 'delivery-complete' }
  | { type: 'client-complete' }
  | { type: 'client-escalated' }
  | { type: 'incident-triggered'; outcome: IncidentOutcome }
  | { type: 'stage-failed'; station: ProductionStationId };

export const STAGE_ORDER: readonly ProductionStationId[] = ['capture', 'edit', 'delivery'];

export const EQUIPMENT: readonly EquipmentDefinition[] = [
  { id: 'backup-body', label: '備用機身', shortLabel: '備用機', purpose: '主機失靈時直接換機，保住拍攝節奏' },
  { id: 'dual-reader', label: '雙讀卡機', shortLabel: '雙讀卡', purpose: '單一讀卡通道失速時仍能繼續進檔' },
  { id: 'hotspot', label: '行動網路', shortLabel: '行動網路', purpose: '場館網路只有看起來正常時，保住交件' },
  { id: 'paper-runbook', label: '紙本流程表', shortLabel: '紙本流程', purpose: '口頭變更互相矛盾時，留下可核對的版本' },
];

export const INCIDENTS: Readonly<Record<IncidentId, IncidentDefinition>> = {
  'shutter-failure': {
    id: 'shutter-failure',
    title: '主機偏偏現在失靈',
    signal: '主機半按快門偶爾沒有反應，但送修說一切正常。',
    station: 'capture',
    equipment: 'backup-body',
    pressureTarget: 'capture',
    pressurePenalty: 24,
    deadlinePenalty: 3,
    workDelay: 3.5,
    containedCopy: '備用機身已經對時，攝影師直接換機；現場只停了一個呼吸。',
    exposedCopy: '唯一機身重新開機，拍攝窗口正在往前跑；這不是連點能救回來的時間。',
  },
  'reader-crawl': {
    id: 'reader-crawl',
    title: '讀卡機只剩 12 KB/s',
    signal: '讀卡桌只留了一個 USB 孔，器材說「應該夠用」。',
    station: 'edit',
    equipment: 'dual-reader',
    pressureTarget: 'edit',
    pressurePenalty: 26,
    deadlinePenalty: 4,
    workDelay: 4,
    containedCopy: '第二條讀卡通道立即接手，壞掉的那一條可以下班後再查。',
    exposedCopy: '進檔速度慢到像沒有在動，修圖只能等資料一張一張爬進來。',
  },
  'dead-wifi': {
    id: 'dead-wifi',
    title: 'Wi-Fi 滿格，但沒有網路',
    signal: '場館窗口說 Wi-Fi 沒問題，但沒有人真的傳過檔案。',
    station: 'delivery',
    equipment: 'hotspot',
    pressureTarget: 'delivery',
    pressurePenalty: 30,
    deadlinePenalty: 5,
    workDelay: 4.5,
    containedCopy: '行動網路接手上傳；滿格但不能用的 Wi-Fi 留在背景裡。',
    exposedCopy: '交件檔已經準備好，進度條卻完全不動；客戶只看得到時間正在消失。',
  },
  'schedule-drift': {
    id: 'schedule-drift',
    title: 'VIP 已在門口，流程表還沒改',
    signal: '流程表今天已被口頭改過兩次，但群組裡仍是舊版本。',
    station: 'capture',
    equipment: 'paper-runbook',
    pressureTarget: 'client',
    pressurePenalty: 32,
    deadlinePenalty: 6,
    workDelay: 1.5,
    containedCopy: '助理拿紙本版本逐項對回去，口頭變更終於有了可以追的順序。',
    exposedCopy: '每個人都記得不同版本，VIP 已經開始走；攝影師只能邊拍邊猜。',
  },
};

export const JOB_BRIEFS: readonly JobBrief[] = [
  {
    id: 'event',
    title: '活動快訊',
    focus: '現場快報',
    cue: '時程看起來正常，但每個窗口都只知道一部分',
    initialPressures: { capture: 18, edit: 5, delivery: 0, client: 16 },
    deadline: 78,
    workDuration: { capture: 5.8, edit: 7.2, delivery: 5.4 },
    clientGrowth: 1.82,
  },
  {
    id: 'portrait',
    title: '品牌肖像',
    focus: '多人確認',
    cue: '窗口很多，真正能決定的人還沒有出現',
    initialPressures: { capture: 12, edit: 12, delivery: 0, client: 42 },
    deadline: 84,
    workDuration: { capture: 8.4, edit: 8.8, delivery: 5.4 },
    clientGrowth: 2.2,
  },
  {
    id: 'rush',
    title: '晚宴急件',
    focus: '晚間交付',
    cue: '所有人都說來得及，交件條件卻沒有人實測',
    initialPressures: { capture: 14, edit: 8, delivery: 32, client: 12 },
    deadline: 64,
    workDuration: { capture: 5.4, edit: 7.8, delivery: 6.2 },
    clientGrowth: 1.55,
  },
];

export const WORK_DURATION = JOB_BRIEFS[0]!.workDuration;

export const CLIENT_WORK_DURATION = 2.8;
export const HANDOFF_PREP_DURATION = 3.2;
const CLIENT_COOLDOWN = 8;
const LOADOUT_SIZE = 2;

const INCIDENT_POOLS: Readonly<Record<JobBriefId, readonly IncidentId[]>> = {
  event: ['schedule-drift', 'shutter-failure', 'reader-crawl'],
  portrait: ['shutter-failure', 'schedule-drift', 'dead-wifi'],
  rush: ['dead-wifi', 'reader-crawl', 'schedule-drift'],
};

function jobBrief(index: number): JobBrief {
  return JOB_BRIEFS[index] ?? JOB_BRIEFS[0]!;
}

function initialPressures(jobIndex: number, workflowBuffer: number): Record<StationId, number> {
  const relief = workflowBuffer * 4;
  const profile = jobBrief(jobIndex).initialPressures;
  return {
    capture: Math.max(0, profile.capture - relief),
    edit: Math.max(0, profile.edit - relief),
    delivery: Math.max(0, profile.delivery - relief),
    client: Math.max(0, profile.client - relief),
  };
}

function equipmentDefinition(id: EquipmentId): EquipmentDefinition {
  return EQUIPMENT.find((item) => item.id === id) ?? EQUIPMENT[0]!;
}

function createIncidentPlan(rng: () => number): IncidentId[] {
  const used = new Set<IncidentId>();
  return JOB_BRIEFS.map((brief) => {
    const pool = INCIDENT_POOLS[brief.id];
    const available = pool.filter((id) => !used.has(id));
    const choices = available.length > 0 ? available : pool;
    const index = Math.min(choices.length - 1, Math.floor(Math.max(0, rng()) * choices.length));
    const selected = choices[index] ?? choices[0]!;
    used.add(selected);
    return selected;
  });
}

function createSignalOrder(rng: () => number): IncidentId[] {
  const signals = Object.keys(INCIDENTS) as IncidentId[];
  for (let index = signals.length - 1; index > 0; index -= 1) {
    const target = Math.min(index, Math.floor(Math.max(0, rng()) * (index + 1)));
    [signals[index], signals[target]] = [signals[target]!, signals[index]!];
  }
  return signals;
}

export class AriadneLoop {
  private incidentPlan: IncidentId[] = [];
  private signalOrder: IncidentId[] = [];

  public readonly state: LoopState = {
    pressures: initialPressures(0, 0),
    deadline: JOB_BRIEFS[0]!.deadline,
    jobIndex: 0,
    active: 'capture',
    production: null,
    queuedProduction: null,
    client: null,
    handoffPrep: null,
    clientCooldown: 0,
    completed: false,
    deliveredJobs: 0,
    workflowBuffer: 0,
    smoothHandoffs: 0,
    clientUpdates: 0,
    clientEscalations: 0,
    stageFailures: 0,
    lastOutcome: null,
    shiftStarted: true,
    loadout: [],
    currentIncident: null,
    incidentTriggered: false,
    lastIncidentOutcome: null,
    incidentHistory: [],
  };

  public constructor(private readonly rng: () => number = Math.random) {}

  public currentBrief(): JobBrief {
    return jobBrief(this.state.jobIndex);
  }

  public nextBrief(): JobBrief {
    return jobBrief((this.state.jobIndex + 1) % JOB_BRIEFS.length);
  }

  public currentWorkDuration(station: ProductionStationId): number {
    return this.currentBrief().workDuration[station];
  }

  public isShiftComplete(): boolean {
    return this.state.completed
      && this.state.deliveredJobs > 0
      && this.state.deliveredJobs % JOB_BRIEFS.length === 0;
  }

  public prepareShift(): void {
    this.incidentPlan = createIncidentPlan(this.rng);
    this.signalOrder = createSignalOrder(this.rng);
    this.state.shiftStarted = false;
    this.state.loadout = [];
    this.state.currentIncident = null;
    this.state.incidentTriggered = false;
    this.state.lastIncidentOutcome = null;
    this.state.incidentHistory = [];
  }

  public preflightSignals(): string[] {
    return this.signalOrder.map((id) => INCIDENTS[id].signal);
  }

  public configureLoadout(ids: readonly EquipmentId[]): boolean {
    if (this.state.shiftStarted) return false;
    const unique = [...new Set(ids)].filter((id): id is EquipmentId => EQUIPMENT.some((item) => item.id === id));
    if (unique.length !== LOADOUT_SIZE) return false;
    this.state.loadout = unique;
    return true;
  }

  public startShift(): boolean {
    if (this.state.loadout.length !== LOADOUT_SIZE || this.incidentPlan.length !== JOB_BRIEFS.length) return false;
    this.state.shiftStarted = true;
    this.state.currentIncident = this.incidentPlan[this.state.jobIndex] ?? null;
    return true;
  }

  public equipmentLabel(id: EquipmentId): string {
    return equipmentDefinition(id).shortLabel;
  }

  public currentIncidentDefinition(): IncidentDefinition | null {
    return this.state.currentIncident ? INCIDENTS[this.state.currentIncident] : null;
  }

  public dispatch(id: StationId): DispatchResult {
    if (!this.state.shiftStarted) return { type: 'shift-not-started' };
    if (this.state.completed) return { type: 'job-complete' };

    if (id === 'client') {
      if (this.state.client) return { type: 'client-busy' };
      if (this.state.handoffPrep) return { type: 'assistant-busy', task: 'handoff' };
      if (this.state.clientCooldown > 0) {
        return { type: 'client-cooling', remaining: this.state.clientCooldown };
      }

      this.state.client = {
        phase: 'moving',
        remaining: CLIENT_WORK_DURATION,
        total: CLIENT_WORK_DURATION,
      };
      return { type: 'client-assigned' };
    }

    const production = this.state.production;
    if (production) {
      if (id === production.station) return { type: 'production-busy', station: production.station };

      const next = STAGE_ORDER[STAGE_ORDER.indexOf(this.state.active) + 1];
      if (!next) return { type: 'wrong-stage', expected: this.state.active };
      if (production.phase === 'moving') {
        return { type: 'handoff-not-ready', station: production.station, next };
      }
      if (id !== next) return { type: 'wrong-stage', expected: next };
      if (this.state.queuedProduction === id) return { type: 'production-queue-busy', station: id };
      if (this.state.handoffPrep?.station === id) return { type: 'handoff-prep-busy', station: id };
      if (this.state.client) return { type: 'assistant-busy', task: 'client' };

      this.state.handoffPrep = {
        station: id,
        phase: 'moving',
        remaining: HANDOFF_PREP_DURATION,
        total: HANDOFF_PREP_DURATION,
      };
      return { type: 'handoff-prep-assigned', station: id };
    }

    if (id !== this.state.active) return { type: 'wrong-stage', expected: this.state.active };

    this.state.production = {
      station: id,
      phase: 'moving',
      remaining: this.currentWorkDuration(id),
      total: this.currentWorkDuration(id),
    };
    return { type: 'production-assigned', station: id };
  }

  public reachProductionStation(): void {
    if (this.state.production?.phase === 'moving') this.state.production.phase = 'working';
  }

  public reachClientStation(): void {
    if (this.state.client?.phase === 'moving') this.state.client.phase = 'working';
  }

  public reachHandoffStation(): void {
    if (this.state.handoffPrep?.phase === 'moving') this.state.handoffPrep.phase = 'working';
  }

  public tick(dt: number): LoopEvent[] {
    if (!this.state.shiftStarted || this.state.completed || dt <= 0) return [];

    const events: LoopEvent[] = [];
    this.state.clientCooldown = Math.max(0, this.state.clientCooldown - dt);

    for (const station of STAGE_ORDER) {
      const isActive = station === this.state.active;
      const isNext = STAGE_ORDER.indexOf(station) === STAGE_ORDER.indexOf(this.state.active) + 1;
      const growth = isActive ? 1.18 : isNext ? 0.18 : 0;
      const workingRelief = this.state.production?.station === station && this.state.production.phase === 'working' ? -1.45 : 0;
      const prepRelief = this.state.handoffPrep?.station === station && this.state.handoffPrep.phase === 'working' ? -0.72 : 0;
      this.state.pressures[station] = this.clamp(this.state.pressures[station] + dt * (growth + workingRelief + prepRelief));
    }

    const clientGrowth = this.state.client?.phase === 'working' ? 0.35 : this.currentBrief().clientGrowth;
    this.state.pressures.client = this.clamp(this.state.pressures.client + dt * clientGrowth);

    if (this.state.handoffPrep?.phase === 'working') {
      this.state.handoffPrep.remaining = Math.max(0, this.state.handoffPrep.remaining - dt);
      if (this.state.handoffPrep.remaining <= 0) {
        const station = this.state.handoffPrep.station;
        this.state.handoffPrep = null;
        this.state.queuedProduction = station;
        this.state.pressures[station] = Math.max(0, this.state.pressures[station] - 10);
        events.push({ type: 'handoff-prepared', station });
      }
    }

    if (this.state.client?.phase === 'working') {
      this.state.client.remaining = Math.max(0, this.state.client.remaining - dt);
      if (this.state.client.remaining <= 0) {
        this.state.client = null;
        this.state.clientCooldown = CLIENT_COOLDOWN;
        this.state.pressures.client = Math.max(0, this.state.pressures.client - 52);
        this.state.clientUpdates += 1;
        events.push({ type: 'client-complete' });
      }
    }

    events.push(...this.maybeTriggerIncident());

    if (this.state.production?.phase === 'working') {
      this.state.production.remaining = Math.max(0, this.state.production.remaining - dt);
      if (this.state.production.remaining <= 0) events.push(...this.finishProduction());
    }

    const averagePressure = this.averagePressure();
    this.state.deadline -= dt * (averagePressure >= 70 ? 1.3 : 1);

    if (this.state.pressures.client >= 100) {
      this.state.pressures.client = 62;
      this.state.deadline -= 8;
      this.state.clientEscalations += 1;
      events.push({ type: 'client-escalated' });
    }

    if (this.state.pressures[this.state.active] >= 100 || this.state.deadline <= 0) {
      const failed = this.state.active;
      this.state.production = null;
      this.state.queuedProduction = null;
      this.state.handoffPrep = null;
      this.state.pressures[failed] = 42;
      this.state.deadline = Math.max(18, this.state.deadline + 20);
      this.state.pressures.client = this.clamp(this.state.pressures.client + 14);
      this.state.stageFailures += 1;
      events.push({ type: 'stage-failed', station: failed });
    }

    return events;
  }

  public startNextJob(): void {
    this.state.jobIndex = (this.state.jobIndex + 1) % JOB_BRIEFS.length;
    this.state.pressures = initialPressures(this.state.jobIndex, this.state.workflowBuffer);
    this.state.deadline = this.currentBrief().deadline + this.state.workflowBuffer * 4;
    this.state.active = 'capture';
    this.state.production = null;
    this.state.queuedProduction = null;
    this.state.client = null;
    this.state.handoffPrep = null;
    this.state.clientCooldown = 0;
    this.state.completed = false;
    this.state.smoothHandoffs = 0;
    this.state.clientUpdates = 0;
    this.state.clientEscalations = 0;
    this.state.stageFailures = 0;
    this.state.currentIncident = this.incidentPlan[this.state.jobIndex] ?? null;
    this.state.incidentTriggered = false;
    this.state.lastIncidentOutcome = null;
  }

  public averagePressure(): number {
    const values = Object.values(this.state.pressures);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private maybeTriggerIncident(): LoopEvent[] {
    const incident = this.currentIncidentDefinition();
    const production = this.state.production;
    if (!incident || this.state.incidentTriggered || production?.phase !== 'working') return [];
    if (production.station !== incident.station) return [];

    const progress = 1 - production.remaining / production.total;
    if (progress < 0.34) return [];

    this.state.incidentTriggered = true;
    const mitigated = this.state.loadout.includes(incident.equipment);
    if (mitigated) {
      this.state.pressures[incident.pressureTarget] = Math.max(
        0,
        this.state.pressures[incident.pressureTarget] - 6,
      );
    } else {
      this.state.pressures[incident.pressureTarget] = this.clamp(
        this.state.pressures[incident.pressureTarget] + incident.pressurePenalty,
      );
      this.state.deadline = Math.max(0, this.state.deadline - incident.deadlinePenalty);
      production.remaining += incident.workDelay;
      production.total += incident.workDelay;
    }

    const outcome: IncidentOutcome = {
      incidentId: incident.id,
      equipmentId: incident.equipment,
      title: incident.title,
      mitigated,
      detail: mitigated ? incident.containedCopy : incident.exposedCopy,
    };
    this.state.lastIncidentOutcome = outcome;
    this.state.incidentHistory.push(outcome);
    return [{ type: 'incident-triggered', outcome }];
  }

  private finishProduction(): LoopEvent[] {
    const completed = this.state.production?.station;
    if (!completed) return [];

    this.state.pressures[completed] = Math.max(0, this.state.pressures[completed] - 44);
    const index = STAGE_ORDER.indexOf(completed);
    const next = STAGE_ORDER[index + 1];

    if (!next) {
      this.state.production = null;
      this.state.queuedProduction = null;
      this.state.handoffPrep = null;
      this.state.completed = true;
      this.state.deliveredJobs += 1;
      const cleanWorkflow = this.state.smoothHandoffs === 2
        && this.state.clientUpdates > 0
        && this.state.clientEscalations === 0
        && this.state.stageFailures === 0;
      this.state.workflowBuffer = cleanWorkflow
        ? Math.min(2, this.state.workflowBuffer + 1)
        : Math.max(0, this.state.workflowBuffer - 1);
      this.state.lastOutcome = {
        smoothHandoffs: this.state.smoothHandoffs,
        clientUpdates: this.state.clientUpdates,
        clientEscalations: this.state.clientEscalations,
        stageFailures: this.state.stageFailures,
        cleanWorkflow,
        workflowBuffer: this.state.workflowBuffer,
      };
      this.state.client = null;
      this.state.clientCooldown = 0;
      this.state.pressures = { capture: 0, edit: 0, delivery: 0, client: 0 };
      return [{ type: 'delivery-complete' }];
    }

    this.state.active = next;
    this.state.deadline += 10;
    const autoStarted = this.state.queuedProduction === next;
    if (autoStarted) this.state.smoothHandoffs += 1;
    this.state.queuedProduction = null;
    this.state.handoffPrep = null;
    this.state.production = autoStarted
      ? {
          station: next,
          phase: 'moving',
          remaining: this.currentWorkDuration(next),
          total: this.currentWorkDuration(next),
        }
      : null;
    return [{ type: 'production-complete', station: completed, next, autoStarted }];
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
}
