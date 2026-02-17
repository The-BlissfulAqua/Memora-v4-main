// localNotifications.ts
// Best-effort wrapper that uses Capacitor Local Notifications on native
// and falls back to Web Notification API on the web.

export const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();

type NotifyPermission = 'granted' | 'denied' | 'prompt' | 'default';
type NotificationActionHandler = { remove: () => Promise<void> } | { remove: () => void } | null;

let nativeActionListener: NotificationActionHandler = null;
let nativeListenerInitialized = false;
let nativeChannelInitialized = false;

const ensureNativeActionListener = async (LocalNotifications: any) => {
  if (nativeListenerInitialized || !LocalNotifications?.addListener) return;
  nativeActionListener = await LocalNotifications.addListener('localNotificationActionPerformed', (event: any) => {
    try {
      const actionId = event.actionId;
      const data = event.notification?.extra || event.notification?.data || {};
      if ((window as any).__ON_NOTIFICATION_ACTION) {
        (window as any).__ON_NOTIFICATION_ACTION({ actionId, data });
      }
    } catch (e) {
      console.warn('Error handling local notification action', e);
    }
  });
  nativeListenerInitialized = true;
};

const ensureNativeChannel = async (LocalNotifications: any) => {
  if (nativeChannelInitialized || !LocalNotifications?.createChannel) return;
  try {
    await LocalNotifications.createChannel({
      id: 'memora-reminders',
      name: 'Memora Reminders',
      description: 'Reminder notifications for Memora',
      importance: 5,
      visibility: 1,
      sound: 'reminder_notification',
      vibration: true,
      lights: true,
    } as any);
  } catch (e) {
    console.warn('Failed to create native notification channel', e);
  } finally {
    nativeChannelInitialized = true;
  }
};

const requestPermission = async (): Promise<NotifyPermission> => {
  if (isNative) {
    try {
      // dynamic import to avoid bundler issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: any = await import('@capacitor/local-notifications');
  const LocalNotifications = mod.LocalNotifications || mod;
      // Some native platforms require a runtime request
      if (LocalNotifications && typeof LocalNotifications.requestPermission === 'function') {
        const granted = await LocalNotifications.requestPermission();
        // Plugin may return { value: true } or boolean
        if (typeof granted === 'object' && 'value' in granted) {
          return granted.value ? 'granted' : 'denied';
        }
        return granted ? 'granted' : 'denied';
      }
    } catch (e) {
      console.warn('Capacitor LocalNotifications requestPermission failed', e);
    }
  }

  // Web fallback
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    const p = await Notification.requestPermission();
    return (p || 'default') as NotifyPermission;
  }

  return 'denied';
};

const schedule = async (opts: { id?: number; title: string; body?: string; scheduleAt?: Date; extra?: any }) => {
  if (isNative) {
    try {
      const mod: any = await import('@capacitor/local-notifications');
      const LocalNotifications = mod.LocalNotifications || mod;
      await ensureNativeActionListener(LocalNotifications);
      await ensureNativeChannel(LocalNotifications);
      const scheduleAt = opts.scheduleAt || new Date();
      // Use action buttons when running natively so users can Complete/Snooze/Dismiss
      const notifications: any[] = [
        {
          id: opts.id || Date.now(),
          title: opts.title,
          body: opts.body || '',
          schedule: { at: scheduleAt },
          // Use extra data to carry reminder info so action handler can map actions
          extra: opts.extra || { reminderId: opts.id || Date.now() },
          android: {
            // Persist notification for 10 seconds (10000 ms)
            timeoutAfter: 10000,
            channelId: 'memora-reminders',
          },
        },
      ];

      // Try registering actions (Android supports actions; iOS support may differ)
      try {
  await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'REMINDER_ACTIONS',
              actions: [
                { id: 'COMPLETE', title: 'Complete' },
                { id: 'SNOOZE', title: 'Snooze 5m' },
                { id: 'DISMISS', title: 'Dismiss' },
              ],
            },
          ],
        } as any);
        // Attach the action type id to our notification
        notifications[0].actionTypeId = 'REMINDER_ACTIONS';
      } catch (e) {
        console.warn('Failed to register native notification actions', e);
      }

      await LocalNotifications.schedule({ notifications } as any);
      return true;
    } catch (e) {
      console.warn('LocalNotifications.schedule failed', e);
    }
  }

  // Web fallback: immediate notification if permission granted
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n: any = new Notification(opts.title, { body: opts.body });
      // Return the notification instance so callers can manage it (close it when audio ends)
      return n;
    }
  } catch (e) {
    console.warn('Web Notification schedule failed', e);
  }

  return false;
};

const teardown = async () => {
  try {
    if (nativeActionListener && typeof nativeActionListener.remove === 'function') {
      await nativeActionListener.remove();
    }
  } catch (e) {
    console.warn('Failed to tear down native notification listener', e);
  } finally {
    nativeActionListener = null;
    nativeListenerInitialized = false;
    nativeChannelInitialized = false;
  }
};

export default { requestPermission, schedule, teardown };
