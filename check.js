
/* ---------- util ---------- */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DAY=864e5,NOW=new Date();
const C={critica:'#ef4444',alta:'#f97316',media:'#eab308',baixa:'#60a5fa',pri:'#3b82f6',ok:'#22c55e',pur:'#a855f7',cy:'#06b6d4',gray:'#475569'};
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rng(20261030),ri=(a,b)=>Math.floor(R()*(b-a+1))+a,pick=a=>a[Math.floor(R()*a.length)];
const wpick=(items,w)=>{let t=R()*w.reduce((a,b)=>a+b,0);for(let i=0;i<items.length;i++){t-=w[i];if(t<=0)return items[i]}return items[0]};
const sod=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const fd=d=>d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const MES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const SEVS=['critica','alta','media','baixa'];
const sum=a=>a.reduce((x,y)=>x+y,0),avg=a=>a.length?sum(a)/a.length:0;
const fmtMin=m=>m>=60?Math.floor(m/60)+'h '+Math.round(m%60)+'min':Math.round(m)+'min';

/* ---------- dados mock (180 dias) ---------- */
const CLIENTS=['Alfa Logística','Beta Saúde','Gama Educação','Delta Varejo','Épsilon Energia','Zeta Finanças'];
const DEVICES=Array.from({length:28},(_,i)=>(['SRV-AD','SRV-FS','SRV-DB','SRV-APP','NB-FIN','NB-RH','SRV-WEB','SRV-BKP'][i%8])+'-'+String(i+1).padStart(2,'0'));
const ATYPES=['Malware detectado','Ransomware bloqueado','Falha de backup','Agente desconectado','Vulnerabilidade crítica','Tráfego suspeito','Patch pendente'];
const AC={inc:[],bk:[],score:{br01:[],br02:[]}};
for(let d=0;d<180;d++){const day=new Date(NOW-d*DAY);
 ['br01','br02'].forEach(dc=>{const n=ri(2,9);for(let i=0;i<n;i++)AC.inc.push({t:new Date(day-ri(0,86399)*1e3),dc,sev:wpick(SEVS,[1,3,5,6]),type:wpick(ATYPES,[4,1,5,3,3,3,4]),dev:pick(DEVICES),client:pick(CLIENTS),open:R()<.35});
  const tot=ri(30,38);AC.bk.push({t:sod(day),dc,ok:tot-ri(0,4),fail:ri(0,4)})})}
['br01','br02'].forEach(dc=>{let s=dc==='br01'?610:560;for(let m=5;m>=0;m--){s=Math.max(300,Math.min(840,s+ri(-30,45)));AC.score[dc].push({m:(NOW.getMonth()-m+12)%12,v:s})}});
const CFCAT=[['Anti-malware',.9],['Backup',.85],['Firewall',.55],['VPN',.4],['Criptografia de disco',.7],['Tráfego NTLM',.6]];
const ZH={t:[]};
for(let d=0;d<200;d++){const day=new Date(NOW-d*DAY),n=ri(4,12)+(d<30?2:0);
 for(let i=0;i<n;i++){const cr=new Date(day-ri(0,86399)*1e3);const age=d<12?R()<.45:R()<.08;const dur=ri(1,9)*DAY*(R()<.2?2:1);
  ZH.t.push({id:'#'+(10000+ZH.t.length),cr,cl:age?null:new Date(Math.min(+NOW,+cr+dur)),pri:wpick(['Urgente','Alta','Média','Baixa'],[1,3,6,5]),client:pick(CLIENTS),subj:pick(['Lentidão no ERP','Acesso VPN','Backup sem retorno','Troca de senha','E-mail bloqueado','Impressora offline','Alerta de antivírus','Novo usuário'])})}}
const ZB={hosts:Array.from({length:30},(_,i)=>(['fw','sw-core','srv-erp','srv-db','ap-wifi','link-mpls'][i%6])+'-'+String(i+1).padStart(2,'0')),p:[]};
for(let d=0;d<180;d++){const day=new Date(NOW-d*DAY),n=ri(3,10);for(let i=0;i<n;i++){const h=wpick(ZB.hosts,ZB.hosts.map((_,k)=>k<6?8:k<12?3:1));
 const st=new Date(day-ri(0,86399)*1e3);ZB.p.push({st,h,sev:wpick(SEVS,[1,2,4,3]),dur:wpick([ri(2,15),ri(15,90),ri(90,400)],[6,3,1]),down:R()<.6})}}

