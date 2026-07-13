import { describe, expect, it } from 'vitest';
import {
  AriadneLoop,
  HANDOFF_PREP_DURATION,
  JOB_BRIEFS,
  STAGE_ORDER,
  WORK_DURATION,
} from './AriadneLoop';

function finishActiveStage(loop: AriadneLoop): void {
  const station = loop.state.active;
  if (!loop.state.production) {
    expect(loop.dispatch(station)).toEqual({ type: 'production-assigned', station });
  }
  loop.reachProductionStation();
  loop.tick(WORK_DURATION[station] + 0.1);
}

describe('AriadneLoop', () => {
  it('turns one click into one production assignment', () => {
    const loop = new AriadneLoop();

    expect(loop.dispatch('capture')).toEqual({ type: 'production-assigned', station: 'capture' });
    const remaining = loop.state.production?.remaining;

    expect(loop.dispatch('capture')).toEqual({ type: 'production-busy', station: 'capture' });
    expect(loop.state.production?.remaining).toBe(remaining);
  });

  it('does not advance work while the photographer is still moving', () => {
    const loop = new AriadneLoop();
    loop.dispatch('capture');
    const remaining = loop.state.production?.remaining;

    loop.tick(1);

    expect(loop.state.production?.phase).toBe('moving');
    expect(loop.state.production?.remaining).toBe(remaining);
  });

  it('lets the assistant handle the client in parallel', () => {
    const loop = new AriadneLoop();
    loop.dispatch('capture');
    loop.reachProductionStation();

    expect(loop.dispatch('client')).toEqual({ type: 'client-assigned' });
    loop.reachClientStation();
    const events = loop.tick(3);

    expect(events).toContainEqual({ type: 'client-complete' });
    expect(loop.state.production?.station).toBe('capture');
    expect(loop.state.client).toBeNull();
    expect(loop.state.clientCooldown).toBeGreaterThan(0);
  });

  it('keeps the handoff locked until the photographer starts work', () => {
    const loop = new AriadneLoop();

    expect(loop.dispatch('edit')).toEqual({ type: 'wrong-stage', expected: 'capture' });
    expect(loop.dispatch('capture')).toEqual({ type: 'production-assigned', station: 'capture' });
    expect(loop.dispatch('edit')).toEqual({ type: 'handoff-not-ready', station: 'capture', next: 'edit' });
  });

  it('makes pre-assignment a visible assistant task before automatic handoff', () => {
    const loop = new AriadneLoop();

    loop.dispatch('capture');
    loop.reachProductionStation();
    expect(loop.dispatch('edit')).toEqual({ type: 'handoff-prep-assigned', station: 'edit' });
    expect(loop.state.queuedProduction).toBeNull();
    expect(loop.dispatch('edit')).toEqual({ type: 'handoff-prep-busy', station: 'edit' });

    loop.reachHandoffStation();
    const prepEvents = loop.tick(HANDOFF_PREP_DURATION + 0.1);
    expect(prepEvents).toContainEqual({ type: 'handoff-prepared', station: 'edit' });
    expect(loop.state.queuedProduction).toBe('edit');

    const events = loop.tick(WORK_DURATION.capture + 0.1);

    expect(events).toContainEqual({ type: 'production-complete', station: 'capture', next: 'edit', autoStarted: true });
    finishActiveStage(loop);
    expect(loop.state.active).toBe('delivery');
  });

  it('forces a choice between preparing the handoff and replying to the client', () => {
    const loop = new AriadneLoop();

    loop.dispatch('capture');
    loop.reachProductionStation();
    expect(loop.dispatch('edit')).toEqual({ type: 'handoff-prep-assigned', station: 'edit' });
    expect(loop.dispatch('client')).toEqual({ type: 'assistant-busy', task: 'handoff' });

    loop.reachHandoffStation();
    loop.tick(HANDOFF_PREP_DURATION + 0.1);
    expect(loop.dispatch('client')).toEqual({ type: 'client-assigned' });
    expect(loop.dispatch('edit')).toEqual({ type: 'production-queue-busy', station: 'edit' });
  });

  it('keeps handoff preparation unavailable while the assistant is with the client', () => {
    const loop = new AriadneLoop();

    loop.dispatch('capture');
    loop.reachProductionStation();
    expect(loop.dispatch('client')).toEqual({ type: 'client-assigned' });
    expect(loop.dispatch('edit')).toEqual({ type: 'assistant-busy', task: 'client' });
  });

  it('gives the communication-first brief time to reply before preparing the handoff', () => {
    const loop = new AriadneLoop();
    finishActiveStage(loop);
    finishActiveStage(loop);
    finishActiveStage(loop);
    loop.startNextJob();

    expect(loop.currentBrief().id).toBe('portrait');
    loop.dispatch('capture');
    loop.reachProductionStation();
    expect(loop.dispatch('client')).toEqual({ type: 'client-assigned' });
    loop.reachClientStation();
    loop.tick(3);
    expect(loop.dispatch('edit')).toEqual({ type: 'handoff-prep-assigned', station: 'edit' });
    loop.reachHandoffStation();
    loop.tick(HANDOFF_PREP_DURATION + 0.1);

    expect(loop.state.production?.station).toBe('capture');
    expect(loop.state.queuedProduction).toBe('edit');
    const events = loop.tick(loop.state.production?.remaining ?? 0);
    expect(events).toContainEqual({
      type: 'production-complete',
      station: 'capture',
      next: 'edit',
      autoStarted: true,
    });
  });

  it('stops pressure and time after delivery until the player starts another job', () => {
    const loop = new AriadneLoop();
    finishActiveStage(loop);
    finishActiveStage(loop);
    finishActiveStage(loop);

    expect(loop.state.completed).toBe(true);
    expect(loop.state.deliveredJobs).toBe(1);
    expect(loop.state.pressures).toEqual({ capture: 0, edit: 0, delivery: 0, client: 0 });

    const deadline = loop.state.deadline;
    expect(loop.tick(30)).toEqual([]);
    expect(loop.state.deadline).toBe(deadline);

    loop.startNextJob();
    expect(loop.state.completed).toBe(false);
    expect(loop.state.active).toBe('capture');
    expect(loop.currentBrief().id).toBe('portrait');
    expect(loop.state.lastOutcome?.cleanWorkflow).toBe(false);
  });

  it('turns a clean workflow into visible breathing room on the next brief', () => {
    const loop = new AriadneLoop();

    loop.dispatch('capture');
    loop.reachProductionStation();
    expect(loop.dispatch('edit')).toEqual({ type: 'handoff-prep-assigned', station: 'edit' });
    loop.reachHandoffStation();
    loop.tick(HANDOFF_PREP_DURATION + 0.1);
    expect(loop.dispatch('client')).toEqual({ type: 'client-assigned' });
    loop.reachClientStation();
    loop.tick(3);

    expect(loop.state.active).toBe('edit');
    loop.reachProductionStation();
    expect(loop.dispatch('delivery')).toEqual({ type: 'handoff-prep-assigned', station: 'delivery' });
    loop.reachHandoffStation();
    loop.tick(HANDOFF_PREP_DURATION + 0.1);
    loop.tick(loop.currentWorkDuration('edit') + 0.1);
    expect(loop.state.active).toBe('delivery');
    loop.reachProductionStation();
    loop.tick(loop.currentWorkDuration('delivery') + 0.1);

    expect(loop.state.completed).toBe(true);
    expect(loop.state.lastOutcome).toMatchObject({
      smoothHandoffs: STAGE_ORDER.length - 1,
      clientUpdates: 1,
      clientEscalations: 0,
      stageFailures: 0,
      cleanWorkflow: true,
      workflowBuffer: 1,
    });

    loop.startNextJob();
    const portrait = JOB_BRIEFS[1]!;
    expect(loop.currentBrief().id).toBe('portrait');
    expect(loop.state.pressures.client).toBe(portrait.initialPressures.client - 4);
    expect(loop.state.deadline).toBe(portrait.deadline + 4);
    expect(loop.currentWorkDuration('edit')).toBe(portrait.workDuration.edit);
  });
});
