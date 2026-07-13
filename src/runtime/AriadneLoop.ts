export type StationId = 'capture' | 'edit' | 'delivery' | 'client';
export type ProductionStationId = Exclude<StationId, 'client'>;
export type AssignmentPhase = 'moving' | 'working';
export type JobBriefId = 'event' | 'portrait' | 'rush';
export type AssistantTask = 'client' | 'handoff';

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
  | { type: 'job-complete' };

export type LoopEvent =
  | { type: 'production-complete'; station: ProductionStationId; next: ProductionStationId; autoStarted: boolean }
  | { type: 'handoff-prepared'; station: ProductionStationId }
  | { type: 'delivery-complete' }
  | { type: 'client-complete' }
  | { type: 'client-escalated' }
  | { type: 'stage-failed'; station: ProductionStationId };

export const STAGE_ORDER: readonly ProductionStationId[] = ['capture', 'edit', 'delivery'];

export const JOB_BRIEFS: readonly JobBrief[] = [
  {
    id: 'event',
    title: '活動快訊',
    focus: '三站平衡',
    cue: '風險平均，助理的第一個安排會定調',
    initialPressures: { capture: 18, edit: 5, delivery: 0, client: 16 },
    deadline: 78,
    workDuration: { capture: 5.8, edit: 7.2, delivery: 5.4 },
    clientGrowth: 1.82,
  },
  {
    id: 'portrait',
    title: '品牌肖像',
    focus: '溝通優先',
    cue: '窗口較敏感，延後回覆會快速升溫',
    initialPressures: { capture: 12, edit: 12, delivery: 0, client: 42 },
    deadline: 84,
    workDuration: { capture: 8.4, edit: 8.8, delivery: 5.4 },
    clientGrowth: 2.2,
  },
  {
    id: 'rush',
    title: '晚宴急件',
    focus: '交件優先',
    cue: '交付端已升溫，晚準備會留下斷點',
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

export class AriadneLoop {
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
  };

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

  public dispatch(id: StationId): DispatchResult {
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
    if (this.state.completed || dt <= 0) return [];

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
  }

  public averagePressure(): number {
    const values = Object.values(this.state.pressures);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
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
