import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInWithCustomToken,onAuthStateChanged,signOut,setPersistence,browserSessionPersistence} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,getDocs,query,where,orderBy,limit,doc,setDoc as _sd,updateDoc as _ud,getDoc,deleteDoc as _dd,writeBatch as _wb} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
import {pdfReport,printReport,dailySpec,monthlySpec,dsrSpec,leftSpec,loadLogos,logoUrl} from "./reports.js?v=57";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),ac=collection(db,"att");

/* ---------- read saver (v56): keeps recent reads in the browser so Firestore is not read again and again ---------- */
const MIN=60000,CK="sajc:",CT={},BM={att:["att"],hw:["hw"],notices:["nt"],pnotices:["nt"],cfg:["cfg"],results:["res","req"],events:["ev"],students:["stu"]},STUA=new Set(["saveStudentProfile","setHold","promoteStudents","setPositions","importStudents","wipeAll","markLeft","readmit","deleteStudent"]);
const ckey=k=>(S&&S.me?S.me.u:"-")+"|"+k;
async function cached(k,ttl,fn){const key=ckey(k);let e=CT[key];if(!e){try{const t=localStorage.getItem(CK+key);if(t)e=CT[key]=JSON.parse(t)}catch{}}
 if(e&&Date.now()-e.t<ttl)return JSON.parse(e.v);
 const v=await fn();e={t:Date.now(),v:JSON.stringify(v===undefined?null:v)};CT[key]=e;try{localStorage.setItem(CK+key,JSON.stringify(e))}catch{}return v===undefined?null:JSON.parse(e.v)}
function bustP(p){const pre=p+(p.length?"":"");for(const k of Object.keys(CT))if((k.split("|")[1]||"").startsWith(pre))delete CT[k];try{Object.keys(localStorage).filter(k=>k.startsWith(CK)&&(k.slice(CK.length).split("|")[1]||"").startsWith(pre)).forEach(k=>localStorage.removeItem(k))}catch{}}
function bustAll(){for(const k of Object.keys(CT))delete CT[k];try{Object.keys(localStorage).filter(k=>k.startsWith(CK)).forEach(k=>localStorage.removeItem(k))}catch{}}
const rootOf=r=>String((r&&r.path)||"").split("/")[0],bustRoot=r=>(BM[r]||[]).forEach(bustP);
try{Object.keys(localStorage).filter(k=>k.startsWith(CK)).forEach(k=>{try{if(Date.now()-JSON.parse(localStorage.getItem(k)).t>3600000)localStorage.removeItem(k)}catch{localStorage.removeItem(k)}})}catch{}
const setDoc=async(r,...a)=>{const x=await _sd(r,...a);bustRoot(rootOf(r));return x};
const updateDoc=async(r,...a)=>{const x=await _ud(r,...a);bustRoot(rootOf(r));return x};
const deleteDoc=async(r,...a)=>{const x=await _dd(r,...a);bustRoot(rootOf(r));return x};
const writeBatch=d=>{const b=_wb(d),R=new Set();["set","update","delete"].forEach(m=>{const o=b[m].bind(b);b[m]=(r,...a)=>{R.add(rootOf(r));return o(r,...a)}});const c=b.commit.bind(b);b.commit=async()=>{const x=await c();R.forEach(bustRoot);return x};return b};
const SW=()=>document.body.dataset.mode==="dark"?{background:"#16233f",color:"#e6edf9"}:{background:"#ffffff",color:"#1b2a47"};
try{document.body.dataset.mode=localStorage.getItem("saj_mode")==="dark"?"dark":"light"}catch{document.body.dataset.mode="light"}
const SCH="SAJ Academy Hussainabad",$=s=>document.querySelector(s);
const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>ymd(new Date()),cmp=(a,b)=>a.localeCompare(b,undefined,{numeric:true}),kn=k=>{const p=k.split("|");return p.length===3?p[1]+" - "+p[2]+" ("+(p[0]==="AM"?"Morning":"Afternoon")+")":p.join(" - ")};
const ROMN={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
function clsRank(c){c=String(c||"").trim().toLowerCase().replace(/^class\s*/,"");if(/^mon/.test(c))return 0;
 let m=/^(?:kindergarten|kinder garten|k\.?g\.?)\s*-?\s*(1|2|one|two|ii|i)(?![a-z0-9])/.exec(c);if(m)return /^(1|one|i)$/.test(m[1])?1:2;
 if(/^(?:nursery|prep|k\.?g\.?|kindergarten)\b/.test(c))return 1;
 m=/^(\d+)/.exec(c);if(m)return 2+(+m[1]);
 m=/^(viii|vii|vi|iv|ix|iii|ii|i|v|x)(?![a-z])/.exec(c);if(m)return 2+ROMN[m[1]];return 99}
function kparts(k){const p=String(k).split("|");return p.length===3?{sh:p[0],c:p[1],sec:p[2]}:{sh:"",c:p[0]||"",sec:p[1]||""}}
function kcmp(a,b){const x=kparts(a),y=kparts(b);return clsRank(x.c)-clsRank(y.c)||cmp(x.c,y.c)||cmp(x.sec,y.sec)||cmp(x.sh,y.sh)}
function SID(g){return String(g||"").toUpperCase()}
function GRV(g){const t=(S.students||[]).find(x=>x.gr===g)||{};return t.ref||"-"}
function IDX(g){const t=(S.students||[]).find(x=>x.gr===g)||{};return "ID "+SID(g)+(t.ref?" | GR "+t.ref:"")}
const NM={P:"Present",A:"Absent",L:"Late",V:"Leave"},COL={P:"ok",A:"no",L:"lt",V:"lv"};
const S={me:null,tab:"",students:[],key:"",date:today(),month:today().slice(0,7),att:{},users:[],ur:"all",uq:"",sq:"",sk:"all",edit:"",pwu:"",cf:"",pend:null,err:"",nk:"",dsh:"AM",sf:"AM"};
const IC={"dash": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/>", "take": "<polyline points=\"9 11 12 14 22 4\"/><path d=\"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11\"/>", "addstu": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"8.5\" cy=\"7\" r=\"4\"/><line x1=\"20\" y1=\"8\" x2=\"20\" y2=\"14\"/><line x1=\"23\" y1=\"11\" x2=\"17\" y2=\"11\"/>", "stu": "<circle cx=\"12\" cy=\"8\" r=\"7\"/><polyline points=\"8.21 13.89 7 23 12 20 17 23 15.79 13.88\"/>", "newt": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"8.5\" cy=\"7\" r=\"4\"/><polyline points=\"17 11 19 13 23 9\"/>", "usr": "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>", "ntc": "<path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"/>", "rep": "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/>", "pw": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>", "hw": "<path d=\"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z\"/><path d=\"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z\"/>", "child": "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>", "out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" y1=\"12\" x2=\"9\" y2=\"12\"/>", "menu": "<line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"/>", "x": "<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>", "eye": "<path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "eyeoff": "<path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/>"};
IC.moon='<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';IC.sun='<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="4.6" y1="4.6" x2="6.4" y2="6.4"/><line x1="17.6" y1="17.6" x2="19.4" y2="19.4"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.6" y1="19.4" x2="6.4" y2="17.6"/><line x1="17.6" y1="6.4" x2="19.4" y2="4.6"/>';
IC.wipe='<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>';
IC.ev='<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
IC.prof='<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';IC.racc='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';IC.promo='<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>';IC.arch='<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>';IC.subj='<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>';IC.gsc='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>';IC.reqs='<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
IC.res='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>';
const FT='<footer class="ft">&copy; 2026 SAJ Academy Hussainabad. All rights reserved.<br>Designed &amp; Developed by <b>Abdul Haseeb Vayani</b></footer>';
const shOf=k=>{const p=String(k).split("|");return p.length===3?p[0]:""};
const tsh=u=>u.shift||(()=>{const z=new Set((u.classes||[]).map(shOf).filter(Boolean));return z.size===1?[...z][0]:"BOTH"})();
const SHN={AM:"Morning",PM:"Afternoon",BOTH:"Both shifts"};
const applyShift=(c,sh)=>{const ex=c!=="nk"||!$("#trl")||$("#trl").value==="teacher";document.querySelectorAll("."+c).forEach(i=>{const x=shOf(i.value),hid=(sh!=="BOTH"&&x&&x!==sh)||(ex&&i.dataset.tk&&i.dataset.noex!=="1"),l=i.closest("label");if(hid)i.checked=false;if(l)l.style.display=hid?"none":""})};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const ADM=location.pathname.startsWith("/admin");
const LK="saj_u_"+(ADM?"a":"u");
const ask=async(title,text,ok="Yes, continue",danger)=>window.Swal?(await Swal.fire({title,text,icon:danger?"warning":"question",showCancelButton:true,confirmButtonText:ok,cancelButtonText:"Cancel",reverseButtons:true,focusCancel:true,confirmButtonColor:danger?"#e5484d":"#2f6fdf",cancelButtonColor:"#8fa3c7",...SW()})).isConfirmed:confirm(title+"\n"+text);
const info=(title,text)=>window.Swal?Swal.fire({title,text,icon:"info",confirmButtonColor:"#2f6fdf",...SW()}):alert(title+"\n"+text);
const Q={l:[],busy:false};try{Q.l=JSON.parse(localStorage.getItem("saj_q")||"[]")}catch{}
const qsave=()=>{try{localStorage.setItem("saj_q",JSON.stringify(Q.l))}catch{}};
const bn=()=>{let b=$("#qb");if(!b){b=document.createElement("div");b.id="qb";document.body.appendChild(b)}b.style.display=Q.l.length?"block":"none";b.textContent="No connection: "+Q.l.length+" attendance change(s) waiting to be sent. Please keep this page open."};
async function flush(){if(Q.busy||!Q.l.length||!S.me)return;Q.busy=true;try{while(Q.l.length){const it=Q.l[0];try{await Promise.race([setDoc(doc(db,"att",it.id),it.d),new Promise((_,j)=>setTimeout(()=>j(new Error("timeout")),8000))])}catch(x){if(x.code==="permission-denied"){Q.l.shift();qsave();toast("A change was rejected: you are not allowed to mark that student",true);continue}throw x}Q.l.shift();qsave();bn()}}catch{}Q.busy=false;bn()}
setInterval(flush,15000);addEventListener("online",flush);
let lastA=Date.now();["click","keydown","touchstart","mousemove"].forEach(v=>addEventListener(v,()=>{lastA=Date.now()},{passive:true}));
setInterval(()=>{if(!S.me)return;const lim=(S.me.role==="parent"?60:30)*60000,t0=+(sessionStorage.saj_login||0);if(Date.now()-lastA>lim||Date.now()-t0>8*3600000){S.err="Your session has expired. Please log in again.";signOut(auth)}},30000);
async function xl(t){await run(async()=>{const k=S.key,l=inKey(k);if(!l.length)throw new Error("No students in this class");const rows=t==="d"?cnt(await attKD(k,S.date)):await attMonth(k,S.month),m={};let a;
 if(t==="d"){rows.forEach(x=>m[x.gr]=x.status);a=[["Roll","Student ID","Name","Father","Status"],...l.map(s=>[s.roll,SID(s.gr),s.name,s.father,NM[m[s.gr]]||(offDay(S.date)?"Holiday":"-")])]}
 else{const [y,mo]=S.month.split("-").map(Number),n=new Date(y,mo,0).getDate();rows.forEach(x=>m[x.gr+"|"+x.date]=x.status);a=[["Roll","Student ID","Name",...[...Array(n)].map((_,i)=>i+1),"Present","Absent","Late","Leave","%"],...l.map(s=>{const c={P:0,A:0,L:0,V:0},r=[...Array(n)].map((_,i)=>{const x=m[s.gr+"|"+S.month+"-"+String(i+1).padStart(2,"0")];if(x)c[x]++;return x||(offDay(S.month+"-"+String(i+1).padStart(2,"0"))?"H":"")});return [s.roll,SID(s.gr),s.name,...r,c.P,c.A,c.L,c.V,c.P+c.A+c.L+c.V?pct(c):""]})]}
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a),"Attendance");XLSX.writeFile(wb,`attendance-${t==="m"?S.month:S.date}-class-${k.replace(/\|/g,"-")}.xlsx`)})}loadLogos().catch(()=>{}); /* trimmed SAJ + OMYS logos, shared by every report */
function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(toast.t);toast.t=setTimeout(()=>t.className="",3500)}
async function api(action,data={}){const h={"Content-Type":"application/json"};if(auth.currentUser)h.Authorization="Bearer "+await auth.currentUser.getIdToken();
 const r=await fetch("/api/rpc",{method:"POST",headers:h,body:JSON.stringify({action,...data})});const j=await r.json().catch(()=>({error:"No response from server"}));if(!r.ok)throw new Error(j.error||"Error");if(STUA.has(action))bustAll();return j}
const run=async f=>{document.body.classList.add("busy");try{await f()}catch(x){toast(x.message,true)}finally{document.body.classList.remove("busy")}};
/* ---------- data ---------- */
const keys=()=>S.me.role==="admin"?[...new Set(S.students.map(s=>s.key))].sort(kcmp):S.me.classes;
const inKey=k=>S.students.filter(s=>s.key===k).sort((a,b)=>(+a.roll||0)-(+b.roll||0)||a.name.localeCompare(b.name));
async function loadStudents(){const m=S.me,c=collection(db,"students");
 const qs=m.role==="admin"?[query(c)]:m.role==="teacher"?m.classes.map(k=>query(c,where("key","==",k))):[query(c,where("gr","==",m.gr))];
 const all=await cached("stu:"+(m.role==="admin"?"all":m.role==="teacher"?m.classes.join(","):m.gr),15*MIN,async()=>(await Promise.all(qs.map(getDocs))).flatMap(s=>s.docs.map(d=>d.data())));S.left=all.filter(x=>x.left);S.students=all.filter(x=>!x.left)}
const rd=async qs=>(await Promise.all(qs.map(getDocs))).flatMap(s=>s.docs.map(d=>d.data()));
const cnt=a=>a.filter(x=>x.ok!==false),rdC=q=>rd(q).then(cnt); /* draft attendance (ok:false) is not counted until confirmed */
const attDates=(ds,ks)=>cached("att:d:"+ds.join(",")+":"+(S.me.role==="admin"?"all":ks.join(",")),(ds.length>1?3:1.5)*MIN,()=>rdC(S.me.role==="admin"?[query(ac,where("date","in",ds))]:ks.map(k=>query(ac,where("key","==",k),where("date","in",ds)))));
const attKD=(k,d)=>rd([query(ac,where("key","==",k),where("date","==",d))]);
const attMonth=(k,m)=>cached("att:m:"+k+":"+m,5*MIN,()=>rdC([query(ac,where("key","==",k),where("month","==",m))]));
const tally=rows=>{const r={P:0,A:0,L:0,V:0};rows.forEach(x=>r[x.status]++);return r};
const pct=c=>{const t=c.P+c.A+c.L+c.V;return t?Math.round((c.P+c.L)*100/t):0};
/* ---------- auth ---------- */
onAuthStateChanged(auth,async u=>{if(!u){bustAll();S.me=null;return render()}
 const c=(await u.getIdTokenResult(true)).claims;S.me={u:u.uid,role:c.role,title:c.title||c.role,name:c.name||u.uid,gr:c.gr,classes:[...(c.classes||[])].sort(kcmp),inc:!!c.inc,mc:!!c.mc,ck:c.ck||""};
 S.tab=S.me.mc?"pw":S.me.role==="parent"?"child":"dash";try{await loadStudents()}catch(x){toast("Could not load data: "+x.message,true)}await loadEv();await loadCfg();await loadReqN();render()});
/* ---------- layout ---------- */
const NAV={admin:[["dash","","Dashboard"],["take","","Attendance"],["str","","Strength"],["logs","","Activity Logs"],["addstu","","Add Student"],["stu","","Students"],["left","","Left Students"],["newt","","Add User"],["usr","","Users"],["subj","","Subjects"],["gsc","","Grading Scale"],["ntc","","Notices"],["ev","","Events"],["rep","","Reports"],["res","","Results"],["reqs","","Edit Requests"],["racc","","Result Access"],["promo","","Promotion"],["arch","","Year Archive"],["pw","","Password"],["wipe","","Reset All Data"]],
 incharge:[["dash","","Dashboard"],["stu","","Students"],["rep","","Reports"],["res","","Results"],["ntc","","Notices"],["prof","","My Profile"],["pw","","Password"]],
 teacher:[["dash","","Dashboard"],["take","","Attendance"],["stu","","Student List"],["hw","","Homework"],["ntc","","Notices"],["rep","","Reports"],["res","","Results"],["prof","","My Profile"],["pw","","Password"]],
 parent:[["child","","My Child"],["res","","Results"],["prof","","Child Profile"],["hw","","Homework"],["ntc","","Notices"],["pw","","Password"]]};
const empty=t=>`<div class="card empty">${t}</div>`;
const ksel=()=>{const all=keys(),shs=[...new Set(all.map(shOf).filter(Boolean))].sort();if(shs.length&&!shs.includes(S.sf))S.sf=shs[0];
 const ks=shs.length>=1?all.filter(k=>!shOf(k)||shOf(k)===S.sf):all;if(!ks.includes(S.key))S.key=ks[0]||"";
 const ss=shs.length>=1?`<select data-c="sf">${shs.map(x=>`<option value="${x}" ${x===S.sf?"selected":""}>${SHN[x]} shift</option>`).join("")}</select>`:"";
 return ss+`<select data-c="key">${ks.map(k=>`<option value="${e(k)}" ${k===S.key?"selected":""}>Class ${e(shs.length?kn(k).replace(/\s*\((Morning|Afternoon|Both shifts)\)\s*$/,""):kn(k))}</option>`).join("")}</select>`};
function login(){let su="",mgn=false;try{su=localStorage.getItem(LK)||"";if(sessionStorage.saj_mgmt){mgn=true;delete sessionStorage.saj_mgmt}}catch{}
 const tabs=[["admin","child","Admin"],["principal","stu","Principal"],["teacher","hw","Teachers"],["incharge","usr","Incharges"]],
  d=ADM?(mgn?"Please sign in here with your ID and password.":"Access your dashboard and manage school operations."):"Access your child's academic progress, attendance and more.";
 return `<div class="login${ADM?" adm":""}"><form class="lc" onsubmit="return false" autocomplete="on"><div class="lhead"><div class="llogo"><img src="/assets/logo.jpg" alt="SAJ Academy"></div><h1>SAJ ACADEMY</h1><div class="ltag">LEARN<i>|</i>GROW<i>|</i>SUCCEED</div><div class="lgold"></div></div>
<div class="lbody"><div class="lkick">${ADM?"MANAGEMENT PORTAL":"PARENT PORTAL"}</div><h2 class="lt">Login</h2><p class="ld">${d}</p>
${ADM?`<div class="rts">${tabs.map((t,i)=>`<button type="button" class="rt${i?"":" on"}" data-a="rtab" data-r="${t[0]}">${ic(t[1])}<span>${t[2]}</span></button>`).join("")}</div>`:""}
<div class="ig"><span class="lic">${ic("child")}</span><input id="lu" name="username" value="${e(su)}" placeholder="${ADM?"Username":"Student ID (e.g. SAJ-0001)"}" autocapitalize="off" autocomplete="username"></div><div class="ig pg"><span class="lic">${ic("pw")}</span><input id="lp" name="password" type="password" placeholder="Password" autocomplete="current-password"><span class="eye" data-a="eye" role="button" aria-label="Show password">${ic("eye")}</span></div><div class="lrow"><label class="rm"><input type="checkbox" id="rm" ${su?"checked":""}>Remember me</label><button type="button" class="lk" data-a="forgot">Forgot password?</button></div><button type="button" data-a="login" id="lb">Login <span aria-hidden="true">&rarr;</span></button>${S.err?`<div class="err">${e(S.err)}</div>`:""}
<div class="lfor">${ic("usr")}<span>${ADM?"For Management Staff Only":"For Parents Only"}</span></div></div><div class="lwave"><span>SAJ ACADEMY &nbsp;&ndash;&nbsp; HUSSAINABAD</span></div></form>${FT}</div>`}
async function render(){const r=$("#root");document.body.dataset.theme=S.me?(S.me.role==="admin"?"admin":S.me.role==="parent"?"parent":"teacher"):(ADM?"admin":"parent");if(!S.me){r.innerHTML=login();return}const _n0=$(".nav"),_s0=$(".sb"),_nt=_n0?_n0.scrollTop:0,_st=_s0?_s0.scrollTop:0;
 const nav=S.me.mc?[["pw","","Change Password"]]:(NAV[S.me.inc?"incharge":S.me.role]||[]).filter(n=>n[0]!=="logs"||S.me.u==="admin"),cur=nav.find(n=>n[0]===S.tab)||(S.tab==="tprof"?nav.find(n=>n[0]==="stu"):S.tab==="prof"?["prof","","Profile"]:nav[0])||nav[0];S.tab=cur[0];
 r.innerHTML=`<div class="shell"><div class="ov" data-a="menu"></div><aside class="sb"><div class="brand"><button class="g xs" data-a="menu" aria-label="Close menu">${ic("x")}</button><img src="/assets/logo.jpg" alt=""><b>SAJ ACADEMY</b><small>Hussainabad</small></div><div class="nav">${nav.map(n=>`<button class="${n[0]===S.tab?"on":""}" data-a="tab" data-t="${n[0]}">${ic(n[0])}<span>${n[2]}</span>${n[0]==="reqs"&&S.reqN?`<em class="bdg">${S.reqN}</em>`:""}</button>`).join("")}</div><button class="out" data-a="logout">${ic("out")}<span>Logout</span></button></aside>
 <main><div class="top"><button class="g menu" data-a="menu" aria-label="Menu">${ic("menu")}</button><h2>${cur[2]}</h2><button class="s g" data-a="mode" id="mt" title="Dark / light mode" aria-label="Dark or light mode" style="margin-left:auto;padding:6px 9px;line-height:0">${ic(document.body.dataset.mode==="dark"?"sun":"moon")}</button><button class="s g" data-a="rfr" title="Load the latest data">&#8635; Refresh</button><div class="chip"><span>${e(S.me.name)}</span><i>${e(S.me.title||S.me.role)}</i></div></div><div id="view"><div class="empty ldg"><span class="spn"></span>Loading...</div></div>${FT}</main></div>`;{const _v=$("#view");if(_v&&S._lt!==S.tab){S._lt=S.tab;_v.classList.add("vin");setTimeout(()=>{const z=document.getElementById("view");if(z)z.classList.remove("vin")},3000)}}{const _n1=$(".nav"),_s1=$(".sb");if(_n1)_n1.scrollTop=_nt;if(_s1)_s1.scrollTop=_st;hideLd()}
 const tab=S.tab;try{const h=await V[tab]();if(S.tab===tab&&$("#view"))$("#view").innerHTML=h}catch(x){const w=$("#view");if(w)w.innerHTML=empty("Error: "+e(x.message))}}
