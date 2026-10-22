const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cur={view:"cadastro",mod:"kata",cod:1};
const catDe=cod=>CATEGORIAS.find(c=>c.cod==cod);
const tituloCat=c=>`${MODNOME[c.mod]} ${SEXNOME[c.sexo]} - ${nomeCat(c)} (Cód ${c.cod})`;

function go(v){cur.view=v;render()}
function setMod(m){cur.mod=m;cur.cod=CATEGORIAS.find(c=>c.mod==m).cod;render()}
function setCod(c){cur.cod=+c;render()}
function toast(msg,link){const t=$("#toast");t.innerHTML=`<span>${msg}</span>`+(link?`<button onclick="go('categorias')">Ver</button>`:"");t.style.display="flex";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",4000)}

function render(){
  if(!isAdmin()&&cur.view!="cadastro")cur.view="cadastro";
  document.querySelectorAll(".side nav button").forEach(b=>b.classList.toggle("on",b.dataset.v==cur.view));
  $("#view").innerHTML={cadastro:vCadastro,categorias:vCategorias,sumulas:vSumulas}[cur.view]();
  if(cur.view=="cadastro"){fillCat();lista()}
}
const seg=()=>`<div class="seg">${["kata","kumite"].map(m=>`<button class="${cur.mod==m?"on":""}" onclick="setMod('${m}')">${MODNOME[m]}</button>`).join("")}</div>`;

/* ---------- CADASTRO ---------- */
function vCadastro(){return `<h2>Cadastro de atletas</h2>
<div class="card"><div class="grid">
 <div><label>Nome completo</label><input id="nome"></div>
 <div><label>Idade</label><input id="idade" type="number" min="3" max="80" oninput="fillCat()"></div>
 <div><label>Sexo</label><select id="sexo" onchange="fillCat()"><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
 <div><label>Graduação (faixa)</label><select id="grad" onchange="fillCat()">${GRADS.map(g=>`<option>${g}</option>`).join("")}</select></div>
 <div><label>Academia / equipe</label><input id="acad"></div>
 <div><label>Modalidade</label><select id="mod" onchange="fillCat()"><option value="kata">Kata</option><option value="kumite">Kumitê</option></select></div>
 <div><label>Categoria</label><select id="cat"></select></div>
</div>
<p class="hint" id="dica"></p>
<div class="bar"><button class="btn" onclick="add()">Cadastrar atleta</button>${isAdmin()?`<button class="btn alt" onclick="gerarTabelaPDF()">Gerar tabela de atletas (PDF)</button><button class="btn alt" onclick="limpar()">Limpar tudo</button>`:""}</div></div>
<div class="card"><h3>${isAdmin()?"Atletas cadastrados":"Atletas que você cadastrou"} (<span id="qtd">0</span>)</h3><div class="tbl" id="lista"></div></div>`}

function fillCat(){
  const mod=$("#mod").value,sexo=$("#sexo").value,idade=+$("#idade").value,grad=$("#grad").value,sel=$("#cat");
  const m=idade?acharCat(mod,sexo,idade,grad):null,old=sel.value;
  sel.innerHTML=CATEGORIAS.filter(c=>c.mod==mod&&c.sexo==sexo).map(c=>`<option value="${c.cod}">Cód ${c.cod} - ${nomeCat(c)}</option>`).join("");
  sel.value=m?m.cod:(old&&sel.querySelector(`option[value="${old}"]`)?old:sel.options[0].value);
  $("#dica").textContent=!idade?"Informe a idade para sugerir a categoria automaticamente.":m?`Categoria sugerida: Cód ${m.cod}.`:"Nenhuma categoria compatível com essa idade/faixa. Escolha manualmente.";
}
async function add(){
  const nome=$("#nome").value.trim(),idade=+$("#idade").value;
  if(!nome||!idade){alert("Preencha nome e idade.");return}
  const cod=+$("#cat").value;
  const r=await dbAdd({nome,idade,sexo:$("#sexo").value,grad:$("#grad").value,acad:$("#acad").value.trim(),cod});
  if(r.error){alert(r.error.message);return}
  S.atl.push(r.data);delete S.draws[cod];$("#nome").value="";$("#nome").focus();lista();toast("Atleta cadastrado");
}
function lista(){
  $("#qtd").textContent=S.atl.length;
  $("#lista").innerHTML=S.atl.length?`<table><tr><th>Nome</th><th>Idade</th><th>Sexo</th><th>Faixa</th><th>Academia</th><th>Modalidade</th><th>Cód</th><th></th></tr>`+
   S.atl.slice().sort((a,b)=>a.cod-b.cod||a.nome.localeCompare(b.nome)).map(a=>`<tr><td>${esc(a.nome)}</td><td>${a.idade}</td><td>${a.sexo}</td><td>${a.grad}</td><td>${esc(a.acad)}</td><td>${MODNOME[catDe(a.cod).mod]}</td><td>${a.cod}</td><td><button class="x" onclick="del('${a.id}')">✕</button></td></tr>`).join("")+"</table>":`<div class="empty">Nenhum atleta cadastrado.</div>`;
}
async function del(id){
  const a=S.atl.find(x=>x.id==id),r=await dbDel(id);
  if(r.error){alert(r.error.message);return}
  if(a)delete S.draws[a.cod];S.atl=S.atl.filter(x=>x.id!=id);lista();
}
async function limpar(){
  if(!confirm("Apagar todos os atletas e sorteios?"))return;
  const r=await dbClear();if(r.error){alert(r.error.message);return}
  S.atl=[];S.draws={};lista();
}
function logoDataURL(){return new Promise(res=>{const i=new Image();
  i.onload=()=>{try{const c=document.createElement("canvas");c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext("2d").drawImage(i,0,0);res({d:c.toDataURL("image/png"),w:i.naturalWidth,h:i.naturalHeight})}catch(e){res(null)}};
  i.onerror=()=>res(null);i.src="assets/logo.png"})}

// Tabela com todos os atletas, separada por categoria (somente admin) - baixa em PDF
async function gerarTabelaPDF(){
  if(!isAdmin())return;
  if(!window.jspdf){alert("A biblioteca de PDF não carregou. Verifique a internet.");return}
  await carregar();
  const cats=CATEGORIAS.filter(c=>atletasDe(c.cod).length);
  if(!cats.length){alert("Nenhum atleta cadastrado.");return}
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),lg=await logoDataURL();
  let x=14;
  if(lg){const h=20,w=h*lg.w/lg.h;doc.addImage(lg.d,"PNG",14,8,w,h);x=14+w+4}
  doc.setFont("helvetica","bold").setFontSize(16).setTextColor(14,47,90).text("I COPINHA ASDOKS",x,17);
  doc.setFont("helvetica","normal").setFontSize(10).setTextColor(90,90,90).text(`Lista de atletas por categoria - ${S.atl.length} atletas - ${new Date().toLocaleDateString("pt-BR")}`,x,24);
  let y=34;
  cats.forEach(c=>{
    if(y>255){doc.addPage();y=16}
    const at=atletasDe(c.cod).slice().sort((a,b)=>a.nome.localeCompare(b.nome));
    doc.setFillColor(31,102,176).rect(14,y,182,8,"F");
    doc.setFont("helvetica","bold").setFontSize(10).setTextColor(255,255,255)
      .text(`${MODNOME[c.mod].toUpperCase()} ${SEXNOME[c.sexo].toUpperCase()} - COD ${c.cod} - ${nomeCat(c).replace(" · "," - ")}`,16,y+5.5)
      .text(`${at.length} atleta(s)`,194,y+5.5,{align:"right"});
    doc.autoTable({startY:y+8,margin:{left:14,right:14},theme:"grid",rowPageBreak:"avoid",
      styles:{fontSize:9,cellPadding:1.8,textColor:[26,36,51]},headStyles:{fillColor:[230,238,248],textColor:[14,47,90]},
      head:[["Nº","Nome","Idade","Faixa","Academia / equipe"]],
      body:at.map((a,i)=>[i+1,a.nome,a.idade,a.grad,a.acad||""]),
      columnStyles:{0:{cellWidth:10},2:{cellWidth:16},3:{cellWidth:26}}});
    y=doc.lastAutoTable.finalY+8;
  });
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal").setFontSize(8).setTextColor(120,120,120).text(`Página ${i} de ${n}`,105,290,{align:"center"})}
  doc.save("atletas-copinha-asdoks.pdf");
}

