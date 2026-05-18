


/**
 * ============================================================
 * ProjectFlow — v2.0 Slate Edition
 * ============================================================
 * Refonte visuelle complète : style Slate (sidebar, blanc, épuré)
 * + Système de droits utilisateurs complet
 *
 * NOUVEAUTÉS v2.0
 * ---------------
 * - Interface Slate : sidebar fixe, fond blanc, typographie propre
 * - Onglet Droits utilisateurs : rôles + permissions par écran/action
 * - 5 rôles combinables : Admin, Éditeur, Validateur, Opérateur, Lecteur
 * - Restrictions dynamiques selon les droits attribués
 * ============================================================
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// 1. CONFIG
// ============================================================

const ACCOUNTS = [
  { id: 1, name: "Alice", avatar: "🦊", color: "#FF6B6B", email: "alice@projectflow.io", password: "alice123" },
  { id: 2, name: "Bruno", avatar: "🐻", color: "#4ECDC4", email: "bruno@projectflow.io", password: "bruno123" },
  { id: 3, name: "Carla", avatar: "🦋", color: "#F59E0B", email: "carla@projectflow.io", password: "carla123" },
  { id: 4, name: "David", avatar: "🐬", color: "#8B5CF6", email: "david@projectflow.io", password: "david123" },
];

/** Rôles disponibles — combinables sur un même profil */
const ROLES = {
  admin:     { id: "admin",     label: "Admin",      icon: "👑", color: "#1a1a1a", desc: "Accès total à toutes les fonctionnalités" },
  editor:    { id: "editor",    label: "Éditeur",    icon: "✏️",  color: "#3B5BDB", desc: "Créer et modifier des tickets" },
  validator: { id: "validator", label: "Validateur", icon: "✅", color: "#2F9E44", desc: "Valider et clôturer des tickets" },
  operator:  { id: "operator",  label: "Opérateur",  icon: "⚙️",  color: "#E67E22", desc: "Traiter uniquement ses tickets assignés" },
  reader:    { id: "reader",    label: "Lecteur",    icon: "👁️",  color: "#868E96", desc: "Consulter sans modifier" },
};

/** Écrans accessibles — restrictibles par rôle */
const SCREENS = {
  kanban:    { id: "kanban",    label: "Tableau Kanban",  icon: "📋" },
  mytickets: { id: "mytickets", label: "Mes tickets",     icon: "🎫" },
  reports:   { id: "reports",   label: "Rapports & KPI",  icon: "📊" },
  chat:      { id: "chat",      label: "Chat",            icon: "💬" },
  settings:  { id: "settings",  label: "Paramètres",      icon: "⚙️"  },
  admin:     { id: "admin",     label: "Page Admin",      icon: "👤" },
};

/** Actions restrictibles */
const ACTIONS = {
  create_ticket:   { id: "create_ticket",   label: "Créer un ticket",      icon: "➕" },
  edit_ticket:     { id: "edit_ticket",     label: "Modifier un ticket",   icon: "✏️"  },
  delete_ticket:   { id: "delete_ticket",   label: "Supprimer un ticket",  icon: "🗑️" },
  validate_ticket: { id: "validate_ticket", label: "Valider un ticket",    icon: "✅" },
  transfer_ticket: { id: "transfer_ticket", label: "Transférer un ticket", icon: "🔄" },
  view_reports:    { id: "view_reports",    label: "Voir les rapports",    icon: "📊" },
  manage_members:  { id: "manage_members",  label: "Gérer les membres",    icon: "👥" },
};

/** Droits par défaut selon le rôle */
const DEFAULT_PERMISSIONS = {
  admin:     { screens: Object.keys(SCREENS), actions: Object.keys(ACTIONS) },
  editor:    { screens: ["kanban","mytickets","chat"], actions: ["create_ticket","edit_ticket","transfer_ticket"] },
  validator: { screens: ["kanban","mytickets","chat"], actions: ["validate_ticket","transfer_ticket"] },
  operator:  { screens: ["mytickets","chat"], actions: ["edit_ticket","transfer_ticket"] },
  reader:    { screens: ["kanban","mytickets"], actions: [] },
};

/** Profils utilisateurs par défaut (Alice = admin) */
const DEFAULT_USER_PROFILES = {
  1: { roles: ["admin"],    screens: Object.keys(SCREENS), actions: Object.keys(ACTIONS) },
  2: { roles: ["editor"],   screens: ["kanban","mytickets","chat"], actions: ["create_ticket","edit_ticket","transfer_ticket"] },
  3: { roles: ["editor","validator"], screens: ["kanban","mytickets","chat"], actions: ["create_ticket","edit_ticket","validate_ticket","transfer_ticket"] },
  4: { roles: ["operator"], screens: ["mytickets","chat"], actions: ["edit_ticket","transfer_ticket"] },
};

const PRIORITIES = [
  { label: "Critique", color: "#E03131", bg: "#FFF5F5", icon: "🔥" },
  { label: "Haute",    color: "#E67E22", bg: "#FFF8F0", icon: "⚡" },
  { label: "Moyenne",  color: "#3B5BDB", bg: "#EEF2FF", icon: "💧" },
  { label: "Basse",    color: "#2F9E44", bg: "#EBFBEE", icon: "🌿" },
];

const COLUMNS = ["À faire", "En cours", "En révision", "Terminé"];
const COL_CFG = {
  "À faire":     { icon: "○", color: "#868E96", bg: "#F8F9FA", dot: "#ADB5BD" },
  "En cours":    { icon: "◐", color: "#E67E22", bg: "#FFF8F0", dot: "#E67E22" },
  "En révision": { icon: "◑", color: "#3B5BDB", bg: "#EEF2FF", dot: "#3B5BDB" },
  "Terminé":     { icon: "●", color: "#2F9E44", bg: "#EBFBEE", dot: "#2F9E44" },
};

const WF_ACTIONS = [
  { label: "Assigner à",             icon: "📨", color: "#3B5BDB", type: "assign" },
  { label: "Renvoyer pour révision", icon: "🔄", color: "#E67E22", type: "review",     targetStatus: "En révision" },
  { label: "Demander correction",    icon: "✏️",  color: "#E03131", type: "correction", targetStatus: "À faire" },
  { label: "Valider & clôturer",     icon: "✅", color: "#2F9E44", type: "close",      targetStatus: "Terminé" },
];

const FILE_ICONS = { "image/":"🖼️","application/pdf":"📄","text/":"📝","video/":"🎬","audio/":"🎵",default:"📎" };
const getFileIcon  = (t="") => { for(const[k,v] of Object.entries(FILE_ICONS)) if(t.startsWith(k)||t===k) return v; return FILE_ICONS.default; };
const formatSize   = (b) => b<1024?b+" o":b<1048576?(b/1024).toFixed(1)+" Ko":(b/1048576).toFixed(1)+" Mo";
const getMember    = (id) => ACCOUNTS.find(m=>m.id===id);
const getPriority  = (l)  => PRIORITIES.find(p=>p.label===l)||PRIORITIES[2];

const STORAGE_KEY         = "projectflow-v6";
const PROFILES_STORAGE_KEY = "projectflow-profiles-v1";
const POLL_MS             = 3000;

const DEFAULT_TICKETS = [
  { id:1, title:"Refonte de la homepage",    description:"Moderniser l'interface utilisateur",           status:"En cours",    priority:"Haute",    assignee:1, tags:["Design"],   attachments:[], history:[{date:Date.now()-86400000, member:1, action:"Ticket créé"}],   createdAt:Date.now()-86400000, assignedAt:Date.now()-86400000 },
  { id:2, title:"Corriger bug de connexion", description:"Déconnexion après 5 min d'inactivité",         status:"À faire",     priority:"Critique", assignee:2, tags:["Bug"],      attachments:[], history:[{date:Date.now()-43200000, member:2, action:"Ticket créé"}],   createdAt:Date.now()-43200000, assignedAt:Date.now()-43200000 },
  { id:3, title:"Intégration API paiement",  description:"Connecter Stripe pour les abonnements",        status:"En révision", priority:"Haute",    assignee:3, tags:["Backend"],  attachments:[], history:[{date:Date.now()-7200000,  member:3, action:"Ticket créé"}],   createdAt:Date.now()-7200000,  assignedAt:Date.now()-3600000  },
  { id:4, title:"Documentation technique",   description:"Rédiger les guides développeurs",              status:"Terminé",     priority:"Basse",    assignee:4, tags:["Docs"],     attachments:[], history:[{date:Date.now()-172800000,member:4, action:"Ticket créé"}],   createdAt:Date.now()-172800000,assignedAt:Date.now()-172800000},
  { id:5, title:"Tests automatisés",         description:"Couverture > 80% sur les modules critiques",   status:"À faire",     priority:"Moyenne",  assignee:null,tags:["Tests"], attachments:[], history:[{date:Date.now()-3600000,  member:null,action:"Ticket créé"}],  createdAt:Date.now()-3600000,  assignedAt:null },
];

