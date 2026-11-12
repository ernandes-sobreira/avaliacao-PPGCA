import {createBackend} from './firebase-backend.js';
const config={"courses":["Epistemologia Ambiental","Meio Ambiente e Sustentabilidade nos Biomas, Pantanal, Amazônia e Cerrado","Elaboração de Tese","Ciências Sociais e o Desenvolvimento Regional","Seminários de Mestrado","Seminários de Doutorado","Métodos e Técnicas para o Estudo da Diversidade Cultural nos Biomas Matogrossenses","Climas, mudanças climáticas e consequências ambientais","Saúde e Interações Ambientais","Agricultura, meio ambiente e desenvolvimento","Impactos ambientais de poluentes sobre a biodiversidade","Atributos do solo e a conservação ambiental","Etnobiologia e Etnoecologia","Paisagem e territorialização socioambiental","Indicadores biológicos como ferramenta de avaliação ambiental","Componentes ambientais, uso e gestão dos recursos hídricos","Conservação e uso sustentável da Biodiversidade no Pantanal, Amazônia e Cerrado","Geografia Política e Meio Ambiente na Amazônia","Pesquisa orientada","Estatística Aplicada à Ciências Ambientais I","Estatística Aplicada à Ciências Ambientais II","Avaliação de impacto de grandes empreendimentos e os riscos para a saúde humana","Ordenamento Territorial nas Fronteiras Políticas e nos Biomas Matogrossenses"],"groups":[["Ementa e organização",["O conteúdo trabalhado correspondeu à ementa.","A ementa abordou temas atuais das Ciências Ambientais.","A bibliografia sustentou o aprendizado.","A carga horária foi adequada ao conteúdo."]],["Prática docente",["O plano de ensino orientou as atividades da disciplina.","As explicações foram claras.","As aulas favoreceram a participação e o debate.","Houve oportunidade para esclarecer dúvidas."]],["Avaliação e condições de aprendizagem",["Os critérios de avaliação ficaram claros desde o início.","As avaliações foram coerentes com o conteúdo trabalhado.","Recebi devolutivas em tempo útil.","Os recursos de ensino atenderam às atividades.","As atividades e os materiais favoreceram a participação em condições de acessibilidade."]],["Formação em Ciências Ambientais",["A disciplina integrou perspectivas de diferentes áreas do conhecimento.","A disciplina ajudou a compreender questões do Pantanal, da Amazônia ou do Cerrado.","O conteúdo dialogou com minha linha ou projeto de pesquisa.","A disciplina contribuiu para minha formação em pesquisa, docência ou extensão.","A disciplina contribuiu para minha dissertação ou tese."]]],"prompts":["O que funcionou melhor?","O que deveria mudar primeiro?","Sugestões para a ementa, bibliografia, carga horária, formato ou atividades práticas","Proposta de nova disciplina, com tema, linha de pesquisa e lacuna que preencheria"],"options":["Mestrado","Doutorado","Egresso(a)","Discente especial"],"modalities":["Presencial","Remota","Híbrida"],"links":{"matriz":"https://portal.unemat.br/media/files/matriz-curricular-ppgca-mestrado-e-doutorado.pdf","normas":"https://caceres.unemat.br/faculdades/facab/stricto/ppgca/normas-e-regulamentos","capes":"https://www.gov.br/capes/pt-br/acesso-a-informacao/acoes-e-programas/avaliacao/sobre-a-avaliacao/areas-avaliacao/sobre-as-areas-de-avaliacao/colegio-de-ciencias-exatas-tecnologicas-e-multidisciplinar/multidisciplinar/ciencias-ambientais"},"firebaseConfig":{"apiKey":"AIzaSyAAHEt6VSdsRT1umaDmeZca2Kvrob-KnIY","authDomain":"avaliacao-ppgca.firebaseapp.com","projectId":"avaliacao-ppgca","appId":"1:723483763713:web:1c225005c9dc41f7c9cc00"}};
try{globalThis.ppgcaBackend=await createBackend(config);(function client(config){
  const {courses,groups,prompts,options,modalities,links,firebaseConfig}=config;
  const parseRosterCsv=(function(text,offer){
  if(typeof text!=='string'||text.length>100000)throw new Error('O arquivo deve ter até 100 KB.');
  text=text.replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/)[0];
  const delimiter=first.includes(';')?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else if(!cell||quoted)quoted=!quoted;
      else throw new Error('Aspas inválidas no CSV.');
    }else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){
      row.push(cell.trim());cell='';
      if(c!==delimiter){if(row.some(x=>x))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    }else cell+=c;
  }
  if(quoted)throw new Error('Há aspas não fechadas no CSV.');
  row.push(cell.trim());if(row.some(x=>x))rows.push(row);
  const head=(rows.shift()||[]).map(x=>x.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[ _-]/g,''));
  const ni=head.indexOf('nome'),ei=head.findIndex(x=>x==='email');
  if(ni<0||ei<0)throw new Error('O cabeçalho deve conter nome e email.');
  if(rows.length>400)throw new Error('Importe até 400 linhas por arquivo.');
  const errors=[],students=[],seen=new Set();let duplicates=0;
  rows.forEach((values,i)=>{
    const name=values[ni]||'',email=(values[ei]||'').toLowerCase();
    const si=head.indexOf('semestre'),ti=head.indexOf('turma');
    if(!name||name.length>120||email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){errors.push('Linha '+(i+2)+': confira nome e e-mail.');return;}
    if((si>=0&&values[si]&&values[si]!==offer.term)||(ti>=0&&values[ti]&&values[ti]!==offer.section)){errors.push('Linha '+(i+2)+': semestre ou turma diferente da selecionada.');return;}
    if(seen.has(email)){duplicates++;return;}seen.add(email);students.push({name,email});
  });
  if(!students.length&&!errors.length)errors.push('Nenhum aluno encontrado.');
  return {students,duplicates,errors};
});
  const root=document.querySelector('main');
  let state;
  let viewRequest=0;
  let noticeAcknowledged=false;
  const linkParams=new URLSearchParams(location.search);
  let selectedOffer=linkParams.get('turma');
  const externalInvite=linkParams.get('convite')||'';
  if(externalInvite)history.replaceState(null,'',location.pathname+'?turma='+encodeURIComponent(selectedOffer||''));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const opt=(label,value=label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
  const name=o=>(o.title||courses[o.course])+' · '+o.term+' · '+o.section;
  const courseTone=o=>{const title=(o.title||courses[o.course]||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();let code=0;for(const c of title)code=(code*31+c.charCodeAt(0))>>>0;return code%8;};
  const courseClass=o=>'course-tone course-tone-'+courseTone(o);
  const select=(key,values)=>'<select required name="'+key+'"><option value="">Selecione</option>'+values.join('')+'</select>';
  const field=(label,content)=>'<label>'+label+content+'</label>';
  const buttons=(label)=>'<button type="submit">'+label+'</button>';
  const format=(v,d=1)=>v===null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:d});
  async function api(path,data){return globalThis.ppgcaBackend.api(path,data);}
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
  const login=(view='vote')=>{
    const label=view==='manage'?'Entrar no painel com Google':'Entrar com Google';
    return state.googleReady?'<button data-login="'+view+'">'+label+'</button>':'<button disabled>'+label+'</button><p class="hint">O login institucional está em configuração.</p>';
  };
  const privacyNotice='<section><span class="tag">AVISO DE PRIVACIDADE · V1</span><h2>Privacidade e proteção de dados</h2><h3>Finalidade</h3><p>Verificar a elegibilidade, evitar avaliações duplicadas e orientar melhorias em ementas, ensino e condições de aprendizagem. Indicadores agregados podem subsidiar a autoavaliação e os relatórios do PPGCA.</p><h3>Dados tratados e acesso</h3><p>O login Google verifica o e-mail e o identificador da conta em uma sessão temporária. Participantes externos usam a lista de alunos da turma ou um convite específico. O registro da avaliação guarda a turma, o vínculo informado, as notas, os comentários opcionais e um identificador técnico da autenticação Firebase para impedir duplicatas. O painel de gestão mostra os comentários. Os resultados ficam restritos às contas autorizadas da coordenação e da comissão de avaliação. Evite nomes, matrículas e informações sensíveis nos comentários.</p><h3>Em caso de incidente</h3><p>Comunique a suspeita ao canal de proteção de dados da UNEMAT. O controlador deve conter e avaliar o incidente, preservar registros e adotar medidas de mitigação. Quando houver risco ou dano relevante, o controlador deve comunicar a ANPD e as pessoas afetadas em até três dias úteis, ressalvado prazo específico, informando os dados afetados, os riscos e as medidas de proteção.</p><h3>Seus direitos</h3><p>Use o canal oficial da UNEMAT para solicitar informações, acesso, correção e exercer os demais direitos aplicáveis. Este aviso está em revisão institucional quanto à base legal, ao prazo de retenção, aos operadores e ao descarte. A confirmação de leitura registra ciência do aviso.</p><p><a href="https://unemat.br/site/lgpd">Canal de proteção de dados da UNEMAT</a> · <a href="https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis">Orientações da ANPD</a></p>';
  function privacy(){page(privacyNotice+'</section>');}
  const questions=()=>groups.map(([title,items],i)=>'<fieldset><legend>'+title+'</legend>'+items.map((q,j)=>field(q,select('q'+i+'_'+j,[1,2,3,4,5,'N/A'].map(x=>opt(x))))).join('')+'</fieldset>').join('')+
      field('Nota geral de 0 a 10','<input type="number" name="grade" min="0" max="10" step="1" required>')+
      '<details><summary>Sugestões e comentários opcionais</summary>'+prompts.map((p,i)=>field(p,'<textarea name="c'+i+'" maxlength="1200"></textarea>')).join('')+'</details>';
  function vote(){
    if(!state.email){page('<section><h2>Entre com seu Google institucional</h2><p>Use sua conta @unemat.br ou uma conta Google verificada com um convite da turma.</p>'+login()+'<p><a href="?privacidade=1">Ler o aviso de privacidade</a></p></section>');return;}
    if(!noticeAcknowledged){
      page(privacyNotice+'<form id="acknowledge"><label class="check"><input type="checkbox" name="privacy" required> Li o aviso de privacidade e estou ciente de como meus dados serão usados.</label>'+buttons('Continuar para a avaliação')+'</form></section>');
      form('acknowledge',async data=>{
        if(data.privacy!=='on')return;
        noticeAcknowledged=true;
        vote();
        root.scrollIntoView({block:'start'});
      });
      return;
    }
    if(!state.offers.length){page('<section><span class="tag">COLETA DISCENTE</span><h2>Nenhuma turma aberta</h2><p>Quando a comissão abrir uma oferta, ela aparecerá aqui.</p></section>');return;}
    const internal=state.email.endsWith('@unemat.br');
    const available=state.offers.filter(o=>internal||o.roster_required===1||(o.id===linkParams.get('turma')&&externalInvite));
    if(!available.length){page('<section><h2>Convite da turma necessário</h2><p>Abra o link de convite externo da turma para responder com sua conta Google.</p></section>');return;}
    page('<section><span class="tag">COLETA DISCENTE</span><h2>Avalie uma disciplina cursada</h2><p>Envie uma avaliação por turma cursada. A conta institucional é verificada no login. O e-mail fica separado das respostas. Evite informações que identifiquem você ou colegas nos comentários.</p><form id="vote"><div class="grid">'+
      field('Disciplina e turma',select('offer',available.map(o=>opt(name(o),o.id))))+
      field('Vínculo na época da disciplina',select('level',options.map(x=>opt(x))))+
      '</div><p id="detail"></p><label class="check"><input type="checkbox" name="attended" required> Confirmo que cursei esta turma.</label><p class="hint">1 = discordo totalmente · 2 = discordo · 3 = neutro · 4 = concordo · 5 = concordo totalmente · N/A = não se aplica.</p>'+
      questions()+buttons('Enviar avaliação')+'</form></section>');
    document.querySelector('[name=offer]').onchange=e=>{
      const o=state.offers.find(x=>x.id===e.target.value);
      document.querySelector('#detail').textContent=o?[o.teachers,o.modality,o.schedule].filter(Boolean).join(' · '):'';
    };
    const offerSelect=document.querySelector('[name=offer]');
    if(available.length===1)selectedOffer=available[0].id;
    if(selectedOffer && available.some(o=>o.id===selectedOffer)){
      offerSelect.value=selectedOffer;
      offerSelect.dispatchEvent(new Event('change'));
    }
    selectedOffer=undefined;
    form('vote',async data=>{
      await api('vote',{offer:data.offer,code:externalInvite,privacy:noticeAcknowledged,level:data.level,attended:data.attended==='on',grade:Number(data.grade),ratings:groups.map((g,i)=>g[1].map((_,j)=>data['q'+i+'_'+j]==='N/A'?null:Number(data['q'+i+'_'+j]))),comments:prompts.map((_,i)=>data['c'+i])});
      page('<section><span class="tag">RESPOSTA REGISTRADA</span><h2>Obrigado pela avaliação</h2><p>Sua contribuição será considerada na revisão da oferta.</p><button id="again">Avaliar outra turma</button></section>');
      document.querySelector('#again').onclick=vote;
    });
  }
  function assessment(stats){
    const ranked=stats.groups.flatMap(g=>g.items).filter(item=>item.mean!==null).sort((a,b)=>b.mean-a.mean);
    if(!ranked.length)return '<p class="hint">Os indicadores aparecem a partir de cinco respostas válidas por item ou eixo.</p>';
    const itemList=items=>'<ul>'+items.map(item=>'<li>'+esc(item.q)+' <b>'+format(item.mean)+' / 5</b> · '+item.n+' válidas</li>').join('')+'</ul>';
    const positive=ranked.filter(item=>item.mean>=4).slice(0,3);
    const attention=ranked.filter(item=>item.mean<4).reverse().slice(0,3);
    return '<div class="grid insight"><div><h3>Pontos fortes</h3>'+(positive.length?itemList(positive):'<p>Nenhum item com média de 4 ou mais.</p>')+'</div><div><h3>Pontos de atenção</h3>'+(attention.length?itemList(attention):'<p>Todos os itens com dados atingiram média 4.</p>')+'</div></div><small>Referência de leitura do painel · médias de 4 ou mais destacam pontos fortes. Abaixo de 4, os menores valores aparecem primeiro.</small>';
  }
  function axes(stats){
    return '<div class="grid cards dashboard">'+stats.groups.map(g=>'<div><b>'+esc(g.title)+'</b><br><strong>'+format(g.index)+'</strong> / 100<br>'+(g.index===null?'':'<meter min="0" max="100" value="'+g.index+'" aria-label="'+esc(g.title)+'"></meter><br>')+'<small>'+g.n+' respostas válidas</small></div>').join('')+'</div>';
  }
  function voices(entries,comments){
    return '<h3>O que os discentes dizem</h3><p>Menções por pergunta, identificadas por palavras-chave. Uma resposta pode mencionar mais de um tema. As contagens indicam assunto, sem inferir aprovação ou crítica.</p>'+
      entries.map(e=>'<details'+(e.n?' open':'')+'><summary>'+esc(e.prompt)+' · '+e.n+' comentário(s)</summary>'+
        (e.themes.length?'<ul>'+e.themes.map(t=>'<li>'+esc(t.label)+' · <b>'+t.n+'</b></li>').join('')+'</ul>':'<p>Sem temas identificados pelas palavras-chave.</p>')+
        (comments?.length?'<details><summary>Ler respostas desta pergunta</summary>'+comments.filter(c=>c.prompt===e.prompt).map(c=>'<p class="quote">'+esc(c.value)+'</p>').join('')+'</details>':'')+'</details>').join('');
  }
  function draw(result,admin){
    const {offer,stats,comments,action}=result;
    output().innerHTML='<section class="course-report '+courseClass(offer)+'"><span class="tag">RELATÓRIO POR TURMA</span><h2>'+esc(name(offer))+'</h2><p>'+esc(offer.teachers)+' · '+esc(offer.modality)+'</p><div class="grid cards"><div><strong>'+stats.n+' / '+(offer.enrolled||'—')+'</strong><br>Respostas / elegíveis</div><div><strong>'+(offer.enrolled?format(100*stats.n/offer.enrolled)+'%':'—')+'</strong><br>Participação</div><div><strong>'+format(stats.grade)+'</strong><br>Nota geral média / 10</div></div>'+
      (stats.n<5?'<p>Menos de cinco respostas. Os indicadores quantitativos ficam ocultos.</p>':'')+
      axes(stats)+assessment(stats)+voices(result.feedback,comments)+'<h3>Distribuição das respostas por item</h3>'+stats.groups.map(g=>'<details><summary>'+esc(g.title)+' · '+format(g.index)+' / 100</summary>'+(g.index===null?'':'<meter min="0" max="100" value="'+g.index+'" aria-label="'+esc(g.title)+'"></meter>')+'<p>'+g.n+' respostas válidas no eixo.</p><div class="table"><table><thead><tr><th>Item</th><th>Média</th><th>Válidas</th><th>N/A</th><th>1 · 2 · 3 · 4 · 5</th></tr></thead><tbody>'+g.items.map(q=>'<tr><td>'+esc(q.q)+'</td><td>'+format(q.mean)+'</td><td>'+q.n+'</td><td>'+q.na+'</td><td>'+(q.counts?.join(' · ')||'—')+'</td></tr>').join('')+'</tbody></table></div></details>').join('')+
      (admin?'<form id="action"><h3>Acompanhamento da melhoria</h3>'+field('Ação ou devolutiva','<textarea name="action" required maxlength="1200">'+esc(action?.action)+'</textarea>')+field('Responsável','<input name="owner" required maxlength="120" value="'+esc(action?.owner)+'">')+field('Prazo','<input name="due" type="date" required value="'+esc(action?.due)+'">')+field('Situação','<select name="status">'+['Proposta','Em andamento','Concluída'].map(x=>'<option'+(action?.status===x?' selected':'')+'>'+x+'</option>').join('')+'</select>')+buttons('Salvar acompanhamento')+'</form>':'')+'</section>';
    if(admin)form('action',async data=>{await api('action',{...data,offer:offer.id});message('Acompanhamento salvo.');});
  }
  function importStudents(offer){
    output().innerHTML='<section class="course-report '+courseClass(offer)+'"><span class="tag">IMPORTAR ALUNOS</span><h2>'+esc(name(offer))+'</h2><p>Envie um CSV com as colunas <strong>nome</strong> e <strong>email</strong>. Semestre e turma são opcionais e devem coincidir com esta oferta. No Excel, use Salvar como → CSV UTF-8.</p><p>A confirmação adiciona os alunos à lista existente e restringe a avaliação aos e-mails cadastrados. Não envia mensagens nem cria contas Google. Os nomes ficam na gestão da lista, separados das respostas.</p><button id="roster-model">Baixar modelo CSV</button><label>Arquivo de alunos<input id="roster-file" type="file" accept=".csv,text/csv"></label><div id="roster-preview" aria-live="polite"></div></section>';
    const panel=output().querySelector('section');
    panel.querySelector('#roster-model').onclick=()=>{
      const blob=new Blob(['\uFEFFnome;email;semestre;turma\r\nAluno Exemplo;aluno.exemplo@unemat.br;'+offer.term+';"'+offer.section.replaceAll('"','""')+'"\r\n'],{type:'text/csv;charset=utf-8'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='modelo-alunos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    };
    panel.querySelector('#roster-file').onchange=async event=>{
      const file=event.target.files[0],preview=panel.querySelector('#roster-preview');
      preview.replaceChildren();if(!file)return;
      try{
        if(file.size>100000)throw new Error('O arquivo deve ter até 100 KB.');
        const parsed=parseRosterCsv(await file.text(),offer);
        if(!panel.isConnected)return;
        preview.innerHTML='<p><strong>'+parsed.students.length+' alunos válidos</strong> · '+parsed.duplicates+' duplicados no arquivo.</p>'+(parsed.errors.length?'<p class="error">Corrija o arquivo antes de confirmar.</p><ul>'+parsed.errors.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'<div class="table"><table><thead><tr><th>Nome</th><th>E-mail</th></tr></thead><tbody>'+parsed.students.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.email)+'</td></tr>').join('')+'</tbody></table></div><button id="roster-confirm" '+(parsed.errors.length?'disabled':'')+'>Confirmar importação e restringir acesso</button>';
        preview.querySelector('#roster-confirm').onclick=async e=>{
          e.target.disabled=true;
          try{
            const result=await api('import-roster',{offer:offer.id,students:parsed.students});
            if(panel.isConnected)preview.innerHTML='<p><strong>Importação concluída.</strong> '+result.added+' novos alunos; '+result.total+' cadastrados nesta turma. A coleta '+(offer.active?'permanece aberta':'continua fechada até você abri-la')+'.</p>';
            state=await api('start');
          }catch(error){message(error.message,true);e.target.disabled=false;}
        };
      }catch(error){if(panel.isConnected)preview.textContent=error.message;}
    };
    panel.scrollIntoView({block:'start'});
  }
  async function manage(){
    if(!state.admin){
      page('<section><h2>Painel de análises</h2><p>Acesso à gestão das turmas, aos indicadores e aos comentários. Use a conta institucional autorizada.</p>'+(state.email?'<p class="hint">A conta '+esc(state.email)+' não tem acesso ao painel.</p>':'')+login('manage')+'</section>');
      return;
    }
    page('<section><span class="tag">GESTÃO</span><h2>Administrar avaliações</h2><p class="hint"><strong>Administrador conectado: </strong>'+esc(state.email)+'. Você pode abrir e encerrar coletas.</p><ol><li>Confira as turmas importadas ou cadastre uma turma.</li><li>Clique em <strong>Abrir avaliação</strong> na turma desejada.</li><li>Copie o <strong>Link da turma</strong> e compartilhe com os alunos.</li><li>Ao terminar o prazo, clique em <strong>Encerrar coleta</strong>.</li></ol><p>Com uma lista importada, só os e-mails cadastrados podem avaliar. Sem lista, contas @unemat.br acessam por link e contas externas precisam de convite. Cada conta pode responder uma vez por turma.</p><p><a class="button" href="#offers">Abrir ou encerrar turmas</a></p><details open><summary>Importar ou cadastrar turmas</summary><form id="sigaa"><div class="grid">'+field('Semestre para importar do SIGAA','<input name="term" placeholder="2026.2" pattern="20[0-9]{2}[.][12]" required>')+'</div>'+buttons('Carregar catálogo do SIGAA')+'</form><details><summary>Cadastrar turma</summary><form id="create"><div class="grid">'+
      field('Disciplina',select('course',courses.map((x,i)=>opt(x,i))))+
      field('Semestre','<input name="term" placeholder="2026.2" pattern="20[0-9]{2}[.][12]" required>')+
      field('Identificação da turma','<input name="section" placeholder="Turma A" maxlength="60" required>')+
      field('Docente(s)','<input name="teachers" maxlength="240" required>')+
      field('Modalidade',select('modality',modalities.map(x=>opt(x))))+
      field('Total oficial de elegíveis (opcional)','<input type="number" name="enrolled" min="1" max="500">')+
      '</div>'+buttons('Abrir coleta')+'</form></details><p>Compartilhe o link da turma com os discentes. Para participantes externos, gere um convite específico. A taxa de participação é exibida quando há um total oficial informado.</p></details><h3>Liberação das avaliações</h3><div id="offers"></div><h3>Resultados do programa</h3><div id="dashboard"></div></section>');
    form('sigaa',async data=>{
      const result=await api('import-sigaa',data);
      await manage();
      message(result.found?result.found+' ofertas encontradas. '+result.added+' adicionadas para conferência.':'Nenhuma oferta encontrada para esse semestre.');
    });
    form('create',async data=>{
      await api('create',{...data,course:Number(data.course),enrolled:Number(data.enrolled)});
      state=await api('start');await manage();message('Turma cadastrada.');
    });
    const dash=document.querySelector('#dashboard');
    const {offers}=await api('offers',{});
    if(!dash?.isConnected)return;
    const terms=[...new Set(offers.map(o=>o.term))].sort().reverse();
    dash.innerHTML='<h3>Visão geral do PPGCA</h3>'+field('Período','<select id="dash-term">'+opt('Todos os semestres','')+terms.map(t=>opt(t)).join('')+'</select>')+'<div id="dash-summary" aria-live="polite"></div>';
    const termSelect=document.querySelector('#dash-term');
    const summary=document.querySelector('#dash-summary');
    async function refresh(){
      const term=termSelect.value;
      summary.textContent='Carregando indicadores…';
      try{
        const result=await api('dashboard',{term});
        if(termSelect.value!==term || !summary.isConnected)return;
        const scope=offers.filter(o=>!term||o.term===term);
        const eligible=scope.filter(o=>o.enrolled>0);
        const rate=eligible.length?format(100*eligible.reduce((sum,o)=>sum+o.received,0)/eligible.reduce((sum,o)=>sum+o.enrolled,0))+'%':'—';
        const rows=scope.map(o=>{
          const stats=result.classes[o.id];
          return '<tr class="'+courseClass(o)+'"><th scope="row"><strong>'+esc(o.title||courses[o.course])+'</strong><small>'+esc(o.term+' · '+o.section)+'</small></th><td>'+o.received+'</td><td>'+format(stats?.grade??null)+'</td>'+
            groups.map((_,i)=>'<td>'+format(stats?.axes[i]??null)+'</td>').join('')+
            '<td><button data-detail="'+esc(o.id)+'">Ver turma</button></td></tr>';
        }).join('');
        summary.innerHTML='<div class="grid cards dashboard"><div><strong>'+scope.filter(o=>o.active).length+'</strong><br>Turmas abertas</div><div><strong>'+scope.filter(o=>o.received>0).length+' / '+scope.length+'</strong><br>Turmas com respostas</div><div><strong>'+result.stats.n+'</strong><br>Respostas recebidas</div><div><strong>'+format(result.stats.grade)+'</strong><br>Nota geral / 10</div><div><strong>'+rate+'</strong><br>Participação · '+eligible.length+' com total oficial</div></div>'+
          '<p>Cada avaliação enviada pesa igualmente no consolidado. Quem avaliou duas turmas contribui com duas avaliações.</p>'+
          axes(result.stats)+assessment(result.stats)+voices(result.feedback)+
          '<h3>Comparação entre turmas</h3>'+(rows?'<p class="comparison-note">Nota geral: 0–10 · Eixos: 0–100 · — = dados insuficientes.</p><div class="table comparison-scroll" role="region" aria-label="Comparação entre turmas" tabindex="0"><table class="comparison"><thead><tr><th scope="col">Disciplina / turma</th><th scope="col">Respostas</th><th scope="col">Nota</th><th scope="col" title="Ementa e organização">Ementa</th><th scope="col" title="Prática docente">Docência</th><th scope="col" title="Avaliação e condições de aprendizagem">Aprendizagem</th><th scope="col" title="Formação em Ciências Ambientais">Formação</th><th scope="col">Detalhes</th></tr></thead><tbody>'+rows+'</tbody></table></div><details class="comparison-key"><summary>O que cada eixo avalia?</summary><dl><dt>Ementa</dt><dd>Ementa e organização.</dd><dt>Docência</dt><dd>Prática docente.</dd><dt>Aprendizagem</dt><dd>Avaliação e condições de aprendizagem.</dd><dt>Formação</dt><dd>Formação em Ciências Ambientais.</dd></dl></details>':'<p>Nenhuma turma nesse período.</p>');
        summary.querySelectorAll('[data-detail]').forEach(button=>button.onclick=async()=>{
          button.disabled=true;
          try{draw(await api('report',{offer:button.dataset.detail}),true);output().scrollIntoView({block:'start'});}
          catch(error){message(error.message,true);}finally{button.disabled=false;}
        });
      }catch(error){if(termSelect.value===term)summary.textContent=error.message;}
    }
    termSelect.onchange=refresh;
    await refresh();
    if(!dash.isConnected)return;
    const list=document.querySelector('#offers');
    if(!list)return;
    if(!offers.length){list.textContent='Nenhuma turma cadastrada.';return;}
    const importedTerms=[...new Set(offers.filter(o=>o.draft).map(o=>o.term))];
    if(importedTerms.length){
      const batch=document.createElement('div');
      batch.className='controls';
      for(const term of importedTerms){
        const button=document.createElement('button');
        button.textContent='Abrir em lote · '+term;
        button.onclick=async()=>{
          if(!confirm('Abrir todas as ofertas importadas que aguardam abertura em '+term+'?'))return;
          button.disabled=true;
          try{const result=await api('open-sigaa',{term});state=await api('start');await manage();message(result.opened+' turmas abertas.');}
          catch(error){message(error.message,true);}finally{button.disabled=false;}
        };
        batch.append(button);
      }
      list.before(batch);
    }
    list.innerHTML=offers.map(o=>'<article class="course-card '+courseClass(o)+'"><h3>'+esc(o.title||courses[o.course])+'</h3><p class="course-meta">'+esc(o.term+' · '+o.section)+'</p><p class="course-status">'+(o.active?'Coleta aberta':o.draft?'Importada · aguardando abertura':'Coleta encerrada')+' · '+o.received+(o.enrolled?'/'+o.enrolled:'')+' respostas'+(o.roster_required?' · Acesso pela lista de alunos':' · Sem lista de alunos')+'</p><div class="controls">'+
      '<button data-do="students">Importar alunos</button><button data-do="report">Ver respostas</button><button data-do="toggle">'+(o.active?'Encerrar coleta':o.draft?'Abrir avaliação':'Reabrir avaliação')+'</button>'+
      (o.active?'<button data-do="link">Link da turma</button><button data-do="invite">Gerar convite externo</button><button data-do="revoke-invite">Revogar convite externo</button>':'')+
      '</div></article>').join('');
    [...list.children].forEach((el,i)=>el.querySelectorAll('button').forEach(button=>button.onclick=async()=>{
      button.disabled=true;message('');output().replaceChildren();
      const o=offers[i], op=button.dataset.do;
      try{
        if(op==='students'){importStudents(o);return;}
        if(op==='link'){output().innerHTML='<section><h3>Link da turma</h3><textarea readonly>'+esc(location.origin+location.pathname+'?turma='+encodeURIComponent(o.id))+'</textarea></section>';return;}
        const result=await api(op,{offer:o.id,active:!o.active,count:Number(el.querySelector('input')?.value)});
        if(op==='report')draw(result,true);
        else if(op==='invite'){
          output().innerHTML='<section><h3>'+'Convite externo da turma'+'</h3><p>Copie antes de sair. O código completo só é mostrado agora.</p><textarea readonly aria-label="Códigos gerados">'+esc(location.origin+location.pathname+'?turma='+encodeURIComponent(o.id)+'&convite='+result.code)+'</textarea></section>';
        }else {state=await api('start');await manage();message(op==='revoke-invite'?'Convite externo revogado.':'Situação da coleta atualizada.');}
        document.querySelector('#message').scrollIntoView({block:'nearest'});
      }catch(e){message(e.message,true);}finally{button.disabled=false;}
    }));
  }
  function method(){
    page('<section><span class="tag">METODOLOGIA · V1</span><h2>Como ler os resultados</h2><p>Os eixos avaliam a experiência na disciplina. A nota geral de 0 a 10 é uma pergunta independente. Os resultados orientam a revisão da oferta e a devolutiva acadêmica.</p><div class="table"><table><thead><tr><th>Evidência</th><th>Uso na autoavaliação</th></tr></thead><tbody><tr><td>Ementa e formação interdisciplinar</td><td>Coerência curricular com Meio Ambiente e Sustentabilidade e as duas linhas do PPGCA. CAPES, itens 1.1.1 e 1.1.2.</td></tr><tr><td>Prática docente, recursos e acessibilidade</td><td>Condições de aprendizagem e infraestrutura percebida. CAPES, itens 1.1.3 e 1.3.</td></tr><tr><td>Participação, comentários e ação registrada</td><td>Evidência para discussão, acompanhamento e devolutiva. CAPES, item 1.2.</td></tr></tbody></table></div><p><strong>Cálculo.</strong> Em cada eixo, faça a média dos itens válidos por respondente, depois a média entre respondentes. Converta para 0–100 com 25 × (média − 1). N/A fica fora do cálculo. A participação divide respostas pelo número de elegíveis cadastrado. Indicadores quantitativos exigem cinco respostas válidas por item ou eixo.</p><p>Esta coleta por disciplina compõe a autoavaliação do programa. A conferência com o PPP integral e a aprovação institucional do instrumento estão pendentes.</p><p><a href="'+links.matriz+'">Matriz curricular UNEMAT</a> · <a href="'+links.normas+'">Regimento e planejamento do PPGCA</a> · <a href="'+links.capes+'">CAPES · Ciências Ambientais 2025–2028</a></p></section>');
  }
  const views={vote,manage,method,privacy};
  async function show(key){
    const requestId=++viewRequest;
    document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));
    try{if(!state)state=await api('start');if(requestId!==viewRequest)return;document.querySelector('#session').innerHTML=state.email?'<span>'+esc(state.email)+'</span> <button data-logout>Sair</button>':(state.googleReady?login():'');await views[key]();}
    catch(e){if(requestId!==viewRequest)return;page('<section><h2>Serviço indisponível</h2><p>Tente novamente em instantes.</p></section>');message(e.message,true);}
  }
  document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-login],[data-logout]');if(!button)return;button.disabled=true;
 try{if(button.hasAttribute('data-logout'))await globalThis.ppgcaBackend.logout();else await globalThis.ppgcaBackend.login();state=await api('start');await show(button.dataset.login||'vote');}
 catch(error){message(error.code==='auth/unauthorized-domain'?'O domínio do GitHub precisa ser autorizado no Firebase.':error.message,true);}finally{button.disabled=false;}
 });
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.view));
  const query=new URLSearchParams(location.search);
  const access=query.get('acesso');
  show(query.has('privacidade')?'privacy':query.has('painel')?'manage':'vote').then(()=>{
    const errors={dominio:'Use uma conta Google Workspace verificada @unemat.br.',expirado:'A tentativa de login expirou. Entre novamente.',erro:'O Google não concluiu o login. Tente novamente.',configuracao:'O login institucional ainda está em configuração.'};
    if(errors[access])message(errors[access],true);
    if(access)history.replaceState(null,'',location.pathname);
  });
})(config);}catch(error){document.querySelector('main').textContent='Não foi possível conectar ao Firebase: '+error.message;}
