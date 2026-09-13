export async function fetchAdminData<T>(table: string, params?: Record<string, string>): Promise<T[]> {
  const qs = new URLSearchParams({ table, ...params })
  const res = await fetch(`/api/admin-data?${qs.toString()}`)
  if (!res.ok) return []
  return res.json()
}
