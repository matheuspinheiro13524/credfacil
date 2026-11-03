
type AnyRow = any;
function getTable(t: string): AnyRow[] {
  try { return JSON.parse(localStorage.getItem(t) || '[]'); } catch { return []; }
}
function setTable(t: string, v: AnyRow[]) {
  localStorage.setItem(t, JSON.stringify(v));
}
function filterData(t: string, filters: any[]) {
  let data = getTable(t);
  for (const f of filters) data = data.filter((r:any)=> String(r[f.col]) == String(f.val));
  return data;
}
function makeQuery(t: string) {
  const query: any = {
    _table: t,
    _filters: [] as any[],
    eq(col: string, val: any) { query._filters.push({col, val}); return query; },
    neq(col: string, val: any) { query._filters.push({col, val, op:'neq'}); return query; },
    select() { return query; },
    order() { return query; },
    limit() { return query; },
    single() {
      const data = filterData(t, query._filters);
      return Promise.resolve({ data: data[0] || null, error: null });
    },
    maybeSingle() {
      const data = filterData(t, query._filters);
      return Promise.resolve({ data: data[0] || null, error: null });
    },
    then(resolve: any) {
      const data = filterData(t, query._filters);
      resolve({ data, error: null });
      return Promise.resolve({ data, error: null });
    }
  };
  const makeInsertResult = (rows: any[]) => {
    const res: any = Promise.resolve({ data: rows, error: null });
    res.select = () => Promise.resolve({ data: rows, error: null });
    return res;
  };
  query.insert = (vals: any) => {
    const arr = Array.isArray(vals) ? vals : [vals];
    const cur = getTable(t);
    const withIds = arr.map((v:any)=>({ id: (Date.now()+Math.random()).toString().slice(0,12), created_at: new Date().toISOString(), ...v }));
    setTable(t, [...cur, ...withIds]);
    return makeInsertResult(withIds);
  };
  query.update = (vals: any) => {
    const updObj: any = {
      eq(col: string, val: any) {
        const cur = getTable(t);
        const upd = cur.map((r:any)=> String(r[col])==String(val) ? {...r, ...vals} : r);
        setTable(t, upd);
        const filtered = upd.filter((r:any)=> String(r[col])==String(val));
        const res: any = Promise.resolve({ data: filtered, error: null });
        res.select = () => Promise.resolve({ data: filtered, error: null });
        res.eq = updObj.eq;
        return res;
      }
    };
    updObj.select = () => updObj;
    return updObj;
  };
  query.delete = () => {
    return {
      eq(col: string, val: any) {
        const cur = getTable(t);
        const fil = cur.filter((r:any)=> String(r[col])!=String(val));
        setTable(t, fil);
        const res: any = Promise.resolve({ data: null, error: null });
        res.select = () => Promise.resolve({ data: null, error: null });
        return res;
      }
    };
  };
  query.upsert = query.insert;
  return query;
}
export const supabase: any = {
  from: (t: string) => makeQuery(t),
  auth: { getUser: () => Promise.resolve({ data: { user: { id: 'local' } }, error: null }), getSession: () => Promise.resolve({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: ()=>{} } } }) },
  storage: { from: () => ({ upload: () => Promise.resolve({ data: { path: '' }, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }), list: () => Promise.resolve({ data: [], error: null }) }) },
  channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
  removeChannel: () => {}
};
