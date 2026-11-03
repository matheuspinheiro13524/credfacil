type AnyRow = any;
function getTable(t: string): AnyRow[] {
  try { return JSON.parse(localStorage.getItem(t) || '[]'); } catch { return []; }
}
function setTable(t: string, v: AnyRow[]) {
  localStorage.setItem(t, JSON.stringify(v));
}
function makeQuery(t: string) {
  const query: any = {
    _table: t,
    _filters: [] as any[],
    eq(col: string, val: any) {
      query._filters.push({col, val});
      return query;
    },
    select() { return query; },
    order() { return query; },
    limit() { return query; },
    single() {
      let data = getTable(t);
      for (const f of query._filters) data = data.filter((r:any)=>r[f.col]==f.val);
      return Promise.resolve({ data: data[0] || null, error: null });
    },
    then(resolve: any) {
      let data = getTable(t);
      for (const f of query._filters) data = data.filter((r:any)=>r[f.col]==f.val);
      resolve({ data, error: null });
    }
  };
  query.insert = (vals: any) => {
    const arr = Array.isArray(vals) ? vals : [vals];
    const cur = getTable(t);
    const withIds = arr.map((v:any)=>({ id: (Date.now()+Math.random()).toString(), created_at: new Date().toISOString(), ...v }));
    setTable(t, [...cur, ...withIds]);
    return Promise.resolve({ data: withIds, error: null });
  };
  query.update = (vals: any) => {
    return {
      eq(col: string, val: any) {
        const cur = getTable(t);
        const upd = cur.map((r:any)=> r[col]==val ? {...r, ...vals} : r);
        setTable(t, upd);
        return Promise.resolve({ data: upd, error: null });
      }
    };
  };
  query.delete = () => {
    return {
      eq(col: string, val: any) {
        const cur = getTable(t);
        const fil = cur.filter((r:any)=> r[col]!=val);
        setTable(t, fil);
        return Promise.resolve({ data: null, error: null });
      }
    };
  };
  return query;
}
export const supabase: any = {
  from: (t: string) => makeQuery(t),
  auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
  storage: { from: () => ({ upload: () => Promise.resolve({ data: null, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
};
