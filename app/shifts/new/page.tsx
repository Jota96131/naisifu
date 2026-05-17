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
  const [girls, setGirls] = useState<Girl[]>([]);
  const [selectedGirlId, setSelectedGirlId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

      if (error) {
        console.error("取得エラー:", error.message);
        return;
      }
      setGirls(data ?? []);
    };
    fetchGirls();
  }, []);

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
    };
  });

  const isCustomDate =
    scheduledDate !== "" && !dayChips.some((c) => c.value === scheduledDate);

  const isFormValid = selectedGirlId && scheduledDate && scheduledTime;

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;

    const today = formatLocalDate(new Date());
    if (scheduledDate < today) {
      setErrorMessage("過去の日付には登録できません");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    const { data: shiftData, error } = await supabase
      .from("shifts")
      .insert({
        girl_id: selectedGirlId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      })
      .select()
      .single();

    if (error) {
      console.error("登録エラー:", error.message);
      setErrorMessage("登録に失敗しました。時間をおいて再度お試しください");
      setSubmitting(false);
      return;
    }

    const { error: attendanceError } = await supabase.from("attendance").insert({
      shift_id: shiftData.id,
      status: "未確認",
    });

    if (attendanceError) {
      console.error("出勤情報作成エラー:", attendanceError.message);
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
            シフト登録
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>女の子</label>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="女の子を選択"
              className={`${inputClass} flex items-center justify-between text-left ${
                selectedGirl ? "text-gray-800" : "text-gray-400"
              }`}
            >
              <span>{selectedGirl ? selectedGirl.name : "選択してください"}</span>
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                出勤予定日
              </label>
              <label className="relative text-sm text-indigo-600 font-medium cursor-pointer hover:text-indigo-700 transition">
                カレンダーから選択
                <input
                  type="date"
                  min={formatLocalDate(new Date())}
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
            {submitting ? "登録中..." : "登録"}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => {
            setSheetOpen(false);
            setSearchQuery("");
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl shadow-xl max-h-[70vh] flex flex-col animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">女の子を選択</h2>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="名前で検索"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {girls.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">
                  登録された女の子がいません
                </p>
              ) : (
                (() => {
                  const filtered = girls.filter((g) =>
                    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
                  );
                  if (filtered.length === 0) {
                    return (
                      <p className="text-gray-500 text-center py-8 text-sm">
                        該当する女の子がいません
                      </p>
                    );
                  }
                  return filtered.map((girl) => (
                    <button
                      key={girl.id}
                      onClick={() => {
                        setSelectedGirlId(girl.id);
                        setSheetOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full px-5 py-4 text-left text-sm border-b border-gray-100 transition ${
                        selectedGirlId === girl.id
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      {girl.name}
                    </button>
                  ));
                })()
              )}
            </div>
            <button
              onClick={() => {
                setSheetOpen(false);
                setSearchQuery("");
              }}
              className="px-5 py-4 text-sm text-gray-600 border-t border-gray-100 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

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
