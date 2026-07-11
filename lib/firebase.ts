import { getApp, getApps, initializeApp } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"
import { getMessaging, getToken, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyCAPpn8FtljdMXf3GP5g8APvmfEXamG3f4",
  authDomain: "elo-web-12.firebaseapp.com",
  projectId: "elo-web-12",
  storageBucket: "elo-web-12.appspot.com",
  messagingSenderId: "144156166921",
  appId: "1:144156166921:web:0bbfdb70d9974a66c0e1d8",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }

export async function saveUser(user: any) {
  if (!user) return
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email ?? "",
      online: true,
      lastSeen: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function createPost(user: any, text: string, imageUrl?: string | null) {
  if (!user) throw new Error("Giriş yapmalısın.")
  return addDoc(collection(db, "posts"), {
    text,
    imageUrl: imageUrl ?? null,
    user: { uid: user.uid, email: user.email ?? "" },
    likes: [],
    comments: [],
    createdAt: Date.now(),
  })
}

export async function toggleLike(post: any, user: any) {
  if (!user) return
  const liked = post.likes?.includes(user.uid)
  await updateDoc(doc(db, "posts", post.id), {
    likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
  })
  if (!liked && post.user?.uid !== user.uid) {
    await createNotification(post.user.uid, user, "like", post.id)
  }
}

export async function addComment(post: any, user: any, text: string) {
  if (!user || !text.trim()) return
  await updateDoc(doc(db, "posts", post.id), {
    comments: arrayUnion({
      uid: user.uid,
      email: user.email ?? "",
      text: text.trim(),
      createdAt: Date.now(),
    }),
  })
  if (post.user?.uid !== user.uid) {
    await createNotification(post.user.uid, user, "comment", post.id, text.trim())
  }
}

export async function uploadImage(file: File, path: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const fileRef = ref(storage, \`${path}/${Date.now()}-${safeName}\`)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

export const getChatId = (uid1: string, uid2: string) =>
  [uid1, uid2].sort().join("_")

export async function sendMessage(chatId: string, text: string, from: string, to: string) {
  const cleanText = text.trim()
  if (!cleanText) return

  await addDoc(collection(db, "chats", chatId, "messages"), {
    text: cleanText,
    from,
    to,
    createdAt: serverTimestamp(),
  })

  // İlk mesajda sohbet belgesi henüz yoktur; setDoc bunu güvenle oluşturur.
  await setDoc(
    doc(db, "chats", chatId),
    { lastMessage: cleanText, updatedAt: serverTimestamp() },
    { merge: true },
  )

  await createNotification(to, { uid: from, email: "" }, "message", chatId, cleanText)
}

export async function createNotification(
  toUid: string,
  fromUser: any,
  type: "like" | "comment" | "message",
  postId?: string,
  text?: string,
) {
  await addDoc(collection(db, "notifications"), {
    toUid,
    fromUid: fromUser.uid,
    fromEmail: fromUser.email ?? "Bir kullanıcı",
    type,
    postId: postId ?? null,
    text: text ?? null,
    createdAt: serverTimestamp(),
    seen: false,
  })
}

export const notificationsQuery = (uid: string) =>
  query(collection(db, "notifications"), where("toUid", "==", uid), orderBy("createdAt", "desc"))

export async function saveFcmToken(uid: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted" || !(await isSupported())) return

  const token = await getToken(getMessaging(app), {
    vapidKey: "XwH8iaWb_hQqrGRfG9xeDgG4MI5Gr0EnSKsSdwmZbS4",
  })
  if (!token) return

  await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true })
}

export const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"))
export const usersQuery = query(collection(db, "users"))
export const chatMessagesQuery = (chatId: string) =>
  query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"))
