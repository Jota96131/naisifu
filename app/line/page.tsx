"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

export default function LinePage() {
  const router = useRouter();
  const [storeCode, setStoreCode] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || ignore) return;

      const { data: staffData } = await supabase
        .from("staff")
        .select("store_id")
        .eq("email", user.email)
        .single();
      if (!staffData || ignore) return;

      const { data: storeData } = await supabase
        .from("stores")
        .select("store_code, name")
        .eq("id", staffData.store_id)
        .single();
      if (!storeData || ignore) return;

      setStoreCode(storeData.store_code);
      setStoreName(storeData.name);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const registerUrl = storeCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/liff/select?code=${storeCode}`
    : "";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/shifts")}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition"
            aria-label="戻る"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            LINE登録
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : !storeCode ? (
          <p className="text-gray-500 text-center py-8">
            店舗情報を取得できませんでした
          </p>
        ) : (
          <>
            <div className="border border-gray-200 rounded-3xl p-6 bg-white">
              <p className="text-sm text-gray-500 mb-1 text-center">
                {storeName}
              </p>
              <h2 className="text-base font-bold text-gray-800 mb-2 text-center">
                このQRコードを読み取ってください
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                女の子の登録ができます
              </p>

              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <QRCodeSVG
                    value={registerUrl}
                    size={220}
                    level="M"
                    marginSize={0}
                  />
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 break-all">
                店舗コード: {storeCode}
              </p>
            </div>

            <div className="mt-6 px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-bold">使い方</span>
                <br />
                1. このQRコードを女の子のスマホで読み取ってもらいます
                <br />
                2. 自分の名前を選んでもらいます
                <br />
                3. 公式LINEを友達追加してもらえば連携完了です
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
