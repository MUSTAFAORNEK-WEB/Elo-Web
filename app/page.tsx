"use client"

import { useEffect, useState } from "react"

import {
  auth,
  saveUser,
  createPost,
  uploadImage,
  toggleLike,
  addComment,
  postsQuery,
  usersQuery,
  chatMessagesQuery,
  sendMessage,
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

  const [commentText, setCommentText] = useState("")
  const [openCommentPost, setOpenCommentPost] = useState<any>(null)

  const [openChatUser, setOpenChatUser] = useState<any>(null)

  // AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) saveUser(u)
    })
    return () => unsub()
  }, [])

  // POSTS
  useEffect(() => {
    const unsub = onSnapshot(postsQuery, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  // USERS
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

  if (loading) {
    return <div className="p-10 text-center">Yükleniyor...</div>
  }

  // LOGIN
if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4">

      <LoginBox
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        login={login}
        register={register}
      />

    </div>
  )
}


  return (
    <div className="min-h-screen bg-gray-100 pb-20">

      {/* TOP BAR */}
      <div className="bg-white p-3 flex justify-between shadow">
        <div className="font-bold">ELO WEB</div>

        <button onClick={() => signOut(auth)} className="text-red-500">
          Çıkış
        </button>
      </div>

      <div className="p-3">

        {/* HOME */}
        {tab === "home" && (
          <>
            <div className="bg-white p-3 rounded mb-3">

              <textarea
                className="w-full border p-2"
                placeholder="Ne düşünüyorsun?"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0])}
              />

              <button
                onClick={sharePost}
                className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
              >
                Paylaş
              </button>

            </div>

            {posts.map((p) => (
              <div key={p.id} className="bg-white p-4 mb-3 rounded">

                <div className="font-bold text-sm">
                  {p.user?.email}
                </div>

                <p className="my-2">{p.text}</p>

                {p.imageUrl && (
                  <img src={p.imageUrl} className="rounded mb-2" />
                )}

                <div className="flex gap-4 text-sm">

                  <button onClick={() => toggleLike(p, user)}>
                    ❤️ {p.likes?.length || 0}
                  </button>

                  <button onClick={() => setOpenCommentPost(p)}>
                    💬 {p.comments?.length || 0}
                  </button>

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
                onClick={() => setOpenChatUser(u)}
                className="bg-white p-2 mb-2 cursor-pointer"
              >
                {u.email}
              </div>
            ))}
          </div>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="bg-white p-4 rounded">
            <h2 className="font-bold">Profil</h2>
            <p>{user.email}</p>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="bg-white p-4 rounded">
            Bildirimler
          </div>
        )}

      </div>

      {/* COMMENT MODAL */}
      {openCommentPost && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-3 border-t">

          <input
            className="w-full border p-2"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Yorum yaz..."
          />

          <button
            className="w-full bg-green-500 text-white p-2 mt-2"
            onClick={async () => {
              await addComment(openCommentPost, user, commentText)
              setCommentText("")
              setOpenCommentPost(null)
            }}
          >
            Gönder
          </button>

        </div>
      )}

      {/* CHAT MODAL */}
      {openChatUser && (
        <ChatBox
          currentUser={user}
          targetUser={openChatUser}
          onClose={() => setOpenChatUser(null)}
        />
      )}

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

/* CHAT COMPONENT */
function ChatBox({ currentUser, targetUser, onClose }: any) {

  const [msg, setMsg] = useState("")
  const [messages, setMessages] = useState<any[]>([])

  const chatId = [currentUser.uid, targetUser.uid].sort().join("_")

  useEffect(() => {
    const unsub = onSnapshot(chatMessagesQuery(chatId), (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const send = async () => {
    if (!msg) return

    await sendMessage(chatId, msg, currentUser.uid, targetUser.uid)

    setMsg("")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end">

      <div className="bg-white w-full h-[70%] p-3 rounded-t-2xl">

        <div className="flex justify-between mb-2">
          <b>{targetUser.email}</b>
          <button onClick={onClose}>❌</button>
        </div>

        <div className="h-[70%] overflow-y-auto border p-2 mb-2">

          {messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 ${m.from === currentUser.uid ? "text-right" : "text-left"}`}
            >
              <div className="inline-block bg-gray-200 px-3 py-2 rounded">
                {m.text}
              </div>
            </div>
          ))}

        </div>

        <div className="flex gap-2">

          <input
            className="flex-1 border p-2"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Mesaj..."
          />

          <button onClick={send} className="bg-green-500 text-white px-4">
            Gönder
          </button>

        </div>

      </div>
    </div>
  )
}

/* LOGIN COMPONENT */
function LoginBox({
  email,
  setEmail,
  password,
  setPassword,
  login,
  register
}: any) {

  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError("")
      await login()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    try {
      setLoading(true)
      setError("")
      await register()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">

      {/* LOGO */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-widest text-pink-500">
          ELO
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Sosyal dünyana hoş geldin
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 text-xs p-2 rounded mb-3">
          {error}
        </div>
      )}

      {/* EMAIL */}
      <input
        className="w-full p-3 mb-3 rounded-lg bg-black/40 border border-gray-700 text-white focus:outline-none focus:border-pink-500"
        placeholder="E-posta"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* PASSWORD */}
      <div className="relative mb-4">

        <input
          className="w-full p-3 rounded-lg bg-black/40 border border-gray-700 text-white focus:outline-none focus:border-pink-500"
          type={showPass ? "text" : "password"}
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="absolute right-3 top-3 text-xs text-gray-400"
        >
          {showPass ? "Gizle" : "Göster"}
        </button>

      </div>

      {/* LOGIN */}
      <button
        disabled={loading}
        onClick={handleLogin}
        className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 transition text-white font-bold py-3 rounded-lg mb-3"
      >
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>

      {/* REGISTER */}
      <button
        disabled={loading}
        onClick={handleRegister}
        className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition text-white font-bold py-3 rounded-lg border border-white/20"
      >
        Hesap Oluştur
      </button>

      {/* FOOTER */}
      <p className="text-center text-xs text-gray-500 mt-5">
        Elo Web • Pro Max UI
      </p>

    </div>
  )
}

