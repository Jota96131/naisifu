"use client";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title = "確認",
  message,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-2 text-center">
          {title}
        </h2>
        <p className="text-sm text-gray-600 text-center whitespace-pre-line mb-6">
          {message}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`w-full px-4 py-3 rounded-2xl font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gradient-to-r from-indigo-600 to-sky-500 hover:opacity-90"
            }`}
          >
            {busy ? "処理中..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-white text-gray-600 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
