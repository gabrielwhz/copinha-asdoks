function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// Sorteio: monta os confrontos e distribui os byes quando a chave não fecha
function sortear(ids){
  ids=shuf(ids.slice());const n=ids.length;let size=1;while(size<n)size*=2;
  const m=n-size/2,p=[];let i=0;
  for(let k=0;k<m;k++)p.push([ids[i++],ids[i++]]);
  while(i<n)p.push([ids[i++],null]);
  return shuf(p);
}
// Geometria da chave (linhas e textos), usada tanto no SVG da tela quanto nos PDFs
function bracketGeom(pairs,rotulo){
  const W=200,G=30,ROW=34,PG=10,X0=6;let y=30,ys=[],groups=[];const lines=[],texts=[];
  const ln=(x1,y1,x2,y2)=>lines.push([x1,y1,x2,y2]);
  pairs.forEach(p=>{const g=[];
    p.forEach(id=>{if(!id)return;texts.push({x:X0,y:y-5,t:rotulo(id)});ys.push(y);g.push(y);y+=ROW});
    groups.push(g);y+=PG});
  const H=y+10;let r=0;
  for(;;){
    const cx=X0+r*(W+G);ys.forEach(v=>ln(cx,v,cx+W,v));
    if(ys.length==1){ln(cx+W,ys[0],cx+W+G+20,ys[0]);break}
    const next=[];
    groups.forEach(g=>{
      if(g.length==1){ln(cx+W,g[0],cx+W+G,g[0]);next.push(g[0]);return}
      const vx=cx+W+G/2,ym=(g[0]+g[1])/2;
      ln(cx+W,g[0],vx,g[0]);ln(cx+W,g[1],vx,g[1]);ln(vx,g[0],vx,g[1]);ln(vx,ym,cx+W+G,ym);next.push(ym)});
    ys=next;r++;groups=[];
    for(let i=0;i<ys.length;i+=2)groups.push(ys.slice(i,i+2));
  }
  return{w:X0+(r+1)*(W+G)+30,h:H,lines,texts};
}
function bracketSVG(pairs,rotulo){
  const g=bracketGeom(pairs,rotulo);
  return `<svg id="svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" width="${g.w}" height="${g.h}"><rect width="100%" height="100%" fill="#fff"/>`+
    g.lines.map(l=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="#000" stroke-width="1.4"/>`).join("")+
    g.texts.map(t=>`<text x="${t.x}" y="${t.y}" font-size="12.5" font-family="Arial">${esc(t.t)}</text>`).join("")+"</svg>";
}
