
export const supabase: any = {
  from: (table: string) => ({
    select: () => {
      try {
        const d = JSON.parse(localStorage.getItem(table) || '[]')
        return Promise.resolve({ data: d, error: null })
      } catch { return Promise.resolve({ data: [], error: null }) }
    },
    insert: (vals: any) => {
      const cur = JSON.parse(localStorage.getItem(table) || '[]')
      const arr = Array.isArray(vals) ? vals : [vals]
      const news = arr.map((v: any) => ({ id: Date.now().toString(), ...v }))
      localStorage.setItem(table, JSON.stringify([...cur, ...news]))
      return Promise.resolve({ data: news, error: null })
    },
    update: (vals: any) => ({
      eq: (c: string, id: any) => {
        const cur = JSON.parse(localStorage.getItem(table) || '[]')
        const upd = cur.map((x: any) => x.id === id ? { ...x, ...vals } : x)
        localStorage.setItem(table, JSON.stringify(upd))
        return Promise.resolve({ data: upd, error: null })
      }
    }),
    delete: () => ({
      eq: (c: string, id: any) => {
        const cur = JSON.parse(localStorage.getItem(table) || '[]')
        const fil = cur.filter((x: any) => x.id !== id)
        localStorage.setItem(table, JSON.stringify(fil))
        return Promise.resolve({ data: null, error: null })
      }
    })
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
}
