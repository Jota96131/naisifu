"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>ログイン</h1>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: 10,
          padding: 8,
        }}
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: 10,
          padding: 8,
        }}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleLogin} style={{ padding: "8px 16px" }}>
        ログインする
      </button>
    </div>
  );
}