/* ---------- gráficos SVG ---------- */
const tipEl=()=>$('#tip');
document.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]'),tp=tipEl();
 if(t){tp.textContent=t.dataset.tip;tp.style.left=e.clientX+12+'px';tp.style.top=e.clientY+12+'px';tp.classList.remove('hidden')}else tp.classList.add('hidden')});
function donut(items,center){const tot=sum(items.map(i=>i.v))||1;let a=-Math.PI/2,out='';const r=60,cx=80,cy=80,w=22;
 items.forEach(i=>{if(!i.v)return;const f=i.v/tot,b=a+f*2*Math.PI-(f>=.999?.001:0);
  const p=x=>[cx+r*Math.cos(x),cy+r*Math.sin(x)],[x1,y1]=p(a),[x2,y2]=p(b);
  out+=`<path data-tip="${i.l}: ${i.v} (${Math.round(f*100)}%)" d="M${x1} ${y1}A${r} ${r} 0 ${f>.5?1:0} 1 ${x2} ${y2}" fill="none" stroke="${i.c}" stroke-width="${w}"/>`;a=b});
 return `<svg viewBox="0 0 160 160" style="max-width:200px;margin:auto">${out}<text x="80" y="80" text-anchor="middle" style="fill:#e6ecf5;font-size:22px;font-weight:700">${center??tot}</text><text x="80" y="96" text-anchor="middle">total</text></svg>`+
 `<div class="leg">${items.map(i=>`<span><i style="background:${i.c}"></i>${i.l} ${i.v}</span>`).join('')}</div>`}
function gauge(v,max,color){const f=Math.min(1,v/max),r=80,cx=100,cy=100,a=Math.PI*(1-f);const x=cx+r*Math.cos(a),y=cy-r*Math.sin(a);
 return `<div class="gauge-wrap"><svg viewBox="0 0 200 115"><path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="#22304a" stroke-width="16" stroke-linecap="round"/><path d="M20 100A80 80 0 0 1 ${x} ${y}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/><text x="14" y="114">0</text><text x="172" y="114">${max}</text></svg><div class="big" style="color:${color}">${Math.round(v)}</div></div>`}
function lineChart(labels,series,{h=180,fill=true,unit=''}={}){const W=520,P=28,max=Math.max(1,...series.flatMap(s=>s.d))*1.1,n=labels.length;
 const X=i=>P+i*(W-P-8)/Math.max(1,n-1),Y=v=>h-18-(v/max)*(h-30);let o='';
 for(let k=0;k<=3;k++){const v=max*k/3;o+=`<line x1="${P}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="#22304a"/><text x="2" y="${Y(v)+3}">${Math.round(v)}</text>`}
 series.forEach(s=>{const pts=s.d.map((v,i)=>[X(i),Y(v)]);const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  if(fill)o+=`<path d="${path}L${X(n-1)} ${h-18}L${X(0)} ${h-18}Z" fill="${s.c}" opacity=".12"/>`;
  o+=`<path d="${path}" fill="none" stroke="${s.c}" stroke-width="2"/>`;
  pts.forEach((p,i)=>{o+=`<circle cx="${p[0]}" cy="${p[1]}" r="${n>45?0:3}" fill="${s.c}" data-tip="${s.n} · ${labels[i]}: ${Math.round(s.d[i]*10)/10}${unit}"/><rect x="${p[0]-4}" y="0" width="8" height="${h}" fill="transparent" data-tip="${s.n} · ${labels[i]}: ${Math.round(s.d[i]*10)/10}${unit}"/>`})});
 const step=Math.ceil(n/8);labels.forEach((l,i)=>{if(i%step===0)o+=`<text x="${X(i)}" y="${h-4}" text-anchor="middle">${l}</text>`});
 return `<svg viewBox="0 0 ${W} ${h}">${o}</svg>`+(series.length>1?`<div class="leg">${series.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}</div>`:'')}
