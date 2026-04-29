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

  const handleDelete = async () => {
    if (!window.confirm("本当に削除しますか?")) return;

    await supabase.from("attendance").delete().eq("shift_id", id);

    const { error } = await supabase.from("shifts").delete().eq("id", id);

    if (error) {
      console.error("削除エラー:", error.message);
      return;
    }
    router.push("/shifts");
  };

  const inputClass =
    "w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            シフト編集
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>女の子</label>
            <select
              value={selectedGirlId}
              onChange={(e) => setSelectedGirlId(e.target.value)}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {girls.map((girl) => (
                <option key={girl.id} value={girl.id}>
                  {girl.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>出勤予定日</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>出勤予定時間</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-3 rounded-2xl hover:opacity-90 transition"
          >
            更新
          </button>
          <button
            onClick={handleDelete}
            className="w-full bg-white border border-red-300 text-red-600 font-bold px-4 py-3 rounded-2xl hover:bg-red-50 transition"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
