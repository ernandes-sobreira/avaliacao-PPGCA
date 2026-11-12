import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import {getAuth,browserSessionPersistence,setPersistence,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signOut} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,deleteDoc,writeBatch,runTransaction,serverTimestamp,getCountFromServer} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import {summarize,feedback} from './metrics.js';
const OWNER='ernandes@unemat.br';
const normalize=email=>(email||'').trim().toLowerCase();
const plain=snapshot=>snapshot.docs.map(d=>({id:d.id,...d.data()}));
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export async function createBackend(config){
  const app=initializeApp(config.firebaseConfig),auth=getAuth(app),db=getFirestore(app);
  await setPersistence(auth,browserSessionPersistence);
  await new Promise(resolve=>{const unsubscribe=onAuthStateChanged(auth,()=>{unsubscribe();resolve();});});
  const offersRef=collection(db,'ppgcaOffers');
  const offerRef=id=>doc(db,'ppgcaOffers',id);
  const user=()=>auth.currentUser;
  const email=()=>normalize(user()?.email);
  const admin=()=>user()?.emailVerified===true&&email()===OWNER;
  const requireAdmin=()=>{if(!admin())throw new Error('Acesso restrito à administração autorizada.');};
  async function allOffers(){return plain(await getDocs(offersRef)).sort((a,b)=>b.term.localeCompare(a.term)||a.course-b.course||a.section.localeCompare(b.section));}
  async function answerRows(offer){const snap=await getDocs(collection(offerRef(offer),'answers'));return snap.docs.map(d=>{const v=d.data();return {offer,data:JSON.stringify({grade:v.grade,level:v.level,ratings:[v.ratings.g0,v.ratings.g1,v.ratings.g2,v.ratings.g3],comments:v.comments})};});}
  async function start(){
    if(!user())return {offers:[],admin:false,email:null,googleReady:true};
    let catalog=await allOffers();
    if(admin()&&!catalog.length){
      const response=await fetch('./data/sigaa-2026.2.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Não foi possível carregar as turmas para migração.');
      const initial=(await response.json()).offers;
      await runTransaction(db,async tx=>{
        const previous=await Promise.all(initial.map(o=>tx.get(offerRef(o.id))));
        initial.forEach((o,i)=>{if(!previous[i].exists())tx.set(offerRef(o.id),o);});
      });
      catalog=await allOffers();
    }
    const offers=catalog.filter(o=>o.active===1),available=[];
    for(const o of offers){
      if(o.roster_required===1){const member=await getDoc(doc(offerRef(o.id),'roster',email()));if(member.exists())available.push(o);}
      else available.push(o);
    }
    return {offers:available,admin:admin(),email:email(),googleReady:true};
  }
  async function api(path,b={}){
    if(path==='start')return start();
    if(path==='vote'){
      if(!user()||!user().emailVerified)throw new Error('Entre com uma conta Google verificada.');
      if(b.privacy!==true||b.attended!==true)throw new Error('Confirme o aviso de privacidade e que cursou a turma.');
      try{await setDoc(doc(offerRef(b.offer),'answers',user().uid),{grade:b.grade,level:b.level,ratings:Object.fromEntries(b.ratings.map((r,i)=>['g'+i,r])),comments:config.prompts.map((_,i)=>clean(b.comments?.[i],1200)),privacy:true,attended:true,noticeVersion:1,invitation:clean(b.code,40),createdAt:serverTimestamp()});}
      catch(error){if(error.code==='permission-denied')throw new Error('A turma está fechada, sua conta não está na lista ou já respondeu.');throw error;}
      return {ok:true};
    }
    requireAdmin();
    if(path==='offers'){
      const offers=await allOffers();
      await Promise.all(offers.map(async o=>{o.received=(await getCountFromServer(collection(offerRef(o.id),'answers'))).data().count;}));
      return {offers};
    }
    if(path==='dashboard'){
      const offers=(await allOffers()).filter(o=>!b.term||o.term===b.term),rows=(await Promise.all(offers.map(o=>answerRows(o.id)))).flat();
      return {stats:summarize(rows),feedback:feedback(rows),classes:Object.fromEntries(offers.map(o=>{const stats=summarize(rows.filter(r=>r.offer===o.id));return [o.id,{grade:stats.grade,axes:stats.groups.map(g=>g.index)}];}))};
    }
    if(path==='import-sigaa'){
      const response=await fetch('./data/sigaa-'+encodeURIComponent(b.term)+'.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Catálogo indisponível para esse semestre. Atualize o arquivo SIGAA no GitHub ou cadastre a turma.');
      const catalog=await response.json(),existing=await allOffers();
      const added=catalog.offers.filter(o=>!existing.some(x=>x.id===o.id||(x.course===o.course&&x.term===o.term&&x.section===o.section)));
      if(added.length>400)throw new Error('O catálogo excedeu o limite de importação.');
      const batch=writeBatch(db);
      for(const o of added)batch.set(offerRef(o.id),{...o,active:0,draft:1,enrolled:0,roster_required:0});
      if(added.length)await batch.commit();
      return {found:catalog.offers.length,added:added.length};
    }
    if(path==='open-sigaa'){
      const offers=(await allOffers()).filter(o=>o.term===b.term&&o.draft===1),batch=writeBatch(db);
      for(const o of offers)batch.update(offerRef(o.id),{active:1,draft:0});
      if(offers.length)await batch.commit();return {opened:offers.length};
    }
    if(path==='create'){
      if(!config.courses[b.course]||!/^20\d\d\.[12]$/.test(b.term)||!b.section?.trim()||!b.teachers?.trim())throw new Error('Confira os dados da turma.');
      const identity=JSON.stringify([b.course,b.term,b.section.trim()]);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity))),v=>v.toString(16).padStart(2,'0')).join('');
      await runTransaction(db,async tx=>{const ref=offerRef(digest);if((await tx.get(ref)).exists())throw new Error('A turma já está cadastrada.');tx.set(ref,{id:digest,course:b.course,term:b.term,section:clean(b.section,60),teachers:clean(b.teachers,240),modality:b.modality,enrolled:Number(b.enrolled)||0,active:1,draft:0,roster_required:0});});
      return {ok:true};
    }
    const ref=offerRef(b.offer),snapshot=await getDoc(ref);
    if(!snapshot.exists())throw new Error('Turma não encontrada.');
    const offer={id:snapshot.id,...snapshot.data()};
    if(path==='report'){
      const rows=await answerRows(offer.id),action=await getDoc(doc(ref,'private','action'));
      return {offer,stats:summarize(rows),feedback:feedback(rows),action:action.exists()?action.data():null,comments:rows.flatMap(r=>JSON.parse(r.data).comments.flatMap((value,i)=>value?[{prompt:config.prompts[i],value}]:[]))};
    }
    if(path==='toggle'){await setDoc(ref,{active:b.active===true?1:0,draft:0},{merge:true});return {ok:true};}
    if(path==='import-roster'){
      if(!Array.isArray(b.students)||!b.students.length||b.students.length>400)throw new Error('Importe de 1 a 400 alunos por arquivo.');
      const unique=new Map();
      for(const s of b.students){const e=normalize(s.email),n=clean(s.name,121);if(!n||n.length>120||e.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))throw new Error('Confira os nomes e e-mails antes de confirmar.');unique.set(e,{name:n,email:e});}
      let added=0,total=0;
      await runTransaction(db,async tx=>{
        await tx.get(ref);
        const current=await getDocs(collection(ref,'roster')),emails=new Set(current.docs.map(d=>d.id));
        added=[...unique.keys()].filter(e=>!emails.has(e)).length;total=emails.size+added;
        for(const [e,s]of unique)tx.set(doc(ref,'roster',e),s);
        tx.update(ref,{roster_required:1,enrolled:total});
      });return {ok:true,added,total};
    }
    if(path==='invite'||path==='revoke-invite'){
      const previous=await getDoc(doc(ref,'private','invitation')),batch=writeBatch(db);
      if(previous.exists())batch.delete(doc(ref,'invites',previous.data().code));
      if(path==='revoke-invite'){batch.delete(doc(ref,'private','invitation'));await batch.commit();return {ok:true};}
      if(offer.active!==1)throw new Error('Abra a turma antes de gerar o convite.');
      const code=crypto.randomUUID().replaceAll('-','');
      batch.set(doc(ref,'invites',code),{active:true});batch.set(doc(ref,'private','invitation'),{code});await batch.commit();return {code};
    }
    if(path==='action'){
      const data={action:clean(b.action,1200),owner:clean(b.owner,120),due:clean(b.due,10),status:clean(b.status,30)};
      if(!data.action||!data.owner||!/^\d{4}-\d{2}-\d{2}$/.test(data.due)||!['Proposta','Em andamento','Concluída'].includes(data.status))throw new Error('Confira ação, responsável, prazo e situação.');
      await setDoc(doc(ref,'private','action'),data);return {ok:true};
    }
    throw new Error('Operação não disponível.');
  }
  return {api,login:async()=>{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);},logout:()=>signOut(auth)};
}
