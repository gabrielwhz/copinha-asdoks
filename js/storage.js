// Camada de dados (Supabase). Mantém uma cópia local em S para as telas.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let S = { atl: [], draws: {} }, ME = null;
const atletasDe = cod => S.atl.filter(a => a.cod == cod);

async function carregar() {
  const a = await db.from("atletas").select("*").order("created_at");
  S.atl = a.data || [];
  if (ME.role == "admin") {
    const c = await db.from("chaves").select("*");
    (c.data || []).forEach(x => S.draws[x.cod] = x.pares);
  }
}
const dbAdd = row => db.from("atletas").insert(row).select().single();
const dbAddMany = rows => db.from("atletas").insert(rows).select();
const dbDel = id => db.from("atletas").delete().eq("id", id);
const dbSaveDraw = (cod, pares) => db.from("chaves").upsert({ cod, pares, updated_at: new Date().toISOString() });
async function dbClear() {
  const r = await db.from("atletas").delete().not("id", "is", null);
  if (!r.error) await db.from("chaves").delete().not("cod", "is", null);
  return r;
}
