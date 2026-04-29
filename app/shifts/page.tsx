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
  attendance: {
    id: string;
    status: string;
  }[];
};

export default function ShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [viewMode, setViewMode] = useState("today");

  useEffect(() => {
    const fetchShifts = async () => {
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

      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const today = formatLocalDate(new Date());

      let query = supabase
        .from("shifts")
        .select("*, girls(name), attendance(id, status)")
        .eq("girls.store_id", staffData.store_id);

      if (viewMode === "today") {
        query = query.eq("scheduled_date", today);
      } else {
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const weekLaterStr = formatLocalDate(weekLater);
        query = query
          .gte("scheduled_date", today)
          .lte("scheduled_date", weekLaterStr);
      }

      const { data, error } = await query.order("scheduled_date", {
        ascending: true,
      });

      if (error) {
        console.error("取得エラー:", error.message);
        return;
      }
      setShifts(data ?? []);
    };
    fetchShifts();
  }, [viewMode]);

  const updateStatus = async (attendanceId: string, newStatus: string) => {
    const { error } = await supabase
      .from("attendance")
      .update({ status: newStatus })
      .eq("id", attendanceId);

    if (error) {
      console.error("ステータス更新エラー:", error.message);
      return;
    }
    setShifts((prev) =>
      prev.map((shift) => ({
        ...shift,
        attendance: shift.attendance.map((a) =>
          a.id === attendanceId ? { ...a, status: newStatus } : a,
        ),
      })),
    );
  };

  const attendanceCount = shifts.filter(
    (shift) => shift.attendance[0]?.status === "出勤",
  ).length;
  const absentCount = shifts.filter(
    (shift) => shift.attendance[0]?.status === "欠勤",
  ).length;
  const pendingCount = shifts.filter(
    (shift) => shift.attendance[0]?.status === "未確認",
  ).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            シフト一覧
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        {shifts.length > 0 && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-center text-sm font-medium">
              出勤 {attendanceCount}名
            </div>
            <div className="flex-1 px-3 py-2.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-center text-sm font-medium">
              欠勤 {absentCount}名
            </div>
            <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-600 text-center text-sm font-medium">
              未確認 {pendingCount}名
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode("today")}
            className={
              viewMode === "today"
                ? "flex-1 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-2.5 rounded-2xl text-sm"
                : "flex-1 bg-white border border-gray-300 text-gray-600 px-4 py-2.5 rounded-2xl text-sm"
            }
          >
            当日
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={
              viewMode === "week"
                ? "flex-1 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-2.5 rounded-2xl text-sm"
                : "flex-1 bg-white border border-gray-300 text-gray-600 px-4 py-2.5 rounded-2xl text-sm"
            }
          >
            今週
          </button>
        </div>

        {shifts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">シフトはありません</p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={`rounded-2xl p-4 border ${
                  shift.attendance[0]?.status === "出勤"
                    ? "border-emerald-300 bg-emerald-50"
                    : shift.attendance[0]?.status === "欠勤"
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                }`}
              >
                <div
                  onClick={() => router.push(`/shifts/${shift.id}/edit`)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <p className="font-bold text-lg text-gray-800">
                    {shift.girls.name}
                  </p>
                  <div className="text-right text-gray-500 text-sm">
                    <p>{shift.scheduled_date}</p>
                    <p>{shift.scheduled_time}</p>
                  </div>
                </div>
                {shift.attendance[0] && (
                  <div className="flex gap-2 mt-3">
                    {["未確認", "出勤", "欠勤"].map((status) => (
                      <button
                        key={status}
                        onClick={() =>
                          updateStatus(shift.attendance[0].id, status)
                        }
                        className={`flex-1 px-2 py-1.5 rounded-xl text-sm transition ${
                          shift.attendance[0].status === status
                            ? status === "出勤"
                              ? "bg-emerald-500 text-white font-bold"
                              : status === "欠勤"
                                ? "bg-red-500 text-white font-bold"
                                : "bg-gray-500 text-white font-bold"
                            : "bg-white border border-gray-300 text-gray-600"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/shifts/new")}
          className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-3 rounded-2xl hover:opacity-90 transition"
        >
          ＋ シフト登録
        </button>
      </div>
    </div>
  );
}