function stacked(labels,stacks,{h=190}={}){const W=520,P=26,n=labels.length,tot=labels.map((_,i)=>sum(stacks.map(s=>s.d[i]))),max=Math.max(1,...tot)*1.1,bw=(W-P)/n*.7;let o='';
 for(let k=0;k<=3;k++){const v=max*k/3,y=h-18-(v/max)*(h-30);o+=`<line x1="${P}" x2="${W}" y1="${y}" y2="${y}" stroke="#22304a"/><text x="2" y="${y+3}">${Math.round(v)}</text>`}
 labels.forEach((l,i)=>{let y=h-18;const x=P+i*(W-P)/n+((W-P)/n-bw)/2;
  stacks.forEach(s=>{const bh=s.d[i]/max*(h-30);y-=bh;if(bh>0)o+=`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${s.c}" rx="1" data-tip="${l} · ${s.n}: ${s.d[i]}"/>`});
  if(i%Math.ceil(n/8)===0)o+=`<text x="${x+bw/2}" y="${h-4}" text-anchor="middle">${l}</text>`});
 return `<svg viewBox="0 0 ${W} ${h}">${o}</svg><div class="leg">${stacks.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}</div>`}
function colBars(labels,vals,hi,{h=180,unit='',color=C.pri}={}){const W=520,P=26,n=labels.length,max=Math.max(1,...vals)*1.15,bw=(W-P)/n*.6;let o='';
 vals.forEach((v,i)=>{const x=P+i*(W-P)/n+((W-P)/n-bw)/2,bh=v/max*(h-34);o+=`<rect x="${x}" y="${h-18-bh}" width="${bw}" height="${bh}" rx="4" fill="${i===hi?color:'#2b3d5e'}" data-tip="${labels[i]}: ${Math.round(v*10)/10}${unit}"/><text x="${x+bw/2}" y="${h-18-bh-4}" text-anchor="middle" style="fill:#e6ecf5">${Math.round(v*10)/10}</text><text x="${x+bw/2}" y="${h-4}" text-anchor="middle">${labels[i]}</text>`});
 return `<svg viewBox="0 0 ${W} ${h}">${o}</svg>`}
function hbars(items,color=C.pri,unit=''){const max=Math.max(1,...items.map(i=>i.v));
 return items.map(i=>`<div class="hb"><div class="t"><span>${i.l}</span><span>${Math.round(i.v*10)/10}${unit}</span></div><div class="tr"><div style="width:${i.v/max*100}%;background:${i.c||color}"></div></div></div>`).join('')||'<div class="mut">Sem dados</div>'}
function heatmap(m){const max=Math.max(1,...m.flat());const D=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
 let h='<div class="heat"><div class="h"></div>'+Array.from({length:24},(_,i)=>`<div class="h">${i%3===0?i:''}</div>`).join('');
 m.forEach((row,d)=>{h+=`<div class="d">${D[d]}</div>`+row.map((v,i)=>`<div data-tip="${D[d]} ${i}h: ${v} incidentes" style="background:rgba(59,130,246,${.08+v/max*.92})"></div>`).join('')});return h+'</div>'}
const kpi=(l,v,d,inv)=>`<div class="card kpi"><div class="l">${l}</div><b>${v}</b>${d==null?'':delta(d,inv)}</div>`;
function delta(p,inv){if(!isFinite(p))return '<span class="delta flat">—</span>';const bad=inv?p<0:p>0,c=Math.abs(p)<1?'flat':bad?'up':'down';return `<span class="delta ${c}">${p>0?'▲':p<0?'▼':'■'} ${Math.abs(p).toFixed(0)}% vs período anterior</span>`}
const pct=(a,b)=>b?((a-b)/b*100):(a?100:0);

