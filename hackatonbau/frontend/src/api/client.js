// Vite proxies /api to Express in development. Set VITE_API_URL for remote deployments.
export const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
export async function api(path, options={}) {
  const response = await fetch(`${API}${path}`, options)
  let data
  try { data = await response.json() } catch { throw new Error(`Unexpected API response (${response.status})`) }
  if (!response.ok) throw new Error(data.error || `API error ${response.status}`)
  return data
}
export function formRequest(path, fields, file, fileField="file") {
  const body = new FormData()
  Object.entries(fields).forEach(([key,value]) => body.append(key,String(value ?? "")))
  if (file) body.append(fileField,file,file.name)
  return api(path,{method:"POST",body})
}
export const projectQuery = project => `?project=${encodeURIComponent(project)}`
export const fileUrl = path => `${API}${path}`
