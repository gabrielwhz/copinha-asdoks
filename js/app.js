console.log("ASDOKS build 12");
const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cur={view:"cadastro",mod:"kata",cod:1};
let editId=null;   // id do atleta que está sendo editado (null = cadastro novo)
const catDe=cod=>CATEGORIAS.find(c=>c.cod==cod);
const tituloCat=c=>`${MODNOME[c.mod]} ${SEXNOME[c.sexo]} - ${nomeCat(c)} (Cód ${c.cod})`;

function go(v){cur.view=v;editId=null;render()}
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
<div class="card"><div id="editBar" class="editbar" style="display:none"></div><div class="grid">
 <div><label>Nome completo</label><input id="nome"></div>
 <div><label>Idade</label><input id="idade" type="number" min="3" max="80" oninput="fillCat()"></div>
 <div><label>Sexo</label><select id="sexo" onchange="fillCat()"><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
 <div><label>Graduação (faixa)</label><select id="grad" onchange="fillCat()">${GRADS.map(g=>`<option>${g}</option>`).join("")}</select></div>
 <div><label>Academia / equipe</label><input id="acad"></div>
 <div><label>Modalidade</label><select id="mod" onchange="fillCat()"><option value="kata">Kata</option><option value="kumite">Kumitê</option><option value="ambas">Kata e Kumitê</option></select></div>
 <div id="boxKata"><label>Categoria de Kata</label><select id="catKata"></select></div>
 <div id="boxKumite"><label>Categoria de Kumitê</label><select id="catKumite"></select></div>
</div>
<div class="pcdrow">
 <div><label>Atleta PCD</label><label class="sw"><input type="checkbox" id="pcd" onchange="fillCat()"><span></span><b id="pcdTxt">OFF</b></label></div>
 <div id="boxPcd" style="display:none"><label>Qual a deficiência / condição?</label><input id="pcdDesc" placeholder="Descreva"></div>
