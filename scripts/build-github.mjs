import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
const source=await readFile('dist/server/index.js','utf8');
const module=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {client,courses,groups,prompts,options,modalities,links,firebaseConfig,summarize,feedback,themeRules,protection};').toString('base64'));
const {client,courses,groups,prompts,options,modalities,links,firebaseConfig,summarize,feedback,themeRules,protection}=module;
await rm('web',{force:true,recursive:true});await mkdir('web/data',{recursive:true});
let html=await (await module.default.fetch(new Request('https://build.local/'),{})).text();
html=html.replace('src="/app.js"','type="module" src="./app.js"').replace('src="/marcas/unemat.png"','src="./assets/unemat.png"').replace('src="/marcas/ppgca.png"','src="./assets/ppgca-02.png"');
await writeFile('web/index.html',html);
let js=client.toString();
const apiStart=js.indexOf('  async function api(path,data){'),apiEnd=js.indexOf('  function form(',apiStart);
js=js.slice(0,apiStart)+'  async function api(path,data){return globalThis.ppgcaBackend.api(path,data);}\n'+js.slice(apiEnd);
const loginStart=js.indexOf("  document.addEventListener('click',async event=>{"),loginEnd=js.indexOf("  document.querySelectorAll('nav button')",loginStart);
js=js.slice(0,loginStart)+`  document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-login],[data-logout]');if(!button)return;button.disabled=true;
 try{if(button.hasAttribute('data-logout'))await globalThis.ppgcaBackend.logout();else await globalThis.ppgcaBackend.login();state=await api('start');await show(button.dataset.login||'vote');}
 catch(error){message(error.code==='auth/unauthorized-domain'?'O domínio do GitHub precisa ser autorizado no Firebase.':error.message,true);}finally{button.disabled=false;}
 });\n`+js.slice(loginEnd);
const sessionStart=js.indexOf("document.querySelector('#session').innerHTML=state.email?"),sessionEnd=js.indexOf(';await views[key]();',sessionStart);
if(sessionStart<0||sessionEnd<0)throw new Error('Session section not found');
js=js.slice(0,sessionStart)+`document.querySelector('#session').innerHTML=state.email?'<span>'+esc(state.email)+'</span> <button data-logout>Sair</button>':(state.googleReady?login():'')`+js.slice(sessionEnd);
js=js.replaceAll("location.origin+'/?turma='","location.origin+location.pathname+'?turma='").replaceAll('href="/?privacidade=1"','href="?privacidade=1"');
js=js.replaceAll('uma chave derivada da conta para impedir duplicatas','um identificador técnico da autenticação Firebase para impedir duplicatas').replaceAll('Participantes externos usam um convite da turma.','Participantes externos usam a lista de alunos da turma ou um convite específico.');
js=js.replaceAll('Importar turmas do SIGAA','Carregar catálogo do SIGAA').replaceAll('até 500','até 400').replaceAll('rows.length>500','rows.length>400').replaceAll('>500','>400');
const config={courses,groups,prompts,options,modalities,links,firebaseConfig};
await writeFile('web/app.js',`import {createBackend} from './firebase-backend.js';\nconst config=${JSON.stringify(config)};\ntry{globalThis.ppgcaBackend=await createBackend(config);(${js})(config);}catch(error){document.querySelector('main').textContent='Não foi possível conectar ao Firebase: '+error.message;}\n`);
await writeFile('web/metrics.js',`const groups=${JSON.stringify(groups)},prompts=${JSON.stringify(prompts)},protection=${protection},themeRules=${JSON.stringify(themeRules.map(([label,re])=>[label,re.source]))}.map(([label,source])=>[label,new RegExp(source)]);\nexport ${summarize.toString()}\nexport ${feedback.toString()}\n`);
await cp('firebase-backend.js','web/firebase-backend.js');await cp('assets','web/assets',{recursive:true});await cp('catalog-2026.2.json','web/data/sigaa-2026.2.json');await writeFile('web/.nojekyll','');
console.log('Standalone GitHub Pages build ready in web/');
