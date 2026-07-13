import { describe, expect, it } from 'vitest';
import { AriadneLoop, WORK_DURATION } from './AriadneLoop';

function finishActiveStage(loop: AriadneLoop): void {
  const station = loop.state.active;
  expect(loop.dispatch(station)).toEqual({ type: 'production-assigned', station });
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

  it('keeps future production stages locked until the current stage is complete', () => {
    const loop = new AriadneLoop();

    expect(loop.dispatch('edit')).toEqual({ type: 'wrong-stage', expected: 'capture' });
    finishActiveStage(loop);
    expect(loop.state.active).toBe('edit');
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
  });
});
