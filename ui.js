function hpHTML(h,m){return Array.from({length:m},(_,i)=>`<span class="hpi ${i<h?'':'empty'}"></span>`).join('')+`<b class="hpn${m>5?' on':''}">${h}/${m}</b>`;}
(function(){
const {Game,AI,CARDS,ROLES,RANKS}=PALBANG; const $=s=>document.querySelector(s);
let g, me, pending=null, sel=null, discSel=[];
const slotName={weapon:'武器',armor:'護具',horseP:'守護妖精',horseM:'飛行妖精'};
const KIND={bang:'attack',gatling:'attack',indians:'attack',duel:'attack',missed:'resp',beer:'heal',saloon:'heal',panic:'trick',catbalou:'trick',stagecoach:'trick',wells:'trick',jail:'judge',dynamite:'judge'};
const GLYPH={bang:'光',missed:'盾',beer:'甜',gatling:'流',indians:'怪',duel:'決',panic:'偷',catbalou:'淨',saloon:'茶',stagecoach:'禮',wells:'寶',jail:'牢',dynamite:'爆',barrel:'針',mustang:'守',scope:'飛',volcanic:'環',sword2:'盒',sword3:'星',sword4:'琴',sword5:'蹟'};
const ASSETS=window.PAL_ASSETS||{}; const CHAR_IMG={'black':'char_black.png','white':'char_white.png','dream':'char_dream.png','peach':'char_peach.png','blossom':'char_blossom.png','melody':'char_melody.png','happy':'char_happy.png','heart':'char_heart.png','bloom':'char_bloom.png','lovely':'char_lovely.png','flora':'char_flora.png','miracle':'char_miracle.png','whip':'char_whip.png','star':'char_star.png','yell':'char_yell.png','grace':'char_grace.png'};
const aurl=f=>{const v=ASSETS[f]; return v?`url("assets/${typeof v==="string"?v:f}")`:null;};
function avatarHTML(ch){ const u=aurl(CHAR_IMG[ch.id]); return `<div class="avatar${u?' img':''}"${u?` style='background-image:${u}'`:''}>${ch.name.slice(-1)}</div>`; }
function applyDecor(){ const t=aurl('table.png'), b=aurl('back.png'), bd=aurl('backdrop.png');
  if(t) document.querySelectorAll('.felt').forEach(e=>e.style.backgroundImage=`linear-gradient(rgba(40,20,80,.25),rgba(20,10,50,.45)),${t}`);
  if(b) document.querySelectorAll('.back').forEach(e=>{e.style.backgroundImage=b;e.classList.add('img');});
  if(bd) document.body.style.backgroundImage=`linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.55)),${bd}`; }
// UI chrome art (seat/card/panel/button frames, title logo, etc.) from web/assets/ui/*.png — same
// ASSETS-manifest mechanism as applyDecor(). Each hook only turns on when the matching file exists
// (see art/gpt/ui_asset_requests.md); CSS keeps the current hand-styled look when it's absent.
function applyUIDecor(){ const UI=['card-frame','seat-frame','panel-frame','button','role-badge','eq-chip-frame','title-logo','stage-ring','hp-gem'];
  UI.forEach(k=>{ const u=aurl('ui/'+k.replace(/-/g,'_')+'.png'); if(!u) return;
    document.documentElement.style.setProperty('--ui-'+k,u); document.body.classList.add('has-ui-'+k); }); }
const TYPE={play:'錦囊',resp:'回應',equip:'裝備',judge:'延時'};
function cardEl(c,extra){ const d=CARDS[c.key]; const k=KIND[c.key]||(d.type==='equip'?'equip':'trick'); const e=document.createElement('div'); e.className='card k-'+k+(extra||'')+(ASSETS['card_'+c.key+'.png']?' has-art':'');
  const red=c.suit==='♥'||c.suit==='♦'; const r=RANKS[c.rank-1];
  e.innerHTML=`<div class="band">${c.key==='bang'?'攻擊':TYPE[d.type]}</div><div class="cn">${r}<span>${c.suit}</span></div><div class="cn br ${red?'r':''}">${r}<span>${c.suit}</span></div>${aurl("card_"+c.key+".png")?`<div class="art" style='background-image:${aurl("card_"+c.key+".png")}'></div>`:""}<div class="glyph">${GLYPH[c.key]}</div><div class="nm">${d.name}</div><div class="ds">${d.desc}</div>`;
  e.title=d.name+'：'+d.desc; return e; }
function updateSafeBottom(){ const bot=$('#bottom'); if(bot) document.documentElement.style.setProperty('--safe-bottom',(bot.getBoundingClientRect().height+16)+'px'); }
window.addEventListener('resize',updateSafeBottom);
function modal(title,sub,items,onPick){ updateSafeBottom(); $('#mtitle').textContent=title; $('#msub').textContent=sub||''; const b=$('#mbody'); b.innerHTML='';
  items.forEach(it=>{const el=it.card?cardEl(it.card,it.good?' good':''):Object.assign(document.createElement('button'),{textContent:it.label,className:it.ghost?'ghost':''}); el.onclick=()=>{$('#modal').hidden=true;onPick(it.value);}; b.appendChild(el);}); $('#modal').hidden=false; }
const Human={
  choosePlay(gm,p){ return new Promise(res=>{ pending={type:'play',res}; sel=null; render(); }); },
  respond(gm,p,kind,ctx,opts){ return new Promise(res=>{ render();
    const t=kind==='dodge'?`⚔ ${ctx.src.name} 對你出手！`:kind==='bang'?`${ctx.src.name} 要你出【光之衝擊】`:'☠ 你瀕臨死亡！';
    const s=kind==='dodge'?`打出【光之屏障】抵銷${ctx.need>1?`（夢之力：還需 ${ctx.need} 張）`:''}，否則受 1 點傷害`:kind==='bang'?'打出【光之衝擊】回應，否則受 1 點傷害':'服用【元氣甜點】回復體力，否則倒下';
    if(ctx.src) arrow(ctx.src,p,1500);
    modal(t,s,opts.map(c=>({card:c,value:c})).concat([{label:'不出（承受）',value:null,ghost:true}]),res); }); },
  discard(gm,p,n){ return new Promise(res=>{ pending={type:'discard',n,res}; discSel=[]; render(); }); },
  chooseCard(gm,p,t,kind){ return new Promise(res=>{ const it=[]; if(t.hand.length)it.push({label:`🂠 隨機手牌（${t.hand.length}）`,value:{zone:'hand'}});
    Object.entries(t.equip).forEach(([s,c])=>it.push({card:c,value:{zone:'equip',slot:s}}));
    t.judge.forEach(c=>it.push({card:c,value:{zone:'judge',card:c}}));
    modal(`${kind==='panic'?'妙手空空':'破咒'}：選擇 ${t.name} 的一張牌`,kind==='panic'?'取得的牌放入你的手牌':'選中的牌將被棄掉',it,res); }); },
  chooseJudge(gm,p,cs,good,label){ return new Promise(res=>{ render();
    modal(`星奈光 星之占卜：${label||'判定'}`,'翻出兩張判定牌，選一張作為結果（綠框＝對你有利）',cs.map(c=>({card:c,value:c,good:good(c)})),res); }); },
  chooseSteal(gm,p,cand){ return new Promise(res=>{ render();
    modal('野乃花 應援之聲：摸牌階段','從一名角色手中抽 1 張牌＋牌堆摸 1 張，或照常摸牌',cand.map(q=>({label:`抽 ${q.name}（手牌 ${q.hand.length}）`,value:q})).concat([{label:'照常摸 2 張',value:null,ghost:true}]),res); }); },
  jiuSkill(gm,p){ return new Promise(res=>{ render(); const picked=[];
    const box=$('#mbody'); modal('☠ 瀕危・花咲蕾 花之鼓勵','是否棄 2 張手牌回復 1 點體力？選兩張後按確認',[],()=>{});
    p.hand.forEach(c=>{const e=cardEl(c); e.onclick=()=>{const i=picked.indexOf(c); if(i>=0){picked.splice(i,1);e.classList.remove('sel');} else if(picked.length<2){picked.push(c);e.classList.add('sel');} ok.textContent=`確認棄 ${picked.length}/2`;}; box.appendChild(e);});
    const ok=btn('確認棄 0/2',()=>{if(picked.length===2){$('#modal').hidden=true;res(picked.slice());}}); const no=btn('不使用',()=>{$('#modal').hidden=true;res(null);},'ghost');
    box.append(ok,no); }); }
};
// seating around 四方桌: bottom = me; clockwise → left (bottom→top), top (left→right), right (top→bottom)
const SPLIT={3:[1,1,1],4:[1,2,1],5:[2,1,2],6:[2,2,2]};
const seatEls={};
function seatHTML(p){
  const showRole=p.role==='sheriff'||!p.alive||p===me||g.over;
    const hp=hpHTML(p.hp,p.maxHp);
  const dist=p!==me&&p.alive&&me.alive?`<span>距離 <b>${g.dist(me,p)}</b></span>`:'';
  const mini=p===me?'':`<span class="mini">${'<i></i>'.repeat(Math.min(p.hand.length,8))}</span>`;
  const eq=['weapon','armor','horseP','horseM'].filter(k=>p.equip[k]).map(k=>eqHTML(p.equip[k],k)).join('')+p.judge.map(c=>eqHTML(c,'judge')).join('');
  return `<div class="top">${avatarHTML(p.char)}<div><h3>${p.name}${p===me?' <small>（你）</small>':''}</h3><div class="hp">${hp}</div></div><span class="role ${showRole?p.role:''}">${showRole?ROLES[p.role]:'？'}</span></div>
   <div class="stats"><span>手牌 <b>${p.hand.length}</b>${mini}</span><span>範圍 <b>${g.range(p)}</b></span>${dist}</div><div class="skill" title="${p.char.desc}">${p.char.desc}</div><span class="skbtn" data-sk="${p.char.name}：${p.char.desc}">技</span>${showRole&&p.role==='renegade'&&renRule(g.bal)?`<div class="skill rr">背叛者規則：${renRule(g.bal)}</div>`:''}<div class="eq">${eq}</div>`;
}
function eqTag(c,k){ const d=CARDS[c.key]; return k==='weapon'?`範圍 ${d.range}${c.key==='volcanic'?'・連擊':''}`:k==='armor'?'♥＝屏障':k==='horseP'?'被看 +1':k==='horseM'?'看人 −1':c.key==='jail'?'判定・牢籠':'判定・天雷'; }
function eqHTML(c,k){ const u=aurl('card_'+c.key+'.png'); const tag=((k==='judge'||k==='weapon'?'':slotName[k]+'・')+eqTag(c,k)).replace(/・/g,'・<wbr>');
  return `<div class="eqc ${k==='judge'?'jd':'s-'+k}" data-cid="${c.id}"><div class="eqi${u?' img':''}"${u?` style='background-image:${u}'`:''}>${u?'':GLYPH[c.key]}</div><div class="eqt"><b>${CARDS[c.key].name}</b><small>${tag}</small></div></div>`; }
function findCard(id){ for(const p of g.players){ for(const c of Object.values(p.equip)) if(c.id==id) return c; for(const c of p.judge) if(c.id==id) return c; } return null; }
function render(){ if(!g)return;
  const tg=(pending&&pending.type==='play'&&sel)?(g.targets(me,sel.card)||[]):[];
  const n=g.players.length, others=[]; for(let i=1;i<n;i++)others.push(g.players[(me.id+i)%n]);
  const [a,b]=SPLIT[n-1]; const groups={sideL:others.slice(0,a),sideT:others.slice(a,a+b),sideR:others.slice(a+b),mySeat:[me]};
  for(const [id,list] of Object.entries(groups)){ const box=$('#'+id); box.innerHTML='';
    list.forEach(p=>{ const s=document.createElement('div'); s.className='seat'+(p===g.cur&&!g.over?' cur':'')+(p.alive?'':' dead')+(tg.includes(p)?' tgt':'');
      s.innerHTML=seatHTML(p); seatEls[p.id]=s;
      if(tg.includes(p)) s.onclick=()=>{const r=pending.res;pending=null;const c=sel.card;sel=null;r({card:c,target:p});};
      const sb=s.querySelector('.skbtn'); if(sb) sb.onclick=ev=>{ev.stopPropagation(); showTip(sb);};
      box.appendChild(s); }); }
  $('#mebar').innerHTML=`你是 <b>${me.name}</b>・<b>${ROLES[me.role]}</b>　體力 ${Math.max(0,me.hp)}/${me.maxHp}　${g.over?'':g.cur===me?'<b style="color:#ffe08a">◆ 你的回合</b>':'等待 '+g.cur.name+' 行動…'}　<span style="color:#9fd8c0">目標：${goal()}</span>`;
  const h=$('#hand'); h.innerHTML='';
  me.hand.forEach(c=>{ let extra=''; if(pending&&pending.type==='play'&&!pending.skill){ if(!g.canPlay(me,c))extra=' no'; if(sel&&sel.card===c)extra+=' sel'; }
    if((pending&&pending.type==='discard'||pending&&pending.skill)&&discSel.includes(c))extra=' sel';
    const e=cardEl(c,extra); e.dataset.id=c.id; e.onclick=()=>clickCard(c); h.appendChild(e); });
  fanHand(); const B=$('#btns'); B.innerHTML='';
  if(pending&&pending.type==='play'){ B.append(btn('結束出牌',()=>{const r=pending.res;pending=null;r(null);},'ghost'));
    if(me.char.id==='blossom'&&me.hp<me.maxHp&&me.hand.length>=2&&!pending.skill) B.append(btn('花之鼓勵（棄2回1）',()=>{pending.skill=true;discSel=[];sel=null;render();}));
    if(pending.skill) B.append(btn(`確定棄 ${discSel.length}/2`,()=>{if(discSel.length===2){const r=pending.res;pending=null;r({skill:true,cards:discSel});}}));
    B.append(hint(pending.skill?'選 2 張手牌棄掉回復 1 點體力':sel?`選擇【${CARDS[sel.card.key].name}】的目標（紅框角色），再點一次卡牌取消`:'點手牌出牌（暗色＝目前不能出）')); }
  if(pending&&pending.type==='discard'){ B.append(btn(`棄牌 ${discSel.length}/${pending.n}`,()=>{if(discSel.length===pending.n){const r=pending.res;pending=null;r(discSel);}})); B.append(hint(`手牌超過體力上限，請選 ${pending.n} 張棄掉`)); }
  if(g.over) B.append(btn('再玩一局',()=>location.reload()));
  // table
  $('#deckCap').textContent=`牌堆 ${g.deck.length}`;
  const dp=$('#discPile'); dp.querySelectorAll('.card').forEach(x=>x.remove()); const top=g.discard[g.discard.length-1]; if(top){const e=cardEl(top);e.style.cursor='default';dp.prepend(e);} $('#discCap').textContent=`棄牌 ${g.discard.length}`;
  const ban=$('#banner'); if(g.over){ban.className='win';ban.textContent=`${g.winner==='sheriff'?'光之隊長與夥伴':ROLES[g.winner]} 獲勝！${winText()}`;
    const psc=$('#playSlot .cap'); if(psc) psc.style.visibility='hidden';
  } else {ban.className='';ban.textContent=`第 ${g.turnCount} 回合・${g.cur.name} 行動中`;}
  const al=g.alive().length;
  $('#info').innerHTML=`<h2>光之美少女・閃耀大亂鬥 <button class="ghost rbtn" onclick="document.getElementById('rules').hidden=false">規則說明</button></h2>存活 ${al}/${n}　光之隊長：${g.players.find(p=>p.role==='sheriff').name}<br>你的身分：<b style="color:#f3d98f">${ROLES[me.role]}</b>・${goal()}`;
}
function renRule(b){ const r=[]; if(b.renDraw)r.push(`摸牌階段少摸 ${-b.renDraw} 張`); if(b.renFish)r.push(`漁翁得利：每有其他角色倒下，摸 ${b.renFish} 張${b.renFishHeal?`並回復 ${b.renFishHeal} 體力`:''}`); return r.join('；'); }
function rulesHTML(n){ const b=PALBANG.BAL[n]||{}; const sets={4:'隊長1・背叛者1・黑暗2',5:'隊長1・夥伴1・背叛者1・黑暗2',6:'隊長1・夥伴1・背叛者1・黑暗3',7:'隊長1・夥伴2・背叛者1・黑暗3'};
  const sh=[]; if(b.shHp)sh.push(`體力上限 +${b.shHp}`); if(b.shCards)sh.push(`起手牌 ${b.shCards>0?'+':''}${b.shCards}`);
  return `<h3>規則說明（${n} 人局）</h3><p><b>身分配置</b>：${sets[n]}</p>
  <p><b>光之隊長</b>（公開）：剷除所有黑暗勢力與背叛者。<br><b>光之夥伴</b>：保護光之隊長，與光之隊長同勝。<br><b>黑暗勢力</b>：擊敗光之隊長即勝。<br><b>背叛者</b>：成為最後唯一生還者（須最後擊敗光之隊長）。</p>
  <p><b>本局特殊規則</b><br>光之隊長：${sh.join('，')||'無'}<br>背叛者：${renRule(b)||'無'}</p>
  <p><b>基本</b>：每回合摸 2 張；【光之衝擊】每回合限一次，目標需在武器範圍內；手牌上限＝體力。擊倒黑暗勢力摸 3 張；隊長誤傷夥伴棄光所有牌。</p>`; }
function goal(){return {sheriff:'剷除所有黑暗勢力與背叛者',deputy:'保護光之隊長，剷除黑暗勢力',outlaw:'擊敗光之隊長',renegade:'成為最後生還者'}[me.role];}
function winText(){const t={sheriff:['sheriff','deputy'],outlaw:['outlaw'],renegade:['renegade']}[g.winner];return t.includes(me.role)?'　你贏了！':'　你輸了…';}
function btn(t,f,cls){const b=document.createElement('button');b.textContent=t;b.onclick=f;if(cls)b.className=cls;return b;}
function hint(t){const s=document.createElement('span');s.id='hint';s.textContent=t;return s;}
function clickCard(c){ if(!pending)return;
  if(pending.type==='discard'||pending.skill){ const lim=pending.skill?2:pending.n; const i=discSel.indexOf(c); if(i>=0)discSel.splice(i,1); else if(discSel.length<lim)discSel.push(c); render(); return; }
  if(!g.canPlay(me,c))return; const t=g.targets(me,c);
  if(t===null){const r=pending.res;pending=null;r({card:c});return;}
  sel=(sel&&sel.card===c)?null:{card:c}; render(); }
const center=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];};
function arrow(p,t,ms){ const a=seatEls[p.id],b=seatEls[t.id]; if(!a||!b||a===b)return; const [x1,y1]=center(a),[x2,y2]=center(b);
  const ln=document.createElementNS('http://www.w3.org/2000/svg','line'); const k=0.88;
  ln.setAttribute('x1',x1);ln.setAttribute('y1',y1);ln.setAttribute('x2',x1+(x2-x1)*k);ln.setAttribute('y2',y1+(y2-y1)*k);ln.setAttribute('marker-end','url(#ah)');
  $('#fx').appendChild(ln); b.classList.add('flash'); setTimeout(()=>ln.remove(),ms||900); }
