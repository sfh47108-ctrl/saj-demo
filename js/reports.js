/* reports.js (v57) - one shared look for every PDF and print report.
   PDF   = colourful (blue header band, both logos, coloured stat cards and status cells, page footer)
   Print = black and white (same layout, safe on a plain printer or pre-printed paper)
   Logos = exactly two files: /assets/logo.jpg (SAJ Academy) and /assets/omys.jpg (OMYS Schools' Network) */
export const BR={net:"OMYS SCHOOLS' NETWORK",name:"S.A.J ACADEMY",place:"HUSSAINABAD",short:"S.A.J Academy, Hussainabad",by:"Designed & Developed by Abdul Haseeb Vayani"};
const C={navy:[16,44,116],head:[30,72,166],blue:[37,99,196],sky:[96,165,250],zebra:[246,249,255],line:[203,217,240],ink:[27,42,71],mute:[104,120,150],
 ok:[20,134,88],okBg:[218,245,232],no:[198,52,64],noBg:[252,226,229],lt:[184,108,6],ltBg:[255,238,208],lv:[98,70,196],lvBg:[234,229,252],pr:[37,99,196],prBg:[222,235,253],hol:[110,122,146],holBg:[235,239,246]};
const TONE={ok:[C.ok,C.okBg],no:[C.no,C.noBg],lt:[C.lt,C.ltBg],lv:[C.lv,C.lvBg],pr:[C.pr,C.prBg],hol:[C.hol,C.holBg]};
const SMAP={P:"ok",PRESENT:"ok",A:"no",ABSENT:"no",L:"lt",LATE:"lt",LV:"lv",V:"lv",LEAVE:"lv",H:"hol",HOLIDAY:"hol",OFF:"hol"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const stamp=()=>new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});

/* ---------- logos: the two source images have white margins, so they are trimmed once and reused everywhere ---------- */
const LG={};
const loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("Could not load a logo image. Please refresh and try again."));i.src=src});
export async function trimLogo(name){
 if(LG[name])return LG[name];
 const img=await loadImg("/assets/"+name),w=img.naturalWidth,h=img.naturalHeight,c=document.createElement("canvas");c.width=w;c.height=h;
 const x=c.getContext("2d",{willReadFrequently:true});x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(img,0,0);
 const d=x.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){const i=(y*w+xx)*4;if(d[i]+d[i+1]+d[i+2]<720){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y}}
 if(x1<0){x0=0;y0=0;x1=w-1;y1=h-1}
 const p=2;x0=Math.max(0,x0-p);y0=Math.max(0,y0-p);x1=Math.min(w-1,x1+p);y1=Math.min(h-1,y1+p);
 const cw=x1-x0+1,ch=y1-y0+1,o=document.createElement("canvas");o.width=cw;o.height=ch;const ox=o.getContext("2d");ox.fillStyle="#fff";ox.fillRect(0,0,cw,ch);ox.drawImage(c,x0,y0,cw,ch,0,0,cw,ch);
 return LG[name]={u:o.toDataURL("image/jpeg",.95),w:cw,h:ch}}
export const loadLogos=async()=>({saj:await trimLogo("logo.jpg"),omys:await trimLogo("omys.jpg")});
export const logoUrl=n=>LG[n]?LG[n].u:null; /* trimmed copy, once loaded */

/* ---------- PDF (colourful) ---------- */
const fill=(d,c)=>d.setFillColor(c[0],c[1],c[2]),ink=(d,c)=>d.setTextColor(c[0],c[1],c[2]),stroke=(d,c)=>d.setDrawColor(c[0],c[1],c[2]);
function spaced(d,t,x,y,cs,al){t=String(t);if(!cs){d.text(t,x,y,al&&al!=="left"?{align:al}:undefined);return}
 const ch=[...t],ws=ch.map(c=>d.getTextWidth(c)),tot=ws.reduce((a,b)=>a+b,0)+cs*(ch.length-1);let cx=al==="center"?x-tot/2:al==="right"?x-tot:x;ch.forEach((c,i)=>{d.text(c,cx,y);cx+=ws[i]+cs})}
