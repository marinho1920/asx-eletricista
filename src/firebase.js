import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDv_gG0zZjSv67ln4ptTzmFetx5dm1lds8",
  authDomain: "asx-eletricista.firebaseapp.com",
  projectId: "asx-eletricista",
  storageBucket: "asx-eletricista.firebasestorage.app",
  messagingSenderId: "198949142258",
  appId: "1:198949142258:web:879b0a78bd4b6cf2d41a6b",
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

import { collection, addDoc, updateDoc, query, where, onSnapshot } from "firebase/firestore";

export function ouvirPedidosPendentes(callback) {
  const q = query(collection(db, "pedidos-clientes"), where("status", "==", "pendente"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (e) => {
    console.error("Erro ao ouvir pedidos:", e);
  });
}

export async function atualizarStatusPedido(id, status) {
  try {
    await updateDoc(doc(db, "pedidos-clientes", id), { status });
    return true;
  } catch (e) {
    console.error("Erro ao atualizar pedido:", e);
    return false;
  }
}

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, signInAnonymously } from "firebase/auth";

export const auth = getAuth(app);

export async function registrar(email, senha) {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

export async function entrar(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

export async function sair() {
  await signOut(auth);
}

export function ouvirAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function recuperarSenha(email) {
  await sendPasswordResetEmail(auth, email);
}
export async function entrarComoVisitante() {
    const cred = await signInAnonymously(auth);
      return cred.user;
}