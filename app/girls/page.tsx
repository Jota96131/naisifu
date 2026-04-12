"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Girl = {
  id: string;
  name: string;
  store_id: string;
  line_user_id: string | null;
  created_at: string;
};

export default function GirlsPage() {
  const [girls, setGirls] = useState<Girl[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchGirls = async () => {
    const { data, error } = await supabase
      .from("girls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("取得エラー:", error.message);
      return;
    }
    setGirls(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGirls();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;

    const { error } = await supabase
      .from("girls")
      .insert({ name: name.trim() });

    if (error) {
      console.error("登録エラー:", error.message);
      return;
    }
    setName("");
    fetchGirls();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("girls").delete().eq("id", id);

    if (error) {
      console.error("削除エラー:", error.message);
      return;
    }
    fetchGirls();
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">女の子一覧</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="名前を入力"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          登録
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : girls.length === 0 ? (
        <p className="text-gray-500">まだ登録されていません</p>
      ) : (
        <ul className="space-y-2">
          {girls.map((girl) => (
            <li
              key={girl.id}
              className="flex items-center justify-between border border-gray-200 rounded px-4 py-3"
            >
              <span>{girl.name}</span>
              <button
                onClick={() => handleDelete(girl.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
