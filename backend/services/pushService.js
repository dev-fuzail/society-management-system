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

      // Try absolute or relative to current working directory first
      if (path.isAbsolute(pathEnv)) {
        triedPaths.push(pathEnv);
      } else {
        triedPaths.push(path.resolve(process.cwd(), pathEnv));
      }

      // Also try resolving relative to this module file (safer when launched from repo root)
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      triedPaths.push(path.resolve(__dirname, pathEnv));

      let raw = null;
      for (const p of triedPaths) {
        try {
          raw = fs.readFileSync(p, "utf-8");
          // if read succeeds, stop trying
          break;
        } catch (err) {
          // ignore and try next
        }
      }

      if (!raw) {
        console.warn("[FCM] Unable to read FIREBASE_SERVICE_ACCOUNT_PATH. Tried:", triedPaths);
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.warn("[FCM] Error parsing service account JSON from FIREBASE_SERVICE_ACCOUNT_PATH.", error.message);
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
