import React, { useState } from "react";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { KB_DOCUMENT_COUNT, KB_EXAMPLE_QUESTIONS } from "../data/mockData";
import { docIconFor, getConfidenceTier } from "../utils/documentUtils";

function RichText({ text }) {
  return (
    <div style={{ whiteSpace: "pre-line" }}>
      {text.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={idx}>{part.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </div>
  );
}

export default function ProjectAssistantDrawer({
  isOpen,
  onOpen,
  onClose,
  project,
  repositoryDocs,
  messages,
  recentSearches,
  onAskQuestion,
  onClearChat,
}) {
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [mascotFailed, setMascotFailed] = useState(false);

  const submitQuestion = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setInput("");
    setSearching(true);
    setTimeout(() => {
      onAskQuestion(trimmed);
      setSearching(false);
    }, 350);
  };

  return (
    <>
      <button className="btn btn-primary assistant-fab" onClick={onOpen}>
        {!mascotFailed ? (
          <img
            src="/assets/mascot.png"
            alt="BauDackel mascot"
            className="assistant-fab-mascot"
            onError={() => setMascotFailed(true)}
          />
        ) : (
          <span>💬</span>
        )}
        <span>Project Assistant</span>
      </button>

      {isOpen && (
        <div className="drawer-backdrop" onClick={onClose}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between">
              <div className="flex-row">
                {!mascotFailed ? (
                  <img
                    src="/assets/mascot.png"
                    alt="BauDackel mascot"
                    className="assistant-header-mascot"
                    onError={() => setMascotFailed(true)}
                  />
                ) : (
                  <span style={{ fontSize: "1.15rem" }}>💬</span>
                )}
                <strong style={{ fontSize: "1.02rem" }}>Project Assistant</strong>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close assistant">
                <X size={16} />
              </button>
            </div>

            <div className="flex-between">
              <span className="caption">
                {project} · {repositoryDocs.length} repo docs
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={!messages.length}
                onClick={onClearChat}
              >
                <MessageSquarePlus size={14} /> New chat
              </button>
            </div>

            <div className="chat-history">
              {messages.length === 0 && (
                <div className="chat-bubble assistant">
                  Hi John. Ask me anything about your project memory and documents.
                </div>
              )}

              {messages.map((msg, idx) =>
                msg.role === "user" ? (
                  <div key={idx} className="chat-bubble user">
                    {msg.content}
                  </div>
                ) : (
                  <div key={idx} className="chat-bubble assistant stack-sm">
                    <div className="caption" style={{ margin: 0 }}>
                      Answer summary
                    </div>
                    <RichText text={msg.answer} />
                    {msg.documents?.length > 0 && (
                      <div className="stack-sm">
                        <div className="caption" style={{ margin: 0 }}>
                          Relevant documents
                        </div>
                        {msg.documents.map(([icon, title, meta], dIdx) => (
                          <div key={dIdx} style={{ fontSize: "0.8rem" }}>
                            <div>
                              {icon} <strong>{title}</strong>
                            </div>
                            <div className="caption" style={{ margin: 0 }}>
                              {meta}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      {(() => {
                        const tier = getConfidenceTier(msg.confidence);
                        return (
                          <span className={`badge badge-${tier.color}`}>
                            Confidence: {tier.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )
              )}

              {searching && (
                <div className="chat-bubble assistant caption">
                  Searching {KB_DOCUMENT_COUNT} project documents…
                </div>
              )}
            </div>

            <div className="stack-sm" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
              <div className="caption" style={{ margin: 0 }}>
                <strong>Suggested questions</strong>
              </div>
              <div className="flex-row">
                {KB_EXAMPLE_QUESTIONS.slice(0, 3).map((q) => (
                  <button key={q} className="pill-btn" onClick={() => submitQuestion(q)}>
                    {q}
                  </button>
                ))}
              </div>
              <form
                className="flex-row"
                style={{ flexWrap: "nowrap" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitQuestion(input);
                }}
              >
                <input
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Search project memory…"
                />
                <button className="btn btn-primary" type="submit" aria-label="Send">
                  <Send size={15} />
                </button>
              </form>
            </div>

            <details className="expander">
              <summary>Recent searches</summary>
              <div className="flex-row" style={{ marginTop: 8 }}>
                {recentSearches.length ? (
                  recentSearches.map((q) => (
                    <button key={q} className="pill-btn" onClick={() => submitQuestion(q)}>
                      {q}
                    </button>
                  ))
                ) : (
                  <span className="caption">No recent searches yet.</span>
                )}
              </div>
            </details>

            <details className="expander">
              <summary>Recent documents</summary>
              <div className="stack-sm" style={{ marginTop: 8 }}>
                {repositoryDocs.slice(0, 4).map((doc) => (
                  <div key={doc.id} style={{ fontSize: "0.8rem" }}>
                    <div>
                      {docIconFor(doc.name, doc.type)} <strong>{doc.name}</strong>
                    </div>
                    <div className="caption" style={{ margin: 0 }}>
                      {doc.type} · {doc.date_label} · {doc.status}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
    </>
  );
}