/* ---------- filtros ---------- */
const state={src:'acronis',dc:'all',mode:'auto',user:null};
function range(){const p=$('#period').value;let s,e=new Date(NOW);
 if(p==='today')s=sod(NOW);else if(p==='7'||p==='30')s=sod(NOW-(+p-1)*DAY);
 else if(p==='month')s=new Date(NOW.getFullYear(),NOW.getMonth(),1);
 else if(p==='lastmonth'){s=new Date(NOW.getFullYear(),NOW.getMonth()-1,1);e=new Date(NOW.getFullYear(),NOW.getMonth(),0,23,59,59)}
 else{s=$('#d1').value?new Date($('#d1').value+'T00:00'):sod(NOW-29*DAY);e=$('#d2').value?new Date($('#d2').value+'T23:59:59'):e}
 const len=e-s,ps=new Date(s-len-1000),pe=new Date(s-1);return{s,e,ps,pe}}
const inR=(t,a,b)=>t>=a&&t<=b;
function dayLabels(s,e){const a=[];for(let d=sod(s);d<=e;d=new Date(+d+DAY))a.push(new Date(d));return a}
function origem(r){const m=state.mode;if(m==='rt')return 'tempo real';if(m==='d1')return 'D-1 (até ontem)';return r.e>=sod(NOW)&&r.s<sod(NOW)?'misto (D-1 + tempo real hoje)':r.e>=sod(NOW)?'tempo real':'D-1'}

/* ---------- dashboards ---------- */
function viewAcronis(r){
 const dcf=x=>state.dc==='all'||x.dc===state.dc;
 const inc=AC.inc.filter(x=>dcf(x)&&inR(x.t,r.s,r.e)),prev=AC.inc.filter(x=>dcf(x)&&inR(x.t,r.ps,r.pe));
 const dcs=state.dc==='all'?['br01','br02']:[state.dc];
 const score=avg(dcs.map(d=>AC.score[d].at(-1).v)),scoreP=avg(dcs.map(d=>AC.score[d].at(-2).v));
 const col=score>=700?C.ok:score>=450?C.media:C.critica,lvl=score>=700?'Excelente':score>=450?'Moderado':'Em risco';
 const bk=AC.bk.filter(x=>dcf(x)&&inR(x.t,sod(r.s),r.e)),ok=sum(bk.map(x=>x.ok)),fail=sum(bk.map(x=>x.fail));
 const days=dayLabels(r.s,r.e),byDay=(f)=>days.map(d=>inc.filter(x=>sod(x.t)-d===0&&f(x)).length);
 const bySev=SEVS.map(s=>({l:s,v:inc.filter(x=>x.sev===s).length,c:C[s]}));
 const types={};inc.forEach(x=>types[x.type]=(types[x.type]||0)+1);
 const dev={};inc.forEach(x=>dev[x.dev]=(dev[x.dev]||0)+1);
 const cli={};inc.forEach(x=>cli[x.client]=(cli[x.client]||0)+1);
 const lab=days.map(fd),bl=days.length>45;
 let L=lab,stk=SEVS.map(s=>({n:s,c:C[s],d:byDay(x=>x.sev===s)}));
 if(bl){const w=[];for(let i=0;i<days.length;i+=7)w.push(i);L=w.map(i=>fd(days[i]));stk=stk.map(s=>({...s,d:w.map(i=>sum(s.d.slice(i,i+7)))}))}
 return `
 <div class="kpis">
  ${kpi('Incidentes no período',inc.length,pct(inc.length,prev.length))}
  ${kpi('Críticos',inc.filter(x=>x.sev==='critica').length,pct(inc.filter(x=>x.sev==='critica').length,prev.filter(x=>x.sev==='critica').length))}
  ${kpi('Incidentes em aberto',inc.filter(x=>x.open).length,null)}
  ${kpi('Sucesso de backup',(ok/Math.max(1,ok+fail)*100).toFixed(1)+'%',null)}
  ${kpi('Dispositivos afetados',Object.keys(dev).length,null)}
 </div>
 <div class="g g3">
  <div class="card"><h2>Cyber Fit Score</h2>${gauge(score,850,col)}<div style="text-align:center;margin-top:6px"><b style="color:${col}">${lvl}</b> <span class="delta ${score>=scoreP?'down':'up'}">${score>=scoreP?'▲':'▼'} ${Math.abs(score-scoreP).toFixed(0)} pts vs mês anterior</span></div></div>
  <div class="card"><h2>Evolução do score (6 meses)</h2>${lineChart(AC.score[dcs[0]].map(x=>MES[x.m]),dcs.map((d,i)=>({n:d.toUpperCase(),c:[C.pri,C.cy][i],d:AC.score[d].map(x=>x.v)})),{h:170})}</div>
  <div class="card"><h2>Score por categoria</h2>${hbars(CFCAT.map(([l,v])=>({l,v:v*100,c:v>.7?C.ok:v>.5?C.media:C.critica})),C.pri,'%')}</div>
 </div>
 <div class="g g21">
  <div class="card"><h2>Incidentes ao longo do tempo ${bl?'(por semana)':''}</h2>${stacked(L,stk)}</div>
  <div class="card"><h2>Por severidade</h2>${donut(bySev)}</div>
 </div>
 <div class="g g3">
  <div class="card"><h2>Tipos de incidente</h2>${hbars(Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l,v})),C.pur)}</div>
  <div class="card"><h2>Top dispositivos</h2>${hbars(Object.entries(dev).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([l,v])=>({l,v})),C.hi)}</div>
  <div class="card"><h2>Backups</h2>${donut([{l:'Sucesso',v:ok,c:C.ok},{l:'Falha',v:fail,c:C.critica}],(ok/Math.max(1,ok+fail)*100).toFixed(0)+'%')}</div>
 </div>
 <div class="card"><h2>Incidentes críticos recentes</h2><table><thead><tr><th>Quando</th><th>DC</th><th>Cliente</th><th>Dispositivo</th><th>Tipo</th><th>Status</th></tr></thead><tbody>${
  inc.filter(x=>x.sev==='critica').sort((a,b)=>b.t-a.t).slice(0,8).map(x=>`<tr><td>${fd(x.t)} ${x.t.toTimeString().slice(0,5)}</td><td>${x.dc.toUpperCase()}</td><td>${x.client}</td><td>${x.dev}</td><td>${x.type}</td><td>${x.open?'<span class="b alta">aberto</span>':'resolvido'}</td></tr>`).join('')||'<tr><td colspan=6 class="mut">Sem incidentes críticos</td></tr>'}</tbody></table></div>`}

