(()=>{
  'use strict';
  const $=id=>document.getElementById(id),E=window.OneSecond;
  const clock=()=>performance.timeOrigin+performance.now();
  const config=window.GAME_CONFIG||{},server=(config.serverUrl||'').replace(/\/$/,'');
  const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
  const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
  const settings=load('one-second-settings',{step:20,sound:false});if(!E.STEPS.includes(settings.step))settings.step=20;
  let token='';try{token=sessionStorage.getItem('one-second-token')||'';}catch{}
  let user=null,screen='menu',mode='local',difficulty='normal',localGame=null,state=null,you=0,names=['Player 1','Player 2'],matchId='',saved=false;
  let ws=null,connectPromise=null,offset=0,bestRTT=Infinity,rtt=0,attempt=0,networkGame=false,acceptNetwork=false,botAt=0,botStart=null,botMoveAt=0;
  let lastBoard='',lastStatus='',lastMisses=[0,0],lastPhase='',recorded=false,toastTimeout,dialogAction=null,pendingAfterLogin=null,pendingStop=[false,false];
  const cells=Array.from({length:9},(_,i)=>{const b=document.createElement('button');b.className='cell';b.setAttribute('aria-label',`Row ${Math.floor(i/3)+1}, column ${i%3+1}`);b.addEventListener('click',()=>place(i));$('board').append(b);return b;});
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function storeToken(value){token=value;try{if(value)sessionStorage.setItem('one-second-token',value);else sessionStorage.removeItem('one-second-token');}catch{}}
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').hidden=true,4000);}
  function view(name){screen=name;for(const id of ['menu','game','waiting'])$(id).hidden=id!==name;$('account').hidden=name==='game';}
  function accountLabel(){$('account').textContent=user?`${user.username} · #${user.id}`:'Sign in ↗';}
  async function api(path,data){
    const response=await fetch(server+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(45000)});
    const body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.error||'Server unavailable');return body;
  }
  function modal(title,html){$('modal-label').textContent=title;$('modal-body').innerHTML=html;dialogAction=null;if(!$('dialog').open)$('dialog').showModal();}
  function closeModal(){$('dialog').close();dialogAction=null;}
  $('close-dialog').onclick=()=>{pendingAfterLogin=null;closeModal();};
  $('dialog').addEventListener('cancel',()=>{pendingAfterLogin=null;});
  $('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){pendingAfterLogin=null;closeModal();}}});
  function confirm(title,text,action){modal('ONE SECOND',`<h2>${title}</h2><p>${text}</p><div class="row"><button class="quiet" id="confirm-no">Cancel</button><button class="primary" id="confirm-yes">Confirm</button></div>`);$('confirm-no').onclick=closeModal;$('confirm-yes').onclick=()=>{closeModal();action();};}
  let audio;
  function sound(type){if(!settings.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(type==='hit'?620:type==='mark'?440:160,audio.currentTime);o.frequency.exponentialRampToValueAtTime(type==='hit'?930:220,audio.currentTime+.08);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.13);}catch{}}
  function resetUI(){lastBoard='';lastStatus='';lastPhase='';lastMisses=[0,0];recorded=false;pendingStop=[false,false];botStart=null;botMoveAt=0;$('again').hidden=true;for(const b of cells){b.replaceChildren();delete b.dataset.value;b.classList.remove('winning');}}
  function beginLocal(which){attempt++;mode=which;networkGame=false;acceptNetwork=false;you=0;names=which==='local'?['Player 1','Player 2']:[user?.username||'You','Bot'];localGame=new E.Match({now:clock(),step:settings.step});state=localGame.snapshot();saved=true;matchId='';resetUI();view('game');renderStatic();}
  function send(data){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));}
  function disconnect(){if(ws){const old=ws;ws=null;old.close(1000,'Done');}connectPromise=null;}
  function connect(){
    if(ws?.readyState===WebSocket.OPEN&&ws._ready)return Promise.resolve();if(connectPromise)return connectPromise;
    connectPromise=new Promise((resolve,reject)=>{
      const socket=new WebSocket(server.replace(/^http/,'ws')+'/ws');ws=socket;let settled=false;bestRTT=Infinity;offset=0;
      const timeout=setTimeout(()=>{if(!settled){settled=true;reject(Error('The server is still waking up. Try again shortly.'));socket.close();}},45000);
      socket.onopen=()=>socket.send(JSON.stringify({type:'hello',token:token||undefined}));
      socket.onmessage=event=>{
        let m;try{m=JSON.parse(event.data);}catch{return;}
        if(m.type==='ready'){
          socket._ready=true;offset=m.serverTime-clock();
          for(let i=0;i<5;i++)setTimeout(()=>{if(socket.readyState===1)socket.send(JSON.stringify({type:'sync',at:clock()}));},i*70);
          setTimeout(()=>{if(!settled&&socket.readyState===1){settled=true;clearTimeout(timeout);resolve();}},400);return;
        }
        if(m.type==='sync'){const sample=clock()-m.at;if(sample<bestRTT){bestRTT=sample;rtt=sample;offset=m.serverTime-(m.at+clock())/2;}return;}
        if(m.type==='ping'){socket.send(JSON.stringify({type:'pong',nonce:m.nonce}));socket.send(JSON.stringify({type:'sync',at:clock()}));return;}
        if(m.type==='queued'){$('waiting-title').textContent='Finding a rival…';$('waiting-sub').textContent="You're in the queue.";return;}
        if(m.type==='state'){
          if(!acceptNetwork)return;
          const fresh=m.matchId!==matchId;if(fresh){mode=m.mode;networkGame=true;localGame=null;you=m.you;names=m.names;matchId=m.matchId;saved=false;resetUI();view('game');}
          state=m.state;pendingStop=[false,false];renderStatic();return;
        }
        if(m.type==='saved'){if(m.matchId===matchId){saved=true;renderStatic();}return;}
        if(m.type==='error'){toast(m.message);if(screen==='waiting'){attempt++;view('menu');}return;}
        if(m.type==='notice'){toast(m.message);return;}
        if(m.type==='shutdown'){toast('Server restarting. This match is unranked.');networkEnded('Server restarting');}
      };
      socket.onerror=()=>{};
      socket.onclose=event=>{
        clearTimeout(timeout);if(!settled){settled=true;reject(Error(event.code===4002?'Account already open in another tab':event.code===4001?'Please sign in again':'Could not connect to the server'));}
        if(ws!==socket)return;ws=null;connectPromise=null;
        if(event.code===4001){storeToken('');user=null;accountLabel();}
        if(screen==='game'&&networkGame&&state?.phase!=='ended')networkEnded('Disconnected');
        if(screen==='waiting'){attempt++;view('menu');toast(event.code===4002?'Account already open in another tab':'Disconnected. Please try again.');}
      };
    }).finally(()=>{connectPromise=null;});return connectPromise;
  }
  function networkEnded(text){state={...state,phase:'interrupted',result:null};saved=true;renderStatic();setStatus(text);}
  async function startNetwork(which){
    if(which==='online'&&!user){pendingAfterLogin=()=>startNetwork('online');return authForm(false);}
    const id=++attempt;mode=which;acceptNetwork=true;view('waiting');$('waiting-title').textContent='Connecting…';$('waiting-sub').textContent='A sleeping server may take a moment.';$('offline').hidden=which!=='bot';
    try{await connect();if(id!==attempt)return;send(which==='online'?{type:'queue'}:{type:'bot',difficulty,step:settings.step});}
    catch(e){if(id!==attempt)return;$('waiting-title').textContent='Couldn’t connect';$('waiting-sub').textContent=e.message;if(which==='online')toast('Check that the new server is deployed.');}
  }
  function leave(){
    const go=()=>{attempt++;acceptNetwork=false;if(networkGame)send({type:'leave'});send({type:'cancel'});localGame=null;state=null;matchId='';networkGame=false;view('menu');};
    if(screen==='game'&&state&&!['ended','interrupted'].includes(state.phase))confirm('Leave the game?',networkGame?'Leaving counts as a loss.':'Your current game will end.',go);else go();
  }
  $('home').onclick=()=>{if(screen==='menu')return;if(screen==='waiting')$('cancel-queue').click();else leave();};$('leave').onclick=leave;
  $('cancel-queue').onclick=()=>{attempt++;acceptNetwork=false;send({type:'cancel'});send({type:'leave'});if(ws&&!ws._ready)disconnect();view('menu');};
  $('offline').onclick=()=>{attempt++;send({type:'cancel'});disconnect();beginLocal('bot');toast('Offline · results stay on this device');};
  $('local').onclick=()=>beginLocal('local');$('online').onclick=()=>startNetwork('online');
  $('bot-menu').onclick=()=>{modal('SOLO','<h2>Choose your pace.</h2><button class="choice" data-difficulty="easy">Easy <small>finding the rhythm</small></button><button class="choice" data-difficulty="normal">Normal <small>a fair fight</small></button><button class="choice" data-difficulty="hard">Hard <small>every tap counts</small></button>');for(const b of document.querySelectorAll('[data-difficulty]'))b.onclick=()=>{difficulty=b.dataset.difficulty;closeModal();startNetwork('bot');};};
  $('again').onclick=()=>{if(networkGame)startNetwork(mode);else beginLocal(mode);};
  function stop(player){
    if(screen!=='game'||!state||!['race','deciding'].includes(state.phase)||pendingStop[player])return;
    if(mode!=='local'&&player!==you)return;
    if(networkGame){pendingStop[player]=true;send({type:'stop',round:state.round,matchId});}
    else{localGame.advance(clock());localGame.stop(player,clock());state=localGame.snapshot();renderStatic();}
  }
  for(let i=0;i<2;i++)$('stop-'+i).addEventListener('pointerdown',e=>{e.preventDefault();sound('tap');stop(i);});
  window.addEventListener('keydown',e=>{if(e.repeat||$('dialog').open||screen!=='game')return;const key=e.key.toLowerCase();if(['a','l',' '].includes(key)){e.preventDefault();if(mode==='local'){if(key==='a')stop(0);if(key==='l')stop(1);}else if(key===' '||key==='a'||key==='l')stop(you);}});
  function place(cell){if(!state||state.phase!=='place')return;const p=mode==='local'?state.owner:you;if(networkGame)send({type:'place',cell,matchId});else if(localGame.place(p,cell,clock())){sound('mark');state=localGame.snapshot();renderStatic();}}
  function setStatus(text){if(lastStatus===text)return;lastStatus=text;$('status').textContent=text;$('status').classList.remove('bump');void $('status').offsetWidth;$('status').classList.add('bump');}
  function renderStatic(){
    if(!state||screen!=='game')return;
    $('name-0').textContent=names[0];$('name-1').textContent=names[1];$('mode-label').textContent=mode==='local'?'LOCAL':mode==='online'?'ONLINE':`${difficulty.toUpperCase()} BOT${networkGame?'':' · OFFLINE'}`;
    $('key-0').textContent=mode==='local'?'A':you===0?'SPACE':'';$('key-1').textContent=mode==='local'?'L':you===1?'SPACE':'';
    $('step-label').textContent=(state.step/1000).toFixed(state.step===25?3:2)+'s';$('round-label').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;
    const boardKey=JSON.stringify(state.board);if(boardKey!==lastBoard){lastBoard=boardKey;state.board.forEach((v,i)=>{if(cells[i].dataset.value===String(v))return;cells[i].dataset.value=String(v);cells[i].replaceChildren();if(v!==null){const span=document.createElement('span');span.textContent=v===0?'×':'○';span.className=v===0?'x':'o';cells[i].append(span);sound('mark');}});}
    cells.forEach((b,i)=>{b.disabled=!(state.phase==='place'&&state.board[i]===null&&(mode==='local'||state.owner===you));b.classList.toggle('winning',!!state.result?.line?.includes(i));b.setAttribute('aria-label',`Row ${Math.floor(i/3)+1}, column ${i%3+1}${state.board[i]===null?'':state.board[i]===0?', X':', O'}`);});
    for(let i=0;i<2;i++){
      const p=$('player-'+i);const hit=state.candidates.some(c=>c.player===i);
      p.classList.toggle('active',state.phase==='place'&&state.owner===i);p.classList.toggle('hit',hit&&['deciding','place','tie'].includes(state.phase));
      p.classList.toggle('dim',state.phase==='place'&&state.owner!==i);
      $('stop-'+i).disabled=!['race','deciding'].includes(state.phase)||hit||(mode!=='local'&&i!==you);
      if(state.misses[i]!==lastMisses[i]){p.classList.remove('miss');void p.offsetWidth;p.classList.add('miss');lastMisses[i]=state.misses[i];}
    }
    if(state.phase!==lastPhase){if(state.phase==='place')sound('hit');lastPhase=state.phase;}
    $('status').classList.toggle('counting',state.phase==='countdown');
    if(state.phase==='race')setStatus('');
    if(state.phase==='deciding')setStatus('');
    if(state.phase==='tie')setStatus('Draw');
    if(state.phase==='place')setStatus(`${state.owner===0?'X':'O'} to play`);
    if(state.phase==='ended'){
      setStatus(state.result.winner===-1?'Draw':`${mode==='local'?(state.result.winner===0?'X':'O'):names[state.result.winner]} wins`);
      if((!networkGame||(mode==='bot'&&!user))&&!recorded){recorded=true;const all=load('one-second-device-stats',{}),key=mode==='local'?'local':'bot';all[key]??={wins:0,losses:0,draws:0};all[key][state.result.winner===-1?'draws':state.result.winner===0?'wins':'losses']++;save('one-second-device-stats',all);}
    }
    $('again').hidden=!['ended','interrupted'].includes(state.phase);$('again').disabled=networkGame&&!saved;
  }
  function frame(){
    if(screen==='game'&&state){
      const t=clock()+(networkGame?offset:0);
      if(localGame){
        const g=localGame,before=g.revision;g.advance(t);
        if(mode==='bot'){
          if(['race','deciding'].includes(g.phase)){
            if(botStart!==g.starts[1]){botStart=g.starts[1];botAt=botStart+E.botDelay(difficulty,g.step);}
            if(t>=botAt){g.stop(1,botAt,t);botStart=null;}
          }
          if(g.phase==='place'&&g.owner===1){if(!botMoveAt)botMoveAt=t+350+Math.random()*350;if(t>=botMoveAt){g.place(1,E.chooseCell(g.board,1,difficulty),t);botMoveAt=0;}}
        }
        if(g.revision!==before){state=g.snapshot();renderStatic();}
      }
      for(let i=0;i<2;i++){
        let ms=0;if(['race','deciding'].includes(state.phase))ms=state.candidates.some(c=>c.player===i)?1000:E.value(t-state.starts[i],state.step);else if(['place','tie','ended','interrupted'].includes(state.phase))ms=state.frozen[i];
        const val=(Math.min(ms,999990)/1000).toFixed(state.step===25?3:2);if($('timer-'+i).textContent!==val)$('timer-'+i).textContent=val;
        $('meter-'+i).style.transform=`scaleX(${Math.min(1,ms/1000)})`;
      }
      if(state.phase==='countdown'){const left=state.until-t;setStatus(state.round===1?String(Math.max(1,Math.ceil(left/1000))):'Ready');}
      $('connection').textContent=networkGame?`${Math.round(rtt)} ms`:'';
      if(state.phase==='place'&&state.online){const left=Math.max(0,Math.ceil((state.until-t)/1000));$('round-label').textContent=`${left}s`;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  $('settings').onclick=()=>{
    modal('SETTINGS',`<h2>Find your rhythm.</h2><label for="step-setting">Timer increment</label><select id="step-setting">${E.STEPS.map(v=>`<option value="${v}" ${v===settings.step?'selected':''}>${v/1000}s</option>`).join('')}</select><p>Local & solo. Online uses 0.02s.</p><div class="row"><label for="sound-setting">Sound</label><input id="sound-setting" type="checkbox" style="width:20px" ${settings.sound?'checked':''}></div>`);
    $('step-setting').onchange=e=>{settings.step=Number(e.target.value);save('one-second-settings',settings);};$('sound-setting').onchange=e=>{settings.sound=e.target.checked;save('one-second-settings',settings);sound('hit');};
  };
  $('how').onclick=()=>modal('HOW TO PLAY','<h2>Make your second count.</h2><ol class="rules"><li>Stop your timer at exactly <b>1.00s</b>. Miss? Go again.</li><li>Hit first to place your mark. A timing draw gives neither player a move.</li><li>Three in a row wins. You can earn consecutive moves.</li></ol><p>Local: X presses A, O presses L. On touchscreens, use the two green buttons. Solo & online: tap your button or press Space.</p>');
  function authForm(create=false){
    modal('ACCOUNT',`<h2>${create?'Make it yours.':'Welcome back.'}</h2><form id="auth-form"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required pattern="[A-Za-z0-9]{3,8}" minlength="3" maxlength="8" placeholder="3–8 letters or numbers"><label for="password">Password</label><input id="password" name="password" autocomplete="${create?'new-password':'current-password'}" type="password" required minlength="8" maxlength="128" pattern="[!-~]{8,128}" placeholder="8+ characters"><div class="form-error" id="auth-error"></div><button class="primary" type="submit">${create?'Create account':'Sign in'} <span>↗</span></button></form><button class="switch" id="auth-switch">${create?'Already have an account? Sign in':'New here? Create account'}</button>${create?'<p class="muted">No email. Keep your password safe; there is no password recovery. Usernames, IDs and multiplayer stats are public. Account and online/bot match events are logged to the game owner’s Discord.</p>':''}`);
    $('auth-switch').onclick=()=>authForm(!create);
    $('auth-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;$('auth-error').textContent='Connecting…';const name=$('username').value,pass=$('password').value;
      try{const data=await api(create?'/api/register':'/api/login',{username:name,password:pass});disconnect();storeToken(data.token);user=data.user;accountLabel();closeModal();const next=pendingAfterLogin;pendingAfterLogin=null;if(next)next();}
      catch(err){if($('auth-error'))$('auth-error').textContent=err.message;}finally{button.disabled=false;}
    };
  }
  $('account').onclick=()=>user?accountPanel():authForm(false);
  function accountPanel(){modal('ACCOUNT',`<h2>${escape(user.username)}</h2><p>Player #${user.id}</p><button class="choice" id="sign-out">Sign out <span>↗</span></button><button class="danger" id="delete-account">Delete account</button>`);$('sign-out').onclick=async()=>{try{await api('/api/logout',{});}catch{}disconnect();storeToken('');user=null;accountLabel();closeModal();};$('delete-account').onclick=()=>sensitive('delete');}
  function sensitive(action){
    const removing=action==='delete';modal('ACCOUNT',`<h2>${removing?'Delete account?':'Reset your stats?'}</h2><p>${removing?'Your account and stats will be permanently deleted.':'Your bot and multiplayer stats will be cleared, and your leaderboard entries removed. Your ID stays the same.'}</p><form id="sensitive-form"><label for="confirm-password">Confirm password</label><input id="confirm-password" type="password" autocomplete="current-password" required maxlength="128"><div class="form-error" id="sensitive-error"></div><button class="primary" type="submit">${removing?'Delete account':'Reset stats'}</button></form>`);
    $('sensitive-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('/api/'+action,{password:$('confirm-password').value});if(removing){disconnect();storeToken('');user=null;accountLabel();}closeModal();toast(removing?'Account deleted':'Stats reset');}catch(err){if($('sensitive-error'))$('sensitive-error').textContent=err.message;}finally{b.disabled=false;}};
  }
  async function statsPanel(tab='online'){
    modal('STATS','<h2>Your numbers.</h2><p>Loading…</p>');
    let stats;
    try{stats=user?(await api('/api/me')).stats:load('one-second-device-stats',{});if(!$('dialog').open||$('modal-label').textContent!=='STATS')return;
      if(!user)tab='bot';const draw=selected=>{const s=stats[selected]||{wins:0,losses:0,draws:0};const games=s.wins+s.losses+s.draws,rate=games?100*s.wins/games:0;
        modal('STATS',`<h2>${user?escape(user.username):'This device.'}</h2>${user?`<p class="muted">Player #${user.id}</p><div class="segmented"><button id="stats-online" class="${selected==='online'?'selected':''}">Multiplayer</button><button id="stats-bot" class="${selected==='bot'?'selected':''}">Bot</button></div>`:'<p>Guest & offline bot games</p>'}<div class="stat-grid"><div><b>${s.wins}</b><small>WINS</small></div><div><b>${s.losses}</b><small>LOSSES</small></div><div><b>${rate.toFixed(1)}%</b><small>WIN RATE</small></div></div><p class="muted">${s.draws} draws · ${games} games</p><button class="danger" id="reset-stats">Reset stats</button>${!user?'<p class="muted">Sign in to save connected matches and join the leaderboard.</p>':''}`);
        if(user){$('stats-online').onclick=()=>draw('online');$('stats-bot').onclick=()=>draw('bot');}
        $('reset-stats').onclick=()=>user?sensitive('reset'):confirm('Reset stats?','This clears the results saved on this device.',()=>{save('one-second-device-stats',{});toast('Stats reset');});
      };draw(tab);
    }catch(e){modal('STATS',`<h2>Couldn’t load stats.</h2><p>${escape(e.message)}</p>`);}
  }
  $('stats').onclick=()=>statsPanel();
  let leaderboardRequest=0;
  async function leaderboard(sort='wins'){
    const id=++leaderboardRequest;modal('LEADERBOARD',`<h2>The sharpest seconds.</h2><div class="segmented"><button id="rank-wins" class="${sort==='wins'?'selected':''}">Wins</button><button id="rank-rate" class="${sort==='rate'?'selected':''}">Win %</button></div><div class="leader-row leader-head"><span>#</span><span>PLAYER</span><span>WINS</span><span>WIN %</span></div><div class="leader-list" id="leader-list"><p>Loading…</p></div><p class="muted">Multiplayer · draws count toward games played</p>`);
    $('rank-wins').onclick=()=>leaderboard('wins');$('rank-rate').onclick=()=>leaderboard('rate');
    try{const{rows}=await api('/api/leaderboard?sort='+sort);if(id!==leaderboardRequest||!$('leader-list'))return;$('leader-list').innerHTML=rows.length?rows.map((r,i)=>`<div class="leader-row"><span>${i+1}</span><span>${escape(r.username)}<small>ID ${r.id} · ${r.wins+r.losses+r.draws} games</small></span><span>${r.wins}</span><span>${Number(r.winRate).toFixed(1)}%</span></div>`).join(''):'<p>No matches yet. Set the pace.</p>';}
    catch(e){if(id===leaderboardRequest&&$('leader-list'))$('leader-list').textContent=e.message;}
  }
  $('leaderboard').onclick=()=>leaderboard();
  window.addEventListener('online',()=>{if(screen==='menu')toast('Back online');});
  if(token)api('/api/me').then(data=>{user=data.user;accountLabel();}).catch(()=>{toast('Sign in to reconnect your account');});
  accountLabel();
})();
