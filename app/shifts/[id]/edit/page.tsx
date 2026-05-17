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
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setScheduledTime(shiftData.scheduled_time.slice(0, 5));
    };
    fetchGirls();
  }, [id]);

  const timeOptions: string[] = [];
  for (let h = 19; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break;
      timeOptions.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const dayChips = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return {
      value: formatLocalDate(d),
      label:
        i === 0 ? "今日" : i === 1 ? "明日" : `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: weekdays[d.getDay()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    };
  });

  const isCustomDate =
    scheduledDate !== "" && !dayChips.some((c) => c.value === scheduledDate);

  const isFormValid = selectedGirlId && scheduledDate && scheduledTime;

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("shifts")
      .update({
        girl_id: selectedGirlId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      })
      .eq("id", id);

    if (error) {
      console.error("更新エラー:", error.message);
      setErrorMessage("更新に失敗しました。時間をおいて再度お試しください");
      setSubmitting(false);
      return;
    }
    router.push("/shifts");
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("本当に削除しますか?")) return;

    setDeleting(true);
    setErrorMessage("");

    await supabase.from("attendance").delete().eq("shift_id", id);

    const { error } = await supabase.from("shifts").delete().eq("id", id);

    if (error) {
      console.error("削除エラー:", error.message);
      setErrorMessage("削除に失敗しました");
      setDeleting(false);
      return;
    }
    router.push("/shifts");
  };

  const inputClass =
    "w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const selectedGirl = girls.find((g) => g.id === selectedGirlId);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/shifts")}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition"
            aria-label="戻る"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            シフト編集
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>女の子</label>
            <div
              className={`${inputClass} bg-gray-50 text-gray-800 cursor-not-allowed flex items-center justify-between`}
              aria-readonly="true"
            >
              <span>{selectedGirl ? selectedGirl.name : "—"}</span>
              <span className="text-xs text-gray-400">変更不可</span>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              他の女の子に変更したい場合は、このシフトを削除して新規登録してください
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                出勤予定日
              </label>
              <label className="relative text-sm text-indigo-600 font-medium cursor-pointer hover:text-indigo-700 transition">
                カレンダーから選択
                <input
                  type="date"
                  value={isCustomDate ? scheduledDate : ""}
                  onChange={(e) => {
                    setScheduledDate(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {dayChips.map((chip) => {
                const isSelected = scheduledDate === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => {
                      setScheduledDate(chip.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    className={`flex-shrink-0 w-[72px] py-2 rounded-2xl border text-center transition ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-600 to-sky-500 text-white border-transparent font-bold"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs">{chip.label}</div>
                    <div
                      className={`text-xs mt-0.5 ${
                        isSelected
                          ? "text-white/80"
                          : chip.weekday === "日"
                            ? "text-red-500"
                            : chip.weekday === "土"
                              ? "text-blue-500"
                              : "text-gray-400"
                      }`}
                    >
                      {chip.weekday}
                    </div>
                  </button>
                );
              })}
            </div>
            {isCustomDate && (
              <p className="mt-2 text-sm text-indigo-600 font-medium">
                選択中: {scheduledDate}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>出勤予定時間</label>
            <button
              type="button"
              onClick={() => setTimeSheetOpen(true)}
              aria-label="出勤予定時間を選択"
              className={`${inputClass} flex items-center justify-between text-left ${
                scheduledTime ? "text-gray-800" : "text-gray-400"
              }`}
            >
              <span>{scheduledTime || "選択してください"}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {errorMessage && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-4 py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "更新中..." : "更新"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full bg-white border border-red-300 text-red-600 font-bold px-4 py-3 rounded-2xl hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>

      {timeSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setTimeSheetOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl shadow-xl max-h-[70vh] flex flex-col animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">
                出勤予定時間を選択
              </h2>
            </div>
            <div className="overflow-y-auto flex-1">
              {timeOptions.map((time) => (
                <button
                  key={time}
                  onClick={() => {
                    setScheduledTime(time);
                    setTimeSheetOpen(false);
                  }}
                  className={`w-full px-5 py-4 text-left text-sm border-b border-gray-100 transition ${
                    scheduledTime === time
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTimeSheetOpen(false)}
              className="px-5 py-4 text-sm text-gray-600 border-t border-gray-100 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
