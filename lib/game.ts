import { themes, findTheme, normalize, bluffQuestions, type Question } from './questions.ts';
export type Phase='lobby'|'quiz'|'memory-pick'|'memory-watch'|'memory-answer'|'bluff-write'|'bluff-vote'|'reveal'|'timesup-ready'|'timesup'|'finished';
export type Player={id:string;token:string;name:string;avatar:number;score:number;theme:string;themeId:string;custom:Question|null;words:string[];ready:boolean;stealUsed:boolean;lastSeen:number;team:number};
export type Prop={id:string;kind:'ghost'|'bone';x:number;y:number;size:number;delay:number};
export type Round={id:string;kind:'quiz'|'memory'|'bluff';topic:string;owner:string;text:string;options:string[];correct:number;explanation:string;props:Prop[];truth?:string};
export type Transfer={from:string;to:string;amount:number};
export type Result={correct:number;answer:string;explanation:string;gains:Record<string,number>;transfers:Transfer[];choices:{id:string;text:string;owners:string[];truth:boolean;votes:number}[]};
export type Game={v:2;phase:Phase;phaseId:number;players:Player[];adminId:string;locked:boolean;deadline:number;pausedAt:number;deck:Round[];roundIndex:number;answers:Record<string,number>;lies:Record<string,string>;votes:Record<string,string>;targets:Record<string,string>;choices:{id:string;text:string;owners:string[];truth:boolean}[];result:Result|null;actions:string[];mime:{pass:number;turn:number;cards:string[];remaining:number[];cardVersion:number};created:number;finishedAt:number};
export type Auth={screen:boolean;playerId:string};
export class RuleError extends Error { status:number; constructor(message:string,status=400){super(message);this.status=status;} }
const requireRule=(ok:unknown,message:string,status=400)=>{if(!ok)throw new RuleError(message,status);};
const clean=(v:unknown,max:number)=>String(v||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max);
const rand=(n:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const uid=()=>crypto.randomUUID();
function shuffled<T>(a:T[]):T[]{const r=[...a];for(let i=r.length-1;i>0;i--){const j=rand(i+1);[r[i],r[j]]=[r[j],r[i]];}return r;}
export function createGame(now=Date.now()):Game{return {v:2,phase:'lobby',phaseId:0,players:[],adminId:'',locked:false,deadline:0,pausedAt:0,deck:[],roundIndex:-1,answers:{},lies:{},votes:{},targets:{},choices:[],result:null,actions:[],mime:{pass:0,turn:0,cards:[],remaining:[],cardVersion:0},created:now,finishedAt:0};}
export function controller(g:Game,a:Auth){return a.screen||a.playerId===g.adminId;}
export function authenticate(g:Game,screenToken:string,token:string):Auth{if(token===screenToken)return {screen:true,playerId:''};const p=g.players.find(p=>p.token===token);requireRule(p,'Connexion expirée.',403);return {screen:false,playerId:p!.id};}
export function addPlayer(g:Game,name:unknown,now=Date.now()){
 requireRule(g.phase==='lobby'&&!g.locked,'La salle n’accepte plus de joueurs.',409);requireRule(g.players.length<12,'La salle est complète.',409);
 const n=clean(name,20);requireRule(n.length>=2,'Choisis un pseudo de 2 à 20 caractères.');requireRule(!g.players.some(p=>normalize(p.name)===normalize(n)),'Ce pseudo est déjà dans la salle.');
 const p:Player={id:uid(),token:uid(),name:n,avatar:Array.from(n).reduce((a,c)=>a+c.charCodeAt(0),0)%6,score:0,theme:'',themeId:'',custom:null,words:[],ready:false,stealUsed:false,lastSeen:now,team:g.players.length%2};g.players.push(p);if(!g.adminId)g.adminId=p.id;return p;
}
function enter(g:Game,phase:Phase,now:number,seconds=0){g.phase=phase;g.phaseId++;g.deadline=seconds?now+seconds*1000:0;g.pausedAt=0;}
function memoryRound():Round{
 const cells=shuffled(Array.from({length:12},(_,i)=>({x:14+(i%4)*24,y:28+Math.floor(i/4)*25})));
 const ghosts=3+rand(4),bones=2+rand(3),props:Prop[]=[];
 for(let i=0;i<ghosts+bones;i++){const c=cells[i];props.push({id:uid(),kind:i<ghosts?'ghost':'bone',x:c.x+rand(7)-3,y:c.y+rand(5)-2,size:i<ghosts?15:12,delay:rand(1000)/1000});}
 const type=rand(3);const value=type===0?ghosts:type===1?bones:props.filter(p=>p.kind==='ghost'&&p.x<50).length;
 const nums=shuffled([...new Set([value,Math.max(0,value-1),value+1,value+2,value+3])].slice(0,4));
 return {id:uid(),kind:'memory',topic:'Apparitions',owner:'JACK',text:type===0?'Combien de fantômes as-tu vus ?':type===1?'Combien d’ossements étaient visibles ?':'Combien de fantômes étaient à gauche de l’image ?',options:nums.map(String),correct:nums.indexOf(value),explanation:`Il y en avait ${value}.`,props};
}
function buildDeck(g:Game){const rounds:Round[]=[];const seen:Record<string,number>={};for(const p of shuffled(g.players)){const t=themes.find(t=>t.id===p.themeId);const index=seen[p.themeId]??rand(t?.questions.length||1);seen[p.themeId]=index+1;const base=p.custom||t!.questions[index%t!.questions.length];const order=shuffled([0,1,2,3]);rounds.push({id:uid(),kind:'quiz',topic:p.theme,owner:p.name,text:base.text,options:order.map(i=>base.options[i]),correct:order.indexOf(base.correct),explanation:base.explanation,props:[]});if(rounds.filter(r=>r.kind==='quiz').length%2===0)rounds.push(memoryRound());}
 if(rounds.filter(r=>r.kind==='memory').length<2)rounds.push(memoryRound());
 const b=bluffQuestions[rand(bluffQuestions.length)];rounds.splice(Math.ceil(rounds.length/2),0,{id:uid(),kind:'bluff',topic:'Le grand mensonge',owner:'JACK',text:b.text,truth:b.answer,options:[],correct:-1,explanation:b.explanation,props:[]});return rounds;}
function nextRound(g:Game,now:number){g.roundIndex++;g.answers={};g.lies={};g.votes={};g.targets={};g.choices=[];g.result=null;if(g.roundIndex>=g.deck.length){if(g.players.length>=4){const words=Array.from(new Set(g.players.flatMap(p=>p.words)));g.mime={pass:0,turn:0,cards:shuffled(words).slice(0,12),remaining:[],cardVersion:0};g.mime.remaining=shuffled(g.mime.cards.map((_,i)=>i));enter(g,'timesup-ready',now);}else finish(g,now);return;}
 const r=g.deck[g.roundIndex];enter(g,r.kind==='quiz'?'quiz':r.kind==='memory'?'memory-pick':'bluff-write',now,r.kind==='quiz'?25:r.kind==='memory'?12:45);}
function finish(g:Game,now:number){g.finishedAt=now;enter(g,'finished',now);}
function scoreRound(g:Game,now:number){const r=g.deck[g.roundIndex];const gains:Record<string,number>={};const transfers:Transfer[]=[];
 if(r.kind==='bluff'){
  for(const p of g.players){const c=g.choices.find(c=>c.id===g.votes[p.id]);gains[p.id]=c?.truth?10:0;}
  for(const voter of g.players){const c=g.choices.find(c=>c.id===g.votes[voter.id]);if(c&&!c.truth)for(const owner of c.owners)if(owner!==voter.id)gains[owner]=(gains[owner]||0)+5;}
 }else for(const p of g.players)gains[p.id]=g.answers[p.id]===r.correct?10:0;
 for(const p of g.players)p.score+=gains[p.id]||0;
 if(r.kind==='memory'){
  const baseline=Object.fromEntries(g.players.map(p=>[p.id,p.score]));
  for(const target of g.players){const thieves=g.players.filter(p=>g.targets[p.id]===target.id&&g.answers[p.id]===r.correct&&g.answers[target.id]!==r.correct);let budget=Math.min(baseline[target.id],thieves.length*5);const counts=thieves.map(()=>0);for(let step=0;budget>0&&thieves.length;step++){const i=step%thieves.length;if(counts[i]<5){counts[i]++;budget--;}}
   thieves.forEach((p,i)=>{if(counts[i]){p.score+=counts[i];target.score-=counts[i];transfers.push({from:target.id,to:p.id,amount:counts[i]});}});
  }
 }
 g.result={correct:r.correct,answer:r.kind==='bluff'?r.truth!:r.options[r.correct],explanation:r.explanation,gains,transfers,choices:g.choices.map(c=>({...c,votes:Object.values(g.votes).filter(v=>v===c.id).length}))};enter(g,'reveal',now);
}
function beginVote(g:Game,now:number){const r=g.deck[g.roundIndex];const choices=[{id:uid(),text:r.truth!,owners:[] as string[],truth:true}];for(const p of g.players){const text=g.lies[p.id];if(!text)continue;const existing=choices.find(c=>normalize(c.text)===normalize(text));if(existing&&!existing.truth)existing.owners.push(p.id);else if(!existing)choices.push({id:uid(),text,owners:[p.id],truth:false});}
 if(choices.length===1){choices.push({id:uid(),text:'Le gardien des ombres',owners:[],truth:false},{id:uid(),text:'Un porte-bonheur',owners:[],truth:false});}
 g.choices=shuffled(choices);enter(g,'bluff-vote',now,25);
}
export function mimeActor(g:Game){const team=g.mime.turn%2;const members=g.players.filter(p=>p.team===team);return members[Math.floor(g.mime.turn/2)%members.length];}
function nextMimeTurn(g:Game,now:number){g.mime.turn++;if(!g.mime.remaining.length){g.mime.pass++;if(g.mime.pass>=3){finish(g,now);return;}g.mime.remaining=shuffled(g.mime.cards.map((_,i)=>i));}g.mime.cardVersion++;enter(g,'timesup-ready',now);}
export function tick(g:Game,now=Date.now()){
 if(g.pausedAt||!g.deadline||now<g.deadline)return false;
 switch(g.phase){case'quiz':case'memory-answer':case'bluff-vote':scoreRound(g,now);break;case'memory-pick':enter(g,'memory-watch',now,9);break;case'memory-watch':enter(g,'memory-answer',now,22);break;case'bluff-write':beginVote(g,now);break;case'timesup':nextMimeTurn(g,now);break;default:return false;}return true;
}
export function act(g:Game,a:Auth,body:Record<string,unknown>,now=Date.now()){
 const action=String(body.action);const actionId=clean(body.actionId,64);requireRule(actionId.length>=16,'Action invalide.');if(g.actions.includes(actionId))return;
 const p=g.players.find(p=>p.id===a.playerId);const isHost=controller(g,a);
 if(action==='pause'){requireRule(isHost,'Seul l’hôte peut mettre en pause.',403);requireRule(g.phase!=='lobby'&&g.phase!=='finished','Pause indisponible.');if(g.pausedAt){if(g.deadline)g.deadline+=now-g.pausedAt;g.pausedAt=0;}else g.pausedAt=now;}
 else {
 requireRule(!g.pausedAt,'La partie est en pause.',409);
 if(['next','answer','target','lie','vote','mime-start','mime-good','mime-skip'].includes(action))requireRule(Number(body.phaseId)===g.phaseId,'L’écran a changé. Réessaie.',409);
 switch(action){
 case'theme':{
  requireRule(p&&g.phase==='lobby','Tu ne peux plus changer de thème.');const title=clean(body.theme,50);requireRule(title.length>=2,'Écris ton thème.');const theme=findTheme(title);p!.theme=title;p!.themeId=theme?.id||'custom';p!.custom=null;
  if(!theme){const text=clean(body.question,220);const options=[clean(body.correct,90),clean(body.wrong1,90),clean(body.wrong2,90),clean(body.wrong3,90)];requireRule(text.length>=8&&options.every(x=>x.length>=1)&&new Set(options.map(normalize)).size===4,'Ajoute une question, sa bonne réponse et trois réponses différentes.');p!.custom={topic:title,text,options,correct:0,explanation:'Question proposée par '+p!.name+'.'};const words=String(body.words||'').split(/[\n,;]/).map(x=>clean(x,40)).filter(Boolean);requireRule(words.length>=2,'Ajoute au moins deux mots à faire deviner.');p!.words=Array.from(new Set(words)).slice(0,4);}
  else p!.words=shuffled(theme.words).slice(0,3);p!.ready=true;break;
 }
 case'start':requireRule(isHost,'Seul l’hôte peut lancer.',403);requireRule(g.phase==='lobby','La partie a déjà commencé.');requireRule(g.players.length>=2,'Il faut au moins deux joueurs.');requireRule(g.players.every(p=>p.ready&&p.theme),'Il manque des thèmes.');g.locked=true;g.players.forEach((p,i)=>p.team=i%2);g.deck=buildDeck(g);g.roundIndex=-1;nextRound(g,now);break;
 case'answer':requireRule(p&&['quiz','memory-answer'].includes(g.phase),'Les réponses sont fermées.',409);requireRule(!(p!.id in g.answers),'Ta réponse est déjà enregistrée.',409);requireRule(Number.isInteger(body.answer)&&Number(body.answer)>=0&&Number(body.answer)<g.deck[g.roundIndex].options.length,'Réponse invalide.');g.answers[p!.id]=Number(body.answer);if(g.players.every(p=>p.id in g.answers))scoreRound(g,now);break;
 case'target':requireRule(p&&g.phase==='memory-pick','Le vol se prépare avant l’apparition.',409);requireRule(!p!.stealUsed,'Tu as déjà utilisé ton vol.');requireRule(g.players.some(t=>t.id===body.target&&t.id!==p!.id),'Choisis un autre joueur.');p!.stealUsed=true;g.targets[p!.id]=String(body.target);break;
 case'lie':{requireRule(p&&g.phase==='bluff-write','Les propositions sont fermées.',409);requireRule(!g.lies[p!.id],'Ton mensonge est déjà envoyé.');const lie=clean(body.text,80);requireRule(lie.length>=2,'Écris une réponse.');requireRule(normalize(lie)!==normalize(g.deck[g.roundIndex].truth!),'Tu connais la vérité ! Invente plutôt une fausse réponse.');g.lies[p!.id]=lie;if(g.players.every(p=>g.lies[p.id]))beginVote(g,now);break;}
 case'vote':{requireRule(p&&g.phase==='bluff-vote','Le vote est fermé.',409);requireRule(!g.votes[p!.id],'Ton vote est déjà enregistré.');const choice=g.choices.find(c=>c.id===body.choice);requireRule(choice&&!choice.owners.includes(p!.id),'Tu ne peux pas voter pour ton propre mensonge.');g.votes[p!.id]=String(body.choice);if(g.players.every(p=>g.votes[p.id]))scoreRound(g,now);break;}
 case'next':requireRule(isHost,'Seul l’hôte peut continuer.',403);if(g.phase==='reveal')nextRound(g,now);else if(g.phase==='timesup'||g.phase==='timesup-ready')nextMimeTurn(g,now);else throw new RuleError('Cette manche est encore en cours.');break;
 case'mime-start':requireRule(g.phase==='timesup-ready','Ce tour a déjà commencé.',409);requireRule(isHost||p?.id===mimeActor(g)?.id,'C’est le tour d’un autre joueur.',403);enter(g,'timesup',now,35);break;
 case'mime-good':case'mime-skip':{
  requireRule(p&&g.phase==='timesup'&&p.id===mimeActor(g)?.id,'Seule la personne qui fait deviner peut valider.',403);requireRule(Number(body.cardVersion)===g.mime.cardVersion,'Cette carte a déjà changé.',409);
  const card=g.mime.remaining.shift()!;if(action==='mime-good')for(const member of g.players.filter(m=>m.team===p!.team))member.score+=5;else g.mime.remaining.push(card);g.mime.cardVersion++;if(!g.mime.remaining.length)nextMimeTurn(g,now);break;
 }
 case'lock':requireRule(isHost&&g.phase==='lobby','Action réservée à l’hôte avant la partie.',403);g.locked=!g.locked;break;
 case'kick':requireRule(isHost&&g.phase==='lobby','Action réservée à l’hôte avant la partie.',403);g.players=g.players.filter(p=>p.id!==body.playerId);if(!g.players.some(p=>p.id===g.adminId))g.adminId=g.players[0]?.id||'';break;
 case'leave':requireRule(p,'Tu n’es pas un joueur.');requireRule(g.phase==='lobby'||g.phase==='finished','Garde cet onglet pour pouvoir revenir dans la partie.');g.players=g.players.filter(x=>x.id!==p!.id);if(g.adminId===p!.id)g.adminId=g.players[0]?.id||'';break;
 case'restart':requireRule(isHost&&g.phase==='finished','La partie doit être terminée.',403);{const oldPlayers=g.players;const admin=g.adminId;Object.assign(g,createGame(now));g.players=oldPlayers.map(p=>({...p,score:0,stealUsed:false,ready:!!p.theme}));g.adminId=admin;}break;
 case'close':requireRule(isHost,'Seul l’hôte peut fermer.',403);break;
 default:throw new RuleError('Action inconnue.');
 }
 }
 g.actions.push(actionId);g.actions=g.actions.slice(-80);
}
export function view(g:Game,a:Auth,code:string,now=Date.now()){
 const me=g.players.find(p=>p.id===a.playerId);const r=g.deck[g.roundIndex];const watching=g.phase==='memory-watch';const revealed=g.phase==='reveal';const inMime=g.phase.startsWith('timesup');const actor=inMime?mimeActor(g):undefined;
 return {code,revision:0,serverNow:now,phase:g.phase,phaseId:g.phaseId,screen:a.screen,canControl:controller(g,a),locked:g.locked,deadline:g.deadline,pausedAt:g.pausedAt,roundNumber:g.roundIndex+1,roundTotal:g.deck.length,
 players:g.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,ready:p.ready,online:now-p.lastSeen<45000,host:p.id===g.adminId,team:p.team,answered:g.phase==='bluff-write'?!!g.lies[p.id]:g.phase==='bluff-vote'?!!g.votes[p.id]:p.id in g.answers})),
 me:me?{id:me.id,name:me.name,score:me.score,theme:me.theme,ready:me.ready,stealUsed:me.stealUsed,team:me.team,target:g.targets[me.id]||'',answer:g.answers[me.id]??null,lieSent:!!g.lies[me.id],voted:!!g.votes[me.id],privateCard:g.phase==='timesup'&&actor?.id===me.id?g.mime.cards[g.mime.remaining[0]]:null}:null,
 round:r?{kind:r.kind,topic:r.topic,owner:r.owner,text:['quiz','memory-answer','bluff-write','bluff-vote','reveal'].includes(g.phase)?r.text:'',options:['quiz','memory-answer','reveal'].includes(g.phase)?r.options:[],props:(watching&&a.screen)||revealed?r.props:[],choices:g.phase==='bluff-vote'?g.choices.map(c=>({id:c.id,text:c.text,mine:!!me&&c.owners.includes(me.id)})):[]}:null,
 result:revealed?g.result:null,mime:inMime?{pass:g.mime.pass,turn:g.mime.turn,team:g.mime.turn%2,actorId:actor?.id||'',actorName:actor?.name||'',remaining:g.mime.remaining.length,total:g.mime.cards.length,cardVersion:g.mime.cardVersion}:null,
 catalog:g.phase==='lobby'?themes.map(t=>({id:t.id,label:t.label,aliases:t.aliases})):[],endedWithoutMime:g.phase==='finished'&&g.players.length<4};
}
export type GameView=ReturnType<typeof view>;