/* ---------- views ---------- */
const V={};
V.dash=async()=>{const ks=keys();if(!ks.length)return empty(S.me.role==="admin"?"No students yet. Add or import them from the Students tab.":"No class has been assigned to you yet. Please contact the admin.");
 const d=today(),ds=[...Array(7)].map((_,i)=>{const x=new Date();x.setDate(x.getDate()-6+i);return ymd(x)}),rows=await attDates(ds,ks),n=S.students.length;
 const t=tally(rows.filter(x=>x.date===d)),mk=t.P+t.A+t.L+t.V;
 const card=(l,v,c)=>`<div class="kp" style="--c:var(--${c})"><small>${l}</small><b>${v}</b></div>`;
 const chart=ds.map(day=>{const c=tally(rows.filter(x=>x.date===day)),h=v=>Math.min(100,v*100/Math.max(n,1));
  return `<div class="col"><div class="stack" title="${day}"><div style="height:${h(c.P)}%;background:var(--ok)"></div><div style="height:${h(c.L)}%;background:var(--lt)"></div><div style="height:${h(c.V)}%;background:var(--lv)"></div><div style="height:${h(c.A)}%;background:var(--no)"></div></div><small>${day.slice(8)}/${day.slice(5,7)}</small></div>`}).join("");
 const tr=ks.map(k=>{const l=inKey(k),c=tally(rows.filter(x=>x.date===d&&x.key===k)),p=pct(c),m=c.P+c.A+c.L+c.V;
  return `<tr><td><b>${e(kn(k))}</b></td><td>${l.length}</td><td>${c.P}</td><td>${c.A}</td><td>${c.L}</td><td>${c.V}</td><td>${offDay(d)?0:l.length-m}</td><td><div class="bar"><i style="width:${p}%"></i></div></td><td>${m?p+"%":"-"}</td></tr>`}).join("");
 return `<div class="cards">${card("Total Students",n,"pr")}${card("Present",t.P,"ok")}${card("Absent",t.A,"no")}${card("Late",t.L,"lt")}${card("Leave",t.V,"lv")}${card("Not marked",offDay(d)?0:n-mk,"mu")}${card("Today %",mk?pct(t)+"%":"-","pr2")}</div>
 <div class="card"><h3>Last 7 days attendance</h3><div class="chart">${chart}</div><div class="legend"><span><i class="dot" style="background:var(--ok)"></i>Present</span><span><i class="dot" style="background:var(--lt)"></i>Late</span><span><i class="dot" style="background:var(--lv)"></i>Leave</span><span><i class="dot" style="background:var(--no)"></i>Absent</span></div></div>
 <div class="card"><h3>Today (${d}) - by class</h3><div class="tw"><table><tr><th>Class</th><th>Total</th><th>P</th><th>A</th><th>L</th><th>Lv</th><th>Pending</th><th>Rate</th><th>%</th></tr>${tr}</table></div></div>`+(()=>{const pn=offDay(d)?[]:ks.filter(k=>inKey(k).length&&!rows.some(x=>x.date===d&&x.key===k));return `<div class="card"><h3>Attendance pending today (${pn.length})</h3>${pn.length?pn.map(k=>`<span class="pill no">${e(kn(k))}</span>`).join(" "):'<p class="mu">Attendance has been marked for every class today.</p>'}</div><div class="card"><h3>Frequent absentees (${today().slice(0,7)})</h3><p class="mu">Students with 3+ absences this month.</p><button data-a="fa">Check now</button><div id="fa" style="margin-top:12px"></div></div>`})()};
V.take=async()=>{const ks=keys();if(!ks.length)return empty("No classes available.");const sel=ksel(),rows=await attKD(S.key,S.date);S.att={};rows.forEach(x=>S.att[x.gr]=x.status);
 const l=inKey(S.key);
 return `<div class="card"><h3>Take Attendance</h3><div class="row">${sel}<input type="date" value="${S.date}" max="${today()}" data-c="date"><button data-a="allp">Mark All Present</button><span id="cnt" class="mu"></span></div><input class="sch" data-live placeholder="Search name / GR / roll no">
 <div class="tw"><table><tr><th>Roll</th><th>Student</th><th>Status</th></tr>${l.map(s=>`<tr data-r="${e(s.gr)}"><td>${e(s.roll)}</td><td><b>${e(s.name)}</b><br><span class="mu">ID ${e(SID(s.gr))}${s.ref?" | GR "+e(s.ref):""} | ${e(s.father)}</span></td><td><div class="st">${["P","A","L","V"].map(c=>`<button class="${c} ${S.att[s.gr]===c?"on":""}" data-a="mark" data-g="${e(s.gr)}" data-s="${c}">${c==="V"?"Lv":c}</button>`).join("")}</div></td></tr>`).join("")}</table></div>
 <p class="mu">P Present · A Absent · L Late · Lv Leave. Press Confirm at the bottom to save.</p></div>`};
V.stu=async()=>{const ssh=S.ssh||"all",ks=keys().filter(k=>ssh==="all"||shOf(k)===ssh),q=S.sq.toLowerCase(),l=S.students.filter(s=>(ssh==="all"||shOf(s.key)===ssh)&&(S.sk==="all"||s.key===S.sk)&&(s.name+s.gr+(s.ref||"")+s.father).toLowerCase().includes(q)).sort((a,b)=>cmp(shOf(a.key),shOf(b.key))||kcmp(a.key,b.key)||(+a.roll||0)-(+b.roll||0));
 const inp=(i,p,w)=>`<input id="${i}" placeholder="${p}" size="${w}">`;
 return `<div class="card"><h3>Add Student (manual)</h3><div class="row">${inp("sg","GR No (optional)",8)}${inp("sn","Student name *",16)}${inp("sf","Father name",14)}<select id="sh"><option value="AM">Morning shift</option><option value="PM">Afternoon shift</option></select>${inp("sc","Class *",6)}${inp("ss","Section",6)}${inp("sr","Roll (auto)",5)}${inp("sp","Phone",12)}<button data-a="addstu">Add Student</button></div><details class="card" style="margin:10px 0 0"><summary style="cursor:pointer;font-weight:600">More details (optional)</summary><div class="row" style="margin-top:10px"><label class="mu">Date of birth <input type="date" id="sd" max="${today()}"></label><select id="sbg"><option value="">Blood group</option>${BGL.map(b=>`<option>${b}</option>`).join("")}</select>${inp("se","Email",20)}${inp("sa","Address",30)}</div></details><p class="mu">Student ID (SAJ-0001, SAJ-0002 ...) is given automatically. If Roll is empty, the next roll number of that class / section / shift is given automatically. Parent login: Student ID / 1234.</p></div>
 <div class="card"><h3>Import from Excel / CSV</h3><p class="mu" style="margin-top:0">Columns: GR No (optional, school record number), Name, Father, Class, Section, Roll (optional, automatic if empty), Phone, Shift. Student ID is given automatically. The shift below is used if your file has none.</p><div class="row"><select data-c="dsh"><option value="AM" ${S.dsh==="AM"?"selected":""}>Default shift: Morning shift</option><option value="PM" ${S.dsh==="PM"?"selected":""}>Default shift: Afternoon shift</option></select><input type="file" accept=".xlsx,.xls,.csv" data-c="file"><button class="g" data-a="tpl">Sample template</button></div>${S.pend?`<div class="row"><b>${S.pend.length} students found.</b><button data-a="doimp">Import</button><button class="g" data-a="noimp">Cancel</button></div>`:""}</div>
 <div class="card"><h3>Students (${S.students.length})</h3><div class="row"><select data-c="ssh"><option value="all">Both shifts</option><option value="AM" ${ssh==="AM"?"selected":""}>Morning shift</option><option value="PM" ${ssh==="PM"?"selected":""}>Afternoon shift</option></select><select data-c="sk"><option value="all">All classes</option>${ks.map(k=>`<option value="${e(k)}" ${S.sk===k?"selected":""}>${e(kn(k))}</option>`).join("")}</select><input placeholder="Search name / ID / GR" value="${e(S.sq)}" data-c="sq"></div>
 <div class="tw"><table class="ut"><tr><th>Student ID</th><th>GR</th><th>Name</th><th>Father</th><th>Class</th><th>Roll</th><th>Phone</th><th></th></tr>${l.slice(0,300).map(s=>`<tr><td><b>${e(SID(s.gr))}</b></td><td>${e(s.ref)}</td><td>${e(s.name)}</td><td>${e(s.father)}</td><td>${e(kn(s.key))}</td><td>${e(s.roll)}</td><td>${e(s.phone)}</td><td><div class="row" style="margin:0"><button class="s" data-a="sprof" data-g="${e(s.gr)}">Profile</button><button class="s g" data-a="prog" data-g="${e(s.gr)}">Progress</button>${S.me.role==="admin"?`<button class="s g" data-a="markleft" data-g="${e(s.gr)}">Left</button><button class="s g" data-a="delstu" data-g="${e(s.gr)}">Delete</button>`:""}</div></td></tr>`).join("")||'<tr><td colspan=8 class="mu">No students</td></tr>'}</table></div>${l.length>300?'<p class="mu">Showing the first 300. Use search or filter to narrow down.</p>':""}</div>`};
V.usr=async()=>{S.users=(await api("listUsers")).users;const ks=keys(),q=S.uq.toLowerCase();
 const l=S.users.filter(u=>(S.ur==="all"||u.role===S.ur)&&(u.username+(u.name||"")).toLowerCase().includes(q)).sort((a,b)=>cmp(a.role,b.role)||cmp(a.username,b.username));
 const tkn=self=>{const m={};S.users.forEach(u=>{if(u.role!=="teacher"||u.blocked||u.inc||u.username===self)return;(u.classes||[]).forEach(k=>{if(!m[k])m[k]=u.username})});return m};
 const cks=(sel,cls,sh,self,noex)=>{const tk=tkn(self);return ks.map(k=>{const x=shOf(k),hid=(sh&&sh!=="BOTH"&&x&&x!==sh)||(tk[k]&&!noex);return `<label class="ck" ${hid?'style="display:none"':""}><input type="checkbox" class="${cls}" value="${e(k)}" ${tk[k]?`data-tk="${e(tk[k])}"`:""} ${noex?'data-noex="1"':""} ${sel.includes(k)&&!hid?"checked":""}>${e(kn(k))}</label>`}).join("")||'<span class="mu">Add students first</span>'};
 return `<div class="card"><h3>Create User Login</h3><div class="row"><b>Role:</b><select id="trl" data-c="trl"><option value="teacher">Teacher</option><option value="incharge">Incharge (sees only the classes you choose)</option><option value="principal">Principal (full admin rights)</option><option value="admin">Admin (full admin rights)</option></select></div><div class="row"><input id="tu" placeholder="Username"><input id="tn" placeholder="Full name"><input id="tp" placeholder="Password" value="1234"></div><div class="row" id="trs"><b>Shift:</b><select id="tsh" data-c="ush"><option value="AM">Morning shift</option><option value="PM">Afternoon shift</option><option value="BOTH">Both shifts</option></select></div><div class="row" id="trc"><b>Classes:</b>${cks([],"nk","AM","",false)}</div><p class="mu" id="tkn" style="margin:4px 0 8px">Classes that already have an active teacher are hidden here. They appear again when that teacher is blocked or deleted.</p><button data-a="addtch">Create User</button></div>
 <div class="card"><h3>All Users (${S.users.length})</h3><div class="row"><select data-c="ur">${["all","admin","teacher","parent"].map(r=>`<option value="${r}" ${S.ur===r?"selected":""}>${r}</option>`).join("")}</select><input placeholder="Search" value="${e(S.uq)}" data-c="uq"></div>
 <div class="tw"><table class="ut"><tr><th>Username</th><th>Name</th><th>Role</th><th>Classes</th><th>Status</th><th>Actions</th></tr>${l.slice(0,300).map(u=>{const a=u.username,x=a!=="admin";
  const ed=S.edit===a?`<tr><td colspan=6><div class="row"><input id="en" value="${e(u.name)}"><select id="esh" data-c="esh">${["AM","PM","BOTH"].map(x=>`<option value="${x}" ${tsh(u)===x?"selected":""}>${SHN[x]}</option>`).join("")}</select>${cks(u.classes||[],"ek",tsh(u),a,!!u.inc)}<button class="s" data-a="savetch" data-u="${e(a)}">Save</button></div></td></tr>`:"",pw=S.pwu===a?`<tr><td colspan=6><div class="row"><input id="np" placeholder="New password"><button class="s" data-a="setpw" data-u="${e(a)}">Set password</button></div></td></tr>`:"";
  return `<tr><td><b>${e(a)}</b></td><td>${e(u.name)}</td><td>${u.role==="admin"||u.role==="teacher"?e(u.title||u.role):u.role}${u.role==="teacher"?" ("+SHN[tsh(u)]+")":""}</td><td>${u.role==="teacher"?e((u.classes||[]).map(kn).join(", "))||"-":"-"}</td><td><span class="pill ${u.blocked?"no":"ok"}">${u.blocked?"Blocked":"Active"}</span></td><td><div class="row" style="margin:0"><button class="s" data-a="uprof" data-u="${e(a)}">Profile</button>${x?`<button class="s g" data-a="blk" data-u="${e(a)}">${u.blocked?"Unblock":"Block"}</button><button class="s g" data-a="rpw" data-u="${e(a)}">Reset 1234</button><button class="s g" data-a="spw" data-u="${e(a)}">Set pw</button>${u.role==="teacher"?`<button class="s g" data-a="edt" data-u="${e(a)}">Edit</button>`:""}<button class="s ${"g"}" data-a="delu" data-u="${e(a)}">${"Delete"}</button>`:""}</div></td></tr>${ed}${pw}`}).join("")}</table></div></div>`};
V.rep=async()=>{if(!keys().length)return empty("No classes available.");
 return `<div class="card"><h3>PDF Reports</h3><div class="row">${ksel()}</div><div class="row"><b style="width:70px">Daily</b><input type="date" value="${S.date}" max="${today()}" data-c="date"><button data-a="pdfd">Daily PDF</button><button class="g" data-a="prd">Daily Print</button><button class="g" data-a="xld">Daily Excel</button></div><div class="row"><b style="width:70px">Monthly</b><input type="month" value="${S.month}" data-c="month"><button data-a="pdfm">Monthly PDF</button><button class="g" data-a="prm">Monthly Print</button><button class="g" data-a="xlm">Monthly Excel</button></div></div>`};
V.child=async()=>{const s=S.students[0];if(!s)return empty("Student record not found.");
 const rows=await cached("att:g:"+s.gr+":"+S.month,10*MIN,()=>rdC([query(ac,where("gr","==",s.gr),where("month","==",S.month))])),m={};rows.forEach(x=>m[x.date]=x.status);const c=tally(rows),[y,mo]=S.month.split("-").map(Number),n=new Date(y,mo,0).getDate(),off=(new Date(y,mo-1,1).getDay()+6)%7;
 let cal=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>`<div class="h">${d}</div>`).join("")+"<div style='background:none'></div>".repeat(off);
 for(let i=1;i<=n;i++){const dk=S.month+"-"+String(i).padStart(2,"0"),v=m[dk],o=v?"":offDay(dk);cal+=`<div class="${v||(o?"H":"")}">${i}<b>${v?NM[v]:(o?(/weekly/.test(o)?"Off":"Holiday"):"")}</b></div>`}
 const card=(l,v,k)=>`<div class="kp" style="--c:var(--${k})"><small>${l}</small><b>${v}</b></div>`;
 return `<div class="card"><h3>${e(s.name)}</h3><p class="mu" style="margin:0">ID ${e(SID(s.gr))} | Class ${e(kn(s.key))} | Roll ${e(s.roll)} | Father: ${e(s.father)}</p></div>
 <div class="row"><input type="month" value="${S.month}" data-c="month"></div><div class="cards">${card("Present",c.P,"ok")}${card("Absent",c.A,"no")}${card("Late",c.L,"lt")}${card("Leave",c.V,"lv")}${card("Attendance %",c.P+c.A+c.L+c.V?pct(c)+"%":"-","pr")}</div>
 <div class="card"><h3>${S.month} ${"Calendar"}</h3><div class="cal">${cal}</div></div>`};
V.pw=async()=>`<div class="card" style="max-width:460px"><h3>Change Password</h3>${S.me.mc?'<p class="mu">Please set a new password to continue.</p>':""}<div class="row"><input id="po" type="password" placeholder="Current password" style="width:100%"></div><div class="row"><input id="pn" type="password" placeholder="New password" style="width:100%"></div><div class="row"><input id="pc" type="password" placeholder="Confirm new password" style="width:100%"></div><button data-a="chpw">Save Password</button></div>`;
V.wipe=async()=>`<div class="card" style="max-width:560px;border-color:rgba(255,107,107,.5)"><h3 style="color:var(--no)">Reset All Data</h3><p class="mu" style="margin-top:0">Deletes ALL students, logins, attendance, results, homework and notices. Cannot be undone.</p><div class="row"><input id="wc" placeholder="Type DELETE to confirm" autocomplete="off"></div><div class="row"><input id="wp" type="password" placeholder="Admin password" autocomplete="current-password"></div><button class="d" data-a="wipe">Delete Everything</button></div>`;
const SP=(h,m)=>h.split(m);
V.stuAll=V.stu;V.addstu=async()=>SP(await V.stuAll(),'<div class="card"><h3>Students (')[0];V.stu=async()=>'<div class="card"><h3>Students ('+SP(await V.stuAll(),'<div class="card"><h3>Students (')[1];
V.usrAll=V.usr;V.newt=async()=>SP(await V.usrAll(),'<div class="card"><h3>All Users (')[0];V.usr=async()=>'<div class="card"><h3>All Users ('+SP(await V.usrAll(),'<div class="card"><h3>All Users (')[1];
V.hw=async()=>{const m=S.me,sel=m.role==="teacher"?ksel():"";if(m.role==="teacher"&&!keys().length)return empty("No class assigned.");
 const k=m.role==="parent"?m.ck:S.key,rows=k?await cached("hw:"+k+":"+S.month,10*MIN,()=>rd([query(collection(db,"hw"),where("key","==",k),where("month","==",S.month))])):[];rows.sort((a,b)=>b.date.localeCompare(a.date)||b.at-a.at);
 const f=m.role==="teacher"?`<div class="card"><h3>New Homework</h3><div class="row"><input type="date" id="hd" value="${today()}"><input id="hs" placeholder="Subject"></div><div class="row"><textarea id="ht" rows="3" placeholder="Homework details" style="width:100%"></textarea></div><button data-a="addhw">Post Homework</button></div>`:"";
 return f+`<div class="row">${sel}<input type="month" value="${S.month}" data-c="month"></div>`+(rows.map(x=>`<div class="card hw"><b>${e(x.subject)}</b> <span class="mu">${x.date} | ${e(x.byName)}</span><p>${e(x.text)}</p>${m.role==="teacher"?`<button class="s g" data-a="delhw" data-i="${x.id}">Delete</button>`:""}</div>`).join("")||empty("No homework"))};
const stOpts=k=>inKey(k).map(s=>`<option value="${e(s.gr)}">${s.roll?e(s.roll)+" - ":""}${e(s.name)} (${e(SID(s.gr))})</option>`).join("")||'<option value="">No students in this class</option>';
V.ntc=async()=>{const m=S.me,ad=m.role==="admin",ks=ad?keys():[];
 const bc=(await cached("nt:all",10*MIN,()=>rd([query(collection(db,"notices"),orderBy("at","desc"),limit(40))]))).map(x=>({...x,k:"all"}));
 let pn=[];if(ad||m.role==="parent"){try{pn=(await cached("nt:one:"+(ad?"all":m.gr),10*MIN,()=>rd([ad?query(collection(db,"pnotices"),orderBy("at","desc"),limit(60)):query(collection(db,"pnotices"),where("gr","==",m.gr))]))).map(x=>({...x,k:"one"}))}catch(x){toast("Individual notices could not be loaded. Publish the latest firestore.rules in Firebase.",true)}}
 const rows=[...bc,...pn].sort((a,b)=>b.at-a.at).slice(0,40);
 if(ad&&!ks.includes(S.nk))S.nk=ks[0]||"";
 const f=ad?`<div class="card"><h3>New Notice</h3><div class="row"><select id="nm" data-c="nm"><option value="all">All students</option><option value="one">Individual student</option></select></div><div id="nind" class="row" style="display:none"><select id="nc" data-c="nc">${ks.map(k=>`<option value="${e(k)}" ${k===S.nk?"selected":""}>Class ${e(kn(k))}</option>`).join("")}</select><select id="ns">${stOpts(S.nk)}</select></div><div class="row"><input id="nt" placeholder="Title" style="width:100%"></div><div class="row"><textarea id="nb" rows="3" placeholder="Message" style="width:100%"></textarea></div><button id="nbtn" data-a="addntc">Publish to all</button></div>`:"";
 const tag=x=>ad?(x.k==="one"?`<span class="pill lt">To: ${e(x.sname)} (${e(SID(x.gr))}${x.key?", "+e(kn(x.key)):""})</span>`:`<span class="pill ok">All students</span>`):(x.k==="one"?`<span class="pill lt">For your child</span>`:"");
 return f+(rows.map(x=>`<div class="card hw"><b>${e(x.title)}</b> ${tag(x)} <span class="mu">${new Date(x.at).toLocaleDateString()}</span><p>${e(x.text)}</p>${ad?`<button class="s g" data-a="delntc" data-k="${x.k}" data-i="${x.id}">Delete</button>`:""}</div>`).join("")||empty("No notices"))};
