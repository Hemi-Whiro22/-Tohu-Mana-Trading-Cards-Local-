import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Local development fallback configuration to prevent compilation and load crashes.
const firebaseConfig = {
  apiKey: "local-dev-placeholder",
  authDomain: "tohu-mana-trading.firebaseapp.com",
  projectId: "tohu-mana-trading",
  storageBucket: "tohu-mana-trading.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:localdev"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
