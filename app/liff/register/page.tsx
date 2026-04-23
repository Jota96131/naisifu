"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import liff from "@line/liff";

export default function LiffRegisterPage() {
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
    <div className="max-w-2xl mx-auto py-20 px-4">
      <h1 className="text-2xl font-bold mb-4">LIFF登録ページ</h1>
      <p>ステータス: {status}</p>
      <p>userId: {userId}</p>
      <p>girl_id: {girlId ?? "未指定"}</p>
      {error && <p className="text-red-500 mt-4">エラー: {error}</p>}
    </div>
  );
}
