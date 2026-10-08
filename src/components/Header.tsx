"use client";
export default function Header({ title }: { title: string }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <div className="topbar">
      <img src="/logo.jpg" alt="logo" />
      <h1>Hi-Fi Delivery Service<small>{title}</small></h1>
      <button className="btn sm" onClick={logout}>Logout</button>
    </div>
  );
}