const toneOf=v=>SMAP[String(v??"").trim().toUpperCase()];
function plate(d,x,y,s,img){fill(d,[255,255,255]);d.roundedRect(x,y,s,s,3,3,"F");const pad=2,bw=s-pad*2,r=Math.min(bw/img.w,bw/img.h),w=img.w*r,h=img.h*r;d.addImage(img.u,"JPEG",x+(s-w)/2,y+(s-h)/2,w,h)}
function bigBand(d,pw,m,L){const H=34;
 fill(d,C.navy);d.rect(0,0,pw,H,"F");
 try{d.setGState(new d.GState({opacity:.09}));fill(d,[255,255,255]);d.circle(pw-16,0,27,"F");d.circle(26,H+4,20,"F");d.setGState(new d.GState({opacity:1}))}catch{}
 fill(d,C.sky);d.rect(0,H,pw,1.4,"F");
 plate(d,m,5,24,L.saj);plate(d,pw-m-24,5,24,L.omys);
 d.setFont("helvetica","bold");d.setFontSize(8.6);ink(d,[190,215,255]);spaced(d,BR.net,pw/2,12,.9,"center");
 d.setFontSize(25);ink(d,[255,255,255]);spaced(d,BR.name,pw/2,22.4,.8,"center");
 d.setFontSize(9);ink(d,[165,203,255]);spaced(d,BR.place,pw/2,29.2,2.8,"center");
 return H+1.4}
function slimBand(d,pw,m,L,title){const H=14;
 fill(d,C.navy);d.rect(0,0,pw,H,"F");fill(d,C.sky);d.rect(0,H,pw,.9,"F");
 fill(d,[255,255,255]);d.roundedRect(m,2.2,9.6,9.6,1.6,1.6,"F");{const img=L.saj,r=Math.min(7.6/img.w,7.6/img.h),w=img.w*r,h=img.h*r;d.addImage(img.u,"JPEG",m+(9.6-w)/2,2.2+(9.6-h)/2,w,h)}
 d.setFont("helvetica","bold");d.setFontSize(11);ink(d,[255,255,255]);spaced(d,BR.name,m+13,7.2,.4,"left");
 d.setFontSize(6.6);ink(d,[165,203,255]);spaced(d,BR.place,m+13,11,1.5,"left");
 d.setFontSize(8.5);ink(d,[225,236,255]);d.text(String(title||"").toUpperCase(),pw-m,8.6,{align:"right"})}
function chips(d,items,x,y,maxW){let cx=x,cy=y;const h=9,pad=3.2;
 items.forEach(([l,v])=>{l=String(l).toUpperCase();v=String(v??"");d.setFont("helvetica","normal");d.setFontSize(6.4);const lw=d.getTextWidth(l);d.setFont("helvetica","bold");d.setFontSize(9);const vw=d.getTextWidth(v),w=pad*2+lw+2.4+vw;
  if(cx>x&&cx+w>x+maxW){cx=x;cy+=h+2.4}
  fill(d,C.prBg);d.roundedRect(cx,cy,w,h,2.2,2.2,"F");fill(d,C.blue);d.roundedRect(cx,cy,1.3,h,.6,.6,"F");
  d.setFont("helvetica","normal");d.setFontSize(6.4);ink(d,C.mute);d.text(l,cx+pad+.6,cy+5.7);
  d.setFont("helvetica","bold");d.setFontSize(9);ink(d,C.ink);d.text(v,cx+pad+.6+lw+2.4,cy+5.9);cx+=w+3});
 return cy+h}
function statCards(d,items,x,y,W){const n=items.length,g=3,w=(W-g*(n-1))/n,h=16;
 items.forEach((s,i)=>{const [fg,bg]=TONE[s.t||"pr"],cx=x+i*(w+g);fill(d,bg);d.roundedRect(cx,y,w,h,2.4,2.4,"F");fill(d,fg);d.roundedRect(cx,y,1.7,h,.8,.8,"F");
  d.setFont("helvetica","bold");d.setFontSize(w<22?13:15);ink(d,fg);d.text(String(s.v),cx+w/2+.8,y+8.4,{align:"center"});
  d.setFont("helvetica","normal");d.setFontSize(6.3);ink(d,C.mute);d.text(String(s.l).toUpperCase(),cx+w/2+.8,y+13.2,{align:"center"})});
 return y+h}
