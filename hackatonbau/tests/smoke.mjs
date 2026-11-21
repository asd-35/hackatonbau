// Run against Express + local AI services with Node 22: node tests/smoke.mjs
import assert from "node:assert/strict"
const base = process.env.API_BASE || "http://127.0.0.1:3000"
async function json(path, options={}) {
  const res=await fetch(`${base}${path}`,options)
  const body=await res.json()
  assert.ok(res.ok, `${path} failed (${res.status}): ${JSON.stringify(body)}`)
  return body
}
console.log("Health",await json("/api/health"))
const project="SmokeTest-Local"
const text="Five workers installed twenty doors. Three doors were damaged."
const fd=new FormData()
fd.append("project",project)
fd.append("file",new Blob([text],{type:"text/plain"}),"site-note.txt")
const uploaded=(await json("/api/evidence",{method:"POST",body:fd})).item
console.log("Uploaded",uploaded.name,uploaded.id)
try {
  const list=await json(`/api/evidence?project=${encodeURIComponent(project)}`)
  assert.ok(list.items.some(item=>item.id===uploaded.id))
  const searched=await json("/api/knowledge/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project,question:"doors damaged"})})
  assert.ok(searched.result.documents.length>0,"Evidence should appear in search")
  const plan=await json("/api/schedule",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({project,items:[{Activity:"Install doors",Trade:"Joinery","Planned Progress":80,"Actual Progress":60}]})})
  assert.equal(plan.items[0].Activity,"Install doors")
  const planGet=await json(`/api/schedule?project=${encodeURIComponent(project)}`)
  assert.equal(planGet.items.length,1)
  console.log("Evidence, search, schedule: passed")
  const health=await json("/api/health")
  if(health.services.qwen==="ready") {
    const result=await json("/api/drafts/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project,evidenceIds:[uploaded.id],reportType:"Daily Construction Report"})})
    assert.equal(typeof result.report,"object")
    console.log("Qwen draft endpoint: returned report",result.report)
  } else console.log("Qwen offline; GPU inference test skipped")
} finally {
  await fetch(`${base}/api/evidence/${uploaded.id}`,{method:"DELETE"})
  await json("/api/schedule",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({project,items:[]})})
}
console.log("Smoke test complete")
