(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function n(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(o){if(o.ep)return;o.ep=!0;const i=n(o);fetch(o.href,i)}})();const y=[{tag:"Dreams",title:"My dream universities",date:"May 2025",preview:"The schools I'm considering",body:`
      <p>Rankings are a starting point, not the answer. Here's where I actually want to go and why.</p>
      <h3>Top picks</h3>
      <ul>
        <li><strong>University of Waterloo</strong> — ECE co-op is unmatched. The culture of building things is exactly what I want</li>
        <li><strong>University of Ottawa</strong> — I like Ottawa in general, love the peace and the buildings. Campus isn't bad at all</li>
        <li><strong>Toronto Metropolitan University</strong> — A little bit of a backup plan lol but still great overall not bad at all</li>
        <li><strong>McMaster University</strong> — Like the campus, I love the program and global recognition</li>
      </ul>
      <h3>What I'm actually looking for</h3>
      <ul>
        <li>Strong co-op or internship pipeline</li>
        <li>Research opportunities in embedded systems or energy</li>
        <li>A culture that rewards curiosity, not just grades</li>
        <li>People I'd want to spend four years around</li>
      </ul>
      <p class="note-muted">I'll update this as decisions come in. For now, the plan is clear.</p>
    `},{tag:"Ideas",title:"My country idea",date:"Apr 2025",preview:"If I could design a country from scratch",body:`
      <p>This started as a shower thought. It's gotten more serious.</p>
      <p>If I had a blank map and could design a country from scratch — not utopia, just a <em>better</em> system — here's what I'd prioritize.</p>
      <h3>Infrastructure first</h3>
      <ul>
        <li>Nationwide fiber. Internet is infrastructure, not a luxury.</li>
        <li>Public transit that actually works properly and reliably</li>
        <li>Renewable energy grid from day one. No legacy fossil debt.</li>
      </ul>
      <h3>Governance</h3>
      <ul>
        <li>Smaller government, but competent. Quality over size.</li>
        <li>Mandatory civic education. You can't participate in what you don't understand.</li>
        <li>Term limits everywhere. Power shouldn't be permanent.</li>
      </ul>
      <h3>Culture</h3>
      <ul>
        <li>Built on contribution, not just nationality.</li>
        <li>Engineers, teachers, and doctors valued the same as politicians.</li>
      </ul>
      <p class="note-muted">Still thinking about this one. It's less about the country, more about what I think a good system looks like.</p>
    `},{tag:"Engineering",title:"Why ECE?",date:"Mar 2025",preview:"People ask me all the time. Here's the honest answer — what pulled me into electrical and computer engineering.",body:`
      <p>Short answer: it's the field that sits at the intersection of everything I find interesting.</p>
      <p>Longer answer:</p>
      <p>I grew up taking things apart. Phones, remotes, anything with a circuit board. I wanted to understand how signals become actions, how electricity becomes information, and information becomes technology.</p>
      <h3>What pulled me in</h3>
      <ul>
        <li>Microcontrollers and embedded systems, tiny chip thingy yay fun</li>
        <li>Power systems and energy distribution</li>
        <li>The fact that ECE underlies almost every modern technology</li>
      </ul>
      <h3>What I want to build</h3>
      <ul>
        <li>Efficient energy systems; grids that actually make sense</li>
        <li>Embedded devices for real-world problems</li>
        <li>Eventually: something that didn't exist before I built it</li>
      </ul>
      <p class="note-muted">ECE isn't the easiest path. That's partly why I chose it.</p>
    `},{tag:"Life",title:"Growing up in the GTA",date:"Feb 2025",preview:"What it actually looks and feels like. The chaos, the culture, the people",body:`
      <p>The Greater Toronto Area is a specific kind of place. Heh.</p>
      <h3>What it's like</h3>
      <ul>
        <li>Every culture, every food, every language is within a few kilometres</li>
        <li>The kind of diversity that makes you realize how big earth really is</li>
        <li>Cold winters that make summer feel like a gift from God</li>
        <li>A city that's always growing, always changing, always a little chaotic</li>
      </ul>
      <h3>What it gave me</h3>
      <ul>
        <li>Perspective. I've met people with completely different backgrounds than mine, and I'm all for it.</li>
        <li>Ambition. Toronto has that quiet competitive energy — everyone's working toward something.</li>
        <li>Home. As much as I want to see the world, this place is kinda my dwelling place</li>
      </ul>
      <p class="note-muted">If you're from here, you know. If you're not — it's worth visiting.</p>
    `}],$=new Date("2009-12-28T00:00:00");function C(){const t=new Date-$,n=Math.floor(t/1e3)%60,s=Math.floor(t/(1e3*60))%60,o=Math.floor(t/(1e3*60*60))%24,i=Math.floor(t/(1e3*60*60*24))%30,a=Math.floor(t/(1e3*60*60*24*30))%12;return`${Math.floor(t/(1e3*60*60*24*365.25))} years, ${a} months, ${i} days, ${o} hours, ${s} minutes, ${n} seconds old`}const g=document.getElementById("terminal"),h=document.getElementById("neon-flash"),I=document.getElementById("cmd-bar"),E=document.getElementById("cmd-echo"),L=document.getElementById("cmd-text"),k=document.getElementById("tab-label"),B={boot:document.getElementById("screen-boot"),home:document.getElementById("screen-home"),notes:document.getElementById("screen-notes"),note:document.getElementById("screen-note"),about:document.getElementById("screen-about"),contact:document.getElementById("screen-contact")},P={home:"flash-cyan",notes:"flash-pink",note:"flash-pink",about:"flash-lime",contact:"flash-violet",boot:"flash-cyan"};let d="boot",f=0,c=[],l=0,p=0;function A(e){const t=document.createElement("div");t.innerHTML=e;const n=[...t.children],s=[];let o=document.createElement("div");const i=r=>{const u=r.textContent??"";return r.tagName==="H3"?2:r.tagName==="UL"?Math.ceil(r.querySelectorAll("li").length*1.4)+1:Math.ceil(u.length/42)+1};let a=0;const m=window.innerWidth<480?9:11;return n.forEach(r=>{const u=i(r);a+u>m&&o.childElementCount>0&&(s.push(o.innerHTML),o=document.createElement("div"),a=0),o.appendChild(r.cloneNode(!0)),a+=u}),o.childElementCount>0&&s.push(o.innerHTML),s.length?s:[e]}function w(e,t,n){const s=P[e]??"flash-cyan";g.classList.remove("flash-cyan","flash-pink","flash-lime","flash-violet"),g.offsetWidth,g.classList.add(s),h&&(h.style.setProperty("--fx",`${t}px`),h.style.setProperty("--fy",`${n}px`),h.classList.remove("active"),h.offsetWidth,h.classList.add("active")),setTimeout(()=>g.classList.remove(s),450)}function N(e){document.querySelectorAll(".cmd-btn").forEach(n=>{n.classList.toggle("active",n.getAttribute("data-go")===e&&e!=="note"),n.classList.remove("pulse-hit")});const t=document.querySelector(`.cmd-btn[data-go="${e}"]`);t&&(t.classList.add("pulse-hit"),setTimeout(()=>t.classList.remove("pulse-hit"),500))}function H(e){!E||!L||(E.hidden=d==="boot",L.textContent=e)}function x(){f&&(clearInterval(f),f=0)}function S(){x();const e=document.getElementById("age");if(!e)return;const t=()=>{e.textContent=C()};t(),f=setInterval(t,1e3)}function b(){const e=document.getElementById("note-body"),t=document.getElementById("note-pager"),n=document.getElementById("note-prev"),s=document.getElementById("note-next"),o=document.getElementById("note-page-num");if(!e||c.length===0)return;e.innerHTML=c[l];const i=c.length>1;t&&(t.hidden=!i),o&&(o.textContent=`${l+1} / ${c.length}`),n&&(n.disabled=l===0),s&&(s.disabled=l>=c.length-1)}function W(e,t){const n=y[e];n&&(p=e,c=A(n.body),l=0,document.getElementById("note-head").textContent=`[${n.tag}] ${n.title}`,document.getElementById("note-meta").textContent=n.date,b(),v("note",`read ${e}`,t))}function v(e,t=e,n){var m,r;if(e===d&&e!=="note")return;const s=(n==null?void 0:n.clientX)??window.innerWidth/2,o=(n==null?void 0:n.clientY)??window.innerHeight/2;w(e,s,o),H(t),(m=B[d])==null||m.classList.remove("screen-active"),(r=B[e])==null||r.classList.add("screen-active"),d=e;const i=e!=="boot";if(I&&(I.hidden=!i),k){const u={boot:"tayshuwn@portfolio",home:"~/home",notes:"~/notes",note:`~/notes/${p}`,about:"~/about",contact:"~/connect"};k.textContent=u[e]??"tayshuwn@portfolio"}e==="about"?S():x(),i&&N(e==="note"?"notes":e)}function q(){const e=document.getElementById("note-list");e&&(e.innerHTML=y.map((t,n)=>`
    <button class="cmd-link note-item" type="button" data-note="${n}">
      <span class="tag">${t.tag} · ${t.date}</span>
      <span class="title">${t.title}</span>
      <span class="preview">${t.preview}</span>
    </button>
  `).join(""),e.querySelectorAll("[data-note]").forEach(t=>{t.addEventListener("click",n=>W(Number(t.getAttribute("data-note")),n))}))}document.querySelectorAll("[data-go]").forEach(e=>{e.addEventListener("click",t=>{const n=e.getAttribute("data-go"),s=e.getAttribute("data-cmd")??n;n&&v(n,s,t)})});var T;(T=document.getElementById("note-prev"))==null||T.addEventListener("click",e=>{l>0&&(l--,b(),w("note",e.clientX,e.clientY))});var M;(M=document.getElementById("note-next"))==null||M.addEventListener("click",e=>{l<c.length-1&&(l++,b(),w("note",e.clientX,e.clientY))});window.addEventListener("resize",()=>{d==="note"&&y[p]&&(c=A(y[p].body),l=Math.min(l,c.length-1),b())});q();setTimeout(()=>{var e;d==="boot"&&((e=document.querySelector(".enter-btn"))==null||e.classList.add("pulse-hit"))},800);setTimeout(()=>{d==="boot"&&v("home","enter")},3200);
