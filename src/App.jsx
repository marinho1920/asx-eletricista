import { useState, useEffect, useMemo, useRef, useId, createContext, useContext } from "react";
import { Zap, Plus, X, MapPin, User, Clock, Trash2, Check, ChevronLeft, ChevronRight, Users, Lock, LogOut, ShieldCheck, Eye, EyeOff, Ban, KeyRound, ClipboardList, Settings, Palette, Building2, Bell } from "lucide-react";
import { storageGet, storageSet, ouvirPedidosPendentes, atualizarStatusPedido, entrar, registrar, sair, ouvirAuth, recuperarSenha, entrarComoVisitante } from "./firebase.js";
import { LocalNotifications } from "@capacitor/local-notifications";
import Onboarding from "./components/Onboarding";
const STATUS = {
  agendado: { label: "Agendado", color: "#8A93A3", glow: "none" },
  andamento: { label: "Em andamento", color: "var(--accent, #F2B705)", glow: "0 0 10px var(--accent-88, #F2B70588)" },
  concluido: { label: "Concluído", color: "#2DD4BF", glow: "0 0 10px #2DD4BF88" },
  urgente: { label: "Urgência", color: "#E85D4E", glow: "0 0 10px #E85D4E88" },
};
const STATUS_ORDER = ["agendado", "andamento", "concluido", "urgente"];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function fmtBRL(v) {
  const n = parseFloat(v);
  if (!n && n !== 0) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDateKey(d) {
  return d.toISOString().slice(0, 10);
}
function fmtDateLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("pt-BR", { weekday: "short" });
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} · ${weekday}`;
}
function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const inputStyle = {
  width: "100%",
  background: "#12161D",
  border: "1px solid #2A3140",
  color: "#F5F6F7",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 11.5, color: "#8A93A3", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</label>
      {children}
    </div>
  );
}

// ---- Teclado personalizado ----
const KeyboardCtx = createContext(null);
function useKeyboardCtx() {
  return useContext(KeyboardCtx);
}

function KeyboardProvider({ children }) {
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("abc");
  const [shift, setShift] = useState(false);
  const registry = useRef({});
  const [enabled, setEnabledState] = useState(() => {
    try {
      const saved = localStorage.getItem("teclado-proprio");
      return saved === null ? true : saved === "true";
    } catch (e) {
      return true;
    }
  });
  function setEnabled(v) {
    setEnabledState(v);
    try {
      localStorage.setItem("teclado-proprio", v ? "true" : "false");
    } catch (e) {}
  }

  const THEMES = {
    ambar: { accent: "var(--accent, #F2B705)", dark: "var(--accent-dark, #C9950A)" },
    turquesa: { accent: "#2DD4BF", dark: "#17A398" },
    vermelho: { accent: "#E85D4E", dark: "#B8382B" },
    azul: { accent: "#4E8DE8", dark: "#2E63B8" },
  };
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem("tema-app") || "ambar";
    } catch (e) {
      return "ambar";
    }
  });
  function setTheme(t) {
    setThemeState(t);
    try {
      localStorage.setItem("tema-app", t);
    } catch (e) {}
  }
  const alphasTema = ["12", "18", "33", "44", "55", "66", "88"];
  const temaAtual = THEMES[theme] || THEMES.ambar;
  const cssVarsTema = ":root { --accent: " + temaAtual.accent + "; --accent-dark: " + temaAtual.dark + "; " + alphasTema.map((a) => "--accent-" + a + ": " + temaAtual.accent + a + ";").join(" ") + " }";

  function registerField(id, entry) {
    registry.current[id] = entry;
  }
  function unregisterField(id) {
    delete registry.current[id];
    setActiveId((cur) => (cur === id ? null : cur));
  }
  function openField(id, opts) {
    setActiveId(id);
    setTab(opts && opts.numeric ? "num" : "abc");
    setShift(false);
  }
  function closeKeyboard() {
    setActiveId(null);
  }
  function currentEntry() {
    return activeId ? registry.current[activeId] : null;
  }
  function insertChar(ch) {
    const entry = currentEntry();
    if (!entry) return;
    let next = (entry.value || "") + ch;
    if (entry.maxLength && next.length > entry.maxLength) return;
    entry.onChange(next);
  }
  function backspace() {
    const entry = currentEntry();
    if (!entry) return;
    entry.onChange((entry.value || "").slice(0, -1));
  }
  function insertSpace() {
    insertChar(" ");
  }

  const ctx = { activeId, tab, setTab, shift, setShift, registerField, unregisterField, openField, closeKeyboard, insertChar, backspace, insertSpace, enabled, setEnabled, theme, setTheme, THEMES };

  return (
    <KeyboardCtx.Provider value={ctx}>
      <style>{cssVarsTema}</style>
      {children}
      <CustomKeyboard />
    </KeyboardCtx.Provider>
  );
}

function KeyboardField({ value, onChange, placeholder, style, numeric, mono, uppercase, multiline, maxLength }) {
  const id = useId();
  const ctx = useKeyboardCtx();

  if (ctx.enabled === false) {
    const Tag = multiline ? "textarea" : "input";
    return (
      <Tag
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        maxLength={maxLength}
        style={{
          ...inputStyle,
          fontFamily: mono ? "monospace" : undefined,
          letterSpacing: mono ? 2 : undefined,
          fontWeight: mono ? 700 : undefined,
          textTransform: uppercase ? "uppercase" : undefined,
          resize: multiline ? "vertical" : undefined,
          ...style,
        }}
      />
    );
  }

  ctx.registerField(id, { value: value || "", onChange, numeric, maxLength });
  useEffect(() => () => ctx.unregisterField(id), []); // eslint-disable-line

  const isActive = ctx.activeId === id;
  const raw = value || "";
  const display = uppercase ? raw.toUpperCase() : raw;

  return (
    <div
      onClick={() => ctx.openField(id, { numeric })}
      tabIndex={0}
      style={{
        ...inputStyle,
        display: "flex",
        alignItems: multiline ? "flex-start" : "center",
        minHeight: multiline ? 60 : undefined,
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        overflow: multiline ? "auto" : "hidden",
        fontFamily: mono ? "monospace" : undefined,
        letterSpacing: mono ? 2 : undefined,
        fontWeight: mono ? 700 : undefined,
        border: isActive ? "1px solid var(--accent-88, #F2B70588)" : inputStyle.border,
        cursor: "text",
        ...style,
      }}
    >
      {display ? <span>{display}</span> : <span style={{ color: "#5A6472" }}>{placeholder}</span>}
      {isActive && (
        <span style={{ display: "inline-block", width: 1.5, height: 15, background: "var(--accent, #F2B705)", marginLeft: 2, animation: "kbBlink 1s step-end infinite" }} />
      )}
    </div>
  );
}

const KB_ROWS = {
  abc: ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")],
  num: ["1234567890".split(""), "-/:;()R$&@\"".split(""), ".,?!'".split("")],
  sym: ["[]{}#%^*+=".split(""), "_\\|~<>€£¥•".split(""), ".,?!'".split("")],
};

function CustomKeyboard() {
  const ctx = useKeyboardCtx();
  if (!ctx || !ctx.activeId) return null;
  const rows = KB_ROWS[ctx.tab];

  function charFor(c) {
    if (ctx.tab !== "abc") return c;
    return ctx.shift ? c : c.toLowerCase();
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "#181D26",
        borderTop: "1px solid #2A3140",
        padding: "10px 8px calc(10px + env(safe-area-inset-bottom, 0px))",
        zIndex: 200,
        boxShadow: "0 -8px 24px #0006",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes kbBlink { 0%, 50% { opacity: 1 } 51%, 100% { opacity: 0 } }
        .kb-key { background: #262D3A; border: none; color: #F5F6F7; border-radius: 6px; padding: 11px 0; font-size: 14px; font-weight: 600; cursor: pointer; flex: 1; }
        .kb-key:active { background: #323B4A; }
        .kb-row { display: flex; gap: 5px; margin-bottom: 5px; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 2px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => ctx.setTab("abc")} className="kb-key" style={{ flex: "none", padding: "6px 14px", background: ctx.tab === "abc" ? "var(--accent, #F2B705)" : "#232A36", color: ctx.tab === "abc" ? "#14181F" : "#8A93A3" }}>
            ABC
          </button>
          <button onClick={() => ctx.setTab("num")} className="kb-key" style={{ flex: "none", padding: "6px 14px", background: ctx.tab === "num" ? "var(--accent, #F2B705)" : "#232A36", color: ctx.tab === "num" ? "#14181F" : "#8A93A3" }}>
            123
          </button>
          <button onClick={() => ctx.setTab("sym")} className="kb-key" style={{ flex: "none", padding: "6px 14px", background: ctx.tab === "sym" ? "var(--accent, #F2B705)" : "#232A36", color: ctx.tab === "sym" ? "#14181F" : "#8A93A3" }}>
            #+=
          </button>
        </div>
        <button onClick={ctx.closeKeyboard} style={{ background: "none", border: "none", color: "#8A93A3", padding: 6 }}>
          <X size={16} />
        </button>
      </div>

      {rows.map((row, i) => (
        <div className="kb-row" key={i}>
          {i === 2 && ctx.tab === "abc" && (
            <button className="kb-key" style={{ flex: 1.5, background: ctx.shift ? "var(--accent, #F2B705)" : "#232A36", color: ctx.shift ? "#14181F" : "#F5F6F7" }} onClick={() => ctx.setShift((s) => !s)}>
              ⇧
            </button>
          )}
          {row.map((c) => (
            <button key={c} className="kb-key" onClick={() => ctx.insertChar(charFor(c))}>
              {charFor(c)}
            </button>
          ))}
          {i === 2 && (
            <button className="kb-key" style={{ flex: 1.5 }} onClick={ctx.backspace}>
              ⌫
            </button>
          )}
        </div>
      ))}

      <div className="kb-row">
        <button className="kb-key" style={{ flex: 1.3 }} onClick={() => ctx.setTab(ctx.tab === "abc" ? "num" : "abc")}>
          {ctx.tab === "abc" ? "123" : "ABC"}
        </button>
        <button className="kb-key" style={{ flex: 4 }} onClick={ctx.insertSpace}>
          espaço
        </button>
        <button className="kb-key" style={{ flex: 1.7, background: "var(--accent, #F2B705)", color: "#14181F" }} onClick={ctx.closeKeyboard}>
          Concluído
        </button>
      </div>
    </div>
  );
}
// ---- fim teclado personalizado ----
async function criarContaOnboarding({ email, senha, visitante }) {
    if (visitante) {
        await entrarComoVisitante();
          } else {
              await registrar(email.trim(), senha);
                }
                  localStorage.setItem("onboardingCompleto", "true");
                  
}
export default function App() {
  return (
    <KeyboardProvider>
      <AppInner />
    </KeyboardProvider>
  );
}

function AppInner() {
  const [booting, setBooting] = useState(true);
  const [accounts, setAccounts] = useState(null); // null = not loaded yet
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [removedAccounts, setRemovedAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState("home"); // home | login | membros
  const [pendingAdmin, setPendingAdmin] = useState(false);
  const [restrictedMsg, setRestrictedMsg] = useState(false);
  const [authUser, setAuthUser] = useState(undefined);

  useEffect(() => {
    const unsub = ouvirAuth((user) => setAuthUser(user || null));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!authUser || !accounts) return;
    if (accounts.length === 0) {
      const apelido = authUser.email ? authUser.email.split("@")[0] : "Dono";
      persistAccounts([{ id: authUser.uid, uid: authUser.uid, nome: apelido, papel: "dono", aprovado: true, bloqueado: false }]);
      return;
    }
    if (accounts.length === 1) {
      const conta = accounts[0];
      if (conta.uid !== authUser.uid) {
        persistAccounts([{ ...conta, uid: authUser.uid, id: authUser.uid }]);
      }
    }
  }, [authUser, accounts]);

  useEffect(() => {
    (async () => {
      let a = null;
      for (let tentativa = 0; tentativa < 4 && !a; tentativa++) {
        try {
          a = await storageGet("contas");
        } catch (e) {
          a = null;
        }
        if (!a && tentativa < 3) {
          await new Promise((r) => setTimeout(r, 600 * (tentativa + 1)));
        }
      }
      setAccounts(a ? JSON.parse(a) : []);
      try {
        const j = await storageGet("servicos");
        if (j) setJobs(JSON.parse(j));
      } catch (e) {}
      try {
        const r = await storageGet("recuperacoes");
        if (r) setRequests(JSON.parse(r));
      } catch (e) {}
      try {
        const rm = await storageGet("contas_removidas");
        if (rm) setRemovedAccounts(JSON.parse(rm));
      } catch (e) {}
      setBooting(false);
    })();
  }, []);

  async function persistAccounts(next) {
    setAccounts(next);
    try {
      await storageSet("contas", JSON.stringify(next));
    } catch (e) {
      setError("Não consegui salvar as contas. Tente de novo.");
    }
  }

  async function persistJobs(next) {
    setJobs(next);
    try {
      const ok = await storageSet("servicos", JSON.stringify(next));
      if (!ok) setError("Não consegui salvar. Tente de novo.");
      else setError(null);
    } catch (e) {
      setError("Não consegui salvar. Tente de novo.");
    }
  }

  async function persistRequests(next) {
    setRequests(next);
    try {
      await storageSet("recuperacoes", JSON.stringify(next));
    } catch (e) {
      setError("Não consegui salvar a solicitação. Tente de novo.");
    }
  }

  async function persistRemovedAccounts(next) {
    setRemovedAccounts(next);
    try {
      await storageSet("contas_removidas", JSON.stringify(next));
    } catch (e) {}
  }

  if (booting || accounts === null || authUser === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "#14181F", color: "#8A93A3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 13 }}>
        Carregando…
      </div>
    );
  }

  const contaAtual = authUser ? accounts.find((a) => a.uid === authUser.uid) : null;

  if (authUser && contaAtual) {
    if (contaAtual.bloqueado) {
      return <ContaBloqueadaScreen onLogout={() => sair()} />;
    }
    if (!contaAtual.aprovado) {
      return <AguardandoAprovacaoScreen nome={contaAtual.nome} onLogout={() => sair()} />;
    }
    return (
      <MainApp
        currentUser={contaAtual}
        onLogout={() => sair()}
        accounts={accounts}
        persistAccounts={persistAccounts}
        jobs={jobs}
        persistJobs={persistJobs}
        requests={requests}
        persistRequests={persistRequests}
        removedAccounts={removedAccounts}
        persistRemovedAccounts={persistRemovedAccounts}
        error={error}
        initialShowAdmin={false}
        onAdminOpened={() => {}}
        restrictedMsg={false}
        onDismissRestricted={() => {}}
      />
    );
  }

  if (authUser && !contaAtual) {
    return <ContaNaoAutorizadaScreen onLogout={() => sair()} debugUid={authUser.uid} debugAccounts={accounts} />;
  }


  if (!authUser && accounts.length === 0 && localStorage.getItem("onboardingCompleto") !== "true") {
      return (
          <Onboarding
                onCreateAccount={criarContaOnboarding}
                      onFinish={() => {}}
                            onGoToLogin={() => setScreen("login")}
                                />
                                  );
                                  }
  if ( "login") {
    return <EmailAuthScreen accounts={accounts} persistAccounts={persistAccounts} onBack={() => setScreen("home")} />;
  }

  if (screen === "membros") {
    return <MembersScreen accounts={accounts} onBack={() => setScreen("home")} />;
  }

  return (
    <HomeScreen
      onLogin={() => setScreen("login")}
      onAdmin={() => setScreen("login")}
      onMembers={() => setScreen("membros")}
    />
  );
}

function HomeScreen({ onLogin, onAdmin, onMembers }) {
  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: "linear-gradient(160deg, var(--accent, #F2B705), var(--accent-dark, #C9950A))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px var(--accent-55, #F2B70555)" }}>
            <Zap size={30} color="#14181F" fill="#14181F" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Painel de Serviços</div>
            <div style={{ fontSize: 12, color: "#8A93A3", letterSpacing: "0.02em", marginTop: 2 }}>ELETRICISTA RESIDENCIAL</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <HomeButton icon={<Lock size={18} />} label="Login" desc="Entrar ou criar conta" onClick={onLogin} primary />
          <HomeButton icon={<ShieldCheck size={18} />} label="Gerenciamento de contas" desc="Área restrita ao dono" onClick={onAdmin} />
          <HomeButton icon={<Users size={18} />} label="Membros" desc="Ver quem faz parte da equipe" onClick={onMembers} />
        </div>
      </div>
    </div>
  );
}

function HomeButton({ icon, label, desc, onClick, primary }) {
  const ctx = useKeyboardCtx();
  const accentColor = (ctx.THEMES[ctx.theme] || ctx.THEMES.ambar).accent;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        background: primary ? accentColor : "#1A202B",
        border: primary ? "none" : "1px solid #262D3A",
        borderRadius: 12,
        padding: "16px 18px",
        color: primary ? "#14181F" : "#F5F6F7",
      }}
    >
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, background: primary ? "#14181F22" : "#232A36", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: primary ? "#14181Fcc" : "#8A93A3", marginTop: 1 }}>{desc}</div>
      </div>
    </button>
  );
}

function MembersScreen({ accounts, onBack }) {
  const active = accounts.filter((a) => !a.bloqueado);
  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8A93A3", fontSize: 13, padding: "10px 0 20px", marginLeft: -2 }}>
          <ChevronLeft size={16} /> Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Users size={18} color="var(--accent, #F2B705)" />
          <div style={{ fontSize: 17, fontWeight: 700 }}>Membros da equipe</div>
        </div>
        {active.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8A93A3" }}>Nenhuma conta cadastrada ainda.</div>
        ) : (
          <div style={{ background: "#1A202B", border: "1px solid #262D3A", borderRadius: 12, overflow: "hidden" }}>
            {active.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid #1F2530" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#232A36", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#C9D0DB" }}>
                  {a.nome.trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.nome}</div>
                {a.papel === "dono" && <span style={{ fontSize: 10, color: "var(--accent, #F2B705)", border: "1px solid var(--accent-55, #F2B70555)", borderRadius: 5, padding: "1px 6px", marginLeft: "auto" }}>DONO</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ accounts, removedAccounts, onCreateOwner, onLogin, onBack, onForgotCode }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupCode, setSetupCode] = useState(genCode());

  const needsSetup = accounts.length === 0;

  function tryLogin() {
    const acc = accounts.find((a) => a.codigo.toUpperCase() === code.trim().toUpperCase());
    if (!acc) {
      const removed = (removedAccounts || []).find((r) => r.codigo.toUpperCase() === code.trim().toUpperCase());
      if (removed) {
        const data = new Date(removed.removidoEm).toLocaleDateString("pt-BR");
        setMsg(`Sua conta (${removed.nome}) foi removida em ${data}. Fale com o dono se tiver dúvidas.`);
      } else {
        setMsg("Código não encontrado.");
      }
      return;
    }
    if (acc.bloqueado) {
      setMsg("Essa conta está bloqueada. Fale com o responsável.");
      return;
    }
    onLogin(acc);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8A93A3", fontSize: 13, padding: "0 0 18px", marginLeft: -2 }}>
          <ChevronLeft size={16} /> Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: "linear-gradient(160deg, var(--accent, #F2B705), var(--accent-dark, #C9950A))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px var(--accent-44, #F2B70544)" }}>
            <Zap size={22} color="#14181F" fill="#14181F" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Painel de Serviços</div>
        </div>

        {needsSetup ? (
          <div style={{ background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <ShieldCheck size={16} color="var(--accent, #F2B705)" />
              <div style={{ fontSize: 14, fontWeight: 700 }}>Primeira vez por aqui</div>
            </div>
            <div style={{ fontSize: 12.5, color: "#8A93A3", marginBottom: 16 }}>Crie sua conta de dono. Você vai poder cadastrar e gerenciar os ajudantes depois.</div>
            <Field label="Seu nome" style={{ marginBottom: 12 }}>
              <KeyboardField value={setupName} onChange={setSetupName} placeholder="Ex: Alexandre" />
            </Field>
            <Field label="Seu código de acesso" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <KeyboardField value={setupCode} onChange={(v) => setSetupCode(v.toUpperCase())} mono uppercase />
                </div>
                <button onClick={() => setSetupCode(genCode())} style={{ background: "#232A36", border: "1px solid #2A3140", borderRadius: 8, padding: "0 12px", color: "#C9D0DB", fontSize: 12 }}>
                  gerar
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#5A6472", marginTop: 6 }}>Guarde esse código — é como você vai entrar da próxima vez.</div>
            </Field>
            <button
              disabled={!setupName.trim() || !setupCode.trim()}
              onClick={() => onCreateOwner(setupName.trim(), setupCode.trim())}
              style={{ width: "100%", background: setupName.trim() ? "var(--accent, #F2B705)" : "#3A4150", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}
            >
              Criar minha conta
            </button>
          </div>
        ) : (
          <div style={{ background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Lock size={16} color="#8A93A3" />
              <div style={{ fontSize: 14, fontWeight: 700 }}>Entrar</div>
            </div>
            <Field label="Código de acesso" style={{ marginBottom: 12 }}>
              <KeyboardField
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setMsg("");
                }}
                placeholder="Ex: 7K2QXZ"
                mono
                uppercase
              />
            </Field>
            {msg && <div style={{ fontSize: 12.5, color: "#E85D4E", marginBottom: 12 }}>{msg}</div>}
            <button onClick={tryLogin} disabled={!code.trim()} style={{ width: "100%", background: code.trim() ? "var(--accent, #F2B705)" : "#3A4150", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
              Entrar
            </button>
            <button onClick={onForgotCode} style={{ width: "100%", background: "none", border: "none", color: "#8A93A3", fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
              Esqueci meu código
            </button>
            <div style={{ fontSize: 11.5, color: "#5A6472", marginTop: 6, textAlign: "center" }}>Ou peça diretamente ao responsável pela equipe.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecoveryScreen({ accounts, requests, persistRequests, onBack }) {
  const [selectedId, setSelectedId] = useState("");
  const [sent, setSent] = useState(false);
  const active = accounts.filter((a) => !a.bloqueado);
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;

  const myPending = selectedId ? requests.find((r) => r.contaId === selectedId && r.status === "pendente") : null;
  const myLastResolved = selectedId
    ? requests.filter((r) => r.contaId === selectedId && r.status !== "pendente").sort((a, b) => (b.resolvidoEm || b.criadoEm) - (a.resolvidoEm || a.criadoEm))[0]
    : null;

  const cooldownUntil = myLastResolved && myLastResolved.status === "negado" ? (myLastResolved.resolvidoEm || 0) + COOLDOWN_MS : 0;
  const inCooldown = cooldownUntil > Date.now();
  const cooldownRemaining = inCooldown ? cooldownUntil - Date.now() : 0;
  const cooldownLabel = inCooldown
    ? (() => {
        const h = Math.floor(cooldownRemaining / 3600000);
        const m = Math.floor((cooldownRemaining % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}min` : `${m}min`;
      })()
    : "";

  function submit() {
    if (!selectedId || myPending || inCooldown) return;
    const acc = accounts.find((a) => a.id === selectedId);
    const req = { id: uid(), contaId: selectedId, nome: acc.nome, status: "pendente", criadoEm: Date.now() };
    persistRequests([...requests, req]);
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8A93A3", fontSize: 13, padding: "0 0 18px", marginLeft: -2 }}>
          <ChevronLeft size={16} /> Voltar
        </button>

        <div style={{ background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <KeyRound size={16} color="var(--accent, #F2B705)" />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Recuperar código</div>
          </div>
          <div style={{ fontSize: 12.5, color: "#8A93A3", marginBottom: 18 }}>
            O código não é enviado automaticamente. O dono precisa aprovar e te passar o novo código pessoalmente.
          </div>

          <Field label="Quem é você?" style={{ marginBottom: 16 }}>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setSent(false);
              }}
              style={inputStyle}
            >
              <option value="">Selecione seu nome</option>
              {active.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </Field>

          {selectedId && myPending && (
            <div style={{ background: "var(--accent-18, #F2B70518)", border: "1px solid var(--accent-44, #F2B70544)", color: "var(--accent, #F2B705)", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
              Já existe uma solicitação pendente pra você. Aguarde o dono aprovar e te passar o novo código.
            </div>
          )}

          {selectedId && !myPending && inCooldown && (
            <div style={{ background: "#E85D4E18", border: "1px solid #E85D4E44", color: "#F5A99E", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
              Seu último pedido foi negado. Você pode solicitar de novo em {cooldownLabel}.
            </div>
          )}

          {selectedId && !myPending && !inCooldown && myLastResolved && myLastResolved.status === "aprovado" && (
            <div style={{ background: "#2DD4BF18", border: "1px solid #2DD4BF44", color: "#2DD4BF", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
              Sua última solicitação foi aprovada. Confira o novo código com o dono, se ainda não recebeu.
            </div>
          )}

          {sent && !myPending ? null : (
            <button
              onClick={submit}
              disabled={!selectedId || !!myPending || inCooldown}
              style={{ width: "100%", background: selectedId && !myPending && !inCooldown ? "var(--accent, #F2B705)" : "#3A4150", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}
            >
              Enviar solicitação ao dono
            </button>
          )}

          {sent && (
            <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 12, textAlign: "center" }}>
              Solicitação enviada. Fale com o dono quando ele aprovar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MainApp({ currentUser, onLogout, accounts, persistAccounts, jobs, persistJobs, requests, persistRequests, removedAccounts, persistRemovedAccounts, error, initialShowAdmin, onAdminOpened, restrictedMsg, onDismissRestricted }) {
  const isOwner = currentUser.papel === "dono";
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterPerson, setFilterPerson] = useState("Todos");
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPedidos, setShowPedidos] = useState(false);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  useEffect(() => {
    (async () => {
      const v = await storageGet("config");
      if (v) {
        const cfg = JSON.parse(v);
        if (typeof cfg.notificacoes === "boolean") setNotificacoesAtivas(cfg.notificacoes);
      }
    })();
  }, []);

  async function persistConfig(partial) {
    const v = await storageGet("config");
    const atual = v ? JSON.parse(v) : {};
    await storageSet("config", JSON.stringify({ ...atual, ...partial }));
  }

  useEffect(() => {
    if (!isOwner) return;
    LocalNotifications.requestPermissions().catch(() => {});
    let prevIds = null;
    const unsub = ouvirPedidosPendentes((lista) => {
      if (prevIds !== null && notificacoesAtivas) {
        const novos = lista.filter((p) => !prevIds.includes(p.id));
        if (novos.length > 0) {
          LocalNotifications.schedule({
            notifications: novos.map((p, i) => ({
              id: Math.floor(Date.now() / 1000) + i,
              title: "Novo pedido de orcamento",
              body: p.nome + " solicitou: " + p.servico,
            })),
          }).catch((e) => console.error("Erro ao notificar:", e));
        }
      }
      prevIds = lista.map((p) => p.id);
      setPedidosPendentes(lista);
    });
    return () => unsub && unsub();
  }, [isOwner, notificacoesAtivas]);

  useEffect(() => {
    if (initialShowAdmin) {
      setShowAdmin(true);
      onAdminOpened && onAdminOpened();
    }
  }, [initialShowAdmin]);

  const activeAccounts = accounts.filter((a) => !a.bloqueado);

  const emptyForm = {
    cliente: "",
    telefone: "",
    endereco: "",
    servico: "",
    data: fmtDateKey(new Date()),
    hora: "09:00",
    responsavelId: currentUser.id,
    status: "agendado",
    valor: "",
    obs: "",
  };
  const [form, setForm] = useState(emptyForm);

  function accountName(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? a.nome : "—";
  }

  function canEdit(job) {
    return isOwner || job.responsavelId === currentUser.id;
  }

  function openNew(dateKey) {
    setForm({ ...emptyForm, data: dateKey || fmtDateKey(new Date()) });
    setEditingId(null);
    setShowForm(true);
  }
  function openView(job) {
    if (!canEdit(job)) return;
    setForm(job);
    setEditingId(job.id);
    setShowForm(true);
  }
  function saveForm() {
    if (!form.cliente.trim() || !form.data) return;
    if (editingId) {
      persistJobs(jobs.map((j) => (j.id === editingId ? { ...form, id: editingId } : j)));
    } else {
      persistJobs([...jobs, { ...form, id: uid() }]);
    }
    setShowForm(false);
  }
  function removeJob(id) {
    persistJobs(jobs.filter((j) => j.id !== id));
  }
  async function aceitarPedido(pedido) {
    const novoServico = {
      cliente: pedido.nome,
      telefone: pedido.telefone,
      endereco: pedido.endereco,
      servico: pedido.servico,
      data: pedido.data,
      hora: pedido.hora,
      responsavelId: currentUser.id,
      status: "agendado",
      valor: "",
      obs: "Pedido feito pelo cliente via site de orcamento",
    };
    await persistJobs([...jobs, { ...novoServico, id: uid() }]);
    await atualizarStatusPedido(pedido.id, "aceito");
  }
  async function recusarPedido(pedido) {
    await atualizarStatusPedido(pedido.id, "recusado");
  }
  function cycleStatus(job) {
    if (!canEdit(job)) return;
    const idx = STATUS_ORDER.indexOf(job.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    persistJobs(jobs.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
  }

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return fmtDateKey(d);
  }), [weekStart]);

  const filteredJobs = useMemo(() => jobs.filter((j) => filterPerson === "Todos" || j.responsavelId === filterPerson), [jobs, filterPerson]);
  const jobsByDay = useMemo(() => {
    const map = {};
    for (const key of weekDays) map[key] = [];
    for (const j of filteredJobs) if (map[j.data]) map[j.data].push(j);
    for (const key of weekDays) map[key].sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
    return map;
  }, [filteredJobs, weekDays]);

  const weekTotal = useMemo(() => weekDays.reduce((sum, key) => sum + (jobsByDay[key] || []).reduce((s, j) => s + (parseFloat(j.valor) || 0), 0), 0), [jobsByDay, weekDays]);
  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return `${fmt(weekStart)} – ${fmt(end)}`;
  }, [weekStart]);

  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea { font-family: inherit; }
        button { cursor: pointer; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #2A3140; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      <header style={{ padding: "20px 20px 16px", borderBottom: "1px solid #262D3A", position: "sticky", top: 0, background: "#14181Fee", backdropFilter: "blur(8px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(160deg, var(--accent, #F2B705), var(--accent-dark, #C9950A))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px var(--accent-44, #F2B70544)" }}>
              <Zap size={20} color="#14181F" fill="#14181F" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Painel de Serviços</div>
              <div style={{ fontSize: 11.5, color: "#8A93A3", letterSpacing: "0.02em" }}>
                {currentUser.nome.toUpperCase()} {isOwner && "· DONO"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isOwner && (
              <button title="Pedidos" onClick={() => setShowPedidos(true)} style={{ position: "relative", display: "flex", alignItems: "center", background: "#1E242E", border: "1px solid #2A3140", color: "#C9D0DB", padding: "8px 10px", borderRadius: 8, fontSize: 13 }}>
                <ClipboardList size={15} />
                {pedidosPendentes.length > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -5, background: "#E85D4E", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {pedidosPendentes.length}
                  </span>
                )}
              </button>
            )}
            {isOwner && (
            <button title="Contas" onClick={() => setShowAdmin(true)} style={{ position: "relative", display: "flex", alignItems: "center", background: "#1E242E", border: "1px solid #2A3140", color: "#C9D0DB", padding: "8px 10px", borderRadius: 8, fontSize: 13 }}>
                <Users size={15} />
                {requests.filter((r) => r.status === "pendente").length > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -5, background: "#E85D4E", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {requests.filter((r) => r.status === "pendente").length}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setShowSettings(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", padding: "8px 10px", borderRadius: 8, fontSize: 13 }}>
              <Settings size={15} />
            </button>
            <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", padding: "8px 10px", borderRadius: 8, fontSize: 13 }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 20px 100px" }}>
        {error && (
          <div style={{ background: "#E85D4E22", border: "1px solid #E85D4E55", color: "#F5A99E", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}
        {restrictedMsg && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "var(--accent-18, #F2B70518)", border: "1px solid var(--accent-44, #F2B70544)", color: "var(--accent, #F2B705)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            <span>Gerenciamento de contas é uma área restrita ao dono. Você entrou no app normalmente.</span>
            <button onClick={onDismissRestricted} style={{ background: "none", border: "none", color: "var(--accent, #F2B705)", flexShrink: 0 }}><X size={15} /></button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setWeekOffset((w) => w - 1)} style={{ background: "#1E242E", border: "1px solid #2A3140", borderRadius: 8, padding: 8, color: "#C9D0DB" }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: "center" }}>{weekLabel}</div>
            <button onClick={() => setWeekOffset((w) => w + 1)} style={{ background: "#1E242E", border: "1px solid #2A3140", borderRadius: 8, padding: 8, color: "#C9D0DB" }}>
              <ChevronRight size={16} />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ fontSize: 12, color: "var(--accent, #F2B705)", background: "none", border: "none", marginLeft: 4 }}>
                hoje
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isOwner && weekTotal > 0 && (
              <div style={{ fontSize: 13, color: "#2DD4BF", fontWeight: 700, background: "#2DD4BF15", border: "1px solid #2DD4BF33", borderRadius: 8, padding: "7px 12px" }}>
                {fmtBRL(weekTotal)}
              </div>
            )}
            <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} style={{ background: "#1E242E", border: "1px solid #2A3140", color: "#F5F6F7", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
              <option value="Todos">Todos</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {weekDays.map((dayKey) => {
            const dayJobs = jobsByDay[dayKey];
            const isToday = dayKey === fmtDateKey(new Date());
            return (
              <div key={dayKey} style={{ background: "#1A202B", border: isToday ? "1px solid var(--accent-66, #F2B70566)" : "1px solid #232A36", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: dayJobs.length ? "1px solid #232A36" : "none" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? "var(--accent, #F2B705)" : "#C9D0DB", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                    {fmtDateLabel(dayKey)} {isToday && "· hoje"}
                  </div>
                  <button onClick={() => openNew(dayKey)} style={{ background: "none", border: "none", color: "#8A93A3", display: "flex", alignItems: "center", padding: 4 }}>
                    <Plus size={16} />
                  </button>
                </div>
                {dayJobs.length > 0 && (
                  <div>
                    {dayJobs.map((job) => {
                      const st = STATUS[job.status] || STATUS.agendado;
                      const editable = canEdit(job);
                      return (
                        <div key={job.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid #1F2530", opacity: editable ? 1 : 0.85 }}>
                          <button
                            onClick={() => cycleStatus(job)}
                            title={st.label}
                            disabled={!editable}
                            style={{ flexShrink: 0, width: 14, height: 14, borderRadius: "50%", background: st.color, border: "2px solid #10141B", boxShadow: st.glow, cursor: editable ? "pointer" : "default" }}
                          />
                          <div style={{ flex: 1, minWidth: 0, cursor: editable ? "pointer" : "default" }} onClick={() => openView(job)}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{job.cliente}</span>
                              <span style={{ fontSize: 12, color: "#8A93A3" }}>{job.servico}</span>
                            </div>
                            <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
                              {job.hora && <span style={{ fontSize: 11.5, color: "#8A93A3", display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {job.hora}</span>}
                              {job.endereco && <span style={{ fontSize: 11.5, color: "#8A93A3", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {job.endereco}</span>}
                              <span style={{ fontSize: 11.5, color: "#8A93A3", display: "flex", alignItems: "center", gap: 4 }}><User size={11} /> {accountName(job.responsavelId)}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                            <span style={{ fontSize: 10.5, color: st.color, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" }}>{st.label}</span>
                            {isOwner && fmtBRL(job.valor) && <span style={{ fontSize: 12.5, color: "#C9D0DB", fontWeight: 600 }}>{fmtBRL(job.valor)}</span>}
                          </div>
                          {editable && (
                            <button onClick={() => removeJob(job.id)} style={{ background: "none", border: "none", color: "#5A6472", padding: 4, flexShrink: 0 }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <button
        onClick={() => openNew(fmtDateKey(new Date()))}
        style={{ position: "fixed", bottom: 24, right: 24, width: 54, height: 54, borderRadius: "50%", background: "var(--accent, #F2B705)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px var(--accent-66, #F2B70566)" }}
      >
        <Plus size={24} color="#14181F" strokeWidth={2.5} />
      </button>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1A202B", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", border: "1px solid #262D3A", borderBottom: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #232A36", position: "sticky", top: 0, background: "#1A202B" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{editingId ? "Editar serviço" : "Novo serviço"}</div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#8A93A3" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Cliente"><KeyboardField value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} placeholder="Nome do cliente" /></Field>
              <Field label="Telefone"><KeyboardField value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} placeholder="(27) 9xxxx-xxxx" /></Field>
              <Field label="Endereço"><KeyboardField value={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} placeholder="Rua, bairro" /></Field>
              <Field label="Serviço"><KeyboardField value={form.servico} onChange={(v) => setForm({ ...form, servico: v })} placeholder="Ex: troca de disjuntor" /></Field>
              <div style={{ display: "flex", gap: 12 }}>
                <Field label="Data" style={{ flex: 1 }}><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inputStyle} /></Field>
                <Field label="Hora" style={{ flex: 1 }}><input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} style={inputStyle} /></Field>
              </div>
              {isOwner && (
                <Field label="Valor cobrado (R$)">
                  <KeyboardField value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} placeholder="0,00" numeric />
                </Field>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <Field label="Responsável" style={{ flex: 1 }}>
                  <select value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })} disabled={!isOwner} style={inputStyle}>
                    {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </Field>
                <Field label="Status" style={{ flex: 1 }}>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Observações"><KeyboardField value={form.obs} onChange={(v) => setForm({ ...form, obs: v })} multiline /></Field>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {editingId && (
                  <button onClick={() => { removeJob(editingId); setShowForm(false); }} style={{ background: "#1E242E", border: "1px solid #E85D4E55", color: "#E85D4E", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>
                    Excluir
                  </button>
                )}
                <button
                  onClick={saveForm}
                  disabled={!form.cliente.trim()}
                  style={{ flex: 1, background: form.cliente.trim() ? "var(--accent, #F2B705)" : "#3A4150", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Check size={16} /> {editingId ? "Salvar alterações" : "Adicionar serviço"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPedidos && isOwner && (
        <PedidosPanel pedidos={pedidosPendentes} onAceitar={aceitarPedido} onRecusar={recusarPedido} onClose={() => setShowPedidos(false)} />
      )}

      {showAdmin && isOwner && (
        <AdminPanel accounts={accounts} persistAccounts={persistAccounts} requests={requests} persistRequests={persistRequests} removedAccounts={removedAccounts} persistRemovedAccounts={persistRemovedAccounts} currentUser={currentUser} onClose={() => setShowAdmin(false)} />
      )}

      {showSettings && (
        <SettingsPanel currentUser={currentUser} isOwner={isOwner} onClose={() => setShowSettings(false)} onLogout={onLogout} notificacoesAtivas={notificacoesAtivas} setNotificacoesAtivas={setNotificacoesAtivas} persistConfig={persistConfig} />
      )}
    </div>
  );
}

function AdminPanel({ accounts, persistAccounts, requests, persistRequests, removedAccounts, persistRemovedAccounts, currentUser, onClose }) {
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState(genCode());
  const [revealed, setRevealed] = useState({});
  const [newCodes, setNewCodes] = useState({}); // per-request draft code
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const pending = requests.filter((r) => r.status === "pendente");
  const DENIED_ALERT_THRESHOLD = 3;
  const deniedCounts = {};
  for (const r of requests) {
    if (r.status === "negado") deniedCounts[r.contaId] = (deniedCounts[r.contaId] || 0) + 1;
  }
  const flagged = Object.entries(deniedCounts).filter(([, count]) => count >= DENIED_ALERT_THRESHOLD);

  function addAccount() {
    const name = newName.trim();
    if (!name) return;
    const acc = { id: uid(), nome: name, codigo: newCode, papel: "ajudante", bloqueado: false };
    persistAccounts([...accounts, acc]);
    setNewName("");
    setNewCode(genCode());
  }
  function toggleBlock(id) {
    persistAccounts(accounts.map((a) => (a.id === id ? { ...a, bloqueado: !a.bloqueado } : a)));
  }
  function removeAccount(acc) {
    persistRemovedAccounts([...removedAccounts, { nome: acc.nome, codigo: acc.codigo, removidoEm: Date.now() }]);
    persistAccounts(accounts.filter((a) => a.id !== acc.id));
    setConfirmDeleteId(null);
  }
  function approveRequest(req) {
    const code = (newCodes[req.id] || genCode()).toUpperCase();
    persistAccounts(accounts.map((a) => (a.id === req.contaId ? { ...a, codigo: code } : a)));
    persistRequests(requests.map((r) => (r.id === req.id ? { ...r, status: "aprovado", novoCodigo: code, resolvidoEm: Date.now() } : r)));
    setRevealed((r) => ({ ...r, [req.contaId]: true }));
  }
  function denyRequest(req) {
    persistRequests(requests.map((r) => (r.id === req.id ? { ...r, status: "negado", resolvidoEm: Date.now() } : r)));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1A202B", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: "1px solid #262D3A" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #232A36", position: "sticky", top: 0, background: "#1A202B" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}><ShieldCheck size={17} color="var(--accent, #F2B705)" /> Contas da equipe</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A93A3" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 20 }}>
          {flagged.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E85D4E", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Ban size={13} /> Possível abuso
              </div>
              {flagged.map(([contaId, count]) => {
                const acc = accounts.find((a) => a.id === contaId);
                if (!acc) return null;
                return (
                  <div key={contaId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#E85D4E12", border: "1px solid #E85D4E44", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ fontSize: 12.5, color: "#F5A99E" }}>
                      <strong>{acc.nome}</strong> já teve {count} pedidos de código negados. Considere bloquear a conta.
                    </div>
                    <button
                      onClick={() => toggleBlock(acc.id)}
                      style={{ flexShrink: 0, background: "#E85D4E", border: "none", color: "#fff", borderRadius: 7, padding: "7px 10px", fontSize: 12, fontWeight: 700 }}
                    >
                      Bloquear
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent, #F2B705)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <KeyRound size={13} /> Solicitações de recuperação
              </div>
              {pending.map((req) => (
                <div key={req.id} style={{ background: "var(--accent-12, #F2B70512)", border: "1px solid var(--accent-33, #F2B70533)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{req.nome} pediu um novo código</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <KeyboardField value={newCodes[req.id] ?? genCode()} onChange={(v) => setNewCodes((c) => ({ ...c, [req.id]: v.toUpperCase() }))} mono uppercase />
                    </div>
                    <button onClick={() => setNewCodes((c) => ({ ...c, [req.id]: genCode() }))} style={{ background: "#232A36", border: "1px solid #2A3140", borderRadius: 8, padding: "0 12px", color: "#C9D0DB", fontSize: 12 }}>
                      gerar
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => denyRequest(req)} style={{ flex: 1, background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 600 }}>
                      Negar
                    </button>
                    <button onClick={() => approveRequest(req)} style={{ flex: 2, background: "var(--accent, #F2B705)", border: "none", color: "#14181F", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 700 }}>
                      Aprovar e gerar código
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#5A6472", marginTop: 8 }}>Depois de aprovar, passe o novo código pra pessoa pessoalmente.</div>
                </div>
              ))}
            </div>
          )}

          {accounts.map((a) => (
            <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid #1F2530" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    {a.nome}
                    {a.papel === "dono" && <span style={{ fontSize: 10, color: "var(--accent, #F2B705)", border: "1px solid var(--accent-55, #F2B70555)", borderRadius: 5, padding: "1px 6px" }}>DONO</span>}
                    {a.bloqueado && <span style={{ fontSize: 10, color: "#E85D4E", border: "1px solid #E85D4E55", borderRadius: 5, padding: "1px 6px" }}>BLOQUEADO</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <KeyRound size={11} color="#5A6472" />
                    <span style={{ fontSize: 12, color: "#8A93A3", fontFamily: "monospace", letterSpacing: 1 }}>
                      {revealed[a.id] ? a.codigo : "••••••"}
                    </span>
                    <button onClick={() => setRevealed((r) => ({ ...r, [a.id]: !r[a.id] }))} style={{ background: "none", border: "none", color: "#5A6472", padding: 2 }}>
                      {revealed[a.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                {a.id !== currentUser.id && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleBlock(a.id)}
                      title={a.bloqueado ? "Desbloquear" : "Bloquear"}
                      style={{ background: "#1E242E", border: "1px solid #2A3140", borderRadius: 7, padding: 7, color: a.bloqueado ? "#2DD4BF" : "#E85D4E" }}
                    >
                      <Ban size={14} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(a.id)} title="Excluir" style={{ background: "#1E242E", border: "1px solid #2A3140", borderRadius: 7, padding: 7, color: "#5A6472" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {confirmDeleteId === a.id && (
                <div style={{ marginTop: 10, background: "#E85D4E12", border: "1px solid #E85D4E44", borderRadius: 9, padding: 12 }}>
                  <div style={{ fontSize: 12.5, color: "#F5A99E", marginBottom: 10 }}>
                    Excluir a conta de <strong>{a.nome}</strong>? O código atual dela deixa de funcionar e não dá pra desfazer.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", borderRadius: 7, padding: "8px 10px", fontSize: 12.5, fontWeight: 600 }}>
                      Cancelar
                    </button>
                    <button onClick={() => removeAccount(a)} style={{ flex: 1, background: "#E85D4E", border: "none", color: "#fff", borderRadius: 7, padding: "8px 10px", fontSize: 12.5, fontWeight: 700 }}>
                      Confirmar exclusão
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: 18, paddingTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8A93A3", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>Nova conta</div>
            <Field label="Nome do ajudante" style={{ marginBottom: 10 }}>
              <KeyboardField value={newName} onChange={setNewName} placeholder="Ex: João" />
            </Field>
            <Field label="Código de acesso" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <KeyboardField value={newCode} onChange={(v) => setNewCode(v.toUpperCase())} mono uppercase />
                </div>
                <button onClick={() => setNewCode(genCode())} style={{ background: "#232A36", border: "1px solid #2A3140", borderRadius: 8, padding: "0 12px", color: "#C9D0DB", fontSize: 12 }}>gerar</button>
              </div>
              <div style={{ fontSize: 11, color: "#5A6472", marginTop: 6 }}>Repasse esse código pro ajudante entrar no app.</div>
            </Field>
            <button onClick={addAccount} disabled={!newName.trim()} style={{ width: "100%", background: newName.trim() ? "var(--accent, #F2B705)" : "#3A4150", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
              Criar conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PedidosPanel({ pedidos, onAceitar, onRecusar, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1A202B", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: "1px solid #262D3A" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #232A36", position: "sticky", top: 0, background: "#1A202B" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
            <ClipboardList size={17} color="var(--accent, #F2B705)" /> Pedidos de clientes
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A93A3" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {pedidos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8A93A3" }}>Nenhum pedido novo no momento.</div>
          ) : (
            pedidos.map((p) => (
              <div key={p.id} style={{ background: "var(--accent-12, #F2B70512)", border: "1px solid var(--accent-33, #F2B70533)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.nome}</div>
                <div style={{ fontSize: 12.5, color: "#C9D0DB", marginBottom: 2 }}>{p.servico}</div>
                <div style={{ fontSize: 12, color: "#8A93A3", marginBottom: 2 }}>{p.endereco}</div>
                <div style={{ fontSize: 12, color: "#8A93A3", marginBottom: 2 }}>{p.telefone}</div>
                <div style={{ fontSize: 12, color: "#8A93A3", marginBottom: 10 }}>{p.data} as {p.hora}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onRecusar(p)} style={{ flex: 1, background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 600 }}>
                    Recusar
                  </button>
                  <button onClick={() => onAceitar(p)} style={{ flex: 2, background: "var(--accent, #F2B705)", border: "none", color: "#14181F", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 700 }}>
                    Aceitar e agendar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "#1E242E", border: "1px solid #2A3140", borderRadius: 10, padding: "14px 16px", color: "#F5F6F7", width: "100%" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#232A36", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent, #F2B705)", flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{label}</span>
    </button>
  );
}

function TemaScreen() {
  const ctx = useKeyboardCtx();
  const nomes = { ambar: "Ambar (padrao)", turquesa: "Turquesa", vermelho: "Vermelho", azul: "Azul" };
  return (
    <div>
      <div style={{ fontSize: 12.5, color: "#8A93A3", marginBottom: 16 }}>
        Escolha a cor de destaque do app:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.keys(ctx.THEMES).map((key) => {
          const ativo = ctx.theme === key;
          const cor = ctx.THEMES[key].accent;
          return (
            <button
              key={key}
              onClick={() => ctx.setTheme(key)}
              style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: ativo ? cor + "18" : "#1E242E", border: ativo ? "1px solid " + cor + "88" : "1px solid #2A3140", borderRadius: 10, padding: "12px 14px", color: "#F5F6F7" }}
            >
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: cor, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{nomes[key]}</span>
              {ativo && <Check size={16} color={cor} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmpresaScreen() {
  const [form, setForm] = useState({ nome: "", whatsapp: "", instagram: "", regiao: "", horario: "" });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await storageGet("empresa");
      if (v) setForm(JSON.parse(v));
      setLoading(false);
    })();
  }, []);

  async function salvar() {
    await storageSet("empresa", JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div style={{ fontSize: 13, color: "#8A93A3" }}>Carregando...</div>;

  return (
    <div>
      <Field label="Nome do negocio" style={{ marginBottom: 12 }}>
        <KeyboardField value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Ex: Xandyy Eletricista" />
      </Field>
      <Field label="WhatsApp" style={{ marginBottom: 12 }}>
        <KeyboardField value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="(27) 9xxxx-xxxx" />
      </Field>
      <Field label="Instagram" style={{ marginBottom: 12 }}>
        <KeyboardField value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="@seuusuario" />
      </Field>
      <Field label="Regiao atendida" style={{ marginBottom: 12 }}>
        <KeyboardField value={form.regiao} onChange={(v) => setForm({ ...form, regiao: v })} placeholder="Ex: Grande Vitoria-ES" />
      </Field>
      <Field label="Horario de atendimento" style={{ marginBottom: 16 }}>
        <KeyboardField value={form.horario} onChange={(v) => setForm({ ...form, horario: v })} placeholder="Ex: seg-sab, 8h as 18h" />
      </Field>
      <button onClick={salvar} style={{ width: "100%", background: "var(--accent, #F2B705)", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
        {saved ? "Salvo!" : "Salvar"}
      </button>
    </div>
  );
}

function NotificacoesScreen({ ativo, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1E242E", border: "1px solid #2A3140", borderRadius: 10, padding: "14px 16px" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Notificar novos pedidos</div>
        <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>So funciona com o app aberto ou recem em segundo plano.</div>
      </div>
      <button
        onClick={() => onToggle(!ativo)}
        style={{ width: 44, height: 26, borderRadius: 13, background: ativo ? "var(--accent, #F2B705)" : "#3A4150", border: "none", position: "relative", flexShrink: 0 }}
      >
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#14181F", position: "absolute", top: 3, left: ativo ? 21 : 3, transition: "left 0.15s" }} />
      </button>
    </div>
  );
}

function ContaScreen({ currentUser, isOwner, onLogout }) {
  return (
    <div>
      <div style={{ background: "#1E242E", border: "1px solid #2A3140", borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{currentUser.nome}</div>
        <div style={{ fontSize: 12.5, color: "#8A93A3" }}>{isOwner ? "Dono" : "Ajudante"}</div>
      </div>
      <button onClick={onLogout} style={{ width: "100%", background: "#1E242E", border: "1px solid #E85D4E55", color: "#E85D4E", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
        Sair da conta
      </button>
    </div>
  );
}

function TecladoScreen({ enabled, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        onClick={() => onChange(true)}
        style={{ textAlign: "left", background: enabled ? "var(--accent-18, #F2B70518)" : "#1E242E", border: enabled ? "1px solid var(--accent-88, #F2B70588)" : "1px solid #2A3140", borderRadius: 10, padding: "14px 16px", color: "#F5F6F7" }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>Teclado do aplicativo {enabled ? "(selecionado)" : ""}</div>
        <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>Teclado proprio dentro do app, com abas de letras, numeros e simbolos.</div>
      </button>
      <button
        onClick={() => onChange(false)}
        style={{ textAlign: "left", background: !enabled ? "var(--accent-18, #F2B70518)" : "#1E242E", border: !enabled ? "1px solid var(--accent-88, #F2B70588)" : "1px solid #2A3140", borderRadius: 10, padding: "14px 16px", color: "#F5F6F7" }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>Teclado do celular {!enabled ? "(selecionado)" : ""}</div>
        <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>Usa o teclado nativo do seu aparelho (com autocorretor, emojis, etc).</div>
      </button>
    </div>
  );
}

function SettingsPanel({ currentUser, isOwner, onClose, onLogout, notificacoesAtivas, setNotificacoesAtivas, persistConfig }) {
  const [screen, setScreen] = useState("menu");
  const ctx = useKeyboardCtx();

  const titulos = {
    menu: "Configuracoes",
    tema: "Tema",
    empresa: "Informacoes da empresa",
    notificacoes: "Notificacoes",
    conta: "Minha conta",
    teclado: "Teclado",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1A202B", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: "1px solid #262D3A" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #232A36", position: "sticky", top: 0, background: "#1A202B" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
            {screen !== "menu" && (
              <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: "#8A93A3", padding: 0, display: "flex" }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <Settings size={17} color="var(--accent, #F2B705)" />
            {titulos[screen]}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A93A3" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 20 }}>
          {screen === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <MenuItem icon={<Palette size={17} />} label="Tema" onClick={() => setScreen("tema")} />
              {isOwner && <MenuItem icon={<Building2 size={17} />} label="Informacoes da empresa" onClick={() => setScreen("empresa")} />}
              {isOwner && <MenuItem icon={<Bell size={17} />} label="Notificacoes" onClick={() => setScreen("notificacoes")} />}
              <MenuItem icon={<User size={17} />} label="Minha conta" onClick={() => setScreen("conta")} />
              <MenuItem icon={<KeyRound size={17} />} label="Teclado" onClick={() => setScreen("teclado")} />
            </div>
          )}
          {screen === "tema" && <TemaScreen />}
          {screen === "empresa" && <EmpresaScreen />}
          {screen === "notificacoes" && (
            <NotificacoesScreen ativo={notificacoesAtivas} onToggle={(v) => { setNotificacoesAtivas(v); persistConfig({ notificacoes: v }); }} />
          )}
          {screen === "conta" && <ContaScreen currentUser={currentUser} isOwner={isOwner} onLogout={onLogout} />}
          {screen === "teclado" && <TecladoScreen enabled={ctx.enabled} onChange={ctx.setEnabled} />}
        </div>
      </div>
    </div>
  );
}

function EmailAuthScreen({ accounts, persistAccounts, onBack }) {
  const [modo, setModo] = useState("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin() {
    setErro(""); setMsg("");
    if (!email.trim() || !senha) return;
    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (e) {
      setErro(traduzErroAuth(e));
    } finally {
      setCarregando(false);
    }
  }

  async function fazerCadastro() {
    setErro(""); setMsg("");
    if (!nome.trim() || !email.trim() || !senha) return;
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    try {
      const user = await registrar(email.trim(), senha);
      const novaConta = {
        id: user.uid,
        uid: user.uid,
        nome: nome.trim(),
        papel: "dono",
        aprovado: true,
        bloqueado: false,
      };
      await persistAccounts([...accounts, novaConta]);
    } catch (e) {
      setErro(traduzErroAuth(e));
    } finally {
      setCarregando(false);
    }
  }

  async function enviarRecuperacao() {
    setErro(""); setMsg("");
    if (!email.trim()) {
      setErro("Digite seu e-mail primeiro.");
      return;
    }
    setCarregando(true);
    try {
      await recuperarSenha(email.trim());
      setMsg("Enviamos um link de redefinicao para o seu e-mail.");
    } catch (e) {
      setErro(traduzErroAuth(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8A93A3", fontSize: 13, padding: "0 0 18px", marginLeft: -2 }}>
          <ChevronLeft size={16} /> Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: "linear-gradient(160deg, var(--accent, #F2B705), var(--accent-dark, #C9950A))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={22} color="#14181F" fill="#14181F" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Painel de Servicos</div>
        </div>

        <div style={{ background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button onClick={() => { setModo("entrar"); setErro(""); setMsg(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: modo === "entrar" ? "var(--accent, #F2B705)" : "#232A36", color: modo === "entrar" ? "#14181F" : "#8A93A3", fontWeight: 700, fontSize: 13 }}>
              Entrar
            </button>
            <button onClick={() => { setModo("cadastro"); setErro(""); setMsg(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: modo === "cadastro" ? "var(--accent, #F2B705)" : "#232A36", color: modo === "cadastro" ? "#14181F" : "#8A93A3", fontWeight: 700, fontSize: 13 }}>
              Criar conta
            </button>
          </div>

          {modo === "cadastro" && (
            <Field label="Seu nome" style={{ marginBottom: 12 }}>
              <KeyboardField value={nome} onChange={setNome} placeholder="Ex: Alexandre" />
            </Field>
          )}
          <Field label="E-mail" style={{ marginBottom: 12 }}>
            <KeyboardField value={email} onChange={setEmail} placeholder="seuemail@exemplo.com" />
          </Field>
          <Field label="Senha" style={{ marginBottom: 16 }}>
            <KeyboardField value={senha} onChange={setSenha} placeholder="Minimo 6 caracteres" mono />
          </Field>

          {erro && <div style={{ fontSize: 12.5, color: "#E85D4E", marginBottom: 12 }}>{erro}</div>}
          {msg && <div style={{ fontSize: 12.5, color: "#2DD4BF", marginBottom: 12 }}>{msg}</div>}

          <button
            onClick={modo === "entrar" ? fazerLogin : fazerCadastro}
            disabled={carregando}
            style={{ width: "100%", background: "var(--accent, #F2B705)", border: "none", color: "#14181F", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}
          >
            {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar minha conta"}
          </button>

          {modo === "entrar" && (
            <button onClick={enviarRecuperacao} disabled={carregando} style={{ width: "100%", background: "none", border: "none", color: "#8A93A3", fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
              Esqueci minha senha
            </button>
          )}

          {modo === "cadastro" && (
            <div style={{ fontSize: 11.5, color: "#5A6472", marginTop: 14, textAlign: "center" }}>
              Sua conta fica pendente ate o dono aprovar (exceto se voce for o primeiro a se cadastrar).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function traduzErroAuth(e) {
  const codigo = e && e.code ? e.code : "";
  if (codigo.includes("email-already-in-use")) return "Esse e-mail ja tem uma conta. Tente entrar.";
  if (codigo.includes("invalid-email")) return "E-mail invalido.";
  if (codigo.includes("weak-password")) return "Senha muito fraca (minimo 6 caracteres).";
  if (codigo.includes("user-not-found") || codigo.includes("wrong-password") || codigo.includes("invalid-credential")) return "E-mail ou senha incorretos.";
  if (codigo.includes("too-many-requests")) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  return "Nao foi possivel completar. Tente novamente.";
}

function AguardandoAprovacaoScreen({ nome, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 26, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aguardando aprovacao</div>
        <div style={{ fontSize: 13, color: "#8A93A3", marginBottom: 20 }}>
          Ola, {nome}! Sua conta foi criada mas ainda precisa ser aprovada pelo dono da equipe.
        </div>
        <button onClick={onLogout} style={{ width: "100%", background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
          Sair
        </button>
      </div>
    </div>
  );
}

function ContaNaoAutorizadaScreen({ onLogout, debugUid, debugAccounts }) {
  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 26, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🚫</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Conta nao autorizada</div>
        <div style={{ fontSize: 13, color: "#8A93A3", marginBottom: 20 }}>
          Essa conta nao tem mais acesso a esse app. Fale com o dono da equipe se achar que isso e um erro.
        </div>
        <button onClick={onLogout} style={{ width: "100%", background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
          Sair
        </button>
        <div style={{ marginTop: 20, textAlign: "left", background: "#12161D", border: "1px solid #2A3140", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10.5, color: "#5A6472", marginBottom: 6, textTransform: "uppercase" }}>Debug (temporario)</div>
          <div style={{ fontSize: 10.5, color: "#8A93A3", wordBreak: "break-all", marginBottom: 8 }}>meu uid: {String(debugUid)}</div>
          <div style={{ fontSize: 10.5, color: "#8A93A3", wordBreak: "break-all" }}>contas: {JSON.stringify(debugAccounts)}</div>
        </div>
      </div>
    </div>
  );
}

function ContaBloqueadaScreen({ onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: "#14181F", color: "#F5F6F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#1A202B", border: "1px solid #262D3A", borderRadius: 14, padding: 26, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Conta bloqueada</div>
        <div style={{ fontSize: 13, color: "#8A93A3", marginBottom: 20 }}>
          Essa conta foi bloqueada pelo dono da equipe.
        </div>
        <button onClick={onLogout} style={{ width: "100%", background: "#1E242E", border: "1px solid #2A3140", color: "#8A93A3", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
          Sair
        </button>
      </div>
    </div>
  );
}
