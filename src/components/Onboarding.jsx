import { useState } from "react";
import { Zap, ChevronLeft } from "lucide-react";

const COR = {
  bg: "#14181F",
  card: "#1A202B",
  border: "#2A3140",
  text: "#F5F6F7",
  textMuted: "#8A93A3",
  accent: "#F2B705",
  danger: "#E85D4E",
};

const SERVICOS = [
  "Instalações Residenciais",
  "Manutenção Elétrica",
  "Quadros de Distribuição",
  "Iluminação",
  "Automação Residencial",
  "Ar-condicionado",
  "Padrão de Entrada",
  "Emergências 24h",
  "Projetos Elétricos",
  "Outros",
];

const TOTAL_PASSOS = 4;

export default function Onboarding({
  onCreateAccount = async () => {},
  onFinish = () => {},
  onGoToLogin = () => {},
}) {
  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [servicos, setServicos] = useState([]);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [visitante, setVisitante] = useState(false);
  const [aceitaPolitica, setAceitaPolitica] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function alternarServico(servico) {
    setServicos((atual) =>
      atual.includes(servico) ? atual.filter((s) => s !== servico) : [...atual, servico]
    );
  }

  function voltar() {
    setErro("");
    if (passo > 0) setPasso(passo - 1);
  }

  function avancar() {
    if (passo === 0 && !nome.trim()) {
      setErro("Informe seu nome ou o nome da sua empresa.");
      return;
    }
    setErro("");
    setPasso(Math.min(passo + 1, TOTAL_PASSOS - 1));
  }

  async function finalizar() {
    setErro("");
    if (!visitante) {
      if (!email.trim() || !senha) {
        setErro("Preencha e-mail e senha.");
        return;
      }
      if (senha.length < 6) {
        setErro("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }
      if (senha !== confirmarSenha) {
        setErro("As senhas não conferem.");
        return;
      }
      if (!aceitaPolitica) {
        setErro("Você precisa aceitar a Política de Privacidade.");
        return;
      }
    }
    setCarregando(true);
    try {
      await onCreateAccount({ nome, servicos, email, senha, visitante });
      onFinish();
    } catch (e) {
      setErro(e?.message || "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: `1.5px solid ${COR.border}`,
    color: COR.text,
    fontSize: 17,
    padding: "10px 0",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: COR.bg, color: COR.text, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
        {passo > 0 ? (
          <button onClick={voltar} style={{ background: "none", border: "none", padding: 4 }}>
            <ChevronLeft size={22} color={COR.textMuted} />
          </button>
        ) : (
          <span />
        )}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: COR.textMuted }}>
          PASSO {passo + 1} DE {TOTAL_PASSOS}
        </span>
      </div>

      <div style={{ flex: 1, padding: "32px 24px 16px", overflowY: "auto" }}>
        {passo === 0 && (
          <>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Pronto(a) para começar?</div>
            <div style={{ fontSize: 15, color: COR.textMuted, marginBottom: 32 }}>
              Informe o nome da sua empresa ou seu próprio nome
            </div>
            <input
              style={inputStyle}
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </>
        )}

        {passo === 1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 24 }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: COR.card, border: `1px solid ${COR.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
              <Zap size={40} color={COR.accent} fill={COR.accent} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>
              Olá, {nome.trim() || "eletricista"}
            </div>
            <div style={{ fontSize: 15, color: COR.textMuted }}>
              Se você estava procurando um jeito de organizar sua agenda, seus orçamentos e seus clientes...
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 14 }}>O seu momento chegou!</div>
            <button onClick={onGoToLogin} style={{ background: "none", border: "none", marginTop: 36, fontSize: 14, fontWeight: 600, color: COR.accent }}>
              Já tem uma conta? Faça seu Login
            </button>
          </div>
        )}

        {passo === 2 && (
          <>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Personalizar</div>
            <div style={{ fontSize: 15, color: COR.textMuted, marginBottom: 24 }}>
              Selecione o(s) tipo(s) de serviço que você presta, para ajustarmos o app pra sua rotina:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {SERVICOS.map((servico) => {
                const ativo = servicos.includes(servico);
                return (
                  <button
                    key={servico}
                    type="button"
                    onClick={() => alternarServico(servico)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 20,
                      fontSize: 13.5,
                      fontWeight: 600,
                      border: `1.5px solid ${ativo ? COR.accent : COR.border}`,
                      background: ativo ? COR.accent : "transparent",
                      color: ativo ? "#14181F" : COR.textMuted,
                    }}
                  >
                    {servico}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Crie sua Conta</div>
            {!visitante && (
              <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 16 }}>
                <input style={inputStyle} placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input style={inputStyle} placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
                <input style={inputStyle} placeholder="Confirmação da Senha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontSize: 14 }}>
              <input type="checkbox" checked={visitante} onChange={(e) => setVisitante(e.target.checked)} style={{ width: 18, height: 18 }} />
              Iniciar sem uma conta (Visitante)
            </label>
            {!visitante && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontSize: 14 }}>
                <input type="checkbox" checked={aceitaPolitica} onChange={(e) => setAceitaPolitica(e.target.checked)} style={{ width: 18, height: 18 }} />
                Estou de acordo com a Política de Privacidade
              </label>
            )}
          </>
        )}

        {erro && <div style={{ fontSize: 13.5, fontWeight: 600, color: COR.danger, marginTop: 18 }}>{erro}</div>}
      </div>

      {passo < TOTAL_PASSOS - 1 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderTop: `1px solid ${COR.border}` }}>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: TOTAL_PASSOS }).map((_, i) => (
              <span key={i} style={{ height: 7, width: i === passo ? 20 : 7, borderRadius: 4, background: i === passo ? COR.accent : COR.border }} />
            ))}
          </div>
          <button onClick={avancar} style={{ background: "none", border: "none", fontSize: 15.5, fontWeight: 700, color: COR.accent }}>
            Avançar
          </button>
        </div>
      ) : (
        <div>
          <button onClick={finalizar} disabled={carregando} style={{ width: "100%", padding: "18px 0", border: "none", fontSize: 16, fontWeight: 800, background: COR.accent, color: "#14181F", opacity: carregando ? 0.7 : 1 }}>
            {carregando ? "Aguarde..." : "Comece Agora"}
          </button>
          <button onClick={onGoToLogin} style={{ width: "100%", padding: "15px 0", border: "none", background: COR.card, fontSize: 13.5, fontWeight: 600, color: COR.textMuted }}>
            Já tem uma conta? Faça seu Login
          </button>
        </div>
      )}
    </div>
  );
}