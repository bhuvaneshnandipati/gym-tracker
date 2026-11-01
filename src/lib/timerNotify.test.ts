import { describe, expect, it } from 'vitest';
import { restNotificationId, restScheduleCommand } from '@/lib/timerNotify';

describe('restScheduleCommand', () => {
  const running = { status: 'running', endsAt: 1_000_000 };

  it('schedules the worker for a running rest when allowed', () => {
    expect(restScheduleCommand(running, true, 'granted')).toEqual({
      type: 'schedule',
      id: restNotificationId(1_000_000),
      at: 1_000_000,
    });
  });

  it('cancels when notifications are off or not permitted', () => {
    expect(restScheduleCommand(running, false, 'granted')).toEqual({ type: 'cancel' });
    expect(restScheduleCommand(running, true, 'default')).toEqual({ type: 'cancel' });
    expect(restScheduleCommand(running, true, 'denied')).toEqual({ type: 'cancel' });
    expect(restScheduleCommand(running, true, 'unsupported')).toEqual({ type: 'cancel' });
  });

  it('cancels when the rest is paused, reset or has no end time', () => {
    expect(restScheduleCommand({ status: 'paused', endsAt: null }, true, 'granted').type).toBe(
      'cancel',
    );
    expect(restScheduleCommand({ status: 'idle', endsAt: null }, true, 'granted').type).toBe(
      'cancel',
    );
    expect(restScheduleCommand({ status: 'running', endsAt: null }, true, 'granted').type).toBe(
      'cancel',
    );
  });

  it('gives the page and the worker the same id for one rest', () => {
    // settleRest sets finishedAt = endsAt, so both sides derive the same id.
    expect(restNotificationId(1_000_000)).toBe(restNotificationId(1_000_000));
    expect(restNotificationId(1_000_000)).not.toBe(restNotificationId(1_000_001));
  });
});
