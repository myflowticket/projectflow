/**
 * ============================================================
 * ProjectFlow — Outil de ticketing collaboratif
 * ============================================================
 *
 * ARCHITECTURE DU FICHIER (à découper en modules par la suite)
 * ------------------------------------------------------------
 * 1. CONFIG          — Constantes, données initiales, helpers
 * 2. STYLES          — CSS global injecté une seule fois
 * 3. HOOKS           — useTicketStorage, useNotifications
 * 4. COMPOSANTS UI   — Overlay, Badge, Toggle, Avatar
 * 5. LOGIN PAGE      — Page d'authentification
 * 6. MODALS          — TicketModal, WorkflowModal, ShareModal, SettingsModal
 * 7. BOARD HEADER    — Header + Menu hamburger
 * 8. KANBAN          — Colonnes + Cartes
 * 9. BOARD           — Composant principal du tableau
 * 10. APP            — Point d'entrée (gestion session)
 *
 * POUR AMÉLIORER :
 * - Chaque section peut devenir un fichier séparé dans src/
 * - Remplacer les styles inline par Tailwind ou CSS Modules
 * - Ajouter TypeScript pour typer Ticket, Member, Priority...
 * - Remplacer window.storage par Supabase pour un vrai backend
 * ============================================================
 */

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Adaptateur de stockage
 * - En production (Vercel) : utilise localStorage du navigateur
 * - Dans Claude : utilise window.storage (API propriétaire Claude)
 * Cela permet au même code de fonctionner dans les deux environnements.
 */
const storage = {
  get: async (key) => {
    if (window.storage) return window.storage.get(key, true);
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  set: async (key, value) => {
    if (window.storage) return window.storage.set(key, value, true);
    localStorage.setItem(key, value);
    return { value };
  },
  getPrivate: async (key) => {
    if (window.storage) return window.storage.get(key, false);
    const value = localStorage.getItem("private_" + key);
    return value ? { value } : null;
  },
  setPrivate: async (key, value) => {
    if (window.storage) return window.storage.set(key, value, false);
    localStorage.setItem("private_" + key, value);
    return { value };
  },
};


// ============================================================
// 1. CONFIG — Constantes, données, helpers purs
// ============================================================

/** Liste des membres de l'équipe. À terme : récupéré depuis une API */
const ACCOUNTS = [
  { id: 1, name: "Alice", avatar: "🦊", color: "#FF6B6B", email: "alice@projectflow.io", password: "alice123" },
  { id: 2, name: "Bruno", avatar: "🐻", color: "#4ECDC4", email: "bruno@projectflow.io", password: "bruno123" },
  { id: 3, name: "Carla", avatar: "🦋", color: "#FFE66D", email: "carla@projectflow.io", password: "carla123" },
  { id: 4, name: "David", avatar: "🐬", color: "#A855F7", email: "david@projectflow.io", password: "david123" },
];

/** Niveaux de priorité d'un ticket */
const PRIORITIES = [
  { label: "Critique", color: "#FF3B3B", bg: "#FF3B3B22", icon: "🔥" },
  { label: "Haute",    color: "#FF8C00", bg: "#FF8C0022", icon: "⚡" },
  { label: "Moyenne",  color: "#00BFFF", bg: "#00BFFF22", icon: "💧" },
  { label: "Basse",    color: "#32CD32", bg: "#32CD3222", icon: "🌿" },
];

/** Colonnes du tableau Kanban (ordre = ordre d'affichage) */
const COLUMNS = ["À faire", "En cours", "En révision", "Terminé"];

/** Configuration visuelle de chaque colonne */
const COL_CFG = {
  "À faire":     { icon: "📋", color: "#6C63FF", bg: "#6C63FF15" },
  "En cours":    { icon: "⚙️",  color: "#FF8C00", bg: "#FF8C0015" },
  "En révision": { icon: "🔍", color: "#00BFFF", bg: "#00BFFF15" },
  "Terminé":     { icon: "✅", color: "#32CD32", bg: "#32CD3215" },
};

/** Actions disponibles dans le workflow de transfert */
const WF_ACTIONS = [
  { label: "Assigner à",             icon: "📨", color: "#6C63FF", type: "assign" },
  { label: "Renvoyer pour révision", icon: "🔄", color: "#FF8C00", type: "review",     targetStatus: "En révision" },
  { label: "Demander correction",    icon: "✏️",  color: "#FF3B3B", type: "correction", targetStatus: "À faire" },
  { label: "Valider & clôturer",     icon: "✅", color: "#32CD32", type: "close",      targetStatus: "Terminé" },
];

/** Icônes pour les pièces jointes selon leur type MIME */
const FILE_ICONS = {
  "image/":        "🖼️",
  "application/pdf": "📄",
  "text/":         "📝",
  "video/":        "🎬",
  "audio/":        "🎵",
  default:         "📎",
};

/** Clé de stockage partagé + intervalle de polling */
const STORAGE_KEY = "projectflow-v5";
const POLL_MS     = 3000;

// ── Helpers purs (sans effet de bord) ──────────────────────

/** Retourne la config d'un membre par son ID */
const getMember = (id) => ACCOUNTS.find(m => m.id === id);

/** Retourne la config d'une priorité par son libellé */
const getPriority = (label) => PRIORITIES.find(p => p.label === label) || PRIORITIES[2];

/** Retourne l'icône d'un fichier selon son type MIME */
const getFileIcon = (type = "") => {
  for (const [key, icon] of Object.entries(FILE_ICONS)) {
    if (type.startsWith(key) || type === key) return icon;
  }
  return FILE_ICONS.default;
};

/** Formate une taille en octets en Ko/Mo lisible */
const formatFileSize = (bytes) => {
  if (bytes < 1024)    return bytes + " o";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / 1048576).toFixed(1) + " Mo";
};

/** Tickets de démonstration chargés au premier lancement */
const DEFAULT_TICKETS = [
  {
    id: 1, title: "Refonte de la homepage",
    description: "Moderniser l'interface utilisateur",
    status: "En cours", priority: "Haute", assignee: 1,
    tags: ["Design", "Frontend"], attachments: [],
    history: [{ date: Date.now() - 86400000, member: 1, action: "Ticket créé" }],
    createdAt: Date.now() - 86400000, assignedAt: Date.now() - 86400000,
  },
  {
    id: 2, title: "Corriger bug de connexion",
    description: "Les utilisateurs sont déconnectés après 5 min",
    status: "À faire", priority: "Critique", assignee: 2,
    tags: ["Bug", "Auth"], attachments: [],
    history: [{ date: Date.now() - 43200000, member: 2, action: "Ticket créé" }],
    createdAt: Date.now() - 43200000, assignedAt: Date.now() - 43200000,
  },
  {
    id: 3, title: "Intégration API paiement",
    description: "Connecter Stripe pour les abonnements",
    status: "En révision", priority: "Haute", assignee: 3,
    tags: ["Backend"], attachments: [],
    history: [
      { date: Date.now() - 7200000, member: 3, action: "Ticket créé" },
      { date: Date.now() - 3600000, member: 1, action: "Renvoyé pour révision", note: "Vérifier les webhooks" },
    ],
    createdAt: Date.now() - 7200000, assignedAt: Date.now() - 3600000,
  },
  {
    id: 4, title: "Documentation technique",
    description: "Rédiger les guides développeurs",
    status: "Terminé", priority: "Basse", assignee: 4,
    tags: ["Docs"], attachments: [],
    history: [
      { date: Date.now() - 172800000, member: 4, action: "Ticket créé" },
      { date: Date.now() - 86400000,  member: 2, action: "Validé & clôturé" },
    ],
    createdAt: Date.now() - 172800000, assignedAt: Date.now() - 172800000,
  },
  {
    id: 5, title: "Tests automatisés",
    description: "Couverture > 80% sur les modules critiques",
    status: "À faire", priority: "Moyenne", assignee: null,
    tags: ["Tests"], attachments: [],
    history: [{ date: Date.now() - 3600000, member: null, action: "Ticket créé" }],
    createdAt: Date.now() - 3600000, assignedAt: null,
  },
];


