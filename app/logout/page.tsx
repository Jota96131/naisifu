"use client";

import { supabase } from "@/lib/supabase";

export default function Home() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>ナイシフ</h1>
      <button onClick={handleLogout} style={{ padding: "8px 16px" }}>
        ログアウト
      </button>
    </div>
  );
}
