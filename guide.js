// v9.9 遊戲說明 (beginner guide). Card/char data read live from PALBANG (engine.js) so nothing is invented.
(function(){
const P=window.PALBANG, C=P.CARDS, $=s=>document.querySelector(s);
const SETS={4:'光之隊長1・背叛者1・黑暗勢力2',5:'光之隊長1・光之夥伴1・背叛者1・黑暗勢力2',6:'光之隊長1・光之夥伴1・背叛者1・黑暗勢力3',7:'光之隊長1・光之夥伴2・背叛者1・黑暗勢力3'};
const TYPE={play:'出牌',resp:'回應',judge:'判定（放在別人面前）',equip:'裝備'};
const SLOT={weapon:'武器',armor:'護具',horseP:'防禦座騎',horseM:'進攻座騎'};
const row=(k)=>{const c=C[k];return `<tr><td><b>${c.name}</b></td><td>${c.n}</td><td>${c.slot?SLOT[c.slot]:TYPE[c.type]}</td><td>${c.desc}</td></tr>`;};
const keys=Object.keys(C), nonEq=keys.filter(k=>C[k].type!=='equip'), eq=keys.filter(k=>C[k].type==='equip');
const T=[
['目標與身分',`<p>這是 1 人對電腦的身分推理卡牌遊戲。每人抽一個<b>身分</b>，只有<b>光之隊長</b>公開，其他人身分隱藏，要從行動猜出誰是敵是友。</p>
<table><tr><th>身分</th><th>勝利條件</th></tr>
<tr><td><b>光之隊長</b>（公開）</td><td>擊倒所有黑暗勢力與背叛者</td></tr>
<tr><td><b>光之夥伴</b></td><td>保護光之隊長，與隊長一起獲勝</td></tr>
<tr><td><b>黑暗勢力</b></td><td>擊倒光之隊長</td></tr>
<tr><td><b>背叛者</b></td><td>成為最後唯一生還者（要最後才擊倒隊長）</td></tr></table>
<p><b>人數與身分配置</b></p><table><tr><th>人數</th><th>配置</th></tr>${[4,5,6,7].map(n=>`<tr><td>${n} 人</td><td>${SETS[n]}</td></tr>`).join('')}</table>
<p>光之隊長會依人數獲得額外體力或手牌；背叛者在部分人數有特殊規則。開局後按「本局規則」分頁查看。</p>`],
['回合流程',`<ol><li><b>判定</b>：面前有【暗黑炸彈】或【黑暗牢籠】時先翻牌判定（見「卡牌」）。</li>
<li><b>摸牌</b>：摸 2 張（部分角色技能會改變）。</li>
<li><b>出牌</b>：任意出牌；【光之衝擊】每回合只能出 1 張（除非有【連擊手環】或技能）。</li>
<li><b>棄牌</b>：回合結束時手牌不能多於目前體力，多的要棄掉。</li></ol>
<p>開局手牌張數＝體力上限。別人攻擊你時，你可以在自己的回合外打出【光之屏障】抵銷。</p>`],
['距離與範圍',`<p>大家圍成一圈。<b>距離</b>＝往左或往右數到對方的最少座位數（倒下的人不算）。</p>
<p><b>範圍</b>：沒有武器時為 1；裝上武器後等於武器的範圍。【光之衝擊】只能打<b>距離 ≤ 你的範圍</b>的人。</p>
<p>【守護妖精】：別人看你距離 +1（更難被打）。【飛行妖精】：你看別人距離 −1（更容易打到）。距離最少為 1。</p>
<p>【妖精偷取】只能對距離 1 的人使用；【淨化之光】不限距離。每個座位卡上都會顯示「範圍」與「距離」（距離是對方離你多遠）。</p>`],
['卡牌',`<table><tr><th>卡名</th><th>張數</th><th>類型</th><th>效果</th></tr>${nonEq.map(row).join('')}</table>
<p>判定：翻開牌堆頂一張看花色。【黑暗牢籠】翻到 ♥ 就逃脫，否則跳過該回合。【暗黑炸彈】翻到 ♠2–9 爆炸受 3 傷，否則傳給下家。</p>
<p>【元氣甜點】在只剩 2 人時不能用來回復。</p>`],
['裝備',`<p>裝備放在自己座位旁，持續生效。每個欄位（武器、護具、防禦座騎、進攻座騎）同時只能有一張，新的會換掉舊的。</p>
<table><tr><th>卡名</th><th>張數</th><th>欄位</th><th>效果</th></tr>${eq.map(row).join('')}</table>`],
['體力與倒下',`<p>每顆寶石＝1 點體力。受到傷害就失去寶石；體力不能超過上限。</p>
<p>體力降到 0 時，若手上有【元氣甜點】可以立刻吃掉回復（只剩 2 人時不行），否則<b>倒下</b>並公開身分，所有牌棄掉。</p>
<p><b>獎懲</b>：擊倒黑暗勢力的人摸 3 張；光之隊長誤擊倒光之夥伴，要棄掉所有手牌與裝備。</p>`],
['角色技能',`<p>每位角色有自己的體力與技能，開局時可在設定畫面挑選。對局中技能也寫在每個座位卡上。</p>
<table><tr><th>角色</th><th>體力</th><th>技能</th></tr>${P.CHARS.map(c=>`<tr><td><b>${c.name}</b></td><td>${c.hp}</td><td>${c.desc}</td></tr>`).join('')}</table>`],
['操作方式',`<ul><li><b>出牌</b>：在自己回合點下方手牌。暗色的牌目前不能出。</li>
<li><b>選目標</b>：需要目標的牌點下後，可選的座位會亮紅框，點座位即出牌。</li>
<li><b>結束回合</b>：按「結束出牌」。手牌過多時會請你選要棄的牌。</li>
<li><b>回應</b>：被攻擊時會跳出對話框，可出【光之屏障】／【光之衝擊】或選「不出（承受）」。</li>
<li><b>戰報</b>：右下角「戰報」按鈕可打開或收起戰鬥紀錄。</li>
<li><b>說明</b>：設定畫面與對局上方的「遊戲說明」可隨時打開本頁。</li></ul>`],
['新手提示',`<ul><li>先數距離：打不到的人，先裝武器或【飛行妖精】。</li>
<li>手上至少留 1 張【光之屏障】防身。</li>
<li>體力低時留【元氣甜點】救命。</li>
<li>看誰打誰：攻擊隊長的多半是黑暗勢力。</li>
<li>當光之隊長時別亂打：誤傷夥伴會失去所有牌。</li>
<li>背叛者要忍耐：先幫隊長清掉黑暗勢力，最後再單挑隊長。</li></ul>`],
['本局規則',null]];
const css=`#guide{position:fixed;inset:0;z-index:90;background:rgba(10,4,30,.72);display:flex;align-items:center;justify-content:center}
#guide[hidden]{display:none}#guide .gbox{position:relative;width:min(960px,94vw);height:min(720px,90vh);display:flex;flex-direction:column;background:#2a1858;border:2px solid #e8b8ff;border-radius:16px;box-shadow:0 0 24px rgba(255,150,220,.5);color:#fdf4ff;overflow:hidden}
#guide h2{margin:0;padding:12px 20px 6px;font-size:clamp(18px,2.2vw,26px);color:#ffe29a;text-align:center}
#guide .gtabs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:6px 14px 10px;border-bottom:1px solid rgba(255,226,154,.3)}
#guide .gtabs button{font-size:clamp(13px,1.3vw,16px);padding:5px 12px;border-radius:99px;border:1px solid #c9a0ff;background:#3d2878;color:#fdf4ff;cursor:pointer}
#guide .gtabs button.on{background:#ff8fc8;color:#2a1050;border-color:#ffd6ec;font-weight:bold}
#guide .gbody{flex:1;min-height:0;overflow:auto;padding:14px 26px 18px;font-size:clamp(14px,1.35vw,17px);line-height:1.7}
#guide table{border-collapse:collapse;width:100%;margin:6px 0 10px}#guide td,#guide th{border:1px solid rgba(255,226,154,.25);padding:4px 8px;text-align:left;vertical-align:top}#guide th{color:#ffe29a;background:rgba(255,255,255,.06)}
#guide .gfoot{display:flex;justify-content:center;padding:10px;border-top:1px solid rgba(255,226,154,.3)}
#guide .gfoot button{font-size:16px;padding:6px 28px;border-radius:99px;border:1px solid #ffd6ec;background:#ff8fc8;color:#2a1050;cursor:pointer;font-weight:bold}
#guidebtn{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:47;font-size:15px;padding:5px 16px;border-radius:99px;border:1px solid #ffd6ec;background:#ff8fc8;color:#2a1050;font-weight:bold;cursor:pointer}
#guidebtn[hidden]{display:none}#guide button::before,#guide button::after{content:none!important;display:none!important}#guide .gtabs,#guide h2,#guide .gfoot{flex:none}#guide .gtabs button{background:#3d2878!important;color:#fdf4ff!important;-webkit-text-fill-color:#fdf4ff!important;text-shadow:none!important;border:1px solid #c9a0ff!important}#guide .gtabs button.on{background:#ff8fc8!important;color:#2a1050!important;-webkit-text-fill-color:#2a1050!important}#guide .gfoot button,#guidebtn{background:#ff8fc8!important;color:#2a1050!important;-webkit-text-fill-color:#2a1050!important;text-shadow:none!important;border:1px solid #ffd6ec!important}`;
function build(){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
 const g=document.createElement('div');g.id='guide';g.hidden=true;
 g.innerHTML=`<div class="gbox" role="dialog" aria-label="遊戲說明"><h2>遊戲說明</h2><div class="gtabs">${T.map((t,i)=>`<button data-i="${i}">${t[0]}</button>`).join('')}</div><div class="gbody"></div><div class="gfoot"><button id="gclose">開始遊玩</button></div></div>`;
 document.body.appendChild(g);
 g.querySelectorAll('.gtabs button').forEach(b=>b.onclick=()=>show(+b.dataset.i));
 $('#gclose').onclick=()=>{g.hidden=true;try{localStorage.setItem('palbang_guide_seen','1')}catch(e){}};
 g.onclick=e=>{if(e.target===g)$('#gclose').click()};
 const b=document.createElement('button');b.id='guidebtn';b.textContent='遊戲說明';b.onclick=()=>open();document.body.appendChild(b);
 const r=$('#ropen');if(r){r.textContent='遊戲說明';r.onclick=()=>open();}
 document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.rbtn')){e.stopPropagation();e.preventDefault();open(T.length-1);}},true);
 const sync=()=>{b.hidden=!$('#setup')||!$('#setup').hidden||!$('#game')||$('#game').hidden;};
 const mo=new MutationObserver(sync),_s=$('#setup'),_g=$('#game');
 if(_s)mo.observe(_s,{attributes:true,attributeFilter:['hidden']}); if(_g)mo.observe(_g,{attributes:true,attributeFilter:['hidden']});
 sync();
}
function show(i){const g=$('#guide');g.querySelectorAll('.gtabs button').forEach((b,j)=>b.classList.toggle('on',i===j));
 const n=+(($('#np')||{}).value||5);const h=T[i][1]!==null?T[i][1]:(typeof rulesHTML==='function'?rulesHTML(n):'')+'<p>（依目前選擇的人數顯示）</p>';
 const bd=g.querySelector('.gbody');bd.innerHTML=h;bd.scrollTop=0;}
function open(i){show(i||0);$('#guide').hidden=false;}
window.openGuide=open;
build(); let seen=null;try{seen=localStorage.getItem('palbang_guide_seen')}catch(e){}
if(!seen&&!/[?&]debug=1/.test(location.search)) open(0);
})();
