"use client"

import { useEffect, useState } from "react"

import {
  auth,
  saveUser,
  createPost,
  uploadImage,
  toggleLike,
  addComment,
  sendMessage,
  postsQuery,
  usersQuery,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "@/lib/firebase"

import { onAuthStateChanged } from "firebase/auth"
import { onSnapshot } from "firebase/firestore"

export default function Page() {

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState("home")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [posts, setPosts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [text, setText] = useState("")
  const [file, setFile] = useState<any>(null)

  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) saveUser(u)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(postsQuery, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(usersQuery, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async () => {
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const sharePost = async () => {
    let imageUrl = null

    if (file) {
      try {
        imageUrl = await uploadImage(file, `posts/${user.uid}`)
      } catch {
        imageUrl = null
      }
    }

    await createPost(user, text, imageUrl)

    setText("")
    setFile(null)
  }

  const send = async () => {
    if (!selectedUser) return

    await sendMessage(
      user.uid + "_" + selectedUser.uid,
      message,
      user.uid,
      selectedUser.uid
    )

    setMessage("")
  }

  if (loading) {
    return <div className="p-10 text-center">Yükleniyor...</div>
  }

  // ================= LOGIN =================
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">

        <div className="w-80 text-center">

          {/* LOGO */}
          <div className="text-5xl font-bold mb-8 tracking-widest text-pink-500">
            E L O
          </div>

          {/* EMAIL */}
          <input
            className="w-full p-3 mb-3 rounded bg-white text-black placeholder-gray-500 border focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Kullanıcı adı / E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD */}
          <input
            className="w-full p-3 mb-4 rounded bg-white text-black placeholder-gray-500 border focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Şifre"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={login}
            className="w-full bg-blue-500 hover:bg-blue-600 p-3 rounded mb-2 font-bold"
          >
            GİRİŞ YAP
          </button>

          <button
            onClick={register}
            className="w-full bg-gray-700 hover:bg-gray-800 p-3 rounded font-bold"
          >
            KAYDOL
          </button>

        </div>

      </div>
    )
  }

  // ================= APP =================
  return (
    <div className="min-h-screen bg-gray-100 pb-20">

      {/* TOP BAR */}
      <div className="bg-white p-3 flex justify-between shadow">
        <div className="font-bold text-xl">ELO</div>

        <button onClick={() => signOut(auth)} className="text-red-500">
          Çıkış
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-3">

        {/* HOME */}
        {tab === "home" && (
          <>
            {/* STORY */}
            <div className="flex gap-3 overflow-x-auto p-2 bg-white rounded mb-3">

              {users.slice(0, 10).map((u) => (
                <div key={u.id} className="flex flex-col items-center text-xs">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center text-white">
                    {u.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="w-14 truncate text-center">
                    {u.email}
                  </span>
                </div>
              ))}

            </div>

            {/* POST BOX */}
            <div className="bg-white p-3 rounded mb-3">

              <textarea
                className="w-full border p-2"
                placeholder="Ne düşünüyorsun?"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <button
                onClick={sharePost}
                className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
              >
                Paylaş
              </button>

            </div>

            {/* POSTS */}
            {posts.map((p) => (
              <div key={p.id} className="bg-white p-4 mb-3 rounded">

                <div className="font-bold text-sm">
                  {p.user?.email}
                </div>

                <p className="my-2">{p.text}</p>

                {p.imageUrl && (
                  <img src={p.imageUrl} className="rounded mb-2" />
                )}

                <div className="text-sm text-gray-600">
                  ❤️ {p.likes?.length || 0}
                </div>

              </div>
            ))}
          </>
        )}

        {/* MESSAGES */}
        {tab === "messages" && (
          <div>

            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="bg-white p-2 mb-2 cursor-pointer"
              >
                {u.email}
              </div>
            ))}

            {selectedUser && (
              <div className="mt-3">

                <input
                  className="w-full border p-2"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />

                <button
                  onClick={send}
                  className="bg-green-500 text-white w-full mt-2 p-2"
                >
                  Gönder
                </button>

              </div>
            )}

          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="bg-white p-4 rounded">
            Bildirimler (şimdilik boş)
          </div>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="bg-white p-4 rounded">

            <h2 className="font-bold mb-2">Profil</h2>
            <p>{user.email}</p>

            <div className="mt-3 text-sm text-gray-500">
              Post sayısı: {posts.filter(p => p.user?.uid === user.uid).length}
            </div>

          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 text-xl">

        <button onClick={() => setTab("home")}>🏠</button>
        <button onClick={() => setTab("messages")}>💬</button>
        <button onClick={() => setTab("notifications")}>🔔</button>
        <button onClick={() => setTab("profile")}>👤</button>

      </div>

    </div>
  )
}