const encoder = new TextEncoder();
const domain = 'unemat.br';
export const firebaseConfig = {
  apiKey:'AIzaSyAAHEt6VSdsRT1umaDmeZca2Kvrob-KnIY',
  authDomain:'avaliacao-ppgca.firebaseapp.com',
  projectId:'avaliacao-ppgca',
  appId:'1:723483763713:web:1c225005c9dc41f7c9cc00'
};
const cookie = (request,name) => request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const cookieHeader = (name,value,age) => name+'='+value+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite=Lax';
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const bytes = text => Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const key = secret => crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const ready = env => Boolean(env.SESSION_SECRET?.length>=32 && env.VOTER_SECRET?.length>=32);
async function sign(secret,payload) {
  const data=b64(encoder.encode(JSON.stringify(payload)));
  return data+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(data))));
}
async function verify(secret,value){
  try {
    const [data,sig,...extra]=(value||'').split('.');
    if(!data || !sig || extra.length || !await crypto.subtle.verify('HMAC',await key(secret),bytes(sig),encoder.encode(data)))return null;
    const result=JSON.parse(new TextDecoder().decode(bytes(data)));
    return result.exp>Date.now()?result:null;
  }catch{return null;}
}
export const institutional = profile => profile?.email_verified===true && profile.hd===domain && typeof profile.sub==='string' && profile.sub.length>0 && /^[^@\s]+@unemat\.br$/i.test(profile.email||'');
export async function identity(request,env){
  if(!ready(env))return null;
  const result=await verify(env.SESSION_SECRET,cookie(request,'__Host-ppgca'));
  return result?.kind==='session' && institutional(result)?result:null;
}
export const authReady=ready;
export async function voterKey(env,subject,offer){
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env.VOTER_SECRET),encoder.encode(JSON.stringify(['vote-v1',offer,subject])))));
}
function redirect(location,cookies=[]){
  const headers=new Headers({Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  for(const value of cookies)headers.append('Set-Cookie',value);
  return new Response(null,{status:303,headers});
}
export async function google(request,env,url){
  if(request.method!=='POST' || request.headers.get('Origin')!==url.origin)return new Response(null,{status:403});
  if(url.pathname==='/auth/logout')return redirect('/',[cookieHeader('__Host-ppgca','',0)]);
  if(url.pathname!=='/auth/firebase' || !ready(env))return new Response(null,{status:404});
  const reply=(value,status=200,extra={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...extra}});
  try{
    const authorization=request.headers.get('Authorization')||'';
    if(authorization.length>6000 || !/^Bearer [\w.-]+$/.test(authorization))return reply({error:'Credencial de login inválida.'},401);
    const idToken=authorization.slice(7);
    const lookup=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+firebaseConfig.apiKey,{
      method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})
    });
    if(!lookup.ok)return reply({error:'O Firebase recusou a sessão. Entre novamente.'},401);
    const {users}=await lookup.json();
    const user=users?.[0];
    const claims=JSON.parse(new TextDecoder().decode(bytes(idToken.split('.')[1])));
    const now=Math.floor(Date.now()/1000);
    if(claims.aud!==firebaseConfig.projectId || claims.iss!=='https://securetoken.google.com/'+firebaseConfig.projectId ||
       !Number.isFinite(claims.exp) || claims.exp<=now || claims.sub!==user?.localId || claims.firebase?.sign_in_provider!=='google.com' ||
       claims.email_verified!==true || user?.emailVerified!==true || user.disabled || claims.email!==user.email ||
       !/^[^@\s]+@unemat\.br$/i.test(user.email||'')){
      return reply({error:'Use uma conta Google verificada @unemat.br.'},403);
    }
    const sub=user.providerUserInfo?.find(p=>p.providerId==='google.com')?.rawId;
    if(typeof sub!=='string' || !sub)return reply({error:'O Firebase não confirmou a identidade Google.'},403);
    const session=await sign(env.SESSION_SECRET,{kind:'session',email:user.email.toLowerCase(),email_verified:true,hd:domain,sub,exp:Date.now()+28800000});
    return reply({ok:true},200,{'Set-Cookie':cookieHeader('__Host-ppgca',session,28800)});
  }catch{return reply({error:'Não foi possível confirmar a entrada. Tente novamente.'},502);}
}
