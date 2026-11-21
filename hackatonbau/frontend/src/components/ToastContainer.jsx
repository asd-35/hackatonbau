import React from "react";

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.icon || "✅"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