function viewZoho(r){
 const T=ZH.t,openNow=T.filter(t=>t.cl===null||t.cl>NOW);
 const cr=T.filter(t=>inR(t.cr,r.s,r.e)),crP=T.filter(t=>inR(t.cr,r.ps,r.pe));
 const opened=cr.filter(t=>!t.cl),agedays=t=>((t.cl||NOW)-t.cr)/DAY;
 const avgOpen=avg(openNow.map(agedays)),avgRes=avg(cr.filter(t=>t.cl).map(agedays)),avgResP=avg(crP.filter(t=>t.cl).map(agedays));
 const buckets=[['0-1 dia',0,1],['2-3',1,3],['4-7',3,7],['8-14',7,14],['15+',14,1e9]].map(([l,a,b])=>({l,v:openNow.filter(t=>{const d=agedays(t);return d>a&&d<=b||(a===0&&d<=1)}).length}));
 const months=[];for(let i=5;i>=0;i--){const m0=new Date(NOW.getFullYear(),NOW.getMonth()-i,1),m1=new Date(NOW.getFullYear(),NOW.getMonth()-i+1,0,23,59,59);
  months.push({l:MES[m0.getMonth()],n:T.filter(t=>inR(t.cr,m0,m1)).length,c:T.filter(t=>t.cl&&inR(t.cl,m0,m1)).length})}
 const pr={};openNow.forEach(t=>pr[t.pri]=(pr[t.pri]||0)+1);
 const cli={};cr.forEach(t=>cli[t.client]=(cli[t.client]||0)+1);
 const days=dayLabels(r.s,r.e);
 const crd=days.map(d=>cr.filter(t=>sod(t.cr)-d===0).length),cld=days.map(d=>T.filter(t=>t.cl&&sod(t.cl)-d===0).length);
 const prC={Urgente:C.critica,Alta:C.alta,'Média':C.media,Baixa:C.pri};
 const prevMonth=months.at(-2).n,curMonth=months.at(-1).n;
 return `
 <div class="kpis">
  ${kpi('Chamados abertos agora',openNow.length,null)}
  ${kpi('Média de dias em aberto',avgOpen.toFixed(1)+' d',null)}
  ${kpi('Criados no período',cr.length,pct(cr.length,crP.length),true)}
  ${kpi('Tempo médio de resolução',avgRes.toFixed(1)+' d',pct(avgRes,avgResP),false)}
  ${kpi('Mês atual vs anterior',curMonth,pct(curMonth,prevMonth),true)}
 </div>
 <div class="g g2">
  <div class="card"><h2>Chamados por mês (comparativo)</h2>${colBars(months.map(m=>m.l),months.map(m=>m.n),months.length-1,{color:C.cy})}<div class="mut">Barra destacada = mês atual (parcial).</div></div>
  <div class="card"><h2>Criados × Fechados por mês</h2>${lineChart(months.map(m=>m.l),[{n:'Criados',c:C.cy,d:months.map(m=>m.n)},{n:'Fechados',c:C.ok,d:months.map(m=>m.c)}],{h:190})}</div>
 </div>
 <div class="g g3">
  <div class="card"><h2>Envelhecimento dos abertos</h2>${colBars(buckets.map(b=>b.l),buckets.map(b=>b.v),4,{color:C.critica,h:170})}</div>
  <div class="card"><h2>Abertos por prioridade</h2>${donut(Object.entries(pr).map(([l,v])=>({l,v,c:prC[l]})))}</div>
  <div class="card"><h2>Top clientes (período)</h2>${hbars(Object.entries(cli).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l,v})),C.cy)}</div>
 </div>
 <div class="card" style="margin-bottom:12px"><h2>Criados × Fechados por dia</h2>${lineChart(days.map(fd),[{n:'Criados',c:C.cy,d:crd},{n:'Fechados',c:C.ok,d:cld}],{h:190})}</div>
 <div class="card"><h2>Chamados abertos há mais tempo</h2><table><thead><tr><th>Ticket</th><th>Cliente</th><th>Assunto</th><th>Prioridade</th><th>Dias aberto</th></tr></thead><tbody>${
  openNow.sort((a,b)=>a.cr-b.cr).slice(0,8).map(t=>`<tr><td>${t.id}</td><td>${t.client}</td><td>${t.subj}</td><td><span class="b ${t.pri==='Urgente'?'critica':t.pri==='Alta'?'alta':t.pri==='Média'?'media':'baixa'}">${t.pri}</span></td><td>${agedays(t).toFixed(0)} d</td></tr>`).join('')}</tbody></table></div>`}

