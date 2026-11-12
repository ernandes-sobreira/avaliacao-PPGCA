import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,serverTimestamp,deleteDoc} from 'firebase/firestore';
import {readFile} from 'node:fs/promises';
const env=await initializeTestEnvironment({projectId:'demo-avaliacao-ppgca',firestore:{rules:await readFile('firestore.rules','utf8'),host:'127.0.0.1',port:8080}});
function db(uid,email){return env.authenticatedContext(uid,{email,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();}
const admin=db('owner','ernandes@unemat.br'),student=db('student','aluno@unemat.br'),outsider=db('outsider','outro@unemat.br'),external=db('external','externo@gmail.com'),guest=env.unauthenticatedContext().firestore();
const offer=(database,id='test')=>doc(database,'ppgcaOffers',id);
const ballot=()=>({grade:8,level:'Mestrado',ratings:{g0:[4,4,4,4],g1:[4,4,4,4],g2:[4,4,4,4,4],g3:[4,4,4,4,4]},comments:['','','',''],privacy:true,attended:true,noticeVersion:1,invitation:'',createdAt:serverTimestamp()});
try{
 await env.clearFirestore();
 await assertSucceeds(setDoc(offer(admin),{active:1,roster_required:1}));
 await assertSucceeds(setDoc(doc(offer(admin),'roster','aluno@unemat.br'),{name:'Aluno',email:'aluno@unemat.br'}));
 await assertFails(getDoc(offer(guest)));
 await assertSucceeds(getDoc(offer(student)));
 await assertSucceeds(getDoc(doc(offer(student),'roster','aluno@unemat.br')));
 await assertFails(getDoc(doc(offer(outsider),'roster','aluno@unemat.br')));
 await assertFails(getDocs(collection(offer(student),'roster')));
 await assertFails(setDoc(offer(student),{active:0},{merge:true}));
 await assertFails(setDoc(doc(offer(outsider),'answers','outsider'),ballot()));
 await assertFails(setDoc(doc(offer(student),'answers','not-own-uid'),ballot()));
 const invalid=ballot();invalid.grade=99;await assertFails(setDoc(doc(offer(student),'answers','student'),invalid));
 await assertSucceeds(setDoc(doc(offer(student),'answers','student'),ballot()));
 await assertFails(setDoc(doc(offer(student),'answers','student'),ballot()));
 await assertFails(getDoc(doc(offer(student),'answers','student')));
 await assertSucceeds(getDoc(doc(offer(admin),'answers','student')));
 await assertFails(deleteDoc(doc(offer(admin),'answers','student')));
 const invite='a'.repeat(32);
 await assertSucceeds(setDoc(doc(offer(admin),'invites',invite),{active:true}));
 await assertFails(setDoc(doc(offer(external),'answers','external'),{...ballot(),invitation:invite}));
 await assertSucceeds(setDoc(offer(admin,'open'),{active:1,roster_required:0}));
 await assertSucceeds(setDoc(doc(offer(admin,'open'),'invites',invite),{active:true}));
 await assertFails(getDocs(collection(offer(external,'open'),'invites')));
 await assertSucceeds(setDoc(doc(offer(external,'open'),'answers','external'),{...ballot(),invitation:invite}));
 await assertSucceeds(setDoc(offer(admin),{active:0},{merge:true}));
 await assertSucceeds(setDoc(doc(offer(admin),'roster','outro@unemat.br'),{name:'Outro',email:'outro@unemat.br'}));
 await assertFails(setDoc(doc(offer(outsider),'answers','outsider'),ballot()));
 console.log('PASS: admin, aluno elegível, lista privada, voto único, respostas protegidas, turma encerrada, convites e esquema de dados.');
}finally{await env.cleanup();}
