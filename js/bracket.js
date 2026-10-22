function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// Sorteio: monta os confrontos e distribui os byes quando a chave não fecha
function sortear(ids){
  ids=shuf(ids.slice());const n=ids.length;let size=1;while(size<n)size*=2;
  const m=n-size/2,p=[];let i=0;
  for(let k=0;k<m;k++)p.push([ids[i++],ids[i++]]);
  while(i<n)p.push([ids[i++],null]);
  return shuf(p);
}
function bracketSVG(pairs,rotulo){
  const W=200,G=36,ROW=40,PG=14,X0=6;let y=30,ys=[],groups=[],svg="";
  const ln=(x1,y1,x2,y2)=>svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="1.4"/>`;
  pairs.forEach(p=>{const g=[];
    p.forEach(id=>{if(!id)return;
      svg+=`<text x="${X0}" y="${y-5}" font-size="12.5" font-family="Arial">${esc(rotulo(id))}</text>`;
      ys.push(y);g.push(y);y+=ROW});
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
  const w=X0+(r+1)*(W+G)+40;
  return `<svg id="svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}"><rect width="100%" height="100%" fill="#fff"/>${svg}</svg>`;
}
