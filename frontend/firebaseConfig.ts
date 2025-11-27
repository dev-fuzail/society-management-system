import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB62ZGgePSAOf-IVVOkPYdsUDuB29RAJWo",
  authDomain: "livingsyncchat.firebaseapp.com",
  projectId: "livingsyncchat",
  storageBucket: "livingsyncchat.firebasestorage.app",
  messagingSenderId: "108456172421",
  appId: "1:108456172421:web:07a2fd62b303c656e942ec",
  measurementId: "G-V5GYNXB3EM"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
// const analytics = getAnalytics(app);