function legend(d,x,y){const it=[["P","Present","ok"],["A","Absent","no"],["L","Late","lt"],["Lv","Leave","lv"],["H","Holiday / Off","hol"]];let cx=x;
 d.setFontSize(7);it.forEach(([k,t,tn])=>{const [fg,bg]=TONE[tn];fill(d,bg);stroke(d,fg);d.setLineWidth(.2);d.roundedRect(cx,y-3.1,6,4.4,1,1,"FD");d.setFont("helvetica","bold");ink(d,fg);d.text(k,cx+3,y,{align:"center"});d.setFont("helvetica","normal");ink(d,C.mute);d.text(t,cx+7.6,y);cx+=7.6+d.getTextWidth(t)+6})}
function footer(d,pw,ph,m,i,N){stroke(d,C.line);d.setLineWidth(.3);d.line(m,ph-13,pw-m,ph-13);
 d.setFont("helvetica","normal");d.setFontSize(7.2);ink(d,C.mute);d.text(BR.short+"   |   Generated "+stamp(),m,ph-8.8);d.text("Page "+i+" of "+N,pw-m,ph-8.8,{align:"right"});
 d.setFontSize(6.5);ink(d,[150,162,185]);d.text(BR.by,pw/2,ph-4.8,{align:"center"})}
export async function pdfReport(o){
 const J=window.jspdf&&window.jspdf.jsPDF;if(!J||!J.API.autoTable)throw new Error("PDF library did not load. Check your internet connection and try again.");
 const L=await loadLogos(),land=o.orient==="l",d=new J(land?"l":"p","mm","a4"),pw=d.internal.pageSize.getWidth(),ph=d.internal.pageSize.getHeight(),m=land?10:12,W=pw-m*2;
 let y=bigBand(d,pw,m,L)+8;
 /* title ribbon */
 fill(d,C.blue);d.roundedRect(m,y-5.4,1.8,8.6,.9,.9,"F");d.setFont("helvetica","bold");d.setFontSize(land?14:15);ink(d,C.navy);spaced(d,String(o.title).toUpperCase(),m+4.6,y,.5,"left");
 if(o.subtitle){d.setFont("helvetica","normal");d.setFontSize(9.5);ink(d,C.mute);d.text(String(o.subtitle),pw-m,y,{align:"right"})}
 y+=5.4;
 if(o.meta&&o.meta.length)y=chips(d,o.meta,m,y,W)+5;
 if(o.stats&&o.stats.length)y=statCards(d,o.stats,m,y,W)+6;
 const left=new Set(o.leftCols||[]),cs={};Object.keys(o.colStyles||{}).forEach(k=>cs[k]={...o.colStyles[k]});left.forEach(c=>{cs[c]={...(cs[c]||{}),halign:"left"}});
 const sc=o.statusCols,inSt=ci=>sc&&ci>=sc[0]&&ci<=sc[1],last=o.body.length-1;
 d.autoTable({head:[o.head],body:o.body,startY:y,margin:{top:20,left:m,right:m,bottom:19},theme:"grid",showHead:"everyPage",
  styles:{font:"helvetica",fontSize:o.fs||9,cellPadding:o.pad??2.2,lineColor:C.line,lineWidth:.15,textColor:C.ink,valign:"middle",halign:"center",overflow:"linebreak"},
  headStyles:{fillColor:C.head,textColor:[255,255,255],fontStyle:"bold",lineColor:C.head},
  alternateRowStyles:{fillColor:C.zebra},columnStyles:cs,
  didParseCell:h=>{const ci=h.column.index,v=String(h.cell.raw??"").trim(),s=h.cell.styles;
   if(h.section==="head"){if(o.holCols&&o.holCols.includes(ci)){s.fillColor=C.hol;s.lineColor=C.hol}return}
   if(h.section!=="body")return;
   const tot=o.totalRow&&h.row.index===last;
   if(tot){s.fontStyle="bold";s.fillColor=C.prBg;s.textColor=C.navy;s.lineColor=C.blue;return}
   if(inSt(ci)){const t=toneOf(v);if(t){s.fillColor=TONE[t][1];s.textColor=TONE[t][0];s.fontStyle="bold"}}
   if(o.colTone&&o.colTone[ci]){s.textColor=TONE[o.colTone[ci]][0];s.fontStyle="bold"}
   if(o.pctCol===ci&&v!==""){const n=parseFloat(v);if(!isNaN(n)){const t=n>=90?"ok":n>=75?"lt":"no";s.textColor=TONE[t][0];s.fontStyle="bold"}}
   if(o.nameCol===ci)s.fontStyle="bold"}});
 y=d.lastAutoTable.finalY;
 if(o.legend){y+=7;if(y>ph-24){d.addPage();y=28}legend(d,m,y)}
 /* signatures */
 const sg=o.signs||["Class Teacher","Principal"];y+=18;if(y>ph-26){d.addPage();y=34}
 const seg=W/sg.length;sg.forEach((t,i)=>{const cx=m+seg*i+seg/2,half=Math.min(34,seg/2-8);stroke(d,C.ink);d.setLineWidth(.3);d.line(cx-half,y,cx+half,y);d.setFont("helvetica","bold");d.setFontSize(8);ink(d,C.mute);d.text(t,cx,y+4.6,{align:"center"})});
 const N=d.internal.getNumberOfPages();for(let i=1;i<=N;i++){d.setPage(i);if(i>1)slimBand(d,pw,m,L,o.title);footer(d,pw,ph,m,i,N)}
 d.save(o.file||"report.pdf")}

