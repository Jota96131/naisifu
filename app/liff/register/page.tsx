"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import liff from "@line/liff";

function LiffRegisterInner() {
  const searchParams = useSearchParams();
  const girlId = searchParams.get("girl_id");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("開始前");

  useEffect(() => {
    const initLiff = async () => {
      try {
        setStatus("LIFF初期化中...");
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setUserId(profile.userId);
        setStatus("プロフィール取得成功");

        if (!girlId) {
          setStatus("girl_idがURLに指定されていません");
          return;
        }

        setStatus("DBに保存中...");
        const res = await fetch("/api/line/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: profile.userId, girlId }),
        });

        if (!res.ok) {
          const errBody = await res.json();
          throw new Error(errBody.error ?? "保存に失敗しました");
        }

        setStatus("✅ 連携完了しました！");
      } catch (e) {
        setError(String(e));
      }
    };
    initLiff();
  }, [girlId]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            ナイシフ
          </h1>
          <span className="text-2xl">🌙</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">LINE連携</p>
      </div>

      <div className="w-full max-w-sm border border-gray-200 rounded-3xl p-6 bg-white">
        <h2 className="text-center text-lg font-bold text-gray-800 mb-6">
          LIFF登録
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">ステータス</span>
            <span className="font-medium text-gray-800">{status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">userId</span>
            <span className="font-medium text-gray-800 break-all text-right">
              {userId || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">girl_id</span>
            <span className="font-medium text-gray-800 break-all text-right">
              {girlId ?? "未指定"}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl">
            エラー: {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LiffRegisterPage() {
  return (
    <Suspense
      fallback={
        <p className="min-h-screen bg-white flex items-center justify-center text-gray-500">
          読み込み中...
        </p>
      }
    >
      <LiffRegisterInner />
    </Suspense>
  );
}