function viewZabbix(r){
 const P=ZB.p.filter(p=>inR(p.st,r.s,r.e)),PP=ZB.p.filter(p=>inR(p.st,r.ps,r.pe)),D=P.filter(p=>p.down),DP=PP.filter(p=>p.down);
 const spanMin=(r.e-r.s)/6e4,hosts=ZB.hosts.length;
 const totDown=sum(D.map(p=>p.dur)),avgDown=avg(D.map(p=>p.dur)),avgDownP=avg(DP.map(p=>p.dur));
 const avail=100-totDown/(spanMin*hosts)*100;
 const bySev=SEVS.map(s=>({l:s,v:P.filter(p=>p.sev===s).length,c:C[s]}));
 const h={},hd={};P.forEach(p=>h[p.h]=(h[p.h]||0)+1);D.forEach(p=>hd[p.h]=(hd[p.h]||0)+p.dur);
 const days=dayLabels(r.s,r.e),dd=days.map(d=>{const x=D.filter(p=>sod(p.st)-d===0);return avg(x.map(p=>p.dur))}),dc=days.map(d=>P.filter(p=>sod(p.st)-d===0).length);
 const hm=Array.from({length:7},()=>Array(24).fill(0));P.forEach(p=>hm[p.st.getDay()][p.st.getHours()]++);
 const top=Object.entries(h).sort((a,b)=>b[1]-a[1]).slice(0,8);
 return `
 <div class="kpis">
  ${kpi('Média de downtime',fmtMin(avgDown),pct(avgDown,avgDownP))}
  ${kpi('Downtime total',fmtMin(totDown),null)}
  ${kpi('Disponibilidade',avail.toFixed(2)+'%',null)}
  ${kpi('Incidentes',P.length,pct(P.length,PP.length))}
  ${kpi('Hosts afetados',Object.keys(h).length+'/'+hosts,null)}
 </div>
 <div class="g g21">
  <div class="card"><h2>Média de downtime por dia (min)</h2>${lineChart(days.map(fd),[{n:'Downtime médio',c:C.hi,d:dd}],{h:190,unit:' min'})}</div>
  <div class="card"><h2>Por severidade</h2>${donut(bySev)}</div>
 </div>
 <div class="g g2">
  <div class="card"><h2>Dispositivos com mais incidentes</h2>${hbars(top.map(([l,v])=>({l,v})),C.pur)}</div>
  <div class="card"><h2>Dispositivos com maior downtime</h2>${hbars(Object.entries(hd).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([l,v])=>({l,v:v/60})),C.hi,' h')}</div>
 </div>
 <div class="g g12">
  <div class="card"><h2>Incidentes por dia</h2>${colBars(days.length>20?days.filter((_,i)=>i%Math.ceil(days.length/14)===0).map(fd):days.map(fd),days.length>20?days.filter((_,i)=>i%Math.ceil(days.length/14)===0).map(d=>dc[days.indexOf(d)]):dc,-1,{h:180,color:C.pur})}</div>
  <div class="card"><h2>Mapa de calor: dia da semana × hora</h2>${heatmap(hm)}</div>
 </div>
 <div class="card"><h2>Detalhe dos dispositivos</h2><table><thead><tr><th>Host</th><th>Incidentes</th><th>Downtime total</th><th>Downtime médio</th></tr></thead><tbody>${
  top.map(([hn,n])=>{const x=D.filter(p=>p.h===hn);return `<tr><td>${hn}</td><td>${n}</td><td>${fmtMin(sum(x.map(p=>p.dur)))}</td><td>${fmtMin(avg(x.map(p=>p.dur)))}</td></tr>`}).join('')}</tbody></table></div>`}

