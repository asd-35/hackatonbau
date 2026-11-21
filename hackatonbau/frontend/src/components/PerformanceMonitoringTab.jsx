import React, { useEffect, useMemo, useState } from "react"
import { AlertTriangle, FileText, Plus, Save, Scale, Upload } from "lucide-react"
import { api, projectQuery } from "../api/client"
import { varianceIndicator } from "../utils/documentUtils"

const blank=()=>({id:crypto.randomUUID(),Activity:"",Trade:"","Planned Progress":0,"Actual Progress":0,"Planned Completion":"","Actual Completion":"","Root Cause":""})
const daysBetween=(date1,date2)=>{
  if(!date1 || !date2) return 0
  const a=new Date(date1),b=new Date(date2)
  if(Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.max(0,Math.ceil((b-a)/86400000))
}
const number=(v)=>Math.min(100,Math.max(0,Number(v)||0))

export default function PerformanceMonitoringTab({project,onCreateDelayNotice,onGenerateReport,onReviewEvidence}) {
  const [rows,setRows]=useState([])
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState("")
  useEffect(()=>{let alive=true;setRows([]);api(`/api/schedule${projectQuery(project)}`).then(v=>{if(alive)setRows(v.items||[]) }).catch(e=>{if(alive)setMessage(e.message)});return()=>{alive=false}},[project])
  const update=(idx,field,value)=>setRows(prev=>prev.map((r,i)=>i===idx?{...r,[field]:value}:r))
  const save=async()=>{
    setBusy(true)
    try {const res=await api("/api/schedule",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({project,items:rows})});setRows(res.items);setMessage("Saved actual and planned progress for this project") }
    catch(e){setMessage(`Save failed: ${e.message}`)}
    finally{setBusy(false)}
  }
  const importCsv=async(file)=>{
    if(!file)return
    const text=await file.text()
    const lines=text.trim().split(/\r?\n/)
    const splitCsv=line=>line.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)?.map(x=>x.replace(/,$/,"").replace(/^"|"$/g,"").replace(/""/g,'"')) || []
    const headers=splitCsv(lines[0]).map(v=>v.trim().toLowerCase().replace(/\s+/g,"_"))
    const loaded=lines.slice(1).filter(Boolean).map(line=>{
      const cells=splitCsv(line),get=(...keys)=>{let i=-1;for(const k of keys){i=headers.indexOf(k);if(i>=0)break}return i<0?"":cells[i]||""}
      return {id:crypto.randomUUID(),Activity:get("activity","task"),Trade:get("trade"),"Planned Progress":number(get("planned_progress","planned")),"Actual Progress":number(get("actual_progress","actual")),"Planned Completion":get("planned_completion","planned_date"),"Actual Completion":get("actual_completion","actual_date"),"Root Cause":get("root_cause","reason")}
    }).filter(r=>r.Activity)
    if(!loaded.length){setMessage("CSV needs an Activity column and progress values");return}
    setRows(loaded);setMessage(`Imported ${loaded.length} rows. Click Save schedule to persist.`)
  }
  const summary=useMemo(()=>{
    if(!rows.length)return null
    const total=rows.length
    const planned=Math.round(rows.reduce((n,r)=>n+number(r["Planned Progress"]),0)/total)
    const actual=Math.round(rows.reduce((n,r)=>n+number(r["Actual Progress"]),0)/total)
    const alerts=rows.map(r=>({...r,variance:number(r["Actual Progress"])-number(r["Planned Progress"]),delay:daysBetween(r["Planned Completion"],r["Actual Completion"])})).filter(r=>r.variance < -10 || r.delay>5)
    return {planned,actual,variance:actual-planned,alerts,onTrack:rows.filter(r=>number(r["Actual Progress"])>=number(r["Planned Progress"])).length}
  },[rows])
  return <div className="stack">
    <div className="flex-between"><div><h2 className="section-title">Project Performance Monitoring</h2><p className="caption">Actual project figures only. Import a plan or enter activities, then save to compare progress and detect delays.</p></div><span className="badge badge-blue">{project}</span></div>
    <div className="card stack-sm"><div className="flex-row"><button className="btn" onClick={()=>setRows(prev=>[...prev,blank()])}><Plus size={14}/> Add activity</button><label className="btn" style={{cursor:"pointer"}}><Upload size={14}/> Import CSV <input type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={e=>{importCsv(e.target.files?.[0]);e.target.value=""}}/></label><button className="btn btn-primary" disabled={busy} onClick={save}><Save size={14}/> {busy?"Saving…":"Save schedule"}</button></div>{message && <div className="alert alert-info">{message}</div>}<p className="caption">CSV columns: Activity, Trade, Planned Progress, Actual Progress, Planned Completion, Actual Completion, Root Cause. Dates use YYYY-MM-DD.</p></div>
    {!rows.length ? <div className="alert alert-info">No real schedule entered yet. We removed the prefilled mock KPIs to avoid presenting invented delays as live project data.</div> : <>
      <div className="grid-5"><div className="metric-box"><div className="metric-label">Activities</div><div className="metric-value">{rows.length}</div></div><div className="metric-box"><div className="metric-label">Planned Progress</div><div className="metric-value">{summary.planned}%</div></div><div className="metric-box"><div className="metric-label">Actual Progress</div><div className="metric-value">{summary.actual}%</div></div><div className="metric-box"><div className="metric-label">Variance</div><div className="metric-value">{summary.variance>0?"+":""}{summary.variance}%</div></div><div className="metric-box"><div className="metric-label">Deviation Alerts</div><div className="metric-value">{summary.alerts.length}</div></div></div>
      <div className="card stack-sm"><strong>Planned vs actual average completion</strong><div className="progress-wrap"><div className="progress-label">Planned · {summary.planned}%</div><div className="progress-track"><div className="progress-fill navy" style={{width:`${summary.planned}%`}}/></div></div><div className="progress-wrap"><div className="progress-label">Actual · {summary.actual}%</div><div className="progress-track"><div className="progress-fill" style={{width:`${summary.actual}%`}}/></div></div></div>
      <h2 className="section-title">Planned vs Actual Comparison</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Activity</th><th>Trade</th><th>Plan %</th><th>Actual %</th><th>Plan completion</th><th>Actual completion</th><th>Variance</th><th></th></tr></thead><tbody>{rows.map((r,i)=>{const delta=number(r["Actual Progress"])-number(r["Planned Progress"]);return <tr key={r.id||i}><td><input className="input" value={r.Activity} onChange={e=>update(i,"Activity",e.target.value)} placeholder="e.g. Install windows"/></td><td><input className="input" value={r.Trade||""} onChange={e=>update(i,"Trade",e.target.value)} /></td><td><input className="input" type="number" min="0" max="100" value={r["Planned Progress"]} onChange={e=>update(i,"Planned Progress",e.target.value)}/></td><td><input className="input" type="number" min="0" max="100" value={r["Actual Progress"]} onChange={e=>update(i,"Actual Progress",e.target.value)}/></td><td><input className="input" type="date" value={r["Planned Completion"]||""} onChange={e=>update(i,"Planned Completion",e.target.value)} /></td><td><input className="input" type="date" value={r["Actual Completion"]||""} onChange={e=>update(i,"Actual Completion",e.target.value)} /></td><td><span className={`badge badge-${varianceIndicator(delta).color}`}>{delta>0?"+":""}{delta}%</span></td><td><button className="btn btn-danger-ghost btn-sm" onClick={()=>setRows(prev=>prev.filter((_,n)=>n!==i))}>Remove</button></td></tr>})}</tbody></table></div>
      <h2 className="section-title">Delay Detection & Deviation Alerts</h2>{summary.alerts.length ? summary.alerts.map(r=><div className="card stack-sm" key={r.id}><div className="flex-row"><strong>{r.Activity}</strong><span className="badge badge-red"><AlertTriangle size={12}/> {r.variance}% behind plan{r.delay>0?` · +${r.delay} days`:""}</span></div><label className="field-label">Root cause (confirm against actual evidence)</label><input className="input" value={r["Root Cause"]||""} onChange={e=>{const idx=rows.findIndex(s=>s.id===r.id);update(idx,"Root Cause",e.target.value)}} placeholder="Enter confirmed root cause"/><div className="flex-row"><button className="btn btn-primary btn-sm" onClick={()=>onCreateDelayNotice(r.Activity,r["Root Cause"] || "Root cause not confirmed",r.delay)}><Scale size={14}/> Draft notice</button><button className="btn btn-sm" onClick={onGenerateReport}><FileText size={14}/> Daily report</button><button className="btn btn-sm" onClick={onReviewEvidence}>Review evidence</button></div></div>) : <p className="caption">No activities currently exceed the thresholds (progress &lt; -10 percentage points or confirmed completion more than 5 days late).</p>}
    </>}
  </div>
}
