import assert from 'node:assert/strict';
import {createGame,addPlayer,act,tick,view,authenticate,mimeActor} from '../lib/game.ts';
const now=1000000;const screen={screen:true,playerId:''};const id=()=>crypto.randomUUID();
function call(g,a,action,extra={},time=now){act(g,a,{action,actionId:id(),phaseId:g.phaseId,...extra},time);}
function fixture(n=4){const g=createGame(now);const ps=Array.from({length:n},(_,i)=>addPlayer(g,'Joueur '+i,now));for(const p of ps)call(g,{screen:false,playerId:p.id},'theme',{theme:'Halloween'});return {g,ps};}
{
 const {g,ps}=fixture();assert.throws(()=>authenticate(g,'screen','wrong'));assert.throws(()=>call(g,{screen:false,playerId:ps[1].id},'start'));
 call(g,screen,'start');assert.equal(g.phase,'quiz');const snapshot=JSON.stringify(view(g,screen,'ABCD',now));assert(!snapshot.includes('"correct"'));assert(!snapshot.includes(ps[0].token));
 const action={action:'answer',actionId:id(),phaseId:g.phaseId,answer:g.deck[0].correct};act(g,{screen:false,playerId:ps[0].id},action,now);act(g,{screen:false,playerId:ps[0].id},action,now);assert.equal(Object.keys(g.answers).length,1);
 call(g,screen,'pause',{},now+1000);assert(g.pausedAt);const oldDeadline=g.deadline;assert.equal(tick(g,now+99999),false);call(g,screen,'pause',{},now+5000);assert.equal(g.deadline,oldDeadline+4000);
 tick(g,g.deadline);assert.equal(g.phase,'reveal');assert.equal(ps[0].score,10);const scores=g.players.map(p=>p.score);tick(g,g.deadline+999999);assert.deepEqual(g.players.map(p=>p.score),scores);
}
{
 const {g,ps}=fixture();call(g,screen,'start');const ri=g.deck.findIndex(r=>r.kind==='memory');g.roundIndex=ri;g.phase='memory-pick';g.deadline=now+1000;ps[1].score=3;
 call(g,{screen:false,playerId:ps[0].id},'target',{target:ps[1].id});call(g,{screen:false,playerId:ps[2].id},'target',{target:ps[1].id});
 assert(!JSON.stringify(view(g,screen,'ABCD',now)).includes('"target"'));assert(!view(g,{screen:false,playerId:ps[1].id},'ABCD',now).me.target);
 tick(g,now+1001);assert.equal(g.phase,'memory-watch');assert(view(g,screen,'ABCD',now).round.props.length>0);assert.equal(view(g,{screen:false,playerId:ps[1].id},'ABCD',now).round.props.length,0);assert.equal(view(g,screen,'ABCD',now).round.text,'');
 tick(g,g.deadline);assert.equal(g.phase,'memory-answer');for(const [i,p]of ps.entries())call(g,{screen:false,playerId:p.id},'answer',{answer:i===0||i===2?g.deck[ri].correct:(g.deck[ri].correct+1)%4});assert.equal(g.phase,'reveal');assert.equal(ps[1].score,0);assert.equal(g.result.transfers.reduce((s,t)=>s+t.amount,0),3);assert.equal(g.players.reduce((s,p)=>s+p.score,0),23);assert(ps.every(p=>p.score>=0));
}
{
 const {g,ps}=fixture();call(g,screen,'start');g.roundIndex=g.deck.findIndex(r=>r.kind==='bluff');g.phase='bluff-write';g.answers={};g.deadline=now+10000;
 assert(!JSON.stringify(view(g,screen,'ABCD',now)).includes(g.deck[g.roundIndex].truth));for(const [i,p]of ps.entries())call(g,{screen:false,playerId:p.id},'lie',{text:'Mensonge '+i});assert.equal(g.phase,'bluff-vote');const v=view(g,screen,'ABCD',now);assert(!JSON.stringify(v.round.choices).includes('owners'));assert(!JSON.stringify(v.round.choices).includes('truth'));
 const own=g.choices.find(c=>c.owners.includes(ps[0].id));assert.throws(()=>call(g,{screen:false,playerId:ps[0].id},'vote',{choice:own.id}));
 const truth=g.choices.find(c=>c.truth);for(const p of ps)call(g,{screen:false,playerId:p.id},'vote',{choice:truth.id});assert.equal(g.phase,'reveal');assert(ps.every(p=>p.score===10));
}
{
 const {g,ps}=fixture();call(g,screen,'start');g.roundIndex=g.deck.length-1;g.phase='reveal';call(g,screen,'next');assert.equal(g.phase,'timesup-ready');const cards=[...g.mime.cards];let rounds=0;
 while(g.phase!=='finished'&&rounds++<100){if(g.phase==='timesup-ready')call(g,screen,'mime-start');const actor=mimeActor(g);const a={screen:false,playerId:actor.id};const outsider=ps.find(p=>p.id!==actor.id);const privateView=view(g,a,'ABCD',now);assert(privateView.me.privateCard);assert.equal(view(g,{screen:false,playerId:outsider.id},'ABCD',now).me.privateCard,null);assert.equal(view(g,screen,'ABCD',now).me,null);
 assert.throws(()=>call(g,{screen:false,playerId:outsider.id},'mime-good',{cardVersion:g.mime.cardVersion}));call(g,a,'mime-good',{cardVersion:g.mime.cardVersion});}
 assert.equal(g.phase,'finished');assert.equal(g.mime.pass,3);assert.deepEqual(g.mime.cards,cards);assert(g.players.some(p=>p.score>0));
}
{
 // Regression: the common screen is not a player; exactly two ready phones can
 // start from either controller, complete every round, reach scores and replay.
 for(const starter of ['screen','phone']){
  const g=createGame(now);assert.equal(view(g,screen,'ABCD',now).players.length,0);
  const first=addPlayer(g,'Duo A',now);const a={screen:false,playerId:first.id};
  call(g,a,'theme',{theme:'Halloween'});assert.throws(()=>call(g,screen,'start'),/deux joueurs/);
  const second=addPlayer(g,'Duo B',now);const b={screen:false,playerId:second.id};
  assert.throws(()=>call(g,screen,'start'),/thèmes/);call(g,b,'theme',{theme:'Cinéma'});
  call(g,starter==='screen'?screen:a,'start');assert.equal(g.phase,'quiz');
  let time=now,steps=0,reveals=0;const seen=new Set();
  while(g.phase!=='finished'&&steps++<40){seen.add(g.phase);
   if(g.phase==='quiz'||g.phase==='memory-answer'){
    const correct=g.deck[g.roundIndex].correct;
    call(g,a,'answer',{answer:correct},time);call(g,b,'answer',{answer:correct},time);
   }else if(g.phase==='memory-pick'||g.phase==='memory-watch'){
    time=g.deadline;tick(g,time);
   }else if(g.phase==='bluff-write'){
    call(g,a,'lie',{text:'Une fausse piste A'},time);call(g,b,'lie',{text:'Une fausse piste B'},time);
   }else if(g.phase==='bluff-vote'){
    const truth=g.choices.find(c=>c.truth);call(g,a,'vote',{choice:truth.id},time);call(g,b,'vote',{choice:truth.id},time);
   }else if(g.phase==='reveal'){
    reveals++;call(g,screen,'next',{},time);
   }else assert.fail('Unexpected two-player phase: '+g.phase);
  }
  assert.equal(g.phase,'finished');assert.equal(reveals,5);assert.equal(g.players.length,2);
  for(const phase of ['quiz','memory-pick','memory-watch','memory-answer','bluff-write','bluff-vote','reveal'])assert(seen.has(phase));
  assert.deepEqual(g.players.map(p=>p.score),[50,50]);assert(view(g,screen,'ABCD',time).endedWithoutMime);
  call(g,a,'restart',{},time);assert.equal(g.phase,'lobby');assert(g.players.every(p=>p.ready&&p.score===0));
  call(g,a,'start',{},time);assert.equal(g.phase,'quiz');
 }
}
{
 const g=createGame(now);const p=addPlayer(g,'Perso',now);const a={screen:false,playerId:p.id};assert.throws(()=>call(g,a,'theme',{theme:'Mon thème ultra précis'}));
 call(g,a,'theme',{theme:'Mon thème ultra précis',question:'Quelle réponse est correcte ?',correct:'A',wrong1:'B',wrong2:'C',wrong3:'D',words:'Un phare, Un bateau'});assert(p.ready&&p.custom);
 while(g.players.length<12)addPlayer(g,'Autre '+g.players.length,now);assert.throws(()=>addPlayer(g,'Treizième',now));
}
console.log('PASS — permissions, hidden information, idempotency, clocks/pause, fair bounded theft, bluff, 3-pass mime, complete two-player games and replay, custom themes, 12-player cap.');
