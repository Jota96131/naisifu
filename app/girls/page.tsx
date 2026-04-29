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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffData } = await supabase
      .from("staff")
      .select("store_id")
      .eq("email", user.email)
      .single();
    if (!staffData) return;

    const { data, error } = await supabase
      .from("girls")
      .select("*")
      .eq("store_id", staffData.store_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("取得エラー:", error.message);
      return;
    }
    setGirls(data ?? []);
    setLoading(false);
  };

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

      const { data, error } = await supabase
        .from("girls")
        .select("*")
        .eq("store_id", staffData.store_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("取得エラー:", error.message);
        return;
      }
      if (!ignore) {
        setGirls(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffData } = await supabase
      .from("staff")
      .select("store_id")
      .eq("email", user.email)
      .single();
    if (!staffData) return;

    const { error } = await supabase.from("girls").insert({
      name: name.trim(),
      store_id: staffData.store_id,
    });

    if (error) {
      console.error("登録エラー:", error.message);
      return;
    }
    setName("");
    fetchGirls();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("本当に削除しますか?")) return;
    const { error } = await supabase.from("girls").delete().eq("id", id);

    if (error) {
      console.error("削除エラー:", error.message);
      return;
    }
    fetchGirls();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            女の子一覧
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="名前を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition"
          />
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-5 py-3 rounded-2xl hover:opacity-90 transition"
          >
            登録
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : girls.length === 0 ? (
          <p className="text-gray-500 text-center py-8">まだ登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {girls.map((girl) => (
              <li
                key={girl.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3"
              >
                <span className="text-gray-800 font-medium">{girl.name}</span>
                <button
                  onClick={() => handleDelete(girl.id)}
                  className="text-red-600 hover:opacity-80 text-sm"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
