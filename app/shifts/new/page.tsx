"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Girl = {
  id: string;
  name: string;
  scheduled_date: string;
  scheduled_time: string;
};

export default function ShiftNewPage() {
  const router = useRouter();
  // 【TODO 1】ここに必要なstateを追加してください
  const [girls, setGirls] = useState<Girl[]>([]);
  const [selectedGirlId, setSelectedGirlId] = useState("");
  // あと2つ必要です:
  // - 出勤予定日を保存するstate (scheduled_date用)
  const [scheduledDate, setScheduledDate] = useState("");
  // - 出勤予定時間を保存するstate (scheduled_time用)
  const [scheduledTime, setScheduledTime] = useState("");

  // 女の子一覧を取得
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

      if (error) {
        console.error("取得エラー:", error.message);
        return;
      }
      setGirls(data ?? []);
    };
    fetchGirls();
  }, []);

  // シフト登録処理
  const handleSubmit = async () => {
    // 【TODO 3】バリデーション（全部入力されているかチェック）
    if (!selectedGirlId || !scheduledDate || !scheduledTime) return;
    // 【TODO 4】supabase.from("shifts").insert() を使って登録
    const { data: shiftData, error } = await supabase.from("shifts").insert({
      girl_id: selectedGirlId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
    }).select().single();

    if (error) {
      console.error("登録エラー:", error.message);
      return;
    }

    // attendanceレコードも自動作成（ステータス: 未確認）
    const { error: attendanceError } = await supabase.from("attendance").insert({
      shift_id: shiftData.id,
      status: "未確認",
    });

    if (attendanceError) {
      console.error("出勤情報作成エラー:", attendanceError.message);
    }
    router.push("/shifts");
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">シフト登録</h1>

      <div className="space-y-4">
        {/* 女の子選択 */}
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          登録
        </button>
      </div>
    </div>
  );
}
