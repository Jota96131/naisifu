"use client";

export default function LinePage() {
  const addFriendUrl = "https://lin.ee/oZ2IsCd";

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
          LINEで出勤確認をカンタンに
        </p>
      </div>

      <div className="w-full max-w-sm border border-gray-200 rounded-3xl p-6 bg-white text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-2">LINE友達追加</h2>
        <p className="text-sm text-gray-500 mb-6">
          ボタンを押してLINEで友達追加してください
        </p>
        <a
          href={addFriendUrl}
          target="_blank"
          className="inline-block w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold py-3 px-4 rounded-2xl hover:opacity-90 transition"
        >
          友達追加する
        </a>
      </div>
    </div>
  );
}
