/* Direct WebRTC data channels; the same lobby server relays when direct ICE fails. */
window.LobbyConnection=class{
 constructor(options){Object.assign(this,options);this.ws=null;this.pc=null;this.channel=null;this.room=null;this.host=false;this.ready=false;this.offset=0;this.rtt=0;this.samples=[];this.pendingICE=[];this.signalChain=Promise.resolve();this.linkTimer=null;this.intendedClose=false;}
 clock(){return performance.timeOrigin+performance.now();}
 emit(m){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(m));}
 async connect(){
  if(this.ws?.readyState===WebSocket.OPEN)return;
  await new Promise((resolve,reject)=>{
   const ws=new WebSocket(this.serverUrl.replace(/^http/,'ws')+'/ws');this.ws=ws;let settled=false;
   const timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('Server is still waking up. Try again.'));ws.close();}},45000);
   ws.onopen=()=>this.emit({type:'hello',name:this.name});
   ws.onerror=()=>{};
   ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='ready'){clearTimeout(timer);settled=true;resolve();return;}
    if(m.type==='list'){this.onList?.(m.rooms);return;}
    if(m.type==='room'){
     this.room=m.room;this.host=m.host;
     if(this.room.guest&&!this.pc)this.preparePeer();
     this.onRoom?.(this.room,this.host);return;
    }
    if(m.type==='signal'&&m.roomId===this.room?.id){this.signalChain=this.signalChain.then(()=>this.signal(m.data)).catch(()=>{});return;}
    if(m.type==='relay'&&m.roomId===this.room?.id){this.receive(m.data);return;}
    if(m.type==='start'){this.onStart?.(m);return;}
    if(m.type==='finished'){this.onFinished?.(m);return;}
    if(m.type==='peer-left'){this.resetPeer();this.onPeerLeft?.();return;}
    if(m.type==='closed'||m.type==='left'){this.resetPeer();this.room=null;this.onClosed?.(m.message||'');return;}
    if(m.type==='shutdown'){this.intendedRestart=true;return;}
    if(m.type==='error')this.onError?.(m.message);
   };
   ws.onclose=e=>{
    clearTimeout(timer);if(!settled){settled=true;reject(Error('Could not connect to the lobby server'));}
    if(this.ws!==ws)return;this.ws=null;this.resetPeer();
    if(!this.intendedClose)this.onDisconnect?.(this.intendedRestart||e.code===1012);
   };
  });
 }
 preparePeer(){
  this.ready=false;this.samples=[];this.offset=0;this.rtt=0;
  // No camera/microphone tracks are ever requested.
  try{
   const pc=new RTCPeerConnection({iceServers:this.iceServers||[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]});this.pc=pc;
   pc.onicecandidate=e=>{if(e.candidate)this.emit({type:'signal',roomId:this.room?.id,data:{candidate:e.candidate.toJSON()}});};
   pc.ondatachannel=e=>this.attachChannel(e.channel);
   if(this.host){this.attachChannel(pc.createDataChannel('one-second',{ordered:true}));this.signalChain=this.signalChain.then(async()=>{if(this.pc!==pc)return;await pc.setLocalDescription(await pc.createOffer());this.emit({type:'signal',roomId:this.room?.id,data:{description:pc.localDescription.toJSON()}});}).catch(()=>{});}
  }catch{this.pc={close(){}};}
  this.linkTimer=setInterval(()=>this.ping(),1000);this.ping();
 }
 attachChannel(channel){this.channel=channel;channel.onmessage=e=>{try{this.receive(JSON.parse(e.data));}catch{}};channel.onopen=()=>this.ping();channel.onerror=()=>{};channel.onclose=()=>{if(this.channel===channel)this.channel=null;};}
 async signal(data){
  const pc=this.pc;if(!pc||typeof pc.setRemoteDescription!=='function')return;
  if(data.description){if(!['offer','answer'].includes(data.description.type))return;await pc.setRemoteDescription(data.description);for(const candidate of this.pendingICE.splice(0))await pc.addIceCandidate(candidate);if(data.description.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());this.emit({type:'signal',roomId:this.room.id,data:{description:pc.localDescription.toJSON()}});}}
  if(data.candidate){if(pc.remoteDescription)await pc.addIceCandidate(data.candidate);else this.pendingICE.push(data.candidate);}
 }
 get transport(){return this.channel?.readyState==='open'?'Direct':'Relay';}
 send(data){if(!this.room?.guest)return;if(this.channel?.readyState==='open'){try{this.channel.send(JSON.stringify(data));return;}catch{}}this.emit({type:'relay',roomId:this.room.id,data});}
 ping(){this.send({_link:'ping',at:this.clock()});}
  receive(m){
  if(m?.type==='action'){this.onAction?.(m);return;}
  if(!m||typeof m!=='object')return;
  if(m._link==='ping'){if(typeof m.at==='number')this.send({_link:'pong',at:m.at,remote:this.clock()});return;}
  if(m._link==='pong'){
   if(!Number.isFinite(m.at)||!Number.isFinite(m.remote))return;const t=this.clock(),sample={rtt:t-m.at,offset:m.remote-(t+m.at)/2};
   if(sample.rtt<0||sample.rtt>10000)return;this.samples.push(sample);if(this.samples.length>12)this.samples.shift();const best=this.samples.reduce((a,b)=>a.rtt<b.rtt?a:b);this.rtt=best.rtt;this.offset=best.offset;
   if(!this.ready){this.ready=true;this.emit({type:'link-ready',ready:true});}return;
  }
  this.onData?.(m);
 }
 resetPeer(){clearInterval(this.linkTimer);this.linkTimer=null;this.channel?.close();this.channel=null;this.pc?.close();this.pc=null;this.pendingICE=[];this.ready=false;this.signalChain=Promise.resolve();}
 close(){this.intendedClose=true;this.emit({type:'leave'});this.resetPeer();const ws=this.ws;this.ws=null;ws?.close(1000,'Left');this.room=null;}
};
