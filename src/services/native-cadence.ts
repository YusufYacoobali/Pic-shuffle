import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const REVIEW_KEY = "picshuffle.lastReviewPrompt";
const NOTIFICATION_KEY = "picshuffle.notificationsScheduled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function scheduleEveryOtherDayReminder() {
  const saved = await SecureStore.getItemAsync(NOTIFICATION_KEY);
  if (saved === "true") return true;

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await Notifications.setNotificationChannelAsync("play-reminders", {
    name: "Play reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default"
  });

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Pic Shuffle is ready",
      body: "A new little picture fix is waiting for you.",
      sound: "default"
    },
    trigger: {
      seconds: 2 * 24 * 60 * 60,
      repeats: true,
      channelId: "play-reminders"
    } as any
  });

  await SecureStore.setItemAsync(NOTIFICATION_KEY, "true");
  return true;
}

export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await SecureStore.setItemAsync(NOTIFICATION_KEY, "false");
}

export async function maybeRequestNativeReview() {
  const available = await StoreReview.isAvailableAsync();
  if (!available) return false;

  const last = Number(await SecureStore.getItemAsync(REVIEW_KEY));
  const now = Date.now();
  if (Number.isFinite(last) && now - last < TWO_DAYS_MS) return false;

  await SecureStore.setItemAsync(REVIEW_KEY, String(now));
  await StoreReview.requestReview();
  return true;
}
