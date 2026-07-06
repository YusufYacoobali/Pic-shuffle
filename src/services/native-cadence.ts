import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";
import { Linking, Platform } from "react-native";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_DAY_SECONDS = 24 * 60 * 60;
const REVIEW_KEY = "picshuffle.lastReviewPrompt";
const REVIEW_ASK_KEY = "picshuffle.lastReviewAsk";
const NOTIFICATION_KEY = "picshuffle.notificationsScheduled";
const DAILY_REMINDER_VERSION = "daily-v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function scheduleDailyReminder() {
  const saved = await SecureStore.getItemAsync(NOTIFICATION_KEY);
  if (saved === DAILY_REMINDER_VERSION) return true;

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
      seconds: ONE_DAY_SECONDS,
      repeats: true,
      channelId: "play-reminders"
    } as any
  });

  await SecureStore.setItemAsync(NOTIFICATION_KEY, DAILY_REMINDER_VERSION);
  return true;
}

export const scheduleEveryOtherDayReminder = scheduleDailyReminder;

export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await SecureStore.setItemAsync(NOTIFICATION_KEY, "false");
}

export async function shouldShowReviewPrompt(clearedLevels: number) {
  if (clearedLevels < 2) return false;

  const last = Number(await SecureStore.getItemAsync(REVIEW_ASK_KEY));
  const now = Date.now();
  return !(Number.isFinite(last) && now - last < TWO_DAYS_MS);
}

export async function markReviewPromptShown() {
  await SecureStore.setItemAsync(REVIEW_ASK_KEY, String(Date.now()));
}

export function getStoreListingUrl() {
  const configured = StoreReview.storeUrl();
  if (configured) return configured;
  if (Platform.OS === "android") {
    return "https://play.google.com/store/apps/details?id=com.yacoobali.puzzle";
  }
  return null;
}

export async function openStoreListing() {
  const url = getStoreListingUrl();
  if (!url) return false;

  const supported = await Linking.canOpenURL(url);
  if (!supported) return false;
  await Linking.openURL(url);
  return true;
}

export async function requestReviewOrOpenStoreSafely() {
  const last = Number(await SecureStore.getItemAsync(REVIEW_KEY));
  const now = Date.now();
  if (Number.isFinite(last) && now - last < TWO_DAYS_MS) return false;

  await SecureStore.setItemAsync(REVIEW_KEY, String(now));

  // Expo Go/dev builds can behave badly when a native review prompt is fired.
  // Keep native calls to production, user-initiated taps only.
  if (!__DEV__ && (await StoreReview.hasAction())) {
    await StoreReview.requestReview();
    return true;
  }

  return openStoreListing();
}
