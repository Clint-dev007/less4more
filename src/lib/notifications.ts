import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "";

async function registerPush(userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY || undefined,
    });

    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth_key: json.keys?.auth ?? "",
    });
  } catch (e) {
    console.warn("Push registration failed:", e);
  }
}

export async function initPushNotifications(userId: string) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    // Will ask on first interaction
  } else if (Notification.permission === "granted") {
    await registerPush(userId);
  }
}

export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  if (result === "granted") {
    await registerPush(userId);
    return true;
  }
  return false;
}

export function showLocalNotification(title: string, body: string, icon?: string) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: icon || "/favicon.ico", badge: "/favicon.ico" });
  }
}