function onPlay(p,c,t,isResp){ // fly card from player's seat (or hand) to the play slot
  const src=(p===me&&document.querySelector(`#hand .card[data-id="${c.id}"]`))||seatEls[p.id]; const isEq=CARDS[c.key].type==='equip'&&!isResp;
  const slot=isEq?(seatEls[p.id]&&(seatEls[p.id].querySelector('.eq')||seatEls[p.id])):$('#playSlot'); if(!src||!slot)return;
  const s=src.getBoundingClientRect(), d=slot.getBoundingClientRect(); const e=cardEl(c,' fly'); document.body.appendChild(e);
  if(isEq){ requestAnimationFrame(()=>requestAnimationFrame(()=>{ e.style.transform=`translate(${d.left+d.width/2-(s.left+s.width/2)}px,${d.top+d.height/2-(s.top+s.height/2)}px) scale(.25)`; e.style.opacity='.2'; }));
    setTimeout(()=>{ e.remove(); const sl=seatEls[p.id]; if(sl){ sl.classList.add('equipped'); setTimeout(()=>sl.classList.remove('equipped'),900);} },560); }
  const w=e.offsetWidth,hh=e.offsetHeight; e.style.left=(s.left+s.width/2-w/2)+'px'; e.style.top=(s.top+s.height/2-hh/2)+'px'; e.style.transform='scale(.6)'; e.style.opacity='.6';
  e.style.left=(s.left+s.width/2-w/2)+'px'; e.style.top=(s.top+s.height/2-hh/2)+'px';
  if(isEq) return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ e.style.transform=`translate(${d.left+d.width/2-(s.left+s.width/2)}px,${d.top+d.height/2-(s.top+s.height/2)}px) scale(1)`; e.style.opacity='1'; }));
  setTimeout(()=>{ e.remove(); slot.innerHTML=''; const k=cardEl(c); k.style.cursor='default'; slot.appendChild(k);
    const cap=document.createElement('div'); cap.className='cap'; cap.textContent=isResp?`${p.name} 回應${t?'（對 '+t.name+'）':''}`:`${p.name}${t?' → '+t.name:''}`; slot.appendChild(cap); },560);
  if(t&&t!==p&&!isResp) setTimeout(()=>arrow(p,t,1000),100);
}
function showTip(el){ let t=$('#tip'); if(!t){t=document.createElement('div');t.id='tip';document.body.appendChild(t);document.addEventListener('click',()=>t.hidden=true);} const r=el.getBoundingClientRect(); t.textContent=el.dataset.sk; t.hidden=false; t.style.left=Math.min(innerWidth-260,r.left)+'px'; t.style.top=(r.bottom+4)+'px'; }
function log(t){const l=$('#log');const d=document.createElement('div');d.textContent=t;
  if(t.startsWith('——'))d.className='turn'; else if(/傷害|倒下|☠/.test(t))d.className='dmg'; else if(t.startsWith('★'))d.className='big';
  l.appendChild(d);l.scrollTop=l.scrollHeight; const tk=$('#ticker'); if(tk&&!t.startsWith('——'))tk.textContent=t;}