// ============================================================
// 2. STORAGE ADAPTER (Claude + Vercel compatible)
// ============================================================

const storage = {
  get:        async (key) => { if(window.storage) return window.storage.get(key,true);  const v=localStorage.getItem(key);           return v?{value:v}:null; },
  set:        async (key,val) => { if(window.storage) return window.storage.set(key,val,true);  localStorage.setItem(key,val);           return {value:val}; },
  getPrivate: async (key) => { if(window.storage) return window.storage.get(key,false); const v=localStorage.getItem("pv_"+key);      return v?{value:v}:null; },
  setPrivate: async (key,val) => { if(window.storage) return window.storage.set(key,val,false); localStorage.setItem("pv_"+key,val);      return {value:val}; },
};

// ============================================================
// 3. STYLES GLOBAUX
// ============================================================

const G = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F6F8;color:#1a1a1a}
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideInLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes badgePop{0%,100%{box-shadow:0 0 0 0 rgba(224,49,49,.5)}70%{box-shadow:0 0 0 5px rgba(224,49,49,0)}}
  select option{background:#fff;color:#1a1a1a}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#D0D5DD;border-radius:2px}
  input,textarea,select{font-family:inherit}
  .pf-card-hover:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)!important;border-color:#D0D5DD!important;transform:translateY(-1px)}
  .pf-sidebar-item:hover{background:#F4F6F8!important;color:#1a1a1a!important}
  .pf-btn:hover{opacity:.88}
  .pf-input:focus{border-color:#3B5BDB!important;box-shadow:0 0 0 3px rgba(59,91,219,.1)!important}
  .pf-checkbox{width:16px;height:16px;accent-color:#3B5BDB;cursor:pointer}
  .tag-chip{display:inline-flex;align-items:center;gap:4px;background:#F1F3F9;color:#495057;font-size:11px;font-weight:500;padding:2px 8px;border-radius:100px;border:1px solid #E8EAED}
`;

// ============================================================
// 4. HOOKS
// ============================================================

function useTicketStorage() {
  const [tickets,  setTickets]  = useState([]);
  const [nextId,   setNextId]   = useState(6);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const verRef = useRef(null);

  const save = useCallback(async (list, nid) => {
    setSyncing(true);
    const ver = Date.now();
    verRef.current = ver;
    await storage.set(STORAGE_KEY, JSON.stringify({tickets:list,nextId:nid,ver}));
    setLastSync(new Date());
    setSyncing(false);
  },[]);

  const load = useCallback(async (silent=false) => {
    try {
      const r = await storage.get(STORAGE_KEY);
      if(r?.value){
        const d = JSON.parse(r.value);
        if(d.ver !== verRef.current){
          verRef.current = d.ver;
          setTickets(d.tickets);
          setNextId(d.nextId||d.tickets.length+1);
          if(!silent) setLastSync(new Date());
        }
      } else {
        await save(DEFAULT_TICKETS,6);
        setTickets(DEFAULT_TICKETS);
      }
    } catch { try{await save(DEFAULT_TICKETS,6);setTickets(DEFAULT_TICKETS);}catch(_){} }
    setLoading(false);
  },[save]);

  useEffect(()=>{load(false);},[load]);
  useEffect(()=>{ const iv=setInterval(()=>load(true),POLL_MS); return()=>clearInterval(iv); },[load]);

  const persist = useCallback(async(list,nid)=>{ setTickets(list); if(nid!==undefined)setNextId(nid); await save(list,nid??nextId); },[save,nextId]);

  return {tickets,nextId,loading,syncing,lastSync,persist};
}

function useProfiles() {
  const [profiles, setProfiles] = useState(DEFAULT_USER_PROFILES);

  useEffect(()=>{
    storage.get(PROFILES_STORAGE_KEY).then(r=>{
      if(r?.value) setProfiles(JSON.parse(r.value));
    }).catch(()=>{});
  },[]);

  const saveProfiles = async (updated) => {
    setProfiles(updated);
    await storage.set(PROFILES_STORAGE_KEY, JSON.stringify(updated));
  };

  const canDo = (userId, action) => {
    const p = profiles[userId];
    if(!p) return false;
    if(p.roles?.includes("admin")) return true;
    return p.actions?.includes(action) || false;
  };

  const canSee = (userId, screen) => {
    const p = profiles[userId];
    if(!p) return false;
    if(p.roles?.includes("admin")) return true;
    return p.screens?.includes(screen) || false;
  };

  return {profiles, saveProfiles, canDo, canSee};
}

function useNotifications(currentUser, tickets, loading) {
  const [alertModal,  setAlertModal]  = useState(false);
  const [newTickets,  setNewTickets]  = useState([]);
  const [lastLoginAt, setLastLoginAt] = useState(0);
  const checkedRef = useRef(false);

  useEffect(()=>{
    if(loading||tickets.length===0||checkedRef.current) return;
    checkedRef.current = true;
    const key = `lastlogin-${currentUser.id}`;
    const check = async()=>{
      let last=0;
      try{ const r=await storage.getPrivate(key); if(r?.value) last=parseInt(r.value)||0; }catch(_){}
      setLastLoginAt(last);
      try{ await storage.setPrivate(key,String(Date.now())); }catch(_){}
      const fresh=tickets.filter(t=>t.assignee===currentUser.id&&t.status!=="Terminé"&&(t.assignedAt||t.createdAt||0)>(last>0?last:Date.now()-30000));
      if(fresh.length>0){setNewTickets(fresh);setAlertModal(true);}
    };
    check();
  },[loading,tickets,currentUser.id]);

  const isNewForMe = useCallback((t)=>t.assignee===currentUser.id&&t.status!=="Terminé"&&lastLoginAt>0&&(t.assignedAt||t.createdAt||0)>lastLoginAt,[currentUser.id,lastLoginAt]);

  return {alertModal,setAlertModal,newTickets,isNewForMe};
}

// ============================================================
// 5. COMPOSANTS UI DE BASE
// ============================================================

function Overlay({children,onClose,maxWidth=560}) {
  return (
    <div onClick={e=>{e.stopPropagation();onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",border:"1px solid #E8EAED",borderRadius:16,padding:28,width:"100%",maxWidth,boxShadow:"0 20px 60px rgba(0,0,0,.15)",maxHeight:"90vh",overflowY:"auto",animation:"popIn .2s ease"}}>
        {children}
      </div>
    </div>
  );
}

function Badge({children,color="#3B5BDB",bg="#EEF2FF"}) {
  return <span style={{background:bg,color,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:100,border:`1px solid ${color}22`}}>{children}</span>;
}

function Btn({children,onClick,variant="primary",size="md",disabled=false,style={}}) {
  const base={border:"none",borderRadius:8,fontWeight:600,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,...style};
  const sizes={sm:{padding:"5px 12px",fontSize:12},md:{padding:"8px 16px",fontSize:13},lg:{padding:"10px 20px",fontSize:14}};
  const variants={
    primary:{background:disabled?"#E8EAED":"#1a1a1a",color:disabled?"#AAA":"#fff"},
    secondary:{background:"#fff",color:"#1a1a1a",border:"1px solid #E8EAED"},
    blue:{background:disabled?"#E8EAED":"#3B5BDB",color:disabled?"#AAA":"#fff"},
    danger:{background:"#FFF5F5",color:"#E03131",border:"1px solid #FFE3E3"},
    ghost:{background:"transparent",color:"#666",padding:"6px 10px"},
  };
  return <button onClick={!disabled?onClick:undefined} className="pf-btn" style={{...base,...sizes[size],...variants[variant]}} disabled={disabled}>{children}</button>;
}

function Input({value,onChange,placeholder,type="text",style={}}) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="pf-input" style={{width:"100%",border:"1px solid #E8EAED",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#1a1a1a",outline:"none",background:"#fff",transition:"all .2s",...style}}/>;
}

function SectionTitle({children}) {
  return <div style={{fontSize:11,fontWeight:700,color:"#ADB5BD",letterSpacing:".8px",textTransform:"uppercase",padding:"12px 16px 4px"}}>{children}</div>;
}

// ============================================================
// 6. LOGIN
// ============================================================

function LoginPage({onLogin}) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const doLogin = async(acc)=>{
    if(acc){onLogin(acc);return;}
    setError("");setLoading(true);
    await new Promise(r=>setTimeout(r,500));
    const found=ACCOUNTS.find(a=>a.email.toLowerCase()===email.toLowerCase().trim()&&a.password===password);
    found?onLogin(found):setError("Email ou mot de passe incorrect.");
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#F4F6F8",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',-apple-system,sans-serif",padding:20}}>
      <style>{G}</style>
      <div style={{width:"100%",maxWidth:400,animation:"fadeIn .4s ease"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:16,background:"#1a1a1a",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:14,boxShadow:"0 8px 24px rgba(0,0,0,.15)"}}>🚀</div>
          <div style={{fontWeight:700,fontSize:22,color:"#1a1a1a",letterSpacing:"-.5px"}}>ProjectFlow</div>
          <div style={{fontSize:13,color:"#868E96",marginTop:4}}>Connectez-vous à votre espace</div>
        </div>

        {/* Card */}
        <div style={{background:"#fff",border:"1px solid #E8EAED",borderRadius:16,padding:28,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
          {/* Hint */}
          <div style={{background:"#F8F9FF",border:"1px solid #E0E7FF",borderRadius:10,padding:"10px 14px",marginBottom:22,fontSize:12,color:"#666"}}>
            💡 <strong style={{color:"#3B5BDB"}}>Démo :</strong> alice@projectflow.io / alice123
          </div>

          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:600,color:"#495057",display:"block",marginBottom:6}}>Adresse e-mail</label>
            <Input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="votre@email.com"/>
          </div>

          <div style={{marginBottom:8}}>
            <label style={{fontSize:12,fontWeight:600,color:"#495057",display:"block",marginBottom:6}}>Mot de passe</label>
            <div style={{position:"relative"}}>
              <Input type={showPass?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder="••••••••" style={{paddingRight:40}}/>
              <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#ADB5BD"}}>{showPass?"🙈":"👁️"}</button>
            </div>
          </div>

          {error&&<div style={{background:"#FFF5F5",border:"1px solid #FFE3E3",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#E03131"}}>⚠️ {error}</div>}

          <Btn onClick={()=>doLogin()} disabled={loading||!email||!password} variant="primary" size="lg" style={{width:"100%",justifyContent:"center",marginTop:16}}>
            {loading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Connexion…</>:"Se connecter →"}
          </Btn>

          {/* Quick login */}
          <div style={{marginTop:22,borderTop:"1px solid #F1F3F5",paddingTop:18}}>
            <div style={{fontSize:11,color:"#ADB5BD",textAlign:"center",marginBottom:12,fontWeight:600,letterSpacing:".5px"}}>CONNEXION RAPIDE</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {ACCOUNTS.map(a=>(
                <button key={a.id} onClick={()=>doLogin(a)} style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:10,padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all .15s",fontFamily:"inherit"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.background=a.color+"11";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#E8EAED";e.currentTarget.style.background="#F8F9FA";}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:a.color+"22",border:`1.5px solid ${a.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{a.avatar}</div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontWeight:600,fontSize:12,color:"#1a1a1a"}}>{a.name}</div>
                    <div style={{fontSize:9,color:"#ADB5BD"}}>{DEFAULT_USER_PROFILES[a.id]?.roles.map(r=>ROLES[r]?.label).join(", ")}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 7. GESTION DES DROITS UTILISATEURS
// ============================================================

function UserRightsPanel({profiles, onSave, currentUser}) {
  const [selectedUser, setSelectedUser] = useState(ACCOUNTS[0].id);
  const [draft,        setDraft]        = useState(null);
  const [saved,        setSaved]        = useState(false);

  useEffect(()=>{
    const p = profiles[selectedUser] || {roles:[],screens:[],actions:[]};
    setDraft({...p, roles:[...(p.roles||[])], screens:[...(p.screens||[])], actions:[...(p.actions||[])]});
  },[selectedUser,profiles]);

  const toggleRole = (roleId) => {
    setDraft(d=>{
      const has = d.roles.includes(roleId);
      const roles = has ? d.roles.filter(r=>r!==roleId) : [...d.roles, roleId];
      // Auto-apply default permissions when adding a role
      if(!has){
        const def = DEFAULT_PERMISSIONS[roleId];
        const screens = [...new Set([...d.screens,...def.screens])];
        const actions = [...new Set([...d.actions,...def.actions])];
        return {...d,roles,screens,actions};
      }
      return {...d,roles};
    });
  };

  const toggleScreen = (screenId) => {
    setDraft(d=>{
      const has = d.screens.includes(screenId);
      return {...d,screens: has?d.screens.filter(s=>s!==screenId):[...d.screens,screenId]};
    });
  };

  const toggleAction = (actionId) => {
    setDraft(d=>{
      const has = d.actions.includes(actionId);
      return {...d,actions: has?d.actions.filter(a=>a!==actionId):[...d.actions,actionId]};
    });
  };

  const handleSave = async() => {
    await onSave({...profiles,[selectedUser]:draft});
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const member = getMember(selectedUser);
  const isAdmin = draft?.roles?.includes("admin");

  return (
    <div style={{display:"flex",gap:0,height:"100%",animation:"fadeIn .3s ease"}}>

      {/* Liste des membres */}
      <div style={{width:220,borderRight:"1px solid #F1F3F5",flexShrink:0}}>
        <div style={{padding:"16px 16px 8px",borderBottom:"1px solid #F1F3F5"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>Membres</div>
          <div style={{fontSize:12,color:"#ADB5BD",marginTop:2}}>Cliquez pour modifier les droits</div>
        </div>
        {ACCOUNTS.map(acc=>{
          const p = profiles[acc.id]||{roles:[]};
          const isSelected = selectedUser === acc.id;
          return (
            <div key={acc.id} onClick={()=>setSelectedUser(acc.id)}
              style={{padding:"12px 16px",cursor:"pointer",background:isSelected?"#F0F4FF":"transparent",borderLeft:`3px solid ${isSelected?"#3B5BDB":"transparent"}`,transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:acc.color+"22",border:`1.5px solid ${acc.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{acc.avatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:"#1a1a1a"}}>{acc.name}</div>
                  <div style={{fontSize:10,color:"#ADB5BD",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {(p.roles||[]).map(r=>ROLES[r]?.label).join(", ")||"Aucun rôle"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Éditeur de droits */}
      {draft && (
        <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
          {/* En-tête membre sélectionné */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,paddingBottom:16,borderBottom:"1px solid #F1F3F5"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:member.color+"22",border:`2px solid ${member.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{member.avatar}</div>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:"#1a1a1a"}}>{member.name}</div>
                <div style={{fontSize:12,color:"#ADB5BD"}}>{member.email}</div>
              </div>
            </div>
            <Btn onClick={handleSave} variant="blue" size="sm">
              {saved?"✅ Sauvegardé !":"💾 Sauvegarder"}
            </Btn>
          </div>

          {/* ── Section Rôles */}
          <div style={{marginBottom:24}}>
            <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a",marginBottom:4}}>Rôles attribués</div>
            <div style={{fontSize:12,color:"#ADB5BD",marginBottom:14}}>Plusieurs rôles peuvent être combinés sur un même profil</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.values(ROLES).map(role=>{
                const active = draft.roles.includes(role.id);
                return (
                  <div key={role.id} onClick={()=>toggleRole(role.id)}
                    style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",border:`1.5px solid ${active?role.color+"66":"#E8EAED"}`,borderRadius:10,cursor:"pointer",background:active?role.color+"08":"#fff",transition:"all .15s"}}>
                    <input type="checkbox" checked={active} onChange={()=>{}} className="pf-checkbox"/>
                    <div style={{width:32,height:32,borderRadius:8,background:active?role.color+"22":"#F8F9FA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{role.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13,color:active?role.color:"#1a1a1a"}}>{role.label}</div>
                      <div style={{fontSize:11,color:"#ADB5BD",marginTop:1}}>{role.desc}</div>
                    </div>
                    {active&&<Badge color={role.color} bg={role.color+"15"}>Actif</Badge>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section Écrans */}
          <div style={{marginBottom:24}}>
            <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a",marginBottom:4}}>Accès aux écrans</div>
            <div style={{fontSize:12,color:"#ADB5BD",marginBottom:14}}>
              {isAdmin?"L'Admin a accès à tous les écrans automatiquement":"Choisissez les écrans visibles pour ce profil"}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {Object.values(SCREENS).map(screen=>{
                const active = isAdmin || draft.screens.includes(screen.id);
                return (
                  <div key={screen.id} onClick={()=>!isAdmin&&toggleScreen(screen.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:`1px solid ${active?"#3B5BDB44":"#E8EAED"}`,borderRadius:8,cursor:isAdmin?"default":"pointer",background:active?"#F0F4FF":"#fff",opacity:isAdmin&&screen.id!=="admin"?0.7:1,transition:"all .15s"}}>
                    <input type="checkbox" checked={active} onChange={()=>{}} className="pf-checkbox" disabled={isAdmin}/>
                    <span style={{fontSize:15}}>{screen.icon}</span>
                    <span style={{fontSize:12,fontWeight:500,color:active?"#3B5BDB":"#495057"}}>{screen.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section Actions */}
          <div style={{marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a",marginBottom:4}}>Permissions d'actions</div>
            <div style={{fontSize:12,color:"#ADB5BD",marginBottom:14}}>
              {isAdmin?"L'Admin peut effectuer toutes les actions":"Définissez ce que ce profil peut faire"}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.values(ACTIONS).map(action=>{
                const active = isAdmin || draft.actions.includes(action.id);
                return (
                  <div key={action.id} onClick={()=>!isAdmin&&toggleAction(action.id)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",border:`1px solid ${active?"#2F9E4444":"#E8EAED"}`,borderRadius:8,cursor:isAdmin?"default":"pointer",background:active?"#F3FBF4":"#fff",transition:"all .15s"}}>
                    <input type="checkbox" checked={active} onChange={()=>{}} className="pf-checkbox" disabled={isAdmin}/>
                    <span style={{fontSize:14}}>{action.icon}</span>
                    <span style={{fontSize:12,fontWeight:500,color:active?"#2F9E44":"#495057"}}>{action.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 8. TICKET MODAL
// ============================================================

function TicketModal({ticket,currentUser,onSave,onDelete,onClose,onOpenWorkflow,onOpenShare,canDo}) {
  const isCreate = !ticket.id;
  const [form,     setForm]     = useState({...ticket,tags:[...(ticket.tags||[])],attachments:[...(ticket.attachments||[])],history:[...(ticket.history||[])]});
  const [tab,      setTab]      = useState("details");
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef(null);

  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const addTag    = () => { const t=tagInput.trim(); if(t&&!form.tags.includes(t)) upd("tags",[...form.tags,t]); setTagInput(""); };
  const removeTag = t  => upd("tags",form.tags.filter(x=>x!==t));

  const handleFiles = files => Array.from(files).forEach(f=>{
    if(f.size>5*1024*1024) return;
    const r=new FileReader();
    r.onload=ev=>setForm(fm=>({...fm,attachments:[...fm.attachments,{id:Date.now()+Math.random(),name:f.name,size:f.size,type:f.type,dataUrl:ev.target.result,addedAt:Date.now()}]}));
    r.readAsDataURL(f);
  });

  const TABS = [{id:"details",label:"Détails"},{id:"attachments",label:`Pièces jointes${form.attachments?.length?` (${form.attachments.length})`:""}`},{id:"history",label:"Historique"}];

  const labelStyle = {fontSize:12,fontWeight:600,color:"#495057",display:"block",marginBottom:6};
  const selectStyle = {width:"100%",border:"1px solid #E8EAED",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#1a1a1a",outline:"none",background:"#fff"};

  return (
    <Overlay onClose={onClose}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:16,color:"#1a1a1a"}}>{isCreate?"Nouveau ticket":"Modifier le ticket"}{!isCreate&&<span style={{fontSize:12,color:"#ADB5BD",fontWeight:400,marginLeft:8}}>#{ticket.id}</span>}</div>
        <button onClick={onClose} style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#666",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid #F1F3F5"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?"#3B5BDB":"transparent"}`,color:tab===t.id?"#3B5BDB":"#868E96",fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",transition:"all .15s",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Détails */}
      {tab==="details"&&(<>
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Titre *</label>
          <Input value={form.title} onChange={e=>upd("title",e.target.value)} placeholder="Ex : Corriger le bug de login"/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description||""} onChange={e=>upd("description",e.target.value)} placeholder="Décrivez le ticket…" rows={3} className="pf-input" style={{...{width:"100%",border:"1px solid #E8EAED",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#1a1a1a",outline:"none",background:"#fff"},resize:"vertical",fontFamily:"inherit"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={labelStyle}>Statut</label>
            <select value={form.status||"À faire"} onChange={e=>upd("status",e.target.value)} style={selectStyle}>
              {COLUMNS.map(c=><option key={c} value={c}>{COL_CFG[c].icon} {c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priorité</label>
            <select value={form.priority||"Moyenne"} onChange={e=>upd("priority",e.target.value)} style={selectStyle}>
              {PRIORITIES.map(p=><option key={p.label} value={p.label}>{p.icon} {p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Assigné à</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>{upd("assignee",null);upd("assignedAt",null);}} style={{background:!form.assignee?"#1a1a1a":"#F8F9FA",color:!form.assignee?"#fff":"#495057",border:"1px solid #E8EAED",borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:500}}>Non assigné</button>
            {ACCOUNTS.map(m=>(
              <button key={m.id} onClick={()=>{upd("assignee",m.id);upd("assignedAt",Date.now());}} style={{background:form.assignee===m.id?m.color+"22":"#F8F9FA",border:`1.5px solid ${form.assignee===m.id?m.color:"#E8EAED"}`,borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontWeight:500,color:form.assignee===m.id?m.color:"#495057"}}>
                <span>{m.avatar}</span>{m.name}{m.id===currentUser.id?" (moi)":""}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Tags</label>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
            {form.tags.map(tag=><span key={tag} className="tag-chip">{tag}<button onClick={()=>removeTag(tag)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#ADB5BD",padding:0,lineHeight:1}}>×</button></span>)}
          </div>
          <div style={{display:"flex",gap:6}}>
            <Input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="Ajouter un tag…" style={{fontSize:12}}/>
            <Btn onClick={addTag} variant="secondary" size="sm">+ Tag</Btn>
          </div>
        </div>
      </>)}

      {/* Pièces jointes */}
      {tab==="attachments"&&(
        <div>
          <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
          <div onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
            style={{border:"2px dashed #E8EAED",borderRadius:12,padding:"24px",textAlign:"center",cursor:"pointer",background:"#FAFAFA",marginBottom:14,transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#3B5BDB"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#E8EAED"}>
            <div style={{fontSize:24,marginBottom:6}}>📎</div>
            <div style={{fontWeight:600,fontSize:13,color:"#495057",marginBottom:2}}>Glissez vos fichiers ici</div>
            <div style={{fontSize:11,color:"#ADB5BD"}}>ou cliquez pour parcourir · Max 5 Mo</div>
          </div>
          {form.attachments.length===0
            ?<div style={{textAlign:"center",color:"#ADB5BD",fontSize:13,padding:"12px 0"}}>Aucune pièce jointe</div>
            :form.attachments.map(att=>(
              <div key={att.id} style={{display:"flex",alignItems:"center",gap:10,border:"1px solid #E8EAED",borderRadius:10,padding:"9px 12px",marginBottom:8,background:"#FAFAFA"}}>
                {att.type?.startsWith("image/")&&att.dataUrl?<img src={att.dataUrl} alt={att.name} style={{width:32,height:32,borderRadius:6,objectFit:"cover"}}/>:<div style={{width:32,height:32,borderRadius:6,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{getFileIcon(att.type)}</div>}
                <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</div><div style={{fontSize:10,color:"#ADB5BD"}}>{formatSize(att.size)}</div></div>
                <Btn onClick={()=>{const a=document.createElement("a");a.href=att.dataUrl;a.download=att.name;a.click();}} variant="ghost" size="sm">⬇️</Btn>
                <Btn onClick={()=>upd("attachments",form.attachments.filter(a=>a.id!==att.id))} variant="danger" size="sm">×</Btn>
              </div>
            ))
          }
        </div>
      )}

      {/* Historique */}
      {tab==="history"&&(
        <div>
          {form.history.length===0
            ?<div style={{textAlign:"center",color:"#ADB5BD",fontSize:13,padding:"28px 0"}}>Aucun historique</div>
            :[...form.history].reverse().map((h,i)=>{
              const m=getMember(h.member);
              return(
                <div key={i} style={{display:"flex",gap:12,paddingBottom:14,position:"relative"}}>
                  {i<form.history.length-1&&<div style={{position:"absolute",left:14,top:28,width:1,height:"calc(100% - 10px)",background:"#F1F3F5"}}/>}
                  <div style={{width:28,height:28,borderRadius:"50%",background:m?m.color+"22":"#F8F9FA",border:`1.5px solid ${m?m.color:"#E8EAED"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{m?m.avatar:"?"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{h.action}</div>
                    {h.note&&<div style={{fontSize:11,color:"#868E96",marginTop:2,fontStyle:"italic"}}>💬 "{h.note}"</div>}
                    <div style={{fontSize:10,color:"#ADB5BD",marginTop:2}}>{m?.name||"Système"} · {new Date(h.date).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Footer */}
      <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:20,paddingTop:16,borderTop:"1px solid #F1F3F5"}}>
        {!isCreate&&canDo("delete_ticket")&&<Btn onClick={()=>onDelete(form.id)} variant="danger" size="sm">🗑 Supprimer</Btn>}
        <div style={{display:"flex",gap:7,marginLeft:"auto"}}>
          {!isCreate&&<><Btn onClick={()=>{onClose();onOpenWorkflow(form);}} variant="secondary" size="sm">🔄 Workflow</Btn><Btn onClick={()=>{onClose();onOpenShare(form);}} variant="secondary" size="sm">🔗 Partager</Btn></>}
          <Btn onClick={onClose} variant="secondary" size="sm">Annuler</Btn>
          <Btn onClick={()=>form.title.trim()&&onSave(form)} disabled={!form.title.trim()} variant="blue" size="sm">{isCreate?"Créer le ticket":"Sauvegarder"}</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ============================================================
// 9. WORKFLOW MODAL
// ============================================================

function WorkflowModal({ticket,currentUser,onApply,onClose}) {
  const [action, setAction] = useState(null);
  const [target, setTarget] = useState(ticket.assignee);
  const [note,   setNote]   = useState("");

  const handleApply = ()=>{ if(!action) return; onApply({ticket,action,targetMemberId:target,note}); };

  return (
    <Overlay onClose={onClose} maxWidth={460}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Workflow</div>
      <div style={{fontSize:12,color:"#ADB5BD",marginBottom:18}}>#{ticket.id} · {ticket.title}</div>

      <div style={{display:"flex",gap:10,marginBottom:18,background:"#F8F9FA",borderRadius:10,padding:"12px 14px"}}>
        <div style={{flex:1}}><div style={{fontSize:10,color:"#ADB5BD",marginBottom:2,fontWeight:600,letterSpacing:".5px"}}>STATUT</div><div style={{fontSize:13,fontWeight:600}}>{COL_CFG[ticket.status]?.icon} {ticket.status}</div></div>
        <div style={{flex:1}}><div style={{fontSize:10,color:"#ADB5BD",marginBottom:2,fontWeight:600,letterSpacing:".5px"}}>ASSIGNÉ</div>{getMember(ticket.assignee)?<div style={{fontSize:13,fontWeight:600}}>{getMember(ticket.assignee).avatar} {getMember(ticket.assignee).name}</div>:<div style={{fontSize:13,color:"#ADB5BD"}}>Non assigné</div>}</div>
      </div>

      <div style={{marginBottom:16}}>
        <label style={{fontSize:12,fontWeight:600,color:"#495057",display:"block",marginBottom:8}}>1 — Action</label>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {WF_ACTIONS.map(a=>(
            <div key={a.type} onClick={()=>setAction(a)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",border:`1.5px solid ${action?.type===a.type?a.color:"#E8EAED"}`,borderRadius:10,cursor:"pointer",background:action?.type===a.type?a.color+"08":"#fff",transition:"all .15s"}}>
              <span style={{fontSize:18}}>{a.icon}</span>
              <div>
                <div style={{fontWeight:600,fontSize:13,color:action?.type===a.type?a.color:"#1a1a1a"}}>{a.label}</div>
                {a.targetStatus&&<div style={{fontSize:11,color:"#ADB5BD",marginTop:1}}>→ {a.targetStatus}</div>}
              </div>
              {action?.type===a.type&&<div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:a.color}}/>}
            </div>
          ))}
        </div>
      </div>

      {action&&<>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#495057",display:"block",marginBottom:8}}>2 — Assigner à</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ACCOUNTS.map(m=>(
              <button key={m.id} onClick={()=>setTarget(m.id)} style={{background:target===m.id?m.color+"22":"#F8F9FA",border:`1.5px solid ${target===m.id?m.color:"#E8EAED"}`,borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontWeight:500,color:target===m.id?m.color:"#495057"}}>
                <span>{m.avatar}</span>{m.name}{m.id===currentUser.id?" (moi)":""}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:600,color:"#495057",display:"block",marginBottom:6}}>3 — Message (optionnel)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : Merci de revoir les tests…" rows={2} style={{width:"100%",border:"1px solid #E8EAED",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",background:"#fff"}}/>
        </div>
        <div style={{background:"#F8F9FF",border:"1px solid #E0E7FF",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#495057"}}>
          <strong style={{color:"#3B5BDB"}}>Aperçu :</strong> {action.icon} {action.label}{target?` → ${getMember(target)?.avatar} ${getMember(target)?.name}`:""}
          {action.targetStatus?` · → ${action.targetStatus}`:""}
          {note?` · 💬 "${note}"`:""}
        </div>
      </>}

      <div style={{display:"flex",gap:8}}>
        <Btn onClick={onClose} variant="secondary" style={{flex:1,justifyContent:"center"}}>Annuler</Btn>
        <Btn onClick={handleApply} onTouchEnd={e=>{e.stopPropagation();handleApply();}} disabled={!action} variant="blue" style={{flex:2,justifyContent:"center"}}>
          {action?`${action.icon} Appliquer`:"Choisir une action"}
        </Btn>
      </div>
    </Overlay>
  );
}

// ============================================================
// 10. SHARE MODAL
// ============================================================

function ShareModal({ticket,onClose}) {
  const member = getMember(ticket.assignee);
  const copy   = ()=>{ navigator.clipboard.writeText(`Ticket #${ticket.id} — ${ticket.title}\nStatut : ${ticket.status} | Priorité : ${ticket.priority}\n${ticket.description||""}`); onClose(); };
  const email  = ()=>{ window.open(`mailto:${member?.email||""}?subject=${encodeURIComponent(`[ProjectFlow] Ticket #${ticket.id} : ${ticket.title}`)}&body=${encodeURIComponent(`Bonjour${member?" "+member.name:""},\n\nTicket à traiter :\n📌 ${ticket.title}\n📋 ${ticket.status}\n⚡ ${ticket.priority}\n${ticket.description||""}\n\nCordialement`)}`); };

  return (
    <Overlay onClose={onClose} maxWidth={400}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Partager le ticket</div>
      <div style={{fontSize:12,color:"#ADB5BD",marginBottom:18}}>#{ticket.id} · {ticket.title}</div>
      <div style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:10,padding:"14px",marginBottom:14}}>
        {[["📌",ticket.title],["📋",ticket.status],["⚡",`${getPriority(ticket.priority).icon} ${ticket.priority}`],["👤",member?.name||"Non assigné"],ticket.tags?.length?["🏷️",ticket.tags.join(", ")]:null].filter(Boolean).map(([k,v])=>(
          <div key={k} style={{display:"flex",gap:10,marginBottom:6}}><span style={{fontSize:12,color:"#ADB5BD",minWidth:20}}>{k}</span><span style={{fontSize:12,fontWeight:500}}>{v}</span></div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Btn onClick={copy} variant="primary" style={{justifyContent:"center"}}>📋 Copier le résumé</Btn>
        <Btn onClick={email} variant="secondary" style={{justifyContent:"center"}}>✉️ Envoyer par e-mail</Btn>
      </div>
      <Btn onClick={onClose} variant="ghost" style={{width:"100%",justifyContent:"center",marginTop:10,color:"#ADB5BD"}}>Fermer</Btn>
    </Overlay>
  );
}

// ============================================================
// 11. ALERT MODAL (nouveaux tickets à la connexion)
// ============================================================

function AlertModal({currentUser,tickets,onViewTicket,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}>
      <div style={{background:"#fff",border:"1px solid #E8EAED",borderRadius:16,padding:28,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,.15)",animation:"popIn .25s ease"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>🔔</div>
          <div style={{fontWeight:700,fontSize:18,color:"#1a1a1a",marginBottom:4}}>Bonjour {currentUser.avatar} {currentUser.name} !</div>
          <div style={{fontSize:13,color:"#868E96"}}>{tickets.length === 1?"Un nouveau ticket vous a été assigné":"${tickets.length} nouveaux tickets vous ont été assignés"} depuis votre dernière connexion</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,maxHeight:260,overflowY:"auto"}}>
          {tickets.map(t=>{
            const prio=getPriority(t.priority);
            const from=getMember(t.history?.slice().reverse().find(h=>h.action.includes("créé")||h.action.includes("Transféré"))?.member);
            return(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,border:"1px solid #E8EAED",borderRadius:10,padding:"12px 14px",background:"#FAFAFA"}}>
                <div style={{width:4,minHeight:40,background:prio.color,borderRadius:2,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{t.title}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Badge color={prio.color} bg={prio.bg}>{prio.icon} {prio.label}</Badge>
                    {from&&<span style={{fontSize:11,color:"#ADB5BD"}}>de {from.avatar} {from.name}</span>}
                  </div>
                </div>
                <Btn onClick={()=>onViewTicket(t)} variant="secondary" size="sm">Voir →</Btn>
              </div>
            );
          })}
        </div>
        <Btn onClick={onClose} variant="primary" style={{width:"100%",justifyContent:"center"}}>Accéder au tableau →</Btn>
      </div>
    </div>
  );
}

// ============================================================
// 12. KANBAN CARD
// ============================================================

function TicketCard({ticket,currentUser,isDragging,isNew,onEdit,onWorkflow,onShare,onTransfer,onDragStart,onDragEnd,canDo}) {
  const prio   = getPriority(ticket.priority);
  const member = getMember(ticket.assignee);
  const ismine = ticket.assignee === currentUser.id;

  return (
    <div draggable onDragStart={e=>onDragStart(e,ticket)} onDragEnd={onDragEnd}
      className="pf-card-hover"
      style={{background:"#fff",border:`1px solid ${isNew?"#FFE3E3":isDragging?"#3B5BDB":"#E8EAED"}`,borderRadius:10,padding:"12px 14px",cursor:"grab",opacity:isDragging?.5:1,transform:isDragging?"rotate(1.5deg)":"none",transition:"all .15s",position:"relative",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>

      {/* Barre priorité */}
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:prio.color,borderRadius:"10px 0 0 10px"}}/>

      {/* Badge NEW */}
      {isNew&&<div style={{position:"absolute",top:8,right:8,background:"#E03131",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,letterSpacing:".3px"}}>NEW</div>}

      <div style={{paddingLeft:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
          <div style={{fontWeight:600,fontSize:13,color:"#1a1a1a",lineHeight:1.3,flex:1,paddingRight:isNew?32:0}}>{ticket.title}</div>
          <div style={{fontSize:10,color:"#CED4DA",marginLeft:6,fontFamily:"monospace"}}>#{ticket.id}</div>
        </div>

        {ticket.description&&<div style={{fontSize:11,color:"#868E96",marginBottom:8,lineHeight:1.5}}>{ticket.description.length>60?ticket.description.slice(0,60)+"…":ticket.description}</div>}

        {ticket.attachments?.length>0&&<div style={{fontSize:10,color:"#3B5BDB",marginBottom:6}}>📎 {ticket.attachments.length} fichier{ticket.attachments.length>1?"s":""}</div>}

        {ticket.tags?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{ticket.tags.map(t=><span key={t} className="tag-chip">{t}</span>)}</div>}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Badge color={prio.color} bg={prio.bg}>{prio.icon} {prio.label}</Badge>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <button onClick={e=>{e.stopPropagation();onWorkflow(ticket);}} style={{background:"#F8F9FF",border:"1px solid #E0E7FF",borderRadius:6,padding:"3px 7px",fontSize:10,color:"#3B5BDB",cursor:"pointer"}}>🔄</button>
            <button onClick={e=>{e.stopPropagation();onShare(ticket);}} style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:6,padding:"3px 7px",fontSize:10,cursor:"pointer"}}>🔗</button>
            <button onClick={e=>{e.stopPropagation();onEdit(ticket);}} style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:6,padding:"3px 7px",fontSize:10,cursor:"pointer"}}>✏️</button>
            {member
              ?<div title={member.name} style={{width:22,height:22,borderRadius:"50%",background:member.color+"22",border:`1.5px solid ${member.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{member.avatar}</div>
              :<div style={{width:22,height:22,borderRadius:"50%",background:"#F8F9FA",border:"1px solid #E8EAED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#CED4DA"}}>—</div>
            }
          </div>
        </div>

        {/* Transfert rapide */}
        {ismine&&ticket.status!=="Terminé"&&(
          <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #F1F3F5"}}>
            <div style={{fontSize:9,color:"#ADB5BD",marginBottom:5,fontWeight:700,letterSpacing:".5px"}}>TRANSFÉRER À</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {ACCOUNTS.filter(m=>m.id!==currentUser.id).map(m=>(
                <button key={m.id} onClick={e=>{e.stopPropagation();onTransfer(ticket,m.id);}}
                  style={{background:m.color+"15",border:`1px solid ${m.color}44`,borderRadius:20,padding:"3px 9px",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:m.color,fontWeight:500,transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=m.color+"30"}
                  onMouseLeave={e=>e.currentTarget.style.background=m.color+"15"}>
                  {m.avatar} {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 13. BOARD (composant principal)
// ============================================================

function Board({currentUser,onLogout}) {
  const {tickets,nextId,loading,syncing,lastSync,persist} = useTicketStorage();
  const {profiles,saveProfiles,canDo,canSee}              = useProfiles();
  const {alertModal,setAlertModal,newTickets,isNewForMe}  = useNotifications(currentUser,tickets,loading);

  const [activePage,  setActivePage]  = useState("kanban");
  const [modal,       setModal]       = useState(null);
  const [draggingId,  setDraggingId]  = useState(null);
  const [dragOver,    setDragOver]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [filtPrio,    setFiltPrio]    = useState(null);
  const [filtMember,  setFiltMember]  = useState(null);

  const dragRef = useRef(null);

  const filtered  = tickets.filter(t=>{
    const ms=t.title.toLowerCase().includes(search.toLowerCase())||t.description?.toLowerCase().includes(search.toLowerCase());
    return ms&&(!filtPrio||t.priority===filtPrio)&&(!filtMember||t.assignee===filtMember);
  });
  const myTickets = tickets.filter(t=>t.assignee===currentUser.id&&t.status!=="Terminé");
  const newCount  = myTickets.filter(t=>isNewForMe(t)).length;

  // Modals
  const openCreate    = () => setModal({type:"ticket",data:{title:"",description:"",status:"À faire",priority:"Moyenne",assignee:currentUser.id,tags:[],attachments:[],history:[],createdAt:Date.now(),assignedAt:Date.now()}});
  const openEdit      = t  => setModal({type:"ticket",data:t});
  const openWorkflow  = t  => setModal({type:"workflow",data:t});
  const openShare     = t  => setModal({type:"share",data:t});
  const closeModal    = ()  => setModal(null);

  const handleSave = async form => {
    const isCreate=!form.id;
    let list,nid;
    if(isCreate){list=[...tickets,{...form,id:nextId,history:[{date:Date.now(),member:currentUser.id,action:"Ticket créé"}]}];nid=nextId+1;}
    else{list=tickets.map(t=>t.id===form.id?{...form}:t);nid=nextId;}
    closeModal();await persist(list,nid);
  };

  const handleDelete = async id => { closeModal();await persist(tickets.filter(t=>t.id!==id),nextId); };

  const handleQuickTransfer = async(ticket,targetId) => {
    const target=getMember(targetId);
    const hist={date:Date.now(),member:currentUser.id,action:`Transféré à ${target?.avatar} ${target?.name}`};
    await persist(tickets.map(t=>t.id!==ticket.id?t:{...t,assignee:targetId,assignedAt:Date.now(),history:[...(t.history||[]),hist]}),nextId);
  };

  const handleApplyWorkflow = async({ticket,action,targetMemberId,note}) => {
    const target=getMember(targetMemberId);
    const label=action.label+(target?` → ${target.avatar} ${target.name}`:"");
    const hist={date:Date.now(),member:currentUser.id,action:label,note:note||null};
    closeModal();
    await persist(tickets.map(t=>t.id!==ticket.id?t:{...t,assignee:targetMemberId,assignedAt:Date.now(),status:action.targetStatus||t.status,history:[...(t.history||[]),hist]}),nextId);
  };

  const onDragStart = (e,t) => { dragRef.current=t;setDraggingId(t.id); };
  const onDragEnd   = ()    => { dragRef.current=null;setDraggingId(null);setDragOver(null); };
  const onDrop = async col  => {
    if(dragRef.current&&dragRef.current.status!==col){
      const hist={date:Date.now(),member:currentUser.id,action:`Déplacé vers « ${col} »`};
      await persist(tickets.map(t=>t.id!==dragRef.current.id?t:{...t,status:col,history:[...(t.history||[]),hist]}),nextId);
    }
    setDragOver(null);
  };

  const handleReset = async()=>{ if(!confirm("Réinitialiser ?")) return; await persist(DEFAULT_TICKETS,6); };

  // Navigation Sidebar
  const NAV_ITEMS = [
    {id:"kanban",    icon:"📋", label:"Tableau",       screen:"kanban"},
    {id:"mytickets", icon:"🎫", label:"Mes tickets",   screen:"mytickets", badge:myTickets.length||null, badgeNew:newCount>0},
    {id:"reports",   icon:"📊", label:"Rapports",      screen:"reports"},
    {id:"chat",      icon:"💬", label:"Chat",          screen:"chat"},
  ];

  const SETTINGS_ITEMS = [
    {id:"settings",   icon:"⚙️",  label:"Paramètres",        screen:"settings"},
    {id:"rights",     icon:"🔐", label:"Droits utilisateurs",screen:"admin"},
    {id:"adminpanel", icon:"👤", label:"Admin",              screen:"admin"},
  ];

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#F4F6F8",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,fontFamily:"'Inter',sans-serif"}}>
      <style>{G}</style>
      <div style={{fontSize:40,animation:"spin 1s linear infinite"}}>🚀</div>
      <div style={{fontWeight:600,fontSize:16,color:"#1a1a1a"}}>Chargement…</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F4F6F8",display:"flex",fontFamily:"'Inter',-apple-system,sans-serif",color:"#1a1a1a"}}>
      <style>{G}</style>

      {/* ── Alert modal */}
      {alertModal&&newTickets.length>0&&<AlertModal currentUser={currentUser} tickets={newTickets} onViewTicket={t=>{setAlertModal(false);openEdit(t);}} onClose={()=>setAlertModal(false)}/>}

      {/* ══ SIDEBAR ══ */}
      <div style={{width:220,background:"#fff",borderRight:"1px solid #F1F3F5",display:"flex",flexDirection:"column",position:"fixed",top:0,bottom:0,left:0,zIndex:50}}>

        {/* Logo */}
        <div style={{padding:"20px 16px 16px",borderBottom:"1px solid #F1F3F5"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🚀</div>
            <div style={{fontWeight:700,fontSize:15,color:"#1a1a1a",letterSpacing:"-.3px"}}>ProjectFlow</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:8,paddingLeft:2}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:syncing?"#E67E22":"#2F9E44",animation:syncing?"pulse 1s infinite":"none"}}/>
            <span style={{fontSize:10,color:"#ADB5BD"}}>{syncing?"Synchro…":lastSync?lastSync.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"En direct"}</span>
          </div>
        </div>

        {/* Navigation principale */}
        <div style={{padding:"8px 8px",flex:1,overflowY:"auto"}}>
          <SectionTitle>Navigation</SectionTitle>
          {NAV_ITEMS.map(item=>{
            if(!canSee(currentUser.id,item.screen)) return null;
            const active=activePage===item.id;
            return(
              <div key={item.id} onClick={()=>setActivePage(item.id)} className="pf-sidebar-item"
                style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:active?"#F0F4FF":"transparent",color:active?"#3B5BDB":"#495057",fontWeight:active?600:400,fontSize:13,transition:"all .15s",marginBottom:2}}>
                <span style={{fontSize:16,width:20,textAlign:"center"}}>{item.icon}</span>
                <span style={{flex:1}}>{item.label}</span>
                {item.badge&&<span style={{background:item.badgeNew?"#E03131":"#E8EAED",color:item.badgeNew?"#fff":"#666",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:100,animation:item.badgeNew?"badgePop 2s infinite":""}}>{item.badge}</span>}
              </div>
            );
          })}

          <SectionTitle>Configuration</SectionTitle>
          {SETTINGS_ITEMS.map(item=>{
            if(!canSee(currentUser.id,item.screen)) return null;
            const active=activePage===item.id;
            return(
              <div key={item.id} onClick={()=>setActivePage(item.id)} className="pf-sidebar-item"
                style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:active?"#F0F4FF":"transparent",color:active?"#3B5BDB":"#495057",fontWeight:active?600:400,fontSize:13,transition:"all .15s",marginBottom:2}}>
                <span style={{fontSize:16,width:20,textAlign:"center"}}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* User card */}
        <div style={{padding:"12px 12px",borderTop:"1px solid #F1F3F5"}}>
          <div style={{background:"#F8F9FA",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:currentUser.color+"22",border:`1.5px solid ${currentUser.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{currentUser.avatar}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:12,color:"#1a1a1a"}}>{currentUser.name}</div>
              <div style={{fontSize:10,color:"#ADB5BD",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {(profiles[currentUser.id]?.roles||[]).map(r=>ROLES[r]?.label).join(", ")||"Aucun rôle"}
              </div>
            </div>
            <button onClick={onLogout} title="Déconnexion" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#ADB5BD",padding:4}} onMouseEnter={e=>e.currentTarget.style.color="#E03131"} onMouseLeave={e=>e.currentTarget.style.color="#ADB5BD"}>🚪</button>
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{marginLeft:220,flex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>

        {/* Topbar */}
        <div style={{background:"#fff",borderBottom:"1px solid #F1F3F5",padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,position:"sticky",top:0,zIndex:40}}>
          <div style={{fontWeight:700,fontSize:16,color:"#1a1a1a"}}>
            {activePage==="kanban"&&"Tableau Kanban"}
            {activePage==="mytickets"&&"Mes tickets"}
            {activePage==="reports"&&"Rapports & KPI"}
            {activePage==="chat"&&"Chat"}
            {activePage==="settings"&&"Paramètres"}
            {activePage==="rights"&&"Droits utilisateurs"}
            {activePage==="adminpanel"&&"Administration"}
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {(activePage==="kanban"||activePage==="mytickets")&&(<>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#ADB5BD"}}>🔎</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:8,padding:"7px 12px 7px 30px",fontSize:12,color:"#1a1a1a",outline:"none",width:180}}/>
              </div>
              <select value={filtPrio||""} onChange={e=>setFiltPrio(e.target.value||null)} style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:8,padding:"7px 10px",fontSize:12,color:"#666",outline:"none",cursor:"pointer"}}>
                <option value="">Toutes priorités</option>
                {PRIORITIES.map(p=><option key={p.label} value={p.label}>{p.icon} {p.label}</option>)}
              </select>
              <select value={filtMember||""} onChange={e=>setFiltMember(e.target.value?parseInt(e.target.value):null)} style={{background:"#F8F9FA",border:"1px solid #E8EAED",borderRadius:8,padding:"7px 10px",fontSize:12,color:"#666",outline:"none",cursor:"pointer"}}>
                <option value="">Tous les membres</option>
                {ACCOUNTS.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
              </select>
            </>)}
            {canDo(currentUser.id,"create_ticket")&&(activePage==="kanban"||activePage==="mytickets")&&(
              <Btn onClick={openCreate} variant="primary" size="sm">＋ Nouveau ticket</Btn>
            )}
          </div>
        </div>

        {/* ── Bannière mes tickets */}
        {myTickets.length>0&&(activePage==="kanban"||activePage==="mytickets")&&(
          <div style={{background:`linear-gradient(90deg,${currentUser.color}10,transparent)`,borderBottom:`1px solid ${currentUser.color}22`,padding:"8px 28px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span>{currentUser.avatar}</span>
            <span style={{fontSize:12,color:"#495057"}}><strong style={{color:currentUser.color}}>À vous de jouer !</strong> — {myTickets.length} ticket{myTickets.length>1?"s":""} en attente</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {myTickets.slice(0,3).map(t=>(
                <button key={t.id} onClick={()=>openEdit(t)} style={{background:isNewForMe(t)?"#FFF5F5":currentUser.color+"15",border:`1px solid ${isNewForMe(t)?"#FFE3E3":currentUser.color+"44"}`,borderRadius:6,padding:"2px 10px",fontSize:11,cursor:"pointer",fontWeight:600,color:isNewForMe(t)?"#E03131":currentUser.color,display:"flex",alignItems:"center",gap:4}}>
                  {isNewForMe(t)&&<span style={{fontSize:8,background:"#E03131",color:"#fff",padding:"0 4px",borderRadius:3}}>NEW</span>}
                  #{t.id} {t.title.slice(0,16)}{t.title.length>16?"…":""}
                </button>
              ))}
            </div>
            <button onClick={()=>setAlertModal(true)} style={{marginLeft:"auto",background:"none",border:"1px solid #E8EAED",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",color:"#868E96"}}>🔔 Alertes</button>
          </div>
        )}

        {/* ══ PAGES ══ */}
        <div style={{flex:1,padding:"20px 28px",overflowY:"auto"}}>

          {/* ── Kanban */}
          {activePage==="kanban"&&(
            <div>
              {/* Stats */}
              <div style={{display:"flex",gap:12,marginBottom:20}}>
                {COLUMNS.map(col=>{
                  const cfg=COL_CFG[col];
                  const cnt=filtered.filter(t=>t.status===col).length;
                  return(
                    <div key={col} style={{flex:1,background:"#fff",border:"1px solid #E8EAED",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:"#ADB5BD",fontWeight:600,letterSpacing:".3px"}}>{col.toUpperCase()}</div>
                        <div style={{fontSize:20,fontWeight:700,color:"#1a1a1a",marginTop:1}}>{cnt}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{background:"#fff",border:"1px solid #E8EAED",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#ADB5BD",flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:11,color:"#ADB5BD",fontWeight:600,letterSpacing:".3px"}}>TOTAL</div>
                    <div style={{fontSize:20,fontWeight:700,color:"#1a1a1a",marginTop:1}}>{filtered.length}</div>
                  </div>
                </div>
              </div>

              {/* Colonnes */}
              <div style={{display:"flex",gap:14,overflowX:"auto",alignItems:"flex-start",paddingBottom:16}}>
                {COLUMNS.map(col=>{
                  const cfg=COL_CFG[col];
                  const colT=filtered.filter(t=>t.status===col);
                  const isOver=dragOver===col;
                  return(
                    <div key={col} onDragOver={e=>{e.preventDefault();setDragOver(col);}} onDrop={()=>onDrop(col)} onDragLeave={()=>setDragOver(null)}
                      style={{minWidth:260,flex:"1 1 260px",maxWidth:310,background:isOver?cfg.bg:"#F8F9FA",border:`1.5px solid ${isOver?cfg.dot:"#E8EAED"}`,borderRadius:12,padding:12,transition:"all .2s"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"0 2px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:cfg.dot}}/>
                          <span style={{fontWeight:600,fontSize:12,color:"#495057"}}>{col}</span>
                        </div>
                        <span style={{background:"#fff",border:"1px solid #E8EAED",borderRadius:100,padding:"1px 8px",fontSize:11,fontWeight:600,color:"#868E96"}}>{colT.length}</span>
                      </div>
                      {colT.map(ticket=>(
                        <TicketCard key={ticket.id} ticket={ticket} currentUser={currentUser}
                          isDragging={draggingId===ticket.id} isNew={isNewForMe(ticket)}
                          onEdit={openEdit} onWorkflow={openWorkflow} onShare={openShare}
                          onTransfer={handleQuickTransfer}
                          onDragStart={onDragStart} onDragEnd={onDragEnd} canDo={action=>canDo(currentUser.id,action)}/>
                      ))}
                      {colT.length===0&&(
                        <div style={{padding:"20px 0",textAlign:"center",color:"#CED4DA",fontSize:12,borderRadius:8,border:"1.5px dashed #E8EAED",background:"#fff"}}>
                          <div style={{fontSize:20,marginBottom:4}}>📭</div>Glissez un ticket ici
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <button onClick={handleReset} style={{background:"none",border:"1px solid #E8EAED",borderRadius:6,padding:"4px 12px",fontSize:11,color:"#ADB5BD",cursor:"pointer"}}>♻️ Réinitialiser</button>
              </div>
            </div>
          )}

          {/* ── Mes tickets */}
          {activePage==="mytickets"&&(
            <div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {myTickets.length===0
                  ?<div style={{textAlign:"center",padding:"60px 0",color:"#ADB5BD"}}>
                    <div style={{fontSize:40,marginBottom:12}}>🎉</div>
                    <div style={{fontWeight:600,fontSize:16}}>Aucun ticket en attente !</div>
                    <div style={{fontSize:13,marginTop:4}}>Vous êtes à jour.</div>
                  </div>
                  :myTickets.map(ticket=>{
                    const prio=getPriority(ticket.priority);
                    const isNew=isNewForMe(ticket);
                    return(
                      <div key={ticket.id} onClick={()=>openEdit(ticket)} style={{background:"#fff",border:`1px solid ${isNew?"#FFE3E3":"#E8EAED"}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"all .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.06)";e.currentTarget.style.borderColor="#D0D5DD";}}
                        onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=isNew?"#FFE3E3":"#E8EAED";}}>
                        <div style={{width:4,height:40,background:prio.color,borderRadius:2,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            {isNew&&<span style={{background:"#E03131",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4}}>NEW</span>}
                            <div style={{fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{ticket.title}</div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                            <Badge color={prio.color} bg={prio.bg}>{prio.icon} {prio.label}</Badge>
                            <Badge color={COL_CFG[ticket.status]?.dot} bg={COL_CFG[ticket.status]?.bg}>{ticket.status}</Badge>
                            <span style={{fontSize:11,color:"#ADB5BD",fontFamily:"monospace"}}>#{ticket.id}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <Btn onClick={e=>{e.stopPropagation();openWorkflow(ticket);}} variant="secondary" size="sm">🔄 Transférer</Btn>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* ── Droits utilisateurs */}
          {activePage==="rights"&&(
            <div style={{background:"#fff",border:"1px solid #E8EAED",borderRadius:12,overflow:"hidden",animation:"fadeIn .3s ease",height:"calc(100vh - 160px)"}}>
              <UserRightsPanel profiles={profiles} onSave={saveProfiles} currentUser={currentUser}/>
            </div>
          )}

          {/* ── Pages "coming soon" */}
          {["reports","chat","settings","adminpanel"].includes(activePage)&&(
            <div style={{textAlign:"center",padding:"80px 0",animation:"fadeIn .3s ease"}}>
              <div style={{fontSize:48,marginBottom:16}}>
                {activePage==="reports"?"📊":activePage==="chat"?"💬":activePage==="settings"?"⚙️":"👤"}
              </div>
              <div style={{fontWeight:700,fontSize:20,color:"#1a1a1a",marginBottom:8}}>
                {activePage==="reports"?"Rapports & KPI":activePage==="chat"?"Chat d'équipe":activePage==="settings"?"Paramètres":"Administration"}
              </div>
              <div style={{fontSize:14,color:"#868E96",marginBottom:20}}>Cette fonctionnalité est en cours de développement.</div>
              <Badge color="#3B5BDB" bg="#EEF2FF">🚀 Bientôt disponible</Badge>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}
      {modal?.type==="ticket"&&<TicketModal ticket={modal.data} currentUser={currentUser} onSave={handleSave} onDelete={handleDelete} onClose={closeModal} onOpenWorkflow={openWorkflow} onOpenShare={openShare} canDo={action=>canDo(currentUser.id,action)}/>}
      {modal?.type==="workflow"&&<WorkflowModal ticket={modal.data} currentUser={currentUser} onApply={handleApplyWorkflow} onClose={closeModal}/>}
      {modal?.type==="share"&&<ShareModal ticket={modal.data} onClose={closeModal}/>}
    </div>
  );
}

// ============================================================
// 14. APP — Point d'entrée
// ============================================================

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(()=>{
    const saved=sessionStorage.getItem("pf-user");
    if(saved){ try{ const u=JSON.parse(saved); if(ACCOUNTS.find(a=>a.id===u.id)) setCurrentUser(u); }catch(_){} }
    setAuthChecked(true);
  },[]);

  const handleLogin = acc => {
    const safe={id:acc.id,name:acc.name,avatar:acc.avatar,color:acc.color,email:acc.email};
    sessionStorage.setItem("pf-user",JSON.stringify(safe));
    setCurrentUser(safe);
  };

  const handleLogout = () => { sessionStorage.removeItem("pf-user"); setCurrentUser(null); };

  if(!authChecked) return null;
  if(!currentUser)  return <LoginPage onLogin={handleLogin}/>;
  return <Board currentUser={currentUser} onLogout={handleLogout}/>;
}

