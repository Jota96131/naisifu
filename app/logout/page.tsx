"use client";

import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
        <p className="mt-2 text-sm text-gray-500">またのご利用をお待ちしています</p>
      </div>

      <div className="w-full max-w-sm border border-gray-200 rounded-3xl p-6 bg-white">
        <h2 className="text-center text-lg font-bold text-gray-800 mb-6">
          ログアウト
        </h2>
        <button
          onClick={handleLogout}
          className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-sky-500 hover:opacity-90 rounded-2xl transition"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
