import {useEffect,useState,useMemo,useCallback} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Home,ClipboardCheck,Wallet,Users,Menu,Trash2,Pencil,Plus,FileDown,LogOut,ChevronLeft} from 'lucide-react'
import {ResponsiveContainer,BarChart,Bar,LineChart,Line,XAxis,YAxis,Tooltip,Legend} from 'recharts'
import LOGO from './logo.js'
import jsPDF from 'jspdf';import autoTable from 'jspdf-autotable'
const URL=import.meta.env.VITE_SUPABASE_URL,KEY=import.meta.env.VITE_SUPABASE_ANON_KEY
const sb=createClient(URL,KEY)
const NOM='Cours de Répétition des Professeurs Réunis'
const hdr=d=>{d.addImage(LOGO,'JPEG',14,8,20,20);d.setFontSize(12);d.setTextColor(22,41,94);d.text(NOM,38,16);d.setDrawColor(181,138,47);d.line(38,19,196,19);d.setTextColor(0)}
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,f2=n=>n==null?'-':Number(n).toFixed(2)
const trim=(ns,t)=>avg(ns.filter(n=>n.sequence===2*t-1||n.sequence===2*t).map(n=>Number(n.moyenne)))
const arrow=v=>{v=v.filter(x=>x!=null);if(v.length<2)return'';const d=v[v.length-1]-v[v.length-2];return d>.05?'↗':d<-.05?'↘':'→'}
const PAL=['#16295e','#b58a2f','#16a34a','#dc2626','#7c3aed','#0891b2','#ea580c']
const T=['profiles','classes','enseignants','eleves','depenses','paiements','seances','presences','notes','audit_log']
const today=()=>new Date().toISOString().slice(0,10)
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}
const fmt=n=>(Number(n||0).toLocaleString('fr-FR')+' F').replace(/[\u202f\u00a0]/g,' ')
const pStart=p=>{if(p==='all')return'0000';const d=new Date(),m=p==='month'?d.getMonth():d.getMonth()-d.getMonth()%3;return new Date(Date.UTC(d.getFullYear(),m,1)).toISOString().slice(0,10)}
const gk=(d,g)=>{const x=new Date(d);if(g==='day')return d;if(g==='week'){x.setDate(x.getDate()-((x.getDay()+6)%7));return x.toISOString().slice(0,10)}if(g==='month')return d.slice(0,7);return d.slice(0,4)+'-T'+(Math.floor(x.getMonth()/3)+1)}
const tmin=x=>{const[h,mi]=x.split(':');return h*60+ +mi}
const hrs=(p,s)=>p.arrivee&&p.fin?Math.max(0,(tmin(p.fin)-tmin(p.arrivee))/60):Number(s.duree)
const addM=(ym,n)=>{const[y,m]=ym.split('-').map(Number),d=new Date(y,m-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
const mdiff=(a,b)=>{const[y1,m1]=a.split('-').map(Number),[y2,m2]=b.split('-').map(Number);return(y2-y1)*12+m2-m1}
const ml=ym=>new Date(ym+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),rng=(a,b)=>a===b?ml(a):ml(a)+' à '+ml(b)
const ledger=(e,D,h)=>{const m=Number(e.mensualite)||1,ps=D.paiements.filter(p=>p.eleve_id===e.id&&p.type==='mensualite'&&p.id!==h?.id);if(h)ps.push({...h,id:'h',date:h.date||today(),created_at:'9'});ps.sort((a,b)=>(a.date+(a.created_at||'')).localeCompare(b.date+(b.created_at||'')))
 const base=ps[0]?(ps[0].mois_debut||ps[0].date.slice(0,7)):e.created_at.slice(0,7);let t=0;const al={}
 ps.forEach(p=>{const a=Number(p.montant)||0,i0=Math.floor(t/m),i1=Math.max(i0,Math.ceil((t+a)/m)-1);al[p.id]={from:addM(base,i0),to:addM(base,i1),n:i1-i0+1,reste:Math.max(0,(i1+1)*m-(t+a))};t+=a});return{al,base,T:t,m,anchor:ps[0]?ps[0].date:e.created_at.slice(0,10)}}
const due=(e,D)=>{const{base,T,m,anchor}=ledger(e,D),k=Math.floor(T/m),ds=-dj(anchor),n=ds<0?0:Math.floor(ds/30)+1,reste=Math.max(0,n*m-T),d=addD(anchor,30*Math.max(k,1));return{tot:T,k,d,reste,lab:reste>0?rng(addM(base,k),addM(base,Math.max(k,n-1))):(k>0?"payé jusqu'à "+ml(addM(base,k-1)):'-'),j:dj(d)}}
const dj=d=>Math.round((new Date(d)-new Date(today()))/864e5)
const I='w-full border border-slate-300 rounded-lg px-3 py-2 bg-white',B='bg-brand text-white rounded-lg px-4 py-2 font-medium active:scale-95'
const Card=({children,c=''})=><div className={'bg-white rounded-xl shadow-sm p-3 '+c}>{children}</div>
const fields=em=>({
 classes:[{k:'nom',l:'Nom',req:1},{k:'niveau',l:'Niveau'}],
 enseignants:[{k:'nom',l:'Nom',req:1},{k:'telephone',l:'Téléphone'},{k:'matiere',l:'Matière'},{k:'taux_horaire',l:'Taux horaire',type:'num',def:0},{k:'actif',l:'Actif',type:'bool'}],
 eleves:[{k:'nom',l:'Nom',req:1},{k:'telephone',l:'Téléphone du parent',req:1},{k:'classe_id',l:'Classe',type:'sel',src:'classes',lab:'nom'},{k:'frais_inscription',l:"Frais d'inscription",type:'num',def:2000},{k:'mensualite',l:'Mensualité',type:'num',def:10000},{k:'actif',l:'Actif',type:'bool'}],
 depenses:[{k:'nom',l:'Nom',req:1},{k:'montant',l:'Montant',type:'num',req:1},{k:'description',l:'Description'},{k:'date',l:'Date',type:'date',def:today()},{k:'auteur',l:'Auteur',def:em}],
 paiements:[{k:'eleve_id',l:'Élève',type:'sel',src:'eleves',lab:'nom',req:1},{k:'type',l:'Type',type:'sel',opts:[['mensualite','Mensualité'],['inscription','Inscription']],def:'mensualite',req:1},{k:'mois_debut',l:'Mois concerné (automatique)',type:'month',dis:(f,D)=>D.paiements.some(p=>p.eleve_id===f.eleve_id&&p.type==='mensualite'&&p.id!==f.id)},{k:'montant',l:'Montant versé',type:'num',req:1},{k:'date',l:'Date',type:'date',def:today()},{k:'recu_par',l:'Reçu par',def:em}]})
function Crud({t,title,D,R,fields:fs,show,before,calc,actions,note}){
 const[f,setF]=useState(null),rows=D[t]
 const open=r=>setF(r||Object.fromEntries(fs.map(x=>[x.k,x.def??(x.type==='bool'?true:'')])))
 const ch=(k,v)=>{let n={...f,[k]:v};if(calc&&k!=='montant')n={...n,...calc(n,D)};setF(n)}
 const save=async e=>{e.preventDefault();let p={...f};fs.forEach(x=>{if(x.type==='num'&&p[x.k]!=='')p[x.k]=Number(p[x.k]);if(p[x.k]==='')p[x.k]=null});if(before)p=before(p,D);
  const{error}=p.id?await sb.from(t).update(p).eq('id',p.id):await sb.from(t).insert(p);if(error)return alert(error.message);setF(null);R()}
 const del=async r=>{if(confirm('Supprimer ?')){const{error}=await sb.from(t).delete().eq('id',r.id);if(error)alert(error.message);R()}}
 return <div className="space-y-2">
  <div className="flex justify-between items-center"><h2 className="font-bold text-lg">{title} ({rows.length})</h2><button className={B} onClick={()=>open()}><Plus size={18} className="inline"/> Ajouter</button></div>
  {rows.map(r=>{const[a,b]=show(r);return <Card key={r.id} c="flex items-center gap-2"><div className="flex-1 min-w-0"><div className="font-medium truncate">{a}</div><div className="text-sm text-slate-500 truncate">{b}</div></div>{actions?.(r)}<button onClick={()=>open(r)} className="p-2"><Pencil size={18}/></button><button onClick={()=>del(r)} className="p-2 text-red-600"><Trash2 size={18}/></button></Card>})}
  {f&&<div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center"><form onSubmit={save} className="bg-white rounded-t-2xl md:rounded-2xl p-4 w-full max-w-md space-y-2 max-h-[90vh] overflow-auto">
   <h3 className="font-bold">{f.id?'Modifier':'Nouveau'} — {title}</h3>
   {fs.map(x=><label key={x.k} className="block text-sm">{x.type==='bool'?<span className="flex gap-2 items-center"><input type="checkbox" checked={!!f[x.k]} onChange={e=>ch(x.k,e.target.checked)}/>{x.l}</span>:<>{x.l}
    {x.type==='sel'?<select className={I} required={x.req} value={f[x.k]??''} onChange={e=>ch(x.k,e.target.value)}><option value="">—</option>{(x.opts||D[x.src].map(r=>[r.id,r[x.lab]])).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    :<input className={I} required={x.req} disabled={x.dis?.(f,D)} type={x.type==='num'?'number':x.type||'text'} min={x.k==='mois'?1:undefined} max={x.k==='mois'?6:undefined} value={f[x.k]??''} onChange={e=>ch(x.k,e.target.value)}/>}</>}</label>)}
   {note&&<p className="text-sm bg-amber-50 text-brand rounded-lg p-2">{note(f,D)}</p>}<div className="flex gap-2 pt-2"><button type="button" className="flex-1 border rounded-lg py-2" onClick={()=>setF(null)}>Annuler</button><button className={B+' flex-1'}>Enregistrer</button></div></form></div>}
 </div>}
const receipt=(p,D)=>{const e=D.eleves.find(x=>x.id===p.eleve_id),L=e&&p.type==='mensualite'?ledger(e,D).al[p.id]:null,d=new jsPDF({format:'a5'});hdr(d);d.setFontSize(15);d.text('REÇU DE PAIEMENT',14,40);d.setFontSize(11)
 ;[['N° de reçu',p.numero],['Élève',e?.nom],['Type',p.type],['Mois couverts',L?rng(L.from,L.to):'-'],['Reste sur le dernier mois',L?fmt(L.reste):'-'],['Montant',fmt(p.montant)],['Date',p.date],['Prochaine échéance',e?due(e,D).d:'-'],['Reste à ce jour',e?fmt(due(e,D).reste)+' ('+due(e,D).lab+')':'-'],['Reçu par',p.recu_par]].forEach(([a,b],i)=>d.text(`${a} : ${b??''}`,14,52+i*9));d.save(`recu-${p.numero}.pdf`)}
function Appel({D,R}){
 const[s,setS]=useState({classe_id:'',enseignant_id:'',date:today(),debut:'16:00',fin:'18:00'}),[m,setM]=useState({}),[all,setAll]=useState('')
 const dur=useMemo(()=>Math.max(0,(tmin(s.fin)-tmin(s.debut))/60),[s])
 const list=D.eleves.filter(e=>e.actif&&e.classe_id===s.classe_id).sort((a,b)=>a.nom.localeCompare(b.nom))
 const g=e=>({present:true,arr:s.debut,fin:'',...m[e.id]}),up=(e,o)=>setM({...m,[e.id]:{...g(e),...o}})
 const endAll=()=>{if(!all)return;const n={...m};list.forEach(e=>{if(g(e).present)n[e.id]={...g(e),fin:all}});setM(n)}
 const pdf=()=>{const en=D.enseignants.find(x=>x.id===s.enseignant_id),c=D.classes.find(x=>x.id===s.classe_id),d=new jsPDF();hdr(d);d.setFontSize(13);d.text(`Feuille de présence - ${c?.nom}`,38,26);d.setFontSize(10)
  d.text(`Enseignant : ${en?.nom} | Date : ${s.date} | ${s.debut}-${s.fin} | Durée : ${dur.toFixed(2)} h`,14,38)
  autoTable(d,{startY:43,headStyles:{fillColor:[22,41,94]},head:[['#','Élève','Statut','Arrivée','Fin']],body:list.map((e,i)=>{const x=g(e);return[i+1,e.nom,x.present?'Présent':'Absent',x.present?x.arr||'-':'-',x.present?x.fin||'-':'-']}),didParseCell:h=>{if(h.section==='body')h.cell.styles.fillColor=h.row.raw[2]==='Présent'?[198,239,206]:[255,199,206]}});d.save(`appel-${s.date}.pdf`)}
 const save=async()=>{if(!s.classe_id||!s.enseignant_id)return alert('Choisir classe et enseignant')
  const{data,error}=await sb.from('seances').insert({...s,duree:dur}).select().single();if(error)return alert(error.message)
  const{error:e2}=await sb.from('presences').insert(list.map(e=>{const x=g(e);return{seance_id:data.id,eleve_id:e.id,present:x.present,arrivee:x.present?x.arr||null:null,fin:x.present?x.fin||null:null}}));if(e2)return alert(e2.message);R();pdf();setM({})}
 return <div className="space-y-2"><h2 className="font-bold text-lg">Appel</h2>
  <Card c="grid grid-cols-2 gap-2"><select className={I} value={s.classe_id} onChange={e=>setS({...s,classe_id:e.target.value})}><option value="">Classe…</option>{D.classes.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
   <select className={I} value={s.enseignant_id} onChange={e=>setS({...s,enseignant_id:e.target.value})}><option value="">Enseignant…</option>{D.enseignants.filter(x=>x.actif).map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
   <input type="date" className={I+' col-span-2'} value={s.date} onChange={e=>setS({...s,date:e.target.value})}/>
   <input type="time" className={I} value={s.debut} onChange={e=>setS({...s,debut:e.target.value})}/><input type="time" className={I} value={s.fin} onChange={e=>setS({...s,fin:e.target.value})}/>
   <div className="col-span-2 text-sm text-slate-600">Durée : <b>{dur.toFixed(2)} h</b></div></Card>
  {list.length>0&&<Card c="flex gap-2 items-center text-sm">Fin pour tous<input type="time" className={I} value={all} onChange={e=>setAll(e.target.value)}/><button className={B+' whitespace-nowrap'} onClick={endAll}>Appliquer</button></Card>}
  {list.map(e=>{const x=g(e);return <Card key={e.id} c="space-y-1"><div className="flex items-center justify-between"><span>{e.nom}</span>
   <button onClick={()=>up(e,{present:!x.present})} className={'px-4 py-2 rounded-full text-white font-medium w-28 '+(x.present?'bg-green-600':'bg-red-600')}>{x.present?'Présent':'Absent'}</button></div>
   {x.present&&<div className="flex gap-2 text-xs items-center">Arrivée<input type="time" className={I} value={x.arr} onChange={ev=>up(e,{arr:ev.target.value})}/>Fin<input type="time" className={I} value={x.fin} onChange={ev=>up(e,{fin:ev.target.value})}/></div>}</Card>})}
  {s.classe_id&&!list.length&&<p className="text-slate-500">Aucun élève actif dans cette classe.</p>}
  {list.length>0&&<button className={B+' w-full'} onClick={save}>Enregistrer et exporter le PDF</button>}</div>}
function Profs({D}){const[p,setP]=useState('month')
 const rows=D.enseignants.map(e=>{const ss=D.seances.filter(x=>x.enseignant_id===e.id&&x.date>=pStart(p)),h=ss.reduce((a,x)=>a+Number(x.duree),0);return{e,j:new Set(ss.map(x=>x.date)).size,h,t:h*e.taux_horaire}})
 return <div className="space-y-2"><h2 className="font-bold text-lg">Suivi des enseignants</h2><select className={I} value={p} onChange={e=>setP(e.target.value)}><option value="month">Mois en cours</option><option value="quarter">Trimestre en cours</option></select>
  <Card c="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th>Enseignant</th><th>Jours</th><th>Heures</th><th>À payer</th></tr></thead><tbody>{rows.map(r=><tr key={r.e.id} className="border-t"><td className="py-2">{r.e.nom}</td><td>{r.j}</td><td>{r.h.toFixed(1)}</td><td className="font-bold">{fmt(r.t)}</td></tr>)}</tbody></table></Card></div>}
function Dash({D}){const[g,setG]=useState('day'),[ym,setYm]=useState(today().slice(0,7))
 const K=rows=>['all','month','quarter'].map(p=>rows.filter(r=>r.date>=pStart(p)).reduce((a,r)=>a+Number(r.montant),0)),a=K(D.paiements),b=K(D.depenses)
 const m={},add=(r,k)=>{(m[gk(r.date,g)]??={k:gk(r.date,g),Perçu:0,Dépenses:0})[k]+=+r.montant};D.paiements.forEach(r=>add(r,'Perçu'));D.depenses.forEach(r=>add(r,'Dépenses'))
 const data=Object.values(m).sort((x,y)=>x.k.localeCompare(y.k)).slice(-12)
 const late=D.eleves.filter(e=>e.actif).map(e=>({e,j:due(e,D).j})).filter(x=>x.j<=5).sort((x,y)=>x.j-y.j)
 const mp=D.paiements.filter(p=>p.date.startsWith(ym)).reduce((x,p)=>x+Number(p.montant),0),md=D.depenses.filter(p=>p.date.startsWith(ym)).sort((x,y)=>x.date.localeCompare(y.date)),sd=md.reduce((x,p)=>x+Number(p.montant),0)
 const since=addD(today(),-90),ss=D.seances.filter(s=>s.date>=since)
 const att=D.eleves.filter(e=>e.actif).map(e=>{const mine=D.presences.filter(p=>p.eleve_id===e.id&&p.present&&ss.some(s=>s.id===p.seance_id)),h=mine.reduce((x,p)=>x+hrs(p,ss.find(s=>s.id===p.seance_id)),0);return{e,n:mine.length,tot:ss.filter(s=>s.classe_id===e.classe_id).length,h}})
 return <div className="space-y-3"><h2 className="font-bold text-lg">Tableau de bord</h2>
  <div className="grid grid-cols-3 gap-2">{['Global','Mois','Trimestre'].map((l,i)=><Card key={l} c="text-xs"><div className="font-bold text-sm">{l}</div>Perçu<div className="text-green-700 font-semibold">{fmt(a[i])}</div>Dépenses<div className="text-red-600 font-semibold">{fmt(b[i])}</div>Solde<div className="font-bold">{fmt(a[i]-b[i])}</div></Card>)}</div>
  <Card><div className="flex justify-between items-center mb-2"><h3 className="font-bold">Comptabilité du mois</h3><input type="month" className="border rounded px-2 py-1" value={ym} onChange={e=>setYm(e.target.value)}/></div>
   <div className="text-sm">Perçu : <b className="text-green-700">{fmt(mp)}</b></div><div className="text-sm">Dépensé : <b className="text-red-600">{fmt(sd)}</b></div><div className="text-sm mb-2">Solde attendu : <b>{fmt(mp-sd)}</b></div>
   <table className="w-full text-xs"><tbody>{md.map(x=><tr key={x.id} className="border-t"><td className="py-1 pr-1">{x.date}</td><td>{x.nom}{x.description&&<span className="text-slate-500"> — {x.description}</span>}<div className="text-slate-400">{x.auteur}</div></td><td className="text-right">{fmt(x.montant)}</td></tr>)}</tbody></table></Card>
  <Card><select className={I+' mb-2'} value={g} onChange={e=>setG(e.target.value)}><option value="day">Jour</option><option value="week">Semaine</option><option value="month">Mois</option><option value="quarter">Trimestre</option></select>
   <div style={{height:220}}><ResponsiveContainer><BarChart data={data}><XAxis dataKey="k" fontSize={10}/><YAxis fontSize={10} width={45}/><Tooltip/><Legend/><Bar dataKey="Perçu" fill="#16a34a"/><Bar dataKey="Dépenses" fill="#dc2626"/></BarChart></ResponsiveContainer></div></Card>
  <Card><h3 className="font-bold mb-1">Paiements en retard / à venir</h3>{!late.length&&<p className="text-sm text-slate-500">Aucun</p>}{late.map(({e,j})=><div key={e.id} className="flex justify-between py-1 border-t text-sm"><span>{e.nom}</span><span className={'px-2 rounded-full text-white '+(j<0?'bg-red-600':'bg-amber-500')}>{j<0?`Retard ${-j} j`:`dans ${j} j`}</span></div>)}</Card>
  <Card><h3 className="font-bold mb-1">Assiduité (3 derniers mois)</h3>{att.map(x=><div key={x.e.id} className="flex justify-between py-1 border-t text-sm"><span>{x.e.nom}</span><span>{x.n}/{x.tot} séances ({x.tot?Math.round(100*x.n/x.tot):0}%) · {x.h.toFixed(1)} h</span></div>)}</Card></div>}
function Fiche({D,R}){const[q,setQ]=useState(''),[c,setC]=useState(''),[id,setId]=useState(null)
 const L=D.eleves.filter(e=>e.nom.toLowerCase().includes(q.toLowerCase())&&(!c||e.classe_id===c)).sort((a,b)=>a.nom.localeCompare(b.nom)),e=D.eleves.find(x=>x.id===id),cn=i=>D.classes.find(x=>x.id===i)?.nom||'-'
 let det=null
 if(e){const f=due(e,D),j=f.j,ps=D.paiements.filter(p=>p.eleve_id===e.id)
  const st=D.seances.filter(s=>s.classe_id===e.classe_id).sort((a,b)=>(b.date+b.created_at).localeCompare(a.date+a.created_at)).map(s=>({s,p:D.presences.find(p=>p.seance_id===s.id&&p.eleve_id===e.id)})),rec=st.filter(x=>x.p),pr=rec.filter(x=>x.p.present),h=pr.reduce((a,x)=>a+hrs(x.p,x.s),0)
  det=<div className="space-y-2"><Card><div className="font-bold text-lg">{e.nom}</div><div className="text-sm text-slate-500">{cn(e.classe_id)} · Parent : {e.telephone||'-'} · {e.actif?'actif':'inactif'}</div></Card>
   <Card><h3 className="font-bold mb-1">Finances <span className={'text-white text-xs px-2 py-0.5 rounded-full '+(j<0?'bg-red-600':'bg-green-600')}>{j<0?`En retard de ${-j} j`:'En règle'}</span></h3>
    <div className="text-sm">Mensualités versées : <b>{fmt(f.tot)}</b> ({f.k} mois complet(s))</div><div className="text-sm">Prochaine échéance : <b>{f.d}</b></div><div className="text-sm">Reste à payer : <b>{fmt(f.reste)} ({f.lab})</b></div>
    {ps.map(p=><div key={p.id} className="flex justify-between items-center border-t mt-1 pt-1 text-xs"><span>N°{p.numero} · {p.date} · {p.type}</span><span>{fmt(p.montant)} <button className="text-brand align-middle" onClick={()=>receipt(p,D)}><FileDown size={16}/></button></span></div>)}</Card>
   <Card><h3 className="font-bold mb-1">Assiduité</h3><div className="text-sm">Présent à <b>{pr.length}/{rec.length}</b> séances ({rec.length?Math.round(100*pr.length/rec.length):0}%) · {h.toFixed(1)} h</div>
    <div className="flex gap-1 mt-2 flex-wrap">{st.slice(0,10).map((x,i)=><div key={i} title={`n-${i+1} · ${x.s.date}`} className={'w-8 h-8 rounded text-[10px] text-white flex items-center justify-center '+(!x.p?'bg-slate-300':x.p.present?'bg-green-600':'bg-red-600')}>n-{i+1}</div>)}</div></Card><NotesBox e={e} D={D} R={R}/></div>}
 return <div className="space-y-2"><h2 className="font-bold text-lg">Recherche élève</h2>
  <div className="grid grid-cols-2 gap-2"><input className={I} placeholder="Nom…" value={q} onChange={x=>setQ(x.target.value)}/><select className={I} value={c} onChange={x=>setC(x.target.value)}><option value="">Toutes classes</option>{D.classes.map(k=><option key={k.id} value={k.id}>{k.nom}</option>)}</select></div>
  {det||L.map(x=><button key={x.id} onClick={()=>setId(x.id)} className="w-full text-left bg-white rounded-xl p-3 shadow-sm">{x.nom} <span className="text-sm text-slate-500">· {cn(x.classe_id)}</span></button>)}
  {e&&<button className="text-brand" onClick={()=>setId(null)}>← Retour à la liste</button>}</div>}
function NotesBox({e,D,R}){const mine=D.notes.filter(n=>n.eleve_id===e.id),get=q=>mine.find(n=>n.sequence===q),[f,setF]=useState({}),Q=[1,2,3,4,5,6]
 useEffect(()=>setF({}),[e.id])
 const val=(q,k)=>f[q]?.[k]??(get(q)?.[k==='m'?'moyenne':'rang']??'')
 const save=async()=>{const up=[],del=[];Q.forEach(q=>{const m=val(q,'m'),r=val(q,'r');if(m!=='')up.push({eleve_id:e.id,sequence:q,moyenne:Number(m),rang:r===''?null:Number(r)});else if(get(q))del.push(get(q).id)})
  if(up.some(x=>x.moyenne<0||x.moyenne>20))return alert('Moyenne entre 0 et 20');
  if(up.length){const{error}=await sb.from('notes').upsert(up,{onConflict:'eleve_id,sequence'});if(error)return alert(error.message)}
  if(del.length)await sb.from('notes').delete().in('id',del);setF({});R()}
 const cls=q=>avg(D.notes.filter(n=>n.sequence===q&&D.eleves.find(x=>x.id===n.eleve_id)?.classe_id===e.classe_id).map(n=>Number(n.moyenne)))
 const data=Q.map(q=>({s:'S'+q,Élève:get(q)?+get(q).moyenne:null,Classe:cls(q)})),v=Q.map(q=>get(q)?+get(q).moyenne:null),fl=v.filter(x=>x!=null)
 const tr=fl.length>1?`${arrow(v)==='↗'?'En progression':arrow(v)==='↘'?'En baisse':'Stable'} (${(fl[fl.length-1]-fl[fl.length-2]>=0?'+':'')+(fl[fl.length-1]-fl[fl.length-2]).toFixed(2)} vs séquence précédente, ${(fl[fl.length-1]-fl[0]>=0?'+':'')+(fl[fl.length-1]-fl[0]).toFixed(2)} depuis la 1re)`:'Pas assez de notes pour une tendance'
 let pv=null
 return <Card><h3 className="font-bold mb-2">Notes (moyennes séquentielles)</h3>
  {Q.map(q=><div key={q} className="flex items-center gap-2 text-sm py-1 border-t"><span className="w-24 shrink-0">Séquence {q}</span><input type="number" step="0.01" min="0" max="20" placeholder="Moyenne /20" className={I} value={val(q,'m')} onChange={x=>setF({...f,[q]:{...f[q],m:x.target.value}})}/><div className="w-24 shrink-0"><input type="number" min="1" placeholder="Rang" className={I} value={val(q,'r')} onChange={x=>setF({...f,[q]:{...f[q],r:x.target.value}})}/></div></div>)}
  <button className={B+' w-full mt-2'} onClick={save}>Enregistrer les notes</button>
  <div className="grid grid-cols-3 gap-2 mt-3">{[1,2,3].map(t=><div key={t} className="rounded-lg bg-amber-50 p-2 text-center"><div className="text-xs">Trimestre {t}</div><div className="font-bold text-brand text-lg">{f2(trim(mine,t))}</div></div>)}</div>
  <p className="text-sm mt-2 font-medium">{arrow(v)} {tr}</p>
  <div style={{height:200}}><ResponsiveContainer><LineChart data={data}><XAxis dataKey="s" fontSize={11}/><YAxis domain={[0,20]} fontSize={11} width={30}/><Tooltip/><Legend/><Line dataKey="Élève" stroke="#16295e" strokeWidth={3} connectNulls/><Line dataKey="Classe" stroke="#b58a2f" strokeDasharray="4 3" connectNulls/></LineChart></ResponsiveContainer></div>
  <table className="w-full text-xs"><thead><tr className="text-left"><th>Séq.</th><th>Moyenne</th><th>Rang</th><th>Variation</th></tr></thead><tbody>{Q.filter(get).map(q=>{const m=+get(q).moyenne,d=pv==null?null:m-pv;pv=m;return<tr key={q} className="border-t"><td className="py-1">S{q}</td><td>{f2(m)}</td><td>{get(q).rang??'-'}</td><td className={d==null?'':d>=0?'text-green-700':'text-red-600'}>{d==null?'-':(d>=0?'+':'')+d.toFixed(2)}</td></tr>})}</tbody></table></Card>}
function Tend({D}){const Q=[1,2,3,4,5,6],cof=n=>D.eleves.find(x=>x.id===n.eleve_id)?.classe_id,cl=D.classes.filter(c=>D.notes.some(n=>cof(n)===c.id)),nc=c=>D.notes.filter(n=>cof(n)===c)
 const sq=(ns,q)=>avg(ns.filter(n=>n.sequence===q).map(n=>Number(n.moyenne))),data=Q.map(q=>{const o={s:'S'+q,Global:sq(D.notes,q)};cl.forEach(c=>o[c.nom]=sq(nc(c.id),q));return o})
 const row=(l,ns)=>{const v=Q.map(q=>sq(ns,q)),ids=[...new Set(ns.map(n=>n.eleve_id))];return<tr key={l} className="border-t"><td className="py-1 font-medium">{l}</td>{v.map((x,i)=><td key={i}>{f2(x)}</td>)}{[1,2,3].map(t=><td key={t} className="font-semibold">{f2(avg(ids.map(id=>trim(ns.filter(n=>n.eleve_id===id),t)).filter(x=>x!=null)))}</td>)}<td className="text-lg">{arrow(v)}</td></tr>}
 return <div className="space-y-2"><h2 className="font-bold text-lg">Notes & tendances</h2>{!D.notes.length&&<p className="text-slate-500">Aucune note saisie. Ouvre la fiche d'un élève (Recherche élève) pour en ajouter.</p>}
  <Card><div style={{height:240}}><ResponsiveContainer><LineChart data={data}><XAxis dataKey="s" fontSize={11}/><YAxis domain={[0,20]} fontSize={11} width={30}/><Tooltip/><Legend/><Line dataKey="Global" stroke="#b58a2f" strokeWidth={4} connectNulls/>{cl.map((c,i)=><Line key={c.id} dataKey={c.nom} stroke={PAL[i%PAL.length]} connectNulls/>)}</LineChart></ResponsiveContainer></div></Card>
  <Card c="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left"><th>Classe</th>{Q.map(q=><th key={q}>S{q}</th>)}<th>T1</th><th>T2</th><th>T3</th><th>Tend.</th></tr></thead><tbody>{row('Tous les cours',D.notes)}{cl.map(c=>row(c.nom,nc(c.id)))}</tbody></table></Card></div>}
function Regle({D}){const rows=D.eleves.filter(e=>e.actif).map(e=>{const f=due(e,D);return{e,f,j:f.j}}).sort((a,b)=>a.j-b.j),cn=i=>D.classes.find(x=>x.id===i)?.nom||'-'
 const tb=(t,l,c)=><Card c="overflow-x-auto"><h3 className={'font-bold mb-1 '+c}>{t} ({l.length})</h3><table className="w-full text-sm"><thead><tr className="text-left"><th>Élève</th><th>Classe</th><th>Échéance</th><th>Reste</th></tr></thead><tbody>{l.map(r=><tr key={r.e.id} className="border-t"><td className="py-1">{r.e.nom}</td><td>{cn(r.e.classe_id)}</td><td>{r.f.d}{r.j<0&&<b className="text-red-600"> (−{-r.j} j)</b>}</td><td>{fmt(r.f.reste)} <span className="text-xs text-slate-500">({r.f.lab})</span></td></tr>)}</tbody></table></Card>
 return <div className="space-y-2"><h2 className="font-bold text-lg">Situation financière</h2>{tb('Pas en règle',rows.filter(r=>r.j<0),'text-red-600')}{tb('En règle',rows.filter(r=>r.j>=0),'text-green-700')}</div>}
function Admins({D,R}){const E={nom:'',username:'',password:''},[f,setF]=useState(E),[ed,setEd]=useState(null)
 const mk=async e=>{e.preventDefault();const{error}=await sb.rpc('admin_create',{uname:f.username.trim().toLowerCase(),fname:f.nom,pw:f.password});if(error)return alert(error.message);alert('Admin créé : il devra changer son mot de passe à la 1re connexion.');setF(E);R()}
 const upd=async e=>{e.preventDefault();let r=await sb.rpc('admin_update',{uid:ed.id,uname:ed.username.trim().toLowerCase(),fname:ed.nom});if(!r.error&&ed.pw)r=await sb.rpc('admin_set_password',{uid:ed.id,pw:ed.pw});if(r.error)return alert(r.error.message);setEd(null);R()}
 const del=async p=>{if(!confirm('Supprimer '+p.username+' ?'))return;const{error}=await sb.rpc('admin_delete',{uid:p.id});if(error)alert(error.message);R()}
 return <div className="space-y-2"><h2 className="font-bold text-lg">Administrateurs</h2>
  <Card><form onSubmit={mk} className="space-y-2"><input className={I} placeholder="Nom complet" required value={f.nom} onChange={e=>setF({...f,nom:e.target.value})}/><input className={I} placeholder="Nom d'utilisateur" required autoCapitalize="none" value={f.username} onChange={e=>setF({...f,username:e.target.value})}/><input className={I} type="password" autoComplete="new-password" placeholder="Mot de passe temporaire (6+)" minLength={6} required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/><button className={B+' w-full'}>Créer un admin</button></form></Card>
  {D.profiles.map(p=><Card key={p.id} c="flex items-center gap-2"><div className="flex-1"><b>{p.username||p.email}</b><div className="text-xs text-slate-500">{p.nom} · {p.role}</div></div><button className="p-2" onClick={()=>setEd({...p,pw:''})}><Pencil size={18}/></button>{p.role!=='superadmin'&&<button className="p-2 text-red-600" onClick={()=>del(p)}><Trash2 size={18}/></button>}</Card>)}
  {ed&&<div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"><form onSubmit={upd} className="bg-white rounded-t-2xl p-4 w-full max-w-md space-y-2"><h3 className="font-bold">Modifier</h3><input className={I} required value={ed.nom||''} onChange={e=>setEd({...ed,nom:e.target.value})}/><input className={I} required autoCapitalize="none" value={ed.username||''} onChange={e=>setEd({...ed,username:e.target.value})}/><input className={I} type="password" autoComplete="new-password" placeholder="Nouveau mot de passe (vide = inchangé)" minLength={6} value={ed.pw} onChange={e=>setEd({...ed,pw:e.target.value})}/><div className="flex gap-2"><button type="button" className="flex-1 border rounded-lg py-2" onClick={()=>setEd(null)}>Annuler</button><button className={B+' flex-1'}>Enregistrer</button></div></form></div>}</div>}
function Auth({onPw,forced}){const[e,setE]=useState(''),[p,setP]=useState(''),[nm,setNm]=useState(''),[setup,setSetup]=useState(false)
 useEffect(()=>{if(!forced)sb.rpc('needs_setup').then(({data})=>setSetup(data===true))},[forced])
 const go=async ev=>{ev.preventDefault();if(forced){if(p.length<8)return alert('8 caractères minimum');const{error}=await sb.auth.updateUser({password:p});if(error)return alert(error.message);await sb.rpc('pw_done');onPw()}
  else if(setup){const{error}=await sb.rpc('setup_super',{uname:e.trim().toLowerCase(),fname:nm,pw:p});if(error)return alert(error.message);setSetup(false);setP('');alert('Superadmin créé. Connecte-toi avec ce nom d\'utilisateur.')}
  else{const u=e.trim(),{data:em}=await sb.rpc('email_of',{u}),{error}=await sb.auth.signInWithPassword({email:em||u,password:p});if(error)alert('Identifiants incorrects')}}
 return <form onSubmit={go} className="max-w-sm mx-auto mt-24 p-4 space-y-3"><img src={LOGO} className="w-28 h-28 mx-auto"/><h1 className="text-xl font-bold text-brand text-center">{forced?'Choisis un nouveau mot de passe':setup?'Créer le superadmin':NOM}</h1>
  {setup&&<input className={I} placeholder="Nom complet" required value={nm} onChange={x=>setNm(x.target.value)}/>}
  {!forced&&<input className={I} placeholder="Nom d'utilisateur" autoCapitalize="none" required value={e} onChange={x=>setE(x.target.value)}/>}<input className={I} type="password" placeholder={forced?'Nouveau mot de passe':'Mot de passe'} minLength={setup?6:undefined} required value={p} onChange={x=>setP(x.target.value)}/><button className={B+' w-full'}>{forced?'Valider':setup?'Créer':'Connexion'}</button></form>}
export default function App(){
 const[u,setU]=useState(undefined),[D,setD]=useState(null),[tab,setTab]=useState('home')
 useEffect(()=>{sb.auth.getSession().then(({data})=>setU(data.session?.user||null));const{data:l}=sb.auth.onAuthStateChange((_,s)=>setU(s?.user||null));return()=>l.subscription.unsubscribe()},[])
 const R=useCallback(async()=>{const o={};await Promise.all(T.map(async t=>{const{data}=await sb.from(t).select('*').order('created_at',{ascending:false}).limit(5000);o[t]=data||[]}));setD(o)},[])
 useEffect(()=>{if(u)R();else setD(null)},[u,R])
 if(u===undefined||(u&&!D))return <p className="p-8">Chargement…</p>
 if(!u)return <Auth/>
 const me=D.profiles.find(p=>p.id===u.id);if(me?.must_change)return <Auth forced onPw={R}/>
 const uname=me?.username||me?.email||u.email,sup=me?.role==='superadmin',F=fields(uname)
 const crud=(t,title,show,x={})=><Crud key={t} t={t} title={title} D={D} R={R} fields={F[t]} show={show} {...x}/>
 const delLog=async id=>{const q=sb.from('audit_log').delete(),{error}=await(id?q.eq('id',id):q.gt('id',0));if(error)alert(error.message);R()}
 const pr=r=>{const e=D.eleves.find(x=>x.id===r.eleve_id),L=e&&r.type==='mensualite'?ledger(e,D).al[r.id]:null;return L?rng(L.from,L.to)+(L.reste?` · reste ${fmt(L.reste)}`:''):r.type}
 const nm=(l,id)=>D[l].find(x=>x.id===id)?.nom||'-'
 const more=[['classes','Classes'],['enseignants','Enseignants'],['depenses','Dépenses'],['recap','Recherche élève'],['tend','Notes & tendances'],['regle','Situation financière'],['profs','Suivi enseignants'],...(sup?[['admins','Administrateurs'],['audit',"Journal d'audit"]]:[])]
 const pages={home:<Dash D={D}/>,appel:<Appel D={D} R={R}/>,profs:<Profs D={D}/>,recap:<Fiche D={D} R={R}/>,tend:<Tend D={D}/>,regle:<Regle D={D}/>,admins:sup&&<Admins D={D} R={R}/>,
  audit:sup&&<div className="space-y-1"><div className="flex justify-between items-center"><h2 className="font-bold text-lg">Journal d'audit ({D.audit_log.length})</h2>{D.audit_log.length>0&&<button className="text-red-600 text-sm" onClick={()=>confirm('Supprimer TOUT le journal ?')&&delLog()}>Tout supprimer</button>}</div>{D.audit_log.map(a=><Card key={a.id} c="text-xs flex justify-between items-center"><div><b>{a.tab}</b> {a.action} — {a.user_email}<br/>{new Date(a.created_at).toLocaleString('fr-FR')}</div><button className="text-red-600 p-2" onClick={()=>delLog(a.id)}><Trash2 size={16}/></button></Card>)}</div>,
  classes:crud('classes','Classes',r=>[r.nom,r.niveau]),
  enseignants:crud('enseignants','Enseignants',r=>[r.nom,`${r.matiere||''} · ${fmt(r.taux_horaire)}/h${r.actif?'':' · inactif'}`]),
  eleves:crud('eleves','Élèves',r=>[r.nom,`${nm('classes',r.classe_id)} · ${r.telephone||''} · ${fmt(r.mensualite)}${r.actif?'':' · inactif'}`]),
  depenses:crud('depenses','Dépenses',r=>[`${r.nom} — ${fmt(r.montant)}`,`${r.date} · ${r.auteur||''}`]),
  paiements:crud('paiements','Paiements',r=>[`N°${r.numero} · ${nm('eleves',r.eleve_id)} — ${fmt(r.montant)}`,`${pr(r)} · ${r.date} · par ${r.recu_par||'-'}`],{
   calc:(n,D)=>{const e=D.eleves.find(x=>x.id===n.eleve_id);if(!e)return{};if(n.type==='inscription')return{montant:n.montant||e.frais_inscription,mois_debut:''};const L=ledger(e,D,{id:n.id,montant:0,date:n.date,mois_debut:n.mois_debut});return{mois_debut:D.paiements.some(p=>p.eleve_id===e.id&&p.type==='mensualite'&&p.id!==n.id)?addM(L.base,Math.floor(L.T/L.m)):(n.mois_debut||today().slice(0,7))}},
   before:(p,D)=>{if(p.type==='inscription')return{...p,mois:0,mois_debut:null,echeance:null};const e=D.eleves.find(x=>x.id===p.eleve_id),a=ledger(e,D,p).al.h;return{...p,mois:a.n,mois_debut:p.mois_debut||a.from,echeance:null}},
   note:(f,D)=>{const e=D.eleves.find(x=>x.id===f.eleve_id);if(!e||f.type!=='mensualite'||!Number(f.montant))return "Saisis le montant : l'application calcule les mois couverts.";const a=ledger(e,D,f).al.h;return `Couvre : ${rng(a.from,a.to)} (${a.n} mois)`+(a.reste?` — reste ${fmt(a.reste)} sur ${ml(a.to)}`:' — mois soldé(s)')},
   actions:r=><button title="Reçu PDF" className="p-2 text-brand" onClick={()=>receipt(r,D)}><FileDown size={18}/></button>})}
 const act=more.some(([k])=>k===tab)?'plus':tab
 const nav=[['home',Home,'Accueil'],['appel',ClipboardCheck,'Appel'],['paiements',Wallet,'Paiements'],['eleves',Users,'Élèves'],['plus',Menu,'Plus']]
 return <div className="max-w-3xl mx-auto p-3 pb-24">
  <div className="flex justify-between items-center mb-3 text-sm text-slate-500"><span className="flex items-center gap-2"><img src={LOGO} className="w-10 h-10 rounded-full"/><span className="font-bold text-brand leading-tight text-xs">CRÉPRORÉ<br/><span className="font-normal text-slate-500">{uname} ({me?.role})</span></span></span><button onClick={()=>sb.auth.signOut()}><LogOut size={18}/></button></div>
  {more.some(([k])=>k===tab)&&<button className="flex items-center text-brand mb-2" onClick={()=>setTab('plus')}><ChevronLeft size={18}/>Plus</button>}
  {tab==='plus'?<div className="space-y-2">{more.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className="w-full text-left bg-white rounded-xl p-4 shadow-sm font-medium">{l}</button>)}</div>:pages[tab]}
  <nav className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-gold flex pb-[env(safe-area-inset-bottom)] z-40">{nav.map(([k,Ic,l])=><button key={k} onClick={()=>setTab(k)} className={'flex-1 py-2 flex flex-col items-center text-xs '+(act===k?'text-brand font-bold':'text-slate-500')}><Ic size={22}/>{l}</button>)}</nav></div>}