window.addEventListener('resize',render);
function fanHand(){ const h=$('#hand'); const cs=[...h.children]; if(!cs.length)return; const cw=cs[0].offsetWidth, W=h.clientWidth, u=cw/170*1;
  const gap=10*u, need=cs.length*cw+(cs.length-1)*gap; h.style.setProperty('--ov', need<=W? gap+'px' : ((W-cw)/(cs.length-1)-cw)+'px'); }
$('#logbtn').onclick=()=>{ const s=$('#side'); s.classList.toggle('closed'); $('#logbtn').textContent=s.classList.contains('closed')?'戰報 ◂':'收起 ▸'; };
// hover preview: cards in hand / on table, and seats
(function(){ const Z=$('#zoom'); let cur=null;
  function place(el){ const r=el.getBoundingClientRect(), zr=Z.getBoundingClientRect(); const m=12;
    let x=r.left+r.width/2-zr.width/2, y=r.top-zr.height-m; if(y<m) y=r.bottom+m; if(y+zr.height>innerHeight-m){ y=Math.max(m,innerHeight-zr.height-m); x=r.right+m; if(x+zr.width>innerWidth-m) x=r.left-zr.width-m; }
    Z.style.left=Math.max(m,Math.min(innerWidth-zr.width-m,x))+'px'; Z.style.top=y+'px'; }
  function show(el){ Z.innerHTML='';
    if(el.classList.contains('eqc')){ const c=g&&findCard(el.dataset.cid); if(!c) return false; const k=cardEl(c); Z.appendChild(k); }
    else if(el.classList.contains('card')){ const c=el.cloneNode(true); c.classList.remove('sel','no','fly'); c.style.cssText=''; Z.appendChild(c); }
    else { const p=g&&g.players.find(q=>seatEls[q.id]===el); if(!p) return false; const u=aurl(CHAR_IMG[p.char.id]);
      const eq=Object.values(p.equip).map(c=>CARDS[c.key].name+'：'+CARDS[c.key].desc).concat(p.judge.map(c=>CARDS[c.key].name+'：'+CARDS[c.key].desc));
      Z.innerHTML=`<div class="zs">${u?`<div class="zimg" style='background-image:${u}'></div>`:''}<h3>${p.name}</h3><p>${p.char.desc}</p>${eq.map(e=>`<p style="color:#9fd8c0">${e}</p>`).join('')}</div>`; }
    Z.hidden=false; place(el); return true; }
  document.addEventListener('mouseover',e=>{ const el=e.target.closest('.eqc,#hand .card,#playSlot .card,#discPile .card,.seat'); if(el===cur) return; cur=el; if(!el){Z.hidden=true;return;} if(!show(el)){Z.hidden=true;cur=null;} });
  document.addEventListener('mousedown',()=>{Z.hidden=true;cur=null;});
})();
let offer=[], pickChar=null;
function rollOffer(){ const pool=PALBANG.CHARS.slice(); offer=[]; while(offer.length<3&&pool.length) offer.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); pickChar=null;
  const b=$('#offer'); b.innerHTML=''; offer.forEach(c=>{const d=document.createElement('div'); d.className='ofr'; d.innerHTML=`${avatarHTML(c)}<b>${c.name}</b><small class="hp hpo">${hpHTML(c.hp,c.hp)}</small><p>${c.desc}</p>`; d.onclick=()=>{pickChar=c.name; b.querySelectorAll('.ofr').forEach(x=>x.classList.toggle('on',x===d));}; b.appendChild(d);}); }