/* ---------- actions ---------- */
const v=i=>($("#"+i)?.value||"").trim(),ck=c=>[...document.querySelectorAll("."+c+":checked")].map(x=>x.value);
const H={
 async login(){const b=$("#lb");b.disabled=true;showLd("Signing in...");try{let r;try{r=await api("login",{username:v("lu"),password:$("#lp").value,portal:ADM?"admin":"user",as:ADM?(document.querySelector(".rt.on")||{dataset:{}}).dataset.r:undefined})}catch(x){if(!ADM&&/Management Console/i.test(x.message)){try{sessionStorage.saj_mgmt="1"}catch{}location.assign("/admin/login");return}throw x}S.err="";try{if($("#rm").checked)localStorage.setItem(LK,v("lu"));else localStorage.removeItem(LK)}catch{}try{sessionStorage.saj_login=Date.now()}catch{}lastA=Date.now();await setPersistence(auth,browserSessionPersistence);await signInWithCustomToken(auth,r.token)}catch(x){hideLd();S.err=x.message;render()}},
 rtab(d){document.querySelectorAll(".rt").forEach(b=>b.classList.toggle("on",b.dataset.r===d.r));const u=$("#lu");if(u){u.placeholder={admin:"Admin username",principal:"Principal username",teacher:"Teacher username",incharge:"Incharge username"}[d.r]||"Username";u.focus()}},
 mode(){const d=document.body.dataset.mode!=="dark";document.body.dataset.mode=d?"dark":"light";try{localStorage.setItem("saj_mode",d?"dark":"light")}catch{}const b=$("#mt");if(b)b.innerHTML=ic(d?"sun":"moon")},
 eye(){const p=$("#lp"),h=p.type==="password";p.type=h?"text":"password";$(".eye").innerHTML=ic(h?"eyeoff":"eye")},
 async rfr(){bustAll();await run(async()=>{await loadStudents();await loadCfg();await loadReqN();await loadEv();render();toast("Data refreshed")})},tab(d){S.tab=d.t;S.rs="";S.cf="";S.edit="";S.pwu="";document.body.classList.remove("mo");render()},menu(){document.body.classList.toggle("mo")},async logout(){if(await ask("Log out?",Q.l.length?Q.l.length+" attendance change(s) are not sent yet. They will be sent when you log in again with the same account.":"You will need to sign in again.","Log out",Q.l.length>0)){try{await Promise.race([api("logEvent",{type:"logout",text:"Logged out"}),new Promise(r=>setTimeout(r,1500))])}catch{}signOut(auth)}},
 forgot(){ADM?info("Forgot admin password?","Log in with the ADMIN_PASSWORD value saved in your Vercel project (Settings > Environment Variables). It always works for recovery. After logging in, set a new password from the Password tab."):info("Forgot your password?","Please contact the school office. The admin can reset your password to 1234 from the Users panel, and you will then be asked to choose a new one. Parents: your username is your child's Student ID (for example SAJ-0001).")},
 async mark(d){const id=S.date+"_"+d.g;if(S.date>today())return toast("Attendance cannot be marked for a future date",true);const st=S.students.find(x=>x.gr===d.g);S.att[d.g]=d.s;paint(d.g);Q.l=Q.l.filter(x=>x.id!==id);Q.l.push({id,d:{gr:d.g,date:S.date,month:S.date.slice(0,7),key:st.key,status:d.s,ok:S.me.role==="admin"||!!S.lk,by:S.me.u,at:Date.now()}});qsave();flush()},
 async markOld(d){if(S.date>today())return toast("Attendance cannot be marked for a future date",true);const st=S.students.find(x=>x.gr===d.g);
  await run(async()=>{await setDoc(doc(db,"att",S.date+"_"+d.g),{gr:d.g,date:S.date,month:S.date.slice(0,7),key:st.key,status:d.s,ok:S.me.role==="admin"||!!S.lk,by:S.me.u,at:Date.now()});S.att[d.g]=d.s;paint(d.g)})},
 async allp(){if(S.date>today())return toast("Attendance cannot be marked for a future date",true);if(!await ask("Mark all present?","Every student in this class will be marked present for "+S.date+".","Yes, mark all"))return;const l=inKey(S.key);l.forEach(s=>{const id=S.date+"_"+s.gr;Q.l=Q.l.filter(x=>x.id!==id);Q.l.push({id,d:{gr:s.gr,date:S.date,month:S.date.slice(0,7),key:s.key,status:"P",ok:S.me.role==="admin"||!!S.lk,by:S.me.u,at:Date.now()}});S.att[s.gr]="P";paint(s.gr)});qsave();flush();toast("All marked present")},
 async addstu(){await run(async()=>{rollFree([{name:v("sn"),shift:v("sh"),cls:v("sc"),sec:v("ss"),roll:v("sr")}]);const r=await api("importStudents",{rows:[{ref:v("sg"),name:v("sn"),father:v("sf"),shift:v("sh"),cls:v("sc"),sec:v("ss"),roll:v("sr"),phone:v("sp"),dob:v("sd"),bg:v("sbg"),email:v("se"),addr:v("sa")}]});if(!r.added&&!r.updated)throw new Error("Name and Class are required");await loadStudents();toast(r.added?"Student added. ID: "+SID((r.ids||[])[0]):"Student updated");render()})},
 tpl(){const ws=XLSX.utils.aoa_to_sheet([["GR No","Name","Father","Class","Section","Roll","Phone","Shift","Date of Birth","Blood Group","Email","Address"],["1001","Ali Khan","Ahmed Khan","5","A","","03001234567","Morning","2015-03-21","B+","parent@example.com","House 12, Hussainabad"]]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Students");XLSX.writeFile(wb,"students-template.xlsx")},
 async doimp(){await run(async()=>{rollFree(S.pend.map(r=>({...r,shift:r.shift||v("dsh")||S.dsh})));let a=0,u=0,k=0;for(let i=0;i<S.pend.length;i+=300){toast("Importing... "+Math.min(i+300,S.pend.length)+"/"+S.pend.length);const r=await api("importStudents",{rows:S.pend.slice(i,i+300),shift:v("dsh")||S.dsh});a+=r.added;u+=r.updated;k+=r.skipped}
  S.pend=null;await loadStudents();toast(`${a} added, ${u} updated, ${k} skipped`);render()})},noimp(){S.pend=null;render()},
 async delstu(d){if(!await ask("Delete this student?","ID "+d.g.toUpperCase()+" and the parent login will be removed. This cannot be undone.","Yes, delete",1))return;await run(async()=>{await api("deleteStudent",{gr:d.g});await loadStudents();toast("Student deleted");render()})},
 async addtch(){await run(async()=>{const ro=v("trl")||"teacher";await api("createTeacher",{role:ro,username:v("tu"),name:v("tn"),password:v("tp"),shift:v("tsh"),classes:ck("nk")});toast((ro==="principal"?"Principal":ro==="admin"?"Admin":ro==="incharge"?"Incharge":"Teacher")+" login created");render()})},
 edt(d){S.edit=S.edit===d.u?"":d.u;render()},async savetch(d){await run(async()=>{await api("updateTeacher",{username:d.u,name:v("en"),shift:v("esh"),classes:ck("ek")});S.edit="";toast("Teacher updated (class changes apply at next login)");render()})},
 spw(d){S.pwu=S.pwu===d.u?"":d.u;render()},async setpw(d){await run(async()=>{await api("setPassword",{username:d.u,password:v("np")});S.pwu="";toast("Password set");render()})},
 async rpw(d){if(!await ask("Reset password?",d.u+" will be reset to 1234 and must be changed at next login.","Yes, reset"))return;await run(async()=>{await api("resetPassword",{username:d.u});toast(d.u+" password reset to 1234")})},
 async blk(d){const u=S.users.find(x=>x.username===d.u);if(!u.blocked&&!await ask("Block "+d.u+"?","This user will not be able to log in.","Yes, block",1))return;await run(async()=>{await api("blockUser",{username:d.u,blocked:!u.blocked});toast(u.blocked?"User unblocked":"User blocked (an existing session may last up to 1 hour)");render()})},
 async delu(d){if(!await ask("Delete this user?",d.u+" will be removed. This cannot be undone.","Yes, delete",1))return;await run(async()=>{await api("deleteUser",{username:d.u});toast("User deleted");render()})},
 async chpw(){if(v("pn")!==v("pc"))return toast("New passwords do not match",true);await run(async()=>{await api("changePassword",{oldPassword:$("#po").value,newPassword:$("#pn").value});toast("Password changed");if(S.me.mc){S.err="Password changed. Please login again.";return signOut(auth)}render()})},
 async addhw(){const d=v("hd"),sj=v("hs"),tx=v("ht");if(!sj||!tx)return toast("Subject and details are required",true);await run(async()=>{const r=doc(collection(db,"hw"));await setDoc(r,{id:r.id,key:S.key,date:d,month:d.slice(0,7),subject:sj,text:tx,by:S.me.u,byName:S.me.name,at:Date.now()});logEv("hw_add","Posted homework for "+kn(S.key)+" ("+sj+") dated "+d);S.month=d.slice(0,7);toast("Homework posted");render()})},
 async delhw(d){await run(async()=>{await deleteDoc(doc(db,"hw",d.i));logEv("hw_del","Deleted a homework entry of "+kn(S.key));toast("Deleted");render()})},
 async addntc(){const ti=v("nt"),tx=v("nb"),one=$("#nm")?.value==="one";if(!ti||!tx)return toast("Title and message are required",true);let st=null;if(one){st=S.students.find(x=>x.gr===v("ns"));if(!st)return toast("Please select a student",true)}
  await run(async()=>{const r=doc(collection(db,one?"pnotices":"notices"));await setDoc(r,one?{id:r.id,gr:st.gr,sname:st.name,key:st.key,title:ti,text:tx,at:Date.now()}:{id:r.id,title:ti,text:tx,at:Date.now()});toast(one?"Notice sent to "+st.name:"Notice published");render()})},
 async delntc(d){if(!await ask("Delete this notice?","It will be removed for everyone who can see it.","Yes, delete",1))return;await run(async()=>{await deleteDoc(doc(db,d.k==="one"?"pnotices":"notices",d.i));toast("Notice deleted");render()})},
 async wipe(){if(v("wc")!=="DELETE")return toast("Type DELETE in capital letters to confirm",true);if(!await ask("Delete ALL data?","Every student, parent login, teacher login, attendance, results, homework and notice will be erased. Only the admin login stays.","Yes, erase everything",1))return;await run(async()=>{const r=await api("wipeAll",{confirm:v("wc"),password:$("#wp").value});Q.l=[];qsave();bn();S.students=[];S.users=[];S.pend=null;S.tab="dash";toast("All data erased ("+r.deleted+" records). Admin login kept.");render()})},
 xld(){xl("d")},xlm(){xl("m")},
 async fa(){await run(async()=>{const m=today().slice(0,7),rows=await cached("att:fa:"+m+":"+(S.me.role==="admin"?"all":keys().join(",")),5*MIN,()=>rdC(S.me.role==="admin"?[query(ac,where("month","==",m))]:keys().map(k=>query(ac,where("key","==",k),where("month","==",m))))),c={};rows.forEach(x=>{if(x.status==="A")c[x.gr]=(c[x.gr]||0)+1});
  const l=Object.entries(c).filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).map(([g,n])=>{const s=S.students.find(x=>x.gr===g)||{};return `<tr><td>${e(SID(g))}</td><td>${e(s.name)}</td><td>${e(kn(s.key||""))}</td><td>${e(s.phone)}</td><td><b>${n}</b></td></tr>`}).join("");
  $("#fa").innerHTML=l?`<div class="tw"><table><tr><th>Student ID</th><th>Name</th><th>Class</th><th>Phone</th><th>Absences</th></tr>${l}</table></div>`:'<p class="mu">No student has 3 or more absences this month.</p>'})},
 pdfd(){pdf("d")},pdfm(){pdf("m")},prd(){prt("d")},prm(){prt("m")}};
function paint(g){const r=document.querySelector(`tr[data-r="${CSS.escape(g)}"]`);if(r)r.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.s===S.att[g]));
 const c=tally(Object.values(S.att).map(status=>({status})));const el=$("#cnt");if(el)el.textContent=`P ${c.P} | A ${c.A} | L ${c.L} | Lv ${c.V}`}
const CH={ssh(x){S.ssh=x.value;if(S.sk!=="all"&&S.ssh!=="all"&&shOf(S.sk)!==S.ssh)S.sk="all";render()},trl(x){const t=x.value==="teacher"||x.value==="incharge";["trs","trc"].forEach(i=>{const el=$("#"+i);if(el)el.style.display=t?"":"none"});const sh=$("#tsh");if(sh)applyShift("nk",sh.value);const n=$("#tkn");if(n)n.style.display=x.value==="teacher"?"":"none"},dsh(x){S.dsh=x.value},sf(x){S.sf=x.value;render()},ush(x){applyShift("nk",x.value)},esh(x){applyShift("ek",x.value)},nm(x){const one=x.value==="one";$("#nind").style.display=one?"flex":"none";$("#nbtn").textContent=one?"Send to student":"Publish to all"},nc(x){S.nk=x.value;$("#ns").innerHTML=stOpts(S.nk)},key(x){S.key=x.value;render()},date(x){S.date=x.value||today();render()},month(x){S.month=x.value;render()},sk(x){S.sk=x.value;render()},sq(x){S.sq=x.value;render()},ur(x){S.ur=x.value;render()},uq(x){S.uq=x.value;render()},
 async file(x){const f=x.files[0];if(!f)return;await run(async()=>{const wb=XLSX.read(await f.arrayBuffer()),js=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});
  const pick=(o,ns)=>{for(const k in o)if(ns.includes(k.toLowerCase().replace(/[^a-z]/g,"")))return String(o[k]).trim();return ""};
  S.pend=js.map(o=>({ref:pick(o,["gr","grno","grnumber","regno","admissionno"]),id:pick(o,["studentid","sid","id"]),name:pick(o,["name","studentname"]),father:pick(o,["father","fathername"]),cls:pick(o,["class","grade"]),sec:pick(o,["section","sec"]),shift:pick(o,["shift","timing","session"]),roll:pick(o,["roll","rollno","rollnumber"]),phone:pick(o,["phone","mobile","contact","phoneno"]),dob:normDob(pick(o,["dob","dateofbirth","birthdate"])),bg:pick(o,["bloodgroup","blood","bg"]).toUpperCase().replace(/\s/g,""),email:pick(o,["email","emailaddress"]),addr:pick(o,["address","homeaddress"])})).filter(r=>r.name&&r.cls);
  if(!S.pend.length){S.pend=null;throw new Error("Required columns not found. See the sample template")}render()})}};
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-a]");if(b&&H[b.dataset.a])H[b.dataset.a](b.dataset)});
document.addEventListener("change",ev=>{const c=ev.target.dataset?.c;if(c&&CH[c])CH[c](ev.target)});
document.addEventListener("input",ev=>{const i=ev.target;if(!i.dataset||i.dataset.live===undefined)return;const q=i.value.toLowerCase().trim();i.closest(".card").querySelectorAll("tr[data-r]").forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?"":"none")});
document.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&(ev.target.id==="lu"||ev.target.id==="lp"))H.login()});
/* ---------- Reports (v57): daily / monthly attendance. PDF = colourful, Print = black and white. Layout lives in reports.js ---------- */
async function repSpec(t){const k=S.key,l=inKey(k);if(!l.length)throw new Error("No students in this class");
 const p=kparts(k),base={cls:p.c,sec:p.sec,sh:p.sh,students:l.map(s=>({gr:s.gr,id:SID(s.gr),roll:s.roll,name:s.name,father:s.father}))},file=`attendance-${t==="m"?S.month:S.date}-class-${k.replace(/\|/g,"-")}`;
 if(t==="d")return dailySpec({...base,date:S.date,rows:cnt(await attKD(k,S.date)),off:offDay(S.date)||"",file:file+".pdf"});
 return monthlySpec({...base,month:S.month,rows:await attMonth(k,S.month),off:d=>offDay(d)||"",file:file+".pdf"})}
async function pdf(t){await run(async()=>{await ensurePdfLibs(true);await pdfReport(await repSpec(t))})}
async function prt(t){await run(async()=>{await printReport(await repSpec(t))})}

/* ================= v12: events, results, progress report ================= */
const dmy=s=>s?String(s).split("-").reverse().join("-"):"";
const f1=n=>{const x=Math.round(n*10)/10;return Number.isInteger(x)?String(x):x.toFixed(1)};
const ayear=()=>{const d=new Date(),y=d.getFullYear();return d.getMonth()>=3?y+"-"+(y+1):(y-1)+"-"+y};
Object.assign(S,{ev:[],rt:"T1",ry:ayear(),rf:"auto",rs:"",rm:{},fm:"pri"});
const TN={T1:"First Term",T2:"Mid Term",T3:"Final Term"};
const clsName=k=>{const p=String(k).split("|");return p.length===3?p[1]:p[0]};
const fmtOf=k=>S.rf!=="auto"?S.rf:(/(^|[\s-])(pg|play|nur|prep|kg|k\.g|pre)/i.test(clsName(k).trim())?"pre":"pri");
const yrWin=y=>{const m=/^(\d{4})-(\d{4})$/.exec(y||"");return m?[m[1]+"-04-01",m[2]+"-03-31"]:["",""]};

/* ----- events / holidays ----- */
async function loadEv(){try{S.ev=(await cached("ev",30*MIN,()=>rd([query(collection(db,"events"))]))).sort((a,b)=>a.date.localeCompare(b.date))}catch{S.ev=[]}}
const offDay=d=>{const w=new Date(d+"T12:00:00").getDay();if(w===6)return "Saturday (weekly off)";if(w===0)return "Sunday (weekly off)";const h=S.ev.find(x=>x.type==="holiday"&&d>=x.date&&d<=(x.end||x.date));return h?h.title:""};
V.ev=async()=>{if(S.me.role!=="admin")return empty("Only the admin can manage events.");await loadEv();
 const t=today(),up=S.ev.filter(x=>(x.end||x.date)>=t),past=S.ev.filter(x=>(x.end||x.date)<t).reverse();
 const row=x=>`<tr><td><b>${e(x.title)}</b></td><td><span class="pill ${x.type==="holiday"?"lt":"ok"}">${x.type==="holiday"?"Holiday":"Event"}</span></td><td>${dmy(x.date)}${x.end&&x.end!==x.date?" to "+dmy(x.end):""}</td><td><button class="s g" data-a="delev" data-i="${e(x.id)}">Delete</button></td></tr>`;
 const tb=l=>l.length?`<div class="tw"><table><tr><th>Title</th><th>Type</th><th>Date</th><th></th></tr>${l.map(row).join("")}</table></div>`:'<p class="mu">None</p>';
 return `<div class="card"><h3>Add Event / Holiday</h3><div class="row"><input id="et" placeholder="Title (e.g. Eid ul Fitr)" style="flex:1 1 220px"><select id="ety"><option value="holiday">Holiday (school closed)</option><option value="event">Event (school open, info only)</option></select></div><div class="row"><label class="mu">From <input type="date" id="ed"></label><label class="mu">To (optional) <input type="date" id="ee"></label><button data-a="addev">Add</button></div><p class="mu">Saturday and Sunday are always off. No attendance on holidays.</p></div><div class="card"><h3>Upcoming (${up.length})</h3>${tb(up)}</div><div class="card"><h3>Past (${past.length})</h3>${tb(past)}</div>`};
const holBox=o=>`<div class="card hol"><b>Holiday: ${e(o)}</b><br><span class="mu">Holiday: no attendance on this day.</span></div>`;
{const _take=V.take,_dash=V.dash,_mark=H.mark,_allp=H.allp,_mo=H.markOld,pastT=()=>S.me.role==="teacher"&&S.date!==today(),pastMsg=()=>toast("Past days are view only. Only the admin can change or add attendance of a past date.",true);
 V.take=async()=>{const o=offDay(S.date);if(!o||!keys().length)return _take();return `<div class="card"><h3>Take Attendance</h3><div class="row">${ksel()}<input type="date" value="${S.date}" max="${today()}" data-c="date"></div></div>`+holBox(o)};
 V.dash=async()=>{const h=await _dash(),o=offDay(today());return o?holBox("Today - "+o)+h:h};
 H.markOld=d=>pastT()?pastMsg():_mo(d);
 H.mark=d=>pastT()?pastMsg():offDay(S.date)?toast("Holiday: "+offDay(S.date)+". Attendance cannot be marked.",true):_mark(d);
 H.allp=()=>pastT()?pastMsg():offDay(S.date)?toast("Holiday: "+offDay(S.date)+". Attendance cannot be marked.",true):_allp()}
Object.assign(H,{
 async addev(){const t=v("et"),d=v("ed"),en=v("ee");if(!t||!d)return toast("Title and date are required",true);if(en&&en<d)return toast("'To' date cannot be before 'From' date",true);
  await run(async()=>{const r=doc(collection(db,"events"));await setDoc(r,{id:r.id,title:t,type:v("ety")==="event"?"event":"holiday",date:d,end:en||d,at:Date.now()});await loadEv();toast("Saved");render()})},
 async delev(d){if(!await ask("Delete this event?","Students will no longer be shown as Holiday on those dates.","Yes, delete",1))return;await run(async()=>{await deleteDoc(doc(db,"events",d.i));await loadEv();toast("Deleted");render()})}});

const BGL=["A+","A-","B+","B-","O+","O-","AB+","AB-"];
/* ----- v13: per-class subjects and grading scale (set by admin) ----- */
Object.assign(S,{cfg:{},cc:"",sd:null,gd:null,keepd:0,reqN:0,rcf:null,rq:[]});
const C_=(i,n,m)=>({i,n,m}),SB=(id,n,c,t1)=>t1?{id,n,c,t1:1}:{id,n,c};
const cid=c=>String(c||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
const cnum=c=>{const m=/^\s*(?:class\s*)?(\d+)/i.exec(String(c||""));return m?+m[1]:0};
const isPre=c=>!cnum(c)&&/(^|[\s-])(pg|play|mont|nur|prep|kg|k\.g|kinder|pre)/i.test(String(c||"").trim());
const lvl=c=>isPre(c)?0:(cnum(c)||10);
const mkSc=a=>a.map(([from,to,g,r],i)=>({g,from,to,r,f:i===a.length-1?1:0}));
const SC_A=mkSc([[90,100,"A+","Exceptional"],[80,89,"A","Excellent"],[70,79,"B","Very Good"],[60,69,"C","Progressive"],[50,59,"D","Needs Improvement"],[0,49,"U","Unsatisfactory"]]);
const SC_B=mkSc([[80,100,"A+","Exceptional"],[70,79,"A","Excellent"],[60,69,"B","V.Good"],[50,59,"C","Good"],[40,49,"D","Satisfactory"],[0,39,"U","Unsatisfactory"]]);
const clone=o=>JSON.parse(JSON.stringify(o));
function defSubs(cls){const n=lvl(cls);
 if(n===0)return{subs:[SB("math","Mathematical Skills",[C_("l","Listening Skills",25),C_("w","Writing Skills",50)]),SB("urdu","Urdu Language Skills",[C_("l","Listening Skills",25),C_("w","Writing Skills",50)]),SB("gk","General Knowledge Skills",[C_("l","Listening Skills",15),C_("w","Writing Skills",35)]),SB("isl","Islamiat",[C_("t","Marks",50)]),SB("eng","English Language Skills",[C_("r","Reading & Listening Skills",25),C_("w","Writing Skills",50)]),SB("sum","Summer Pack",[C_("t","Marks",10)],1)],gs:[{i:"art",n:"Art"},{i:"material",n:"Material"}]};
 const sp=n>=3&&n<=7,big=n>=8,P=()=>C_("pr","Practical",15);
 return{subs:[SB("eng","English",[C_("rd","Reading / Nazra",5),C_("di","Dictation",5),C_("cpr","Class Presentation",5),C_("cpa","Class Participation",5),C_("wr","Written",80)]),
  SB("isl","Islamiat",[C_("rd","Reading / Nazra",10),C_("cpr","Class Presentation",5),C_("cpa","Class Participation",5),C_("wr","Written",80)]),
  ...(big?[SB("che","Chemistry",[C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),P(),C_("ob","Objective",30),C_("sb","Subjective",45)]),SB("bio","Biology",[C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),P(),C_("ob","Objective",30),C_("sb","Subjective",45)])]:[SB("sci","Science",[C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),...(sp?[P()]:[]),C_("ob","Objective",30),C_("sb","Subjective",sp?45:60)])]),
  SB("com","Computer",[C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),P(),C_("ob","Objective",35),C_("sb","Subjective",40)]),
  SB("mat","Maths",[C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),C_("ob","Objective",30),C_("sb","Subjective",60)]),
  SB("ss","Social Studies",[C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),C_("ob","Objective",55),C_("sb","Subjective",35)]),
  SB("snd","Sindhi",[C_("or","Oral",5),C_("di","Dictation",5),C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),C_("wr","Written",80)]),
  SB("urd","Urdu",[C_("or","Oral",5),C_("di","Dictation",5),C_("cpa","Class Participation",5),C_("cpr","Class Presentation",5),C_("wr","Written",80)])],gs:[{i:"art",n:"Art"}]}}
const defScale=cls=>clone(lvl(cls)>=8?SC_B:SC_A);
const cfgSubs=cls=>{const d=S.cfg["sub_"+cid(cls)];return d&&Array.isArray(d.subs)&&d.subs.length?{subs:d.subs,gs:d.gs||[]}:defSubs(cls)};
const cfgScale=cls=>{const d=S.cfg["gr_"+cid(cls)];return d&&Array.isArray(d.sc)&&d.sc.length?d.sc:defScale(cls)};
const cfgFor=cls=>{const a=cfgSubs(cls);return{sub:a.subs,gs:a.gs,sc:cfgScale(cls)}};
const snapOf=r=>r.sub&&r.sc?{sub:r.sub,gs:r.gs||[],sc:r.sc}:cfgFor(r.cls||clsName(r.key));
const stCls=st=>String(st.cls||String(st.key).split("|")[1]||"").trim();
async function loadCfg(){S.cfg={};if(!S.me)return;if(S.me.role==="parent"){try{const cs=await cached("cfg:s",5*MIN,async()=>{const d=await getDoc(doc(db,"cfg","settings"));return d.exists()?d.data():null});if(cs)S.cfg.settings=cs}catch{}return}try{Object.assign(S.cfg,await cached("cfg:all",5*MIN,async()=>{const o={};(await getDocs(collection(db,"cfg"))).docs.forEach(d=>o[d.id]=d.data());return o}))}catch{}}
async function loadReqN(){S.reqN=0;if(!S.me||S.me.role!=="admin")return;try{S.reqN=await cached("req:n",5*MIN,async()=>(await getDocs(query(collection(db,"results"),where("req.status","==","pending")))).size)}catch{}}
const po=c=>{const x=cid(c);if(/^(kg|kindergarten|kinder)1/.test(x))return 5;if(/^(kg|kindergarten|kinder)2/.test(x))return 6;const i=["pg","play","mont","nur","prep"].findIndex(z=>x.startsWith(z));return i<0?9:i};
const classList=()=>{const m=new Map();S.students.forEach(s=>{const c=stCls(s);if(c&&!m.has(cid(c)))m.set(cid(c),c)});["Mont","KG 1","KG 2",...Array.from({length:10},(_,i)=>String(i+1))].forEach(c=>{if(!m.has(cid(c)))m.set(cid(c),c)});return [...m.values()].sort((a,b)=>lvl(a)-lvl(b)||po(a)-po(b)||cmp(a,b))};
const exClasses=()=>{const m=new Map();S.students.forEach(q=>{const c=stCls(q);if(c&&cid(c)!==cid("Passed Out")&&!m.has(cid(c)))m.set(cid(c),c)});return [...m.values()].sort((a,b)=>lvl(a)-lvl(b)||po(a)-po(b)||cmp(a,b))};
/* ladder: Montessori, Kindergarten 1, Kindergarten 2, 1 ... 10, then Passed Out */
const rung=c=>{const x=cid(c),n=cnum(c);if(n>=1&&n<=10&&!/^(kg|kinder)/.test(x))return n+2;if(/^mont/.test(x))return 0;if(/^(kg|kindergarten|kinder)1/.test(x))return 1;if(/^(kg|kindergarten|kinder)2/.test(x))return 2;return -1};
const rungName=r=>{const f=exClasses().find(c=>rung(c)===r);return f||(r===0?"Montessori":r===1?"Kindergarten 1":r===2?"Kindergarten 2":String(r-2))};
const nextOf=c=>{const r=rung(c);if(r<0)return null;return r>=12?"Passed Out":rungName(r+1)};
const availCls=()=>{const have=new Set([...S.students.map(stCls),...Object.values(S.cfg||{}).map(x=>x&&x.cls)].filter(c=>c&&cid(c)!==cid("Passed Out")).map(cid)),l=classList().filter(c=>have.has(cid(c)));return l.length?l:classList()};
const ccSel=()=>{const l=availCls();if(!l.some(x=>x===S.cc))S.cc=l[0];return `<select data-c="scs">${l.map(c=>`<option value="${e(c)}" ${c===S.cc?"selected":""}>Class ${e(c)}</option>`).join("")}</select>`};
CH.scs=x=>{S.cc=x.value;S.sd=null;S.gd=null;render()};
const mxs=s=>s.c.reduce((a,c)=>a+(+c.m||0),0);