/* ---------- SÚMULA / CHAVE ---------- */
function sheet(cod){
  const c=catDe(cod),d=S.draws[cod],at=id=>S.atl.find(a=>a.id==id);
  const body=d?bracketSVG(d,id=>{const a=at(id);return a.nome+(a.acad?" - "+a.acad:"")}):`<div class="empty">Chave ainda não sorteada.</div>`;
  const faixas=[...new Set(atletasDe(cod).map(a=>a.grad))].sort((a,b)=>GRADS.indexOf(a)-GRADS.indexOf(b)).join(" e ");
  return `<div class="sheet"><div class="sh-head"><img src="assets/logo.png" alt=""><div><h3>I COPINHA ASDOKS</h3><p>Súmula de combate · ${MODNOME[c.mod]}</p></div></div>
  <div class="ttl">${esc(("Categoria "+SEXNOME[c.sexo]+" "+nomeCat(c)+(faixas?" - "+faixas:"")+" - Modalidade "+MODNOME[c.mod]+" - Cód "+c.cod).toUpperCase())}</div>${body}
  <div class="class"><h4>CLASSIFICAÇÃO</h4><div>1º</div><div>2º</div><div>3º</div><div>4º</div></div>
  <div class="sig">ÁRBITROS: ________________; ________________; ________________; ________________; ________________;<br>MESÁRIOS: ________________; ________________; ________________;</div></div>`;
}
function painel(cod){const d=S.draws[cod];
  return `<div class="bar"><button class="btn" onclick="sorteio(${cod})">${d?"Sortear novamente":"Sortear chave"}</button><button class="btn alt" onclick="window.print()" ${d?"":"disabled"}>Imprimir / PDF</button><button class="btn alt" onclick="baixar(${cod})" ${d?"":"disabled"}>Baixar chave (SVG)</button></div>`+sheet(cod)}
