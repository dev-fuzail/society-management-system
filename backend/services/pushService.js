import fs from "fs";
import path from "path";
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
      const resolvedPath = path.isAbsolute(pathEnv)
        ? pathEnv
        : path.resolve(process.cwd(), pathEnv);
      const raw = fs.readFileSync(resolvedPath, "utf-8");
      return JSON.parse(raw);
    } catch (error) {
      console.warn("[FCM] Unable to read FIREBASE_SERVICE_ACCOUNT_PATH.");
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
    console.warn("[FCM] Service account not configured. Push disabled.");
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  messaging = admin.messaging();
};

initFcm();

export const sendFcmToTokens = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  if (!messaging) {
    return { sent: 0, failed: tokens.length };
  }

  const response = await messaging.sendEachForMulticast({
    tokens,
    ...payload,
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
    responses: response.responses,
  };
};
