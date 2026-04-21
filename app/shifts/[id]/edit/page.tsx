"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Girl = {
  id: string;
  name: string;
};

export default function ShiftEditPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id;

  const [girls, setGirls] = useState<Girl[]>([]);
  const [selectedGirlId, setSelectedGirlId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    const fetchGirls = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: staffData } = await supabase
        .from("staff")
        .select("store_id")
        .eq("email", user.email)
        .single();

      const { data, error } = await supabase
        .from("girls")
        .select("*")
        .eq("store_id", staffData.store_id)
        .order("created_at", { ascending: false });

      const { data: shiftData } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("取得エラー:", error.message);
        return;
      }
      setGirls(data ?? []);
      setSelectedGirlId(shiftData.girl_id);
      setScheduledDate(shiftData.scheduled_date);
      setScheduledTime(shiftData.scheduled_time);
    };
    fetchGirls();
  }, []);

  // 【TODO 4】更新処理
  // const handleUpdate = async () => {
  //   バリデーション（shifts/new と同じ）
  //   supabase.from("shifts").update({ ??? }).eq("id", id)
  //   成功したら router.push("/shifts")
  // };

  const handleSubmit = async () => {
    if (!selectedGirlId || !scheduledDate || !scheduledTime) return;
    const { error } = await supabase
      .from("shifts")
      .update({
        girl_id: selectedGirlId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      })
      .eq("id", id);

    if (error) {
      console.error("登録エラー:", error.message);
      return;
    }
    router.push("/shifts");
  };

  // 【TODO 5】削除処理
  // const handleDelete = async () => {
  //   window.confirm で確認（girls/page.tsx でやったやつ！）
  //   supabase.from("shifts").delete().eq("id", id)
  //   成功したら router.push("/shifts")
  // };

  const handleDelete = async () => {
    if (!window.confirm("本当に削除しますか?")) return;

    // 先にattendanceを削除（shift_idで紐づいてるから）
    await supabase.from("attendance").delete().eq("shift_id", id);

    // その後にshiftsを削除
    const { error } = await supabase.from("shifts").delete().eq("id", id);

    if (error) {
      console.error("削除エラー:", error.message);
      return;
    }
    router.push("/shifts");
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">シフト編集</h1>

      <div className="space-y-4">
        {/* 女の子選択 — shifts/new と同じ */}
        <div>
          <label className="block text-sm font-medium mb-2">女の子</label>
          <select
            value={selectedGirlId}
            onChange={(e) => setSelectedGirlId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">選択してください</option>
            {girls.map((girl) => (
              <option key={girl.id} value={girl.id}>
                {girl.name}
              </option>
            ))}
          </select>
        </div>

        {/* 出勤予定日 */}
        <div>
          <label className="block text-sm font-medium mb-2">出勤予定日</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {/* 出勤予定時間 */}
        <div>
          <label className="block text-sm font-medium mb-2">出勤予定時間</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700"
        >
          更新
        </button>
        <button
          onClick={handleDelete}
          className="w-full bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700"
        >
          削除
        </button>
      </div>
    </div>
  );
}
