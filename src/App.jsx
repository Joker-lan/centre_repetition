import {useEffect,useState,useMemo,useCallback} from 'react'
import {createClient} from '@supabase/supabase-js'
import {Home,ClipboardCheck,Wallet,Users,Menu,Trash2,Pencil,Plus,FileDown,LogOut,ChevronLeft} from 'lucide-react'
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,Legend} from 'recharts'
import jsPDF from 'jspdf';import autoTable from 'jspdf-autotable'
const URL=import.meta.env.VITE_SUPABASE_URL,KEY=import.meta.env.VITE_SUPABASE_ANON_KEY
const sb=createClient(URL,KEY)
const T=['profiles','classes','enseignants','eleves','depenses','paiements','seances','presences','audit_log']
const today=()=>new Date().toISOString().slice(0,10)
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}
const fmt=n=>(Number(n||0).toLocaleString('fr-FR')+' F').replace(/[\u202f\u00a0]/g,' ')
const pStart=p=>{if(p==='all')return'0000';const d=new Date(),m=p==='month'?d.getMonth():d.getMonth()-d.getMonth()%3;return new Date(Date.UTC(d.getFullYear(),m,1)).toISOString().slice(0,10)}
const gk=(d,g)=>{const x=new Date(d);if(g==='day')return d;if(g==='week'){x.setDate(x.getDate()-((x.getDay()+6)%7));return x.toISOString().slice(0,10)}if(g==='month')return d.slice(0,7);return d.slice(0,4)+'-T'+(Math.floor(x.getMonth()/3)+1)}
const tmin=x=>{const[h,mi]=x.split(':');return h*60+ +mi}
const hrs=(p,s)=>p.arrivee&&p.fin?Math.max(0,(tmin(p.fin)-tmin(p.arrivee))/60):Number(s.duree)
const due=(e,D)=>{const ps=D.paiements.filter(p=>p.eleve_id===e.id&&p.type==='mensualite').sort((a,b)=>a.date.localeCompare(b.date)),tot=ps.reduce((a,p)=>a+Number(p.montant),0),k=Math.floor(tot/(e.mensualite||1)),ref=ps[0]?.date||e.created_at.slice(0,10);return{tot,k,d:addD(ref,30*Math.max(k,1)),reste:(k+1)*e.mensualite-tot}}
const dj=d=>Math.round((new Date(d)-new Date(today()))/864e5)
const I='w-full border border-slate-300 rounded-lg px-3 py-2 bg-white',B='bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium active:scale-95'
const Card=({children,c=''})=><div className={'bg-white rounded-xl shadow-sm p-3 '+c}>{children}</div>
const fields=em=>({
 classes:[{k:'nom',l:'Nom',req:1},{k:'niveau',l:'Niveau'}],
 enseignants:[{k:'nom',l:'Nom',req:1},{k:'telephone',l:'Téléphone'},{k:'matiere',l:'Matière'},{k:'taux_horaire',l:'Taux horaire',type:'num',def:0},{k:'actif',l:'Actif',type:'bool'}],
 eleves:[{k:'nom',l:'Nom',req:1},{k:'telephone',l:'Téléphone'},{k:'classe_id',l:'Classe',type:'sel',src:'classes',lab:'nom'},{k:'frais_inscription',l:"Frais d'inscription",type:'num',def:2000},{k:'mensualite',l:'Mensualité',type:'num',def:10000},{k:'actif',l:'Actif',type:'bool'}],
 depenses:[{k:'nom',l:'Nom',req:1},{k:'montant',l:'Montant',type:'num',req:1},{k:'description',l:'Description'},{k:'date',l:'Date',type:'date',def:today()},{k:'auteur',l:'Auteur',def:em}],
 paiements:[{k:'eleve_id',l:'Élève',type:'sel',src:'eleves',lab:'nom',req:1},{k:'type',l:'Type',type:'sel',opts:[['mensualite','Mensualité'],['inscription','Inscription']],def:'mensualite',req:1},{k:'mois',l:'Mois payés (1-6)',type:'num',def:1},{k:'montant',l:'Montant versé (tranche possible)',type:'num',req:1},{k:'date',l:'Date',type:'date',def:today()},{k:'recu_par',l:'Reçu par',def:em}]})