async function sorteio(cod){
  const ids=atletasDe(cod).map(a=>a.id);
  if(ids.length<2){alert("São necessários ao menos 2 atletas nesta categoria.");return}
  const p=sortear(ids),r=await dbSaveDraw(cod,p);
  if(r.error){alert(r.error.message);return}
  S.draws[cod]=p;render();toast(`Chave do Cód ${cod} enviada para Categorias`,cur.view=="sumulas");
}
function baixar(cod){
  const s=$("#svg");if(!s)return;
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([s.outerHTML],{type:"image/svg+xml"}));
  a.download=`chave-cod-${cod}.svg`;a.click();
}

/* ---------- CATEGORIAS ---------- */
function vCategorias(){
  const lista=CATEGORIAS.filter(c=>c.mod==cur.mod);
  const grupo=s=>`<h4>${SEXNOME[s]}</h4>`+lista.filter(c=>c.sexo==s).map(c=>`<button class="cat ${c.cod==cur.cod?"on":""}" onclick="setCod(${c.cod})"><b>Cód ${c.cod}</b><span>${nomeCat(c)}</span><i class="${S.draws[c.cod]?"ok":""}">${atletasDe(c.cod).length}${S.draws[c.cod]?" ✓":""}</i></button>`).join("");
  const at=atletasDe(cur.cod);
  return `<h2>Categorias</h2>${seg()}<div class="split"><div class="cats">${grupo("M")}${grupo("F")}</div><div>
  <div class="card"><h3>${esc(tituloCat(catDe(cur.cod)))} — ${at.length} atleta(s)</h3><div class="tbl">${at.length?`<table><tr><th>Nome</th><th>Idade</th><th>Faixa</th><th>Academia</th></tr>${at.map(a=>`<tr><td>${esc(a.nome)}</td><td>${a.idade}</td><td>${a.grad}</td><td>${esc(a.acad)}</td></tr>`).join("")}</table>`:`<div class="empty">Nenhum atleta nesta categoria.</div>`}</div></div>
  ${painel(cur.cod)}</div></div>`;
}

/* ---------- SÚMULAS ---------- */
function vSumulas(){
  return `<h2>Geração de súmulas</h2>${seg()}<div class="card"><label>Categoria</label><select onchange="setCod(this.value)">${CATEGORIAS.filter(c=>c.mod==cur.mod).map(c=>`<option value="${c.cod}" ${c.cod==cur.cod?"selected":""}>${SEXNOME[c.sexo]} · Cód ${c.cod} · ${nomeCat(c)} (${atletasDe(c.cod).length} atletas)${S.draws[c.cod]?" ✓":""}</option>`).join("")}</select>
  <p class="hint">Ao sortear, a chave é enviada automaticamente para a aba Categorias.</p></div>${painel(cur.cod)}`;
}

/* ---------- LOGIN / PERFIL ---------- */
const isAdmin=()=>ME&&ME.role=="admin";
async function sair(){await db.auth.signOut();location.href="login.html"}
async function init(){
  if(SUPABASE_URL.startsWith("COLE")){location.href="login.html";return}
  const {data:{session}}=await db.auth.getSession();
  if(!session){location.href="login.html";return}
  const p=await db.from("profiles").select("nome,role").eq("id",session.user.id).single();
  ME={id:session.user.id,nome:(p.data&&p.data.nome)||session.user.email,role:(p.data&&p.data.role)||"user"};
  $("#uNome").textContent=ME.nome;$("#uRole").textContent=isAdmin()?"Administrador":"Cadastro de atletas";
  document.querySelectorAll("[data-adm]").forEach(b=>b.style.display=isAdmin()?"":"none");
  await carregar();render();
}
init();