</div>
<p class="hint" id="dica"></p>
<div class="bar"><button class="btn" id="btnSalvar" onclick="enviar()">Cadastrar atleta</button><button class="btn alt" id="btnCancel" style="display:none" onclick="cancelarEdicao()">Cancelar edição</button>${isAdmin()?`<button class="btn alt" onclick="gerarTabelaPDF()">Gerar tabela de atletas (PDF)</button>`:""}</div></div>
<div class="card"><h3>${isAdmin()?"Atletas cadastrados":"Atletas que você cadastrou"} (<span id="qtd">0</span>)</h3><div class="tbl" id="lista"></div></div>`}

function fillCat(){
  const mod=$("#mod").value,sexo=$("#sexo").value,idade=+$("#idade").value,grad=$("#grad").value,pcd=$("#pcd").checked,dica=[];
  $("#boxPcd").style.display=pcd?"":"none";$("#pcdTxt").textContent=pcd?"ON":"OFF";
  ["kata","kumite"].forEach(m=>{
    const sel=$(m=="kata"?"#catKata":"#catKumite"),box=$(m=="kata"?"#boxKata":"#boxKumite"),on=mod==m||mod=="ambas";
    box.style.display=on?"":"none";
    // PCD ligado: só categorias PCD. PCD desligado: só as categorias comuns.
    const lista=CATEGORIAS.filter(c=>c.mod==m&&c.sexo==sexo&&!!c.pcd==pcd);
    const x=idade?acharCat(m,sexo,idade,grad,pcd):null,old=sel.value;
    sel.innerHTML=lista.length?lista.map(c=>`<option value="${c.cod}">Cód ${c.cod} - ${nomeCat(c)}</option>`).join(""):`<option value="">Não há categoria${pcd?" PCD":""} de ${MODNOME[m]} para este sexo</option>`;
    sel.value=x?x.cod:(old&&sel.querySelector(`option[value="${old}"]`)?old:sel.options[0].value);
    if(on&&idade)dica.push(x?`${MODNOME[m]}: Cód ${x.cod}`:`${MODNOME[m]}: nenhuma categoria compatível, escolha manualmente`);
  });
  $("#dica").textContent=idade?"Sugerido - "+dica.join(" | "):"Informe a idade para sugerir as categorias automaticamente.";
}
// Ordem alfabética: ignora maiúsculas/minúsculas, acentos e espaços nas pontas
const porNome=(a,b)=>a.nome.trim().localeCompare(b.nome.trim(),"pt-BR",{sensitivity:"base"})||a.nome.localeCompare(b.nome,"pt-BR");
const norm=s=>String(s||"").trim().toLowerCase();
const modTxt=a=>a.kata_cod&&a.kumite_cod?"KATA E KUMITÊ":a.kata_cod?"KATA":"KUMITÊ";
function limpaChaves(...cods){cods.forEach(c=>{if(c)delete S.draws[c]})}

async function add(){
  const nome=$("#nome").value.trim(),idade=+$("#idade").value;
  if(!nome||!idade){alert("Preencha nome e idade.");return}
  const pcd=$("#pcd").checked,pcdDesc=$("#pcdDesc").value.trim();
  if(pcd&&!pcdDesc){alert("Descreva a deficiência / condição do atleta PCD.");return}
  const mod=$("#mod").value,sexo=$("#sexo").value,grad=$("#grad").value,acad=$("#acad").value.trim();
  const kata=mod!="kumite"?+$("#catKata").value:null,kumite=mod!="kata"?+$("#catKumite").value:null;
  if((mod!="kumite"&&!kata)||(mod!="kata"&&!kumite)){alert("Não há categoria disponível para essas opções.");return}
  // atleta já cadastrado? (mesmo nome, sexo, idade e faixa) -> adiciona a modalidade que falta, sem duplicar
  const ex=S.atl.find(a=>norm(a.nome)==norm(nome)&&a.sexo==sexo&&a.idade==idade&&a.grad==grad);
  if(ex){
    if(!!ex.pcd!==pcd){alert(`${ex.nome} já está cadastrado ${ex.pcd?"como PCD":"sem PCD"}. Ajuste a opção PCD para combinar com o cadastro.`);return}
    const falta={};
    if(kata&&!ex.kata_cod)falta.kata_cod=kata;
    if(kumite&&!ex.kumite_cod)falta.kumite_cod=kumite;
    if(!Object.keys(falta).length){alert(`${ex.nome} já está cadastrado em ${modTxt(ex)}.`);return}
    if(!confirm(`${ex.nome} já está cadastrado em ${modTxt(ex)}.\nAdicionar ${falta.kata_cod?"Kata":"Kumitê"} a esse cadastro?`))return;
    const r=await dbUpdate(ex.id,falta);
    if(r.error){alert(r.error.message);return}
    Object.assign(ex,r.data);limpaChaves(falta.kata_cod,falta.kumite_cod);
    $("#nome").value="";lista();toast("Modalidade adicionada ao atleta");return;
  }
  const r=await dbAdd({nome,idade,sexo,grad,acad,kata_cod:kata,kumite_cod:kumite,pcd,pcd_descricao:pcd?pcdDesc:null});
  if(r.error){alert(r.error.message);return}
  S.atl.push(r.data);limpaChaves(kata,kumite);
  $("#nome").value="";$("#pcdDesc").value="";$("#nome").focus();lista();toast("Atleta cadastrado");
}
// ---------- EDITAR CADASTRO ----------
const enviar=()=>editId?salvar():add();
const setSel=(sel,v)=>{if(sel.querySelector(`option[value="${v}"]`))sel.value=v};
function editar(id){
  const a=S.atl.find(x=>x.id==id);if(!a)return;
  editId=id;
  $("#nome").value=a.nome;$("#idade").value=a.idade;$("#sexo").value=a.sexo;$("#grad").value=a.grad;$("#acad").value=a.acad||"";
  $("#pcd").checked=!!a.pcd;$("#pcdDesc").value=a.pcd_descricao||"";
  $("#mod").value=a.kata_cod&&a.kumite_cod?"ambas":a.kata_cod?"kata":"kumite";
  fillCat();
  if(a.kata_cod)setSel($("#catKata"),a.kata_cod);
  if(a.kumite_cod)setSel($("#catKumite"),a.kumite_cod);
  $("#editBar").style.display="";$("#editBar").textContent=`✎ Editando o cadastro de ${a.nome}`;
  $("#btnSalvar").textContent="Salvar alterações";$("#btnCancel").style.display="";
  lista();$("#editBar").scrollIntoView({behavior:"smooth",block:"center"});
}
function cancelarEdicao(){
  editId=null;
  ["#nome","#idade","#acad","#pcdDesc"].forEach(s=>$(s).value="");
  $("#sexo").value="M";$("#grad").selectedIndex=0;$("#pcd").checked=false;$("#mod").value="kata";
  $("#editBar").style.display="none";$("#btnSalvar").textContent="Cadastrar atleta";$("#btnCancel").style.display="none";
  fillCat();lista();
}
async function salvar(){
  const a=S.atl.find(x=>x.id==editId);if(!a){cancelarEdicao();return}
  const nome=$("#nome").value.trim(),idade=+$("#idade").value;
  if(!nome||!idade){alert("Preencha nome e idade.");return}
  const pcd=$("#pcd").checked,pcdDesc=$("#pcdDesc").value.trim();
  if(pcd&&!pcdDesc){alert("Descreva a deficiência / condição do atleta PCD.");return}
  const mod=$("#mod").value,sexo=$("#sexo").value,grad=$("#grad").value,acad=$("#acad").value.trim();
  const kata=mod!="kumite"?+$("#catKata").value:null,kumite=mod!="kata"?+$("#catKumite").value:null;
  if((mod!="kumite"&&!kata)||(mod!="kata"&&!kumite)){alert("Não há categoria disponível para essas opções.");return}
  const dup=S.atl.find(x=>x.id!=a.id&&norm(x.nome)==norm(nome)&&x.sexo==sexo&&x.idade==idade&&x.grad==grad);
  if(dup){alert(`Já existe outro cadastro de ${dup.nome} com esses mesmos dados.`);return}
  const antes={k:a.kata_cod||null,u:a.kumite_cod||null};
  const r=await dbUpdate(a.id,{nome,idade,sexo,grad,acad,kata_cod:kata,kumite_cod:kumite,pcd,pcd_descricao:pcd?pcdDesc:null});
  if(r.error){alert(r.error.message);return}
  Object.assign(a,r.data);
  // mudou de categoria: a chave sorteada daquela categoria deixa de valer (o banco também apaga)
  if(antes.k!==(a.kata_cod||null))limpaChaves(antes.k,a.kata_cod);
  if(antes.u!==(a.kumite_cod||null))limpaChaves(antes.u,a.kumite_cod);
  cancelarEdicao();toast("Cadastro atualizado");
}
const nomeTag=a=>esc(a.nome)+(a.pcd?` <span class="tag">PCD</span>`+(a.pcd_descricao?`<small class="obs">${esc(a.pcd_descricao)}</small>`:""):"");
function lista(){
  $("#qtd").textContent=S.atl.length;   // cada atleta conta UMA vez, mesmo em Kata e Kumitê
  $("#lista").innerHTML=S.atl.length?`<table><tr><th>Nome</th><th>Idade</th><th>Sexo</th><th>Faixa</th><th>Academia</th><th>Modalidade</th><th>Cód</th><th></th></tr>`+
   S.atl.slice().sort(porNome).map(a=>`<tr${a.id==editId?' class="edit"':""}><td>${nomeTag(a)}</td><td>${a.idade}</td><td>${a.sexo}</td><td>${a.grad}</td><td>${esc(a.acad||"")}</td><td>${modTxt(a)}</td><td>${[a.kata_cod,a.kumite_cod].filter(Boolean).join(" / ")}</td><td><button class="x ed" title="Editar" onclick="editar('${a.id}')">✎</button><button class="x" title="Remover" onclick="del('${a.id}')">✕</button></td></tr>`).join("")+"</table>":`<div class="empty">Nenhum atleta cadastrado.</div>`;
}
async function del(id){
  const a=S.atl.find(x=>x.id==id);
  if(!a||!confirm(`Remover ${a.nome}?`))return;
  const r=await dbDel(id);
  if(r.error){alert(r.error.message);return}
  limpaChaves(a.kata_cod,a.kumite_cod);S.atl=S.atl.filter(x=>x.id!=id);if(editId==id)cancelarEdicao();else lista();
}

function logoDataURL(){return new Promise(res=>{const i=new Image();
  i.onload=()=>{try{const c=document.createElement("canvas");c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext("2d").drawImage(i,0,0);res({d:c.toDataURL("image/png"),w:i.naturalWidth,h:i.naturalHeight})}catch(e){res(null)}};
  i.onerror=()=>res(null);i.src="assets/logo.png"})}

// Tabela geral (somente admin): todos os atletas em ordem alfabética, com a linha das categorias embaixo de cada um
async function gerarTabelaPDF(){
  if(!isAdmin())return;
  if(!window.jspdf){alert("A biblioteca de PDF não carregou. Verifique a internet.");return}
  await carregar();
  if(!S.atl.length){alert("Nenhum atleta cadastrado.");return}
  const lista=S.atl.slice().sort(porNome);
  const catTxt=a=>{
    const f=(m,cod)=>{if(!cod)return `${MODNOME[m]}: (não inscrito)`;const c=catDe(cod);return `${MODNOME[m]}: Cód ${cod} - ${nomeCat(c).replace(" · "," - ")}`};
    return f("kata",a.kata_cod)+"     |     "+f("kumite",a.kumite_cod);
  };
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),lg=await logoDataURL();
  let x=14;
  if(lg){const h=20,w=h*lg.w/lg.h;doc.addImage(lg.d,"PNG",14,8,w,h);x=14+w+4}
  doc.setFont("helvetica","bold").setFontSize(16).setTextColor(14,47,90).text("I COPINHA ASDOKS",x,17);
  doc.setFont("helvetica","normal").setFontSize(10).setTextColor(90,90,90).text(`Lista de atletas - ${lista.length} atletas - ${new Date().toLocaleDateString("pt-BR")}`,x,24);
  const X={n:16,nome:24,idade:108,faixa:124,acad:150},RH=12.5;
  const cab=y=>{
    doc.setFillColor(230,238,248).rect(14,y,182,7,"F");
    doc.setFont("helvetica","bold").setFontSize(9).setTextColor(14,47,90);
    doc.text("Nº",X.n,y+4.8);doc.text("Nome",X.nome,y+4.8);doc.text("Idade",X.idade,y+4.8);doc.text("Faixa",X.faixa,y+4.8);doc.text("Academia / equipe",X.acad,y+4.8);
    return y+7;
  };
  let y=cab(34);
  lista.forEach((a,i)=>{
    if(y+RH>284){doc.addPage();y=cab(14)}
    if(i%2==0){doc.setFillColor(246,248,251).rect(14,y,182,RH,"F")}
    doc.setFont("helvetica","normal").setFontSize(9).setTextColor(26,36,51);
    doc.text(String(i+1),X.n,y+4.8);
    doc.text(doc.splitTextToSize(a.nome,80)[0]||"",X.nome,y+4.8);
    doc.text(String(a.idade),X.idade,y+4.8);
    doc.text(a.grad,X.faixa,y+4.8);
    doc.text(doc.splitTextToSize(a.acad||"",44)[0]||"",X.acad,y+4.8);
    doc.setFontSize(7.5).setTextColor(80,92,110).text(catTxt(a),X.nome,y+10);
    doc.setDrawColor(210,216,224).setLineWidth(0.2).line(14,y+RH,196,y+RH);
    y+=RH;
  });
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal").setFontSize(8).setTextColor(120,120,120).text(`Página ${i} de ${n}`,105,291,{align:"center"})}
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
  return `<div class="bar"><button class="btn" onclick="sorteio(${cod})">${d?"Sortear novamente":"Sortear chave"}</button><button class="btn alt" onclick="imprimir(${cod})" ${d?"":"disabled"}>Imprimir</button><button class="btn alt" onclick="baixarPDF(${cod})" ${d?"":"disabled"}>Baixar PDF</button><button class="btn alt" onclick="apagarChave(${cod})" ${d?"":"disabled"}>Apagar chave</button></div>`+sheet(cod)}
// Nome do arquivo = nome da categoria. No PDF, o navegador usa o título da página como nome sugerido.
function nomeArquivo(cod){
  const c=catDe(cod);
  return `${MODNOME[c.mod]} ${SEXNOME[c.sexo]} - ${nomeCat(c).replace(" · "," - ")} - Cod ${c.cod}`.replace(/[\\/:*?"<>|]/g,"");
}
function imprimir(cod){
  const antigo=document.title;document.title=nomeArquivo(cod);
  window.addEventListener("afterprint",()=>{document.title=antigo},{once:true});
  window.print();
}
async function sorteio(cod){
  const ids=atletasDe(cod).map(a=>a.id);
  if(ids.length<1){alert("Esta categoria não tem atletas.");return}
  const p=sortear(ids),r=await dbSaveDraw(cod,p);
  if(r.error){alert(r.error.message);return}
  S.draws[cod]=p;render();toast(`Chave do Cód ${cod} sorteada`);
}
const PASTA="Sumulas - I COPINHA ASDOKS";
const aguarda=()=>new Promise(r=>setTimeout(r));
function baixarBlob(blob,nome){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function rotuloAtleta(id){const a=S.atl.find(x=>x.id==id);return a?a.nome+(a.acad?" - "+a.acad:""):""}
function tituloSumula(cod){
  const c=catDe(cod),faixas=[...new Set(atletasDe(cod).map(a=>a.grad))].sort((a,b)=>GRADS.indexOf(a)-GRADS.indexOf(b)).join(" e ");
  return ("Categoria "+SEXNOME[c.sexo]+" "+nomeCat(c)+(faixas?" - "+faixas:"")+" - Modalidade "+MODNOME[c.mod]+" - Cód "+c.cod).toUpperCase();
}
// Súmula em PDF (desenhada com jsPDF). Escolhe retrato ou paisagem, o que deixar a chave maior.
function sumulaPDF(cod,lg){
  const c=catDe(cod),g=bracketGeom(S.draws[cod],rotuloAtleta);
  const area=(w,h)=>Math.min((w-20)/g.w,(h-107)/g.h,0.3);
  const land=area(297,210)>area(210,297),W=land?297:210,H=land?210:297,s=area(W,H);
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:land?"landscape":"portrait"});
  let x=10;
  if(lg){const h=16,w=h*lg.w/lg.h;doc.addImage(lg.d,"PNG",10,8,w,h);x=10+w+4}
  doc.setFont("helvetica","bold").setFontSize(16).setTextColor(14,47,90).text("I COPINHA ASDOKS",x,15);
  doc.setFont("helvetica","normal").setFontSize(9).setTextColor(90,90,90).text(`Súmula de combate - ${MODNOME[c.mod]}`,x,21);
  doc.setDrawColor(31,102,176).setLineWidth(0.8).line(10,27,W-10,27);
  doc.setFont("helvetica","bold").setFontSize(10).setTextColor(0,0,0).text(doc.splitTextToSize(tituloSumula(cod),W-20),10,33);
  const ox=10,oy=42;
  doc.setDrawColor(0,0,0).setLineWidth(Math.max(0.2,1.4*s));
  g.lines.forEach(l=>doc.line(ox+l[0]*s,oy+l[1]*s,ox+l[2]*s,oy+l[3]*s));
  doc.setFont("helvetica","normal").setFontSize(Math.max(6,12.5*s*2.835)).setTextColor(0,0,0);
  g.texts.forEach(t=>doc.text(t.t,ox+t.x*s,oy+t.y*s));
  const by=H-62,cx=W-10-60;
  doc.setFont("helvetica","bold").setFontSize(10).text("CLASSIFICAÇÃO",cx+30,by,{align:"center"});
  doc.setFont("helvetica","normal").setFontSize(9).setLineWidth(0.4);
  for(let i=0;i<4;i++){const yy=by+8+i*6.5;doc.text(`${i+1}º`,cx+1,yy);doc.line(cx,yy+1.5,cx+60,yy+1.5)}
  doc.setFontSize(9);
  doc.text("ÁRBITROS: ________________; ________________; ________________; ________________; ________________;",10,by+40);
  doc.text("MESÁRIOS: ________________; ________________; ________________;",10,by+48);
  return doc;
}
async function baixarPDF(cod){
  if(!window.jspdf){alert("A biblioteca de PDF não carregou. Verifique a internet.");return}
  sumulaPDF(cod,await logoDataURL()).save(nomeArquivo(cod)+".pdf");
}
// Sorteia de uma vez todas as categorias que têm 2 ou mais atletas
async function gerarTodas(){
  const disp=CATEGORIAS.filter(c=>atletasDe(c.cod).length>=1);
  if(!disp.length){alert("Nenhuma categoria tem atletas.");return}
  if(!confirm(`Gerar as chaves de ${disp.length} categoria(s)?`))return;
  const ja=disp.filter(c=>S.draws[c.cod]);
  let alvo=disp;
  if(ja.length&&!confirm(`${ja.length} dessas categorias já estão sorteadas.\n\nOK = sortear essas de novo também\nCancelar = manter as chaves atuais e sortear só as que faltam`))alvo=disp.filter(c=>!S.draws[c.cod]);
  if(!alvo.length){toast("Todas já estavam sorteadas");return}
  const agora=new Date().toISOString(),novas=alvo.map(c=>({cod:c.cod,pares:sortear(atletasDe(c.cod).map(a=>a.id)),updated_at:agora}));
  const r=await dbSaveDraws(novas);
  if(r.error){alert(r.error.message);return}
  novas.forEach(n=>S.draws[n.cod]=n.pares);render();toast(`${novas.length} chave(s) gerada(s)`);
}
// Baixa todas as súmulas sorteadas: um ZIP com uma pasta dentro, um PDF por categoria (nome + código)
async function baixarTodas(){
  if(!window.jspdf||!window.JSZip){alert("As bibliotecas de PDF/ZIP não carregaram. Verifique a internet.");return}
  const cods=CATEGORIAS.filter(c=>S.draws[c.cod]).map(c=>c.cod);
  if(!cods.length){alert("Nenhuma chave sorteada para baixar. Gere as chaves primeiro.");return}
  const lg=await logoDataURL(),zip=new JSZip(),pasta=zip.folder(PASTA);
  for(let i=0;i<cods.length;i++){
    toast(`Gerando súmula ${i+1} de ${cods.length}...`);await aguarda();
    pasta.file(nomeArquivo(cods[i])+".pdf",sumulaPDF(cods[i],lg).output("arraybuffer"));
  }
  baixarBlob(await zip.generateAsync({type:"blob"}),PASTA+".zip");
  toast(`${cods.length} súmula(s) baixada(s)`);
}
async function apagarChave(cod){
  if(!confirm(`Apagar a chave sorteada do Cód ${cod}? Ela será removida do banco de dados.`))return;
  const r=await dbDelDraw(cod);if(r.error){alert(r.error.message);return}
  delete S.draws[cod];render();toast(`Chave do Cód ${cod} apagada`);
}
async function apagarTodas(){
  if(!confirm("Apagar TODAS as chaves sorteadas? Elas serão removidas do banco de dados."))return;
  const r=await dbDelAllDraws();if(r.error){alert(r.error.message);return}
  S.draws={};render();toast("Todas as chaves foram apagadas");
}

/* ---------- CATEGORIAS ---------- */
function vCategorias(){
  const lista=CATEGORIAS.filter(c=>c.mod==cur.mod);
  const grupo=s=>`<h4>${SEXNOME[s]}</h4>`+lista.filter(c=>c.sexo==s).map(c=>`<button class="cat ${c.cod==cur.cod?"on":""}" onclick="setCod(${c.cod})"><b>Cód ${c.cod}</b><span>${nomeCat(c)}</span><i>${atletasDe(c.cod).length}</i></button>`).join("");
  const at=atletasDe(cur.cod).slice().sort(porNome);
  return `<h2>Categorias</h2>${seg()}<div class="split"><div class="cats">${grupo("M")}${grupo("F")}</div><div>
  <div class="card"><h3>${esc(tituloCat(catDe(cur.cod)))} — ${at.length} atleta(s)</h3><div class="tbl">${at.length?`<table><tr><th>Nome</th><th>Idade</th><th>Faixa</th><th>Academia</th></tr>${at.map(a=>`<tr><td>${nomeTag(a)}</td><td>${a.idade}</td><td>${a.grad}</td><td>${esc(a.acad||"")}</td></tr>`).join("")}</table>`:`<div class="empty">Nenhum atleta nesta categoria.</div>`}</div></div></div></div>`;
}

/* ---------- SÚMULAS ---------- */
function vSumulas(){
  const disp=CATEGORIAS.filter(c=>atletasDe(c.cod).length>=1).length,feitas=Object.keys(S.draws).length;
  return `<h2>Geração de súmulas</h2>
  <div class="card"><h3>Todas as categorias</h3>
   <p class="hint" style="margin:0 0 4px">${disp} categoria(s) com atletas · ${feitas} com chave sorteada</p>
   <div class="bar"><button class="btn" onclick="gerarTodas()">Gerar todas as chaves</button><button class="btn alt" onclick="baixarTodas()" ${feitas?"":"disabled"}>Baixar todas (ZIP com pasta)</button><button class="btn alt" onclick="apagarTodas()" ${feitas?"":"disabled"}>Apagar todas as chaves</button></div></div>
  ${seg()}<div class="card"><label>Categoria</label><select onchange="setCod(this.value)">${CATEGORIAS.filter(c=>c.mod==cur.mod).map(c=>`<option value="${c.cod}" ${c.cod==cur.cod?"selected":""}>${SEXNOME[c.sexo]} · Cód ${c.cod} · ${nomeCat(c)} (${atletasDe(c.cod).length} atletas)${S.draws[c.cod]?" ✓":""}</option>`).join("")}</select>
  <p class="hint">As chaves sorteadas ficam salvas no sistema até você apagá-las.</p></div>${painel(cur.cod)}`;
}

/* ---------- LOGIN / PERFIL ---------- */
const isAdmin=()=>ME&&ME.role=="admin";
function limparSessao(){[localStorage,sessionStorage].forEach(s=>Object.keys(s).filter(k=>k.startsWith("sb-")).forEach(k=>s.removeItem(k)))}
async function sair(){
  try{await db.auth.signOut()}catch(e){}
  limparSessao();                       // garante o logout mesmo se a chamada ao servidor falhar
  location.replace("login.html?saiu=1");
}
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