// ============================================================
// 2. STYLES — CSS global injecté une seule fois dans le DOM
// ============================================================

const GLOBAL_CSS = `
  @keyframes fadeUp    { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes float     { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  @keyframes spin      { from { transform: rotate(0) } to { transform: rotate(360deg) } }
  @keyframes slideIn   { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes pulse     { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
  @keyframes popIn     { from { transform: scale(.85); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @keyframes badgePulse{ 0%,100% { box-shadow: 0 0 0 0 rgba(255,59,59,.6) } 70% { box-shadow: 0 0 0 6px rgba(255,59,59,0) } }

  * { box-sizing: border-box; }
  select option { background: #1a1740; color: #fff; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 3px; }
  input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #1a1740 inset !important; -webkit-text-fill-color: #fff !important; }

  .pf-card:hover {
    background: rgba(255,255,255,.12) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 24px rgba(0,0,0,.3) !important;
  }
  .pf-menu-item:hover { background: rgba(255,255,255,.08) !important; }
  .pf-btn-primary:hover { transform: scale(1.04); }
`;


// ============================================================
// 3. HOOKS — Logique métier isolée et réutilisable
// ============================================================

/**
 * useTicketStorage
 * Gère la persistance partagée des tickets (polling toutes les 3s).
 * À terme : remplacer par un hook Supabase avec subscriptions temps réel.
 */
function useTicketStorage() {
  const [tickets,  setTickets]  = useState([]);
  const [nextId,   setNextId]   = useState(6);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const versionRef = useRef(null);

  // Sauvegarde les tickets dans le stockage partagé
  const save = useCallback(async (list, nid) => {
    setSyncing(true);
    const version = Date.now();
    versionRef.current = version;
    await storage.set(STORAGE_KEY, JSON.stringify({ tickets: list, nextId: nid, version }));
    setLastSync(new Date());
    setSyncing(false);
  }, []);

  // Charge les tickets depuis le stockage partagé (silent = sans MAJ lastSync)
  const load = useCallback(async (silent = false) => {
    try {
      const result = await storage.get(STORAGE_KEY);
      if (result?.value) {
        const data = JSON.parse(result.value);
        // Ne met à jour que si la version a changé (évite les re-renders inutiles)
        if (data.version !== versionRef.current) {
          versionRef.current = data.version;
          setTickets(data.tickets);
          setNextId(data.nextId || data.tickets.length + 1);
          if (!silent) setLastSync(new Date());
        }
      } else {
        // Premier lancement : on charge les données de démo
        await save(DEFAULT_TICKETS, 6);
        setTickets(DEFAULT_TICKETS);
      }
    } catch {
      try { await save(DEFAULT_TICKETS, 6); setTickets(DEFAULT_TICKETS); } catch (_) {}
    }
    setLoading(false);
  }, [save]);

  // Chargement initial
  useEffect(() => { load(false); }, [load]);

  // Polling toutes les POLL_MS millisecondes pour détecter les changements des autres membres
  useEffect(() => {
    const interval = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Persiste une nouvelle liste de tickets et met à jour l'état local
  const persist = useCallback(async (list, nid) => {
    setTickets(list);
    if (nid !== undefined) setNextId(nid);
    await save(list, nid);
  }, [save]);

  return { tickets, nextId, loading, syncing, lastSync, persist };
}

/**
 * useNotifications
 * Détecte les nouveaux tickets assignés depuis la dernière connexion.
 * Utilise le stockage personnel (non partagé) pour stocker la date par membre.
 */
function useNotifications(currentUser, tickets, loading) {
  const [alertModal,  setAlertModal]  = useState(false);
  const [newTickets,  setNewTickets]  = useState([]);
  const [lastLoginAt, setLastLoginAt] = useState(0);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Attendre que les tickets soient chargés et que la vérification n'ait pas déjà eu lieu
    if (loading || tickets.length === 0 || checkedRef.current) return;
    checkedRef.current = true;

    const key = `pf-lastlogin-${currentUser.id}`;

    const check = async () => {
      // Récupère la date de dernière connexion de ce membre
      let last = 0;
      try {
        const r = await storage.getPrivate(key);
        if (r?.value) last = parseInt(r.value) || 0;
      } catch (_) {}

      setLastLoginAt(last);

      // Enregistre la connexion actuelle
      try { await storage.setPrivate(key, String(Date.now())); } catch (_) {}

      // Filtre les tickets assignés à ce membre après sa dernière connexion
      const fresh = tickets.filter(t =>
        t.assignee === currentUser.id &&
        t.status !== "Terminé" &&
        (t.assignedAt || t.createdAt || 0) > (last > 0 ? last : Date.now() - 30000)
      );

      if (fresh.length > 0) {
        setNewTickets(fresh);
        setAlertModal(true);
      }
    };

    check();
  }, [loading, tickets, currentUser.id]);

  // Détermine si un ticket est "nouveau" pour l'utilisateur courant
  const isNewForMe = useCallback((ticket) =>
    ticket.assignee === currentUser.id &&
    ticket.status !== "Terminé" &&
    lastLoginAt > 0 &&
    (ticket.assignedAt || ticket.createdAt || 0) > lastLoginAt,
  [currentUser.id, lastLoginAt]);

  return { alertModal, setAlertModal, newTickets, isNewForMe };
}


// ============================================================
// 4. COMPOSANTS UI — Briques réutilisables
// ============================================================

/**
 * Overlay — Fond sombre + conteneur modal centré.
 * Ferme le modal au clic sur le fond, bloque la propagation vers la racine.
 */
