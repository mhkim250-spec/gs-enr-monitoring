"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SAMPLE_QUESTIONS = [
  "이번 주 주요 행사를 알려줘",
  "최신 에너지·기후 뉴스를 요약해줘",
  "기후대응위 주요 일정을 알려줘",
];

export default function SiteTools() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "안녕하세요! 행사, 뉴스, 에너지·기후 정책 등 무엇이든 물어보세요.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > 480);
    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (questionText: string) => {
    const question = questionText.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "답변을 만들지 못했습니다.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (reason) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reason instanceof Error ? reason.message : "잠시 후 다시 질문해 주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <>
      {showBackToTop && !open && (
        <button
          type="button"
          aria-label="맨 위로 이동"
          title="맨 위로"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed",
            right: 20,
            bottom: 96,
            zIndex: 80,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 42,
            padding: "0 14px",
            border: "1px solid rgba(255,255,255,.5)",
            borderRadius: 999,
            background: "#066ca8",
            color: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,.2)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <span aria-hidden="true">↑</span>
          <span>맨 위로</span>
        </button>
      )}

      <div className={`chatbot ${open ? "open" : ""}`}>
        <button
          className="chatbot-launcher"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="AI 도우미 열기"
        >
          <img src="/spitz-bot.png" alt="하얀 스피츠 AI 도우미" />
          <span>무엇이든 물어보세요</span>
        </button>

        {open && (
          <section className="chatbot-panel" aria-label="AI 채팅">
            <header>
              <img src="/spitz-bot.png" alt="" />
              <div>
                <strong>에너지</strong>
                <span>GS E&amp;R AI 도우미</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="채팅 닫기">
                ×
              </button>
            </header>
            <div className="chatbot-messages">
              {messages.map((message, index) => (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  {message.content}
                </div>
              ))}
              {loading && <div className="chat-message assistant typing">답변을 생각하고 있어요…</div>}
              <div ref={endRef} />
            </div>
            <div
              className="chatbot-samples"
              aria-label="샘플 질문"
              style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "0 14px 10px" }}
            >
              {SAMPLE_QUESTIONS.map((question) => (
                <button
                  type="button"
                  key={question}
                  disabled={loading}
                  onClick={() => void ask(question)}
                  style={{
                    border: "1px solid rgba(6,108,168,.22)",
                    borderRadius: 999,
                    background: "#f2f8fb",
                    color: "#075d90",
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: loading ? "default" : "pointer",
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
            <form onSubmit={submit}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 800))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="무엇이든 물어보세요"
                rows={2}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                전송
              </button>
            </form>
            <small>AI 답변은 중요한 업무에 활용하기 전 원문을 확인해 주세요.</small>
          </section>
        )}
      </div>
    </>
  );
}
