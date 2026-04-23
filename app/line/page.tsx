"use client";

export default function LinePage() {
  const addFriendUrl = "https://lin.ee/oZ2IsCd";

  return (
    <div className="max-w-2xl mx-auto py-20 px-4 flex flex-col items-center text-center">
      <h1 className="text-2xl font-bold mb-8">LINE友達追加</h1>

      <a
        href={addFriendUrl}
        target="_blank"
        className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-lg text-lg"
      >
        友達追加する
      </a>
    </div>
  );
}
