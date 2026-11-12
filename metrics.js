const groups=[["Ementa e organização",["O conteúdo trabalhado correspondeu à ementa.","A ementa abordou temas atuais das Ciências Ambientais.","A bibliografia sustentou o aprendizado.","A carga horária foi adequada ao conteúdo."]],["Prática docente",["O plano de ensino orientou as atividades da disciplina.","As explicações foram claras.","As aulas favoreceram a participação e o debate.","Houve oportunidade para esclarecer dúvidas."]],["Avaliação e condições de aprendizagem",["Os critérios de avaliação ficaram claros desde o início.","As avaliações foram coerentes com o conteúdo trabalhado.","Recebi devolutivas em tempo útil.","Os recursos de ensino atenderam às atividades.","As atividades e os materiais favoreceram a participação em condições de acessibilidade."]],["Formação em Ciências Ambientais",["A disciplina integrou perspectivas de diferentes áreas do conhecimento.","A disciplina ajudou a compreender questões do Pantanal, da Amazônia ou do Cerrado.","O conteúdo dialogou com minha linha ou projeto de pesquisa.","A disciplina contribuiu para minha formação em pesquisa, docência ou extensão.","A disciplina contribuiu para minha dissertação ou tese."]]],prompts=["O que funcionou melhor?","O que deveria mudar primeiro?","Sugestões para a ementa, bibliografia, carga horária, formato ou atividades práticas","Proposta de nova disciplina, com tema, linha de pesquisa e lacuna que preencheria"],protection=5,themeRules=[["Aulas práticas e campo","\\b(pratic\\w*|campo|laboratorio\\w*|visita\\w*)\\b"],["Carga horária e calendário","\\b(carga horaria|tempo|prazo\\w*|calendario|horario\\w*|intensiv\\w*)\\b"],["Ementa e bibliografia","\\b(ementa|conteudo\\w*|bibliograf\\w*|leituras?|referencias?)\\b"],["Avaliação e devolutivas","\\b(avaliac\\w*|devolutiv\\w*|feedback|criterio\\w*|prova\\w*)\\b"],["Didática e participação","\\b(didatic\\w*|metodologi\\w*|explicac\\w*|participac\\w*|debate\\w*)\\b"],["Infraestrutura e acesso","\\b(infraestrutura|acessib\\w*|equipamento\\w*|internet|sala\\w*|material|materiais)\\b"]].map(([label,source])=>[label,new RegExp(source)]);
export function summarize(rows) {
  const ballots = rows.map(x=>JSON.parse(x.data));
  const stat = values => {
    const valid = values.filter(Number.isInteger);
    return {n:valid.length, na:values.length-valid.length, mean:valid.length>=protection ? valid.reduce((a,b)=>a+b,0)/valid.length : null, counts:valid.length>=protection ? [1,2,3,4,5].map(k=>valid.filter(v=>v===k).length) : null};
  };
  return {n:ballots.length,grade:stat(ballots.map(b=>b.grade)).mean,groups:groups.map(([title,questions],i)=>{
    const means=ballots.map(b=>{
      const v=b.ratings[i].filter(Number.isInteger);
      return v.length ? v.reduce((a,x)=>a+x,0)/v.length : null;
    }).filter(v=>v!==null);
    return {title,index:means.length>=protection ? 25*(means.reduce((a,b)=>a+b,0)/means.length-1) : null,n:means.length,items:questions.map((q,j)=>({q,...stat(ballots.map(b=>b.ratings[i][j]))}))};
  })};
}
export function feedback(rows){
  const counts=prompts.map(prompt=>({prompt,n:0,themes:themeRules.map(([label])=>({label,n:0}))}));
  for(const row of rows){
    const comments=JSON.parse(row.data).comments||[];
    counts.forEach((entry,i)=>{
      const value=comments[i];
      if(!value?.trim())return;
      entry.n++;
      const normalized=value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
      themeRules.forEach(([,rule],j)=>{if(rule.test(normalized))entry.themes[j].n++;});
    });
  }
  return counts.map(entry=>({...entry,themes:entry.themes.filter(x=>x.n).sort((a,b)=>b.n-a.n)}));
}
