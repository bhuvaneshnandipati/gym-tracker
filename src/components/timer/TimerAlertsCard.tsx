import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/timer/TimerControls';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import { isVibrationSupported, playCueNow, vibrate } from '@/lib/timerSound';
import { isWakeLockSupported } from '@/lib/wakeLock';
import {
  notificationPermission,
  requestNotificationPermission,
  type NotifyPermission,
} from '@/lib/timerNotify';

/** Sound, vibration, keep-awake and notification preferences for the timers. */
export function TimerAlertsCard() {
  const { state } = useTimerState();
  const { updateSettings } = useTimerActions();
  const { settings } = state;
  const [permission, setPermission] = useState<NotifyPermission>(notificationPermission);

  const vibrationSupported = isVibrationSupported();
  const wakeLockSupported = isWakeLockSupported();
  const notificationsUsable = permission !== 'unsupported' && permission !== 'denied';

  const notificationDescription =
    permission === 'unsupported'
      ? 'Not supported by this browser. On iPhone, add the app to your Home Screen first.'
      : permission === 'denied'
        ? 'Blocked for this site. Allow notifications in your browser settings to turn this on.'
        : 'Alert you when rest ends while you are in another app or tab.';

  const toggleNotifications = async (on: boolean) => {
    if (!on) {
      updateSettings({ notifications: false });
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    updateSettings({ notifications: result === 'granted' });
  };

  return (
    <Card className="mt-4">
      <h2 className="mb-1 text-base font-semibold tracking-tight text-iron-900 dark:text-iron-50">
        Alerts
      </h2>
      <div className="divide-y divide-iron-100 dark:divide-iron-800">
        <Switch
          label="Sound"
          description="Beeps for rest end, phase changes and the 3-2-1 countdown."
          checked={settings.sound}
          onChange={(sound) => {
            updateSettings({ sound });
            if (sound) playCueNow('tick', true);
          }}
        />
        <Switch
          label="Vibration"
          description={
            vibrationSupported
              ? 'Buzz on the same events (Android and other supported browsers).'
              : 'Not supported by this browser (for example iPhone Safari).'
          }
          checked={vibrationSupported && settings.vibration}
          disabled={!vibrationSupported}
          onChange={(vibration) => {
            updateSettings({ vibration });
            if (vibration) vibrate('tick', true);
          }}
        />
        <Switch
          label="Keep screen on"
          description={
            wakeLockSupported
              ? 'Stops the phone dimming or locking while a timer runs, so alerts play on time.'
              : 'Not supported by this browser.'
          }
          checked={wakeLockSupported && settings.keepAwake}
          disabled={!wakeLockSupported}
          onChange={(keepAwake) => updateSettings({ keepAwake })}
        />
        <Switch
          label="Rest notifications"
          description={notificationDescription}
          checked={notificationsUsable && settings.notifications}
          disabled={!notificationsUsable}
          onChange={(on) => void toggleNotifications(on)}
        />
      </div>
    </Card>
  );
}