/* ----- Subjects page (admin) ----- */
V.subj=async()=>{if(S.me.role!=="admin")return empty("Only the admin can manage subjects.");
 const sel=ccSel();if(S.keepd)S.keepd=0;else S.sd=null;if(!S.sd)S.sd=clone(cfgSubs(S.cc));
 const custom=!!S.cfg["sub_"+cid(S.cc)],d=S.sd;
 const cards=d.subs.map((s,i)=>[s,i]).reverse().map(([s,i])=>`<div class="card sbc" data-id="${e(s.id)}"><div class="row"><input class="sn" placeholder="Subject name (e.g. English)" value="${e(s.n)}" style="flex:1 1 200px"><label class="ck"><input type="checkbox" class="s1" ${s.t1?"checked":""}>First term only</label><button class="s g" data-a="sbdel" data-i="${i}">Remove subject</button></div>
 ${s.c.map((c,j)=>`<div class="row cr" data-id="${e(c.i)}"><input class="cn" placeholder="Part (e.g. Written, Practical)" value="${e(c.n)}" style="flex:1 1 180px"><input class="cm" type="number" min="0" step="0.5" inputmode="decimal" value="${c.m}" style="width:96px" title="Maximum marks"><span class="mu">marks</span><button class="s g" data-a="cdel" data-i="${i}" data-j="${j}" aria-label="Remove part">&times;</button></div>`).join("")}
 <div class="row"><button class="s g" data-a="cadd" data-i="${i}">+ Add part</button><button class="s g" data-a="cadd" data-i="${i}" data-p="1">+ Practical</button><span class="pill ${mxs(s)===100?"ok":"lt"}">Total ${f1(mxs(s))}</span></div></div>`).join("");
 return `<div class="card"><h3>Subjects by Class</h3><div class="row">${sel}<span class="pill ${custom?"ok":""}">${custom?"Custom list saved":"Default list"}</span></div><p class="mu" style="margin:0">Choose a class, add subjects, then Save. Newest shows on top; the report card keeps the order added.</p><div class="row" style="margin-top:12px"><button class="g" data-a="sbadd">+ Add subject</button><button data-a="sbsave">Save subjects</button></div></div>${cards||'<div class="card empty">No subjects yet. Add one below.</div>'}
 <div class="card"><div class="row"><b>Grade-only items:</b><input id="gsn" value="${e((d.gs||[]).map(x=>x.n).join(", "))}" placeholder="e.g. Art, Material" style="flex:1 1 220px"></div><p class="mu" style="margin:0">Given a grade instead of marks. Optional.</p></div>
 <div class="row"><button data-a="sbsave">Save subjects for Class ${e(S.cc)}</button>${custom?'<button class="g" data-a="sbreset">Reset to default</button>':""}</div>`};
function readSd(){const subs=[...document.querySelectorAll(".sbc")].reverse().map((b,i)=>{const o={id:b.dataset.id||("s"+Date.now().toString(36)+i),n:b.querySelector(".sn").value.trim(),c:[...b.querySelectorAll(".cr")].map((r,j)=>({i:r.dataset.id||("c"+Date.now().toString(36)+i+j),n:r.querySelector(".cn").value.trim(),m:Math.max(0,+r.querySelector(".cm").value||0)}))};if(b.querySelector(".s1").checked)o.t1=1;return o});
 const seen=new Set(),gs=(($("#gsn")||{}).value||"").split(",").map(x=>x.trim()).filter(Boolean).map(n=>({i:cid(n)||"g",n})).filter(x=>!seen.has(x.i)&&seen.add(x.i));return{subs,gs}}
Object.assign(H,{
 sbadd(){S.sd=readSd();S.sd.subs.push({id:"s"+Date.now().toString(36),n:"",c:[{i:"c"+Date.now().toString(36),n:"Written",m:100}]});S.keepd=1;render();setTimeout(()=>{window.scrollTo({top:0});const f=document.querySelector(".sbc .sn");if(f){f.scrollIntoView({block:"center"});f.focus()}},80)},
 async sbdel(d){S.sd=readSd();const s=S.sd.subs[+d.i];if(!s)return;if(!await ask("Remove this subject?",(s.n||"This subject")+" will be removed from the list (after you press Save).","Yes, remove",1))return;S.sd.subs.splice(+d.i,1);S.keepd=1;render()},
 cadd(d){S.sd=readSd();const sb=S.sd.subs[+d.i];if(d.p&&sb.c.some(c=>c.n.toLowerCase()==="practical"))return toast("This subject already has a Practical part",true);sb.c.push({i:"c"+Date.now().toString(36),n:d.p?"Practical":"",m:d.p?15:0});S.keepd=1;render()},
 cdel(d){S.sd=readSd();const s=S.sd.subs[+d.i];if(s.c.length<2)return toast("A subject needs at least one part",true);s.c.splice(+d.j,1);S.keepd=1;render()},
 async sbsave(){const d=readSd();
  if(!d.subs.length)return toast("Add at least one subject",true);
  for(const s of d.subs){if(!s.n)return toast("Every subject needs a name",true);if(s.c.some(c=>!c.n))return toast("Every part of "+s.n+" needs a name",true);if(!(mxs(s)>0))return toast(s.n+": total marks must be more than 0",true)}
  if(new Set(d.subs.map(s=>s.n.toLowerCase())).size!==d.subs.length)return toast("Two subjects have the same name",true);
  for(const s of d.subs){if(new Set(s.c.map(c=>c.n.toLowerCase())).size!==s.c.length)return toast(s.n+": two parts have the same name",true)}
  const odd=d.subs.filter(s=>mxs(s)!==100).map(s=>s.n);
  if(odd.length&&!await ask("Total is not 100",odd.join(", ")+" do not add up to 100 marks. Save anyway?","Yes, save"))return;
  await run(async()=>{const id="sub_"+cid(S.cc);await setDoc(doc(db,"cfg",id),{cls:S.cc,subs:d.subs,gs:d.gs,at:Date.now(),by:S.me.u});S.cfg[id]={cls:S.cc,subs:d.subs,gs:d.gs};S.sd=null;toast("Subjects saved for Class "+S.cc);render()})},
 async sbreset(){if(!await ask("Reset to default?","The custom subject list of Class "+S.cc+" will be removed and the default list used.","Yes, reset",1))return;await run(async()=>{const id="sub_"+cid(S.cc);await deleteDoc(doc(db,"cfg",id));delete S.cfg[id];S.sd=null;toast("Default subjects restored");render()})}});

/* ----- Grading scale page (admin) ----- */
V.gsc=async()=>{if(S.me.role!=="admin")return empty("Only the admin can manage the grading scale.");
 const sel=ccSel();if(S.keepd)S.keepd=0;else S.gd=null;if(!S.gd)S.gd=clone(cfgScale(S.cc)).sort((a,b)=>b.from-a.from);
 const custom=!!S.cfg["gr_"+cid(S.cc)];
 const rows=S.gd.map((x,i)=>`<div class="row grw"><input class="gg" value="${e(x.g)}" placeholder="Grade" style="width:84px"><label class="mu">From <input class="gf" type="number" min="0" max="100" inputmode="numeric" value="${x.from}" style="width:78px"> %</label><label class="mu">To <input class="gt" type="number" min="0" max="100" inputmode="numeric" value="${x.to}" style="width:78px"> %</label><input class="gm" value="${e(x.r)}" placeholder="Remark (e.g. Excellent)" style="flex:1 1 170px"><label class="ck"><input type="checkbox" class="gx" ${x.f?"checked":""}>Fail</label><button class="s g" data-a="grdel" data-i="${i}" aria-label="Remove grade">&times;</button></div>`).join("");
 return `<div class="card"><h3>Grading Scale by Class</h3><div class="row">${sel}<span class="pill ${custom?"ok":""}">${custom?"Custom scale saved":"Default scale"}</span></div><p class="mu" style="margin:0">Set the percentage range of each grade for this class.</p></div><div class="card">${rows}<div class="row"><button class="s g" data-a="gradd">+ Add grade</button></div></div><div class="row"><button data-a="grsave">Save grading scale for Class ${e(S.cc)}</button>${custom?'<button class="g" data-a="grreset">Reset to default</button>':""}</div>`};
const readGd=()=>[...document.querySelectorAll(".grw")].map(r=>({g:r.querySelector(".gg").value.trim(),from:r.querySelector(".gf").value===""?NaN:+r.querySelector(".gf").value,to:r.querySelector(".gt").value===""?NaN:+r.querySelector(".gt").value,r:r.querySelector(".gm").value.trim(),f:r.querySelector(".gx").checked?1:0}));
function chkGd(l){if(l.length<2)return"Add at least 2 grades";if(l.some(x=>!x.g||isNaN(x.from)||isNaN(x.to)))return"Fill the grade name, From % and To % in every row";
 if(l.some(x=>x.from>x.to||x.from<0||x.to>100))return"'From' cannot be more than 'To', and values must be between 0 and 100";
 if(new Set(l.map(x=>x.g.toLowerCase())).size!==l.length)return"Grade names must all be different";
 const s=l.slice().sort((a,b)=>b.from-a.from);if(s[0].to!==100)return"The top grade must end at 100%";if(s[s.length-1].from!==0)return"The lowest grade must start at 0%";
 for(let i=1;i<s.length;i++)if(s[i].to+1!==s[i-1].from)return`Gap or overlap between ${s[i].g} and ${s[i-1].g}: the 'To' of ${s[i].g} must be exactly 1 less than the 'From' of ${s[i-1].g}`;
 if(!s.some(x=>x.f))return"Tick 'Fail' on the failing grade (usually the lowest)";return""}
Object.assign(H,{
 gradd(){S.gd=readGd();S.gd.push({g:"",from:0,to:0,r:"",f:0});S.keepd=1;render()},
 grdel(d){S.gd=readGd();if(S.gd.length<3)return toast("At least 2 grades are required",true);S.gd.splice(+d.i,1);S.keepd=1;render()},
 async grsave(){const l=readGd(),m=chkGd(l);if(m)return toast(m,true);const sc=l.sort((a,b)=>b.from-a.from).map(x=>({g:x.g,from:x.from,to:x.to,r:x.r,f:x.f}));
  await run(async()=>{const id="gr_"+cid(S.cc);await setDoc(doc(db,"cfg",id),{cls:S.cc,sc,at:Date.now(),by:S.me.u});S.cfg[id]={cls:S.cc,sc};S.gd=null;toast("Grading scale saved for Class "+S.cc);render()})},
 async grreset(){if(!await ask("Reset to default?","The custom grading scale of Class "+S.cc+" will be removed and the default scale used.","Yes, reset",1))return;await run(async()=>{const id="gr_"+cid(S.cc);await deleteDoc(doc(db,"cfg",id));delete S.cfg[id];S.gd=null;toast("Default grading scale restored");render()})}});

/* ----- marks calculation ----- */
const gradeOf=(sc,p)=>{const q=Math.round(p);return sc.find(x=>q>=x.from&&q<=x.to)||sc.slice().sort((a,b)=>a.from-b.from)[0]};
const has=(m,id)=>m&&m[id]!==undefined&&m[id]!==""&&m[id]!==null;
function calcRes(cf,t,marks){let tot=0,ob=0;
 const subs=cf.sub.filter(s=>!s.t1||t==="T1").map(s=>{const m=(marks||{})[s.id]||{},any=s.c.some(c=>c.m>0&&has(m,c.i)),mx=s.c.reduce((a,c)=>a+(+c.m||0),0),got=Math.round(s.c.reduce((a,c)=>a+(c.m>0?(+m[c.i]||0):0),0)*10)/10,g=any?gradeOf(cf.sc,got*100/mx):null;if(any){tot+=mx;ob+=got}return{s,m,any,mx,got,g:g?g.g:""}});
 ob=Math.round(ob*10)/10;const pc=tot?Math.round(ob*100/tot):0,gr=tot?gradeOf(cf.sc,pc):null;
 return{subs,tot,ob,pc,gd:gr?gr.g:"",rk:gr?gr.r:"",res:tot?(gr.f?"FAILED":"PASSED"):""}}
const REM={"A+":"Outstanding performance! Keep shining.","A":"Great job! Your hard work is paying off. Keep it up!","B":"Good work. Keep trying to improve further.","C":"Satisfactory progress. More effort is needed.","D":"Needs improvement. Please work harder.","U":"Unsatisfactory result. Extra practice and attention are required."};
const scRange=(sc,i)=>{const s=sc.slice().sort((a,b)=>b.from-a.from),x=s[i];if(x.to>=100&&i===0)return x.from+"% & above";if(x.from===0&&i===s.length-1)return"Below "+s[i-1].from+"%";return x.from+"% - "+x.to+"%"};

/* ----- report card / progress report HTML ----- */
const RC_CSS=`
.rc td,.rc th{white-space:normal;border:0;background:none;text-transform:none;letter-spacing:0;color:inherit;font-size:inherit;padding:0}.rc tr:hover td{background:none}
.rc{width:794px;height:1123px;background:#fff;color:#111;font-family:"Segoe UI",Arial,Helvetica,sans-serif;position:relative;overflow:hidden;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:12px}
.rc,.rc *{box-sizing:border-box}.rc *{margin:0;padding:0}
.rc table{border-collapse:collapse;width:100%}
.rc td,.rc th{font-weight:600;text-align:center;vertical-align:middle;line-height:1.2}
.rc .lay td{border:0}.rc img{display:block}.rc u{text-decoration:underline}
.rc.nw{padding:18px}
.nw .fr{border:3px double #111;height:1087px;padding:16px 20px 14px;display:flex;flex-direction:column}
.nw .hd td.lg{width:112px}.nw .lg img{height:96px;width:auto;margin:0 auto}
.nw .n1{font-size:14px;font-weight:700;letter-spacing:2.5px}.nw .n2{font-size:34px;font-weight:800;letter-spacing:2px;line-height:1.1;margin:3px 0 1px}.nw .n3{font-size:12px;letter-spacing:4px;color:#444;font-weight:600;text-transform:uppercase}
.nw .ban{margin:10px 0 12px;background:#111;color:#fff;text-align:center;padding:7px 10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nw .ban b{display:block;font-size:21px;letter-spacing:6px;font-weight:800}.nw .ban span{display:block;font-size:12.5px;letter-spacing:1.5px;margin-top:2px;font-weight:600}
.nw .inf{margin-bottom:16px}.nw .inf td{text-align:left;padding:4px 8px 5px;border:1px solid #888;width:33.33%;vertical-align:top}
.nw .inf small{display:block;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#555;font-weight:600}.nw .inf b{display:block;font-size:14px;font-weight:700;margin-top:1px}
.nw .mk{table-layout:fixed}
.nw .mk th,.nw .mk td{border:1px solid #333;padding:9px 2px;font-size:11.5px}
.nw .mk th{background:#1f1f1f;color:#fff;font-size:8.3px;letter-spacing:-.2px;font-weight:700;padding:7px 0;line-height:1.15;word-break:normal;overflow-wrap:normal;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.nw .mk td.sj{text-align:left;padding-left:7px;font-size:12.5px;font-weight:700}
.nw .mk td b{font-weight:800;font-size:12px}.nw .mk td i{font-style:normal;color:#666;font-weight:500;font-size:10px}
.nw .mk td.na{color:#aaa;font-weight:400}.nw .mk td.tt{background:#eee;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nw .mk td.gd{font-size:14px;font-weight:800}
.nw .mk tr.nt td{color:#777}
.nw .go{margin-top:8px;font-size:12px;text-align:left;font-weight:700}.nw .go span{display:inline-block;border:1px solid #333;padding:3px 12px;margin-right:8px}
.nw .sm{margin-top:20px;table-layout:fixed}.nw .sm td{border:2px solid #111;padding:10px 4px 11px}.nw .sm small{display:block;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#444;font-weight:700}.nw .sm b{display:block;font-size:26px;font-weight:800;line-height:1.15}
.nw .sm td.rs{background:#111;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nw .sm td.rs small{color:#ddd}.nw .sm td.rs.f{background:#fff;color:#111}.nw .sm td.rs.f small{color:#444}
.nw .rm{margin-top:16px;border:1.5px solid #111;border-radius:8px;padding:8px 12px;text-align:left;font-size:13px;font-weight:600;line-height:1.4}.nw .rm u{font-weight:800}
.nw .gsc{margin-top:16px}.nw .gsc td,.nw .gsc th{border:1px solid #333;padding:6px 3px;font-size:11.5px}.nw .gsc th{background:#e9e9e9;font-weight:800;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nw .gsc td.k{text-align:left;padding-left:8px;font-weight:800;background:#f4f4f4}
.nw .sg{margin-top:auto}.nw .sg td{padding-top:34px;font-size:12px;font-weight:600;text-align:center;vertical-align:bottom}.nw .sg td span{display:block;border-top:1.2px solid #111;margin:0 14px;padding-top:4px}
.nw .sp{flex:1;min-height:10px}

.nw.kd .fr{border:4px solid #ff8a1f;border-radius:22px;outline:2px dashed #3d6bff;outline-offset:-11px;padding:18px 24px 14px}
.nw.kd .n2{color:#1e3a9f}.nw.kd .n3{color:#ff8a1f}
.nw.kd .ban{background:#ff8a1f;border-radius:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.nw.kd .inf td{border:2px solid #9db4ff;background:#f3f6ff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nw.kd .inf{border-collapse:separate;border-spacing:6px}
.nw.kd .inf small{color:#ff8a1f}
.nw.kd .mk{border-collapse:separate;border-spacing:0;border:2px solid #3d6bff;border-radius:12px;overflow:hidden}
.nw.kd .mk th{background:#3d6bff;border-color:#3d6bff}.nw.kd .mk td{border-color:#b9c8ff}
.nw.kd .mk tr:nth-child(even) td{background:#f4f7ff}.nw.kd .mk tr:nth-child(even) td.tt,.nw.kd .mk td.tt{background:#fff1de}
.nw.kd .go span{border:2px solid #ff8a1f;border-radius:99px;background:#fff6ea}
.nw.kd .sm td{border-color:#3d6bff;background:#f3f6ff}.nw.kd .sm td.rs{background:#22a559;border-color:#22a559}.nw.kd .sm td.rs.f{background:#fff;color:#c0392b;border-color:#c0392b}
.nw.kd .rm{border:2px solid #ff8a1f;background:#fff6ea}
.nw.kd .gsc th{background:#dfe7ff}.nw.kd .gsc td.k{background:#f3f6ff}
.nw.kd .sp{display:flex;align-items:center;justify-content:space-between;padding:0 10px;min-height:128px;margin-top:6px}.nw.kd .sp img{height:118px;width:auto}.nw.kd .mk td{padding:6px 2px}
.nw.kd .sp div{font-size:26px;font-weight:800;color:#ff8a1f;text-align:center;line-height:1.25}.nw.kd .sp div small{display:block;font-size:14px;color:#3d6bff;font-weight:700}
.nw.kd .sg td span{border-top-style:dotted}
.rc.pg{padding:22px 28px;font-size:12.5px}
.pg .hd td{font-weight:700;line-height:1.3}.pg .lg img{height:74px;width:auto;margin:0 auto}
.pg .ttl{background:#1e3a9f;color:#fff;font-size:17px;letter-spacing:2px;padding:6px;margin:8px 0;text-align:center;font-weight:700}
.pg .inf td{text-align:left;padding:3px 8px;font-size:14px;border:1px solid #c9d1ee}.pg .inf td.k{background:#eef1fb;width:16%;color:#1e3a9f}
.pg h4{font-size:14px;color:#1e3a9f;border-bottom:2px solid #1e3a9f;margin:12px 0 6px;padding-bottom:2px;letter-spacing:.5px}
.pg .tl td{border:1px solid #c9d1ee;padding:7px 4px;font-size:12px;background:#f6f8ff}.pg .tl b{display:block;font-size:20px;color:#1e3a9f;line-height:1.2}
.pg .gt td,.pg .gt th{border:1px solid #9aa8d8;padding:3px 5px;font-size:12px}.pg .gt th{background:#1e3a9f;color:#fff}
.pg .pend{font-style:italic;color:#6b7390;font-weight:400}
.pg .bar{height:10px;border:1px solid #1e3a9f;background:#fff;margin-top:6px}.pg .bar i{display:block;height:100%;background:#1e3a9f}
.pg .sg td{border:0;text-align:left;padding-top:22px;font-size:12.5px}
`;
const IMG=n=>logoUrl(n)||location.origin+"/assets/"+n; /* trimmed logo once loaded */