const TITLES={acronis:'🔒 Acronis · Segurança e backup',zoho:'🎫 Zoho Desk · Chamados',zabbix:'📡 Zabbix · Disponibilidade'};
function render(){const r=range();$('#title').textContent=TITLES[state.src];
 $('#dcbox').classList.toggle('hidden',state.src!=='acronis');
 $$('.cust').forEach(e=>e.classList.toggle('hidden',$('#period').value!=='custom'));
 $('#range').textContent=`${fd(r.s)} → ${fd(r.e)} · origem: ${origem(r)}`;
 $('#content').innerHTML='<div class="skel"></div>';
 setTimeout(()=>{$('#content').innerHTML=({acronis:viewAcronis,zoho:viewZoho,zabbix:viewZabbix})[state.src](r)},350)}

/* ---------- login / sessão ---------- */
const USERS={'admin@demo.com':{role:'admin',name:'Admin',src:['acronis','zoho','zabbix']},'analista@demo.com':{role:'analista',name:'Analista',src:['acronis','zabbix']}};
const PASS='SenhaForte#2026',CODE='123456';let fails=0,lockUntil=0,left=0,tick=null,pending=null;
const GUIDE={login:'<b>Etapa 1/3</b> Credenciais. Bloqueio após 5 erros.',forgot:'<b>Recuperação</b> Resposta igual exista ou não o e-mail.',mfa:'<b>Etapa 2/3</b> Código TOTP (demo: 123456).',app:'<b>Etapa 3/3</b> Sessão ativa (demo: expira em 3 min sem uso). O analista não vê o Zoho.'};
function show(v){['login','forgot','mfa','app'].forEach(x=>$('#v-'+x).classList.toggle('hidden',x!==v));$('#guide').innerHTML=GUIDE[v]}
const msg=(s,c,t)=>$(s).innerHTML=t?`<div class="msg ${c}">${t}</div>`:'';
const toast=t=>{$('#toast').innerHTML=`<div class="msg ok">${t}</div>`;setTimeout(()=>$('#toast').innerHTML='',2200)};
$('#eye').onclick=()=>{const p=$('#pass'),h=p.type==='password';p.type=h?'text':'password';$('#eye').textContent=h?'ocultar':'mostrar'};
$('#f-login').onsubmit=e=>{e.preventDefault();
 if(Date.now()<lockUntil)return msg('#login-msg','err',`Muitas tentativas. Tente em ${Math.ceil((lockUntil-Date.now())/1000)}s.`);
 const em=$('#email').value.trim().toLowerCase(),u=USERS[em],b=$('#btn-login');b.disabled=true;b.textContent='Verificando...';
 setTimeout(()=>{b.disabled=false;b.textContent='Entrar';
  if(u&&$('#pass').value===PASS){fails=0;pending=u;$('#pass').value='';msg('#login-msg','','');mfaStart()}
  else{fails++;if(fails>=5){lockUntil=Date.now()+30000;fails=0;msg('#login-msg','err','Conta bloqueada por 30s (demo).')}else msg('#login-msg','err',`E-mail ou senha inválidos. Restam ${5-fails} tentativa(s).`)}},500)};
