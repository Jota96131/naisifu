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
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      console.error(error.message);
      return;
    }
    fetchStaff();
  };

  return (
    <div className="min-h-screen bg-[#0F0814] text-[#F5F0F5]">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">黒服一覧</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="名前を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-3 text-sm text-[#F5F0F5] bg-[#0A0510] border border-[#2A1A30] rounded-xl outline-none focus:border-[#FF3B8B] transition placeholder-[#9A8AA0]"
          />
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-[#FF3B8B] to-[#B561FF] text-[#0F0814] font-bold px-5 py-3 rounded-xl"
          >
            登録
          </button>
        </div>

        {loading ? (
          <p className="text-[#9A8AA0]">読み込み中...</p>
        ) : staffList.length === 0 ? (
          <p className="text-[#9A8AA0]">まだ登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {staffList.map((staff) => (
              <li
                key={staff.id}
                className="flex items-center justify-between bg-[#1A1020] border border-[#2A1A30] rounded-xl px-4 py-3"
              >
                <span className="text-[#F5F0F5]">{staff.name}</span>
                <button
                  onClick={() => handleDelete(staff.id)}
                  className="text-[#FF3B8B] hover:opacity-80 text-sm"
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
