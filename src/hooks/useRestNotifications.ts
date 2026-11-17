import { useCallback, useEffect, useState } from 'react';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import {
  notificationPermission,
  requestNotificationPermission,
  watchNotificationPermission,
  type NotifyPermission,
} from '@/lib/timerNotify';

/**
 * Whether "Rest notifications" is really on (setting on and permission
 * granted), and a one-tap way to turn it on. Rest notifications are off by
 * default, so without a nudge where rests are started most people never get
 * one when the app is in the background.
 */
export function useRestNotifications() {
  const { state } = useTimerState();
  const { updateSettings } = useTimerActions();
  const [permission, setPermission] = useState<NotifyPermission>(notificationPermission);

  // Permission can change in system settings while the app is in the background.
  useEffect(() => watchNotificationPermission(setPermission), []);

  const enabled = permission === 'granted' && state.settings.notifications;
  /** True when one tap can turn them on (not blocked, not unsupported). */
  const canEnable = !enabled && permission !== 'denied' && permission !== 'unsupported';

  /** Must be called from a tap: asks for permission, then saves the setting. */
  const enable = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    updateSettings({ notifications: result === 'granted' });
    return result;
  }, [updateSettings]);

  return { permission, enabled, canEnable, enable };
}
