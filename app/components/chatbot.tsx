'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Faq = { id: string; canonical: string; variants?: string[]; answer: string };
type Msg = { id: string; role: 'user' | 'bot'; text: string; typing?: boolean };

const clean = (text: string) =>
  String(text).toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();

const matchFAQ = (faqs: Faq[], query: string): Faq | null => {
  const q = clean(query);
  let found = faqs.find((f) => clean(f.canonical) === q);
  if (found) return found;
  for (const f of faqs) if (f.variants?.some((v) => clean(v) === q)) return f;
  for (const f of faqs) {
    if (clean(f.canonical).includes(q)) return f;
    if (f.variants?.some((v) => clean(v).includes(q))) return f;
  }
  return null;
};

export default function Chatbot() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sessionId = useMemo(() => crypto.randomUUID(), []);

  const CONFIG = useMemo(
    () => ({
      greetingOnOpen: true,
      greetingText:
        process.env.NEXT_PUBLIC_GREETING_TEXT ||
        'Hi, I’m cortif.ai. How can I help you today?',
      brand: process.env.NEXT_PUBLIC_BRAND_NAME || 'cortif.ai',
    }),
    []
  );

  useEffect(() => {
    fetch('/api/faq')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFaqs(Array.isArray(data) ? data : []))
      .catch(() => setFaqs([]));
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  function openPanel() {
    setOpen(true);
    setUnread(false);
    if (CONFIG.greetingOnOpen && !greeted) {
      setMessages((cur) => [
        ...cur,
        { id: crypto.randomUUID(), role: 'bot', text: CONFIG.greetingText },
      ]);
      setGreeted(true);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  const closePanel = () => setOpen(false);
  const clearLog = () => setMessages([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;

    setBusy(true);
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: q };
    const botTyping: Msg = { id: crypto.randomUUID(), role: 'bot', text: '', typing: true };

    setMessages((cur) => [...cur, userMsg, botTyping]);
    setInput('');

    // include the just-typed message in history
    const history = [...messages, userMsg]
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    // local FAQ
    const hit = matchFAQ(faqs, q);
    if (hit) {
      setTimeout(() => {
        setMessages((cur) =>
          cur.map((m) => (m.id === botTyping.id ? { ...m, typing: false, text: hit.answer } : m))
        );
        setBusy(false);
        if (!open && !unread) setUnread(true);
      }, 250);
      return;
    }

    // backend
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q, sessionId, history }),
      });
      const data = await resp.json();
      const text: string = data?.text || data?.reply || 'Sorry, I do not know this yet.';
      setMessages((cur) => cur.map((m) => (m.id === botTyping.id ? { ...m, typing: false, text } : m)));
    } catch (err: any) {
      setMessages((cur) =>
        cur.map((m) =>
          m.id === botTyping.id ? { ...m, typing: false, text: `[Error] ${String(err?.message || err)}` } : m
        )
      );
    } finally {
      setBusy(false);
      if (!open && !unread) setUnread(true);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        aria-label="Open chat"
        title="Chat"
        onClick={() => (open ? closePanel() : openPanel())}
        disabled={busy}
        className={`fixed right-4 bottom-4 grid h-14 w-14 place-items-center rounded-full border-0 shadow-2xl transition active:scale-95 ${
          unread ? 'after:absolute after:-top-1.5 after:-right-1.5 after:h-3.5 after:w-3.5 after:rounded-full after:border-2 after:border-black after:bg-rose-500' : ''
        }`}
        style={{ background: 'var(--accent)' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 2H4a2 2 0 0 0-2 2v13.5A2.5 2.5 0 0 0 4.5 20H18l4 4V4a2 2 0 0 0-2-2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="8" cy="10" r="1.2" fill="white" />
          <circle cx="12" cy="10" r="1.2" fill="white" />
          <circle cx="16" cy="10" r="1.2" fill="white" />
        </svg>
      </button>

      {/* Panel */}
      <section
        role="dialog"
        aria-label="AI chat"
        aria-modal="false"
        className={`fixed right-4 bottom-24 z-[9999] grid h-[460px] w-[min(92vw,360px)] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl ${open ? 'grid' : 'hidden'}`}
      >
        <div className="flex items-center justify-between bg-[var(--accent)] px-3 py-2 font-semibold text-black">
          <div className="text-sm tracking-wide">{CONFIG.brand}</div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-white" onClick={clearLog}>Clear</button>
            <button className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-white" onClick={closePanel}>Close</button>
          </div>
        </div>

        <div ref={logRef} className="flex flex-col gap-2 overflow-auto bg-black/90 p-3" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl border border-neutral-800 px-3 py-2 ${m.role === 'user' ? 'bg-neutral-800 text-white' : 'bg-neutral-900 text-neutral-200'}`}>
                <span>{m.text}</span>
                {m.typing && (
                  <span className="ml-1 inline-flex align-middle" aria-label="Assistant is typing" role="status">
                    <span className="mx-[2px] inline-block h-[6px] w-[6px] animate-bounce rounded-full opacity-60" />
                    <span className="mx-[2px] inline-block h-[6px] w-[6px] animate-bounce rounded-full opacity-60 [animation-delay:.15s]" />
                    <span className="mx-[2px] inline-block h-[6px] w-[6px] animate-bounce rounded-full opacity-60 [animation-delay:.30s]" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="grid grid-cols-[1fr_auto] gap-2 border-t border-neutral-800 bg-black/40 p-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about Slack, drift, setup…"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-white outline-none"
          />
          <button type="submit" disabled={busy} className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-black disabled:opacity-60">
            Send
          </button>
        </form>
      </section>
    </>
  );
}
