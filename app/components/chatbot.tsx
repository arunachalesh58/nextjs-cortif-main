'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

function clean(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
}

function matchFAQ(faqs, query) {
  const q = clean(query);
  // exact canonical
  let found = faqs.find((faq) => clean(faq.canonical) === q);
  if (found) return found;
  // exact variant
  for (const faq of faqs) {
    if (faq.variants && faq.variants.some((v) => clean(v) === q)) return faq;
  }
  // substring (canonical or variants)
  for (const faq of faqs) {
    if (clean(faq.canonical).includes(q)) return faq;
    if (faq.variants && faq.variants.some((v) => clean(v).includes(q))) return faq;
  }
  return null;
}

export default function Chatbot() {
  const [faqs, setFaqs] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const sessionId = useMemo(() => crypto.randomUUID(), []);

  // Greeting on panel open (frontend)
  const CONFIG = useMemo(
    () => ({
      greetingOnOpen: true,
      greetingText: process.env.NEXT_PUBLIC_GREETING_TEXT || 'Hi, I’m cortif.ai. How can I help you today?',
    }),
    []
  );

  // Load FAQs from API
  useEffect(() => {
    fetch('/api/faq')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFaqs(Array.isArray(data) ? data : []))
      .catch(() => setFaqs([]));
  }, []);

  // Auto-scroll log
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

  function closePanel() {
    setOpen(false);
  }

  function clearLog() {
    setMessages([]);
  }

  function submit(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;

    setBusy(true);

    // user bubble
    const userMsg = { id: crypto.randomUUID(), role: 'user', text: q };
    // bot thinking bubble
    const botTyping = { id: crypto.randomUUID(), role: 'bot', text: '', typing: true };

    setMessages((cur) => [...cur, userMsg, botTyping]);
    setInput('');

    // 1) Try FAQ locally
    const hit = matchFAQ(faqs, q);
    if (hit) {
      setTimeout(() => {
        setMessages((cur) =>
          cur.map((m) =>
            m.id === botTyping.id
              ? { ...m, typing: false, text: hit.answer }
              : m
          )
        );
        setBusy(false);
        if (!open && !unread) setUnread(true);
      }, 250);
      return;
    }

    // 2) Otherwise call Gemini backend
    (async () => {
      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: q,
            sessionId,
            // pass trimmed history if you want
            history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        const data = await resp.json();
        const text = data?.text || data?.reply || 'Sorry, I do not know this yet.';
        setMessages((cur) =>
          cur.map((m) =>
            m.id === botTyping.id
              ? { ...m, typing: false, text }
              : m
          )
        );
      } catch (err) {
        setMessages((cur) =>
          cur.map((m) =>
            m.id === botTyping.id
              ? { ...m, typing: false, text: `[Error] ${String(err?.message || err)}` }
              : m
          )
        );
      } finally {
        setBusy(false);
        if (!open && !unread) setUnread(true);
      }
    })();
  }

  return (
    <>
      {/* Floating Chat Launcher */}
      <button
        aria-label="Open chat"
        title="Chat"
        className={`chat-launcher ${unread ? 'unread' : ''}`}
        onClick={() => (open ? closePanel() : openPanel())}
        disabled={busy}
      >
        <div className="pulse" aria-hidden="true" />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 2H4a2 2 0 0 0-2 2v13.5A2.5 2.5 0 0 0 4.5 20H18l4 4V4a2 2 0 0 0-2-2Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="10" r="1.2" fill="white" />
          <circle cx="12" cy="10" r="1.2" fill="white" />
          <circle cx="16" cy="10" r="1.2" fill="white" />
        </svg>
      </button>

      {/* Chat Panel */}
      <section
        role="dialog"
        aria-label="AI chat"
        aria-modal="false"
        className={`chat-panel ${open ? 'open' : ''}`}
      >
        <div className="cp-header">
          <div className="cp-title">{process.env.NEXT_PUBLIC_BRAND_NAME || 'cortif.ai'}</div>
          <div className="cp-actions">
            <button className="cp-btn" onClick={clearLog}>Clear</button>
            <button className="cp-btn" onClick={closePanel}>Close</button>
          </div>
        </div>

        <div ref={logRef} className="cp-log" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`row ${m.role}`}>
              <div className="bubble">
                <span>{m.text}</span>
                {m.typing && (
                  <span className="typing-dots" aria-label="Assistant is typing" role="status">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <form className="cp-form" onSubmit={submit}>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            placeholder="Ask about Slack, drift, setup…"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="cp-send" type="submit" disabled={busy}>Send</button>
        </form>
      </section>

      {/* UI/CSS — 1:1 with your HTML */}
      <style jsx global>{`
        :root {
          --bg: #000000;
          --panel: #111111;
          --bubble-user: #2e7d32;
          --bubble-bot: #1e1e1e;
          --ink: #ffffff;
          --muted: #9e9e9e;
          --border: #333333;
          --accent: #c6f36b;
        }
        * { box-sizing: border-box }
        body { margin:0; background:var(--bg); color: var(--ink); font: 15px/1.45 ui-sans-serif, system-ui }

        .chat-launcher {
          position: fixed !important;
          right: 18px !important;
          bottom: 18px !important;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--accent);
          color: black;
          display: grid !important;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(0,0,0,.45);
          z-index: 2147483647 !important;
          transition: transform .12s ease;
          border: none;
        }
        .chat-launcher:active { transform: scale(.98) }

        .pulse {
          position:absolute; top:-2px; right:-2px; width:14px; height:14px; border-radius:50%;
          background:#ff6b6b; border:2px solid var(--bg); display:none;
        }
        .chat-launcher.unread .pulse { display:block; }

        .chat-panel {
          position: fixed;
          right: 18px; bottom: 84px;
          width: min(360px, 92vw);
          height: 460px;
          display: none;
          grid-template-rows: auto 1fr auto;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 50px rgba(0,0,0,.5);
          z-index: 2147483647 !important;
        }
        .chat-panel.open { display: grid; }

        .cp-header {
          display:flex; align-items:center; justify-content:space-between;
          padding: 10px 12px; border-bottom: 1px solid var(--border);
          background: var(--accent);
          color: black;
          font-weight: 600;
        }
        .cp-title { font-size: 14px; letter-spacing:.2px; }
        .cp-actions { display:flex; gap:6px }
        .cp-btn {
          font: inherit; font-size: 12px; padding: 6px 8px;
          border-radius: 10px; border: 1px solid var(--border);
          background: #222;
          color: var(--ink); cursor: pointer;
        }

        .cp-log {
          padding: 12px; overflow:auto; display:flex; flex-direction:column; gap: 8px;
          background: #0b0b0b;
        }
        .row { display: flex; }
        .row.user { justify-content: flex-end; }
        .row.bot  { justify-content: flex-start; }
        .bubble {
          max-width: 80%; padding: 9px 11px; border-radius: 12px; white-space: pre-wrap;
          border: 1px solid var(--border);
        }
        .user .bubble { background: #2c2c2c; color: #ffffff; }
        .bot .bubble  { background: #1a1a1a; color: #e0e0e0; }

        .cp-form {
          display:grid; grid-template-columns: 1fr auto; gap: 8px;
          padding: 10px; border-top: 1px solid var(--border); background: rgba(0,0,0,.4);
        }
        .cp-input {
          padding: 10px 12px; border-radius: 12px; border:1px solid var(--border);
          background:#1a1a1a; color: var(--ink); outline:none;
        }
        .cp-send {
          padding: 10px 14px; border-radius: 12px;
          background: var(--accent); color:black; font-weight:600; cursor:pointer; border:none;
        }
        .cp-send:disabled { opacity:.6; cursor:not-allowed }

        .typing-dots {
          display: inline-flex;
          gap: 4px;
          margin-left: 6px;
          vertical-align: -2px;
        }
        .typing-dots .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--ink);
          opacity: .6;
          animation: bounce 1s infinite ease-in-out;
        }
        .typing-dots .dot:nth-child(2) { animation-delay: .15s; }
        .typing-dots .dot:nth-child(3) { animation-delay: .30s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .45; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
