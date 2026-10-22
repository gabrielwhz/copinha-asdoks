// Faixas em ordem crescente (o índice é usado nos intervalos das categorias)
const GRADS=["Branca","Amarela","Vermelha","Laranja","Verde","Roxa","Marrom","Preta"];
const CATEGORIAS=[];
(function(){
  // [idadeMin, idadeMax, faixaMin, faixaMax]
  const KATA=[[0,7,0,7],[8,10,0,0],[8,10,1,2],[8,10,3,7],[11,14,0,0],[11,14,1,2],[11,14,3,7]];
  const KUMITE=[[0,6,0,7],[7,8,0,1],[7,8,2,7],[9,10,0,1],[9,10,2,7],[11,12,0,1],[11,12,2,7],[13,14,0,1],[13,14,2,7]];
  let cod=1;
  [["kata","M",KATA],["kata","F",KATA],["kumite","M",KUMITE],["kumite","F",KUMITE]].forEach(([mod,sexo,lista])=>{
    lista.forEach(r=>CATEGORIAS.push({cod:cod++,mod,sexo,amin:r[0],amax:r[1],gmin:r[2],gmax:r[3]}));
  });
})();
function nomeCat(c){
  const idade=c.amin==0?`Até ${c.amax} anos`:(c.amax-c.amin==1?`${c.amin} e ${c.amax} anos`:`${c.amin} a ${c.amax} anos`);
  const g=(c.gmin==0&&c.gmax==7)?"Absoluto":c.gmax==7?`${GRADS[c.gmin]} acima`:c.gmin==c.gmax?GRADS[c.gmin]:`${GRADS[c.gmin]} e ${GRADS[c.gmax]}`;
  return `${idade} · ${g}`;
}
const MODNOME={kata:"Kata",kumite:"Kumitê"},SEXNOME={M:"Masculino",F:"Feminino"};
function acharCat(mod,sexo,idade,grad){
  const g=GRADS.indexOf(grad);
  return CATEGORIAS.find(c=>c.mod==mod&&c.sexo==sexo&&idade>=c.amin&&idade<=c.amax&&g>=c.gmin&&g<=c.gmax);
}
