(function (root) {
'use strict';
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const CARDS = {
  bang:{name:'光之衝擊',n:26,type:'play',desc:'對範圍內一人造成1傷'},
  missed:{name:'光之屏障',n:13,type:'resp',desc:'抵銷一次衝擊'},
  beer:{name:'元氣甜點',n:6,type:'play',desc:'回復1體力'},
  gatling:{name:'光之洪流',n:1,type:'play',desc:'其他人各出屏障或受1傷'},
  indians:{name:'怪物大軍',n:2,type:'play',desc:'其他人各出衝擊或受1傷'},
  duel:{name:'正面對決',n:3,type:'play',desc:'與一人輪流出衝擊'},
  panic:{name:'妖精偷取',n:4,type:'play',desc:'取距離1內一人一張牌'},
  catbalou:{name:'淨化之光',n:4,type:'play',desc:'棄掉任一人一張牌'},
  saloon:{name:'茶會派對',n:1,type:'play',desc:'所有人回復1'},
  stagecoach:{name:'妖精的禮物',n:2,type:'play',desc:'摸2張'},
  wells:{name:'奇蹟寶石',n:1,type:'play',desc:'摸3張'},
  jail:{name:'黑暗牢籠',n:3,type:'judge',desc:'判定非♥跳過回合'},
  dynamite:{name:'暗黑炸彈',n:1,type:'judge',desc:'♠2-9 受3傷，否則傳下家'},
  barrel:{name:'守護胸針',n:2,type:'equip',slot:'armor',desc:'被衝擊時判定♥視為屏障'},
  mustang:{name:'守護妖精',n:2,type:'equip',slot:'horseP',desc:'他人看你+1'},
  scope:{name:'飛行妖精',n:1,type:'equip',slot:'horseM',desc:'你看他人-1'},
  volcanic:{name:'連擊手環',n:2,type:'equip',slot:'weapon',range:1,desc:'範圍1，衝擊不限次'},
  sword2:{name:'變身粉盒',n:3,type:'equip',slot:'weapon',range:2,desc:'武器 範圍2'},
  sword3:{name:'星光權杖',n:1,type:'equip',slot:'weapon',range:3,desc:'武器 範圍3'},
  sword4:{name:'彩虹豎琴',n:1,type:'equip',slot:'weapon',range:4,desc:'武器 範圍4'},
  sword5:{name:'奇蹟之劍',n:1,type:'equip',slot:'weapon',range:5,desc:'武器 範圍5'},
};
const CHARS = [ // v8: Precure; id = ASCII mechanics key, name = display
  ['black','黑色天使・渚',4,'光之連打：衝擊不限次數'],['white','白色天使・穗乃香',3,'溫柔之心：元氣甜點回復2'],
  ['dream','夢之光・望',4,'夢之力：她的衝擊需2張屏障才能抵銷'],['peach','桃園愛',3,'幸福之舞：摸牌階段摸3張'],
  ['blossom','花咲蕾',4,'花之鼓勵：可棄2張手牌回復1'],['melody','北條響',4,'旋律疾奏：看他人距離-1'],
  ['happy','星空美幸',3,'快樂充電：每受1傷摸1張'],['heart','相田愛',4,'愛心守護：他人看她距離+1'],
  ['bloom','日向咲',4,'花之盾：被衝擊時判定♥視為屏障'],['lovely','愛乃惠',3,'愛之接力：他人倒下時得其所有牌'],
  ['flora','春野遙',3,'花之公主：手牌為空時摸1張'],['miracle','朝日奈未來',4,'奇蹟魔法：衝擊與屏障互用'],
  ['whip','宇佐美',4,'甜點反擊：受傷時隨機取攻擊者1張手牌'],['star','星奈光',3,'星之占卜：判定翻2張取有利者'],
  ['yell','野乃花',4,'應援之聲：摸牌改抽手牌最多者1張+牌堆1張'],['grace','花寺優',4,'治癒之光：摸牌第2張紅色再摸1'],
].map(([id,name,hp,desc])=>({id,name,hp,desc}));
const ROLES = {sheriff:'光之隊長',deputy:'光之夥伴',outlaw:'黑暗勢力',renegade:'背叛者'};
const ROLE_SETS = {4:['sheriff','renegade','outlaw','outlaw'],5:['sheriff','renegade','outlaw','outlaw','deputy'],
  6:['sheriff','renegade','outlaw','outlaw','outlaw','deputy'],7:['sheriff','renegade','outlaw','outlaw','outlaw','deputy','deputy']};
class GameOver extends Error {}
const BAL={4:{shHp:2,shCards:-1,renDraw:-1,renK:0.7,blind:2,outAggro:1,lateMul:2},5:{shHp:1,renFish:1,renK:1.5,blind:2},6:{shHp:2,renFish:1,renK:0.7,blind:2},7:{shHp:1,shCards:2,renFish:4,renFishHeal:1,renK:0.7,blind:2,outAggro:1}};
function rngFrom(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

class Game {
  constructor(o){
    this.rng=rngFrom(o.seed!=null?o.seed:Date.now());
    this.delay=o.delay||0; this.onLog=o.onLog||(()=>{}); this.onUpdate=o.onUpdate||(()=>{});
    this.ctrls=o.controllers; this.onPlay=o.onPlay||(()=>{}); this.log=[]; this.over=false; this.winner=null; this.turnCount=0; this.maxTurns=o.maxTurns||1500;
    const n=o.n; let uid=0;
    this.deck=[]; Object.keys(CARDS).forEach(k=>{for(let i=0;i<CARDS[k].n;i++){this.deck.push({id:uid++,key:k});}});
    this.deck.forEach(c=>{c.suit=SUITS[Math.floor(this.rng()*4)];c.rank=1+Math.floor(this.rng()*13);});
    this.shuffle(this.deck); this.discard=[];
    this.bal=Object.assign({},o.bal||BAL[n]||{});
    const roles=this.shuffle(ROLE_SETS[n].slice()); let chars=this.shuffle(CHARS.slice());
    const hi=o.humanIndex;
    if(hi!=null&&o.humanRole&&roles.includes(o.humanRole)){const j=roles.indexOf(o.humanRole);[roles[hi],roles[j]]=[roles[j],roles[hi]];}
    if(hi!=null&&o.humanChar){const c=chars.find(x=>x.name===o.humanChar||x.id===o.humanChar); if(c){chars=chars.filter(x=>x!==c); chars.splice(hi,0,c);}}
    this.players=roles.map((r,i)=>{const ch=chars[i];const mx=ch.hp+(r==='sheriff'?this.bal.shHp:0)+(r==='renegade'?(this.bal.renHp||0):0)+(r==='outlaw'?(this.bal.outHp||0):0)+(r==='deputy'?(this.bal.depHp||0):0);
      return {id:i,char:ch,name:ch.name,role:r,hp:mx,maxHp:mx,hand:[],equip:{},judge:[],alive:true,bangs:0,human:o.humanIndex===i};});
    this.players.forEach(p=>{const k=p.hp+(p.role==='sheriff'?(this.bal.shCards||0):0);for(let i=0;i<k;i++)p.hand.push(this.draw());});
    this.sus={}; this.players.forEach(p=>this.sus[p.id]=0);
    this.cur=this.players.find(p=>p.role==='sheriff');
  }
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  draw(){ if(!this.deck.length){ if(!this.discard.length) return null; this.deck=this.shuffle(this.discard); this.discard=[]; this.say('牌堆重洗。'); } return this.deck.pop(); }
  give(p,k){for(let i=0;i<k;i++){const c=this.draw(); if(c)p.hand.push(c);} }
  say(t){this.log.push(t);this.onLog(t);}
  async tick(){this.onUpdate(); if(this.delay) await new Promise(r=>setTimeout(r,this.delay));}
  alive(){return this.players.filter(p=>p.alive);}
  others(p){const a=this.alive();const i=a.indexOf(p);return a.slice(i+1).concat(a.slice(0,i));}
  cn(c){return CARDS[c.key].name;}
  cs(c){return c.suit+RANKS[c.rank-1];}
  has(p,id){return p.alive&&p.char.id===id;}
  dist(a,b){ if(a===b) return 0; const al=this.alive();const i=al.indexOf(a),j=al.indexOf(b);const d0=Math.abs(i-j);let d=Math.min(d0,al.length-d0);
    if(b.equip.horseP)d++; if(this.has(b,'heart'))d++; if(a.equip.horseM)d--; if(this.has(a,'melody'))d--; return Math.max(1,d);}
  range(p){return p.equip.weapon?CARDS[p.equip.weapon.key].range:1;}
  allCards(p){return p.hand.length+Object.keys(p.equip).length+p.judge.length;}
  disc(c){if(c)this.discard.push(c);}
  removeHand(p,c){const i=p.hand.indexOf(c);if(i>=0)p.hand.splice(i,1);this.disc(c);}
  asBang(p,c){return c.key==='bang'||(c.key==='missed'&&this.has(p,'miracle'));}
  asMiss(p,c){return c.key==='missed'||(c.key==='bang'&&this.has(p,'miracle'));}
  unlimited(p){return this.has(p,'black')||(p.equip.weapon&&p.equip.weapon.key==='volcanic');}
  // which targets a card can be used on; returns null if no target needed, [] if unplayable
  targets(p,c){ const t=this._targets(p,c); const L=this.bal.renNoSh;
    if(t&&L&&p.role==='renegade'&&this.alive().length>L&&(this.asBang(p,c)||c.key==='duel')) return t.filter(q=>q.role!=='sheriff'); return t; }
  _targets(p,c){
    const o=this.others(p);
    if(this.asBang(p,c)){ if(p.bangs>=1&&!this.unlimited(p)) return []; return o.filter(q=>this.dist(p,q)<=this.range(p)); }
    switch(c.key){
      case 'missed': return [];
      case 'beer': return (p.hp<p.maxHp&&this.alive().length>2)?null:[];
      case 'duel': return o;
      case 'panic': return o.filter(q=>this.dist(p,q)<=1&&this.allCards(q)>0);
      case 'catbalou': return o.filter(q=>this.allCards(q)>0);
      case 'jail': return o.filter(q=>q.role!=='sheriff'&&!q.judge.some(x=>x.key==='jail'));
      case 'dynamite': return p.judge.some(x=>x.key==='dynamite')?[]:null;
      default: return null;
    }
  }
  canPlay(p,c){const t=this.targets(p,c);return t===null||t.length>0;}
  hostile(a,b){ if(!a||a===b)return; if(b.role==='sheriff')this.sus[a.id]+=3; else if(this.sus[b.id]>0)this.sus[a.id]-=1; else if(this.sus[b.id]<0)this.sus[a.id]+=1; }
  async judgeCard(p,good,label){
    const n=this.has(p,'star')?2:1; const cs=[];for(let i=0;i<n;i++){const c=this.draw();if(c)cs.push(c);}
    if(!cs.length) return true;
    let pick=cs[0]; if(cs.length>1){ const ch=this.ctrls[p.id].chooseJudge?await this.ctrls[p.id].chooseJudge(this,p,cs,good,label):null; pick=cs.includes(ch)?ch:(cs.find(good)||cs[0]); } cs.forEach(c=>this.disc(c));
    const ok=good(pick); this.say(`${p.name} 判定【${label}】翻出 ${this.cs(pick)}${this.cn(pick)} → ${ok?'有利':'不利'}`); return ok;
  }
  async run(){
    this.say(`開局！光之隊長是 ${this.cur.name}。`);
    try{
      while(!this.over){ this.turnCount++; if(this.turnCount>this.maxTurns) throw new Error('turn limit'); await this.turn(this.cur); if(this.over)break; this.cur=this.nextAlive(this.cur); this.onUpdate(); }
    }catch(e){ if(!(e instanceof GameOver)) throw e; }
    this.onUpdate(); return this.winner;
  }
  nextAlive(p){const n=this.players.length;for(let i=1;i<=n;i++){const q=this.players[(p.id+i)%n];if(q.alive)return q;}return p;}
  async turn(p){
    p.bangs=0; this.say(`—— ${p.name} 的回合 ——`); await this.tick();
    const dyn=p.judge.find(c=>c.key==='dynamite');
    if(dyn){ p.judge.splice(p.judge.indexOf(dyn),1);
      if(!await this.judgeCard(p,c=>!(c.suit==='♠'&&c.rank>=2&&c.rank<=9),'暗黑炸彈')){ this.disc(dyn); this.say(`暗黑炸彈爆炸！${p.name} 受 3 傷`); await this.damage(p,3,null); if(!p.alive)return; }
      else { const nx=this.nextAlive(p); if(nx!==p&&!nx.judge.some(c=>c.key==='dynamite')){nx.judge.push(dyn);this.say(`暗黑炸彈傳給 ${nx.name}`);} else this.disc(dyn); } }
    const jail=p.judge.find(c=>c.key==='jail');
    if(jail){ p.judge.splice(p.judge.indexOf(jail),1); this.disc(jail);
      if(!await this.judgeCard(p,c=>c.suit==='♥','黑暗牢籠')){ this.say(`${p.name} 被黑暗牢籠困住，跳過本回合`); return; } }
    // draw phase
    if(this.has(p,'peach')) this.give(p,3);
    else if(this.has(p,'yell')&&this.others(p).some(q=>q.hand.length)){ const cand=this.others(p).filter(q=>q.hand.length);
      const t=await this.ctrls[p.id].chooseSteal(this,p,cand);
      if(t&&cand.includes(t)){ const c=t.hand.splice(Math.floor(this.rng()*t.hand.length),1)[0]; p.hand.push(c); this.say(`${p.name} 吸取 ${t.name} 一張手牌`); this.give(p,1); this.caiyi(); }
      else this.give(p,2); }
    else if(this.has(p,'grace')){ this.give(p,1); const c=this.draw(); if(c){p.hand.push(c); if(c.suit==='♥'||c.suit==='♦'){this.say(`${p.name} 亮出 ${this.cs(c)}，多摸 1 張`);this.give(p,1);}} }
    else this.give(p,Math.max(1,2+(p.role==='renegade'?(this.bal.renDraw||0):0)));
    await this.tick();
    for(let k=0;k<80&&p.alive;k++){ this.caiyi();
      const a=await this.ctrls[p.id].choosePlay(this,p); if(!a)break;
      await this.act(p,a); this.caiyi(); await this.tick(); }
    if(!p.alive)return;
    const ex=p.hand.length-Math.max(0,p.hp);
    if(ex>0){ let cs=await this.ctrls[p.id].discard(this,p,ex); cs=(cs||[]).filter(c=>p.hand.includes(c)).slice(0,ex);
      while(cs.length<ex){const r=p.hand.find(c=>!cs.includes(c));cs.push(r);}
      cs.forEach(c=>this.removeHand(p,c)); this.say(`${p.name} 棄 ${ex} 張牌`); this.caiyi(); }
  }
  caiyi(){ this.players.forEach(p=>{ if(this.has(p,'flora')&&p.hand.length===0){const c=this.draw(); if(c){p.hand.push(c);this.say('春野遙 花之公主，摸 1 張');}} }); }
  async act(p,a){
    if(a.skill){ // blossom
      if(!this.has(p,'blossom')||p.hp>=p.maxHp||!a.cards||a.cards.length!==2||!a.cards.every(c=>p.hand.includes(c)))return;
      a.cards.forEach(c=>this.removeHand(p,c)); p.hp++; this.say(`花咲蕾 花之鼓勵：棄 2 張回復 1`); return; }
    const c=a.card; if(!p.hand.includes(c))return;
    const ts=this.targets(p,c); if(ts&&!ts.length)return;
    const t=ts?(ts.includes(a.target)?a.target:ts[0]):null;
    const def=CARDS[c.key]; this.lastPlay={p,c,t}; this.onPlay(p,c,t);
    if(def.type==='equip'){ p.hand.splice(p.hand.indexOf(c),1); if(p.equip[def.slot])this.disc(p.equip[def.slot]); p.equip[def.slot]=c; this.say(`${p.name} 裝備【${def.name}】`); return; }
    p.hand.splice(p.hand.indexOf(c),1);
    if(c.key==='jail'||c.key==='dynamite'){ (t||p).judge.push(c); this.say(c.key==='jail'?`${p.name} 對 ${t.name} 施下【黑暗牢籠】`:`${p.name} 放置【暗黑炸彈】`); if(t)this.hostile(p,t); return; }
    this.disc(c);
    if(this.asBang(p,c)){ p.bangs++; this.say(`${p.name} 對 ${t.name} 使出【光之衝擊】`); this.hostile(p,t); await this.attack(p,t,this.has(p,'dream')?2:1); return; }
    switch(c.key){
      case 'beer': this.heal(p,this.has(p,'white')?2:1); this.say(`${p.name} 服用【元氣甜點】`); break;
      case 'stagecoach': this.give(p,2); this.say(`${p.name}【妖精的禮物】摸 2 張`); break;
      case 'wells': this.give(p,3); this.say(`${p.name}【奇蹟寶石】摸 3 張`); break;
      case 'saloon': this.alive().forEach(q=>this.heal(q,1)); this.say(`${p.name} 擺開【茶會派對】，眾人回復 1`); break;
      case 'gatling': this.say(`${p.name} 施展【光之洪流】！`); for(const q of this.others(p)){ if(q.alive) await this.attack(p,q,1);} break;
      case 'indians': this.say(`${p.name} 引來【怪物大軍】！`); for(const q of this.others(p)){ if(!q.alive)continue; const r=await this.ask(q,'bang',{src:p});
          if(r){this.say(`${q.name} 出衝擊擊退怪物`);} else { this.say(`${q.name} 被怪物所傷`); await this.damage(q,1,p);} } break;
      case 'duel': { this.say(`${p.name} 向 ${t.name} 發起【正面對決】`); this.hostile(p,t); let cur=t,oth=p;
        for(;;){ const r=await this.ask(cur,'bang',{src:oth}); if(!r){ this.say(`${cur.name} 對決落敗`); await this.damage(cur,1,oth); break;} this.say(`${cur.name} 出衝擊`); [cur,oth]=[oth,cur]; } break; }
      case 'panic': case 'catbalou': { this.hostile(p,t); const ch=await this.ctrls[p.id].chooseCard(this,p,t,c.key); const got=this.takeFrom(t,ch);
        if(got){ if(c.key==='panic'){p.hand.push(got);this.say(`${p.name}【妖精偷取】取走 ${t.name} 一張牌`);} else {this.disc(got);this.say(`${p.name}【淨化之光】棄掉 ${t.name} 的 ${ch&&ch.zone!=='hand'?this.cn(got):'一張手牌'}`);} } break; }
    }
  }
  takeFrom(t,ch){
    ch=ch||{zone:'hand'};
    if(ch.zone==='equip'&&t.equip[ch.slot]){const c=t.equip[ch.slot];delete t.equip[ch.slot];return c;}
    if(ch.zone==='judge'&&t.judge.includes(ch.card)){t.judge.splice(t.judge.indexOf(ch.card),1);return ch.card;}
    if(t.hand.length) return t.hand.splice(Math.floor(this.rng()*t.hand.length),1)[0];
    const s=Object.keys(t.equip)[0]; if(s){const c=t.equip[s];delete t.equip[s];return c;}
    return t.judge.shift()||null;
  }
  heal(p,n){p.hp=Math.min(p.maxHp,p.hp+n);}
  async ask(p,kind,ctx){
    const ok=kind==='bang'?(c=>this.asBang(p,c)):kind==='dodge'?(c=>this.asMiss(p,c)):(c=>c.key==='beer');
    const opts=p.hand.filter(ok); if(!opts.length)return null;
    const r=await this.ctrls[p.id].respond(this,p,kind,ctx,opts);
    if(r&&p.hand.includes(r)&&ok(r)){ this.removeHand(p,r); this.onPlay(p,r,(ctx&&ctx.src)||null,true); this.caiyi(); await this.tick(); return r; }
    return null;
  }
  async attack(src,t,need){
    let got=0; const heart=c=>c.suit==='♥';
    if(t.equip.armor&&await this.judgeCard(t,heart,'守護胸針')) got++;
    if(got<need&&this.has(t,'bloom')&&await this.judgeCard(t,heart,'花之盾')) got++;
    while(got<need){ const r=await this.ask(t,'dodge',{src,need:need-got}); if(!r)break; got++; this.say(`${t.name} 出【光之屏障】`); }
    if(got<need){ await this.damage(t,1,src); }
  }
  async damage(t,n,src){
    t.hp-=n; this.say(`${t.name} 受到 ${n} 點傷害（剩 ${t.hp}）`); if(src)this.hostile(src,t);
    if(this.has(t,'happy')) this.give(t,n);
    if(this.has(t,'whip')&&src&&src!==t&&src.alive){ for(let i=0;i<n&&src.hand.length;i++){t.hand.push(src.hand.splice(Math.floor(this.rng()*src.hand.length),1)[0]);} this.caiyi(); }
    await this.tick();
    while(t.hp<=0&&this.alive().length>2){
      const r=await this.ask(t,'dying',{});
      if(r){ this.heal(t,this.has(t,'white')?2:1); this.say(`${t.name} 瀕危吃下元氣甜點（${t.hp}）`); continue; }
      if(this.has(t,'blossom')&&t.hand.length>=2){ const cs=await this.ctrls[t.id].jiuSkill(this,t); if(!cs||cs.length!==2||!cs.every(c=>t.hand.includes(c))||cs[0]===cs[1])break; cs.forEach(c=>this.removeHand(t,c)); t.hp++; this.say('花咲蕾 花之鼓勵自救'); continue; }
      break;
    }
    if(t.hp<=0) this.kill(t,src);
  }
  kill(t,src){
    t.alive=false; this.say(`☠ ${t.name} 倒下！身分：${ROLES[t.role]}`);
    const cards=t.hand.concat(Object.values(t.equip),t.judge); t.hand=[];t.equip={};t.judge=[];
    const doc=this.players.find(q=>this.has(q,'lovely'));
    if(doc){doc.hand.push(...cards);this.say('愛乃惠 愛之接力，得其所有牌');} else cards.forEach(c=>this.disc(c));
    this.checkWin();
    const rn=this.players.find(q=>q.alive&&q.role==='renegade'&&q!==t);
    if(rn&&this.bal.renFish){ this.give(rn,this.bal.renFish); if(this.bal.renFishHeal)rn.hp=Math.min(rn.maxHp,rn.hp+this.bal.renFishHeal); this.say('（有人暗中漁翁得利…）'); }
    if(src&&src.alive&&src!==t){
      if(t.role==='outlaw'){this.give(src,3);this.say(`${src.name} 擊倒黑暗勢力，摸 3 張`);}
      if(src.role==='sheriff'&&t.role==='deputy'){const cs=src.hand.concat(Object.values(src.equip));src.hand=[];src.equip={};cs.forEach(c=>this.disc(c));this.say('隊長誤傷夥伴，棄光所有牌！');}
    }
    this.caiyi();
  }
  checkWin(){
    const al=this.alive(); const sh=this.players.find(p=>p.role==='sheriff');
    let w=null;
    if(!sh.alive) w=(al.length===1&&al[0].role==='renegade')?'renegade':'outlaw';
    else if(!al.some(p=>p.role==='outlaw'||p.role==='renegade')) w='sheriff';
    if(w){ this.over=true; this.winner=w; this.say(`★ 遊戲結束：${w==='sheriff'?'光之隊長與夥伴':ROLES[w]} 獲勝！`); this.onUpdate(); throw new GameOver(); }
  }
}

// ---------------- AI ----------------
const AI = {
  enemy(g,p,q){ const s=g.sus[q.id], B=g.bal, late=g.turnCount>g.players.length*(B.lateMul||12);
    if(q.alive===false||q===p)return false;
    if(p.role==='outlaw'){ if(q.role==='sheriff')return true; if(s>=(B.outCoop||2))return false; return s<0||((late||B.outAggro)&&s<=0); }
    if(p.role==='sheriff'||p.role==='deputy'){ if(q.role==='sheriff')return false; if(s>0)return true;
      const anyS=g.others(p).some(x=>g.sus[x.id]>0); if(late)return s>=0; return !anyS&&p.role==='sheriff'&&s>=0&&g.turnCount>g.players.length*(B.blind||2); }
    // renegade: keep both sides even, sheriff last
    const sh=g.players.find(x=>x.role==='sheriff'); const rest=g.others(p).filter(x=>x!==sh);
    if(q===sh) return rest.length===0;
    if(B.renLow&&g.alive().length>B.renLow&&!late) return false; // 低調潛伏
    if(rest.length===0) return false;
    const outHp=rest.filter(x=>g.sus[x.id]>0).reduce((a,x)=>a+x.hp,0), shHp=sh.hp+rest.filter(x=>g.sus[x.id]<0).reduce((a,x)=>a+x.hp,0);
    const k=B.renK||1;
    if(sh.hp<=(B.renGuard||1)&&rest.some(x=>g.sus[x.id]>0)) return s>0;   // protect sheriff when nearly dead
    if(outHp>shHp*k) return s>0||late;
    return s<0||(s===0&&late)||(!rest.some(x=>g.sus[x.id]<0)&&s>0);
  },
  ally(g,p,q){ if(p.role==='outlaw')return g.sus[q.id]>2&&q.role!=='sheriff'; if(p.role==='renegade')return false; return q.role==='sheriff'||g.sus[q.id]<0; },
  pick(g,p,list){ const e=list.filter(q=>AI.enemy(g,p,q)); if(!e.length)return null; return e.sort((a,b)=>(b.role==='sheriff')-(a.role==='sheriff')||a.hp-b.hp)[0]; },
  async choosePlay(g,p){
    const H=p.hand;
    for(const c of H){ const d=CARDS[c.key]; if(d.type!=='equip')continue; const cur=p.equip[d.slot];
      if(d.slot==='weapon'){ if(!cur||(d.range>CARDS[cur.key].range&&!(cur.key==='volcanic'&&g.has(p,'black')===false&&H.filter(x=>g.asBang(p,x)).length>1))) if(!cur||cur.key!==c.key) return {card:c}; }
      else if(!cur) return {card:c}; }
    for(const c of H) if(c.key==='beer'&&g.canPlay(p,c)&&(p.hp<=2||H.length>p.hp)) return {card:c};
    for(const c of H) if(c.key==='stagecoach'||c.key==='wells') return {card:c};
    for(const c of H) if(c.key==='saloon'&&p.hp<p.maxHp) return {card:c};
    for(const c of H){ if(c.key==='jail'){const t=AI.pick(g,p,g.targets(p,c)); if(t)return{card:c,target:t};}
      if(c.key==='dynamite'&&(p.role==='outlaw'||p.role==='renegade')&&g.canPlay(p,c)&&g.rng()<0.5) return {card:c}; }
    for(const c of H) if(c.key==='panic'||c.key==='catbalou'){ const t=AI.pick(g,p,g.targets(p,c)); if(t)return{card:c,target:t};
      const own=g.targets(p,c).find(q=>!AI.enemy(g,p,q)&&q.judge.length&&AI.ally(g,p,q)); if(own&&c.key==='catbalou')return{card:c,target:own}; }
    const bangs=H.filter(c=>g.asBang(p,c)).length;
    for(const c of H) if(c.key==='duel'){ const t=AI.pick(g,p,g.others(p)); if(t&&(bangs>=1||t.hp===1))return{card:c,target:t}; }
    for(const c of H) if(c.key==='gatling'||c.key==='indians'){ const o=g.others(p); const e=o.filter(q=>AI.enemy(g,p,q)).length, a=o.filter(q=>AI.ally(g,p,q)).length;
      const shLow=p.role!=='outlaw'&&o.some(q=>q.role==='sheriff'&&q.hp<=1); if(e>=a&&e>0&&!shLow)return{card:c}; }
    for(const c of H) if(g.asBang(p,c)){ const ts=g.targets(p,c); const t=AI.pick(g,p,ts); if(t&&!(c.key==='missed'&&bangs-1<1&&H.filter(x=>x.key==='missed').length<=1&&false)) return{card:c,target:t}; }
    if(g.has(p,'blossom')&&p.hp<p.maxHp&&H.length>p.hp+1){ const cs=H.filter(c=>!g.asMiss(p,c)&&c.key!=='beer'); if(cs.length>=2)return{skill:true,cards:cs.slice(0,2)}; }
    return null;
  },
  async respond(g,p,kind,ctx,opts){
    if(kind==='dying') return opts[0];
    if(kind==='bang'&&ctx.src&&!AI.enemy(g,p,ctx.src)&&p.hp>2&&ctx.src.role==='sheriff'&&p.role==='deputy') return null;
    // prefer real card type
    const pref=opts.find(c=>kind==='dodge'?c.key==='missed':c.key==='bang'); return pref||opts[0];
  },
  async chooseJudge(g,p,cs,good){ return cs.find(good)||cs[0]; },
  async chooseSteal(g,p,cand){ const e=cand.filter(q=>AI.enemy(g,p,q)); const pool=e.length?e:cand.filter(q=>!AI.ally(g,p,q)); if(!pool.length)return null; return pool.reduce((a,b)=>b.hand.length>a.hand.length?b:a); },
  async jiuSkill(g,p){ return p.hand.slice(0,2); },
  async discard(g,p,n){ const val=c=>({missed:5,beer:6,bang:4}[c.key]||(CARDS[c.key].type==='equip'?1:3)); return p.hand.slice().sort((a,b)=>val(a)-val(b)).slice(0,n); },
  async chooseCard(g,p,t,kind){
    if(AI.enemy(g,p,t)){ for(const s of ['weapon','armor','horseP','horseM']) if(t.equip[s]) return {zone:'equip',slot:s}; if(t.hand.length)return{zone:'hand'}; }
    if(t.judge.length) return {zone:'judge',card:t.judge[0]};
    if(t.hand.length) return {zone:'hand'}; const s=Object.keys(t.equip)[0]; return {zone:'equip',slot:s};
  }
};
root.PALBANG={BAL,Game,AI,CARDS,CHARS,ROLES,SUITS,RANKS,GameOver};
if(typeof module!=='undefined')module.exports=root.PALBANG;
})(typeof window!=='undefined'?window:globalThis);
