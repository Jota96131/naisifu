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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            ナイシフ
          </h1>
          <span className="text-2xl">🌙</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          シフト管理を、もっとカンタンに
        </p>
      </div>

      <div className="w-full max-w-sm border border-gray-200 rounded-3xl p-6 bg-white">
        <h2 className="text-center text-lg font-bold text-gray-800 mb-6">
          ログイン
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            メールアドレス
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            パスワード
          </label>
          <input
            type="password"
            placeholder="6文字以上"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition"
          />
        </div>

        {error && (
          <p className="mb-4 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-sky-500 hover:opacity-90 rounded-2xl transition"
        >
          ログイン
        </button>
      </div>
    </div>
  );
}