/* ---------- count-up numbers on the dashboard (only when a page opens) ---------- */
{let t=0;new MutationObserver(()=>{if(t)return;t=requestAnimationFrame(()=>{t=0;const v=document.getElementById("view");if(!v||!v.classList.contains("vin")||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
 v.querySelectorAll(".kp b:not([data-cu])").forEach(b=>{b.dataset.cu=1;const o=b.textContent.trim(),m=o.match(/^(\d[\d,]*\.?\d*)(%?)$/);if(!m)return;const to=parseFloat(m[1].replace(/,/g,"")),dec=(m[1].split(".")[1]||"").length,st=performance.now();if(!(to>0))return;
  const f=n=>{const k=Math.min(1,(n-st)/800),e=1-Math.pow(1-k,3),val=to*e;b.textContent=(dec?val.toFixed(dec):Math.round(val).toLocaleString("en-US"))+m[2];if(k<1)requestAnimationFrame(f);else b.textContent=o};requestAnimationFrame(f)})})}).observe(document.body,{childList:true,subtree:true})}
/* ---------- login loading animation + PDF library loader ---------- */
function showLd(t){hideLd();const d=document.createElement("div");d.id="ld";d.innerHTML='<div class="ldr"><img src="/assets/logo.jpg" alt=""><i></i><i class="b"></i></div><div class="ldt"></div><div class="ldb"><b></b></div>';d.querySelector(".ldt").textContent=t||"Please wait...";document.body.appendChild(d);setTimeout(hideLd,30000)}
function hideLd(){const d=document.getElementById("ld");if(d)d.remove()}
const loadJs=u=>new Promise((res,rej)=>{const e=document.createElement("script");e.src=u;e.onload=res;e.onerror=()=>rej(new Error("blocked"));document.head.appendChild(e)});
async function needLib(test,urls){if(test())return;for(const u of urls){try{await loadJs(u);if(test())return}catch{}}}
async function ensurePdfLibs(auto){
 await needLib(()=>window.jspdf,["https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"]);
 if(auto)await needLib(()=>window.jspdf&&window.jspdf.jsPDF.API.autoTable,["https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.31/dist/jspdf.plugin.autotable.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"]);
 else await needLib(()=>window.html2canvas,["https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"]);
 if(!window.jspdf||(auto?!window.jspdf.jsPDF.API.autoTable:!window.html2canvas))throw new Error("PDF library did not load. Check your internet connection (or school Wi-Fi blocking cdn sites) and try again.")}

const hdr=(r)=>({name:r.name||"",father:r.father||"",roll:r.roll||"",cls:r.cls||"",sec:r.sec||"",shift:r.shift==="PM"?"Afternoon":"Morning"});
function cardOf(r){
 const cf=snapOf(r),c=calcRes(cf,r.term,r.marks),g=r.grades||{},h=hdr(r),sec=h.sec?"-"+h.sec:"";
 const cols=[];c.subs.forEach(x=>x.s.c.forEach(p=>{const n=String(p.n).trim();if(p.m>0&&!cols.some(y=>y.toLowerCase()===n.toLowerCase()))cols.push(n)}));
 const cw=Math.max(40,Math.floor(420/Math.max(cols.length,1)));
 const head=`<tr><th style="width:118px;text-align:left;padding-left:7px">SUBJECT</th>${cols.map(n=>`<th>${e(n)}</th>`).join("")}<th style="width:70px">TOTAL</th><th style="width:46px">GRADE</th></tr>`;
 const body=c.subs.map(x=>{const cells=cols.map(n=>{const p=x.s.c.find(q=>q.m>0&&String(q.n).trim().toLowerCase()===n.toLowerCase());if(!p)return '<td class="na">&ndash;</td>';return `<td><b>${has(x.m,p.i)?f1(+x.m[p.i]):"--"}</b><i> / ${f1(+p.m)}</i></td>`}).join("");
  return `<tr class="${x.any?"":"nt"}"><td class="sj">${e(x.s.n)}</td>${cells}<td class="tt"><b>${x.any?f1(x.got):"--"}</b><i> / ${f1(x.mx)}</i></td><td class="gd">${x.any?e(x.g):"--"}</td></tr>`}).join("");
 const gsr=(cf.gs||[]).length?`<div class="go">${cf.gs.map(x=>`<span>${e(x.n)}: <b>${e(g[x.i]||"--")}</b></span>`).join("")}</div>`:"";
 const ss=cf.sc.slice().sort((a,b)=>b.from-a.from);
 const gsc=`<table class="gsc"><tr><th style="width:96px;text-align:left;padding-left:8px">GRADING SCALE</th>${ss.map(x=>`<th>${e(x.g)}</th>`).join("")}</tr><tr><td class="k">Percentage</td>${ss.map((x,i)=>`<td>${e(scRange(cf.sc,i))}</td>`).join("")}</tr><tr><td class="k">Remarks</td>${ss.map(x=>`<td>${e(x.r)}</td>`).join("")}</tr></table>`;
 const wd=r.wd,td=r.td,att=(wd===null||wd===undefined||td===null||td===undefined)?"--":wd+" / "+td+" days";
 const kd=lvl(r.cls||clsName(r.key))<=2,star='<svg width="30" height="30" viewBox="0 0 24 24" style="vertical-align:middle"><path fill="#ffb800" d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/></svg>';
 return `<div class="rc nw${kd?" kd":""}"><div class="fr">
<table class="lay hd"><tr><td class="lg"><img src="${IMG("logo.jpg")}" alt=""></td><td><div class="n1">OMYS SCHOOLS' NETWORK</div><div class="n2">S.A.J ACADEMY</div><div class="n3">Hussainabad</div></td><td class="lg"><img src="${IMG("omys.jpg")}" alt=""></td></tr></table>
<div class="ban"><b>REPORT CARD</b><span>${TN[r.term].toUpperCase()} EXAMINATION ${e(r.year)}</span></div>
<table class="inf"><tr><td><small>Student Name</small><b>${e(h.name)}</b></td><td><small>Father's Name</small><b>${e(h.father)}</b></td><td><small>Class / Section</small><b>${e(h.cls)}${e(sec)}</b></td></tr><tr><td><small>Roll No</small><b>${e(h.roll)}</b></td><td><small>Shift</small><b>${h.shift}</b></td><td><small>Attendance (present / total days)</small><b>${att}</b></td></tr><tr><td><small>Student ID</small><b>${e(SID(r.gr))}</b></td><td colspan="2"><small>GR No</small><b>${e(GRV(r.gr))}</b></td></tr></table>
<table class="mk">${head}${body}</table>${gsr}
<table class="sm"><tr><td><small>Total Marks</small><b>${c.tot||"--"}</b></td><td><small>Marks Obtained</small><b>${c.tot?f1(c.ob):"--"}</b></td><td><small>Percentage</small><b>${c.tot?c.pc+"%":"--"}</b></td><td><small>Grade</small><b>${e(c.gd||"--")}</b></td><td class="rs ${c.res==="FAILED"?"f":""}"><small>Result</small><b>${c.res||"--"}</b></td></tr></table>
${r.term==="T3"&&r.hi!==undefined&&c.tot?`<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;border:1px solid #bbb;border-radius:6px;padding:5px 9px;margin:5px 0;font-size:12px"><span>Class highest: <b>${r.hi}%</b></span><span>Class lowest: <b>${r.lo}%</b></span>${r.pos?`<span style="font-size:14px">${star} <b>${["","1st","2nd","3rd"][r.pos]} Position in Class</b> ${star}</span>`:""}</div>`:""}<div class="rm"><u>Remarks:</u> ${e(r.remarks||REM[c.gd]||c.rk||"")}</div>
<div class="sp">${kd?`<img src="${IMG("kid-boy.png")}" alt=""><div>${star} ${c.res==="FAILED"?"Keep trying!":"Well done!"} ${star}<small>${c.res==="FAILED"?"Practice makes perfect":"You are a superstar learner"}</small></div><img src="${IMG("kid-girl.png")}" alt="">`:""}</div>${gsc}
<table class="lay sg"><tr><td><span>Class Teacher</span></td><td><span>Head of Academics</span></td><td><span>Parent / Guardian</span></td><td style="width:130px"><span>Date: ${dmy(r.date)}</span></td></tr></table>
</div></div>`}
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function progCard(st,D){const h=hdr({...st,shift:shOf(st.key)}),c=D.c,days=D.days,ap=days?Math.round((c.P+c.L)*100/days):0,sec=st.sec?"-"+st.sec:"";
 const mo={};D.rows.forEach(x=>{const m=x.date.slice(0,7);(mo[m]=mo[m]||{P:0,A:0,L:0,V:0})[x.status]++});
 const mrows=Object.keys(mo).sort().map(m=>{const t=mo[m],n=t.P+t.A+t.L+t.V;return `<tr><td>${MON[+m.slice(5)-1]} ${m.slice(0,4)}</td><td>${n}</td><td>${t.P}</td><td>${t.A}</td><td>${t.L}</td><td>${t.V}</td><td>${n?Math.round((t.P+t.L)*100/n):0}%</td></tr>`}).join("");
 const done=["T1","T2","T3"].filter(t=>D.res[t]),ref=done.length?snapOf(D.res[done[done.length-1]]):cfgFor(stCls(st));
 const calcs={};done.forEach(t=>{calcs[t]=calcRes(snapOf(D.res[t]),t,D.res[t].marks)});
 const trow=t=>{const r=D.res[t];if(!r)return `<tr><td>${TN[t]}</td><td colspan="5" class="pend">Exam not yet held / result coming soon</td></tr>`;const x=calcs[t];return `<tr><td>${TN[t]}</td><td>${x.tot||"--"}</td><td>${x.tot?f1(x.ob):"--"}</td><td>${x.tot?x.pc+"%":"--"}</td><td>${e(x.gd)||"--"}</td><td>${x.res||"--"}</td></tr>`};
 const srows=ref.sub.map(s=>`<tr><td style="text-align:left">${e(s.n)}</td>${["T1","T2","T3"].map(t=>{if(!D.res[t])return '<td class="pend">--</td>';const x=calcs[t].subs.find(q=>q.s.id===s.id);return x&&x.any?`<td>${f1(x.got)} / ${f1(x.mx)}</td>`:"<td>--</td>"}).join("")}</tr>`).join("");
 const tile=(l,v)=>`<td><b>${v}</b>${l}</td>`;
 return `<div class="rc pg"><table class="lay hd"><tr><td class="lg" style="width:100px"><img src="${IMG("logo.jpg")}" alt=""></td><td style="font-size:24px;letter-spacing:1px">S.A.J ACADEMY<div style="font-size:14px">Hussainabad &middot; OMYS Schools' Network</div></td><td class="lg" style="width:100px"><img src="${IMG("omys.jpg")}" alt=""></td></tr></table>
<div class="ttl">STUDENT PROGRESS REPORT &nbsp;&middot;&nbsp; ${e(D.year)}</div>
<table class="inf"><tr><td class="k">Name</td><td>${e(st.name)}</td><td class="k">Father's Name</td><td>${e(st.father||"")}</td></tr><tr><td class="k">Class</td><td>${e(stCls(st))}${e(sec)}</td><td class="k">Shift</td><td>${h.shift}</td></tr><tr><td class="k">Roll No</td><td>${e(st.roll||"")}</td><td class="k">Student ID</td><td>${e(SID(st.gr))}</td></tr><tr><td class="k">GR No</td><td>${e(GRV(st.gr))}</td><td class="k"></td><td></td></tr></table>
<h4>ATTENDANCE</h4>${days?`<table class="tl"><tr>${tile("School days",days)}${tile("Present",c.P)}${tile("Absent",c.A)}${tile("Late",c.L)}${tile("Leave",c.V)}${tile("Attendance",ap+"%")}</tr></table><div class="bar"><i style="width:${ap}%"></i></div>${mrows?`<table class="gt" style="margin-top:8px"><tr><th>Month</th><th>Days</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>%</th></tr>${mrows}</table>`:""}<p style="font-size:11px;margin-top:4px;font-weight:400">Late counts as present. Holidays are not counted.</p>`:'<p class="pend" style="padding:6px 0">No attendance has been recorded yet.</p>'}
<h4>EXAMINATION RESULTS</h4><table class="gt"><tr><th style="text-align:left">Term</th><th>Total</th><th>Obtained</th><th>%</th><th>Grade</th><th>Result</th></tr>${["T1","T2","T3"].map(trow).join("")}</table>
${done.length?`<table class="gt" style="margin-top:8px"><tr><th style="text-align:left">Subject (obtained / total)</th><th>First Term</th><th>Mid Term</th><th>Final Term</th></tr>${srows}</table>`:""}
<table class="lay sg"><tr><td>Class Teacher: ____________</td><td>Head of Academic: ____________</td><td>Date: <u>${dmy(today())}</u></td></tr></table></div>`}

const RC_BW=`
/* black and white printing on pre-printed watermark paper: no colour fills, dark text, black lines */
html,body,.rc{background:transparent!important}
.rc{color:#000!important}
.rc img{filter:grayscale(1) contrast(1.15)}
.rc svg path{fill:#000!important}
.nw .n3,.nw .inf small,.nw .sm small,.nw .mk td i,.nw .mk tr.nt td,.pg .pend{color:#222!important}
.nw .mk td.na{color:#444!important}
.nw .mk td.tt,.nw .gsc td.k,.nw .gsc th,.pg .inf td.k,.pg .tl td{background:transparent!important}
.nw .gsc th{border-width:1.5px}
.nw .mk th,.nw .ban,.nw .sm td.rs{background:#000!important;color:#fff!important}
.nw .sm td.rs.f{background:transparent!important;color:#000!important;border:3px double #000}
.nw .fr,.nw .inf td,.nw .mk th,.nw .mk td,.nw .sm td,.nw .rm,.nw .gsc td,.nw .gsc th{border-color:#000!important}
.nw.kd .fr{border:4px solid #000!important;outline:2px dashed #000!important}
.nw.kd .n2,.nw.kd .n3,.nw.kd .inf small,.nw.kd .sp div,.nw.kd .sp div small{color:#000!important}
.nw.kd .ban{background:#000!important}
.nw.kd .inf td,.nw.kd .mk tr:nth-child(even) td,.nw.kd .mk td.tt,.nw.kd .go span,.nw.kd .sm td,.nw.kd .rm,.nw.kd .gsc th,.nw.kd .gsc td.k{background:transparent!important;border-color:#000!important}
.nw.kd .mk{border-color:#000!important}.nw.kd .mk th{background:#000!important;border-color:#000!important}.nw.kd .sm td.rs{background:#000!important}
.nw.kd .go span{border-color:#000!important}
.pg .ttl{background:#000!important;color:#fff!important}.pg .gt th{background:#000!important;color:#fff!important;border-color:#000!important}
.pg h4{color:#000!important;border-color:#000!important}.pg .tl b,.pg .inf td.k{color:#000!important}
.pg .inf td,.pg .tl td,.pg .gt td{border-color:#000!important}.pg .bar{border-color:#000!important}.pg .bar i{background:#000!important}
`;
/* ----- viewer / print / pdf ----- */
let VW=null;
const fitZ=()=>Math.min(1,(Math.min(innerWidth,900)-24)/794);
function showCards(cards,name){VW={cards,name};if(!$("#rcss")){const s=document.createElement("style");s.id="rcss";s.textContent=RC_CSS;document.head.appendChild(s)}
 const o0=$("#rv");if(o0)o0.remove();const z=fitZ(),o=document.createElement("div");o.id="rv";
 o.innerHTML=`<div class="rvb"><b>${e(name)}</b><span><button class="s" data-a="vprint">Print</button><button class="s" data-a="vpdf">Download PDF</button><button class="s g" data-a="vclose">Close</button></span></div><div class="rvs">${cards.map(c=>`<div class="rvw" style="width:${Math.round(794*z)}px;height:${Math.round(1123*z)}px"><div class="rvp" style="transform:scale(${z})">${c}</div></div>`).join("")}</div>`;
 document.body.appendChild(o);document.body.classList.add("rvo")}
const imgsReady=d=>Promise.all(Array.from((d&&d.images)||(d&&d.querySelectorAll?d.querySelectorAll("img"):[])).map(i=>i.complete&&i.naturalWidth?1:new Promise(r=>{i.onload=i.onerror=r})));
async function printCards(cards,bw=true){const f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";document.body.appendChild(f);
 const d=f.contentDocument;d.open();d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${SCH}</title><style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}${RC_CSS}${bw?RC_BW:""}.rc{height:1120px;overflow:hidden}.rc:last-child{page-break-after:auto}</style></head><body>${cards.join("")}</body></html>`);d.close();
 await imgsReady(d);f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),120000)}
const B64={};
async function b64(u){if(B64[u])return B64[u];const r=await fetch(u,{cache:"force-cache"});if(!r.ok)throw new Error("Could not load a logo image. Please refresh and try again.");const b=await r.blob();return B64[u]=await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=()=>rej(new Error("Could not read a logo image"));f.readAsDataURL(b)})}
async function inlineImgs(html){const us=[...new Set([...html.matchAll(/src="([^"]+\/assets\/[^"]+)"/g)].map(m=>m[1]))];for(const u of us){const d=await b64(u);html=html.split('src="'+u+'"').join('src="'+d+'"')}return html}
async function pdfCards(cards,name){await ensurePdfLibs(false);
 const host=document.createElement("div");host.style.cssText="position:absolute;left:-10000px;top:0;width:794px;height:1123px;background:#fff;pointer-events:none;overflow:hidden";document.body.appendChild(host);
 try{const pdf=new window.jspdf.jsPDF("p","mm","a4");
  for(let i=0;i<cards.length;i++){toast(`Preparing PDF ${i+1} / ${cards.length} ...`);
   host.innerHTML=`<style>${RC_CSS}</style>`+await inlineImgs(cards[i]);await imgsReady(host);if(document.fonts&&document.fonts.ready)await document.fonts.ready;
   const el=host.querySelector(".rc"),cv=await window.html2canvas(el,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false,imageTimeout:15000,foreignObjectRendering:false,width:794,height:1123,windowWidth:794,windowHeight:1123,scrollX:0,scrollY:0,x:0,y:0});
   if(!cv||!cv.width||!cv.height)throw new Error("Could not draw the report card. Please try again.");
   if(i)pdf.addPage();pdf.addImage(cv.toDataURL("image/jpeg",.92),"JPEG",0,0,210,297);await new Promise(r=>setTimeout(r,0))}
  pdf.save(name.replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-")+".pdf");toast("PDF downloaded")}finally{host.remove()}}

/* ----- progress data ----- */
async function progData(st){const y=S.ry,[a0,a1]=yrWin(y);
 const kc=S.me.role==="admin"?[]:[where("key","==",st.key)];
 const [att,res]=await Promise.all([rdC([query(ac,...kc,where("gr","==",st.gr))]),rd([query(collection(db,"results"),...kc,where("gr","==",st.gr))])]);
 const rows=att.filter(x=>(!a0||(x.date>=a0&&x.date<=a1))&&!offDay(x.date)),R={};res.filter(r=>r.year===y).forEach(r=>R[r.term]=r);
 return {rows,c:tally(rows),days:rows.length,res:R,year:y}}

/* ----- results screens (marks entry, lock, edit requests) ----- */
const loadRes=async(k,t,y)=>(await cached("res:k:"+k+":"+t,3*MIN,()=>rd([query(collection(db,"results"),where("key","==",k),where("term","==",t))]))).filter(r=>r.year===y);
const isLocked=r=>r&&r.locked===true,isPend=r=>r&&r.req&&r.req.status==="pending";
const sumHtml=c=>{const k=(l,v,x)=>`<div class="kp" style="--c:var(--${x})"><small>${l}</small><b>${v}</b></div>`;return `<div class="cards">${k("Total marks",c.tot||"-","pr")}${k("Obtained",c.tot?f1(c.ob):"-","ok")}${k("Percentage",c.tot?c.pc+"%":"-","pr2")}${k("Grade",e(c.gd)||"-","lt")}${k("Result",c.res||"-",c.res==="FAILED"?"no":"ok")}</div>`};
const readMarks=()=>{const m={};document.querySelectorAll(".mk").forEach(i=>{if(i.value!==""){(m[i.dataset.sb]=m[i.dataset.sb]||{})[i.dataset.cp]=+i.value}});return m};
function recalcForm(){const c=calcRes(S.rcf,S.rt,readMarks());document.querySelectorAll(".mk").forEach(i=>i.style.borderColor=(i.value!==""&&(+i.value>+i.max||+i.value<0))?"var(--no)":"");
 c.subs.forEach(x=>{const el=$("#st_"+x.s.id);if(el)el.textContent=f1(x.got)+" / "+f1(x.mx)+(x.any?" - "+x.g:"")});const s=$("#rsum");if(s)s.innerHTML=sumHtml(c)}
document.addEventListener("input",ev=>{if(ev.target.classList&&ev.target.classList.contains("mk"))recalcForm()});
async function resForm(st,l){const k=S.key,r=S.rm[st.gr]||{},cls=stCls(st)||clsName(k),cf=cfgFor(cls),t=S.rt;S.rcf=cf;
 let wd=r.wd,td=r.td;if(wd===undefined||wd===null||td===undefined||td===null){try{const a=await progData(st);wd=a.c.P+a.c.L;td=a.days}catch{wd="";td=""}}
 const subs=cf.sub.filter(s=>!s.t1||t==="T1"),c=calcRes(cf,t,r.marks);
 const inp=(s,cp)=>{const x=(r.marks&&r.marks[s.id]||{})[cp.i];return cp.m>0?`<label class="mkl"><span>${e(cp.n)} <small>/ ${f1(+cp.m)}</small></span><input class="mk" type="number" inputmode="decimal" step="0.5" min="0" max="${cp.m}" data-sb="${e(s.id)}" data-cp="${e(cp.i)}" value="${x===undefined?"":x}"></label>`:""};
 const nxt=l[l.findIndex(x=>x.gr===st.gr)+1],sc=c.subs.reduce((a,x)=>(a[x.s.id]=x,a),{});
 const subCards=subs.map(s=>{const x=sc[s.id];return `<div class="card"><h3>${e(s.n)} <span class="pill" id="st_${e(s.id)}">${f1(x.got)} / ${f1(x.mx)}${x.any?" - "+e(x.g):""}</span></h3><div class="mkg">${s.c.map(cp=>inp(s,cp)).join("")}</div></div>`}).join("");
 const gl=["",...cf.sc.slice().sort((a,b)=>b.from-a.from).map(x=>x.g)];
 const gsel=(cf.gs||[]).map(x=>`<label class="mkl"><span>${e(x.n)} (grade)</span><select id="g_${e(x.i)}">${gl.map(o=>`<option value="${e(o)}" ${((r.grades||{})[x.i]||"")===o?"selected":""}>${e(o)||"-"}</option>`).join("")}</select></label>`).join("");
 return `<div class="card"><div class="row"><button class="s g" data-a="rback">&larr; Back to list</button><h3 style="margin:0">${e(st.name)}</h3><span class="mu">Roll ${e(st.roll)} | ID ${e(SID(st.gr))} | ${e(kn(st.key))} | ${TN[t]} ${e(S.ry)}</span></div>${r.id?'<p class="mu" style="margin:8px 0 0">Editing was approved for this result. Saving will lock it again.</p>':""}</div>${subCards||'<div class="card empty">No subjects are set for this class. Ask the admin to add them (Subjects).</div>'}
<div class="card"><h3>Other details</h3><div class="mkg">${gsel}<label class="mkl"><span>Days present</span><input id="r_wd" type="number" min="0" value="${wd===null||wd===undefined?"":wd}"></label><label class="mkl"><span>Out of (school days)</span><input id="r_td" type="number" min="0" value="${td===null||td===undefined?"":td}"></label><label class="mkl"><span>Date on result</span><input id="r_date" type="date" value="${e(r.date||today())}"></label></div><div class="row"><textarea id="r_rem" rows="2" placeholder="Remarks (leave empty to use the automatic remark)" style="width:100%">${e(r.remarks||"")}</textarea></div><p class="mu" style="margin:0">Leave a subject empty if the student does not take it. Saving locks the result.</p></div>
<div id="rsum">${sumHtml(c)}</div><div class="row"><button data-a="savres" data-n="back">Save</button>${nxt?'<button data-a="savres" data-n="next">Save &amp; next student</button>':""}<button class="g" data-a="rback">Back to list</button>${r.id?'<button class="s d" data-a="delres">Delete this result</button>':""}</div>`}
const stPill=r=>{if(!r)return '<span class="pill">Pending</span>';const c=calcRes(snapOf(r),r.term,r.marks),t=c.tot?c.pc+"% - "+e(c.gd):"saved";
 if(isPend(r))return `<span class="pill lt">${t} &middot; Edit requested</span>`;if(r.locked===false)return `<span class="pill lt">${t} &middot; Unlocked for edit</span>`;return `<span class="pill ok">${t} &middot; Locked</span>`};
V.res=async()=>{const m=S.me;if(m.role==="parent")return await parentRes();
 const ks=keys();if(!ks.length)return empty("No classes available.");
 const sel=ksel(),k=S.key,l=inKey(k),rows=await loadRes(k,S.rt,S.ry);S.rm={};rows.forEach(r=>S.rm[r.gr]=r);
 if(m.role==="admin")await loadReqN();
 if(S.rs&&m.role==="teacher"){const st=l.find(x=>x.gr===S.rs);const cur=S.rm[S.rs];if(st&&(!cur||!isLocked(cur)))return await resForm(st,l);if(st)toast("This result is locked. Send an edit request first.",true);S.rs=""}
 const ctl=`<div class="row">${sel}<select data-c="rt">${Object.entries(TN).map(([a,b])=>`<option value="${a}" ${S.rt===a?"selected":""}>${b}</option>`).join("")}</select><input data-c="ry" value="${e(S.ry)}" placeholder="2025-2026" size="10" title="Academic year"></div>`;
 const n=Object.keys(S.rm).length,pend=m.role==="admin"&&S.reqN?`<div class="card hol"><b>${S.reqN} edit request${S.reqN>1?"s":""} waiting for approval</b> <button class="s" data-a="gotoreq">Review</button></div>`:"";
 const tr=l.map(s=>{const r=S.rm[s.gr],g=e(s.gr);let act="";
  if(m.role==="teacher"){if(!r)act=m.inc?"":`<button class="s" data-a="rmarks" data-g="${g}">Enter marks</button>`;else if(!isLocked(r))act=`<button class="s" data-a="rmarks" data-g="${g}">Edit marks</button>`;else if(!isPend(r))act=`<button class="s g" data-a="rreq" data-g="${g}">Request edit</button>`}
  else if(r&&isPend(r))act=`<button class="s" data-a="rdec" data-g="${g}" data-ok="1">Approve</button><button class="s g" data-a="rdec" data-g="${g}" data-ok="0">Reject</button>`;
  const rj=r&&r.req&&r.req.status==="rejected"&&isLocked(r)&&m.role==="teacher"?'<br><span class="mu">Last edit request was rejected</span>':"";
  return `<tr><td>${e(s.roll)}</td><td><b>${e(s.name)}</b><br><span class="mu">ID ${g.toUpperCase()} | ${e(s.father)}</span>${isPend(r)&&r.req.reason?`<br><span class="mu">Reason: ${e(r.req.reason)}</span>`:""}${rj}</td><td>${stPill(r)}</td><td><div class="row" style="margin:0">${act}${r?`<button class="s g" data-a="rview" data-g="${g}">View</button><button class="s g" data-a="rprint" data-g="${g}">Print</button><button class="s g" data-a="rpdf" data-g="${g}">PDF</button>`:""}<button class="s g" data-a="prog" data-g="${g}">Progress</button></div></td></tr>`}).join("");
 return `<div class="card"><h3>${m.role==="admin"?"Student Results (view / approve)":"Student Results"}</h3>${ctl}<div class="row"><b>${TN[S.rt]} ${e(S.ry)}</b><span class="mu">${n} of ${l.length} students have a result.</span>${n?'<button data-a="rprintall">Print all</button><button class="g" data-a="rpdfall">Download all as PDF</button>':""}</div></div>${pend}<div class="card"><div class="tw"><table><tr><th>Roll</th><th>Student</th><th>Result</th><th>Actions</th></tr>${tr||'<tr><td colspan="4" class="mu">No students in this class</td></tr>'}</table></div></div>`};

/* ----- edit requests page (admin / principal) ----- */
V.reqs=async()=>{if(S.me.role!=="admin")return empty("Only the principal/admin can review edit requests.");
 S.rq=(await rd([query(collection(db,"results"),where("req.status","==","pending"))])).sort((a,b)=>(a.req.at||0)-(b.req.at||0));S.reqN=S.rq.length;
 const rows=S.rq.map(r=>`<div class="card"><div class="row"><b>${e(r.name)}</b><span class="mu">Roll ${e(r.roll)} | ID ${e(SID(r.gr))} | ${e(kn(r.key))} | ${TN[r.term]} ${e(r.year)}</span></div><p style="margin:6px 0"><span class="mu">Requested by ${e(r.req.byName)} on ${new Date(r.req.at).toLocaleString()}</span><br>Reason: ${e(r.req.reason)}</p><div class="row"><button class="s" data-a="rdec2" data-i="${e(r.id)}" data-ok="1">Approve</button><button class="s g" data-a="rdec2" data-i="${e(r.id)}" data-ok="0">Reject</button><button class="s g" data-a="rview2" data-i="${e(r.id)}">View result</button></div></div>`).join("");
 return `<div class="card"><h3>Edit Requests (${S.rq.length})</h3><p class="mu" style="margin:0">Teacher edit requests appear here. Approve to allow one edit.</p></div>${rows||'<div class="card empty">No pending requests.</div>'}`};
async function decide(r,ok){const q=r.req||{};if(!await ask(ok?"Approve this edit?":"Reject this request?",ok?(r.name+" - "+TN[r.term]+": the teacher will be able to edit this result. It locks again when saved."):"The result stays locked.",ok?"Yes, approve":"Yes, reject",!ok))return;
 await run(async()=>{await updateDoc(doc(db,"results",r.id),{locked:ok?false:true,req:{...q,status:ok?"approved":"rejected",dby:S.me.u,dbyName:S.me.name,dat:Date.now()}});toast(ok?"Approved. The teacher can now edit.":"Request rejected");render()})}
async function askReason(){if(window.Swal){const x=await Swal.fire({title:"Request to edit",text:"Write the reason. The principal/admin will review it.",input:"textarea",inputPlaceholder:"Reason for editing...",showCancelButton:true,confirmButtonText:"Send request",confirmButtonColor:"#2f6fdf",...SW(),inputValidator:v=>!v||!v.trim()?"Please write a reason":undefined});return x.isConfirmed?x.value.trim():null}const t=prompt("Reason for editing this result:");return t&&t.trim()?t.trim():null}
const stOf=g=>S.students.find(x=>x.gr===g);
const nm=(r)=>"result-"+(r.name||"student")+"-"+TN[r.term];
CH.rt=x=>{S.rt=x.value;S.rs="";render()};CH.ry=x=>{S.ry=x.value.replace(/[\/\s]/g,"")||ayear();S.rs="";render()};
Object.assign(H,{
 rmarks(d){S.rs=d.g;render()},rback(){S.rs="";render()},gotoreq(){S.tab="reqs";render()},
 async rreq(d){const r=S.rm[d.g];if(!r)return;const why=await askReason();if(!why)return;await run(async()=>{await updateDoc(doc(db,"results",r.id),{req:{status:"pending",by:S.me.u,byName:S.me.name,reason:why,at:Date.now()}});toast("Request sent to the principal/admin");render()})},
 async rdec(d){const r=S.rm[d.g];if(r)await decide(r,d.ok==="1")},
 async rdec2(d){const r=S.rq.find(x=>x.id===d.i);if(r)await decide(r,d.ok==="1")},
 rview2(d){const r=S.rq.find(x=>x.id===d.i);if(r)showCards([cardOf(r)],r.name+" - "+TN[r.term])},
 async savres(d){const st=stOf(S.rs);if(!st)return;const cf=S.rcf,t=S.rt,marks=readMarks();
  if([...document.querySelectorAll(".mk")].some(i=>i.value!==""&&(+i.value>+i.max||+i.value<0)))return toast("A mark is higher than its maximum (or negative). Please correct the red box.",true);
  if(!Object.keys(marks).length)return toast("Please enter marks first",true);
  const c=calcRes(cf,t,marks),grades={};(cf.gs||[]).forEach(x=>{const el=$("#g_"+x.i);if(el&&el.value)grades[x.i]=el.value});
  const cl=st.key.split("|"),id=S.ry+"_"+t+"_"+st.gr,num=i=>{const x=v(i);return x===""?null:Math.max(0,+x||0)};
  const data={id,gr:st.gr,name:st.name,father:st.father||"",roll:st.roll||"",cls:stCls(st)||cl[1]||"",sec:st.sec||cl[2]||"",shift:shOf(st.key),key:st.key,term:t,year:S.ry,marks,grades,sub:cf.sub,gs:cf.gs||[],sc:cf.sc,remarks:v("r_rem"),date:v("r_date")||today(),wd:num("r_wd"),td:num("r_td"),by:S.me.u,byName:S.me.name,at:Date.now(),tot:c.tot,ob:c.ob,pc:c.pc,gd:c.gd,res:c.res,locked:true,req:null};
  const l=inKey(S.key),nx=l[l.findIndex(x=>x.gr===st.gr)+1];
  await run(async()=>{await setDoc(doc(db,"results",id),data);logEv("result_save","Saved "+(TN[t]||t)+" result of "+st.name+" (ID "+st.gr+", "+kn(st.key)+")");toast("Result saved and locked for "+st.name);S.rs=d.n==="next"&&nx?nx.gr:"";render()})},
 async delres(){const st=stOf(S.rs);if(!st||!await ask("Delete this result?","The saved "+TN[S.rt]+" result of "+st.name+" will be removed.","Yes, delete",1))return;await run(async()=>{await deleteDoc(doc(db,"results",S.ry+"_"+S.rt+"_"+st.gr));S.rs="";toast("Result deleted");render()})},
 rview(d){const r=S.rm[d.g];if(r)showCards([cardOf(r)],r.name+" - "+TN[r.term])},
 rprint(d){const r=S.rm[d.g];if(r)printCards([cardOf(r)])},
 async rpdf(d){const r=S.rm[d.g];if(r)await run(()=>pdfCards([cardOf(r)],nm(r)))},
 rprintall(){const l=inKey(S.key).filter(s=>S.rm[s.gr]).map(s=>cardOf(S.rm[s.gr]));if(l.length)printCards(l)},
 async rpdfall(){const l=inKey(S.key).filter(s=>S.rm[s.gr]).map(s=>S.rm[s.gr]);if(l.length)await run(()=>pdfCards(l.map(cardOf),"results-"+kn(S.key).replace(/[^\w]+/g,"-")+"-"+TN[S.rt]))},
 async prog(d){if(S.me.role==="parent")return;const st=stOf(d.g);if(!st)return;await run(async()=>{toast("Preparing progress report...");const D=await progData(st);showCards([progCard(st,D)],"Progress - "+st.name)})},
 vprint(){if(VW)printCards(VW.cards)},async vpdf(){if(!VW)return;try{await pdfCards(VW.cards,VW.name)}catch(x){if(await ask("PDF could not be created",(x&&x.message||"Unknown error")+". Open the print window instead? Choose Save as PDF there.","Open print window"))printCards(VW.cards,false)}},vclose(){const o=$("#rv");if(o)o.remove();document.body.classList.remove("rvo");VW=null}});

/* ----- v13b: profiles (students / parents / teachers / incharges) ----- */
S.ep=null;
const FLD=(id,l,val,type)=>`<label class="mkl"><span>${l}</span><input id="${id}" type="${type||"text"}" value="${e(val||"")}"></label>`;
const SEL=(id,l,val,opts)=>`<label class="mkl"><span>${l}</span><select id="${id}">${opts.map(o=>`<option value="${e(o)}" ${o===(val||"")?"selected":""}>${e(o)||"-"}</option>`).join("")}</select></label>`;
const ROW=(l,x)=>`<div class="row" style="margin:6px 0"><b style="min-width:150px">${l}</b><span>${e(x)||"-"}</span></div>`;
V.prof=async()=>{const m=S.me,ep=S.ep;let k,id;
 if(m.role==="parent"){k="stu";id=m.gr}
 else if(m.role==="admin"){if(!ep)return empty("Open a profile from the Students or Users list.");k=ep.k;id=ep.id}
 else if(ep&&ep.k==="stu"){k="stu";id=ep.id;S.ep=null}
 else{k="usr";id=m.u}
 const back=m.role==="admin"?'<button class="s g" data-a="pback">&larr; Back</button>':(k==="stu"&&m.role!=="parent"?'<button class="s g" data-a="pstback">&larr; Back to students</button>':"");
 if(k==="stu"){const st=S.students.find(x=>x.gr===id);if(!st)return empty("Student not found.");
  const ed=m.role==="parent"||m.role==="admin"||(m.role==="teacher"&&!m.inc&&m.classes.includes(st.key)),done=["name","father","dob","bg","phone","addr"].filter(f=>!stMiss(st[f])).length;
  const head=`<div class="row">${back}<h3 style="margin:0">Student Profile</h3><span class="pill ${done===6?"ok":"lt"}">${done} of 6 key details filled</span></div><p class="mu" style="margin:6px 0 0">${e(SID(st.gr))} | ${e(kn(st.key))} | Roll ${e(st.roll)}</p>`;
  if(!ed)return `<div class="card">${head}${ROW("Student name",st.name)}${ROW("Father's name",st.father)}${ROW("Date of birth",st.dob?dmy(st.dob):"")}${ROW("Blood group",st.bg)}${ROW("Contact number",st.phone)}${ROW("Email",st.email)}${ROW("Address",st.addr)}</div>`;
  return `<div class="card">${head}${m.role==="parent"&&done<6?'<p style="margin:8px 0 0">Please complete the details below. You can change them again at any time.</p>':""}</div><div class="card"><div class="mkg">${FLD("p_name","Student name",st.name)}${FLD("p_father","Father's name",stCl(st.father))}${FLD("p_dob","Date of birth",stCl(st.dob),"date")}${SEL("p_bg","Blood group",stCl(st.bg),["",...BGL])}${FLD("p_phone","Contact number",stCl(st.phone),"tel")}${FLD("p_email","Email",stCl(st.email),"email")}</div><div class="row"><textarea id="p_addr" rows="2" placeholder="Address" style="width:100%">${e(stCl(st.addr))}</textarea></div><div class="row"><button data-a="pstu" data-g="${e(id)}">Save profile</button></div></div>`}
 const x=await api("getProfile",{username:id}),pf=x.pf||{};
 return `<div class="card"><div class="row">${back}<h3 style="margin:0">${m.role==="admin"&&id!==m.u?"User Profile":"My Profile"}</h3><span class="pill">${e(x.title||x.role)}</span></div><p class="mu" style="margin:6px 0 0">Username: ${e(id)}</p></div><div class="card"><div class="mkg">${FLD("p_name","Full name",x.name)}${FLD("p_desig","Designation",pf.desig)}${FLD("p_dob","Date of birth",pf.dob,"date")}${SEL("p_gender","Gender",pf.gender,["","Male","Female"])}${FLD("p_phone","Contact number",pf.phone,"tel")}${FLD("p_email","Email",pf.email,"email")}${FLD("p_qual","Qualification",pf.qual)}${FLD("p_joined","Joining date",pf.joined,"date")}</div><div class="row"><textarea id="p_addr" rows="2" placeholder="Address" style="width:100%">${e(pf.addr||"")}</textarea></div><div class="row"><button data-a="pusr" data-u="${e(id)}">Save profile</button></div></div>`};
Object.assign(H,{
 sprof(d){S.ep={k:"stu",id:d.g};S.tab="prof";render()},
 uprof(d){const u=(S.users||[]).find(x=>x.username===d.u);S.ep={k:u&&u.role==="parent"?"stu":"usr",id:d.u};S.tab="prof";render()},
 pback(){const k=S.ep&&S.ep.k;S.ep=null;S.tab=k==="stu"&&S.me.role==="admin"&&S.fromU?"usr":(k==="stu"?"stu":"usr");render()},
 pstback(){S.tab="stu";render()},
 async pstu(d){await run(async()=>{await api("saveStudentProfile",{gr:d.g,f:{name:v("p_name"),father:v("p_father"),dob:v("p_dob"),bg:v("p_bg"),phone:v("p_phone"),email:v("p_email"),addr:v("p_addr")}});await loadStudents();toast("Profile saved");render()})},
 async pusr(d){await run(async()=>{const name=v("p_name");await api("saveUserProfile",{username:d.u,f:{name,desig:v("p_desig"),dob:v("p_dob"),gender:v("p_gender"),phone:v("p_phone"),email:v("p_email"),qual:v("p_qual"),joined:v("p_joined"),addr:v("p_addr")}});if(d.u===S.me.u&&name)S.me.name=name;toast("Profile saved");render()})}});
{const _child=V.child;V.child=async()=>{const h=await _child(),st=S.students[0],miss=st&&(!st.dob||!st.addr||!st.phone||!st.bg);
 return (miss?`<div class="card hol"><b>Please complete your child's profile</b> (date of birth, blood group, contact number, address). <button class="s" data-a="gotoprof">Complete profile</button></div>`:"")+h}}
H.gotoprof=()=>{S.tab="prof";render()};

/* ----- v13b: attendance lock (teacher completes -> only admin/principal can change) ----- */
async function getLock(){try{return (await rd([query(collection(db,"attlock"),where("date","==",S.date),where("key","==",S.key))]))[0]||null}catch{return null}}
{const _t=V.take;V.take=async()=>{let h=await _t();if(!keys().length||offDay(S.date)||S.me.role==="parent")return h;
 const lk=await getLock(),m=S.me,past=m.role==="teacher"&&S.date!==today();S.lk=lk;
 if(lk){const who=`Attendance was completed and locked${lk.byName?" by "+e(lk.byName):""}.`;
  h=h.replace('<div class="tw">',`<div class="card hol" style="margin:10px 0">${who} ${m.role==="admin"?"As admin/principal you can still mark a late arrival or leave, or correct a status.":"Only the admin or principal can change it now (for example a late arrival or a leave application)."}</div><div class="tw">`);
  if(m.role!=="admin")h=h.replace(/data-a="mark"/g,'data-a="mark" disabled').replace('data-a="allp"','data-a="allp" disabled')}
 else if(past){h=h.replace('<div class="tw">','<div class="card hol" style="margin:10px 0">Past days are <b>view only</b>. Only the admin can change or add attendance of a past date. Attendance can be taken for today only.</div><div class="tw">').replace(/data-a="mark"/g,'data-a="mark" disabled').replace('data-a="allp"','data-a="allp" disabled')}
 else if((m.role==="teacher"&&!m.inc)||m.role==="admin")h+=`<div class="card" style="margin-top:14px"><p class="mu" style="margin:0 0 10px">Attendance counts only after you press the button below.</p><button data-a="${m.role==="admin"?"confatt":"lockatt"}" style="width:100%">${m.role==="admin"?"Confirm Attendance":"Confirm Attendance &amp; Lock"}</button></div>`;
 return h}}
async function confirmAtt(l){const mk=l.filter(x=>S.att[x.gr]),um=l.filter(x=>!S.att[x.gr]); /* marked = count them, unmarked = Absent */
 for(let i=0;i<mk.length;i+=20)await Promise.all(mk.slice(i,i+20).map(x=>updateDoc(doc(db,"att",S.date+"_"+x.gr),{ok:true})));
 for(let i=0;i<um.length;i+=20)await Promise.all(um.slice(i,i+20).map(x=>setDoc(doc(db,"att",S.date+"_"+x.gr),{gr:x.gr,date:S.date,month:S.date.slice(0,7),key:x.key,status:"A",ok:true,auto:1,by:S.me.u,at:Date.now()})))}
H.confatt=async()=>{const l=inKey(S.key);if(!l.length)return;if(Q.l.length){await flush();if(Q.l.length)return toast("Some marks are still saving. Check your internet and try again.",true)}
 const mi=l.filter(x=>!S.att[x.gr]).length;if(mi===l.length)return toast("Mark at least one student first.",true);if(!await ask("Confirm attendance?","Attendance of "+dmy(S.date)+" for this class will be counted."+(mi?" "+mi+" student(s) are not marked and will be counted ABSENT.":""),"Yes, confirm",mi?1:0))return;await run(async()=>{const sm=attSum(l);await confirmAtt(l);logEv("att_confirm",sm.t,sm.m);toast("Attendance confirmed and counted");render()})};
H.lockatt=async()=>{const l=inKey(S.key);if(!l.length)return;const miss=l.filter(s=>!S.att[s.gr]);if(miss.length===l.length)return toast("Mark at least one student first.",true);
 if(Q.l.length){await flush();if(Q.l.length)return toast("Some marks are still saving. Check your internet and try again.",true)}
 if(!await ask("Confirm attendance and lock?","Attendance of "+dmy(S.date)+" will be counted and the whole class will be locked."+(miss.length?" "+miss.length+" student(s) are not marked: they will be counted ABSENT automatically, and only the admin or principal can change that later.":" After this only the admin or principal can change it."),"Yes, confirm & lock",miss.length?1:0))return;
 await run(async()=>{const sm=attSum(l);await confirmAtt(l);await setDoc(doc(db,"attlock",S.date+"_"+S.key),{key:S.key,date:S.date,by:S.me.u,byName:S.me.name,at:Date.now()});logEv("att_lock",sm.t,sm.m);toast("Attendance completed and locked");render()})};

/* ----- v13c: parent results (coming soon / on-off / dues hold), promotion ----- */
function normDob(x){x=String(x||"").trim();if(!x)return"";if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(x)){const[a,b,c]=x.split("-");return a+"-"+b.padStart(2,"0")+"-"+c.padStart(2,"0")}
 let m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(x);if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
 if(/^\d{4,6}$/.test(x)&&+x>1000){const d=new Date(Math.round((+x-25569)*86400000));return isNaN(d)?"":d.toISOString().slice(0,10)}return""}
const soonCard=(t,m)=>`<div class="card empty" style="padding:34px 18px;text-align:center"><div style="font-size:42px;line-height:1">&#9203;</div><h3 style="margin:12px 0 6px">${t}</h3><p style="margin:0;max-width:440px;margin-inline:auto">${m}</p></div>`;
async function parentRes(){try{await loadCfg();await loadStudents()}catch{}const st=S.students[0];if(!st)return empty("Student record not found.");
 if(!(S.cfg.settings&&S.cfg.settings.parentResults===true))return soonCard("Results","This feature is currently not available. Coming soon.");
 if(st.hold)return `<div class="card" style="border-color:rgba(255,107,107,.55);padding:26px 18px;text-align:center"><h3 style="color:var(--no);margin:0 0 8px">Result on hold</h3><p style="margin:0 auto;max-width:480px">The result of <b>${e(st.name)}</b> is on hold. Please clear the dues at the school office.</p></div>`;
 let rows=[];try{rows=(await cached("res:g:"+st.gr,10*MIN,()=>rd([query(collection(db,"results"),where("gr","==",st.gr))]))).filter(r=>r.locked!==false)}catch{return soonCard("Results","This feature is currently not available. Coming soon.")}
 const to={T1:1,T2:2,T3:3};rows.sort((a,b)=>String(b.year).localeCompare(String(a.year))||to[b.term]-to[a.term]);S.pr=rows;
 if(!rows.length)return `<div class="card empty">No result has been published for ${e(st.name)} yet.</div>`;
 return `<div class="card"><h3>Results of ${e(st.name)}</h3></div>`+rows.map(r=>{const c=calcRes(snapOf(r),r.term,r.marks);return `<div class="card"><div class="row"><b>${TN[r.term]}</b><span class="mu">${e(r.year)} | Class ${e(r.cls)}${r.sec?"-"+e(r.sec):""}</span><span class="pill ${c.res==="FAILED"?"no":"ok"}">${c.tot?c.pc+"% - "+e(c.gd)+" - "+c.res:"saved"}</span></div><div class="row"><button class="s" data-a="pview" data-i="${e(r.id)}">View</button><button class="s g" data-a="pprint" data-i="${e(r.id)}">Print</button><button class="s g" data-a="ppdf" data-i="${e(r.id)}">Download PDF</button></div></div>`}).join("")}
Object.assign(H,{
 pview(d){const r=(S.pr||[]).find(x=>x.id===d.i);if(r)showCards([cardOf(r)],r.name+" - "+TN[r.term])},
 pprint(d){const r=(S.pr||[]).find(x=>x.id===d.i);if(r)printCards([cardOf(r)])},
 async ppdf(d){const r=(S.pr||[]).find(x=>x.id===d.i);if(r)await run(()=>pdfCards([cardOf(r)],nm(r)))}});

/* admin: Result Access (on/off for parents + dues hold) */
V.racc=async()=>{if(S.me.role!=="admin")return empty("Only the admin can manage result access.");
 const on=!!(S.cfg.settings&&S.cfg.settings.parentResults===true),ks=keys();if(!S.hk||!ks.includes(S.hk))S.hk=ks[0];
 const inK=S.students.filter(s=>s.key===S.hk).sort((a,b)=>(+a.roll||0)-(+b.roll||0)),held=S.students.filter(s=>s.hold).sort((a,b)=>kcmp(a.key,b.key)||(+a.roll||0)-(+b.roll||0));
 return `<div class="card"><h3>Results for Parents</h3><p class="mu" style="margin:0 0 10px">${on?"Results are <b>visible</b> to parents.":"Results are <b>hidden</b> from parents."}</p><div class="row"><button class="${on?"d":""}" data-a="ptog">${on?"Turn OFF (hide results from parents)":"Turn ON (show results to all parents)"}</button></div></div>
 <div class="card"><h3>Hold result (dues not paid)</h3><p class="mu" style="margin:0 0 10px">Held students are asked to clear dues. Release after payment.</p><div class="row"><select data-c="hk">${ks.map(k=>`<option value="${e(k)}" ${k===S.hk?"selected":""}>${e(kn(k))}</option>`).join("")}</select><select id="hst"><option value="">Select student</option>${inK.map(s=>`<option value="${e(s.gr)}" ${s.hold?"disabled":""}>${e(s.roll)} - ${e(s.name)} (${e(SID(s.gr))})${s.hold?" - on hold":""}</option>`).join("")}</select><button data-a="hold" data-h="1">Hold result</button></div></div>
 <div class="card"><h3>Students on hold (${held.length})</h3><div class="tw"><table class="ut"><tr><th>Student ID</th><th>Student</th><th>Class</th><th></th></tr>${held.map(s=>`<tr><td>${e(SID(s.gr))}</td><td>${e(s.name)}</td><td>${e(kn(s.key))}</td><td><button class="s" data-a="hold" data-h="0" data-g="${e(s.gr)}">Release</button></td></tr>`).join("")||'<tr><td colspan="4" class="mu">No student is on hold</td></tr>'}</table></div></div>`};
CH.hk=x=>{S.hk=x.value;render()};
Object.assign(H,{
 async ptog(){const on=!!(S.cfg.settings&&S.cfg.settings.parentResults===true);if(!await ask(on?"Hide results from parents?":"Show results to all parents?",on?"Parents will see \"Coming soon\" again.":"Every parent will see only their own child's result (students on hold excluded).",on?"Yes, hide":"Yes, show",on))return;
  await run(async()=>{const d={parentResults:!on,at:Date.now(),by:S.me.u};await setDoc(doc(db,"cfg","settings"),d,{merge:true});if(!on){const nr=doc(collection(db,"notices"));await setDoc(nr,{id:nr.id,title:"Results are available",text:"The results are now available. Please open the Results option in your portal to view your child result.",at:Date.now(),auto:1})}S.cfg.settings={...(S.cfg.settings||{}),...d};toast(on?"Results hidden from parents":"Results are now visible to parents");render()})},
 async hold(d){const hold=d.h==="1",g=d.g||v("hst");if(!g)return toast("Select a student first",true);const st=S.students.find(x=>x.gr===g);
  if(!await ask(hold?"Hold this result?":"Release this result?",hold?(st?st.name:g)+"'s parent will see a message to clear all dues.":(st?st.name:g)+"'s result will be visible again (if results are ON).",hold?"Yes, hold":"Yes, release",hold))return;
  await run(async()=>{await api("setHold",{gr:g,hold});await loadStudents();toast(hold?"Result is on hold":"Result released");render()})}});

/* admin: Promotion to the next class */
V.promo=async()=>{if(S.me.role!=="admin")return empty("Only the admin/principal can promote students.");
 const all=exClasses(),used=all;if(!used.length)return empty("No students yet.");
 if(!S.pc||!used.includes(S.pc))S.pc=used[0];
 const i=all.indexOf(S.pc),def=nextOf(S.pc)||all[i+1]||"Passed Out",to=S.pto&&S.pto.c===S.pc?S.pto.v:def,y=S.ry;
 const inCls=S.students.filter(s=>stCls(s)===S.pc),shs=["AM","PM"].filter(h=>inCls.some(s=>shOf(s.key)===h));if(!S.psh||!shs.includes(S.psh))S.psh=shs[0]||"AM";
 const list=inCls.filter(s=>shOf(s.key)===S.psh).sort((a,b)=>kcmp(a.key,b.key)||(+a.roll||0)-(+b.roll||0));
 const rs=(await cached("res:t3",3*MIN,()=>rd([query(collection(db,"results"),where("term","==","T3"))]))).filter(r=>r.year===y),R={};rs.forEach(r=>R[r.gr]=r);
 const info=s=>{if((s.hist||[]).some(h=>h.year===y))return{t:`<span class="pill">Already promoted (${e(y)})</span>`,ok:0};const r=R[s.gr];if(!r)return{t:'<span class="pill">No final result</span>',ok:0};const c=calcRes(snapOf(r),"T3",r.marks);return c.res==="PASSED"?{t:`<span class="pill ok">PASSED ${c.pc}%</span>`,ok:1}:{t:`<span class="pill no">${c.res||"saved"} ${c.tot?c.pc+"%":""}</span>`,ok:0}};
 const tos=[...all.filter(c=>c!==S.pc),"Passed Out"];if(!tos.includes(to))tos.splice(Math.max(0,tos.length-1),0,to);
 let tinfo="";if(to!=="Passed Out"){try{const us=(await api("listUsers")).users.filter(u=>u.role==="teacher"&&!u.blocked),nks=[...new Set(list.map(q=>shOf(q.key)+"|"+to+"|"+(q.sec||"A")))];
  const nm=u=>u.name||u.username,tm=nks.map(k=>[k,us.filter(u=>!u.inc&&(u.classes||[]).includes(k)).map(nm),us.filter(u=>u.inc&&(u.classes||[]).includes(k)).map(nm)]),has=tm.filter(x=>x[1].length),no=tm.filter(x=>!x[1].length);
  tinfo=(has.length?has.map(x=>`<div>${e(kn(x[0]))}: <b>${e(x[1].join(", "))}</b>${x[2].length?` <span class="mu">(Incharge: ${e(x[2].join(", "))})</span>`:""}</div>`).join(""):"")+(no.length?`<div style="color:var(--lt)">${has.length?"Others":"Class "+e(to)}: no teacher assigned yet (assign in Users)</div>`:"")}catch{}}
 return `<div class="card"><h3>Promote students to the next class</h3><p class="mu" style="margin:0 0 10px">Choose shift and class. PASSED students (Final Term ${e(y)}) are ticked. Tick failed students only with management approval.</p><div class="row" style="margin-bottom:10px"><button class="g" data-a="calcpos">Calculate class positions</button><button data-a="autopro">Auto-promote ALL passed students</button><span class="mu">All classes, both shifts. Failed students are not touched.</span></div><div class="row"><b>Shift:</b><select data-c="psh">${shs.map(h=>`<option value="${h}" ${h===S.psh?"selected":""}>${SHN[h]} (${inCls.filter(s=>shOf(s.key)===h).length} students)</option>`).join("")}</select></div><div class="row"><select data-c="pcs">${used.map(c=>`<option value="${e(c)}" ${c===S.pc?"selected":""}>From Class ${e(c)}</option>`).join("")}</select><span class="mu">to</span><select data-c="pto">${tos.map(c=>`<option value="${e(c)}" ${c===to?"selected":""}>${c==="Passed Out"?"Passed Out (left school)":"Class "+e(c)}</option>`).join("")}</select><input data-c="ry" value="${e(S.ry)}" size="10" title="Academic year of the Final Term"></div><div class="row"><b>New roll numbers:</b><select data-c="prm">${[["name","By name (A to Z)"],["old","By old roll number order"],["pos","By position (Final Term percentage)"],["clear","Leave empty (set later)"]].map(([k,t])=>`<option value="${k}" ${(S.prm||"name")===k?"selected":""}>${t}</option>`).join("")}</select></div>${tinfo?`<p class="mu" style="margin:8px 0 0"><b>Teacher of the new class:</b></p><div class="mu">${tinfo}</div>`:""}${S.students.some(s=>stCls(s)===to&&shOf(s.key)===S.psh&&to!=="Passed Out")?`<p class="mu" style="margin:6px 0 0;color:var(--lt)">Class ${e(to)} already has ${S.students.filter(s=>stCls(s)===to&&shOf(s.key)===S.psh).length} student(s). Rolls continue after them.</p>`:""}</div>
 <div class="card"><div class="row"><button class="s g" data-a="pka">Select all passed</button><button class="s g" data-a="pkb">Select all</button><button class="s g" data-a="pkc">Clear</button></div><div class="tw"><table><tr><th></th><th>Roll</th><th>Student</th><th>Final result</th></tr>${list.map(s=>{const f=info(s);return `<tr><td><input type="checkbox" class="pk" value="${e(s.gr)}" data-ok="${f.ok}" ${f.ok?"checked":""}></td><td>${e(s.roll)}</td><td><b>${e(s.name)}</b><br><span class="mu">ID ${e(SID(s.gr))} | ${e(kn(s.key))}</span></td><td>${f.t}</td></tr>`}).join("")}</table></div><div class="row"><button data-a="dopromo">Promote selected students</button></div></div>`};
CH.prm=x=>{S.prm=x.value;render()};CH.psh=x=>{S.psh=x.value;render()};CH.pcs=x=>{S.pc=x.value;S.pto=null;render()};CH.pto=x=>{S.pto={c:S.pc,v:x.value};render()};
async function calcPos(y){
 const rs=(await cached("res:t3",3*MIN,()=>rd([query(collection(db,"results"),where("term","==","T3"))]))).filter(r=>r.year===y),G={};
 rs.forEach(r=>{const c=calcRes(snapOf(r),"T3",r.marks);if(!c.tot)return;(G[r.key]=G[r.key]||[]).push({id:r.year+"_T3_"+r.gr,pc:+c.pc||0,ok:c.res==="PASSED"})});
 const items=[];Object.values(G).forEach(a=>{const hi=Math.max(...a.map(x=>x.pc)),lo=Math.min(...a.map(x=>x.pc));
  a.forEach(x=>{const pos=x.ok?1+a.filter(z=>z.ok&&z.pc>x.pc).length:0;items.push({id:x.id,pos:pos>=1&&pos<=3?pos:0,hi,lo,cn:a.length})})});
 for(let i=0;i<items.length;i+=200)await api("setPositions",{items:items.slice(i,i+200)});
 return items.length}
Object.assign(H,{
 async calcpos(){if(S.me.role!=="admin")return;await run(async()=>{toast("Calculating positions...");const n=await calcPos(S.ry);toast(n?n+" Final Term result(s) updated with class position, highest and lowest percentage.":"No Final Term results found for "+S.ry,!n);render()})},
 async autopro(){if(S.me.role!=="admin")return;const y=S.ry,all=exClasses(),mode=S.prm||"name";
  await run(async()=>{try{await calcPos(y)}catch{}const rs=(await cached("res:t3",3*MIN,()=>rd([query(collection(db,"results"),where("term","==","T3"))]))).filter(r=>r.year===y),P={},R={};
   rs.forEach(r=>{const c=calcRes(snapOf(r),"T3",r.marks);R[r.gr]=c;if(c.res==="PASSED")P[r.gr]=1});
   const W=S.students.map(q=>({gr:q.gr,key:q.key,roll:q.roll,name:q.name,sec:q.sec,done:(q.hist||[]).some(h=>h.year===y)})),plan=[];let pass=0,left=0,out=0;
   for(let i=all.length-1;i>=0;i--){const c=all[i],to=nextOf(c),g=W.filter(q=>stCls(q)===c);if(!g.length)continue;if(!to){left+=g.length;continue}
    const mv=g.filter(q=>P[q.gr]&&!q.done);left+=g.length-mv.length;if(!mv.length)continue;
    const grp={};mv.forEach(q=>(grp[q.key]=grp[q.key]||[]).push(q));const rolls={},sel=new Set(mv.map(q=>q.gr));
    Object.values(grp).forEach(arr=>{const q0=arr[0],nk=shOf(q0.key)+"|"+to+"|"+(q0.sec||"A"),mx=W.filter(q=>q.key===nk&&!sel.has(q.gr)).reduce((a,q)=>Math.max(a,+q.roll||0),0);
     arr.sort(mode==="old"?(a,b)=>(+a.roll||0)-(+b.roll||0):mode==="pos"?(a,b)=>((R[b.gr]||{}).pc||0)-((R[a.gr]||{}).pc||0)||cmp(a.name,b.name):(a,b)=>cmp(a.name,b.name));
     arr.forEach((q,j)=>{rolls[q.gr]=mode==="clear"?"":String(mx+j+1);q.key=nk;q.roll=rolls[q.gr];q.done=true})});
    plan.push({to,grs:mv.map(q=>q.gr),rolls});pass+=mv.length;if(to==="Passed Out")out+=mv.length}
   if(!pass)return toast("No passed student is waiting for promotion",true);
   if(!await ask("Auto-promote "+pass+" passed student(s)?","All classes and both shifts, highest class first, new roll numbers by your chosen order ("+mode+"). "+left+" student(s) (failed, no final result or already promoted) stay as they are."+(out?" "+out+" student(s) of the last class will be Passed Out and their parent logins will be blocked.":"")+" Did you take the year archive backup first?","Yes, promote all passed"))return;
   for(const pl of plan){toast("Promoting to "+pl.to+"...");await api("promoteStudents",{grs:pl.grs,to:pl.to,year:y,rolls:pl.rolls})}
   await loadStudents();S.pto=null;toast(pass+" passed student(s) promoted. "+left+" left for your decision.");render()})},
 pka(){document.querySelectorAll(".pk").forEach(c=>c.checked=c.dataset.ok==="1")},pkb(){document.querySelectorAll(".pk").forEach(c=>c.checked=true)},pkc(){document.querySelectorAll(".pk").forEach(c=>c.checked=false)},
 async dopromo(){const g=ck("pk"),to=($('select[data-c="pto"]')||{}).value;if(!g.length)return toast("Select at least one student",true);
  const bad=[...document.querySelectorAll(".pk:checked")].filter(c=>c.dataset.ok!=="1").length;
  if(!await ask("Promote "+g.length+" student(s)?",SHN[S.psh]+" shift: From Class "+S.pc+" to "+(to==="Passed Out"?"Passed Out":"Class "+to)+"."+(to==="Passed Out"?" Their parent logins will be blocked automatically (the students have left school).":"")+(bad?" "+bad+" of them have not passed (or have no final result) and will be promoted by your decision.":""),"Yes, promote"))return;
  await run(async()=>{const mode=S.prm||"name",rolls={};
   if(mode==="clear")g.forEach(x=>rolls[x]="");
   else if(mode!=="keep"){const res=mode==="pos"?(await cached("res:t3",3*MIN,()=>rd([query(collection(db,"results"),where("term","==","T3"))]))).filter(r=>r.year===S.ry):[],pc={};res.forEach(r=>pc[r.gr]=calcRes(snapOf(r),"T3",r.marks).pc);
    const sel=new Set(g),grp={};g.forEach(x=>{const st=S.students.find(q=>q.gr===x);if(st)(grp[st.key]=grp[st.key]||[]).push(st)});
    Object.values(grp).forEach(arr=>{const st0=arr[0],nk=shOf(st0.key)+"|"+to+"|"+(st0.sec||"A"),mx=S.students.filter(q=>q.key===nk&&!sel.has(q.gr)).reduce((a,q)=>Math.max(a,+q.roll||0),0);
     arr.sort(mode==="old"?(a,b)=>(+a.roll||0)-(+b.roll||0):mode==="pos"?(a,b)=>(pc[b.gr]||0)-(pc[a.gr]||0)||cmp(a.name,b.name):(a,b)=>cmp(a.name,b.name));arr.forEach((q,i)=>rolls[q.gr]=String(mx+i+1))})}
   const r=await api("promoteStudents",{grs:g,to,year:S.ry,rolls});await loadStudents();S.pto=null;toast(to==="Passed Out"?r.promoted+" student(s) passed out. Their parent logins are now blocked.":r.promoted+" student(s) promoted to "+to+". Parents see the new class after their next login.");render()})}});
{const _d=V.dash;V.dash=async()=>{let h=await _d();if(S.me.role==="admin"){h=h.replace('<div class="card"><h3>Last 7 days attendance</h3>','<div class="card" id="cs"><div class="empty ldg"><span class="spn"></span>Loading...</div></div><div class="card"><h3>Last 7 days attendance</h3>');const t0=Date.now(),iv=setInterval(()=>{if($("#cs")||Date.now()-t0>4000){clearInterval(iv);if($("#cs"))csLoad()}},60)}return S.me.role==="admin"&&S.reqN?`<div class="card hol"><b>${S.reqN} result edit request${S.reqN>1?"s":""} waiting for approval</b> <button class="s" data-a="gotoreq">Review</button></div>`+h:h}}

/* ---------- admin dashboard: class strength + attendance bars, with PDF / Excel / Print ---------- */
const csCol={P:"#22a06b",L:"#f2b53a",V:"#8b7cf0",A:"#e5586a"};
async function csLoad(){const box=$("#cs");if(!box)return;
 try{const d=S.csd||(S.csd=today()),all=keys().slice().sort((a,b)=>lvl(clsName(a))-lvl(clsName(b))||po(clsName(a))-po(clsName(b))||cmp(a,b)),shs=["AM","PM"].filter(h=>all.some(k=>shOf(k)===h));
  if(!S.css||(S.css!=="ALL"&&!shs.includes(S.css)))S.css="ALL";
  const rows=await attDates([d],all),hol=offDay(d),ks=all.filter(k=>S.css==="ALL"||shOf(k)===S.css),one=S.css!=="ALL";
  const data=ks.map(k=>{const n=inKey(k).length,c=tally(rows.filter(x=>x.key===k)),m=c.P+c.A+c.L+c.V,p=String(k).split("|");
   return{k,sh:SHN[shOf(k)]||"",cls:clsName(k),sec:p.length===3?p[2]:"",n,P:c.P,L:c.L,V:c.V,A:c.A,nm:hol?0:Math.max(0,n-m),pc:m?pct(c):null}});
  const tot=data.reduce((a,x)=>{["n","P","L","V","A","nm"].forEach(f=>a[f]+=x[f]);return a},{n:0,P:0,L:0,V:0,A:0,nm:0});tot.pc=tot.P+tot.L+tot.A+tot.V?pct({P:tot.P,L:tot.L,A:tot.A,V:tot.V}):null;
  S._cs={d,data,tot,lab:one?SHN[S.css]+" shift":"All shifts"};
  const card=(l,v,c)=>`<div class="kp" style="--c:${c}"><small>${l}</small><b>${v}</b></div>`;
  const bar=x=>x.n?`<div class="sbar" title="Present ${x.P} | Late ${x.L} | Leave ${x.V} | Absent ${x.A} | Not marked ${x.nm}">${[["P",x.P],["L",x.L],["V",x.V],["A",x.A]].map(([f,v])=>v?`<i style="width:${v*100/x.n}%;background:${csCol[f]}"></i>`:"").join("")}</div>`:`<div class="sbar"></div>`;
  box.innerHTML=`<h3>Class strength and attendance</h3><div class="row"><select data-c="css"><option value="ALL" ${!one?"selected":""}>All shifts (${all.reduce((a,k)=>a+inKey(k).length,0)})</option>${shs.map(h=>`<option value="${h}" ${S.css===h?"selected":""}>${SHN[h]} (${all.filter(k=>shOf(k)===h).reduce((a,k)=>a+inKey(k).length,0)})</option>`).join("")}</select><input type="date" value="${d}" max="${today()}" data-c="csd"><button class="s" data-a="csx">Excel</button><button class="s" data-a="csp">PDF</button><button class="s" data-a="csr">Print</button></div>
  <div class="cards" style="margin:12px 0">${card("Strength",tot.n,"var(--pr)")}${card("Present",tot.P,csCol.P)}${card("Late",tot.L,csCol.L)}${card("Leave",tot.V,csCol.V)}${card("Absent",tot.A,csCol.A)}${card("Not marked",tot.nm,"var(--mu)")}</div>
  ${hol?'<p class="mu" style="margin:0 0 8px">Holiday: no attendance on this day.</p>':""}
  <div class="legend"><span><i class="dot" style="background:${csCol.P}"></i>Present</span><span><i class="dot" style="background:${csCol.L}"></i>Late</span><span><i class="dot" style="background:${csCol.V}"></i>Leave</span><span><i class="dot" style="background:${csCol.A}"></i>Absent</span><span><i class="dot" style="background:rgba(147,160,196,.35)"></i>Not marked</span></div>
  <div class="srows">${data.length?data.map(x=>`<div class="srow"><div class="sl"><b>${e(x.cls)}${x.sec?" - "+e(x.sec):""}${one?"":" ("+e(x.sh)+")"}</b><small>${x.n} students</small></div>${bar(x)}<div class="sn">P ${x.P} · L ${x.L} · Lv ${x.V} · A ${x.A}${x.nm?" · NM "+x.nm:""}</div></div>`).join(""):'<p class="mu">No classes.</p>'}</div>`}
 catch(x){box.innerHTML='<p class="mu">Could not load: '+e(x.message||x)+'</p>'}}
const csRows=()=>{const c=S._cs;return c?{c,head:["Shift","Class","Section","Strength","Present","Late","Leave","Absent","Not marked","Present %"],body:[...c.data.map(x=>[x.sh,x.cls,x.sec,x.n,x.P,x.L,x.V,x.A,x.nm,x.pc===null?"-":x.pc+"%"]),["Total","","",c.tot.n,c.tot.P,c.tot.L,c.tot.V,c.tot.A,c.tot.nm,c.tot.pc===null?"-":c.tot.pc+"%"]]}:null};
Object.assign(H,{
 csx(){const r=csRows();if(!r)return;const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([["OMYS SCHOOLS' NETWORK"],["S.A.J ACADEMY, HUSSAINABAD"],["DAILY STRENGTH RECORD (DSR) | Date: "+r.c.d+" | "+r.c.lab],[],r.head,...r.body]);XLSX.utils.book_append_sheet(wb,ws,"Class strength");XLSX.writeFile(wb,`class-strength-${r.c.d}.xlsx`)},
 async csp(){const r=csRows();if(!r)return;await run(async()=>{await ensurePdfLibs(true);await pdfReport(dsrSpec({c:r.c,head:r.head,body:r.body,file:`class-strength-${r.c.d}.pdf`}))})},
 csr(){const r=csRows();if(!r)return;run(async()=>{await printReport(dsrSpec({c:r.c,head:r.head,body:r.body}))})}});
V.str=async()=>{if(S.me.role!=="admin")return empty("Only the admin can open Strength.");const t0=Date.now(),iv=setInterval(()=>{if($("#cs")||Date.now()-t0>4000){clearInterval(iv);if($("#cs"))csLoad()}},60);return `<div class="card"><h3>Daily Strength Record (DSR)</h3><p class="mu" style="margin:0">Pick the date and shift, then press Print, PDF or Excel. Class and section wise strength with present, late, leave and absent is made automatically from the attendance teachers take, so no paper DSR is needed.</p></div><div class="card" id="cs"><div class="empty ldg"><span class="spn"></span>Loading...</div></div>`};
Object.assign(CH,{css(x){S.css=x.value;csLoad()},csd(x){S.csd=x.value||today();csLoad()}});


/* ----- v13d: year-end archive (backup to Excel, then optionally free the attendance records) ----- */
Object.assign(S,{arc:{},arcRows:{}});
V.arch=async()=>{if(S.me.role!=="admin")return empty("Only the admin can archive a year.");
 const ks=keys(),y=S.ry,[a0,a1]=yrWin(y);if(!a0)return `<div class="card"><h3>Year Archive</h3><p>Enter the academic year like 2026-2027.</p><input data-c="ry" value="${e(y)}" size="10"></div>`;
 return `<div class="card"><h3>Year-end Archive</h3><div class="row"><b>Academic year:</b><input data-c="ry" value="${e(y)}" size="10"><span class="mu">${dmy(a0)} to ${dmy(a1)}</span></div><p class="mu" style="margin:6px 0 0">1. Download the class backup (Excel). 2. Delete that class's attendance of this year. Do this before promotion.</p></div>
 <div class="card"><div class="tw"><table><tr><th>Class</th><th>Students</th><th>Actions</th></tr>${ks.map(k=>`<tr><td><b>${e(kn(k))}</b></td><td>${inKey(k).length}</td><td><div class="row" style="margin:0"><button class="s" data-a="abk" data-k="${e(k)}">Download backup</button>${S.arc[k+"|"+y]?`<button class="s g" data-a="adel" data-k="${e(k)}">Delete this year's attendance (${S.arcRows[k+"|"+y].length})</button><span class="pill ok">Backup done</span>`:""}</div></td></tr>`).join("")||'<tr><td colspan="3" class="mu">No classes</td></tr>'}</table></div></div>`};
Object.assign(H,{
 async abk(d){const k=d.k,y=S.ry,[a0,a1]=yrWin(y);await run(async()=>{toast("Preparing backup...");
  const [att,res]=await Promise.all([rdC([query(ac,where("key","==",k))]),rd([query(collection(db,"results"),where("key","==",k))])]),A=att.filter(x=>x.date>=a0&&x.date<=a1),R=res.filter(x=>x.year===y),st=inKey(k);
  const sum=st.map(s=>{const c=tally(A.filter(x=>x.gr===s.gr).filter(x=>!offDay(x.date)));return [SID(s.gr),s.name,s.father||"",s.roll||"",c.P,c.A,c.L,c.V,c.P+c.A+c.L+c.V]});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Student ID","Name","Father","Roll","Present","Absent","Late","Leave","Days marked"],...sum]),"Attendance summary");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Student ID","Name","Date","Status"],...A.sort((a,b)=>cmp(a.gr,b.gr)||cmp(a.date,b.date)).map(x=>[SID(x.gr),(S.students.find(q=>q.gr===x.gr)||{}).name||"",x.date,{P:"Present",A:"Absent",L:"Late",V:"Leave"}[x.status]||x.status])]),"Daily attendance");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Student ID","Name","Term","Total","Obtained","Percentage","Grade","Result"],...R.sort((a,b)=>cmp(a.term,b.term)||cmp(a.gr,b.gr)).map(r=>{const c=calcRes(snapOf(r),r.term,r.marks);return [SID(r.gr),r.name,TN[r.term],c.tot,c.ob,c.pc+"%",c.gd,c.res]})]),"Results");
  XLSX.writeFile(wb,"archive-"+y+"-"+kn(k).replace(/[^\w]+/g,"-")+".xlsx");S.arc[k+"|"+y]=1;S.arcRows[k+"|"+y]=A;toast("Backup downloaded ("+A.length+" attendance records)");render()})},
 async adel(d){const k=d.k,y=S.ry,A=S.arcRows[k+"|"+y];if(!A||!S.arc[k+"|"+y])return toast("Download the backup first",true);
  if(!await ask("Delete "+A.length+" attendance records?",kn(k)+" - "+y+". Make sure the Excel file was saved on your computer. Results are kept. This cannot be undone.","Yes, delete",1))return;
  await run(async()=>{for(let i=0;i<A.length;i+=400){const b=writeBatch(db);A.slice(i,i+400).forEach(x=>b.delete(doc(db,"att",x.date+"_"+x.gr)));await b.commit();toast("Deleting... "+Math.min(i+400,A.length)+"/"+A.length)}
   delete S.arc[k+"|"+y];delete S.arcRows[k+"|"+y];toast("Attendance of "+kn(k)+" ("+y+") deleted. Backup is in your Excel file.");render()})}});

/* ---------- Left students: record kept, removed from class lists, roll number stays empty ---------- */
IC.left='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>';IC.str='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>';
const shK=x=>/^(p|aft)/i.test(String(x||""))?"PM":"AM";
function rollFree(rows){const bad=[];rows.forEach(r=>{const ro=String(r.roll||"").trim();if(!ro)return;const key=shK(r.shift)+"|"+String(r.cls||"").trim()+"|"+(String(r.sec||"").trim()||"A").toUpperCase();const hit=(S.left||[]).find(x=>x.key===key&&String(x.roll||"").trim()===ro&&x.gr!==String(r.id||"").trim());if(hit)bad.push("Roll "+ro+" ("+(r.name||"")+") belongs to "+hit.name+" who left")});if(bad.length)throw new Error("Roll number must stay empty for left students. "+bad.slice(0,3).join("; ")+(bad.length>3?" and "+(bad.length-3)+" more":"")+". Use another roll number or leave it empty.")}
V.left=async()=>{if(S.me.role!=="admin")return empty("Only the admin can see left students.");const q=(S.lq||"").toLowerCase(),l=(S.left||[]).filter(s=>!q||(s.name+" "+s.gr+" "+(s.ref||"")+" "+(s.father||"")).toLowerCase().includes(q)).sort((a,b)=>String(b.left.at).localeCompare(String(a.left.at)));
 return `<div class="card"><h3>Left Students (${(S.left||[]).length})</h3><p class="mu" style="margin:0 0 10px">Records are kept. Their roll number stays empty in the class and the parent login is blocked.</p><div class="row"><input placeholder="Search name / ID / GR" value="${e(S.lq||"")}" data-c="lq"><button class="s" data-a="lex">Excel</button><button class="s" data-a="lpdf">PDF</button><button class="s g" data-a="lpr">Print</button></div><div class="tw"><table class="ut"><tr><th>Student ID</th><th>Name</th><th>Father</th><th>Class</th><th>Roll</th><th>Left on</th><th>Reason</th><th>SLC/TC</th><th></th></tr>${l.map(s=>`<tr><td>${e(SID(s.gr))}</td><td>${e(s.name)}</td><td>${e(s.father)}</td><td>${e(kn(s.key))}</td><td>${e(s.roll)}</td><td>${e(s.left.at)}</td><td>${e(s.left.reason)}</td><td>${e(s.left.tc||"")}</td><td><button class="s g" data-a="readmit" data-g="${e(s.gr)}">Re-admit</button></td></tr>`).join("")||'<tr><td colspan=9 class="mu">No left students</td></tr>'}</table></div></div>`};
const lRows=()=>({head:["Student ID","GR","Name","Father","Shift","Class","Section","Roll","Left on","Reason","SLC/TC"],body:(S.left||[]).slice().sort((a,b)=>String(b.left.at).localeCompare(String(a.left.at))).map(s=>{const p=String(s.key).split("|");return[SID(s.gr),s.ref||"",s.name,s.father||"",SHN[p[0]]||"",stCls(s),p[2]||"",s.roll||"",s.left.at,s.left.reason,s.left.tc||""]})});
Object.assign(H,{
 async markleft(d){const st=S.students.find(x=>x.gr===d.g);if(!st)return;let o;
  if(window.Swal){const x=await Swal.fire({title:"Mark "+st.name+" as Left",html:`<input id="lf_d" type="date" class="swal2-input" value="${today()}" max="${today()}"><input id="lf_r" class="swal2-input" placeholder="Reason (shifted, other school...)"><input id="lf_t" class="swal2-input" placeholder="SLC/TC number (optional)">`,showCancelButton:true,confirmButtonText:"Mark as Left",cancelButtonText:"Cancel",reverseButtons:true,confirmButtonColor:"#e5484d",cancelButtonColor:"#8fa3c7",...SW(),preConfirm:()=>{const r=$("#lf_r").value.trim();if(!r){Swal.showValidationMessage("Please write the reason");return false}return{date:$("#lf_d").value||today(),reason:r,tc:$("#lf_t").value.trim()}}});if(!x.isConfirmed)return;o=x.value}
  else{const r=prompt("Reason for leaving:");if(!r)return;o={date:today(),reason:r,tc:""}}
  await run(async()=>{await api("markLeft",{gr:d.g,...o});await loadStudents();toast(st.name+" marked as Left. Roll "+(st.roll||"-")+" stays empty.");render()})},
 async readmit(d){const st=(S.left||[]).find(x=>x.gr===d.g);if(!st||!await ask("Re-admit "+st.name+"?","The student returns to "+kn(st.key)+" with the same roll number and the parent login is unblocked.","Yes, re-admit"))return;await run(async()=>{await api("readmit",{gr:d.g});await loadStudents();toast("Student re-admitted");render()})},
 lex(){const r=lRows(),wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([["OMYS SCHOOLS' NETWORK"],["S.A.J ACADEMY, HUSSAINABAD"],["LEFT STUDENTS | "+today()],[],r.head,...r.body]);XLSX.utils.book_append_sheet(wb,ws,"Left students");XLSX.writeFile(wb,"left-students-"+today()+".xlsx")},
 async lpdf(){await run(async()=>{await ensurePdfLibs(true);await pdfReport(leftSpec({today:today(),...lRows(),file:"left-students-"+today()+".pdf"}))})},
 lpr(){run(async()=>{await printReport(leftSpec({today:today(),...lRows()}))})}
});
Object.assign(CH,{lq(x){S.lq=x.value;render()}});

/* ---------- Activity Logs (main admin only; written by the server) ---------- */
IC.logs='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 12"/>';
const logEv=(type,text,meta)=>{try{api("logEvent",{type,text,meta}).catch(()=>{})}catch{}};
const attSum=l=>{const c={P:0,A:0,L:0,V:0},n={A:[],L:[],V:[]};l.forEach(s=>{const st=S.att[s.gr]||"A";c[st]++;if(st!=="P")n[st].push(s.name+" ("+SID(s.gr)+")"+(S.att[s.gr]?"":" - not marked"))});
 return{t:"Attendance of "+kn(S.key)+" on "+S.date+": Present "+c.P+", Absent "+c.A+", Late "+c.L+", Leave "+c.V,m:{key:S.key,date:S.date,P:c.P,A:c.A,L:c.L,V:c.V,absent:n.A.slice(0,80),late:n.L.slice(0,80),leave:n.V.slice(0,80)}}};
{const _m=H.mark;H.mark=async function(d){await _m.call(H,d);if(S.me.role==="admin"&&S.att[d.g]===d.s){const st=S.students.find(x=>x.gr===d.g);logEv("att_edit","Marked "+(st?st.name:"ID "+d.g)+" (ID "+d.g+", "+(st?kn(st.key):"")+") as "+({P:"Present",A:"Absent",L:"Late",V:"Leave"}[d.s]||d.s)+" for "+S.date)}}}
const LTY={login:"Login",login_fail:"Failed login",logout:"Logout",password:"Password",users:"Users",students:"Students",att_confirm:"Attendance",att_lock:"Attendance",att_edit:"Attendance",hw_add:"Homework",hw_del:"Homework",result_save:"Results",danger:"Danger"};
const LGR={all:"All activity",login:"Logins and logouts",fail:"Failed logins",password:"Password changes",att:"Attendance",users:"Users",students:"Students",hw:"Homework",res:"Results"};
const lgGroup=t=>t==="login"||t==="logout"?"login":t==="login_fail"?"fail":t==="password"?"password":t.startsWith("att_")?"att":t==="users"?"users":t==="students"||t==="danger"?"students":t.startsWith("hw_")?"hw":t==="result_save"?"res":"all";
const lgTime=ts=>{const d=new Date(ts);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true})};
V.logs=async()=>{if(S.me.u!=="admin")return empty("Only the main admin can open Activity Logs.");S.lgf=S.lgf||today();S.lgt=S.lgt||S.lgf;const t0=Date.now(),iv=setInterval(()=>{if($("#lgb")||Date.now()-t0>4000){clearInterval(iv);if($("#lgb"))lgLoad()}},60);return `<div class="card" id="lgb"><div class="empty ldg"><span class="spn"></span>Loading...</div></div>`};
async function lgLoad(){const box=$("#lgb");if(!box)return;box.style.opacity=".6";try{const r=await api("getLogs",{from:S.lgf,to:S.lgt});S._lg=r.logs;S._lgm=r.more;box.style.opacity="";lgPaint()}catch(x){box.style.opacity="";box.innerHTML='<p class="mu">Could not load: '+e(x.message||x)+'</p>'}}
const lgFiltered=()=>(S._lg||[]).filter(l=>(!S.lgu||S.lgu==="all"||l.user===S.lgu)&&(!S.lgy||S.lgy==="all"||lgGroup(l.type)===S.lgy));
function lgPaint(){const box=$("#lgb");if(!box)return;const all=S._lg||[],us=[...new Map(all.map(l=>[l.user,l.name||l.user])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]))),l=lgFiltered();
 box.innerHTML=`<h3>Activity Logs</h3><p class="mu" style="margin:0 0 10px">Every login, failed login, password change, attendance confirmation, homework, result and student/user change. Only you (main admin) can see this.</p><div class="row"><label class="mu">From <input type="date" value="${e(S.lgf)}" max="${today()}" data-c="lgf"></label><label class="mu">To <input type="date" value="${e(S.lgt)}" max="${today()}" data-c="lgt"></label><select data-c="lgu"><option value="all">All users</option>${us.map(([u,n])=>`<option value="${e(u)}" ${S.lgu===u?"selected":""}>${e(n)} (${e(u)})</option>`).join("")}</select><select data-c="lgy">${Object.entries(LGR).map(([k,t])=>`<option value="${k}" ${(S.lgy||"all")===k?"selected":""}>${t}</option>`).join("")}</select><button class="s" data-a="lgx">Excel</button><button class="s g" data-a="lgclr">Reset all logs</button></div>
 <p class="mu" style="margin:8px 0">${l.length} entr${l.length===1?"y":"ies"}${S._lgm?" (showing the latest 500, narrow the dates to see older ones)":""}</p>
 <div class="tw"><table><tr><th>Date and time</th><th>User</th><th>Type</th><th>What happened</th></tr>${l.map(x=>{const m=x.meta||{},ex=[m.absent&&m.absent.length?"Absent: "+m.absent.join(", "):"",m.late&&m.late.length?"Late: "+m.late.join(", "):"",m.leave&&m.leave.length?"Leave: "+m.leave.join(", "):"",m.ip?"Device IP: "+m.ip:""].filter(Boolean);
  return `<tr><td style="white-space:nowrap">${e(lgTime(x.ts))}</td><td><b>${e(x.name||x.user)}</b><br><span class="mu">${e(x.user)} | ${e(x.role)}</span></td><td>${e(LTY[x.type]||x.type)}</td><td>${ex.length?`<details><summary>${e(x.text)}</summary><div class="mu" style="margin-top:6px">${ex.map(e).join("<br>")}</div></details>`:e(x.text)}</td></tr>`}).join("")||'<tr><td colspan=4 class="mu">No activity in this period</td></tr>'}</table></div>`}
Object.assign(CH,{lgf(x){S.lgf=x.value||today();if(S.lgt<S.lgf)S.lgt=S.lgf;lgLoad()},lgt(x){S.lgt=x.value||S.lgf;if(S.lgt<S.lgf)S.lgf=S.lgt;lgLoad()},lgu(x){S.lgu=x.value;lgPaint()},lgy(x){S.lgy=x.value;lgPaint()}});
Object.assign(H,{lgx(){const l=lgFiltered(),wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([["OMYS SCHOOLS' NETWORK"],["S.A.J ACADEMY, HUSSAINABAD"],["ACTIVITY LOG | "+S.lgf+" to "+S.lgt],[],["Date and time","Username","Name","Role","Type","What happened","Details"],...l.map(x=>{const m=x.meta||{};return[lgTime(x.ts),x.user,x.name,x.role,LTY[x.type]||x.type,x.text,[m.absent&&m.absent.length?"Absent: "+m.absent.join(", "):"",m.late&&m.late.length?"Late: "+m.late.join(", "):"",m.leave&&m.leave.length?"Leave: "+m.leave.join(", "):"",m.ip?"IP: "+m.ip:""].filter(Boolean).join(" | ")]})]);XLSX.utils.book_append_sheet(wb,ws,"Activity log");XLSX.writeFile(wb,"activity-log-"+S.lgf+"-to-"+S.lgt+".xlsx")}});

Object.assign(H,{async lgclr(){let c;
 if(window.Swal){const x=await Swal.fire({title:"Reset all activity logs?",html:"Every log entry will be <b>permanently deleted</b> and cannot be recovered. Download the Excel first if you want a copy.<br>Type <b>DELETE</b> to confirm.",input:"text",inputPlaceholder:"DELETE",icon:"warning",showCancelButton:true,confirmButtonText:"Delete all logs",cancelButtonText:"Cancel",reverseButtons:true,focusCancel:true,confirmButtonColor:"#e5484d",cancelButtonColor:"#8fa3c7",...SW(),inputValidator:v=>v!=="DELETE"?"Type DELETE exactly":undefined});if(!x.isConfirmed)return;c=x.value}
 else{c=prompt("This deletes ALL activity logs permanently. Type DELETE to confirm:");if(c!=="DELETE")return}
 await run(async()=>{const r=await api("clearLogs",{confirm:c});toast(r.deleted+" log entr"+(r.deleted===1?"y":"ies")+" deleted");await lgLoad()})}});

/* ---------- Class teacher: Student List + profile editing (own class only) ---------- */
const stMiss=x=>!x||/^(null|n\/a|na|none|nil|unknown|-+)$/i.test(String(x).trim());
const stCl=x=>stMiss(x)?"":x;
const STF=[["name","Name"],["father","Father"],["dob","DOB"],["bg","Blood group"],["phone","Phone"],["addr","Address"]];
const stGaps=s=>STF.filter(([f])=>stMiss(s[f])).map(x=>x[1]);
{const _stu=V.stu;V.stu=async()=>{if(S.me.role!=="teacher"||S.me.inc)return _stu();
 const cls=S.me.classes||[],shs=[...new Set(cls.map(k=>k.split("|")[0]))],sh=shs.includes(S.tsh)?S.tsh:shs[0],ck=cls.filter(k=>k.split("|")[0]===sh),cl=ck.includes(S.tcl)?S.tcl:"",q=(S.tq||"").toLowerCase();
 if(!cls.length)return empty("No class is assigned to you yet. Please ask the admin.");
 const mine=S.students.filter(s=>ck.includes(s.key)&&(!cl||s.key===cl)),inc=mine.filter(s=>stGaps(s).length),
  l=mine.filter(s=>(!S.tf||S.tf==="all"||stGaps(s).length)&&(s.name+" "+s.gr+" "+(s.ref||"")+" "+(s.father||"")).toLowerCase().includes(q)).sort((a,b)=>kcmp(a.key,b.key)||(+a.roll||0)-(+b.roll||0));
 return `<div class="card"><h3>Student List (${mine.length})</h3><p class="mu" style="margin:0 0 10px">Only the students of your own class. Tap Edit to fill in or correct a student's details.</p><div class="row">${shs.length>1?`<select data-c="tsh">${shs.map(x=>`<option value="${x}" ${x===sh?"selected":""}>${e(SHN[x]||x)}</option>`).join("")}</select>`:""}${ck.length>1?`<select data-c="tcl"><option value="">All my classes</option>${ck.map(k=>`<option value="${e(k)}" ${k===cl?"selected":""}>${e(kn(k))}</option>`).join("")}</select>`:""}<select data-c="tf"><option value="all">All students</option><option value="inc" ${S.tf==="inc"?"selected":""}>Incomplete details only (${inc.length})</option></select><input placeholder="Search name / ID / GR" value="${e(S.tq||"")}" data-c="tq"></div>
 <p class="mu" style="margin:8px 0">${inc.length?inc.length+" of "+mine.length+" students have incomplete details.":"All students have complete details."}</p>
 <div class="tw"><table class="ut"><tr><th>Roll</th><th>Name</th><th>Student ID</th><th>Father</th><th>Class</th><th>Details</th><th></th></tr>${l.map(s=>{const g=stGaps(s);return `<tr><td>${e(s.roll)}</td><td>${e(stCl(s.name))}</td><td>${e(SID(s.gr))}</td><td>${e(stCl(s.father))}</td><td>${e(kn(s.key))}</td><td>${g.length?`<span class="pill lt">Missing: ${e(g.join(", "))}</span>`:'<span class="pill ok">Complete</span>'}</td><td><button class="s" data-a="sprof" data-g="${e(s.gr)}">Edit</button></td></tr>`}).join("")||'<tr><td colspan=8 class="mu">No students</td></tr>'}</table></div></div>`}}
V.tprof=async()=>{if(!S.tep)return V.stu();S.ep={k:"stu",id:S.tep};return V.prof()};
{const _sp=H.sprof;H.sprof=function(d){if(S.me.role==="teacher"&&!S.me.inc)stuModal(d.g);else _sp.call(H,d)}}
Object.assign(CH,{tsh(x){S.tsh=x.value;S.tcl="";render()},tcl(x){S.tcl=x.value;render()},tf(x){S.tf=x.value;render()},tq(x){S.tq=x.value;render()}});

/* ---------- Teacher: edit a student in a dialog (Close = nothing changes, Save = saved with a tick animation) ---------- */
const smKey=ev=>{if(ev.key==="Escape")smClose()};
function smClose(){const o=document.getElementById("sm");if(o)o.remove();document.body.style.overflow="";document.removeEventListener("keydown",smKey)}
const stuFormHtml=st=>{const fl=(id,l,f,t)=>{const mi=stMiss(st[f]);return `<label class="mkl${mi?" miss":""}"><span>${l}${mi?' <i class="mtag">missing</i>':""}</span><input id="${id}" type="${t||"text"}" value="${e(stCl(st[f]))}"></label>`};
 const mb=stMiss(st.bg),ma=stMiss(st.addr);
 return `<div class="mkg">${fl("m_name","Student name","name")}${fl("m_father","Father's name","father")}${fl("m_dob","Date of birth","dob","date")}<label class="mkl${mb?" miss":""}"><span>Blood group${mb?' <i class="mtag">missing</i>':""}</span><select id="m_bg">${["",...BGL].map(o=>`<option value="${e(o)}" ${o===stCl(st.bg)?"selected":""}>${e(o)||"-"}</option>`).join("")}</select></label>${fl("m_phone","Contact number","phone","tel")}${fl("m_email","Email","email","email")}</div><label class="mkl${ma?" miss":""}" style="margin-top:10px"><span>Address${ma?' <i class="mtag">missing</i>':""}</span><textarea id="m_addr" rows="2" style="width:100%">${e(stCl(st.addr))}</textarea></label>`};
function stuModal(gr){const st=S.students.find(x=>x.gr===gr);if(!st||document.getElementById("sm"))return;
 const o=document.createElement("div");o.id="sm";o.className="sm-ov";
 o.innerHTML=`<div class="sm-bx" role="dialog" aria-modal="true"><div class="sm-h"><div><h3>Edit student</h3><p class="mu" style="margin:2px 0 0">ID ${e(SID(st.gr))} | ${e(kn(st.key))} | Roll ${e(st.roll)}</p></div><button class="sm-x" data-a="smclose" aria-label="Close">&times;</button></div><div class="sm-b" id="smb">${stuFormHtml(st)}</div><p class="sm-er" id="sme"></p><div class="sm-f" id="smf"><button class="s g" data-a="smclose">Close</button><button data-a="smsave" data-g="${e(gr)}" id="smsv">Save</button></div></div>`;
 o.addEventListener("mousedown",ev=>{if(ev.target===o)smClose()});document.body.appendChild(o);document.body.style.overflow="hidden";document.addEventListener("keydown",smKey);
 const first=o.querySelector(".miss input,.miss select,.miss textarea")||o.querySelector("input");if(first)try{first.focus({preventScroll:true})}catch{}}
Object.assign(H,{smclose(){smClose()},
 async smsave(d){const b=$("#smsv"),er=$("#sme");if(!b||b.disabled)return;er.textContent="";b.disabled=true;const t=b.textContent;b.textContent="Saving...";
  try{await api("saveStudentProfile",{gr:d.g,f:{name:$("#m_name").value.trim(),father:$("#m_father").value.trim(),dob:$("#m_dob").value,bg:$("#m_bg").value,phone:$("#m_phone").value.trim(),email:$("#m_email").value.trim(),addr:$("#m_addr").value.trim()}});
   await loadStudents();$("#smb").innerHTML='<div class="sm-ok"><svg viewBox="0 0 52 52"><circle class="c" cx="26" cy="26" r="24"/><path class="t" d="M14 27l8 8 16-17"/></svg><h3>Saved!</h3><p>Your data was updated.</p></div>';$("#smf").remove();er.textContent="";
   setTimeout(()=>{smClose();render()},1500)}
  catch(x){b.disabled=false;b.textContent=t;er.textContent=x.message||"Could not save. Please try again."}}});

/* ---------- install-as-app button (Android / Chrome); iPhone: Share > Add to Home Screen ---------- */
{let dp=null;addEventListener("beforeinstallprompt",ev=>{ev.preventDefault();dp=ev;if(document.getElementById("inst"))return;const b=document.createElement("button");b.id="inst";b.className="s";b.textContent="Install app";b.style.cssText="position:fixed;right:14px;bottom:14px;z-index:90;border-radius:99px;padding:10px 18px;background:#1d3a63";b.onclick=async()=>{b.remove();dp.prompt();await dp.userChoice.catch(()=>{});dp=null};document.body.appendChild(b)});addEventListener("appinstalled",()=>{const b=document.getElementById("inst");if(b)b.remove()})}
