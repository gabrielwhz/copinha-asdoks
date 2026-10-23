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

// Divisões da tabela geral: idade e faixa, valem para Kata e Kumitê.
// Cada divisão cabe inteira dentro de UMA categoria de Kata e de UMA de Kumitê.
const DIV_IDADE=[[0,6,"Até 6 anos"],[7,7,"7 anos"],[8,8,"8 anos"],[9,10,"9 e 10 anos"],[11,12,"11 e 12 anos"],[13,14,"13 e 14 anos"]];
const DIV_FAIXA=[["Branca",0,0],["Amarela",1,1],["Vermelha",2,2],["Laranja acima",3,7]];
function divisao(a){
  let i=DIV_IDADE.findIndex(d=>a.idade>=d[0]&&a.idade<=d[1]);const il=i<0?"15 anos ou mais":DIV_IDADE[i][2];if(i<0)i=DIV_IDADE.length;
  const g=GRADS.indexOf(a.grad);let f=DIV_FAIXA.findIndex(d=>g>=d[1]&&g<=d[2]);if(f<0)f=DIV_FAIXA.length-1;
  return{ord:(a.sexo=="M"?0:1)*1000+i*10+f,titulo:`${SEXNOME[a.sexo]} - ${il} - Faixa ${DIV_FAIXA[f][0]}`};
}