function Overlay({ children, onClose, maxWidth = 520 }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background:"linear-gradient(145deg,#1a1740,#251f50)", border:"1px solid rgba(255,255,255,.15)", borderRadius:22, padding:26, width:"100%", maxWidth, boxShadow:"0 30px 80px rgba(0,0,0,.6)", maxHeight:"90vh", overflowY:"auto" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Avatar circulaire d'un membre */
function Avatar({ member, size = 22 }) {
  if (!member) return <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>—</span>;
  return (
    <div
      title={member.name}
      style={{ width: size, height: size, borderRadius: "50%", background: member.color + "44", border: `2px solid ${member.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, flexShrink: 0 }}
    >
      {member.avatar}
    </div>
  );
}

/** Badge de priorité coloré */
function PriorityBadge({ priority }) {
  const p = getPriority(priority);
  return (
    <span style={{ background: p.bg, border: `1px solid ${p.color}55`, borderRadius: 20, padding: "2px 7px", fontSize: 9, fontWeight: 700, color: p.color }}>
      {p.icon} {p.label}
    </span>
  );
}

/** Toggle on/off (visuel uniquement pour l'instant) */
function Toggle({ on = true }) {
  return (
    <div style={{ width: 40, height: 22, borderRadius: 11, background: on ? "linear-gradient(135deg,#6C63FF,#A855F7)" : "rgba(255,255,255,.15)", flexShrink: 0, position: "relative", cursor: "pointer" }}>
      <div style={{ position: "absolute", right: on ? 3 : undefined, left: on ? undefined : 3, top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)", transition: "all .2s" }} />
    </div>
  );
}

/** Onglets de navigation (ex: dans les modals) */
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 4 }}>
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{ flex: 1, background: active === id ? "rgba(108,99,255,.5)" : "transparent", border: active === id ? "1px solid rgba(108,99,255,.6)" : "1px solid transparent", borderRadius: 9, padding: "7px 8px", color: active === id ? "#fff" : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: active === id ? 700 : 400, cursor: "pointer" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Champ texte stylisé */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)", display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 11, padding: "9px 13px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
};


// ============================================================
// 5. LOGIN PAGE — Page d'authentification
// ============================================================

function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused,  setFocused]  = useState(null);

  const doLogin = async (account) => {
    // Connexion rapide : l'account est passé directement
    if (account) { onLogin(account); return; }
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const found = ACCOUNTS.find(a =>
      a.email.toLowerCase() === email.toLowerCase().trim() &&
      a.password === password
    );
    found ? onLogin(found) : setError("Email ou mot de passe incorrect.");
    setLoading(false);
  };

  const getInputBorder = (field) =>
    focused === field ? "rgba(108,99,255,.8)" : error ? "rgba(255,59,59,.4)" : "rgba(255,255,255,.15)";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F0C29 0%,#302B63 50%,#24243e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito','Segoe UI',sans-serif", padding: 20 }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp .5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg,#6C63FF,#FF6B6B)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 36, boxShadow: "0 8px 32px rgba(108,99,255,.5)", marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🚀</div>
          <div style={{ fontWeight: 800, fontSize: 28, color: "#fff", letterSpacing: "-1px" }}>ProjectFlow</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.45)", marginTop: 6 }}>Connectez-vous à votre espace de travail</div>
        </div>

        {/* Carte de login */}
        <div style={{ background: "rgba(255,255,255,.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>

          {/* Hint comptes de démo */}
          <div style={{ background: "rgba(108,99,255,.12)", border: "1px solid rgba(108,99,255,.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 24, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
            💡 <strong style={{ color: "#A8A0FF" }}>Démo :</strong> alice@projectflow.io / alice123 · bruno / bruno123 · etc.
          </div>

          {/* Champ email */}
          <Field label="Adresse e-mail">
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && doLogin()}
              onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
              placeholder="votre@email.com"
              style={{ ...inputStyle, border: `1.5px solid ${getInputBorder("email")}`, fontSize: 14, padding: "12px 16px" }}
            />
          </Field>

          {/* Champ mot de passe */}
          <Field label="Mot de passe">
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"} value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && doLogin()}
                onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                placeholder="••••••••"
                style={{ ...inputStyle, border: `1.5px solid ${getInputBorder("pass")}`, fontSize: 14, padding: "12px 44px 12px 16px" }}
              />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 16, padding: 4 }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </Field>

          {/* Message d'erreur */}
          {error && (
            <div style={{ background: "rgba(255,59,59,.15)", border: "1px solid rgba(255,59,59,.3)", borderRadius: 10, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: "#FF8080" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Bouton de connexion */}
          <button
            onClick={() => doLogin()}
            disabled={loading || !email || !password}
            style={{ width: "100%", marginTop: 16, background: (loading || !email || !password) ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#6C63FF,#FF6B6B)", border: "none", borderRadius: 13, padding: "14px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: (loading || !email || !password) ? "not-allowed" : "pointer", boxShadow: (!loading && email && password) ? "0 6px 24px rgba(108,99,255,.5)" : "none", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" }}
          >
            {loading
              ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Connexion…</>
              : "Se connecter →"
            }
          </button>

          {/* Connexion rapide */}
          <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 20 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textAlign: "center", marginBottom: 12, fontWeight: 700, letterSpacing: ".5px" }}>CONNEXION RAPIDE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ACCOUNTS.map(account => (
                <button
                  key={account.id}
                  onClick={() => doLogin(account)}
                  style={{ background: account.color + "18", border: `1.5px solid ${account.color}44`, borderRadius: 12, padding: "10px 12px", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .2s", fontFamily: "inherit" }}
                  onMouseEnter={e => { e.currentTarget.style.background = account.color + "33"; e.currentTarget.style.borderColor = account.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = account.color + "18"; e.currentTarget.style.borderColor = account.color + "44"; }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: account.color + "33", border: `2px solid ${account.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{account.avatar}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{account.name}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>{account.email}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "rgba(255,255,255,.25)" }}>
          ProjectFlow · Tableau collaboratif partagé
        </div>
      </div>
    </div>
  );
}


// ============================================================
// 6. MODALS
// ============================================================

// ── 6a. Modal Ticket (création + édition) ────────────────────

function TicketModal({ ticket, currentUser, onSave, onDelete, onClose, onOpenWorkflow, onOpenShare }) {
  const isCreate = !ticket.id;

  const [form,     setForm]     = useState({ ...ticket, tags: [...(ticket.tags || [])], attachments: [...(ticket.attachments || [])], history: [...(ticket.history || [])] });
  const [tab,      setTab]      = useState("details");
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef(null);

  const updateForm = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // ── Tags
  const addTag    = () => { const t = tagInput.trim(); if (t && !form.tags.includes(t)) updateForm("tags", [...form.tags, t]); setTagInput(""); };
  const removeTag = (t) => updateForm("tags", form.tags.filter(x => x !== t));

  // ── Pièces jointes
  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (ev) => setForm(f => ({
        ...f,
        attachments: [...f.attachments, { id: Date.now() + Math.random(), name: file.name, size: file.size, type: file.type, dataUrl: ev.target.result, addedAt: Date.now() }],
      }));
      reader.readAsDataURL(file);
    });
  };
  const removeAtt    = (id) => updateForm("attachments", form.attachments.filter(a => a.id !== id));
  const downloadAtt  = (att) => { const a = document.createElement("a"); a.href = att.dataUrl; a.download = att.name; a.click(); };

  const TABS = [
    { id: "details",     label: "📋 Détails" },
    { id: "attachments", label: `📎 PJ${form.attachments?.length ? ` (${form.attachments.length})` : ""}` },
    { id: "history",     label: "🕐 Historique" },
  ];

  return (
    <Overlay onClose={onClose}>
      {/* Titre */}
      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>
        {isCreate ? "✨ Nouveau ticket" : "✏️ Modifier le ticket"}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Onglet Détails */}
      {tab === "details" && (
        <>
          <Field label="Titre *">
            <input value={form.title} onChange={e => updateForm("title", e.target.value)} placeholder="Ex : Corriger le bug de login" style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea value={form.description || ""} onChange={e => updateForm("description", e.target.value)} placeholder="Décrivez le ticket…" rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </Field>

          {/* Statut + Priorité */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 13 }}>
            <Field label="Statut">
              <select value={form.status} onChange={e => updateForm("status", e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
                {COLUMNS.map(c => <option key={c} value={c}>{COL_CFG[c].icon} {c}</option>)}
              </select>
            </Field>
            <Field label="Priorité">
              <select value={form.priority} onChange={e => updateForm("priority", e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
                {PRIORITIES.map(p => <option key={p.label} value={p.label}>{p.icon} {p.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Assignation */}
          <Field label="Assigné à">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => { updateForm("assignee", null); updateForm("assignedAt", null); }}
                style={{ background: !form.assignee ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.07)", border: `2px solid ${!form.assignee ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.1)"}`, borderRadius: 20, padding: "4px 10px", color: "#fff", fontSize: 11, cursor: "pointer" }}>
                Non assigné
              </button>
              {ACCOUNTS.map(m => (
                <button key={m.id} onClick={() => { updateForm("assignee", m.id); updateForm("assignedAt", Date.now()); }}
                  style={{ background: form.assignee === m.id ? m.color + "33" : "rgba(255,255,255,.07)", border: `2px solid ${form.assignee === m.id ? m.color : "rgba(255,255,255,.1)"}`, borderRadius: 20, padding: "4px 10px", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{m.avatar}</span>{m.name}{m.id === currentUser.id ? " (moi)" : ""}
                </button>
              ))}
            </div>
          </Field>

          {/* Tags */}
          <Field label="Tags">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {form.tags.map(tag => (
                <span key={tag} style={{ background: "rgba(108,99,255,.25)", border: "1px solid rgba(108,99,255,.4)", borderRadius: 6, padding: "1px 7px", fontSize: 10, color: "#A8A0FF", display: "flex", alignItems: "center", gap: 3 }}>
                  {tag}
                  <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", color: "#A8A0FF", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Ajouter un tag…" style={{ ...inputStyle, flex: 1, padding: "6px 11px", fontSize: 12 }} />
              <button onClick={addTag} style={{ background: "rgba(108,99,255,.3)", border: "1px solid rgba(108,99,255,.5)", borderRadius: 9, padding: "6px 12px", color: "#A8A0FF", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>+ Tag</button>
            </div>
          </Field>
        </>
      )}

      {/* ── Onglet Pièces jointes */}
      {tab === "attachments" && (
        <div>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />

          {/* Zone de drop */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#6C63FF"; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; handleFiles(e.dataTransfer.files); }}
            style={{ border: "2px dashed rgba(255,255,255,.15)", borderRadius: 14, padding: "24px 20px", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,.03)", transition: "all .2s", marginBottom: 14 }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Glissez vos fichiers ici</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>ou cliquez · Max 5 Mo par fichier</div>
          </div>

          {/* Liste des fichiers */}
          {form.attachments.length === 0
            ? <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13, padding: "14px 0" }}>Aucune pièce jointe</div>
            : form.attachments.map(att => (
              <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, padding: "9px 12px", marginBottom: 8 }}>
                {att.type?.startsWith("image/") && att.dataUrl
                  ? <img src={att.dataUrl} alt={att.name} style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover" }} />
                  : <div style={{ width: 34, height: 34, borderRadius: 7, background: "rgba(108,99,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{getFileIcon(att.type)}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{formatFileSize(att.size)}</div>
                </div>
                <button onClick={() => downloadAtt(att)} style={{ background: "rgba(108,99,255,.25)", border: "1px solid rgba(108,99,255,.4)", borderRadius: 7, padding: "4px 8px", color: "#A8A0FF", fontSize: 11, cursor: "pointer" }}>⬇️</button>
                <button onClick={() => removeAtt(att.id)} style={{ background: "rgba(255,59,59,.15)", border: "1px solid rgba(255,59,59,.3)", borderRadius: 7, padding: "4px 8px", color: "#FF6B6B", fontSize: 11, cursor: "pointer" }}>×</button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Onglet Historique */}
      {tab === "history" && (
        <div>
          {form.history.length === 0
            ? <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13, padding: "28px 0" }}>Aucun historique</div>
            : [...form.history].reverse().map((entry, i) => {
              const m = getMember(entry.member);
              return (
                <div key={i} style={{ display: "flex", gap: 11, paddingBottom: 13, position: "relative" }}>
                  {i < form.history.length - 1 && <div style={{ position: "absolute", left: 13, top: 27, width: 2, height: "calc(100% - 10px)", background: "rgba(255,255,255,.08)" }} />}
                  <Avatar member={m} size={26} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{entry.action}</div>
                    {entry.note && <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2, fontStyle: "italic" }}>💬 "{entry.note}"</div>}
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                      {m?.name || "Système"} · {new Date(entry.date).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 18, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 }}>
        {!isCreate && (
          <button onClick={() => onDelete(form.id)} style={{ background: "rgba(255,59,59,.15)", border: "1px solid rgba(255,59,59,.4)", borderRadius: 11, padding: "9px 14px", color: "#FF6B6B", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
            🗑 Supprimer
          </button>
        )}
        <div style={{ display: "flex", gap: 7, marginLeft: "auto" }}>
          {!isCreate && (
            <>
              <button onClick={() => { onClose(); onOpenWorkflow(form); }} style={{ background: "rgba(108,99,255,.2)", border: "1px solid rgba(108,99,255,.4)", borderRadius: 11, padding: "9px 13px", color: "#A8A0FF", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>🔄 Workflow</button>
              <button onClick={() => { onClose(); onOpenShare(form); }} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, padding: "9px 13px", color: "rgba(255,255,255,.7)", fontSize: 12, cursor: "pointer" }}>🔗 Partager</button>
            </>
          )}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, padding: "9px 13px", color: "rgba(255,255,255,.7)", fontSize: 12, cursor: "pointer" }}>Annuler</button>
          <button
            onClick={() => form.title.trim() && onSave(form)}
            disabled={!form.title.trim()}
            style={{ background: form.title.trim() ? "linear-gradient(135deg,#6C63FF,#FF6B6B)" : "rgba(255,255,255,.1)", border: "none", borderRadius: 11, padding: "9px 16px", color: "#fff", fontSize: 12, cursor: form.title.trim() ? "pointer" : "not-allowed", fontWeight: 700 }}
          >
            {isCreate ? "✨ Créer" : "💾 Sauvegarder"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── 6b. Modal Workflow ────────────────────────────────────────

function WorkflowModal({ ticket, currentUser, onApply, onClose }) {
  const [action,  setAction]  = useState(null);
  const [target,  setTarget]  = useState(ticket.assignee);
  const [note,    setNote]    = useState("");

  const handleApply = () => {
    if (!action) return;
    onApply({ ticket, action, targetMemberId: target, note });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 5 }}>🔄 Workflow</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>#{ticket.id} · {ticket.title}</div>

      {/* État actuel */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "11px 14px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>STATUT</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{COL_CFG[ticket.status]?.icon} {ticket.status}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>ASSIGNÉ</div>
          {getMember(ticket.assignee)
            ? <div style={{ fontSize: 13, fontWeight: 700 }}>{getMember(ticket.assignee).avatar} {getMember(ticket.assignee).name}</div>
            : <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>Non assigné</div>
          }
        </div>
      </div>

      {/* Étape 1 : Action */}
      <Field label="1️⃣ Action">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {WF_ACTIONS.map(a => (
            <button
              key={a.type}
              onClick={() => setAction(a)}
              style={{ background: action?.type === a.type ? a.color + "33" : "rgba(255,255,255,.05)", border: `2px solid ${action?.type === a.type ? a.color : "rgba(255,255,255,.1)"}`, borderRadius: 11, padding: "10px 13px", color: "#fff", fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontWeight: action?.type === a.type ? 700 : 400 }}
            >
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{a.label}</div>
                {a.targetStatus && <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 1 }}>→ {COL_CFG[a.targetStatus]?.icon} {a.targetStatus}</div>}
              </div>
            </button>
          ))}
        </div>
      </Field>

      {/* Étape 2 + 3 (visibles après sélection d'une action) */}
      {action && (
        <>
          <Field label="2️⃣ Assigner à">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ACCOUNTS.map(m => (
                <button key={m.id} onClick={() => setTarget(m.id)}
                  style={{ background: target === m.id ? m.color + "33" : "rgba(255,255,255,.07)", border: `2px solid ${target === m.id ? m.color : "rgba(255,255,255,.1)"}`, borderRadius: 20, padding: "5px 10px", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{m.avatar}</span>{m.name}{m.id === currentUser.id ? " (moi)" : ""}
                </button>
              ))}
            </div>
          </Field>

          <Field label="3️⃣ Message (optionnel)">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex : Merci de revoir les tests…" rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", fontSize: 12 }} />
          </Field>

          {/* Aperçu */}
          <div style={{ background: "rgba(108,99,255,.1)", border: "1px solid rgba(108,99,255,.3)", borderRadius: 11, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,.7)" }}>
            <strong style={{ color: "#A8A0FF" }}>Aperçu :</strong> {action.icon} {action.label}
            {target ? ` → ${getMember(target)?.avatar} ${getMember(target)?.name}` : ""}
            {action.targetStatus ? ` · ${COL_CFG[action.targetStatus]?.icon} ${action.targetStatus}` : ""}
            {note ? ` · 💬 "${note}"` : ""}
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, padding: "10px", color: "rgba(255,255,255,.6)", fontSize: 12, cursor: "pointer" }}>Annuler</button>
        <button
          onClick={handleApply}
          onTouchEnd={e => { e.stopPropagation(); handleApply(); }}
          disabled={!action}
          style={{ flex: 2, background: action ? "linear-gradient(135deg,#6C63FF,#FF6B6B)" : "rgba(255,255,255,.1)", border: "none", borderRadius: 11, padding: "10px", color: "#fff", fontSize: 12, cursor: action ? "pointer" : "not-allowed", fontWeight: 700 }}
        >
          {action ? `${action.icon} Appliquer` : "Choisir une action"}
        </button>
      </div>
    </Overlay>
  );
}

// ── 6c. Modal Partage ─────────────────────────────────────────

function ShareModal({ ticket, onClose }) {
  const member = getMember(ticket.assignee);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `Ticket #${ticket.id} — ${ticket.title}\nStatut : ${ticket.status} | Priorité : ${ticket.priority}\n${ticket.description || ""}`
    );
    onClose();
  };

  const sendByEmail = () => {
    const subject = encodeURIComponent(`[ProjectFlow] Ticket #${ticket.id} : ${ticket.title}`);
    const body    = encodeURIComponent(`Bonjour${member ? " " + member.name : ""},\n\nTicket à traiter :\n📌 ${ticket.title}\n📋 ${ticket.status}\n⚡ ${ticket.priority}\n${ticket.description || ""}\n\nCordialement`);
    window.open(`mailto:${member?.email || ""}?subject=${subject}&body=${body}`);
  };

  const rows = [
    ["📌", ticket.title],
    ["📋", `${COL_CFG[ticket.status]?.icon} ${ticket.status}`],
    ["⚡", `${getPriority(ticket.priority).icon} ${ticket.priority}`],
    ["👤", member?.name || "Non assigné"],
    ticket.tags?.length    ? ["🏷️", ticket.tags.join(", ")] : null,
    ticket.attachments?.length ? ["📎", `${ticket.attachments.length} fichier(s)`] : null,
  ].filter(Boolean);

  return (
    <Overlay onClose={onClose} maxWidth={420}>
      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 5 }}>🔗 Partager le ticket</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>#{ticket.id} · {ticket.title}</div>

      {/* Résumé */}
      <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "13px 15px", marginBottom: 14 }}>
        {rows.map(([icon, value]) => (
          <div key={icon} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", minWidth: 24 }}>{icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={copyToClipboard} style={{ background: "rgba(108,99,255,.25)", border: "1px solid rgba(108,99,255,.4)", borderRadius: 12, padding: "12px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          📋 Copier le résumé
        </button>
        <button onClick={sendByEmail} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: "12px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          ✉️ Envoyer par e-mail
        </button>
      </div>
      <button onClick={onClose} style={{ marginTop: 12, width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, padding: "9px", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer" }}>Fermer</button>
    </Overlay>
  );
}

// ── 6d. Modal Paramètres ──────────────────────────────────────

function SettingsModal({ currentUser, onClose }) {
  const [tab, setTab] = useState("general");

  const TABS = [
    { id: "general",  label: "🏠 Général" },
    { id: "board",    label: "📋 Tableau",  soon: true },
    { id: "members",  label: "👥 Membres",  soon: true },
    { id: "notifs",   label: "🔔 Notifs",   soon: true },
  ];

  const COMING_SOON = [
    { icon: "🎨", label: "Personnaliser les colonnes",  desc: "Couleurs, icônes, noms, ordre" },
    { icon: "👤", label: "Droits utilisateurs",         desc: "Admin, éditeur, lecteur seul" },
    { icon: "🔔", label: "Notifications e-mail",        desc: "Alertes lors des transferts" },
    { icon: "📊", label: "Rapports & statistiques",     desc: "Suivi par membre et période" },
    { icon: "🌐", label: "Langues",                     desc: "Français, Anglais, Espagnol" },
  ];

  const ACTIVE_FEATURES = [
    { label: "Alerte de nouveaux tickets à la connexion", desc: "Pop-up listant les tickets assignés depuis votre dernière visite" },
    { label: "Badge 'NEW' sur les nouvelles cartes",      desc: "Surligne les tickets récemment assignés" },
    { label: "Bannière 'À vous de jouer'",                desc: "Vos tickets en attente en haut du tableau" },
  ];

  return (
    <Overlay onClose={onClose} maxWidth={520}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>⚙️ Paramètres</div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 9, width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer" }}>×</button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 3, marginBottom: 22, background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 4, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => !t.soon && setTab(t.id)}
            style={{ flex: "0 0 auto", background: tab === t.id ? "rgba(108,99,255,.5)" : "transparent", border: tab === t.id ? "1px solid rgba(108,99,255,.6)" : "1px solid transparent", borderRadius: 9, padding: "7px 14px", color: t.soon ? "rgba(255,255,255,.3)" : tab === t.id ? "#fff" : "rgba(255,255,255,.6)", fontSize: 12, fontWeight: tab === t.id ? 700 : 400, cursor: t.soon ? "default" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            {t.label}
            {t.soon && <span style={{ background: "rgba(255,255,255,.08)", borderRadius: 5, padding: "0 5px", fontSize: 8, color: "rgba(255,255,255,.3)" }}>bientôt</span>}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div>
          {/* Profil */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".7px", marginBottom: 12 }}>MON PROFIL</div>
            <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: currentUser.color + "33", border: `3px solid ${currentUser.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{currentUser.avatar}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{currentUser.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{currentUser.email}</div>
                <div style={{ display: "inline-block", background: currentUser.color + "22", border: `1px solid ${currentUser.color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, color: currentUser.color, marginTop: 6, fontWeight: 700 }}>Membre actif</div>
              </div>
            </div>
          </div>

          {/* Fonctionnalités actives */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".7px", marginBottom: 12 }}>FONCTIONNALITÉS ACTIVES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ACTIVE_FEATURES.map((item, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "12px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <Toggle on={true} />
                </div>
              ))}
            </div>
          </div>

          {/* À venir */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".7px", marginBottom: 12 }}>À VENIR</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COMING_SOON.map((item, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, opacity: .6 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <span style={{ background: "rgba(255,255,255,.08)", borderRadius: 6, padding: "2px 8px", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.35)", whiteSpace: "nowrap" }}>bientôt</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 22, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: "linear-gradient(135deg,#6C63FF,#FF6B6B)", border: "none", borderRadius: 11, padding: "10px 22px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Fermer</button>
      </div>
    </Overlay>
  );
}

// ── 6e. Modal Alerte (nouveaux tickets à la connexion) ────────

function AlertModal({ currentUser, tickets, onViewTicket, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
      <div style={{ background: "linear-gradient(145deg,#1a1740,#251f50)", border: `2px solid ${currentUser.color}66`, borderRadius: 24, padding: 28, width: "100%", maxWidth: 460, boxShadow: `0 0 60px ${currentUser.color}33`, animation: "popIn .35s ease" }}>

        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔔</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Bonjour {currentUser.avatar} {currentUser.name} !</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>
            {tickets.length === 1
              ? "Un nouveau ticket vous a été assigné depuis votre dernière connexion"
              : `${tickets.length} nouveaux tickets vous ont été assignés depuis votre dernière connexion`
            }
          </div>
        </div>

        {/* Liste des tickets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, maxHeight: 280, overflowY: "auto" }}>
          {tickets.map(t => {
            const prio = getPriority(t.priority);
            const from = getMember(t.history?.filter(h => h.action.includes("créé") || h.action.includes("Transféré")).slice(-1)[0]?.member);
            return (
              <div key={t.id} style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${currentUser.color}33`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 6, minHeight: 40, background: prio.color, borderRadius: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <PriorityBadge priority={t.priority} />
                    <span style={{ background: COL_CFG[t.status]?.bg, border: `1px solid ${COL_CFG[t.status]?.color}44`, borderRadius: 20, padding: "1px 7px", fontSize: 10, color: COL_CFG[t.status]?.color }}>{COL_CFG[t.status]?.icon} {t.status}</span>
                    {from && <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>de {from.avatar} {from.name}</span>}
                  </div>
                </div>
                <button onClick={() => onViewTicket(t)} style={{ background: currentUser.color + "33", border: `1px solid ${currentUser.color}`, borderRadius: 9, padding: "5px 10px", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Voir →
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} style={{ width: "100%", background: `linear-gradient(135deg,${currentUser.color},#6C63FF)`, border: "none", borderRadius: 13, padding: "13px", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          Accéder au tableau →
        </button>
      </div>
    </div>
  );
}


// ============================================================
// 7. BOARD HEADER — Header + Menu hamburger
// ============================================================

function BoardHeader({ currentUser, syncing, lastSync, myTickets, search, filtPrio, filtMember, isNewForMe, onSearch, onFiltPrio, onFiltMember, onCreate, onLogout, onSettings, onFilterMyTickets, onFilterAll }) {
  const [open, setOpen] = useState(false);

  const newCount = myTickets.filter(t => isNewForMe(t)).length;

  return (
    <div style={{ background: "rgba(255,255,255,.05)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,.1)", padding: "13px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>

      {/* Gauche : Hamburger + Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>

        {/* ☰ Menu hamburger */}
        <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setOpen(s => !s)}
            style={{ width: 38, height: 38, borderRadius: 11, background: open ? "rgba(108,99,255,.4)" : "rgba(255,255,255,.08)", border: `1.5px solid ${open ? "rgba(108,99,255,.7)" : "rgba(255,255,255,.15)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", transition: "all .2s", position: "relative" }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 15, height: 2, background: "#fff", borderRadius: 2, transition: "all .25s", transform: open && i === 0 ? "rotate(45deg) translate(5px,5px)" : open && i === 2 ? "rotate(-45deg) translate(5px,-5px)" : "none", opacity: open && i === 1 ? 0 : 1 }} />
            ))}
            {/* Badge nouveaux tickets */}
            {newCount > 0 && !open && (
              <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#FF3B3B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, animation: "badgePulse 1.5s infinite" }}>{newCount}</div>
            )}
          </button>

          {/* Menu déroulant */}
          {open && (
            <div style={{ position: "absolute", left: 0, top: "calc(100% + 10px)", background: "linear-gradient(145deg,#1a1740,#251f50)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 16, padding: 8, minWidth: 230, boxShadow: "0 20px 60px rgba(0,0,0,.6)", zIndex: 300 }}>

              {/* Section : Navigation */}
              <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".8px" }}>NAVIGATION</div>
              </div>
              {[
                { icon: "🎫", label: "Mes tickets", badge: myTickets.length || null, action: () => { onFilterMyTickets(); setOpen(false); } },
                { icon: "👥", label: "Tous les tickets",                              action: () => { onFilterAll(); setOpen(false); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="pf-menu-item" style={{ width: "100%", background: "none", border: "none", borderRadius: 10, padding: "9px 12px", color: "rgba(255,255,255,.85)", fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", transition: "background .15s" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <span style={{ background: "#6C63FF", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{item.badge}</span>}
                </button>
              ))}

              {/* Section : Configuration */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", margin: "6px 0", padding: "8px 12px 4px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".8px" }}>CONFIGURATION</div>
              </div>
              {[
                { icon: "⚙️",  label: "Paramètres",        action: () => { onSettings(); setOpen(false); } },
                { icon: "🎨", label: "Personnalisation",    soon: true },
                { icon: "👤", label: "Droits utilisateurs", soon: true },
                { icon: "🔔", label: "Notifications",       soon: true },
              ].map((item, i) => (
                <button key={i} onClick={!item.soon ? item.action : undefined} className={!item.soon ? "pf-menu-item" : ""} style={{ width: "100%", background: "none", border: "none", borderRadius: 10, padding: "9px 12px", color: item.soon ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.85)", fontSize: 13, cursor: item.soon ? "default" : "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", transition: "background .15s" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.soon && <span style={{ background: "rgba(255,255,255,.08)", borderRadius: 6, padding: "1px 7px", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.35)" }}>bientôt</span>}
                </button>
              ))}

              {/* Section : Compte */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", margin: "6px 0", padding: "8px 12px 4px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".8px" }}>COMPTE</div>
              </div>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: currentUser.color + "33", border: `2px solid ${currentUser.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{currentUser.avatar}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{currentUser.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{currentUser.email}</div>
                </div>
              </div>
              <button onClick={() => { setOpen(false); onLogout(); }} className="pf-menu-item" style={{ width: "100%", background: "rgba(255,59,59,.1)", border: "1px solid rgba(255,59,59,.25)", borderRadius: 10, padding: "9px 12px", color: "#FF8080", fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontFamily: "inherit", transition: "background .15s", marginTop: 2 }}>
                <span style={{ fontSize: 16 }}>🚪</span> Se déconnecter
              </button>
            </div>
          )}
        </div>

        {/* Logo */}
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#6C63FF,#FF6B6B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: "0 4px 18px rgba(108,99,255,.5)" }}>🚀</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.5px" }}>ProjectFlow</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncing ? "#FF8C00" : "#32CD32", animation: syncing ? "pulse 1s infinite" : "none", boxShadow: `0 0 7px ${syncing ? "#FF8C00" : "#32CD32"}` }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{syncing ? "Synchro…" : lastSync ? lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "En direct"}</span>
          </div>
        </div>
      </div>

      {/* Droite : Filtres + Nouveau + Identité */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12 }}>🔎</span>
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Rechercher…" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, padding: "7px 12px 7px 28px", color: "#fff", fontSize: 12, outline: "none", width: 145 }} />
        </div>
        <select value={filtPrio || ""} onChange={e => onFiltPrio(e.target.value || null)} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none", cursor: "pointer" }}>
          <option value="">Toutes priorités</option>
          {PRIORITIES.map(p => <option key={p.label} value={p.label}>{p.icon} {p.label}</option>)}
        </select>
        <select value={filtMember || ""} onChange={e => onFiltMember(e.target.value ? parseInt(e.target.value) : null)} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 11, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none", cursor: "pointer" }}>
          <option value="">Tous les membres</option>
          {ACCOUNTS.map(m => <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
        </select>
        <button onClick={onCreate} className="pf-btn-primary" style={{ background: "linear-gradient(135deg,#6C63FF,#FF6B6B)", border: "none", borderRadius: 11, padding: "8px 15px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 4px 18px rgba(108,99,255,.4)", whiteSpace: "nowrap", transition: "transform .15s" }}>
          ＋ Nouveau ticket
        </button>

        {/* Badge identité */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: currentUser.color + "22", border: `2px solid ${currentUser.color}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
          <span style={{ fontSize: 15 }}>{currentUser.avatar}</span>
          <span>{currentUser.name}</span>
          {newCount > 0 && <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FF3B3B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, animation: "badgePulse 1.5s infinite" }}>{newCount}</div>}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// 8. KANBAN — Colonnes + Cartes tickets
// ============================================================

/** Carte d'un ticket dans le Kanban */
function TicketCard({ ticket, currentUser, isDragging, isNew, onEdit, onWorkflow, onShare, onTransfer, onDragStart, onDragEnd }) {
  const prio   = getPriority(ticket.priority);
  const member = getMember(ticket.assignee);
  const ismine = ticket.assignee === currentUser.id;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, ticket)}
      onDragEnd={onDragEnd}
      className={!isDragging ? "pf-card" : ""}
      style={{ background: isNew ? "rgba(255,59,59,.1)" : ismine ? `${currentUser.color}15` : "rgba(255,255,255,.07)", border: `1px solid ${isNew ? "#FF3B3B66" : ismine ? currentUser.color + "44" : isDragging ? "#6C63FF" : "rgba(255,255,255,.1)"}`, borderRadius: 13, padding: "10px 12px", cursor: "grab", opacity: isDragging ? 0.5 : 1, transform: isDragging ? "rotate(2deg)" : "none", transition: "all .15s", position: "relative", overflow: "hidden" }}
    >
      {/* Bande de priorité à gauche */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: prio.color, borderRadius: "13px 0 0 13px" }} />

      {/* Badge NEW */}
      {isNew && <div style={{ position: "absolute", top: 8, right: 8, background: "#FF3B3B", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 800, color: "#fff" }}>NEW</div>}

      <div style={{ paddingLeft: 7 }}>
        {/* Titre + ID */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, flex: 1, paddingRight: isNew ? 30 : 0 }}>{ticket.title}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", marginLeft: 6 }}>#{ticket.id}</div>
        </div>

        {/* Description courte */}
        {ticket.description && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 6, lineHeight: 1.4 }}>
            {ticket.description.length > 55 ? ticket.description.slice(0, 55) + "…" : ticket.description}
          </div>
        )}

        {/* Pièces jointes */}
        {ticket.attachments?.length > 0 && (
          <div style={{ fontSize: 10, color: "#A8A0FF", marginBottom: 5 }}>
            📎 {ticket.attachments.length} pièce{ticket.attachments.length > 1 ? "s" : ""} jointe{ticket.attachments.length > 1 ? "s" : ""}
          </div>
        )}

        {/* Tags */}
        {ticket.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
            {ticket.tags.map(tag => <span key={tag} style={{ background: "rgba(108,99,255,.25)", border: "1px solid rgba(108,99,255,.4)", borderRadius: 5, padding: "1px 6px", fontSize: 9, color: "#A8A0FF", fontWeight: 600 }}>{tag}</span>)}
          </div>
        )}

        {/* Priorité + Actions + Assigné */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <PriorityBadge priority={ticket.priority} />
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button onClick={e => { e.stopPropagation(); onWorkflow(ticket); }} style={{ background: "rgba(108,99,255,.3)", border: "1px solid rgba(108,99,255,.4)", borderRadius: 6, padding: "3px 6px", fontSize: 10, color: "#A8A0FF", cursor: "pointer" }}>🔄</button>
            <button onClick={e => { e.stopPropagation(); onShare(ticket); }}    style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "3px 6px", fontSize: 10, cursor: "pointer" }}>🔗</button>
            <button onClick={e => { e.stopPropagation(); onEdit(ticket); }}     style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "3px 6px", fontSize: 10, cursor: "pointer" }}>✏️</button>
            <Avatar member={member} size={20} />
          </div>
        </div>

        {/* Transfert rapide (visible seulement si le ticket m'est assigné) */}
        {ismine && ticket.status !== "Terminé" && (
          <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 7 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", marginBottom: 5, fontWeight: 700 }}>TRANSFÉRER À</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {ACCOUNTS.filter(m => m.id !== currentUser.id).map(m => (
                <button key={m.id}
                  onClick={e => { e.stopPropagation(); onTransfer(ticket, m.id); }}
                  style={{ background: m.color + "22", border: `1px solid ${m.color}44`, borderRadius: 20, padding: "3px 8px", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, transition: "all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = m.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = m.color + "44"}
                >
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

/** Colonne du Kanban */
function KanbanColumn({ column, tickets, currentUser, draggingId, isOver, isNewForMe, onEdit, onWorkflow, onShare, onTransfer, onDragStart, onDragEnd, onDragOver, onDrop, onDragLeave }) {
  const cfg = COL_CFG[column];
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      style={{ minWidth: 262, flex: "1 1 262px", maxWidth: 315, background: isOver ? `${cfg.color}22` : "rgba(255,255,255,.04)", border: `2px solid ${isOver ? cfg.color : "rgba(255,255,255,.08)"}`, borderRadius: 18, padding: 13, transition: "all .2s", backdropFilter: "blur(10px)" }}
    >
      {/* En-tête colonne */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>{cfg.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: cfg.color }}>{column}</span>
        </div>
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}55`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: cfg.color }}>{tickets.length}</div>
      </div>

      {/* Cartes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            currentUser={currentUser}
            isDragging={draggingId === ticket.id}
            isNew={isNewForMe(ticket)}
            onEdit={onEdit}
            onWorkflow={onWorkflow}
            onShare={onShare}
            onTransfer={onTransfer}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {tickets.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 11, borderRadius: 11, border: "2px dashed rgba(255,255,255,.08)" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📭</div>Glissez un ticket ici
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================
// 9. BOARD — Composant principal du tableau
// ============================================================

function Board({ currentUser, onLogout }) {
  // ── Données & stockage
  const { tickets, nextId, loading, syncing, lastSync, persist } = useTicketStorage();

  // ── Notifications
  const { alertModal, setAlertModal, newTickets, isNewForMe } = useNotifications(currentUser, tickets, loading);

  // ── UI state
  const [modal,        setModal]        = useState(null);      // { type: 'ticket'|'workflow'|'share'|'settings', data? }
  const [draggingId,   setDraggingId]   = useState(null);
  const [dragOver,     setDragOver]     = useState(null);
  const [search,       setSearch]       = useState("");
  const [filtPrio,     setFiltPrio]     = useState(null);
  const [filtMember,   setFiltMember]   = useState(null);

  const dragRef = useRef(null);

  // ── Tickets filtrés selon la recherche et les filtres
  const filtered = tickets.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (!filtPrio || t.priority === filtPrio) && (!filtMember || t.assignee === filtMember);
  });

  // ── Mes tickets en attente
  const myTickets = tickets.filter(t => t.assignee === currentUser.id && t.status !== "Terminé");

  // ── Helpers d'ouverture de modals
  const openCreateModal  = () => setModal({ type: "ticket", data: { title: "", description: "", status: "À faire", priority: "Moyenne", assignee: currentUser.id, tags: [], attachments: [], history: [], createdAt: Date.now(), assignedAt: Date.now() } });
  const openEditModal    = (ticket) => setModal({ type: "ticket", data: ticket });
  const openWorkflowModal = (ticket) => setModal({ type: "workflow", data: ticket });
  const openShareModal   = (ticket) => setModal({ type: "share", data: ticket });
  const closeModal       = () => setModal(null);

  // ── Sauvegarde d'un ticket (création ou modification)
  const handleSaveTicket = async (form) => {
    const isCreate = !form.id;
    let list, nid;
    if (isCreate) {
      const hist = [{ date: Date.now(), member: currentUser.id, action: "Ticket créé" }];
      list = [...tickets, { ...form, id: nextId, history: hist }];
      nid  = nextId + 1;
    } else {
      list = tickets.map(t => t.id === form.id ? { ...form } : t);
      nid  = nextId;
    }
    closeModal();
    await persist(list, nid);
  };

  // ── Suppression d'un ticket
  const handleDeleteTicket = async (id) => {
    closeModal();
    await persist(tickets.filter(t => t.id !== id), nextId);
  };

  // ── Transfert rapide depuis la carte
  const handleQuickTransfer = async (ticket, targetId) => {
    const target = getMember(targetId);
    const hist   = { date: Date.now(), member: currentUser.id, action: `Transféré à ${target?.avatar} ${target?.name}` };
    await persist(
      tickets.map(t => t.id !== ticket.id ? t : { ...t, assignee: targetId, assignedAt: Date.now(), history: [...(t.history || []), hist] }),
      nextId
    );
  };

  // ── Application d'un workflow
  const handleApplyWorkflow = async ({ ticket, action, targetMemberId, note }) => {
    const target = getMember(targetMemberId);
    const label  = action.label + (target ? ` → ${target.avatar} ${target.name}` : "");
    const hist   = { date: Date.now(), member: currentUser.id, action: label, note: note || null };
    closeModal();
    await persist(
      tickets.map(t => t.id !== ticket.id ? t : { ...t, assignee: targetMemberId, assignedAt: Date.now(), status: action.targetStatus || t.status, history: [...(t.history || []), hist] }),
      nextId
    );
  };

  // ── Drag & Drop
  const handleDragStart = (e, ticket) => { dragRef.current = ticket; setDraggingId(ticket.id); };
  const handleDragEnd   = () => { dragRef.current = null; setDraggingId(null); setDragOver(null); };
  const handleDrop = async (col) => {
    if (dragRef.current && dragRef.current.status !== col) {
      const hist = { date: Date.now(), member: currentUser.id, action: `Déplacé vers « ${col} »` };
      await persist(
        tickets.map(t => t.id !== dragRef.current.id ? t : { ...t, status: col, history: [...(t.history || []), hist] }),
        nextId
      );
    }
    setDragOver(null);
  };

  // ── Réinitialisation du tableau
  const handleReset = async () => {
    if (!confirm("Réinitialiser le tableau ? Toutes les données seront perdues.")) return;
    await persist(DEFAULT_TICKETS, 6);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F0C29,#302B63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#fff", fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ fontSize: 48, animation: "spin 1s linear infinite" }}>🚀</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Chargement du tableau…</div>
    </div>
  );

  return (
    <div
      style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F0C29 0%,#302B63 50%,#24243e 100%)", fontFamily: "'Nunito','Segoe UI',sans-serif", color: "#fff", overflowX: "hidden" }}
      onMouseDown={() => {/* fermeture hamburger gérée dans BoardHeader */}}
    >
      <style>{GLOBAL_CSS}</style>

      {/* ── Alerte connexion */}
      {alertModal && newTickets.length > 0 && (
        <AlertModal
          currentUser={currentUser}
          tickets={newTickets}
          onViewTicket={(t) => { setAlertModal(false); openEditModal(t); }}
          onClose={() => setAlertModal(false)}
        />
      )}

      {/* ── Header */}
      <BoardHeader
        currentUser={currentUser}
        syncing={syncing}
        lastSync={lastSync}
        myTickets={myTickets}
        search={search}
        filtPrio={filtPrio}
        filtMember={filtMember}
        isNewForMe={isNewForMe}
        onSearch={setSearch}
        onFiltPrio={setFiltPrio}
        onFiltMember={setFiltMember}
        onCreate={openCreateModal}
        onLogout={onLogout}
        onSettings={() => setModal({ type: "settings" })}
        onFilterMyTickets={() => setFiltMember(currentUser.id)}
        onFilterAll={() => setFiltMember(null)}
      />

      {/* ── Bannière tickets assignés */}
      {myTickets.length > 0 && (
        <div style={{ background: `linear-gradient(90deg,${currentUser.color}18,transparent)`, borderBottom: `1px solid ${currentUser.color}33`, padding: "8px 22px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>{currentUser.avatar}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>
            <strong style={{ color: currentUser.color }}>À vous de jouer !</strong> — {myTickets.length} ticket{myTickets.length > 1 ? "s" : ""} en attente
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {myTickets.slice(0, 3).map(t => (
              <button key={t.id} onClick={() => openEditModal(t)} style={{ background: isNewForMe(t) ? "#FF3B3B33" : currentUser.color + "22", border: `1px solid ${isNewForMe(t) ? "#FF3B3B" : currentUser.color + "55"}`, borderRadius: 8, padding: "3px 10px", color: isNewForMe(t) ? "#FF8080" : currentUser.color, fontSize: 11, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                {isNewForMe(t) && <span style={{ fontSize: 8, background: "#FF3B3B", color: "#fff", borderRadius: 4, padding: "1px 4px", fontWeight: 800 }}>NEW</span>}
                #{t.id} {t.title.slice(0, 18)}{t.title.length > 18 ? "…" : ""}
              </button>
            ))}
            {myTickets.length > 3 && <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", alignSelf: "center" }}>+{myTickets.length - 3}</span>}
          </div>
          <button onClick={() => setAlertModal(true)} style={{ marginLeft: "auto", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "3px 10px", color: "rgba(255,255,255,.5)", fontSize: 11, cursor: "pointer" }}>🔔 Alertes</button>
        </div>
      )}

      {/* ── Bannière partagé */}
      <div style={{ background: "rgba(108,99,255,.07)", borderBottom: "1px solid rgba(108,99,255,.15)", padding: "7px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>👥 <strong style={{ color: "#A8A0FF" }}>Tableau partagé</strong> — Synchronisation automatique toutes les 3 s</span>
        <button onClick={handleReset} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "3px 10px", color: "rgba(255,255,255,.35)", fontSize: 10, cursor: "pointer" }}>♻️ Réinitialiser</button>
      </div>

      {/* ── Stats */}
      <div style={{ padding: "11px 22px", display: "flex", gap: 8, overflowX: "auto" }}>
        {COLUMNS.map(col => {
          const cfg = COL_CFG[col];
          const cnt = filtered.filter(t => t.status === col).length;
          return (
            <div key={col} style={{ background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 11, padding: "7px 13px", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <span>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{col}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: cfg.color }}>{cnt}</div>
              </div>
            </div>
          );
        })}
        <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, padding: "7px 13px", display: "flex", alignItems: "center", gap: 7 }}>
          <span>🎯</span>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>Total</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{filtered.length}</div>
          </div>
        </div>
      </div>

      {/* ── Colonnes Kanban */}
      <div style={{ display: "flex", gap: 12, padding: "4px 22px 32px", overflowX: "auto", alignItems: "flex-start" }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col}
            column={col}
            tickets={filtered.filter(t => t.status === col)}
            currentUser={currentUser}
            draggingId={draggingId}
            isOver={dragOver === col}
            isNewForMe={isNewForMe}
            onEdit={openEditModal}
            onWorkflow={openWorkflowModal}
            onShare={openShareModal}
            onTransfer={handleQuickTransfer}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
            onDrop={() => handleDrop(col)}
            onDragLeave={() => setDragOver(null)}
          />
        ))}
      </div>

      {/* ── Modals */}
      {modal?.type === "ticket" && (
        <TicketModal
          ticket={modal.data}
          currentUser={currentUser}
          onSave={handleSaveTicket}
          onDelete={handleDeleteTicket}
          onClose={closeModal}
          onOpenWorkflow={openWorkflowModal}
          onOpenShare={openShareModal}
        />
      )}
      {modal?.type === "workflow" && (
        <WorkflowModal
          ticket={modal.data}
          currentUser={currentUser}
          onApply={handleApplyWorkflow}
          onClose={closeModal}
        />
      )}
      {modal?.type === "share" && (
        <ShareModal ticket={modal.data} onClose={closeModal} />
      )}
      {modal?.type === "settings" && (
        <SettingsModal currentUser={currentUser} onClose={closeModal} />
      )}
    </div>
  );
}


// ============================================================
// 10. APP — Point d'entrée, gestion de la session utilisateur
// ============================================================

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Vérifie si une session existe déjà au chargement
  useEffect(() => {
    const saved = sessionStorage.getItem("pf-user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (ACCOUNTS.find(a => a.id === user.id)) setCurrentUser(user);
      } catch (_) {}
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (account) => {
    // On ne stocke jamais le mot de passe en session
    const safeUser = { id: account.id, name: account.name, avatar: account.avatar, color: account.color, email: account.email };
    sessionStorage.setItem("pf-user", JSON.stringify(safeUser));
    setCurrentUser(safeUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("pf-user");
    setCurrentUser(null);
  };

  if (!authChecked) return null;
  if (!currentUser)  return <LoginPage onLogin={handleLogin} />;
  return <Board currentUser={currentUser} onLogout={handleLogout} />;
}
