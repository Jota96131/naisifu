"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Staff = {
  id: string;
  store_id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function StaffPage() {
  const [name, setName] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]); // 一覧データを入れる箱
  const [loading, setLoading] = useState(true); // 最初は読み込み中

  const fetchStaff = async () => {
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
      .from("staff")
      .select("*")
      .eq("store_id", staffData.store_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error.message);
      return;
    }
    setStaffList(data ?? []);
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
        .from("staff")
        .select("*")
        .eq("store_id", staffData.store_id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error.message);
        return;
      }
      if (!ignore) {
        setStaffList(data ?? []);
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []); // ページ開いた時に1回だけ実行

  const handleAdd = async () => {
    // 登録処理
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

    const { error } = await supabase
      .from("staff")
      .insert({ name: name.trim(), store_id: staffData.store_id });
    if (error) {
      console.error(error.message);
      return;
    }
    setName("");
    fetchStaff();
  };

  const handleDelete = async (id: string) => {
    // 削除処理
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      console.error(error.message);
      return;
    }
    fetchStaff();
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">黒服一覧</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="名前を入力"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          登録
        </button>
      </div>

      {loading ?
        <p className="text-gray-500">読み込み中...</p>
      : staffList.length === 0 ?
        <p className="text-gray-500">まだ登録されていません</p>
      : <ul className="space-y-2">
          {staffList.map((staff) => (
            <li
              key={staff.id}
              className="flex items-center justify-between border border-gray-200 rounded px-4 py-3"
            >
              <span>{staff.name}</span>
              <button
                onClick={() => handleDelete(staff.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}