$('#forgot').onclick=()=>{show('forgot');msg('#forgot-msg','','')};
$('#send-reset').onclick=()=>msg('#forgot-msg','ok','Se o e-mail estiver cadastrado, você receberá um link em instantes.');
$$('[data-go]').forEach(b=>b.onclick=()=>{pending=null;show(b.dataset.go)});
const cells=[];for(let i=0;i<6;i++){const x=document.createElement('input');x.maxLength=1;x.inputMode='numeric';$('#otp').appendChild(x);cells.push(x)}
const code=()=>cells.map(c=>c.value).join(''),upd=()=>$('#btn-mfa').disabled=code().length!==6;
cells.forEach((c,i)=>{c.oninput=()=>{c.value=c.value.replace(/\D/g,'');if(c.value&&cells[i+1])cells[i+1].focus();upd()};
 c.onkeydown=e=>{if(e.key==='Backspace'&&!c.value&&cells[i-1])cells[i-1].focus()};
 c.onpaste=e=>{e.preventDefault();[...(e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6)].forEach((ch,k)=>cells[k].value=ch);upd()}});
function mfaStart(){cells.forEach(c=>c.value='');upd();msg('#mfa-msg','','');show('mfa');cells[0].focus()}
$('#btn-mfa').onclick=()=>{if(code()===CODE){state.user=pending;enter()}else{msg('#mfa-msg','err','Código inválido.');cells.forEach(c=>c.value='');cells[0].focus();upd()}};
function enter(){show('app');$('#who').textContent=`${state.user.name} (${state.user.role})`;
 $$('aside a').forEach(a=>a.classList.toggle('hidden',!state.user.src.includes(a.dataset.src)));
 state.src=state.user.src[0];sel();render();startSession()}
function sel(){$$('aside a').forEach(a=>a.classList.toggle('on',a.dataset.src===state.src))}
$$('aside a').forEach(a=>a.onclick=()=>{state.src=a.dataset.src;sel();render()});
$$('.seg').forEach(g=>g.onclick=e=>{const s=e.target.closest('span');if(!s)return;[...g.children].forEach(c=>c.classList.toggle('on',c===s));state[g.id]=s.dataset.v;render()});
['period','d1','d2'].forEach(i=>$('#'+i).onchange=render);$('#refresh').onclick=()=>{render();toast('Dados atualizados')};
function startSession(){left=180;clearInterval(tick);tick=setInterval(()=>{left--;$('#timer').textContent='Sessão: '+left+'s';$('#expire').classList.toggle('hidden',left>20);$('#sec').textContent=left;if(left<=0)logout('Sessão expirada por inatividade.')},1000)}
['click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(state.user&&left>20)left=180}));
$('#renew').onclick=()=>{left=180;toast('Sessão renovada')};
function logout(m){clearInterval(tick);state.user=null;show('login');msg('#login-msg',m?'warn':'',m||'')}
$('#logout').onclick=()=>logout();
show('login');