function seatOpts(){ const n=+$('#np').value, s=$('#seat'); s.innerHTML='<option value="">隨機</option>'+Array.from({length:n},(_,i)=>`<option value="${i}">${i===0?'1號（先手）':(i+1)+'號'}</option>`).join(''); }
$('#np').onchange=()=>{seatOpts();$('#rbody').innerHTML=rulesHTML(+$('#np').value);}; $('#rbody').innerHTML=rulesHTML(+$('#np').value); $('#rclose').onclick=()=>$('#rules').hidden=true; $('#ropen').onclick=()=>$('#rules').hidden=false; $('#reroll').onclick=rollOffer; seatOpts(); rollOffer(); applyDecor(); applyUIDecor();
$('#start').onclick=()=>{ const n=+$('#np').value; const sv=$('#seat').value; const hi=sv===''?Math.floor(Math.random()*n):+sv;
  const ctr=Array(n).fill(AI); ctr[hi]=Human; const hc=!/[?&]debug=1/.test(location.search)?'':decodeURIComponent((location.hash.match(/ch=([^&]+)/)||[])[1]||''); const chosen=hc||pickChar||offer[Math.floor(Math.random()*offer.length)].name; const rv=$('#rolep').value;
  g=new Game({n,humanIndex:hi,humanChar:chosen,humanRole:rv||undefined,controllers:ctr,delay:+$('#spd').value,onLog:log,onUpdate:render,onPlay}); me=g.players[hi];
  $('#rbody').innerHTML=rulesHTML(n); $('#setup').hidden=true; $('#game').hidden=false; window.__game=g; render(); updateSafeBottom(); g.run().catch(e=>{log('錯誤：'+e.message);console.error(e);}); };
})();
