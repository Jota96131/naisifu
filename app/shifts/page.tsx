"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Shift = {
  id: string;
  girl_id: string;
  scheduled_date: string;
  scheduled_time: string;
  created_at: string;
  girls: {
    name: string;
  };
};

export default function ShiftsPage() {
  const router = useRouter();
  // 【TODO 1】stateを追加してください
  // - シフト一覧を保存するstate
  // - 表示モード（"today" or "week"）を保存するstate
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [viewMode, setViewMode] = useState("today");

  // ヒント: useState<Shift[]>([]) と useState("today")

  // 【TODO 2】シフトを取得する関数を作ってください
  // useEffectの中で、以下の流れで取得する:
  // 1. supabase.auth.getUser() でログインユーザーを取得
  // 2. staffテーブルからstore_idを取得
  // 3. shiftsテーブルからデータを取得（girlsテーブルのnameも一緒に）
  useEffect(() => {
    const fetchShifts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: staffData } = await supabase
        .from("staff")
        .select("store_id")
        .eq("email", user.email)
        .single();

      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("shifts")
        .select("*, girls(name)")
        .eq("girls.store_id", staffData.store_id);

      if (viewMode === "today") {
        query = query.eq("scheduled_date", today);
      } else {
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const weekLaterStr = weekLater.toISOString().split("T")[0];
        query = query.gte("scheduled_date", today).lte("scheduled_date", weekLaterStr);
      }

      const { data, error } = await query.order("scheduled_date", { ascending: true });

      if (error) {
        console.error("取得エラー:", error.message);
        return;
      }
      setShifts(data ?? []);
    };
    fetchShifts();
  }, [viewMode]);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">シフト一覧</h1>

      {/* 改善2: ボタンを横幅いっぱいに */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode("today")}
          className={
            viewMode === "today" ?
              "flex-1 bg-blue-600 text-white px-4 py-2 rounded"
            : "flex-1 bg-gray-200 px-4 py-2 rounded"
          }
        >
          当日
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={
            viewMode === "week" ?
              "flex-1 bg-blue-600 text-white px-4 py-2 rounded"
            : "flex-1 bg-gray-200 px-4 py-2 rounded"
          }
        >
          今週
        </button>
      </div>

      {/* 改善1: カード情報を横並びに */}
      {shifts.length === 0 ?
        <p className="text-gray-500">シフトはありません</p>
      : <div className="space-y-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <p className="font-bold text-lg">{shift.girls.name}</p>
              <div className="text-right text-gray-600">
                <p>{shift.scheduled_date}</p>
                <p>{shift.scheduled_time}</p>
              </div>
            </div>
          ))}
        </div>
      }

      {/* 改善3: シフト登録への導線 */}
      <button
        onClick={() => router.push("/shifts/new")}
        className="mt-6 w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700"
      >
        ＋ シフト登録
      </button>
    </div>
  );
}
