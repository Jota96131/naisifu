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
        setStatus("LIFF_ID: " + (process.env.NEXT_PUBLIC_LIFF_ID ?? "未設定"));
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        setStatus("init完了 isLoggedIn=" + liff.isLoggedIn());
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setUserId(profile.userId);
        setStatus("プロフィール取得成功");
      } catch (e) {
        setError(String(e));
      }
    };
    initLiff();
  }, []);

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
