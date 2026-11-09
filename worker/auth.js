const encoder = new TextEncoder();
const domain = 'unemat.br';
const callback = '/auth/google/callback';
const cookie = (request,name) => request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const cookieHeader = (name,value,age) => name+'='+value+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite=Lax';
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const bytes = text => Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const key = secret => crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const ready = env => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET?.length>=32 && env.VOTER_SECRET?.length>=32 && env.APP_ORIGIN);
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
  if(url.pathname==='/auth/logout' && request.method==='POST' && request.headers.get('Origin')===url.origin)return redirect('/',[cookieHeader('__Host-ppgca','',0)]);
  if(request.method!=='GET')return new Response(null,{status:405});
  if(!ready(env) || env.APP_ORIGIN!==url.origin)return redirect('/?acesso=configuracao');
  const redirect_uri=env.APP_ORIGIN+callback;
  if(url.pathname==='/auth/google'){
    const state=b64(crypto.getRandomValues(new Uint8Array(32)));
    const verifier=b64(crypto.getRandomValues(new Uint8Array(32)));
    const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
    const flow=await sign(env.SESSION_SECRET,{kind:'oauth',state,verifier,exp:Date.now()+600000});
    const params=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri,response_type:'code',scope:'openid email',hd:domain,prompt:'select_account',state,code_challenge:challenge,code_challenge_method:'S256'});
    return redirect('https://accounts.google.com/o/oauth2/v2/auth?'+params,[cookieHeader('__Host-ppgca-flow',flow,600)]);
  }
  if(url.pathname!==callback)return new Response(null,{status:404});
  const clear=cookieHeader('__Host-ppgca-flow','',0);
  const flow=await verify(env.SESSION_SECRET,cookie(request,'__Host-ppgca-flow'));
  const code=url.searchParams.get('code');
  if(flow?.kind!=='oauth' || flow.state!==url.searchParams.get('state') || !code)return redirect('/?acesso=expirado',[clear]);
  try{
    const token=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri,grant_type:'authorization_code',code_verifier:flow.verifier})});
    if(!token.ok)throw new Error();
    const {access_token}=await token.json();
    if(typeof access_token!=='string'||!access_token)throw new Error();
    const user=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{redirect:'error',headers:{Authorization:'Bearer '+access_token}});
    if(!user.ok)throw new Error();
    const profile=await user.json();
    if(!institutional(profile))return redirect('/?acesso=dominio',[clear,cookieHeader('__Host-ppgca','',0)]);
    const session=await sign(env.SESSION_SECRET,{kind:'session',email:profile.email.toLowerCase(),email_verified:true,hd:domain,sub:profile.sub,exp:Date.now()+28800000});
    return redirect('/?acesso=ok',[clear,cookieHeader('__Host-ppgca',session,28800)]);
  }catch{return redirect('/?acesso=erro',[clear]);}
}
