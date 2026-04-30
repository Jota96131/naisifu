"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Staff = {
  id: string;
  store_id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function StaffPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setCurrentEmail(user.email ?? null);

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
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("ログイン情報を取得できませんでした");
      setSubmitting(false);
      return;
    }

    const { data: staffData } = await supabase
      .from("staff")
      .select("store_id")
      .eq("email", user.email)
      .single();
    if (!staffData) {
      setErrorMessage("店舗情報を取得できませんでした");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("staff")
      .insert({ name: name.trim(), store_id: staffData.store_id });
    if (error) {
      console.error(error.message);
      setErrorMessage("登録に失敗しました。時間をおいて再度お試しください");
      setSubmitting(false);
      return;
    }
    setName("");
    setSubmitting(false);
    fetchStaff();
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      console.error(error.message);
      setErrorMessage("削除に失敗しました");
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }
    setDeleting(false);
    setDeleteTarget(null);
    fetchStaff();
  };

  const isAddDisabled = !name.trim() || submitting;

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
            黒服一覧
          </h1>
          <span className="text-xl">🌙</span>
        </div>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="名前を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition"
          />
          <button
            onClick={handleAdd}
            disabled={isAddDisabled}
            className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold px-5 py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "登録"}
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="mb-2" />

        {loading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : staffList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">まだ登録されていません</p>
        ) : (
          <ul className="space-y-2 mt-4">
            {staffList.map((staff) => (
              <li
                key={staff.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3"
              >
                <span className="text-gray-800 font-medium">{staff.name}</span>
                {staff.email !== currentEmail && (
                  <button
                    onClick={() => setDeleteTarget(staff)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 transition"
                    aria-label={`${staff.name}を削除`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl shadow-xl animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-5 py-5">
              <h2 className="text-base font-bold text-gray-800 mb-2">
                本当に削除しますか？
              </h2>
              <p className="text-sm text-gray-600">
                <span className="font-bold">{deleteTarget.name}</span>{" "}
                を削除します。この操作は取り消せません。
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 text-sm bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
