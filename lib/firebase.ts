import { initializeApp, getApps, getApp } from "firebase/app"

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth"

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  onSnapshot,
  where
} from "firebase/firestore"

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage"

/////////////////////////////////////////////////////
// 🔥 FIREBASE CONFIG (DOĞRU FORMAT)
/////////////////////////////////////////////////////

const firebaseConfig = {
  apiKey: "AIzaSyCAPpn8FtljdMXf3GP5g8APvmfEXamG3f4",
  authDomain: "elo-web-12.firebaseapp.com",
  projectId: "elo-web-12",
  storageBucket: "elo-web-12.appspot.com",
  messagingSenderId: "144156166921",
  appId: "1:144156166921:web:0bbfdb70d9974a66c0e1d8",
  measurementId: "G-3SDL98VW1F"
}

/////////////////////////////////////////////////////
// INIT APP
/////////////////////////////////////////////////////

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

/////////////////////////////////////////////////////
// AUTH EXPORTS
/////////////////////////////////////////////////////

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
}

/////////////////////////////////////////////////////
// USERS
/////////////////////////////////////////////////////

export const saveUser = async (user: any) => {
  if (!user) return

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email,
      online: true,
      lastSeen: Date.now()
    },
    { merge: true }
  )
}

/////////////////////////////////////////////////////
// POSTS
/////////////////////////////////////////////////////

export const createPost = async (
  user: any,
  text: string,
  imageUrl?: string | null
) => {
  return await addDoc(collection(db, "posts"), {
    text,
    imageUrl: imageUrl || null,
    user: {
      uid: user.uid,
      email: user.email
    },
    likes: [],
    comments: [],
    createdAt: Date.now()
  })
}

export const toggleLike = async (post: any, user: any) => {
  const refPost = doc(db, "posts", post.id)

  const liked = post.likes?.includes(user.uid)

  await updateDoc(refPost, {
    likes: liked
      ? arrayRemove(user.uid)
      : arrayUnion(user.uid)
  })
}

export const addComment = async (
  post: any,
  user: any,
  text: string
) => {
  const refPost = doc(db, "posts", post.id)

  await updateDoc(refPost, {
    comments: arrayUnion({
      uid: user.uid,
      email: user.email,
      text,
      createdAt: Date.now()
    })
  })
}

/////////////////////////////////////////////////////
// STORAGE
/////////////////////////////////////////////////////

export const uploadImage = async (file: File, path: string) => {
  const fileRef = ref(storage, path)

  await uploadBytes(fileRef, file)

  return await getDownloadURL(fileRef)
}

/////////////////////////////////////////////////////
// CHAT SYSTEM
/////////////////////////////////////////////////////

export const getChatId = (uids: string[]) =>
  [...uids].sort().join("_")

export const createOrGetChat = async (members: string[]) => {
  const chatId = getChatId(members)

  await setDoc(
    doc(db, "chats", chatId),
    {
      id: chatId,
      members,
      lastMessage: "",
      updatedAt: Date.now()
    },
    { merge: true }
  )

  return chatId
}

export const sendMessage = async (
  chatId: string,
  text: string,
  from: string,
  to: string
) => {
  await addDoc(
    collection(db, "chats", chatId, "messages"),
    {
      text,
      from,
      to,
      status: "sent",
      createdAt: Date.now()
    }
  )

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    updatedAt: Date.now()
  })
}

/////////////////////////////////////////////////////
// QUERIES
/////////////////////////////////////////////////////

export const postsQuery = query(
  collection(db, "posts"),
  orderBy("createdAt", "desc")
)

export const usersQuery = query(
  collection(db, "users")
)

export const chatMessagesQuery = (chatId: string) =>
  query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  )