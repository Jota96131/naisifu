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

      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("shifts")
        .select("*, girls(name), attendance(id, status)")
        .eq("girls.store_id", staffData.store_id);

      if (viewMode === "today") {
        query = query.eq("scheduled_date", today);
      } else {
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const weekLaterStr = weekLater.toISOString().split("T")[0];
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
    <div className="min-h-screen bg-[#0F0814] text-[#F5F0F5]">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">シフト一覧</h1>

        {shifts.length > 0 && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1 p-2.5 bg-[#FF3B8B]/10 border border-[#FF3B8B]/30 rounded-xl text-[#FF3B8B] text-center text-sm font-medium">
              出勤 {attendanceCount}名
            </div>
            <div className="flex-1 p-2.5 bg-[#B561FF]/10 border border-[#B561FF]/30 rounded-xl text-[#B561FF] text-center text-sm font-medium">
              欠勤 {absentCount}名
            </div>
            <div className="flex-1 p-2.5 bg-[#1A1020] border border-[#2A1A30] rounded-xl text-[#9A8AA0] text-center text-sm font-medium">
              未確認 {pendingCount}名
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode("today")}
            className={
              viewMode === "today"
                ? "flex-1 bg-gradient-to-r from-[#FF3B8B] to-[#B561FF] text-[#0F0814] font-bold px-4 py-2.5 rounded-xl text-sm"
                : "flex-1 bg-[#1A1020] border border-[#2A1A30] text-[#9A8AA0] px-4 py-2.5 rounded-xl text-sm"
            }
          >
            当日
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={
              viewMode === "week"
                ? "flex-1 bg-gradient-to-r from-[#FF3B8B] to-[#B561FF] text-[#0F0814] font-bold px-4 py-2.5 rounded-xl text-sm"
                : "flex-1 bg-[#1A1020] border border-[#2A1A30] text-[#9A8AA0] px-4 py-2.5 rounded-xl text-sm"
            }
          >
            今週
          </button>
        </div>

        {shifts.length === 0 ? (
          <p className="text-[#9A8AA0] text-center py-8">シフトはありません</p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={`rounded-2xl p-4 border ${
                  shift.attendance[0]?.status === "出勤"
                    ? "border-[#FF3B8B]/40 bg-[#FF3B8B]/5"
                    : shift.attendance[0]?.status === "欠勤"
                      ? "border-[#B561FF]/40 bg-[#B561FF]/5"
                      : "border-[#2A1A30] bg-[#1A1020]"
                }`}
              >
                <div
                  onClick={() => router.push(`/shifts/${shift.id}/edit`)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <p className="font-bold text-lg text-[#F5F0F5]">
                    {shift.girls.name}
                  </p>
                  <div className="text-right text-[#9A8AA0] text-sm">
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
                        className={`flex-1 px-2 py-1.5 rounded-lg text-sm transition ${
                          shift.attendance[0].status === status
                            ? status === "出勤"
                              ? "bg-[#FF3B8B] text-[#0F0814] font-bold"
                              : status === "欠勤"
                                ? "bg-[#B561FF] text-[#0F0814] font-bold"
                                : "bg-[#9A8AA0] text-[#0F0814] font-bold"
                            : "bg-[#0A0510] border border-[#2A1A30] text-[#9A8AA0]"
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
          className="mt-6 w-full bg-gradient-to-r from-[#FF3B8B] to-[#B561FF] text-[#0F0814] font-bold px-4 py-3.5 rounded-xl transition hover:opacity-90"
        >
          ＋ シフト登録
        </button>
      </div>
    </div>
  );
}
