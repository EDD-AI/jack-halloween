import { env } from 'cloudflare:workers';
import { createGame, addPlayer, authenticate, act, tick, view, RuleError, type Game, type Auth } from '@/lib/game';
export const dynamic='force-dynamic';
const TTL=12*60*60*1000;
const db=()=>{if(!env.DB)throw new Error('Missing DB');return env.DB;};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
type Row={code:string;host_token:string;state:string;revision:number;created_at:number};
async function load(code:string){const r=await db().prepare('SELECT code,host_token,state,revision,created_at FROM rooms WHERE code=? AND created_at>?').bind(code,Date.now()-TTL).first<Row>();if(!r)throw new RuleError('Cette salle est fermée ou introuvable.',404);const g=JSON.parse(r.state) as Game;if(g.v!==2)throw new RuleError('Cette ancienne salle a expiré. Crée une nouvelle salle.',404);return {r,g};}
async function save(r:Row,g:Game){const result=await db().prepare('UPDATE rooms SET state=?,revision=revision+1,locked=? WHERE code=? AND revision=?').bind(JSON.stringify(g),g.locked?1:0,r.code,r.revision).run();return !!result.meta.changes;}
function token(req:Request){return req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';}
function error(e:unknown){if(e instanceof RuleError)return reply({error:e.message},e.status);console.error('JACK API failed',e instanceof Error?e.message:'unknown');return reply({error:'Connexion interrompue. Réessaie dans un instant.'},503);}
export async function GET(req:Request){try{
 const code=new URL(req.url).searchParams.get('code')||'';if(!/^[A-Z]{4}$/.test(code))throw new RuleError('Code invalide.');
 for(let n=0;n<10;n++){const {r,g}=await load(code);const a=authenticate(g,r.host_token,token(req));const now=Date.now();let changed=tick(g,now);const p=g.players.find(p=>p.id===a.playerId);if(p&&now-p.lastSeen>15000){p.lastSeen=now;changed=true;}if(!changed||await save(r,g))return reply({...view(g,a,code,now),revision:r.revision+(changed?1:0)});}
 throw new RuleError('La salle est occupée. Reconnexion…',503);
}catch(e){return error(e);}}
export async function POST(req:Request){try{
 const origin=req.headers.get('Origin');if(origin&&new URL(origin).host!==new URL(req.url).host)throw new RuleError('Origine non autorisée.',403);
 const raw=await req.text();if(raw.length>6000)throw new RuleError('Requête trop longue.');let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{throw new RuleError('Requête invalide.');}
 const action=String(body.action||'');const now=Date.now();
 if(action==='create'){
  const screenToken=crypto.randomUUID();const g=createGame(now);await db().prepare('DELETE FROM rooms WHERE created_at<?').bind(now-TTL).run();
  for(let n=0;n<8;n++){const abc='ABCDEFGHJKLMNPQRSTUVWXYZ';const code=Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>abc[x%abc.length]).join('');const result=await db().prepare('INSERT OR IGNORE INTO rooms(code,host_token,created_at,state,revision) VALUES(?,?,?,?,0)').bind(code,screenToken,now,JSON.stringify(g)).run();if(result.meta.changes)return reply({...view(g,{screen:true,playerId:''},code,now),token:screenToken});}
  throw new RuleError('Impossible de créer la salle.',503);
 }
 const code=String(body.code||'').toUpperCase();if(!/^[A-Z]{4}$/.test(code))throw new RuleError('Le code contient 4 lettres.');
 for(let n=0;n<10;n++){
  const {r,g}=await load(code);let a:Auth;let joinToken='';
  if(action==='join'){const p=addPlayer(g,body.name,now);a={screen:false,playerId:p.id};joinToken=p.token;}
  else{a=authenticate(g,r.host_token,token(req));tick(g,now);act(g,a,body,now);const p=g.players.find(p=>p.id===a.playerId);if(p)p.lastSeen=now;}
  if(action==='close'){const closed=await db().prepare('DELETE FROM rooms WHERE code=? AND revision=?').bind(code,r.revision).run();if(closed.meta.changes)return reply({left:true});continue;}
  if(await save(r,g)){
   if(action==='leave')return reply({left:true});
   return reply({...view(g,a,code,now),revision:r.revision+1,...(joinToken?{token:joinToken}:{})});
  }
 }
 throw new RuleError('Réessaie, la salle est occupée.',503);
}catch(e){return error(e);}}