/* ---------- Print (black and white) ---------- */
export async function printReport(o){
 const L=await loadLogos(),land=o.orient==="l",sc=o.statusCols,inSt=ci=>sc&&ci>=sc[0]&&ci<=sc[1],last=o.body.length-1,left=new Set(o.leftCols||[]),cls={ok:"p",no:"a",lt:"lt",lv:"v",hol:"h"};
 const th=o.head.map((h,i)=>`<th class="${left.has(i)?"l":""}${o.holCols&&o.holCols.includes(i)?" h":""}">${esc(h)}</th>`).join("");
 const tr=o.body.map((r,ri)=>{const tot=o.totalRow&&ri===last;return `<tr${tot?' class="t"':""}>${r.map((v,ci)=>{let c=left.has(ci)?"l":"";if(!tot&&inSt(ci)){const t=toneOf(v);if(t)c+=" "+cls[t]}if(o.nameCol===ci&&!tot)c+=" nm";return `<td${c?` class="${c.trim()}"`:""}>${esc(v)}</td>`}).join("")}</tr>`}).join("");
 const meta=(o.meta||[]).length?`<table class="mt"><tr>${o.meta.map(([l,v])=>`<td><small>${esc(l)}</small><b>${esc(v)}</b></td>`).join("")}</tr></table>`:"";
 const stats=(o.stats||[]).length?`<table class="sx"><tr>${o.stats.map(s=>`<td><b>${esc(s.v)}</b><small>${esc(s.l)}</small></td>`).join("")}</tr></table>`:"";
 const sg=(o.signs||["Class Teacher","Principal"]).map(t=>`<span>${esc(t)}</span>`).join("");
 const css=`@page{size:A4 ${land?"landscape":"portrait"};margin:10mm 10mm 15mm;@bottom-left{content:"${BR.short}  |  Generated ${stamp()}";font:9px Arial,sans-serif;color:#333}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:9px Arial,sans-serif;color:#333}@bottom-center{content:"${BR.by}";font:8px Arial,sans-serif;color:#777}}
*{box-sizing:border-box}html,body{margin:0;background:#fff}body{font-family:Arial,Helvetica,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse}.hd{width:100%}.hd td{border:0;padding:0;vertical-align:middle;text-align:center}.hd td.lg{width:96px}.hd img{height:78px;width:auto;max-width:92px;filter:grayscale(1) contrast(1.2)}
.n1{font-size:12px;font-weight:700;letter-spacing:2.6px}.n2{font-size:31px;font-weight:800;letter-spacing:3px;line-height:1.12}.n3{font-size:12px;letter-spacing:7px;font-weight:600;color:#222}
.rule{border-top:3px solid #000;border-bottom:1px solid #000;height:5px;margin:9px 0 0}
.tt{text-align:center;font-size:16px;font-weight:800;letter-spacing:2.4px;margin:10px 0 1px;text-transform:uppercase}.sb{text-align:center;font-size:11px;color:#222;margin-bottom:6px}
.mt{width:100%;margin:8px 0 6px}.mt td{border:1px solid #000;padding:4px 9px}.mt small{display:block;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#444}.mt b{font-size:12.5px}
.sx{width:100%;margin:0 0 9px}.sx td{border:1.5px solid #000;text-align:center;padding:5px 3px}.sx b{display:block;font-size:17px;line-height:1.15}.sx small{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#333}
.dt{width:100%;font-size:${o.compact?"8.5px":"11px"}}.dt thead{display:table-header-group}.dt tr{page-break-inside:avoid}
.dt th{border:1.5px solid #000;background:#e2e2e2;padding:${o.compact?"3px 1px":"5px 6px"};text-align:center;font-size:${o.compact?"8px":"10px"};text-transform:uppercase;letter-spacing:.3px}
.dt td{border:1px solid #444;padding:${o.compact?"2.5px 1px":"4.5px 6px"};text-align:center}.dt tbody tr:nth-child(even) td{background:#f4f4f4}
.dt .l{text-align:left;padding-left:6px}.dt td.nm{font-weight:700}.dt td.a{font-weight:800;background:#c9c9c9!important}.dt td.v,.dt td.lt{font-style:italic}.dt td.v{text-decoration:underline;font-weight:700}.dt td.h,.dt th.h{background:#e9e9e9!important;color:#444}.dt td.p{font-weight:700}
.dt td.l:not(.nm){font-weight:400}.dt tr.t td{font-weight:800;background:#d6d6d6!important;border-top:2.5px solid #000;border-bottom:2.5px solid #000}
.lg2{font-size:9px;color:#333;margin-top:6px}.sgn{display:flex;justify-content:space-around;gap:20px;margin-top:52px;font-size:11px;font-weight:700;page-break-inside:avoid}.sgn span{border-top:1px solid #000;padding-top:4px;min-width:150px;text-align:center}`;
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.title)}</title><style>${css}</style></head><body>
<table class="hd"><tr><td class="lg"><img src="${L.saj.u}" alt=""></td><td><div class="n1">${BR.net}</div><div class="n2">${BR.name}</div><div class="n3">${BR.place}</div></td><td class="lg"><img src="${L.omys.u}" alt=""></td></tr></table><div class="rule"></div>
<div class="tt">${esc(o.title)}</div>${o.subtitle?`<div class="sb">${esc(o.subtitle)}</div>`:""}${meta}${stats}
<table class="dt"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>${o.legend?'<div class="lg2">P = Present &nbsp;&middot;&nbsp; A = Absent (shaded) &nbsp;&middot;&nbsp; L = Late &nbsp;&middot;&nbsp; Lv = Leave &nbsp;&middot;&nbsp; H = Holiday / Off</div>':""}<div class="sgn">${sg}</div></body></html>`;
 const f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";document.body.appendChild(f);const w=f.contentDocument;w.open();w.write(html);w.close();
 await Promise.all([...w.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})));
 setTimeout(()=>{f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),120000)},350)}

/* ---------- report specs: plain data in, one description out (used by both the PDF and the Print version) ---------- */
export const SHN={AM:"Morning",PM:"Afternoon",BOTH:"Both shifts"};
const NMs={P:"Present",A:"Absent",L:"Late",V:"Leave"},MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const tally=rows=>{const r={P:0,A:0,L:0,V:0};rows.forEach(x=>{if(r[x.status]!==undefined)r[x.status]++});return r};
const pctOf=c=>{const t=c.P+c.A+c.L+c.V;return t?Math.round((c.P+c.L)*100/t):0};
const dmy=s=>String(s||"").split("-").reverse().join("-");
const longDate=ds=>{const [y,m,d]=ds.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})};
const clsMeta=a=>[["Class",a.cls+(a.sec?" - "+a.sec:"")],...(a.sh?[["Shift",SHN[a.sh]||a.sh]]:[])];
export function dailySpec(a){const l=a.students,m={};a.rows.forEach(x=>m[x.gr]=x.status);const c=tally(a.rows),n=l.length,mk=c.P+c.A+c.L+c.V,nm=a.off?0:Math.max(0,n-a.rows.length);
 return{title:"Daily Attendance Report",subtitle:longDate(a.date),
  meta:[...clsMeta(a),["Date",dmy(a.date)],["Students",n],...(a.off?[["Note",/weekly/.test(a.off)?"Weekly off":"Holiday"]]:[])],
  stats:[{l:"Strength",v:n,t:"pr"},{l:"Present",v:c.P,t:"ok"},{l:"Absent",v:c.A,t:"no"},{l:"Late",v:c.L,t:"lt"},{l:"Leave",v:c.V,t:"lv"},{l:"Not marked",v:nm,t:"hol"},{l:"Attendance",v:mk?pctOf(c)+"%":"-",t:"pr"}],
  head:["Roll","Student ID","Name","Father","Status"],body:l.map(s=>[s.roll??"",s.id,s.name,s.father??"",NMs[m[s.gr]]||(a.off?"Holiday":"-")]),
  statusCols:[4,4],leftCols:[2,3],nameCol:2,colStyles:{0:{cellWidth:16},1:{cellWidth:28},4:{cellWidth:28}},legend:true,signs:["Class Teacher","Principal"],file:a.file}}
export function monthlySpec(a){const [y,mo]=a.month.split("-").map(Number),n=new Date(y,mo,0).getDate(),m={};a.rows.forEach(x=>m[x.gr+"|"+x.date]=x.status);
 const dk=i=>a.month+"-"+String(i).padStart(2,"0"),days=[...Array(n)].map((_,i)=>i+1),holCols=[],T={P:0,A:0,L:0,V:0};
 days.forEach((d,i)=>{if(a.off(dk(d)))holCols.push(3+i)});
 const body=a.students.map(s=>{const c={P:0,A:0,L:0,V:0},r=days.map(d=>{const x=m[s.gr+"|"+dk(d)];if(x&&c[x]!==undefined){c[x]++;T[x]++}return x==="V"?"Lv":x||(a.off(dk(d))?"H":"")}),t=c.P+c.A+c.L+c.V;return[s.roll??"",s.id,s.name,...r,c.P,c.A,c.L,c.V,t?pctOf(c)+"%":""]});
 const dayW=Math.max(4.6,Math.min(7,Math.floor((277-7-14-35-28-10)/n*10)/10)),cs={0:{cellWidth:7},1:{cellWidth:14},2:{cellWidth:35,halign:"left"}};
 days.forEach((d,i)=>cs[3+i]={cellWidth:dayW});[0,1,2,3].forEach(i=>cs[3+n+i]={cellWidth:7});cs[7+n]={cellWidth:10};
 return{title:"Monthly Attendance Report",subtitle:MONTHS[mo-1]+" "+y,orient:"l",
  meta:[...clsMeta(a),["Month",MONTHS[mo-1]+" "+y],["Students",a.students.length]],
  stats:[{l:"Students",v:a.students.length,t:"pr"},{l:"Present (total)",v:T.P,t:"ok"},{l:"Absent (total)",v:T.A,t:"no"},{l:"Late (total)",v:T.L,t:"lt"},{l:"Leave (total)",v:T.V,t:"lv"},{l:"Class average",v:(T.P+T.A+T.L+T.V)?pctOf(T)+"%":"-",t:"pr"}],
  head:["Roll","ID","Name",...days,"P","A","L","Lv","%"],body,fs:6.3,pad:.9,compact:true,statusCols:[3,2+n],holCols,colTone:{[3+n]:"ok",[4+n]:"no",[5+n]:"lt",[6+n]:"lv"},pctCol:7+n,leftCols:[2],nameCol:2,colStyles:cs,legend:true,signs:["Class Teacher","Principal"],file:a.file}}
export function dsrSpec(a){const c=a.c,t=c.tot;
 return{title:"Daily Strength Record (DSR)",subtitle:longDate(c.d),
  meta:[["Date",dmy(c.d)],["Shift",c.lab],["Classes",c.data.length]],
  stats:[{l:"Strength",v:t.n,t:"pr"},{l:"Present",v:t.P,t:"ok"},{l:"Late",v:t.L,t:"lt"},{l:"Leave",v:t.V,t:"lv"},{l:"Absent",v:t.A,t:"no"},{l:"Not marked",v:t.nm,t:"hol"},{l:"Present %",v:t.pc===null?"-":t.pc+"%",t:"pr"}],
  head:a.head,body:a.body,totalRow:true,leftCols:[0,1],colTone:{4:"ok",5:"lt",6:"lv",7:"no"},pctCol:9,signs:["Prepared by","Checked by","Principal"],file:a.file}}
export function leftSpec(a){return{title:"Left Students Register",subtitle:longDate(a.today),orient:"l",meta:[["Total left",a.body.length],["Date",dmy(a.today)]],head:a.head,body:a.body,fs:8,pad:1.9,compact:false,leftCols:[2,3,9],nameCol:2,signs:["Prepared by","Principal"],file:a.file}}
