// MODO FÁCIL - Salva tudo no celular
const getData = (table: string) => {
  try { return JSON.parse(localStorage.getItem(table) || '[]') } catch { return [] }
}
const setData = (table: string, data: any) => {
  localStorage.setItem(table, JSON.stringify(data))
}

export const supabase: any = {
  from: (table: string) => {
    return {
      select: () => {
        const data = getData(table)
        return Promise.resolve({ data, error: null })
      },
      insert: (values: any) => {
        const current = getData(table)
        const toInsert = Array.isArray(values) ? values : [values]
        const newItems = toInsert.map((v: any) => ({ id: Date.now().toString() + Math.random(), ...v }))
        setData(table, [...current, ...newItems])
        return Promise.resolve({ data: newItems, error: null })
      },
      update: (values: any) => ({
        eq: (col: string, id: any) => {
          const current = getData(table)
          const updated = current.map((c: any) => c.id === id || c[col] === id ? { ...c, ...values } : c)
          setData(table, updated)
          return Promise.resolve({ data: updated, error: null })
        }
      }),
      delete: () => ({
        eq: (col: string, id: any) => {
          const current = getData(table)
          const filtered = current.filter((c: any) => c.id !== id && c[col] !== id)
          setData(table, filtered)
          return Promise.resolve({ data: null, error: null })
        }
      }),
      eq: function() { return this }
    }
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
}
