import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

let messaging = null;

const loadServiceAccount = () => {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv);
    } catch (error) {
      console.warn("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON.");
      return null;
    }
  }

  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (pathEnv) {
    try {
      const triedPaths = [];
      if (path.isAbsolute(pathEnv)) {
        triedPaths.push(pathEnv);
      } else {
        triedPaths.push(path.resolve(process.cwd(), pathEnv));
      }
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      triedPaths.push(path.resolve(__dirname, pathEnv));

      let raw = null;
      for (const p of triedPaths) {
        try {
          raw = fs.readFileSync(p, "utf-8");
          break;
        } catch (_) {}
      }

      if (!raw) {
        console.warn("[FCM] Unable to read FIREBASE_SERVICE_ACCOUNT_PATH. Tried:", triedPaths);
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.warn("[FCM] Error parsing service account JSON.", error.message);
      return null;
    }
  }

  return null;
};

const initFcm = () => {
  if (admin.apps.length > 0) {
    messaging = admin.messaging();
    return;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn("[FCM] Service account not configured. FCM push disabled (Expo push still works).");
    return;
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  messaging = admin.messaging();
};

initFcm();

// Expo push tokens look like ExponentPushToken[xxx] or ExpoPushToken[xxx]
const isExpoPushToken = (token) =>
  typeof token === "string" &&
  (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));

const sendViaExpoPushApi = async (tokens, { notification, data }) => {
  if (!tokens.length) return { sent: 0, failed: 0 };

  // Expo Push API accepts up to 100 messages per request
  const CHUNK = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK).map((to) => ({
      to,
      title: notification?.title,
      body: notification?.body,
      data: data || {},
      sound: "default",
      priority: "high",
      channelId: "default",
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      const items = Array.isArray(result.data) ? result.data : [];
      sent += items.filter((r) => r.status === "ok").length;
      failed += items.filter((r) => r.status !== "ok").length;

      const errors = items.filter((r) => r.status !== "ok");
      if (errors.length) {
        console.warn("[EXPO PUSH] Some messages failed:", JSON.stringify(errors));
      }
    } catch (err) {
      console.error("[EXPO PUSH] Request error:", err.message);
      failed += chunk.length;
    }
  }

  return { sent, failed };
};

export const sendFcmToTokens = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0 };

  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));

  let sent = 0;
  let failed = 0;

  // Route Expo push tokens through Expo's Push API
  if (expoTokens.length > 0) {
    const result = await sendViaExpoPushApi(expoTokens, payload);
    sent += result.sent;
    failed += result.failed;
  }

  // Route raw FCM tokens through Firebase Admin SDK
  if (fcmTokens.length > 0) {
    if (!messaging) {
      console.warn("[FCM] Messaging not initialized — skipping raw FCM tokens.");
      failed += fcmTokens.length;
    } else {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: fcmTokens,
          ...payload,
          android: {
            priority: "high",
            notification: { channelId: "default", sound: "default" },
          },
        });
        sent += response.successCount;
        failed += response.failureCount;
      } catch (err) {
        console.error("[FCM] sendEachForMulticast error:", err.message);
        failed += fcmTokens.length;
      }
    }
  }

  return { sent, failed };
};
