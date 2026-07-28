import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTION = "painel-eletricista";

export async function storageGet(key) {
  try {
    const ref = doc(db, COLLECTION, key);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.error("Erro ao ler do Firestore:", e);
    return null;
  }
}

export async function storageSet(key, value) {
  try {
    const ref = doc(db, COLLECTION, key);
    await setDoc(ref, { value, atualizadoEm: Date.now() });
    return true;
  } catch (e) {
    console.error("Erro ao salvar no Firestore:", e);
    return false;
  }
}