function Crud({t,title,D,R,fields:fs,show,before,calc,actions}){
 const[f,setF]=useState(null),rows=D[t]
 const open=r=>setF(r||Object.fromEntries(fs.map(x=>[x.k,x.def??(x.type==='bool'?true:'')])))
 const ch=(k,v)=>{let n={...f,[k]:v};if(calc&&k!=='montant')n={...n,...calc(n,D)};setF(n)}
 const save=async e=>{e.preventDefault();let p={...f};fs.forEach(x=>{if(x.type==='num'&&p[x.k]!=='')p[x.k]=Number(p[x.k]);if(p[x.k]==='')p[x.k]=null});if(before)p=before(p);
  const{error}=p.id?await sb.from(t).update(p).eq('id',p.id):await sb.from(t).insert(p);if(error)return alert(error.message);setF(null);R()}
 const del=async r=>{if(confirm('Supprimer ?')){const{error}=await sb.from(t).delete().eq('id',r.id);if(error)alert(error.message);R()}}
 return <div className="space-y-2">
  <div className="flex justify-between items-center"><h2 className="font-bold text-lg">{title} ({rows.length})</h2><button className={B} onClick={()=>open()}><Plus size={18} className="inline"/> Ajouter</button></div>
  {rows.map(r=>{const[a,b]=show(r);return <Card key={r.id} c="flex items-center gap-2"><div className="flex-1 min-w-0"><div className="font-medium truncate">{a}</div><div className="text-sm text-slate-500 truncate">{b}</div></div>{actions?.(r)}<button onClick={()=>open(r)} className="p-2"><Pencil size={18}/></button><button onClick={()=>del(r)} className="p-2 text-red-600"><Trash2 size={18}/></button></Card>})}
  {f&&<div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center"><form onSubmit={save} className="bg-white rounded-t-2xl md:rounded-2xl p-4 w-full max-w-md space-y-2 max-h-[90vh] overflow-auto">
   <h3 className="font-bold">{f.id?'Modifier':'Nouveau'} — {title}</h3>
   {fs.map(x=><label key={x.k} className="block text-sm">{x.type==='bool'?<span className="flex gap-2 items-center"><input type="checkbox" checked={!!f[x.k]} onChange={e=>ch(x.k,e.target.checked)}/>{x.l}</span>:<>{x.l}
    {x.type==='sel'?<select className={I} required={x.req} value={f[x.k]??''} onChange={e=>ch(x.k,e.target.value)}><option value="">—</option>{(x.opts||D[x.src].map(r=>[r.id,r[x.lab]])).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    :<input className={I} required={x.req} type={x.type==='num'?'number':x.type||'text'} min={x.k==='mois'?1:undefined} max={x.k==='mois'?6:undefined} value={f[x.k]??''} onChange={e=>ch(x.k,e.target.value)}/>}</>}</label>)}
   <div className="flex gap-2 pt-2"><button type="button" className="flex-1 border rounded-lg py-2" onClick={()=>setF(null)}>Annuler</button><button className={B+' flex-1'}>Enregistrer</button></div></form></div>}
 </div>}
const receipt=(p,D)=>{const e=D.eleves.find(x=>x.id===p.eleve_id),d=new jsPDF({format:'a5'});d.setFontSize(16);d.text('REÇU DE PAIEMENT',14,20);d.setFontSize(11)
 ;[['N° de reçu',p.numero],['Élève',e?.nom],['Type',p.type],['Montant',fmt(p.montant)],['Date',p.date],['Prochaine échéance',e?due(e,D).d:'-'],['Reste du mois en cours',e?fmt(Math.max(0,due(e,D).reste)):'-'],['Reçu par',p.recu_par]].forEach(([a,b],i)=>d.text(`${a} : ${b??''}`,14,35+i*9));d.save(`recu-${p.numero}.pdf`)}
function Appel({D,R}){
 const[s,setS]=useState({classe_id:'',enseignant_id:'',date:today(),debut:'16:00',fin:'18:00'}),[m,setM]=useState({}),[all,setAll]=useState('')
 const dur=useMemo(()=>Math.max(0,(tmin(s.fin)-tmin(s.debut))/60),[s])
 const list=D.eleves.filter(e=>e.actif&&e.classe_id===s.classe_id).sort((a,b)=>a.nom.localeCompare(b.nom))
 const g=e=>({present:true,arr:s.debut,fin:'',...m[e.id]}),up=(e,o)=>setM({...m,[e.id]:{...g(e),...o}})
 const endAll=()=>{if(!all)return;const n={...m};list.forEach(e=>{if(g(e).present)n[e.id]={...g(e),fin:all}});setM(n)}
 const pdf=()=>{const en=D.enseignants.find(x=>x.id===s.enseignant_id),c=D.classes.find(x=>x.id===s.classe_id),d=new jsPDF();d.setFontSize(14);d.text(`Feuille de présence - ${c?.nom}`,14,15);d.setFontSize(10)
  d.text(`Enseignant : ${en?.nom} | Date : ${s.date} | ${s.debut}-${s.fin} | Durée : ${dur.toFixed(2)} h`,14,23)
  autoTable(d,{startY:28,head:[['#','Élève','Statut','Arrivée','Fin']],body:list.map((e,i)=>{const x=g(e);return[i+1,e.nom,x.present?'Présent':'Absent',x.present?x.arr||'-':'-',x.present?x.fin||'-':'-']}),didParseCell:h=>{if(h.section==='body')h.cell.styles.fillColor=h.row.raw[2]==='Présent'?[198,239,206]:[255,199,206]}});d.save(`appel-${s.date}.pdf`)}
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
 const late=D.eleves.filter(e=>e.actif).map(e=>({e,j:dj(due(e,D).d)})).filter(x=>x.j<=5).sort((x,y)=>x.j-y.j)
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
function Fiche({D}){const[q,setQ]=useState(''),[c,setC]=useState(''),[id,setId]=useState(null)
 const L=D.eleves.filter(e=>e.nom.toLowerCase().includes(q.toLowerCase())&&(!c||e.classe_id===c)).sort((a,b)=>a.nom.localeCompare(b.nom)),e=D.eleves.find(x=>x.id===id),cn=i=>D.classes.find(x=>x.id===i)?.nom||'-'
 let det=null
 if(e){const f=due(e,D),j=dj(f.d),ps=D.paiements.filter(p=>p.eleve_id===e.id)
  const st=D.seances.filter(s=>s.classe_id===e.classe_id).sort((a,b)=>(b.date+b.created_at).localeCompare(a.date+a.created_at)).map(s=>({s,p:D.presences.find(p=>p.seance_id===s.id&&p.eleve_id===e.id)})),rec=st.filter(x=>x.p),pr=rec.filter(x=>x.p.present),h=pr.reduce((a,x)=>a+hrs(x.p,x.s),0)
  det=<div className="space-y-2"><Card><div className="font-bold text-lg">{e.nom}</div><div className="text-sm text-slate-500">{cn(e.classe_id)} · {e.telephone||'-'} · {e.actif?'actif':'inactif'}</div></Card>
   <Card><h3 className="font-bold mb-1">Finances <span className={'text-white text-xs px-2 py-0.5 rounded-full '+(j<0?'bg-red-600':'bg-green-600')}>{j<0?`En retard de ${-j} j`:'En règle'}</span></h3>
    <div className="text-sm">Mensualités versées : <b>{fmt(f.tot)}</b> ({f.k} mois complet(s))</div><div className="text-sm">Prochaine échéance : <b>{f.d}</b></div><div className="text-sm">Reste à payer : <b>{fmt(Math.max(0,f.reste))}</b></div>
    {ps.map(p=><div key={p.id} className="flex justify-between items-center border-t mt-1 pt-1 text-xs"><span>N°{p.numero} · {p.date} · {p.type}</span><span>{fmt(p.montant)} <button className="text-indigo-600 align-middle" onClick={()=>receipt(p,D)}><FileDown size={16}/></button></span></div>)}</Card>
   <Card><h3 className="font-bold mb-1">Assiduité</h3><div className="text-sm">Présent à <b>{pr.length}/{rec.length}</b> séances ({rec.length?Math.round(100*pr.length/rec.length):0}%) · {h.toFixed(1)} h</div>
    <div className="flex gap-1 mt-2 flex-wrap">{st.slice(0,10).map((x,i)=><div key={i} title={`n-${i+1} · ${x.s.date}`} className={'w-8 h-8 rounded text-[10px] text-white flex items-center justify-center '+(!x.p?'bg-slate-300':x.p.present?'bg-green-600':'bg-red-600')}>n-{i+1}</div>)}</div></Card></div>}
 return <div className="space-y-2"><h2 className="font-bold text-lg">Recherche élève</h2>
  <div className="grid grid-cols-2 gap-2"><input className={I} placeholder="Nom…" value={q} onChange={x=>setQ(x.target.value)}/><select className={I} value={c} onChange={x=>setC(x.target.value)}><option value="">Toutes classes</option>{D.classes.map(k=><option key={k.id} value={k.id}>{k.nom}</option>)}</select></div>
  {det||L.map(x=><button key={x.id} onClick={()=>setId(x.id)} className="w-full text-left bg-white rounded-xl p-3 shadow-sm">{x.nom} <span className="text-sm text-slate-500">· {cn(x.classe_id)}</span></button>)}
  {e&&<button className="text-indigo-600" onClick={()=>setId(null)}>← Retour à la liste</button>}</div>}
function Regle({D}){const rows=D.eleves.filter(e=>e.actif).map(e=>{const f=due(e,D);return{e,f,j:dj(f.d)}}).sort((a,b)=>a.j-b.j),cn=i=>D.classes.find(x=>x.id===i)?.nom||'-'
 const tb=(t,l,c)=><Card c="overflow-x-auto"><h3 className={'font-bold mb-1 '+c}>{t} ({l.length})</h3><table className="w-full text-sm"><thead><tr className="text-left"><th>Élève</th><th>Classe</th><th>Échéance</th><th>Reste</th></tr></thead><tbody>{l.map(r=><tr key={r.e.id} className="border-t"><td className="py-1">{r.e.nom}</td><td>{cn(r.e.classe_id)}</td><td>{r.f.d}{r.j<0&&<b className="text-red-600"> (−{-r.j} j)</b>}</td><td>{fmt(Math.max(0,r.f.reste))}</td></tr>)}</tbody></table></Card>
 return <div className="space-y-2"><h2 className="font-bold text-lg">Situation financière</h2>{tb('Pas en règle',rows.filter(r=>r.j<0),'text-red-600')}{tb('En règle',rows.filter(r=>r.j>=0),'text-green-700')}</div>}
function Admins({D,R}){const E={nom:'',username:'',password:''},[f,setF]=useState(E),[ed,setEd]=useState(null)
 const mk=async e=>{e.preventDefault();const u=f.username.trim().toLowerCase(),c=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{error}=await c.auth.signUp({email:u+'@centre-gestion.com',password:f.password,options:{data:{nom:f.nom,username:u}}});if(error)return alert(error.message);alert('Admin créé : il devra changer son mot de passe à la 1re connexion.');setF(E);setTimeout(R,800)}
 const upd=async e=>{e.preventDefault();let r=await sb.rpc('admin_update',{uid:ed.id,uname:ed.username.trim().toLowerCase(),fname:ed.nom});if(!r.error&&ed.pw)r=await sb.rpc('admin_set_password',{uid:ed.id,pw:ed.pw});if(r.error)return alert(r.error.message);setEd(null);R()}
 const del=async p=>{if(!confirm('Supprimer '+p.username+' ?'))return;const{error}=await sb.rpc('admin_delete',{uid:p.id});if(error)alert(error.message);R()}
 return <div className="space-y-2"><h2 className="font-bold text-lg">Administrateurs</h2>
  <Card><form onSubmit={mk} className="space-y-2"><input className={I} placeholder="Nom complet" required value={f.nom} onChange={e=>setF({...f,nom:e.target.value})}/><input className={I} placeholder="Nom d'utilisateur" required autoCapitalize="none" value={f.username} onChange={e=>setF({...f,username:e.target.value})}/><input className={I} type="password" autoComplete="new-password" placeholder="Mot de passe temporaire (6+)" minLength={6} required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/><button className={B+' w-full'}>Créer un admin</button></form></Card>
  {D.profiles.map(p=><Card key={p.id} c="flex items-center gap-2"><div className="flex-1"><b>{p.username||p.email}</b><div className="text-xs text-slate-500">{p.nom} · {p.role}</div></div><button className="p-2" onClick={()=>setEd({...p,pw:''})}><Pencil size={18}/></button>{p.role!=='superadmin'&&<button className="p-2 text-red-600" onClick={()=>del(p)}><Trash2 size={18}/></button>}</Card>)}
  {ed&&<div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"><form onSubmit={upd} className="bg-white rounded-t-2xl p-4 w-full max-w-md space-y-2"><h3 className="font-bold">Modifier</h3><input className={I} required value={ed.nom||''} onChange={e=>setEd({...ed,nom:e.target.value})}/><input className={I} required autoCapitalize="none" value={ed.username||''} onChange={e=>setEd({...ed,username:e.target.value})}/><input className={I} type="password" autoComplete="new-password" placeholder="Nouveau mot de passe (vide = inchangé)" minLength={6} value={ed.pw} onChange={e=>setEd({...ed,pw:e.target.value})}/><div className="flex gap-2"><button type="button" className="flex-1 border rounded-lg py-2" onClick={()=>setEd(null)}>Annuler</button><button className={B+' flex-1'}>Enregistrer</button></div></form></div>}</div>}
function Auth({onPw,forced}){const[e,setE]=useState(''),[p,setP]=useState('')
 const go=async ev=>{ev.preventDefault();if(forced){if(p.length<8)return alert('8 caractères minimum');const{error}=await sb.auth.updateUser({password:p});if(error)return alert(error.message);await sb.rpc('pw_done');onPw()}else{const u=e.trim(),{data:em}=await sb.rpc('email_of',{u}),{error}=await sb.auth.signInWithPassword({email:em||u,password:p});if(error)alert('Identifiants incorrects')}}
 return <form onSubmit={go} className="max-w-sm mx-auto mt-24 p-4 space-y-3"><h1 className="text-2xl font-bold text-indigo-700">{forced?'Choisis un nouveau mot de passe':"Centre d'encadrement"}</h1>
  {!forced&&<input className={I} placeholder="Nom d'utilisateur" autoCapitalize="none" required value={e} onChange={x=>setE(x.target.value)}/>}<input className={I} type="password" placeholder={forced?'Nouveau mot de passe':'Mot de passe'} required value={p} onChange={x=>setP(x.target.value)}/><button className={B+' w-full'}>{forced?'Valider':'Connexion'}</button></form>}
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
 const nm=(l,id)=>D[l].find(x=>x.id===id)?.nom||'-'
 const more=[['classes','Classes'],['enseignants','Enseignants'],['depenses','Dépenses'],['recap','Recherche élève'],['regle','Situation financière'],['profs','Suivi enseignants'],...(sup?[['admins','Administrateurs'],['audit',"Journal d'audit"]]:[])]
 const pages={home:<Dash D={D}/>,appel:<Appel D={D} R={R}/>,profs:<Profs D={D}/>,recap:<Fiche D={D}/>,regle:<Regle D={D}/>,admins:sup&&<Admins D={D} R={R}/>,
  audit:sup&&<div className="space-y-1"><h2 className="font-bold text-lg">Journal d'audit</h2>{D.audit_log.map(a=><Card key={a.id} c="text-xs"><b>{a.tab}</b> {a.action} — {a.user_email}<br/>{new Date(a.created_at).toLocaleString('fr-FR')}</Card>)}</div>,
  classes:crud('classes','Classes',r=>[r.nom,r.niveau]),
  enseignants:crud('enseignants','Enseignants',r=>[r.nom,`${r.matiere||''} · ${fmt(r.taux_horaire)}/h${r.actif?'':' · inactif'}`]),
  eleves:crud('eleves','Élèves',r=>[r.nom,`${nm('classes',r.classe_id)} · ${fmt(r.mensualite)}${r.actif?'':' · inactif'}`]),
  depenses:crud('depenses','Dépenses',r=>[`${r.nom} — ${fmt(r.montant)}`,`${r.date} · ${r.auteur||''}`]),
  paiements:crud('paiements','Paiements',r=>[`N°${r.numero} · ${nm('eleves',r.eleve_id)} — ${fmt(r.montant)}`,`${r.type} · ${r.date} · par ${r.recu_par||'-'}`],{
   calc:(n,D)=>{const e=D.eleves.find(x=>x.id===n.eleve_id);if(!e)return{};return{montant:n.type==='inscription'?e.frais_inscription:e.mensualite*(n.mois||1)}},
   before:p=>({...p,mois:p.type==='inscription'?0:(p.mois||1),echeance:null}),
   actions:r=><button title="Reçu PDF" className="p-2 text-indigo-600" onClick={()=>receipt(r,D)}><FileDown size={18}/></button>})}
 const act=more.some(([k])=>k===tab)?'plus':tab
 const nav=[['home',Home,'Accueil'],['appel',ClipboardCheck,'Appel'],['paiements',Wallet,'Paiements'],['eleves',Users,'Élèves'],['plus',Menu,'Plus']]
 return <div className="max-w-3xl mx-auto p-3 pb-24">
  <div className="flex justify-between items-center mb-3 text-sm text-slate-500"><span>{uname} ({me?.role})</span><button onClick={()=>sb.auth.signOut()}><LogOut size={18}/></button></div>
  {more.some(([k])=>k===tab)&&<button className="flex items-center text-indigo-600 mb-2" onClick={()=>setTab('plus')}><ChevronLeft size={18}/>Plus</button>}
  {tab==='plus'?<div className="space-y-2">{more.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className="w-full text-left bg-white rounded-xl p-4 shadow-sm font-medium">{l}</button>)}</div>:pages[tab]}
  <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex pb-[env(safe-area-inset-bottom)] z-40">{nav.map(([k,Ic,l])=><button key={k} onClick={()=>setTab(k)} className={'flex-1 py-2 flex flex-col items-center text-xs '+(act===k?'text-indigo-600 font-bold':'text-slate-500')}><Ic size={22}/>{l}</button>)}</nav></div>}
