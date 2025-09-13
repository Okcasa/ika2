import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  "projectId": "leadsorter-pro1-46280925-2c851",
  "appId": "1:22192977296:web:e73df8cbefdf28b2cd2f15",
  "storageBucket": "leadsorter-pro1-46280925-2c851.firebasestorage.app",
  "apiKey": "AIzaSyCFVI4LbaajpV_UxxiyETqLkmKcQ9Gn75Q",
  "authDomain": "leadsorter-pro1-46280925-2c851.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "22192977296"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
