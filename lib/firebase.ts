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
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore"

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage"

import { getMessaging, getToken } from "firebase/messaging"

/////////////////////////////////////////////////////
// FIREBASE CONFIG
/////////////////////////////////////////////////////

const firebaseConfig = {
  apiKey: "AIzaSyCAPpn8FtljdMXf3GP5g8APvmfEXamG3f4",
  authDomain: "elo-web-12.firebaseapp.com",
  projectId: "elo-web-12",
  storageBucket: "elo-web-12.appspot.com",
  messagingSenderId: "144156166921",
  appId: "1:144156166921:web:0bbfdb70d9974a66c0e1d8"
}

/////////////////////////////////////////////////////
// INIT
/////////////////////////////////////////////////////

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null

/////////////////////////////////////////////////////
// AUTH
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
      lastSeen: serverTimestamp()
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

/////////////////////////////////////////////////////
// LIKE SYSTEM
/////////////////////////////////////////////////////

export const toggleLike = async (post: any, user: any) => {
  const refPost = doc(db, "posts", post.id)

  const liked = post.likes?.includes(user.uid)

  await updateDoc(refPost, {
    likes: liked
      ? arrayRemove(user.uid)
      : arrayUnion(user.uid)
  })

  // notification
  if (!liked && post.user?.uid !== user.uid) {
    await createNotification(
      post.user.uid,
      user,
      "like",
      post.id
    )
  }
}

/////////////////////////////////////////////////////
// COMMENT SYSTEM
/////////////////////////////////////////////////////

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

  if (post.user?.uid !== user.uid) {
    await createNotification(
      post.user.uid,
      user,
      "comment",
      post.id,
      text
    )
  }
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

export const getChatId = (uid1: string, uid2: string) =>
  [uid1, uid2].sort().join("_")

export const sendMessage = async (
  chatId: string,
  text: string,
  from: string,
  to: string
) => {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    text,
    from,
    to,
    createdAt: serverTimestamp()
  })

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    updatedAt: serverTimestamp()
  })

  await createNotification(to, { uid: from }, "message", chatId, text)
}

/////////////////////////////////////////////////////
// NOTIFICATION SYSTEM
/////////////////////////////////////////////////////

export const createNotification = async (
  toUid: string,
  fromUser: any,
  type: "like" | "comment" | "message",
  postId?: string,
  text?: string
) => {
  await addDoc(collection(db, "notifications"), {
    toUid,
    fromUid: fromUser.uid,
    fromEmail: fromUser.email,
    type,
    postId: postId || null,
    text: text || null,
    createdAt: serverTimestamp(),
    seen: false
  })
}

export const notificationsQuery = (uid: string) =>
  query(
    collection(db, "notifications"),
    where("toUid", "==", uid),
    orderBy("createdAt", "desc")
  )

/////////////////////////////////////////////////////
// PUSH NOTIFICATION (FCM TOKEN)
/////////////////////////////////////////////////////

export const saveFcmToken = async (uid: string) => {
  if (!messaging) return

  const token = await getToken(messaging, {
    vapidKey: "XwH8iaWb_hQqrGRfG9xeDgG4MI5Gr0EnSKsSdwmZbS4"
  })

  if (!token) return

  await setDoc(
    doc(db, "users", uid),
    {
      fcmToken: token
    },
    { merge: true }
  )
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