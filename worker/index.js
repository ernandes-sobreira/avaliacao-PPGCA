import {authReady,google,identity,voterKey} from './auth.js';
const courses = [
'Epistemologia Ambiental','Meio Ambiente e Sustentabilidade nos Biomas, Pantanal, Amazônia e Cerrado','Elaboração de Tese','Ciências Sociais e o Desenvolvimento Regional','Seminários de Mestrado','Seminários de Doutorado','Métodos e Técnicas para o Estudo da Diversidade Cultural nos Biomas Matogrossenses','Climas, mudanças climáticas e consequências ambientais','Saúde e Interações Ambientais','Agricultura, meio ambiente e desenvolvimento','Impactos ambientais de poluentes sobre a biodiversidade','Atributos do solo e a conservação ambiental','Etnobiologia e Etnoecologia','Paisagem e territorialização socioambiental','Indicadores biológicos como ferramenta de avaliação ambiental','Componentes ambientais, uso e gestão dos recursos hídricos','Conservação e uso sustentável da Biodiversidade no Pantanal, Amazônia e Cerrado','Geografia Política e Meio Ambiente na Amazônia','Pesquisa orientada','Estatística Aplicada à Ciências Ambientais I','Estatística Aplicada à Ciências Ambientais II','Avaliação de impacto de grandes empreendimentos e os riscos para a saúde humana','Ordenamento Territorial nas Fronteiras Políticas e nos Biomas Matogrossenses'
];
const groups = [
['Ementa e organização',['O conteúdo trabalhado correspondeu à ementa.','A ementa abordou temas atuais das Ciências Ambientais.','A bibliografia sustentou o aprendizado.','A carga horária foi adequada ao conteúdo.']],
['Prática docente',['O plano de ensino orientou as atividades da disciplina.','As explicações foram claras.','As aulas favoreceram a participação e o debate.','Houve oportunidade para esclarecer dúvidas.']],
['Avaliação e condições de aprendizagem',['Os critérios de avaliação ficaram claros desde o início.','As avaliações foram coerentes com o conteúdo trabalhado.','Recebi devolutivas em tempo útil.','Os recursos de ensino atenderam às atividades.','As atividades e os materiais favoreceram a participação em condições de acessibilidade.']],
['Formação em Ciências Ambientais',['A disciplina integrou perspectivas de diferentes áreas do conhecimento.','A disciplina ajudou a compreender questões do Pantanal, da Amazônia ou do Cerrado.','O conteúdo dialogou com minha linha ou projeto de pesquisa.','A disciplina contribuiu para minha formação em pesquisa, docência ou extensão.','A disciplina contribuiu para minha dissertação ou tese.']]
];
const prompts = ['O que funcionou melhor?','O que deveria mudar primeiro?','Sugestões para a ementa, bibliografia, carga horária, formato ou atividades práticas','Proposta de nova disciplina, com tema, linha de pesquisa e lacuna que preencheria'];
const links = {
 matriz:'https://portal.unemat.br/media/files/matriz-curricular-ppgca-mestrado-e-doutorado.pdf',
 normas:'https://caceres.unemat.br/faculdades/facab/stricto/ppgca/normas-e-regulamentos',
 capes:'https://www.gov.br/capes/pt-br/acesso-a-informacao/acoes-e-programas/avaliacao/sobre-a-avaliacao/areas-avaliacao/sobre-as-areas-de-avaliacao/colegio-de-ciencias-exatas-tecnologicas-e-multidisciplinar/multidisciplinar/ciencias-ambientais'
};
const clean = (v,max) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const token = () => crypto.randomUUID().replaceAll('-','');
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))), x=>x.toString(16).padStart(2,'0')).join('');
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (message,status=400) => json({error:message},status);
const options = ['Mestrado','Doutorado','Egresso(a)','Discente especial'];
const modalities = ['Presencial','Remota','Híbrida'];
const protection = 5;
function summarize(rows) {
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
async function api(request,env,url) {
  const db=env.DB;
  const user=await identity(request,env);
  const email=user?.email;
  const admin=Boolean(email && (env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).includes(email));
  const path=url.pathname;
  if(request.method==='GET' && path==='/api/start'){
    const {results}=await db.prepare('SELECT id,course,term,section,teachers,modality FROM offers WHERE active=1 ORDER BY term DESC, course').all();
    return json({offers:results,admin,email:email||null,googleReady:authReady(env),privacyApproved:env.PRIVACY_APPROVED==='1'});
  }
  if(request.method!=='POST')return fail('Método inválido.',405);
  if(request.headers.get('Origin')!==url.origin)return fail('Origem inválida.',403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return fail('Formato inválido.',415);
  const reader=request.body?.getReader();
  let bytes=0, raw='';
  const decoder=new TextDecoder();
  if(!reader)return fail('Dados ausentes.');
  while(true){
    const part=await reader.read();
    if(part.done)break;
    bytes+=part.value.byteLength;
    if(bytes>16000){await reader.cancel();return fail('Envio muito longo.',413);}
    raw+=decoder.decode(part.value,{stream:true});
  }
  let b;
  try{b=JSON.parse(raw+decoder.decode());}catch{return fail('Dados inválidos.');}
  if(!b || typeof b!=='object' || Array.isArray(b))return fail('Dados inválidos.');
  const offer=clean(b.offer,40);
  if(path==='/api/vote'){
    if(!user)return fail('Entre com a conta Google institucional para responder.',401);
    if(env.PRIVACY_APPROVED!=='1')return fail('A coleta aguarda a validação institucional do aviso de privacidade.',503);
    if(b.privacy!==true)return fail('Confirme a leitura do aviso de privacidade.');
    const code=clean(b.code,40).toLowerCase();
    if(!/^[a-f0-9]{32}$/.test(code) || !options.includes(b.level) || b.attended!==true ||
       !Number.isInteger(b.grade) || b.grade<0 || b.grade>10 || !Array.isArray(b.ratings) ||
       b.ratings.length!==groups.length || !groups.every((g,i)=>Array.isArray(b.ratings[i]) && b.ratings[i].length===g[1].length && b.ratings[i].every(v=>v===null || (Number.isInteger(v)&&v>=1&&v<=5))))return fail('Confira o código, a nota e todas as respostas.');
    const key=await hash(code);
    const data=JSON.stringify({level:b.level,grade:b.grade,ratings:b.ratings,noticeVersion:1,comments:prompts.map((_,i)=>clean(b.comments?.[i],1200))});
    const result=await db.prepare('INSERT OR IGNORE INTO answers(ticket,offer,data,voter_key) SELECT t.hash,t.offer,?,? FROM tickets t JOIN offers o ON o.id=t.offer WHERE t.hash=? AND t.offer=? AND o.active=1').bind(data,await voterKey(env,user.sub,offer),key,offer).run();
    return result.meta.changes===1 ? json({ok:true}) : fail('Confira o código e a turma. Cada conta institucional e cada código permitem um envio por turma.',409);
  }
  if(path==='/api/report' && !admin){
    if(!user)return fail('Entre com a conta Google institucional para consultar.',401);
    const code=clean(b.code,40).toLowerCase();
    if(!/^[a-f0-9]{32}$/.test(code))return fail('Informe um código de consulta válido.',403);
    const share=await db.prepare('SELECT offer FROM shares WHERE hash=? AND expires>?').bind(await hash(code),Date.now()).first();
    if(!share)return fail('Código inválido, expirado ou revogado.',403);
    return report(db,share.offer,false);
  }
  if(!admin)return fail('Acesso restrito.',403);
  if(path==='/api/offers'){
    const {results}=await db.prepare('SELECT o.*, (SELECT COUNT(*) FROM answers a WHERE a.offer=o.id) AS received, (SELECT COUNT(*) FROM tickets t WHERE t.offer=o.id) AS issued FROM offers o ORDER BY term DESC, course').all();
    return json({offers:results});
  }
  if(path==='/api/create'){
    const term=clean(b.term,6),section=clean(b.section,60),teachers=clean(b.teachers,240);
    if(!Number.isInteger(b.course)||!courses[b.course]||!/^20\d\d\.[12]$/.test(term)||!section||!teachers||!modalities.includes(b.modality)||!Number.isInteger(b.enrolled)||b.enrolled<1||b.enrolled>500)return fail('Confira todos os dados da oferta.');
    const result=await db.prepare('INSERT OR IGNORE INTO offers (id,course,term,section,teachers,modality,enrolled) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),b.course,term,section,teachers,b.modality,b.enrolled).run();
    return result.meta.changes===1 ? json({ok:true}) : fail('Essa turma já existe no semestre.',409);
  }
  const entry=await db.prepare('SELECT * FROM offers WHERE id=?').bind(offer).first();
  if(!entry)return fail('Turma não encontrada.',404);
  if(path==='/api/report')return report(db,offer,true);
  if(path==='/api/toggle'){
    await db.prepare('UPDATE offers SET active=? WHERE id=?').bind(b.active===true?1:0,offer).run();
    return json({ok:true});
  }
  if(path==='/api/tickets'){
    if(!entry.active || !Number.isInteger(b.count)||b.count<1||b.count>50)return fail('A turma precisa estar aberta. Gere até 50 códigos por vez.');
    const codes=Array.from({length:b.count},token);
    const keys=await Promise.all(codes.map(hash));
    const tuples=keys.map(()=>'(?)').join(',');
    const result=await db.prepare('WITH new_codes(hash) AS (VALUES '+tuples+') INSERT INTO tickets(hash,offer) SELECT hash,o.id FROM new_codes CROSS JOIN offers o WHERE o.id=? AND o.active=1 AND (SELECT COUNT(*) FROM tickets WHERE offer=o.id)+?<=o.enrolled').bind(...keys,offer,b.count).run();
    return result.meta.changes===codes.length ? json({codes}) : fail('O lote ultrapassa as vagas ainda sem código ou a oferta foi encerrada.',409);
  }
  if(path==='/api/share'){
    if(entry.active)return fail('Encerre a coleta antes de liberar a consulta.');
    const {n}=await db.prepare('SELECT COUNT(*) AS n FROM answers WHERE offer=?').bind(offer).first();
    if(n<protection)return fail('São necessárias pelo menos cinco respostas.');
    const code=token();
    await db.prepare('INSERT INTO shares VALUES (?,?,?)').bind(await hash(code),offer,Date.now()+7*86400000).run();
    return json({code});
  }
  if(path==='/api/revoke'){
    await db.prepare('DELETE FROM shares WHERE offer=?').bind(offer).run();
    return json({ok:true});
  }
  if(path==='/api/action'){
    const data={action:clean(b.action,1200),owner:clean(b.owner,120),due:clean(b.due,10),status:clean(b.status,30)};
    if(!data.action || !data.owner || !/^\d{4}-\d{2}-\d{2}$/.test(data.due) || !['Proposta','Em andamento','Concluída'].includes(data.status))return fail('Preencha ação, responsável, prazo e situação.');
    await db.prepare('INSERT INTO actions VALUES (?,?) ON CONFLICT(offer) DO UPDATE SET data=excluded.data').bind(offer,JSON.stringify(data)).run();
    return json({ok:true});
  }
  return fail('Rota inválida.',404);
}
async function report(db,id,admin){
  const offer=await db.prepare('SELECT * FROM offers WHERE id=?').bind(id).first();
  if(!offer || (!admin && offer.active))return fail('Relatório indisponível.',403);
  const {results}=await db.prepare('SELECT data FROM answers WHERE offer=?').bind(id).all();
  if(!admin && results.length<protection)return fail('Relatório indisponível.',403);
  const action=admin ? await db.prepare('SELECT data FROM actions WHERE offer=?').bind(id).first() : null;
  return json({offer,stats:summarize(results),action:action?JSON.parse(action.data):null,...(admin?{comments:results.flatMap(r=>JSON.parse(r.data).comments.flatMap((value,i)=>value?[{prompt:prompts[i],value}]:[]))}:{})});
}
function client(config){
  const {courses,groups,prompts,options,modalities,links}=config;
  const root=document.querySelector('main');
  let state;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const opt=(label,value=label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
  const name=o=>courses[o.course]+' · '+o.term+' · '+o.section;
  const select=(key,values)=>'<select required name="'+key+'"><option value="">Selecione</option>'+values.join('')+'</select>';
  const field=(label,content)=>'<label>'+label+content+'</label>';
  const buttons=(label)=>'<button type="submit">'+label+'</button>';
  const format=(v,d=1)=>v===null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:d});
  async function api(path,data){
    const response=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error);
    return result;
  }
  function form(id,handler){
    const el=document.getElementById(id);
    el.addEventListener('submit',async e=>{
      e.preventDefault();
      const submit=e.submitter;
      submit.disabled=true;
      message('');
      try{await handler(Object.fromEntries(new FormData(el)),el);}
      catch(error){message(error.message,true);}
      finally{submit.disabled=false;}
    });
  }
  function message(value,error=false){
    const el=document.querySelector('#message');
    el.textContent=value;
    el.className=error?'error':'';
  }
  const output=()=>document.querySelector('#output');
  function page(body){root.innerHTML=body+'<p id="message" role="status"></p><div id="output"></div>';}
  const login=()=>state.googleReady?'<a class="button" href="/auth/google">Entrar com Google · @unemat.br</a>':'<p class="hint">A entrada institucional aguarda a configuração do Google Workspace.</p>';
  function catalog(){
    page('<section><span class="tag">MESTRADO E DOUTORADO</span><h2>Disciplinas do PPGCA</h2><p>As 23 disciplinas da matriz curricular e suas turmas abertas para avaliação.</p>'+field('Buscar disciplina','<input id="course-search" type="search" placeholder="Ex.: Estatística, Pantanal, Saúde">')+'<div id="catalog"></div><p><a href="'+links.matriz+'">Matriz curricular oficial</a></p></section>');
    const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
    const input=document.querySelector('#course-search');
    const list=document.querySelector('#catalog');
    function render(){
      list.innerHTML=courses.map((title,i)=>({title,i})).filter(({title})=>norm(title).includes(norm(input.value.trim()))).map(({title,i})=>{
        const type=i<2?'Obrigatória · Mestrado e Doutorado':i<4?'Obrigatória · Doutorado':i===4?'Obrigatória · Mestrado':'Optativa';
        const open=state.offers.filter(o=>o.course===i);
        return '<article><h3>'+esc(title)+'</h3><p>'+type+' · 60 horas · 4 créditos</p>'+
          (open.length?open.map(o=>'<button data-offer="'+esc(o.id)+'">Avaliar '+esc(o.term+' · '+o.section)+'</button>').join(' '):'<small>Sem turma aberta para avaliação</small>')+'</article>';
      }).join('')||'<p>Nenhuma disciplina encontrada.</p>';
      list.querySelectorAll('[data-offer]').forEach(button=>button.onclick=async()=>{await show('vote');const select=document.querySelector('[name=offer]');if(select){select.value=button.dataset.offer;select.dispatchEvent(new Event('change'));}});
    }
    input.oninput=render;render();
  }
  function privacy(){
    page('<section><span class="tag">AVISO DE PRIVACIDADE · V1</span><h2>Privacidade e proteção de dados</h2><h3>Finalidade</h3><p>Verificar a elegibilidade, evitar avaliações duplicadas e orientar melhorias em ementas, ensino e condições de aprendizagem. Indicadores agregados podem subsidiar a autoavaliação e os relatórios do PPGCA.</p><h3>Dados tratados e acesso</h3><p>O login Google verifica o e-mail institucional e o identificador da conta em uma sessão temporária. O registro da avaliação guarda a turma, o vínculo informado, as notas, os comentários opcionais e uma chave derivada da conta para impedir duplicatas. O painel de gestão mostra os comentários. A coordenação consulta indicadores agregados mediante login institucional e código temporário. Evite nomes, matrículas e informações sensíveis nos comentários.</p><h3>Em caso de incidente</h3><p>Comunique a suspeita ao canal de proteção de dados da UNEMAT. O controlador deve conter e avaliar o incidente, preservar registros e adotar medidas de mitigação. Quando houver risco ou dano relevante, o controlador deve comunicar a ANPD e as pessoas afetadas em até três dias úteis, ressalvado prazo específico, informando os dados afetados, os riscos e as medidas de proteção.</p><h3>Seus direitos</h3><p>Use o canal oficial da UNEMAT para solicitar informações, acesso, correção e exercer os demais direitos aplicáveis. Este aviso está em revisão institucional quanto à base legal, ao prazo de retenção, aos operadores e ao descarte. A confirmação de leitura registra ciência do aviso.</p><p><a href="https://unemat.br/site/lgpd">Canal de proteção de dados da UNEMAT</a> · <a href="https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis">Orientações da ANPD</a></p></section>');
  }
  function vote(){
    if(!state.email){page('<section><h2>Entre com seu Google institucional</h2><p>Use sua conta @unemat.br para confirmar sua identidade. Tenha em mãos o código individual da turma.</p>'+login()+'<p><a href="/?privacidade=1">Ler o aviso de privacidade</a></p></section>');return;}
    if(!state.privacyApproved){page('<section><h2>Coleta fechada</h2><p>O aviso de privacidade aguarda validação institucional.</p><a href="/?privacidade=1">Ler o aviso</a></section>');return;}
    if(!state.offers.length){page('<section><span class="tag">COLETA DISCENTE</span><h2>Nenhuma turma aberta</h2><p>Quando a comissão abrir uma oferta, ela aparecerá aqui. Use o código individual da turma para responder.</p></section>');return;}
    page('<section><span class="tag">COLETA DISCENTE</span><h2>Avalie uma disciplina cursada</h2><p>Envie uma avaliação por turma com o código individual recebido. A conta institucional é verificada no login. O e-mail fica separado das respostas. Evite informações que identifiquem você ou colegas nos comentários.</p><form id="vote"><div class="grid">'+
      field('Turma',select('offer',state.offers.map(o=>opt(name(o),o.id))))+
      field('Código de participação','<input name="code" required minlength="32" maxlength="32" autocomplete="off" spellcheck="false">')+
      field('Vínculo na época da disciplina',select('level',options.map(x=>opt(x))))+
      '</div><p id="detail"></p><label class="check"><input type="checkbox" name="attended" required> Confirmo que cursei esta turma.</label><p class="hint">1 = discordo totalmente · 2 = discordo · 3 = neutro · 4 = concordo · 5 = concordo totalmente · N/A = não se aplica.</p>'+
      groups.map(([title,items],i)=>'<fieldset><legend>'+title+'</legend>'+items.map((q,j)=>field(q,select('q'+i+'_'+j,[1,2,3,4,5,'N/A'].map(x=>opt(x))))).join('')+'</fieldset>').join('')+
      field('Nota geral de 0 a 10','<input type="number" name="grade" min="0" max="10" step="1" required>')+
      '<details><summary>Sugestões e comentários opcionais</summary>'+prompts.map((p,i)=>field(p,'<textarea name="c'+i+'" maxlength="1200"></textarea>')).join('')+'</details>'+'<label class="check"><input type="checkbox" name="privacy" required> Li o <a href="/?privacidade=1" target="_blank" rel="noopener">aviso de privacidade</a> e estou ciente das finalidades.</label>'+buttons('Enviar avaliação')+'</form></section>');
    document.querySelector('[name=offer]').onchange=e=>{
      const o=state.offers.find(x=>x.id===e.target.value);
      document.querySelector('#detail').textContent=o?o.teachers+' · '+o.modality:'';
    };
    form('vote',async data=>{
      await api('vote',{offer:data.offer,code:data.code,privacy:data.privacy==='on',level:data.level,attended:data.attended==='on',grade:Number(data.grade),ratings:groups.map((g,i)=>g[1].map((_,j)=>data['q'+i+'_'+j]==='N/A'?null:Number(data['q'+i+'_'+j]))),comments:prompts.map((_,i)=>data['c'+i])});
      page('<section><span class="tag">RESPOSTA REGISTRADA</span><h2>Obrigado pela avaliação</h2><p>Sua contribuição será considerada na revisão da oferta.</p><button id="again">Avaliar outra turma</button></section>');
      document.querySelector('#again').onclick=vote;
    });
  }
  function draw(result,admin){
    const {offer,stats,comments,action}=result;
    output().innerHTML='<section><span class="tag">RELATÓRIO POR TURMA</span><h2>'+esc(name(offer))+'</h2><p>'+esc(offer.teachers)+' · '+esc(offer.modality)+'</p><div class="grid cards"><div><strong>'+stats.n+' / '+offer.enrolled+'</strong><br>Respostas / elegíveis</div><div><strong>'+format(100*stats.n/offer.enrolled)+'%</strong><br>Participação</div><div><strong>'+format(stats.grade)+'</strong><br>Nota geral média / 10</div></div>'+
      (stats.n<5?'<p>Menos de cinco respostas. Os indicadores quantitativos ficam ocultos.</p>':'')+
      stats.groups.map(g=>'<details><summary>'+esc(g.title)+' · '+format(g.index)+' / 100</summary><p>'+g.n+' respostas válidas no eixo.</p><div class="table"><table><thead><tr><th>Item</th><th>Média</th><th>Válidas</th><th>N/A</th><th>1 · 2 · 3 · 4 · 5</th></tr></thead><tbody>'+g.items.map(q=>'<tr><td>'+esc(q.q)+'</td><td>'+format(q.mean)+'</td><td>'+q.n+'</td><td>'+q.na+'</td><td>'+(q.counts?.join(' · ')||'—')+'</td></tr>').join('')+'</tbody></table></div></details>').join('')+
      (admin?'<details><summary>Comentários confidenciais ('+comments.length+')</summary>'+comments.map(c=>'<p><b>'+esc(c.prompt)+'</b><br>'+esc(c.value)+'</p>').join('')+'</details><form id="action"><h3>Acompanhamento da melhoria</h3>'+field('Ação ou devolutiva','<textarea name="action" required maxlength="1200">'+esc(action?.action)+'</textarea>')+field('Responsável','<input name="owner" required maxlength="120" value="'+esc(action?.owner)+'">')+field('Prazo','<input name="due" type="date" required value="'+esc(action?.due)+'">')+field('Situação','<select name="status">'+['Proposta','Em andamento','Concluída'].map(x=>'<option'+(action?.status===x?' selected':'')+'>'+x+'</option>').join('')+'</select>')+buttons('Salvar acompanhamento')+'</form>':'')+'</section>';
    if(admin)form('action',async data=>{await api('action',{...data,offer:offer.id});message('Acompanhamento salvo.');});
  }
  function consult(){
    if(!state.email){page('<section><h2>Consulta da coordenação</h2><p>Entre com o Google institucional e tenha em mãos seu código de consulta.</p>'+login()+'</section>');return;}
    page('<section><span class="tag">COORDENAÇÃO</span><h2>Consultar resultados</h2><p>Use o código temporário recebido para consultar os indicadores da turma após o encerramento. Comentários livres ficam no painel de gestão.</p><form id="consult">'+field('Código de consulta','<input required name="code" minlength="32" maxlength="32" autocomplete="off" spellcheck="false">')+buttons('Consultar')+'</form></section>');
    form('consult',async data=>{output().replaceChildren();draw(await api('report',data),false);});
  }
  async function manage(){
    if(!state.admin){
      page('<section><h2>Painel de gestão</h2><p>Entre com a conta Google institucional autorizada.</p>'+login()+'</section>');
      return;
    }
    page('<section><span class="tag">GESTÃO</span><h2>Ofertas e avaliações</h2><details><summary>Cadastrar turma</summary><form id="create"><div class="grid">'+
      field('Disciplina',select('course',courses.map((x,i)=>opt(x,i))))+
      field('Semestre','<input name="term" placeholder="2026.2" pattern="20[0-9]{2}[.][12]" required>')+
      field('Identificação da turma','<input name="section" placeholder="Turma A" maxlength="60" required>')+
      field('Docente(s)','<input name="teachers" maxlength="240" required>')+
      field('Modalidade',select('modality',modalities.map(x=>opt(x))))+
      field('Discentes elegíveis','<input type="number" name="enrolled" min="1" max="500" required>')+
      '</div>'+buttons('Abrir coleta')+'</form></details><p>Use a lista de matrícula da oferta para contar os elegíveis e distribua os códigos individualmente, sem manter uma associação nominal no sistema.</p><div id="offers"></div></section>');
    form('create',async data=>{
      await api('create',{...data,course:Number(data.course),enrolled:Number(data.enrolled)});
      state=await api('start');await manage();message('Turma cadastrada.');
    });
    const {offers}=await api('offers',{});
    const list=document.querySelector('#offers');
    if(!offers.length){list.textContent='Nenhuma turma cadastrada.';return;}
    list.innerHTML=offers.map(o=>'<article><h3>'+esc(name(o))+'</h3><p>'+(o.active?'Coleta aberta':'Coleta encerrada')+' · '+o.received+'/'+o.enrolled+' respostas · '+o.issued+' códigos emitidos</p><div class="controls">'+
      '<button data-do="report">Ver respostas</button><button data-do="toggle">'+(o.active?'Encerrar coleta':'Reabrir coleta')+'</button>'+
      (o.active?'<label>Quantidade <input type="number" min="1" max="50" value="1"></label><button data-do="tickets">Gerar códigos discentes</button>':'<button data-do="share">Gerar código de consulta</button>')+
      '<button data-do="revoke">Revogar consultas</button></div></article>').join('');
    [...list.children].forEach((el,i)=>el.querySelectorAll('button').forEach(button=>button.onclick=async()=>{
      button.disabled=true;message('');output().replaceChildren();
      const o=offers[i], op=button.dataset.do;
      try{
        const result=await api(op,{offer:o.id,active:!o.active,count:Number(el.querySelector('input')?.value)});
        if(op==='report')draw(result,true);
        else if(op==='tickets'||op==='share'){
          if(op==='tickets')await manage();
          output().innerHTML='<section><h3>'+(op==='tickets'?'Códigos individuais de participação':'Código de consulta válido por 7 dias')+'</h3><p>Copie antes de sair. O código completo só é mostrado agora.</p><textarea readonly aria-label="Códigos gerados">'+esc((result.codes||[result.code]).join('\n'))+'</textarea></section>';
        }else {state=await api('start');await manage();message(op==='revoke'?'Consultas revogadas.':'Situação da coleta atualizada.');}
        document.querySelector('#message').scrollIntoView({block:'nearest'});
      }catch(e){message(e.message,true);}finally{button.disabled=false;}
    }));
  }
  function method(){
    page('<section><span class="tag">METODOLOGIA · V1</span><h2>Como ler os resultados</h2><p>Os eixos avaliam a experiência na disciplina. A nota geral de 0 a 10 é uma pergunta independente. Os resultados orientam a revisão da oferta e a devolutiva acadêmica.</p><div class="table"><table><thead><tr><th>Evidência</th><th>Uso na autoavaliação</th></tr></thead><tbody><tr><td>Ementa e formação interdisciplinar</td><td>Coerência curricular com Meio Ambiente e Sustentabilidade e as duas linhas do PPGCA. CAPES, itens 1.1.1 e 1.1.2.</td></tr><tr><td>Prática docente, recursos e acessibilidade</td><td>Condições de aprendizagem e infraestrutura percebida. CAPES, itens 1.1.3 e 1.3.</td></tr><tr><td>Participação, comentários e ação registrada</td><td>Evidência para discussão, acompanhamento e devolutiva. CAPES, item 1.2.</td></tr></tbody></table></div><p><strong>Cálculo.</strong> Em cada eixo, faça a média dos itens válidos por respondente, depois a média entre respondentes. Converta para 0–100 com 25 × (média − 1). N/A fica fora do cálculo. A participação divide respostas pelo número de elegíveis cadastrado. Indicadores quantitativos exigem cinco respostas válidas por item ou eixo.</p><p>Esta coleta por disciplina compõe a autoavaliação do programa. A conferência com o PPP integral e a aprovação institucional do instrumento estão pendentes.</p><p><a href="'+links.matriz+'">Matriz curricular UNEMAT</a> · <a href="'+links.normas+'">Regimento e planejamento do PPGCA</a> · <a href="'+links.capes+'">CAPES · Ciências Ambientais 2025–2028</a></p></section>');
  }
  const views={catalog,vote,consult,manage,method,privacy};
  async function show(key){
    document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));
    try{if(!state)state=await api('start');document.querySelector('#session').innerHTML=state.email?'<form action="/auth/logout" method="post"><span>'+esc(state.email)+'</span> <button>Sair</button></form>':(state.googleReady?login():'');await views[key]();}
    catch(e){page('<section><h2>Serviço indisponível</h2><p>Tente novamente em instantes.</p></section>');message(e.message,true);}
  }
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.view));
  const query=new URLSearchParams(location.search);
  const access=query.get('acesso');
  show(query.has('privacidade')?'privacy':query.has('painel')?'manage':access?'vote':'catalog').then(()=>{
    const errors={dominio:'Use uma conta Google Workspace verificada @unemat.br.',expirado:'A tentativa de login expirou. Entre novamente.',erro:'O Google não concluiu o login. Tente novamente.',configuracao:'O login institucional ainda está em configuração.'};
    if(errors[access])message(errors[access],true);
    if(access)history.replaceState(null,'',location.pathname);
  });
}
const css=`
.brands{display:flex;gap:.8rem;align-items:center;margin:0 0 1.3rem}.brands img{height:65px;max-width:45%;object-fit:contain;background:white;border-radius:.45rem;padding:.35rem}.brands img+img{height:78px}#session{margin-left:auto}#session form{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}:root{font-family:system-ui,sans-serif;color:#19332c;background:#f3f5ee;line-height:1.55}*{box-sizing:border-box}body{margin:0}header{background:#163d32;color:#fff;padding:2.5rem max(1rem,calc((100% - 900px)/2));border-bottom:5px solid #c6a963}h1{font-size:clamp(2rem,6vw,3.6rem);line-height:1.08;margin:.45rem 0}.tag{font-size:.74rem;letter-spacing:.12em;font-weight:800}header p{color:#d4e5db;margin:.65rem 0 0}nav,main,footer{max-width:900px;margin:auto;padding:1rem}nav,.controls{display:flex;gap:.55rem;flex-wrap:wrap}nav button{background:white;color:#163d32}nav button[aria-pressed=true],button,.button{background:#185140;color:white}button,.button{padding:.6rem .85rem;border:1px solid #185140;border-radius:.55rem;cursor:pointer;font:inherit;font-weight:650;text-decoration:none;display:inline-block}button:disabled{opacity:.55;cursor:wait}section,article{background:white;border:1px solid #d4ded3;border-radius:.85rem;padding:clamp(1rem,3vw,2rem);margin-bottom:1rem}article{padding:1rem}h2,h3{line-height:1.2;margin:.45rem 0 .7rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:1rem}label{display:block;font-weight:600;margin:.55rem 0}input,textarea,select{display:block;width:100%;font:inherit;padding:.55rem;border:1px solid #a4b6aa;border-radius:.45rem;background:white;color:#19332c;margin:.3rem 0}textarea{min-height:6rem;resize:vertical}.check input{width:auto;display:inline-block}fieldset,details{border:1px solid #d4ded3;border-radius:.55rem;margin:1rem 0;padding:.75rem}legend,summary{font-weight:750}summary{cursor:pointer}fieldset label{display:grid;grid-template-columns:1fr minmax(95px,125px);gap:.7rem;align-items:center}fieldset label+label{border-top:1px solid #edf0ea}.hint,.cards>div{background:#e8f1e9;padding:.7rem;border-radius:.45rem}.controls input{width:5rem;display:inline-block}.controls label{margin:0}.table{overflow:auto}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:.5rem;border-bottom:1px solid #d4ded3}a{color:#185140}.error{color:#a12224}#message:not(:empty){padding:1rem;background:white;border-radius:.5rem}footer{font-size:.9rem;color:#3f5e50}footer p{margin:.2rem 0}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #a8761b;outline-offset:2px}
`;
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Avaliação de Disciplinas | PPGCA · UNEMAT</title><style>${css}</style><header><div class="brands"><img src="/marcas/unemat.png" alt="UNEMAT"><img src="/marcas/ppgca.png" alt="PPGCA"></div><span class="tag">UNEMAT · CÁCERES · PPGCA</span><h1>Avaliação de disciplinas</h1><p>Mestrado e Doutorado em Ciências Ambientais</p></header><nav aria-label="Seções"><button data-view="catalog">Disciplinas</button><button data-view="vote">Responder</button><button data-view="consult">Consultar com código</button><button data-view="manage">Painel de gestão</button><button data-view="method">Metodologia</button><button data-view="privacy">Privacidade e LGPD</button><div id="session"></div></nav><main><p>Carregando…</p></main><footer><p><strong>Comissão de avaliação</strong></p><p>Carla Galbiati · Dionei José da Silva · Ernandes Sobreira · Wilkinson Lázaro</p></footer><script src="/app.js"></script></html>`;
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/auth/'))return google(request,env,url);
    const brand=url.pathname.match(/^\/marcas\/(unemat|ppgca)\.png$/);
    if(brand)return new Response(Uint8Array.from(atob(logos[brand[1]]),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
    if(url.pathname.startsWith('/api/')){
      try{return await api(request,env,url);}
      catch(error){console.error(error.message);return fail('Não foi possível concluir a operação. Tente novamente.',500);}
    }
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'"};
    if(url.pathname==='/app.js')return new Response('('+client.toString()+')('+JSON.stringify({courses,groups,prompts,options,modalities,links})+');',{headers:{...headers,'Content-Type':'text/javascript; charset=utf-8'}});
    if(url.pathname==='/')return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
    return new Response('Página não encontrada',{status:404});
  }
};
