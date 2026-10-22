const $ = s => document.querySelector(s);
let modo = "entrar";
if (SUPABASE_URL.startsWith("COLE")) $("#msg").textContent = "Configure js/config.js com as chaves do Supabase.";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
db.auth.getSession().then(({ data }) => { if (data.session) location.href = "index.html"; });

function setModo(m) {
  modo = m;
  $("#tEntrar").classList.toggle("on", m == "entrar");
  $("#tCriar").classList.toggle("on", m == "criar");
  $("#boxNome").style.display = m == "criar" ? "block" : "none";
  $("#ok").textContent = m == "criar" ? "Criar conta" : "Entrar";
  $("#msg").textContent = "";
}
async function enviar() {
  const email = $("#email").value.trim(), password = $("#senha").value, nome = $("#nome").value.trim();
  const msg = t => $("#msg").textContent = t;
  if (!email || !password) return msg("Preencha e-mail e senha.");
  if (modo == "criar") {
    if (!nome) return msg("Informe seu nome.");
    if (password.length < 6) return msg("A senha precisa ter ao menos 6 caracteres.");
    const { data, error } = await db.auth.signUp({ email, password, options: { data: { nome } } });
    if (error) return msg(error.message);
    if (data.session) location.href = "index.html";
    else msg("Conta criada! Confirme o e-mail enviado e depois entre.");
  } else {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return msg("E-mail ou senha incorretos.");
    location.href = "index.html";
  }
}
document.addEventListener("keydown", e => { if (e.key == "Enter") enviar(); });
