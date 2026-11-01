import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/timer/TimerControls';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import { isVibrationSupported, playCueNow, vibrate } from '@/lib/timerSound';
import { isWakeLockSupported } from '@/lib/wakeLock';
import {
  notificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  watchNotificationPermission,
  type NotifyPermission,
} from '@/lib/timerNotify';

/** Sound, vibration, keep-awake and notification preferences for the timers. */
export function TimerAlertsCard() {
  const { state } = useTimerState();
  const { updateSettings } = useTimerActions();
  const { settings } = state;
  const [permission, setPermission] = useState<NotifyPermission>(notificationPermission);
  const [testing, setTesting] = useState(false);
  const toast = useToast();

  // Permission can be granted or revoked in system settings while the app is
  // in the background; re-check whenever the user comes back.
  useEffect(() => watchNotificationPermission(setPermission), []);

  const TEST_DELAY_S = 10;
  const sendTest = async () => {
    let current = permission;
    if (current !== 'granted') {
      current = await requestNotificationPermission();
      setPermission(current);
    }
    if (current !== 'granted') {
      toast.error('Notifications are not allowed for this site.');
      return;
    }
    setTesting(true);
    const via = await sendTestNotification(TEST_DELAY_S * 1000);
    toast.info(
      via === 'worker'
        ? `Lock your phone or switch apps now. A test notification arrives in ${TEST_DELAY_S} seconds.`
        : `A test notification arrives in ${TEST_DELAY_S} seconds. Keep this tab open (background alerts need the installed app).`,
    );
    window.setTimeout(() => setTesting(false), TEST_DELAY_S * 1000);
  };

  const vibrationSupported = isVibrationSupported();
  const wakeLockSupported = isWakeLockSupported();
  const notificationsUsable = permission !== 'unsupported' && permission !== 'denied';

  const revoked = settings.notifications && permission === 'default';
  const notificationDescription =
    permission === 'unsupported'
      ? 'Not supported by this browser. On iPhone, add the app to your Home Screen first.'
      : permission === 'denied'
        ? 'Blocked for this site. Allow notifications in your browser or phone settings to turn this on.'
        : revoked
          ? 'Permission was removed. Turn this on again to allow notifications.'
          : 'Alert you when rest ends while your phone is locked or you are in another app.';

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
          checked={permission === 'granted' && settings.notifications}
          disabled={!notificationsUsable}
          onChange={(on) => void toggleNotifications(on)}
        />
      </div>
      {notificationsUsable ? (
        <div className="mt-3 border-t border-iron-100 pt-3 dark:border-iron-800">
          <Button variant="secondary" size="sm" onClick={() => void sendTest()} disabled={testing}>
            <BellRing className="h-4 w-4" />
            {testing ? 'Test on its way…' : `Send test notification (${TEST_DELAY_S}s)`}
          </Button>
          <p className="mt-2 text-xs text-iron-500 dark:text-iron-400">
            Most reliable on Android Chrome with the app installed, for rests up to about 5 minutes.
            Battery saver or &quot;Do not disturb&quot; can still hold notifications back.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
