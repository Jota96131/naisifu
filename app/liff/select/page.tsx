"use client";

import { Suspense, useEffect, useState } from "react";
import liff from "@line/liff";

type Girl = {
  id: string;
  name: string;
};

function LiffSelectInner() {
  const [storeName, setStoreName] = useState("");
  const [girls, setGirls] = useState<Girl[]>([]);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [selectedGirlId, setSelectedGirlId] = useState("");
  const [phase, setPhase] = useState<
    "init" | "ready" | "submitting" | "done" | "error"
  >("init");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const codeParam = params.get("code");
        if (!codeParam) {
          setErrorMessage("店舗コードが指定されていません");
          setPhase("error");
          return;
        }
        setCode(codeParam);

        const token = liff.getIDToken();
        if (!token) {
          throw new Error("IDトークンを取得できませんでした");
        }
        setIdToken(token);

        const res = await fetch(`/api/line/select?code=${codeParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "店舗情報の取得に失敗しました");
        }
        const data = await res.json();
        setStoreName(data.store.name);
        setGirls(data.girls);
        setPhase("ready");
      } catch (e) {
        setErrorMessage(String(e));
        setPhase("error");
      }
    };
    init();
  }, []);

  const handleSubmit = async () => {
    if (!selectedGirlId || phase === "submitting" || !idToken) return;
    setPhase("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/line/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code, girlId: selectedGirlId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "登録に失敗しました");
      }
      setPhase("done");
    } catch (e) {
      setErrorMessage(String(e));
      setPhase("ready");
    }
  };

  const handleClose = () => {
    if (liff.isInClient()) {
      liff.closeWindow();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            ナイシフ
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        {phase === "init" && (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        )}

        {phase === "error" && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            {errorMessage}
          </div>
        )}

        {(phase === "ready" || phase === "submitting") && (
          <>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">{storeName}</p>
              <h2 className="text-lg font-bold text-gray-800">
                あなたのお名前を選んでください
              </h2>
            </div>

            {errorMessage && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                {errorMessage}
              </div>
            )}

            {girls.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">
                登録できる女の子がいません。お店に確認してください。
              </p>
            ) : (
              <div className="space-y-2 mb-6">
                {girls.map((girl) => (
                  <button
                    key={girl.id}
                    onClick={() => setSelectedGirlId(girl.id)}
                    className={`w-full px-4 py-4 text-left text-sm rounded-2xl border transition ${
                      selectedGirlId === girl.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold"
                        : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {girl.name}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedGirlId || phase === "submitting"}
              className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === "submitting" ? "登録中..." : "この名前で登録する"}
            </button>
          </>
        )}

        {phase === "done" && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              登録が完了しました
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              出勤前にLINEでリマインドが届きます
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-3 rounded-2xl hover:opacity-90 transition"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiffSelectPage() {
  return (
    <Suspense
      fallback={
        <p className="min-h-screen bg-white flex items-center justify-center text-gray-500">
          読み込み中...
        </p>
      }
    >
      <LiffSelectInner />
    </Suspense>
  );
}
