import React, { useEffect, useRef, useState } from "react"
import { MessageSquarePlus, Send, X } from "lucide-react"
import { KB_EXAMPLE_QUESTIONS } from "../data/mockData"
import { api, fileUrl, projectQuery } from "../api/client"

function RichText({text=""}) {
  return <div style={{whiteSpace:"pre-line"}}>
    {text.split(/(\*\*.*?\*\*)/g).map((part,i)=>
      part.startsWith("**")&&part.endsWith("**")
        ? <strong key={i}>{part.slice(2,-2)}</strong>
        : <React.Fragment key={i}>{part}</React.Fragment>
    )}
  </div>
}

export default function ProjectAssistantDrawer({
  isOpen,
  onOpen,
  onClose,
  project,
  repositoryDocs=[]
}) {
  const [input,setInput]=useState("")
  const [chat,setChat]=useState([])
  const [searching,setSearching]=useState(false)
  const [searches,setSearches]=useState([])
  const [evidenceCount,setEvidenceCount]=useState(null)
  const [mascotFailed,setMascotFailed]=useState(false)
  const bottomRef=useRef(null)

  useEffect(()=>{
    setChat([])
    setSearches([])
    setInput("")
  },[project])

  useEffect(()=>{
    if(!isOpen)return

    let active=true

    api(`/api/evidence${projectQuery(project)}`)
      .then(data=>{
        if(active)setEvidenceCount((data.items||[]).length)
      })
      .catch(()=>{
        if(active)setEvidenceCount(null)
      })

    return()=>{active=false}
  },[isOpen,project,repositoryDocs.length])

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({
      behavior:"smooth",
      block:"end"
    })
  },[chat,searching])

  const submitQuestion=async value=>{
    const question=String(value||"").trim()

    if(!question||searching)return

    const history=chat.slice(-6).map(message=>({
      role:message.role,
      content:message.role==="user"
        ? message.content
        : message.answer
    }))

    setInput("")
    setSearching(true)

    setSearches(prev=>[
      question,
      ...prev.filter(x=>x!==question)
    ].slice(0,8))

    setChat(prev=>[
      ...prev,
      {role:"user",content:question}
    ])

    try{
      const data=await api("/api/knowledge/search",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          project,
          question,
          history
        })
      })

      setChat(prev=>[
        ...prev,
        data.result||{
          role:"assistant",
          answer:"No response returned.",
          documents:[],
          found:false
        }
      ])
    }catch(error){
      setChat(prev=>[
        ...prev,
        {
          role:"assistant",
          answer:`I couldn't reach the project assistant: ${error.message}`,
          documents:[],
          found:false,
          error:true
        }
      ])
    }finally{
      setSearching(false)
    }
  }

  return <>
    <button
      className="btn btn-primary assistant-fab"
      onClick={onOpen}
    >
      {!mascotFailed
        ? <img
            src="/assets/mascot.png"
            alt="BauDackel mascot"
            className="assistant-fab-mascot"
            onError={()=>setMascotFailed(true)}
          />
        : <span>💬</span>
      }
      <span>Project Assistant</span>
    </button>

    {isOpen&&(
      <div
        className="drawer-backdrop"
        onClick={onClose}
      >
        <div
          className="drawer-panel"
          onClick={e=>e.stopPropagation()}
        >
          <div className="flex-between">
            <div className="flex-row">
              {!mascotFailed
                ? <img
                    src="/assets/mascot.png"
                    alt="BauDackel mascot"
                    className="assistant-header-mascot"
                    onError={()=>setMascotFailed(true)}
                  />
                : <span>💬</span>
              }

              <strong style={{fontSize:"1.02rem"}}>
                Project Assistant
              </strong>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close assistant"
            >
              <X size={16}/>
            </button>
          </div>

          <div className="flex-between">
            <span className="caption">
              {project} ·{" "}
              {evidenceCount===null
                ? "Evidence loading"
                : `${evidenceCount} uploads`
              }{" "}
              · {repositoryDocs.length} saved reports
            </span>

            <button
              className="btn btn-ghost btn-sm"
              disabled={!chat.length}
              onClick={()=>setChat([])}
            >
              <MessageSquarePlus size={14}/>
              New chat
            </button>
          </div>

          <div className="chat-history">
            {chat.length===0&&(
              <div className="chat-bubble assistant">
                Ask me about this project's recordings,
                incidents, progress, equipment or saved reports.
                I'll cite the records I use.
              </div>
            )}

            {chat.map((message,index)=>
              message.role==="user"
                ? <div
                    key={index}
                    className="chat-bubble user"
                  >
                    {message.content}
                  </div>
                : <div
                    key={index}
                    className="chat-bubble assistant stack-sm"
                  >
                    <div
                      className="caption"
                      style={{margin:0}}
                    >
                      Project answer
                    </div>

                    <RichText text={message.answer}/>

                    {message.documents?.length>0&&(
                      <div className="stack-sm">
                        <div
                          className="caption"
                          style={{margin:0}}
                        >
                          <strong>Referenced sources</strong>
                        </div>

                        {message.documents.map(
                          ([icon,name,type,url],sourceIndex)=>(
                            <div
                              key={`${name}-${sourceIndex}`}
                              style={{fontSize:"0.8rem"}}
                            >
                              <div>
                                {icon}{" "}
                                {url
                                  ? <a
                                      href={fileUrl(url)}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <strong>{name}</strong>
                                    </a>
                                  : <strong>{name}</strong>
                                }
                              </div>

                              <div
                                className="caption"
                                style={{margin:0}}
                              >
                                {type}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <span
                      className={`badge badge-${
                        message.error
                          ? "red"
                          : message.found
                            ? "green"
                            : "gray"
                      }`}
                    >
                      {message.error
                        ? "Service error"
                        : message.found
                          ? `${message.source_count||message.documents?.length||0} source(s) cited`
                          : "Not verified"
                      }
                    </span>
                  </div>
            )}

            {searching&&(
              <div className="chat-bubble assistant caption">
                Qwen is reading this project's records…
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          <div
            className="stack-sm"
            style={{
              borderTop:"1px solid #e2e8f0",
              paddingTop:10
            }}
          >
            <div
              className="caption"
              style={{margin:0}}
            >
              <strong>Suggested questions</strong>
            </div>

            <div className="flex-row">
              {KB_EXAMPLE_QUESTIONS.slice(0,3).map(question=>(
                <button
                  key={question}
                  className="pill-btn"
                  disabled={searching}
                  onClick={()=>submitQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>

            <form
              className="flex-row"
              style={{flexWrap:"nowrap"}}
              onSubmit={e=>{
                e.preventDefault()
                submitQuestion(input)
              }}
            >
              <input
                className="input"
                value={input}
                onChange={e=>setInput(e.target.value)}
                placeholder="Ask about this project…"
                maxLength={1600}
              />

              <button
                className="btn btn-primary"
                type="submit"
                disabled={searching||!input.trim()}
                aria-label="Send"
              >
                <Send size={15}/>
              </button>
            </form>
          </div>

          <details className="expander">
            <summary>Recent searches</summary>

            <div
              className="flex-row"
              style={{marginTop:8}}
            >
              {searches.length
                ? searches.map(question=>(
                    <button
                      key={question}
                      className="pill-btn"
                      disabled={searching}
                      onClick={()=>submitQuestion(question)}
                    >
                      {question}
                    </button>
                  ))
                : <span className="caption">
                    No recent questions yet.
                  </span>
              }
            </div>
          </details>

          <details className="expander">
            <summary>Recent documents</summary>

            <div
              className="stack-sm"
              style={{marginTop:8}}
            >
              {repositoryDocs.length
                ? repositoryDocs.slice(0,4).map(doc=>(
                    <div
                      key={doc.id}
                      style={{fontSize:"0.8rem"}}
                    >
                      <a
                        href={fileUrl(doc.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📄 {doc.name}
                      </a>

                      <div
                        className="caption"
                        style={{margin:0}}
                      >
                        {doc.type} · {doc.date_label}
                      </div>
                    </div>
                  ))
                : <span className="caption">
                    No exported reports yet.
                    Uploaded evidence is still searchable.
                  </span>
              }
            </div>
          </details>
        </div>
      </div>
    )}
  </>
}