import { useEffect, useState } from "react";

function App() {
  const [remedios, setRemedios] = useState(() => {
    const salvos = localStorage.getItem("remedios");
    return salvos ? JSON.parse(salvos) : [];
  });

  const [nome, setNome] = useState("");
  const [horario, setHorario] = useState("");

  useEffect(() => {
    localStorage.setItem("remedios", JSON.stringify(remedios));
  }, [remedios]);

  useEffect(() => {
    const verificarHorarios = async () => {
      if (!("serviceWorker" in navigator)) return;

      const agora = new Date();
      const horaAtual =
        String(agora.getHours()).padStart(2, "0") +
        ":" +
        String(agora.getMinutes()).padStart(2, "0");

      const hoje = agora.toISOString().slice(0, 10);

      const registro = await navigator.serviceWorker.ready;

      remedios.forEach((remedio) => {
        const chave = `notificacao-${hoje}-${remedio.id}`;

        if (remedio.horario === horaAtual && !localStorage.getItem(chave)) {
          registro.showNotification("💊 Hora do remédio!", {
            body: `Está na hora de tomar: ${remedio.nome}`,
            tag: `remedio-${remedio.id}`,
          });

          localStorage.setItem(chave, "enviada");
        }
      });
    };

    verificarHorarios();

    const intervalo = setInterval(verificarHorarios, 30000);

    return () => clearInterval(intervalo);
  }, [remedios]);

  async function ativarNotificacoes() {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    const permissao = await Notification.requestPermission();

    if (permissao === "granted") {
      alert("✅ Notificações ativadas!");
    } else {
      alert("❌ Permissão para notificações não autorizada.");
    }
  }

  function adicionarRemedio(e) {
    e.preventDefault();

    if (!nome || !horario) {
      alert("Preencha o nome e o horário.");
      return;
    }

    const novoRemedio = {
      id: Date.now(),
      nome: nome,
      horario: horario,
    };

    setRemedios([...remedios, novoRemedio]);

    setNome("");
    setHorario("");
  }

  function excluirRemedio(id) {
    setRemedios(remedios.filter((remedio) => remedio.id !== id));
  }

  return (
    <div style={styles.container}>
      <div style={styles.app}>
        <h1>💊 Controle de Remédios</h1>

        <button
          onClick={ativarNotificacoes}
          style={styles.botaoNotificacao}
        >
          🔔 Ativar notificações
        </button>

        <h2>Adicionar remédio</h2>

        <form onSubmit={adicionarRemedio}>
          <input
            type="text"
            placeholder="Nome do remédio"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={styles.input}
          />

          <input
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.botaoAdicionar}>
            ➕ Adicionar remédio
          </button>
        </form>

        <h2>Meus remédios</h2>

        {remedios.length === 0 ? (
          <p>Nenhum remédio cadastrado.</p>
        ) : (
          remedios.map((remedio) => (
            <div key={remedio.id} style={styles.remedio}>
              <div>
                <strong>💊 {remedio.nome}</strong>
                <br />
                <span>⏰ {remedio.horario}</span>
              </div>

              <button
                onClick={() => excluirRemedio(remedio.id)}
                style={styles.botaoExcluir}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f2f5f7",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  app: {
    maxWidth: "600px",
    margin: "0 auto",
    background: "white",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },

  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "12px",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "16px",
  },

  botaoAdicionar: {
    width: "100%",
    padding: "14px",
    background: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },

  botaoNotificacao: {
    width: "100%",
    padding: "14px",
    marginBottom: "20px",
    background: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },

  remedio: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    marginBottom: "10px",
    background: "#f5f5f5",
    borderRadius: "10px",
    fontSize: "17px",
  },

  botaoExcluir: {
    border: "none",
    background: "transparent",
    fontSize: "20px",
    cursor: "pointer",
  },
};

export default App;
