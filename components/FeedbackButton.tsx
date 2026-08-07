"use client";

import { useState } from "react";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    setStatus("sending");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-72 border border-field-700 bg-field-900 rounded-md p-4 shadow-2xl shadow-black/50">
          {status === "sent" ? (
            <p className="text-chalk/80 text-sm">Thanks — got it. Closing this in a sec…</p>
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-chalk/50 mb-2">
                Bug report or idea?
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What's up?"
                className="w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-sm text-chalk focus:outline-none focus:border-clock-amber resize-none"
              />
              {status === "error" && (
                <p className="text-clock-red text-xs mt-2">Couldn't send — try again in a bit.</p>
              )}
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs text-chalk/50 hover:text-chalk px-2"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={status === "sending" || message.trim().length === 0}
                  className="rounded-sm bg-clock-amber text-field-950 text-xs font-display uppercase tracking-wide px-4 py-2 hover:bg-brass transition-colors disabled:opacity-50"
                >
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (status === "sent") {
            setStatus("idle");
            setMessage("");
          }
        }}
        className="rounded-full border border-brass/60 bg-field-900 text-brass text-xs font-mono uppercase tracking-widest px-4 py-2.5 hover:bg-brass hover:text-field-950 transition-colors shadow-lg"
      >
        Feedback
      </button>
    </div>
  );
}