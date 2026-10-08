"use client";
import { useState } from "react";

export default function Login() {
  const [username, setU] = useState(""), [password, setP] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const j = await res.json();
    if (!res.ok) { setErr(j.error || "Login failed"); setBusy(false); return; }
    window.location.href = j.role === "admin" ? "/admin" : "/rider";
  }
  return (
    <div className="login">
      <form className="box" onSubmit={submit}>
        <img src="/logo.jpg" alt="Hi-Fi Delivery" />
        <h1>Hi-Fi Delivery Service</h1>
        <div className="f"><label>Username</label><input value={username} onChange={(e) => setU(e.target.value)} autoCapitalize="none" autoFocus /></div>
        <div className="f"><label>Password</label><input type="password" value={password} onChange={(e) => setP(e.target.value)} /></div>
        {err && <div className="msg err">{err}</div>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>{busy ? "Signing in..." : "Login"}</button>
      </form>
    </div>
  );
}
