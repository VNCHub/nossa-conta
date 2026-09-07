import React, { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap');

.gf * { box-sizing: border-box; }
.gf {
  --paper: #F1F3EF;
  --card: #FFFFFF;
  --ink: #12332C;
  --ink-soft: #4E605A;
  --ink-faint: #8B978F;
  --line: #DFE4DC;
  --petrol: #1F5F52;
  --credit: #2E7D63;
  --debit: #A8332A;
  --mustard: #D9A21B;
  font-family: 'Archivo', system-ui, -apple-system, sans-serif;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
.gf h1, .gf h2, .gf h3 {
  font-family: 'Newsreader', Georgia, serif;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0;
}
.gf h1 { font-size: 30px; line-height: 1.15; }
.gf h2 { font-size: 21px; }
.gf h3 { font-size: 16px; }
.gf p { margin: 0; }
.num { font-variant-numeric: tabular-nums; }

/* Layout ---------------------------------------------------------- */
.shell { display: flex; min-height: 100vh; }
.rail {
  width: 236px; flex: 0 0 236px;
  background: var(--ink); color: #E7EDE9;
  padding: 22px 16px 16px; display: flex; flex-direction: column; gap: 22px;
}
.main { flex: 1; min-width: 0; padding: 30px 34px 90px; max-width: 1180px; }
.brand { font-family: 'Newsreader', serif; font-size: 20px; color: #fff; line-height: 1.2; }
.brand small { display:block; font-family:'Archivo'; font-size:11px; color:#8FAFA4; letter-spacing:.04em; margin-top:4px; }
.navlist { display: flex; flex-direction: column; gap: 2px; }
.navbtn {
  display:flex; align-items:center; gap:10px; width:100%;
  background:none; border:0; color:#B9CCC5; font:inherit; font-size:13.5px;
  padding:9px 11px; border-radius:8px; cursor:pointer; text-align:left;
}
.navbtn:hover { background:#1B4239; color:#fff; }
.navbtn.on { background:#2A5B4F; color:#fff; font-weight:600; }
.navbtn .dot { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.55; flex:0 0 6px;}
.railfoot { margin-top:auto; border-top:1px solid #2A4B43; padding-top:14px; font-size:12px; color:#8FAFA4; }
.railfoot button { background:none;border:0;color:#B9CCC5;font:inherit;cursor:pointer;padding:0;text-decoration:underline; }

/* Cartões --------------------------------------------------------- */
.card { background: var(--card); border:1px solid var(--line); border-radius:14px; padding:20px 22px; }
.card + .card { margin-top:16px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.rowhead { display:flex; align-items:baseline; justify-content:space-between; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
.sub { color:var(--ink-soft); font-size:13px; }
.faint { color: var(--ink-faint); font-size:12.5px; }

/* Controles ------------------------------------------------------- */
.btn {
  font:inherit; font-size:13.5px; font-weight:500; padding:9px 15px; border-radius:8px;
  border:1px solid var(--ink); background:var(--ink); color:#fff; cursor:pointer;
}
.btn:hover { background:#1B4A40; }
.btn.ghost { background:transparent; color:var(--ink); border-color:var(--line); }
.btn.ghost:hover { background:#EDF0EB; }
.btn.sm { padding:6px 11px; font-size:12.5px; border-radius:7px; }
.btn.danger { background:transparent; border-color:#E4C6C2; color:var(--debit); }
.btn:focus-visible, .navbtn:focus-visible, input:focus-visible, select:focus-visible {
  outline:2px solid var(--mustard); outline-offset:2px;
}
label.f { display:block; font-size:12px; color:var(--ink-soft); margin-bottom:5px; font-weight:500; }
input, select {
  font:inherit; font-size:13.5px; width:100%; padding:8px 10px;
  border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink);
}
input:focus, select:focus { border-color:var(--petrol); outline:none; }
.formgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px 14px; }
.formgrid .span2 { grid-column: span 2; }
.formgrid .span4 { grid-column: span 4; }

/* Tabela ---------------------------------------------------------- */
.tbl { width:100%; border-collapse:collapse; font-size:13px; }
.tbl th {
  text-align:left; font-weight:600; font-size:11.5px; color:var(--ink-faint);
  padding:0 10px 8px; border-bottom:1px solid var(--line); white-space:nowrap;
}
.tbl td { padding:11px 10px; border-bottom:1px solid #EEF1EC; vertical-align:top; }
.tbl tr:last-child td { border-bottom:0; }
.tbl .r { text-align:right; }
.tblwrap { overflow-x:auto; margin:0 -22px; padding:0 22px; }

/* Chips ----------------------------------------------------------- */
.chip {
  display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:500;
  padding:3px 9px; border-radius:999px; background:#EDF0EB; color:var(--ink-soft); white-space:nowrap;
}
.chip .sw { width:7px; height:7px; border-radius:2px; }
.chip.fixo { background:#EAF1EE; color:#1F5F52; }
.chip.opcional { background:#FAF1DC; color:#8A6410; }
.pillbar { display:flex; gap:6px; flex-wrap:wrap; }
.pillbar button {
  font:inherit; font-size:12.5px; padding:6px 12px; border-radius:999px;
  border:1px solid var(--line); background:#fff; color:var(--ink-soft); cursor:pointer;
}
.pillbar button.on { background:var(--ink); border-color:var(--ink); color:#fff; }

.avatar {
  width:30px; height:30px; border-radius:50%; display:inline-flex; align-items:center;
  justify-content:center; color:#fff; font-size:12px; font-weight:600; flex:0 0 30px;
}
.avatar.lg { width:40px; height:40px; font-size:15px; flex-basis:40px; }

/* Elementos específicos ------------------------------------------- */
.acerto { font-family:'Newsreader',serif; font-size:30px; line-height:1.3; letter-spacing:-0.015em; }
.acerto .v { color:var(--debit); }
.mesnav { display:flex; align-items:center; gap:8px; }
.mesnav .lbl { font-size:13.5px; font-weight:600; min-width:132px; text-align:center; text-transform:capitalize; }
.stack { display:flex; flex-direction:column; gap:14px; }
.memberrow { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #EEF1EC; }
.memberrow:last-child { border-bottom:0; }
.bar { height:8px; border-radius:4px; background:#EDF0EB; overflow:hidden; }
.bar > span { display:block; height:100%; border-radius:4px; }
.catrow { display:grid; grid-template-columns:104px 1fr 76px; gap:10px; align-items:center; padding:5px 0; }
.empty { padding:26px; text-align:center; color:var(--ink-faint); font-size:13px; border:1px dashed var(--line); border-radius:12px; }
.note { background:#EAF1EE; border:1px solid #CFE0D9; border-radius:12px; padding:14px 16px; font-size:13px; color:#255147; }

/* Login ----------------------------------------------------------- */
.login { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
.loginbox { width:100%; max-width:400px; }
.userpick { display:flex; flex-direction:column; gap:8px; }
.userpick button {
  display:flex; align-items:center; gap:11px; width:100%; text-align:left; font:inherit;
  padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:#fff; cursor:pointer;
}
.userpick button:hover { border-color:var(--petrol); background:#F7FAF8; }

@media (max-width: 860px) {
  .shell { flex-direction:column; }
  .rail {
    width:100%; flex:none; flex-direction:row; align-items:center; gap:10px;
    padding:10px 12px; position:sticky; bottom:0; order:2; overflow-x:auto;
  }
  .rail .brand, .rail .railfoot { display:none; }
  .navlist { flex-direction:row; gap:4px; }
  .navbtn { white-space:nowrap; padding:8px 12px; }
  .navbtn .dot { display:none; }
  .main { padding:20px 16px 30px; order:1; }
  .grid2, .grid3 { grid-template-columns:1fr; }
  .formgrid { grid-template-columns:1fr 1fr; }
  .formgrid .span4, .formgrid .span2 { grid-column: span 2; }
  .acerto { font-size:23px; }
  .tblwrap { margin:0 -22px; }
}
@media (prefers-reduced-motion: reduce) { .gf * { transition:none !important; animation:none !important; } }
`;

/* ------------------------------------------------------------------ */
/* Constantes de domínio                                               */
/* ------------------------------------------------------------------ */

const CATEGORIAS = [
  { id: "carro", nome: "Carro", cor: "#3D6A8F" },
  { id: "casa", nome: "Casa", cor: "#2F6F5E" },
  { id: "passeio", nome: "Passeio", cor: "#C97B2B" },
  { id: "assinaturas", nome: "Assinaturas", cor: "#7A5AA6" },
  { id: "comida", nome: "Comida", cor: "#B8452F" },
  { id: "pets", nome: "Pets", cor: "#4E9A8A" },
  { id: "jogos", nome: "Jogos", cor: "#5A6EA8" },
  { id: "outros", nome: "Outros", cor: "#8A8F87" },
];
const catOf = (id) => CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[7];
const PAGAMENTOS = ["Crédito", "Débito", "Dinheiro", "Pix"];
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

const brl = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n) => `${(n * 100).toFixed(n * 100 >= 10 ? 0 : 1)}%`;
const mesLabel = (m) => {
  const [a, b] = m.split("-");
  return `${MESES[+b - 1]} de ${a}`;
};
const shiftMes = (m, d) => {
  const [a, b] = m.split("-").map(Number);
  const dt = new Date(a, b - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};
const uid = () => Math.random().toString(36).slice(2, 9);

/* ------------------------------------------------------------------ */
/* Dados de demonstração                                               */
/* ------------------------------------------------------------------ */

const MES0 = "2026-09";

function seed() {
  const users = [
    { id: "u1", nome: "Vinicius", email: "vinicius@email.com", senha: "123456", cor: "#1F5F52", familiaId: "f1" },
    { id: "u2", nome: "Camila", email: "camila@email.com", senha: "123456", cor: "#B8452F", familiaId: "f1" },
    { id: "u3", nome: "Rafael", email: "rafael@email.com", senha: "123456", cor: "#7A5AA6", familiaId: "f1" },
  ];

  const familias = [
    {
      id: "f1",
      nome: "Casa da Vila Nova",
      codigo: "VILA-7K2M",
      criadaPor: "u1",
      regras: [
        { id: "r1", nome: "Meio a meio", tipo: "igual", descricao: "Divide igualmente entre quem participa." },
        { id: "r2", nome: "Proporcional à renda", tipo: "renda", descricao: "Cada um paga na proporção da sua entrada recorrente." },
        { id: "r3", nome: "Proporcional à sobra livre", tipo: "sobra", descricao: "Proporção da renda recorrente menos os gastos fixos individuais." },
        { id: "r4", nome: "Moradia 60/40", tipo: "fixo", descricao: "Percentuais combinados uma vez.", pesos: { u1: 60, u2: 40, u3: 0 } },
        {
          id: "r5", nome: "Carro por km rodado", tipo: "medidor", unidade: "km",
          descricao: "Todo mês cada um lança quanto rodou; o sistema converte em percentual.",
          medicoes: { "2026-09": { u1: 320, u2: 780, u3: 0 }, "2026-08": { u1: 410, u2: 690, u3: 0 } },
        },
      ],
    },
  ];

  const entradas = [
    { id: uid(), userId: "u1", tipo: "recorrente", descricao: "Salário", valor: 6200, dia: 5 },
    { id: uid(), userId: "u1", tipo: "pontual", descricao: "Freela de projeto", valor: 1400, data: "2026-09-18" },
    { id: uid(), userId: "u2", tipo: "recorrente", descricao: "Salário", valor: 4100, dia: 5 },
    { id: uid(), userId: "u2", tipo: "recorrente", descricao: "Aulas particulares", valor: 700, dia: 20 },
    { id: uid(), userId: "u3", tipo: "recorrente", descricao: "Salário", valor: 3300, dia: 1 },
    { id: uid(), userId: "u3", tipo: "pontual", descricao: "Venda de bicicleta", valor: 850, data: "2026-09-09" },
  ];

  const g = (userId, data, pagamento, cat, tipo, descricao, valor, dividir, participantes, regraId) => ({
    id: uid(), userId, data, pagamento, categoria: cat, tipoGasto: tipo,
    descricao, valor, dividir, participantes: participantes || [], regraId: regraId || null,
  });

  const gastos = [
    g("u1", "2026-09-02", "Pix", "casa", "fixo", "Aluguel", 2400, true, ["u1", "u2", "u3"], "r2"),
    g("u1", "2026-09-03", "Débito", "casa", "fixo", "Energia elétrica", 285, true, ["u1", "u2", "u3"], "r1"),
    g("u2", "2026-09-04", "Pix", "casa", "fixo", "Internet", 129.9, true, ["u1", "u2", "u3"], "r1"),
    g("u2", "2026-09-06", "Crédito", "comida", "fixo", "Mercado do mês", 940, true, ["u1", "u2", "u3"], "r1"),
    g("u1", "2026-09-07", "Crédito", "carro", "fixo", "Parcela do carro", 890, true, ["u1", "u2"], "r4"),
    g("u2", "2026-09-08", "Débito", "carro", "fixo", "Combustível", 320, true, ["u1", "u2"], "r5"),
    g("u1", "2026-09-09", "Crédito", "assinaturas", "opcional", "Streaming de filmes", 55.9, true, ["u1", "u2", "u3"], "r1"),
    g("u3", "2026-09-10", "Pix", "pets", "fixo", "Ração e areia", 210, true, ["u1", "u2", "u3"], "r1"),
    g("u1", "2026-09-12", "Crédito", "jogos", "opcional", "Jogo novo", 249, false, [], null),
    g("u2", "2026-09-13", "Débito", "passeio", "opcional", "Jantar de aniversário", 310, true, ["u1", "u2"], "r1"),
    g("u3", "2026-09-14", "Dinheiro", "comida", "opcional", "Feira", 87.5, false, [], null),
    g("u1", "2026-09-15", "Crédito", "assinaturas", "fixo", "Academia", 129, false, [], null),
    g("u2", "2026-09-17", "Crédito", "casa", "opcional", "Cortina da sala", 430, true, ["u1", "u2"], "r4"),
    g("u3", "2026-09-19", "Pix", "passeio", "opcional", "Cinema", 76, false, [], null),
    g("u1", "2026-09-21", "Débito", "carro", "opcional", "Lavagem do carro", 90, true, ["u1", "u2"], "r5"),
    g("u2", "2026-09-22", "Pix", "pets", "opcional", "Banho e tosa", 130, true, ["u1", "u2", "u3"], "r1"),
  ];

  return { users, familias, entradas, gastos };
}

/* ------------------------------------------------------------------ */
/* Motor de cálculo                                                    */
/* ------------------------------------------------------------------ */

// Entrada recorrente vale todo mês; pontual só no mês da data.
function entradaDoMes(entradas, userId, mes) {
  return entradas
    .filter((e) => e.userId === userId)
    .filter((e) => e.tipo === "recorrente" || (e.data || "").slice(0, 7) === mes)
    .reduce((s, e) => s + e.valor, 0);
}
function entradaRecorrente(entradas, userId) {
  return entradas.filter((e) => e.userId === userId && e.tipo === "recorrente").reduce((s, e) => s + e.valor, 0);
}
// Gastos fixos individuais (não divididos) — usados na regra "sobra livre".
// Ficam de fora os gastos compartilhados de propósito: senão o rateio dependeria
// de si mesmo (a cota entra no cálculo que define a cota).
function fixosIndividuais(gastos, userId, mes) {
  return gastos
    .filter((g) => g.userId === userId && !g.dividir && g.tipoGasto === "fixo" && g.data.slice(0, 7) === mes)
    .reduce((s, g) => s + g.valor, 0);
}

// Percentual de cada participante em um gasto, conforme a regra escolhida.
function calcularCotas(gasto, ctx) {
  const { regras, entradas, gastos, mes } = ctx;
  const parts = gasto.participantes.length ? gasto.participantes : [gasto.userId];
  const regra = regras.find((r) => r.id === gasto.regraId);
  const igual = () => Object.fromEntries(parts.map((p) => [p, 1 / parts.length]));
  if (!regra) return igual();

  let pesos = {};
  if (regra.tipo === "igual") return igual();
  if (regra.tipo === "fixo") pesos = Object.fromEntries(parts.map((p) => [p, regra.pesos?.[p] || 0]));
  if (regra.tipo === "renda") pesos = Object.fromEntries(parts.map((p) => [p, entradaRecorrente(entradas, p)]));
  if (regra.tipo === "sobra")
    pesos = Object.fromEntries(
      parts.map((p) => [p, Math.max(0, entradaRecorrente(entradas, p) - fixosIndividuais(gastos, p, mes))])
    );
  if (regra.tipo === "medidor")
    pesos = Object.fromEntries(parts.map((p) => [p, (regra.medicoes?.[mes] || {})[p] || 0]));

  const total = Object.values(pesos).reduce((s, v) => s + v, 0);
  if (!total) return igual(); // sem dados no mês, cai para divisão igual
  return Object.fromEntries(parts.map((p) => [p, pesos[p] / total]));
}

// Consolida o mês inteiro: cotas, saldos e transferências de acerto.
function consolidar(state, mes) {
  const { users, entradas, gastos, familias } = state;
  const regras = familias[0].regras;
  const doMes = gastos.filter((g) => g.data.slice(0, 7) === mes);
  const ctx = { regras, entradas, gastos, mes };

  const porUsuario = Object.fromEntries(
    users.map((u) => [u.id, { pago: 0, cota: 0, fixo: 0, opcional: 0, categorias: {}, entrada: entradaDoMes(entradas, u.id, mes) }])
  );
  const saldo = Object.fromEntries(users.map((u) => [u.id, 0]));

  const linhas = doMes.map((g) => {
    const cotas = g.dividir ? calcularCotas(g, ctx) : { [g.userId]: 1 };
    porUsuario[g.userId].pago += g.valor;
    Object.entries(cotas).forEach(([p, share]) => {
      const v = g.valor * share;
      const alvo = porUsuario[p];
      if (!alvo) return;
      alvo.cota += v;
      alvo[g.tipoGasto] += v;
      alvo.categorias[g.categoria] = (alvo.categorias[g.categoria] || 0) + v;
      if (p !== g.userId) {
        saldo[p] -= v;
        saldo[g.userId] += v;
      }
    });
    return { ...g, cotas };
  });

  // Acerto: menor número de transferências (guloso credor↔devedor).
  const dev = Object.entries(saldo).filter(([, v]) => v < -0.005).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const cre = Object.entries(saldo).filter(([, v]) => v > 0.005).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const transferencias = [];
  let i = 0, j = 0;
  while (i < dev.length && j < cre.length) {
    const amt = Math.min(dev[i].v, cre[j].v);
    transferencias.push({ de: dev[i].id, para: cre[j].id, valor: amt });
    dev[i].v -= amt; cre[j].v -= amt;
    if (dev[i].v < 0.005) i++;
    if (cre[j].v < 0.005) j++;
  }

  const totalMes = doMes.reduce((s, g) => s + g.valor, 0);
  return { linhas, porUsuario, saldo, transferencias, totalMes };
}

/* ------------------------------------------------------------------ */
/* Peças de UI                                                         */
/* ------------------------------------------------------------------ */

function Avatar({ user, lg }) {
  return (
    <span className={"avatar" + (lg ? " lg" : "")} style={{ background: user.cor }}>
      {user.nome[0]}
    </span>
  );
}

function MesNav({ mes, setMes }) {
  return (
    <div className="mesnav">
      <button className="btn ghost sm" onClick={() => setMes(shiftMes(mes, -1))} aria-label="Mês anterior">←</button>
      <span className="lbl num">{mesLabel(mes)}</span>
      <button className="btn ghost sm" onClick={() => setMes(shiftMes(mes, 1))} aria-label="Próximo mês">→</button>
    </div>
  );
}

function Donut({ fixo, opcional }) {
  const total = fixo + opcional || 1;
  const r = 52, c = 2 * Math.PI * r;
  const f = (fixo / total) * c;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`${pct(fixo / total)} fixo`}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="#D9A21B" strokeWidth="17" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#1F5F52" strokeWidth="17"
          strokeDasharray={`${f} ${c - f}`} transform="rotate(-90 66 66)" />
        <text x="66" y="62" textAnchor="middle" fontSize="21" fontFamily="Archivo" fontWeight="600" fill="#12332C">
          {pct(fixo / total)}
        </text>
        <text x="66" y="79" textAnchor="middle" fontSize="11" fontFamily="Archivo" fill="#8B978F">fixo</text>
      </svg>
      <div className="stack" style={{ gap: 10 }}>
        <div>
          <span className="chip fixo">Gasto fixo</span>
          <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 5 }}>{brl(fixo)}</div>
        </div>
        <div>
          <span className="chip opcional">Gasto opcional</span>
          <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 5 }}>{brl(opcional)}</div>
        </div>
      </div>
    </div>
  );
}

function Categorias({ mapa }) {
  const total = Object.values(mapa).reduce((s, v) => s + v, 0);
  const itens = CATEGORIAS.map((c) => ({ ...c, v: mapa[c.id] || 0 })).filter((c) => c.v > 0).sort((a, b) => b.v - a.v);
  if (!itens.length) return <div className="empty">Sem gastos lançados neste mês.</div>;
  return (
    <div>
      {itens.map((c) => (
        <div className="catrow" key={c.id}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.cor, flex: "0 0 8px" }} />
            {c.nome}
          </span>
          <span className="bar"><span style={{ width: pct(c.v / total), background: c.cor }} /></span>
          <span className="num r" style={{ textAlign: "right", fontSize: 12.5 }}>
            {pct(c.v / total)} <span className="faint">· {brl(c.v)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Login e cadastro                                                    */
/* ------------------------------------------------------------------ */

function Login({ state, setState, onEnter }) {
  const [modo, setModo] = useState("entrar");
  const [email, setEmail] = useState("vinicius@email.com");
  const [senha, setSenha] = useState("123456");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaFam, setNovaFam] = useState("");
  const [erro, setErro] = useState("");

  const entrar = () => {
    const u = state.users.find((x) => x.email === email.trim().toLowerCase() && x.senha === senha);
    if (!u) return setErro("E-mail ou senha não conferem.");
    onEnter(u.id);
  };

  const criar = () => {
    if (!nome.trim() || !email.trim() || senha.length < 6)
      return setErro("Preencha nome, e-mail e uma senha de 6 caracteres ou mais.");
    if (state.users.some((u) => u.email === email.trim().toLowerCase()))
      return setErro("Esse e-mail já tem conta. Use a opção de entrar.");
    let familiaId = null;
    let familias = state.familias;
    if (codigo.trim()) {
      const f = state.familias.find((x) => x.codigo.toLowerCase() === codigo.trim().toLowerCase());
      if (!f) return setErro("Código de convite não encontrado.");
      familiaId = f.id;
    } else if (novaFam.trim()) {
      const id = uid();
      familias = [...state.familias, {
        id, nome: novaFam.trim(), codigo: novaFam.trim().slice(0, 4).toUpperCase() + "-" + uid().slice(0, 4).toUpperCase(),
        criadaPor: "novo", regras: [{ id: uid(), nome: "Meio a meio", tipo: "igual", descricao: "Divide igualmente entre quem participa." }],
      }];
      familiaId = id;
    } else return setErro("Crie uma família ou entre com um código de convite.");
    const novo = {
      id: uid(), nome: nome.trim(), email: email.trim().toLowerCase(), senha,
      cor: ["#3D6A8F", "#C97B2B", "#4E9A8A", "#5A6EA8"][state.users.length % 4], familiaId,
    };
    setState({ ...state, users: [...state.users, novo], familias });
    onEnter(novo.id);
  };

  return (
    <div className="gf login">
      <div className="loginbox">
        <h1 style={{ marginBottom: 6 }}>Divide</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          Cada um lança o que gastou. No fim do mês, o app diz quem paga quanto pra quem.
        </p>

        <div className="card">
          <div className="pillbar" style={{ marginBottom: 18 }}>
            <button className={modo === "entrar" ? "on" : ""} onClick={() => { setModo("entrar"); setErro(""); }}>Entrar</button>
            <button className={modo === "criar" ? "on" : ""} onClick={() => { setModo("criar"); setErro(""); }}>Criar conta</button>
          </div>

          {modo === "entrar" ? (
            <div className="stack">
              <div><label className="f">E-mail</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="f">Senha</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && entrar()} /></div>
              <button className="btn" onClick={entrar}>Entrar</button>
            </div>
          ) : (
            <div className="stack">
              <div><label className="f">Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div><label className="f">E-mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="f">Senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
              <div className="grid2" style={{ gap: 12 }}>
                <div><label className="f">Código de convite</label>
                  <input placeholder="VILA-7K2M" value={codigo} onChange={(e) => setCodigo(e.target.value)} /></div>
                <div><label className="f">ou crie uma família</label>
                  <input placeholder="Nome da família" value={novaFam} onChange={(e) => setNovaFam(e.target.value)} /></div>
              </div>
              <button className="btn" onClick={criar}>Criar conta</button>
            </div>
          )}

          {erro && <p style={{ color: "#A8332A", fontSize: 13, marginTop: 12 }}>{erro}</p>}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 4 }}>Contas de teste</h3>
          <p className="faint" style={{ marginBottom: 12 }}>Senha de todas: 123456</p>
          <div className="userpick">
            {state.users.slice(0, 3).map((u) => (
              <button key={u.id} onClick={() => onEnter(u.id)}>
                <Avatar user={u} />
                <span><strong style={{ fontWeight: 600 }}>{u.nome}</strong>
                  <span className="faint" style={{ display: "block" }}>{u.email}</span></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: Entradas                                                      */
/* ------------------------------------------------------------------ */

function Entradas({ state, setState, me, mes }) {
  const [tipo, setTipo] = useState("recorrente");
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("5");
  const [data, setData] = useState(mes + "-15");

  const minhas = state.entradas.filter((e) => e.userId === me.id);
  const rec = minhas.filter((e) => e.tipo === "recorrente");
  const pon = minhas.filter((e) => e.tipo === "pontual" && (e.data || "").slice(0, 7) === mes);

  const add = () => {
    if (!desc.trim() || !+valor) return;
    const nova = { id: uid(), userId: me.id, tipo, descricao: desc.trim(), valor: +valor };
    if (tipo === "recorrente") nova.dia = +dia || 1; else nova.data = data;
    setState({ ...state, entradas: [...state.entradas, nova] });
    setDesc(""); setValor("");
  };
  const del = (id) => setState({ ...state, entradas: state.entradas.filter((e) => e.id !== id) });

  const total = rec.reduce((s, e) => s + e.valor, 0) + pon.reduce((s, e) => s + e.valor, 0);

  return (
    <>
      <div className="rowhead">
        <div>
          <h1>Minhas entradas</h1>
          <p className="sub">Recorrentes valem todo mês. Pontuais entram só no mês da data.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="faint">Total em {mesLabel(mes)}</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{brl(total)}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Lançar entrada</h3>
        <div className="formgrid">
          <div><label className="f">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="recorrente">Recorrente</option>
              <option value="pontual">Pontual</option>
            </select></div>
          <div className="span2"><label className="f">Descrição</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Salário, freela, aluguel recebido…" /></div>
          <div><label className="f">Valor</label>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></div>
          <div>{tipo === "recorrente" ? (
            <><label className="f">Dia do mês</label>
              <input type="number" min="1" max="31" value={dia} onChange={(e) => setDia(e.target.value)} /></>
          ) : (
            <><label className="f">Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} /></>
          )}</div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn" onClick={add}>Adicionar entrada</button>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Recorrentes</h3>
          {rec.length === 0 ? <div className="empty">Nenhuma entrada recorrente ainda.</div> :
            rec.map((e) => (
              <div className="memberrow" key={e.id}>
                <span style={{ flex: 1 }}>{e.descricao}
                  <span className="faint" style={{ display: "block" }}>todo dia {e.dia}</span></span>
                <span className="num" style={{ fontWeight: 600 }}>{brl(e.valor)}</span>
                <button className="btn ghost sm" onClick={() => del(e.id)}>Remover</button>
              </div>
            ))}
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Pontuais de {mesLabel(mes)}</h3>
          {pon.length === 0 ? <div className="empty">Nenhuma entrada pontual neste mês.</div> :
            pon.map((e) => (
              <div className="memberrow" key={e.id}>
                <span style={{ flex: 1 }}>{e.descricao}
                  <span className="faint" style={{ display: "block" }}>{e.data.split("-").reverse().join("/")}</span></span>
                <span className="num" style={{ fontWeight: 600 }}>{brl(e.valor)}</span>
                <button className="btn ghost sm" onClick={() => del(e.id)}>Remover</button>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: Gastos                                                        */
/* ------------------------------------------------------------------ */

function Gastos({ state, setState, me, mes, familia, membros, calc }) {
  const vazio = {
    data: mes + "-" + String(new Date().getDate()).padStart(2, "0"),
    pagamento: "Crédito", categoria: "comida", tipoGasto: "fixo",
    descricao: "", valor: "", dividir: false, participantes: [me.id], regraId: familia.regras[0].id,
  };
  const [f, setF] = useState(vazio);
  const [filtro, setFiltro] = useState("todos");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const toggleParte = (id) => {
    const has = f.participantes.includes(id);
    set("participantes", has ? f.participantes.filter((x) => x !== id) : [...f.participantes, id]);
  };

  const add = () => {
    if (!f.descricao.trim() || !+f.valor) return;
    const novo = {
      id: uid(), userId: me.id, data: f.data, pagamento: f.pagamento,
      categoria: f.categoria, tipoGasto: f.tipoGasto, descricao: f.descricao.trim(), valor: +f.valor,
      dividir: f.dividir,
      participantes: f.dividir ? (f.participantes.includes(me.id) ? f.participantes : [me.id, ...f.participantes]) : [],
      regraId: f.dividir ? f.regraId : null,
    };
    setState({ ...state, gastos: [...state.gastos, novo] });
    setF({ ...vazio, data: f.data, categoria: f.categoria });
  };
  const del = (id) => setState({ ...state, gastos: state.gastos.filter((g) => g.id !== id) });

  const linhas = calc.linhas
    .filter((g) => (filtro === "meus" ? g.userId === me.id : filtro === "divididos" ? g.dividir : true))
    .sort((a, b) => a.data.localeCompare(b.data));

  // Prévia do rateio enquanto o formulário está aberto
  const previa = f.dividir
    ? calcularCotas(
        { participantes: f.participantes, userId: me.id, regraId: f.regraId, valor: +f.valor || 0 },
        { regras: familia.regras, entradas: state.entradas, gastos: state.gastos, mes }
      )
    : null;
  const regraSel = familia.regras.find((r) => r.id === f.regraId);

  return (
    <>
      <div className="rowhead">
        <div>
          <h1>Gastos</h1>
          <p className="sub">Quem lança é quem pagou. A divisão define quanto disso é cota de cada um.</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Lançar gasto</h3>
        <div className="formgrid">
          <div><label className="f">Data</label>
            <input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} /></div>
          <div><label className="f">Tipo de pagamento</label>
            <select value={f.pagamento} onChange={(e) => set("pagamento", e.target.value)}>
              {PAGAMENTOS.map((p) => <option key={p}>{p}</option>)}
            </select></div>
          <div><label className="f">Categoria</label>
            <select value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select></div>
          <div><label className="f">Fixo ou opcional</label>
            <select value={f.tipoGasto} onChange={(e) => set("tipoGasto", e.target.value)}>
              <option value="fixo">Gasto fixo</option>
              <option value="opcional">Gasto opcional</option>
            </select></div>
          <div className="span2"><label className="f">Descrição</label>
            <input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Mercado, conta de luz, jantar…" /></div>
          <div><label className="f">Valor</label>
            <input type="number" step="0.01" value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" /></div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={f.dividir} onChange={(e) => set("dividir", e.target.checked)}
                style={{ width: 16, height: 16 }} />
              Dividir com a família
            </label>
          </div>

          {f.dividir && (
            <>
              <div className="span2">
                <label className="f">Com quem</label>
                <div className="pillbar">
                  {membros.map((u) => (
                    <button key={u.id} className={f.participantes.includes(u.id) ? "on" : ""}
                      onClick={() => toggleParte(u.id)}>
                      {u.nome}{u.id === me.id ? " (você)" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div className="span2">
                <label className="f">Rateio</label>
                <select value={f.regraId} onChange={(e) => set("regraId", e.target.value)}>
                  {familia.regras.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div className="span4">
                <div className="note">
                  <strong style={{ fontWeight: 600 }}>{regraSel?.nome}</strong> — {regraSel?.descricao}
                  <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {Object.entries(previa || {}).map(([id, share]) => {
                      const u = membros.find((m) => m.id === id);
                      if (!u) return null;
                      return (
                        <span key={id} className="num" style={{ fontSize: 13 }}>
                          {u.nome}: <strong style={{ fontWeight: 600 }}>{pct(share)}</strong>
                          {+f.valor ? ` · ${brl(+f.valor * share)}` : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="span4"><button className="btn" onClick={add}>Adicionar gasto</button></div>
        </div>
      </div>

      <div className="card">
        <div className="rowhead" style={{ marginBottom: 12 }}>
          <h3>Lançamentos de {mesLabel(mes)}</h3>
          <div className="pillbar">
            {[["todos", "Todos"], ["meus", "Só os meus"], ["divididos", "Divididos"]].map(([k, l]) => (
              <button key={k} className={filtro === k ? "on" : ""} onClick={() => setFiltro(k)}>{l}</button>
            ))}
          </div>
        </div>

        {linhas.length === 0 ? (
          <div className="empty">Nada lançado ainda neste mês. Comece pelo gasto mais recente.</div>
        ) : (
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Data</th><th>Descrição</th><th>Categoria</th><th>Fixo/Opcional</th>
                  <th>Pagamento</th><th>Quem pagou</th><th>Divisão</th>
                  <th className="r">Valor</th><th className="r">Sua cota</th><th></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((g) => {
                  const dono = membros.find((u) => u.id === g.userId);
                  const c = catOf(g.categoria);
                  const minhaCota = (g.cotas[me.id] || 0) * g.valor;
                  const regra = familia.regras.find((r) => r.id === g.regraId);
                  return (
                    <tr key={g.id}>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>{g.data.slice(8)}/{g.data.slice(5, 7)}</td>
                      <td style={{ fontWeight: 500 }}>{g.descricao}</td>
                      <td><span className="chip"><span className="sw" style={{ background: c.cor }} />{c.nome}</span></td>
                      <td><span className={"chip " + g.tipoGasto}>{g.tipoGasto === "fixo" ? "Fixo" : "Opcional"}</span></td>
                      <td className="faint">{g.pagamento}</td>
                      <td>{dono ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: dono.cor }} />{dono.nome}
                      </span> : "—"}</td>
                      <td className="faint" style={{ maxWidth: 150 }}>
                        {g.dividir ? <>{regra?.nome}<br />
                          <span style={{ fontSize: 11.5 }}>
                            {Object.entries(g.cotas).map(([id, s]) =>
                              `${membros.find((m) => m.id === id)?.nome.slice(0, 3)} ${pct(s)}`).join(" · ")}
                          </span></> : "Individual"}
                      </td>
                      <td className="r num" style={{ fontWeight: 600 }}>{brl(g.valor)}</td>
                      <td className="r num" style={{ color: minhaCota ? "var(--ink)" : "var(--ink-faint)" }}>
                        {minhaCota ? brl(minhaCota) : "—"}</td>
                      <td className="r">{g.userId === me.id &&
                        <button className="btn ghost sm" onClick={() => del(g.id)}>Excluir</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: Meu painel                                                    */
/* ------------------------------------------------------------------ */

function MeuPainel({ me, mes, calc, membros }) {
  const d = calc.porUsuario[me.id];
  const saldoMes = d.entrada - d.cota;
  const meuSaldo = calc.saldo[me.id];

  return (
    <>
      <div className="rowhead">
        <div>
          <h1>Meu painel</h1>
          <p className="sub">Sua cota real: gastos individuais mais a sua parte do que foi dividido.</p>
        </div>
      </div>

      <div className="grid3">
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Entrou</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{brl(d.entrada)}</div>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Sua cota de gastos</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{brl(d.cota)}</div>
          <div className="faint" style={{ marginTop: 4 }}>saiu do seu bolso: {brl(d.pago)}</div>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Sobrou</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4, color: saldoMes >= 0 ? "var(--credit)" : "var(--debit)" }}>
            {brl(saldoMes)}
          </div>
          <div className="faint" style={{ marginTop: 4 }}>
            {d.entrada ? pct(saldoMes / d.entrada) : "0%"} da sua entrada
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 16 }}>Fixo contra opcional</h3>
          <Donut fixo={d.fixo} opcional={d.opcional} />
          <p className="faint" style={{ marginTop: 16 }}>
            {d.fixo + d.opcional > 0 && d.opcional / (d.fixo + d.opcional) > 0.35
              ? "Mais de um terço da sua cota é gasto opcional — é aí que dá pra mexer sem mudar de vida."
              : "Sua base fixa domina o mês. Cortar aqui exige renegociar contrato, não só hábito."}
          </p>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Onde o dinheiro foi</h3>
          <Categorias mapa={d.categorias} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Seu acerto em {mesLabel(mes)}</h3>
        {Math.abs(meuSaldo) < 0.01 ? (
          <p className="sub">Você está quite com todo mundo neste mês.</p>
        ) : meuSaldo > 0 ? (
          <p className="acerto">Você tem <span style={{ color: "var(--credit)" }}>{brl(meuSaldo)}</span> a receber.</p>
        ) : (
          <p className="acerto">Você tem <span className="v">{brl(-meuSaldo)}</span> a pagar.</p>
        )}
        <p className="faint" style={{ marginTop: 10 }}>
          Diferença entre o que saiu do seu bolso ({brl(d.pago)}) e a sua cota ({brl(d.cota)}).
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: Painel da família                                             */
/* ------------------------------------------------------------------ */

function PainelFamilia({ familia, membros, mes, calc }) {
  const totalEntradas = membros.reduce((s, u) => s + calc.porUsuario[u.id].entrada, 0);
  const maxCota = Math.max(...membros.map((u) => calc.porUsuario[u.id].cota), 1);
  const catFam = {};
  membros.forEach((u) =>
    Object.entries(calc.porUsuario[u.id].categorias).forEach(([k, v]) => { catFam[k] = (catFam[k] || 0) + v; })
  );
  const fixoFam = membros.reduce((s, u) => s + calc.porUsuario[u.id].fixo, 0);
  const opcFam = membros.reduce((s, u) => s + calc.porUsuario[u.id].opcional, 0);

  return (
    <>
      <div className="rowhead">
        <div>
          <h1>{familia.nome}</h1>
          <p className="sub">Consolidado de {membros.length} pessoas em {mesLabel(mes)}.</p>
        </div>
      </div>

      <div className="card" style={{ background: "#12332C", borderColor: "#12332C", color: "#E7EDE9" }}>
        <div style={{ fontSize: 12.5, color: "#8FAFA4", marginBottom: 10 }}>Acerto do mês</div>
        {calc.transferencias.length === 0 ? (
          <p className="acerto" style={{ color: "#fff" }}>Ninguém deve nada a ninguém.</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {calc.transferencias.map((t, i) => {
              const de = membros.find((u) => u.id === t.de), para = membros.find((u) => u.id === t.para);
              return (
                <p className="acerto" style={{ color: "#fff" }} key={i}>
                  {de?.nome} paga <span className="num" style={{ color: "#F0C64F" }}>{brl(t.valor)}</span> para {para?.nome}
                </p>
              );
            })}
          </div>
        )}
        <p style={{ fontSize: 12.5, color: "#8FAFA4", marginTop: 14 }}>
          Menor número de transferências que zera todos os saldos do mês.
        </p>
      </div>

      <div className="grid3" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Entradas da família</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{brl(totalEntradas)}</div>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Gastos da família</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{brl(calc.totalMes)}</div>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Sobra conjunta</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: totalEntradas - calc.totalMes >= 0 ? "var(--credit)" : "var(--debit)" }}>
            {brl(totalEntradas - calc.totalMes)}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Pessoa a pessoa</h3>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Membro</th><th className="r">Entrou</th><th className="r">Pagou</th>
                <th className="r">Cota justa</th><th style={{ width: 150 }}>Peso no gasto</th><th className="r">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((u) => {
                const d = calc.porUsuario[u.id], s = calc.saldo[u.id];
                return (
                  <tr key={u.id}>
                    <td><span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Avatar user={u} />
                      <span><strong style={{ fontWeight: 600 }}>{u.nome}</strong>
                        <span className="faint" style={{ display: "block" }}>
                          {d.entrada ? pct(d.cota / d.entrada) : "0%"} da entrada comprometida
                        </span></span>
                    </span></td>
                    <td className="r num">{brl(d.entrada)}</td>
                    <td className="r num">{brl(d.pago)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{brl(d.cota)}</td>
                    <td><span className="bar" style={{ display: "block", marginTop: 6 }}>
                      <span style={{ width: pct(d.cota / maxCota), background: u.cor }} /></span></td>
                    <td className="r num" style={{ fontWeight: 600, color: s > 0.005 ? "var(--credit)" : s < -0.005 ? "var(--debit)" : "var(--ink-faint)" }}>
                      {Math.abs(s) < 0.01 ? "quite" : (s > 0 ? "+" : "−") + brl(Math.abs(s)).replace("R$", "R$ ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ marginTop: 12 }}>
          Saldo positivo significa que a pessoa adiantou dinheiro pelos outros e tem a receber.
        </p>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 16 }}>Fixo contra opcional na casa</h3>
          <Donut fixo={fixoFam} opcional={opcFam} />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Categorias da casa</h3>
          <Categorias mapa={catFam} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: Família e rateios                                             */
/* ------------------------------------------------------------------ */

function Familia({ state, setState, familia, membros, me, mes }) {
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("fixo");
  const [unidade, setUnidade] = useState("km");
  const [copiado, setCopiado] = useState(false);

  const upd = (regras) =>
    setState({ ...state, familias: state.familias.map((f) => (f.id === familia.id ? { ...f, regras } : f)) });

  const addRegra = () => {
    if (!novoNome.trim()) return;
    const base = { id: uid(), nome: novoNome.trim(), tipo: novoTipo };
    if (novoTipo === "fixo") {
      base.descricao = "Percentuais combinados uma vez.";
      base.pesos = Object.fromEntries(membros.map((u, i) => [u.id, i === 0 ? 100 : 0]));
    }
    if (novoTipo === "medidor") {
      base.descricao = `Todo mês cada um lança seu ${unidade}; o sistema converte em percentual.`;
      base.unidade = unidade; base.medicoes = {};
    }
    if (novoTipo === "igual") base.descricao = "Divide igualmente entre quem participa.";
    if (novoTipo === "renda") base.descricao = "Cada um paga na proporção da sua entrada recorrente.";
    if (novoTipo === "sobra") base.descricao = "Proporção da renda recorrente menos os gastos fixos individuais.";
    upd([...familia.regras, base]);
    setNovoNome("");
  };

  const setPeso = (rid, uid_, v) =>
    upd(familia.regras.map((r) => (r.id === rid ? { ...r, pesos: { ...r.pesos, [uid_]: +v || 0 } } : r)));

  const setMedicao = (rid, uid_, v) =>
    upd(familia.regras.map((r) =>
      r.id === rid ? { ...r, medicoes: { ...r.medicoes, [mes]: { ...(r.medicoes?.[mes] || {}), [uid_]: +v || 0 } } } : r
    ));

  const delRegra = (rid) => upd(familia.regras.filter((r) => r.id !== rid));

  const usoDaRegra = (rid) => state.gastos.filter((g) => g.regraId === rid).length;

  return (
    <>
      <div className="rowhead">
        <div>
          <h1>{familia.nome}</h1>
          <p className="sub">Membros, convite e as regras de rateio que aparecem no formulário de gasto.</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Membros</h3>
          {membros.map((u) => (
            <div className="memberrow" key={u.id}>
              <Avatar user={u} lg />
              <span style={{ flex: 1 }}>
                <strong style={{ fontWeight: 600 }}>{u.nome}{u.id === me.id ? " (você)" : ""}</strong>
                <span className="faint" style={{ display: "block" }}>{u.email}</span>
              </span>
              {familia.criadaPor === u.id && <span className="chip">Criou a família</span>}
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 6 }}>Convidar alguém</h3>
          <p className="sub" style={{ marginBottom: 14 }}>
            Quem tiver esse código entra na família ao criar a conta e passa a ver estes lançamentos.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="num" style={{
              fontSize: 22, fontWeight: 600, letterSpacing: "0.06em",
              background: "#EDF0EB", padding: "10px 16px", borderRadius: 10,
            }}>{familia.codigo}</span>
            <button className="btn ghost" onClick={() => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); }}>
              {copiado ? "Código copiado" : "Copiar código"}
            </button>
          </div>
          <div className="note" style={{ marginTop: 16 }}>
            Nenhum dado desta família aparece para quem está fora dela. No banco, isso vira uma
            política por linha: toda consulta é filtrada pela família do usuário logado.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="rowhead" style={{ marginBottom: 8 }}>
          <div>
            <h3>Regras de rateio</h3>
            <p className="sub">São essas opções que aparecem no campo “Rateio” de cada gasto dividido.</p>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 14 }}>
          {familia.regras.map((r) => (
            <div key={r.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
              <div className="rowhead" style={{ marginBottom: 10 }}>
                <div>
                  <strong style={{ fontWeight: 600, fontSize: 14.5 }}>{r.nome}</strong>
                  <p className="faint">{r.descricao}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="chip">{usoDaRegra(r.id)} gasto(s) usando</span>
                  {usoDaRegra(r.id) === 0 && familia.regras.length > 1 &&
                    <button className="btn danger sm" onClick={() => delRegra(r.id)}>Excluir</button>}
                </div>
              </div>

              {r.tipo === "fixo" && (
                <div className="formgrid">
                  {membros.map((u) => (
                    <div key={u.id}>
                      <label className="f">{u.nome} (%)</label>
                      <input type="number" min="0" max="100" value={r.pesos?.[u.id] ?? 0}
                        onChange={(e) => setPeso(r.id, u.id, e.target.value)} />
                    </div>
                  ))}
                  <div className="span4 faint">
                    Soma atual: {Object.values(r.pesos || {}).reduce((s, v) => s + v, 0)}%. Se não fechar 100,
                    o app normaliza proporcionalmente entre quem participa do gasto.
                  </div>
                </div>
              )}

              {r.tipo === "medidor" && (
                <div>
                  <p className="faint" style={{ marginBottom: 10 }}>
                    Medição de {mesLabel(mes)} — unidade: {r.unidade}
                  </p>
                  <div className="formgrid">
                    {membros.map((u) => {
                      const med = r.medicoes?.[mes] || {};
                      const tot = Object.values(med).reduce((s, v) => s + v, 0);
                      return (
                        <div key={u.id}>
                          <label className="f">{u.nome} ({r.unidade})</label>
                          <input type="number" min="0" value={med[u.id] ?? ""}
                            placeholder="0" onChange={(e) => setMedicao(r.id, u.id, e.target.value)} />
                          <div className="faint num" style={{ marginTop: 4 }}>
                            {tot ? pct((med[u.id] || 0) / tot) : "sem medição"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {["igual", "renda", "sobra"].includes(r.tipo) && (
                <div className="formgrid">
                  {membros.map((u) => {
                    const cotas = calcularCotas(
                      { participantes: membros.map((m) => m.id), userId: u.id, regraId: r.id, valor: 100 },
                      { regras: familia.regras, entradas: state.entradas, gastos: state.gastos, mes }
                    );
                    return (
                      <div key={u.id}>
                        <label className="f">{u.nome}</label>
                        <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{pct(cotas[u.id] || 0)}</div>
                      </div>
                    );
                  })}
                  <div className="span4 faint">Calculado com os dados de {mesLabel(mes)}, para todos os membros.</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: 18, paddingTop: 18 }}>
          <h3 style={{ marginBottom: 12 }}>Criar regra</h3>
          <div className="formgrid">
            <div className="span2"><label className="f">Nome</label>
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Mercado por pessoa em casa" /></div>
            <div><label className="f">Base do cálculo</label>
              <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
                <option value="igual">Partes iguais</option>
                <option value="renda">Renda recorrente</option>
                <option value="sobra">Sobra livre</option>
                <option value="fixo">Percentual fixo</option>
                <option value="medidor">Medidor mensal</option>
              </select></div>
            {novoTipo === "medidor" ? (
              <div><label className="f">Unidade medida</label>
                <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="km, dias, litros…" /></div>
            ) : <div />}
            <div className="span4"><button className="btn" onClick={addRegra}>Criar regra</button></div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [state, setState] = useState(seed);
  const [sessao, setSessao] = useState(null);
  const [tela, setTela] = useState("familia-painel");
  const [mes, setMes] = useState(MES0);

  const me = state.users.find((u) => u.id === sessao);
  const familia = me ? state.familias.find((f) => f.id === me.familiaId) : null;
  const membros = useMemo(
    () => (familia ? state.users.filter((u) => u.familiaId === familia.id) : []),
    [state.users, familia]
  );

  // Escopo de privacidade: só entram no cálculo os dados dos membros desta família.
  const escopo = useMemo(() => {
    if (!familia) return null;
    const ids = new Set(membros.map((u) => u.id));
    return {
      users: membros,
      familias: [familia],
      entradas: state.entradas.filter((e) => ids.has(e.userId)),
      gastos: state.gastos.filter((g) => ids.has(g.userId)),
    };
  }, [state, familia, membros]);

  const calc = useMemo(() => (escopo ? consolidar(escopo, mes) : null), [escopo, mes]);

  if (!me) return (<><style>{CSS}</style><Login state={state} setState={setState} onEnter={setSessao} /></>);

  const telas = [
    ["familia-painel", "Painel da família"],
    ["meu-painel", "Meu painel"],
    ["gastos", "Gastos"],
    ["entradas", "Entradas"],
    ["familia", "Família e rateios"],
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="gf">
        <div className="shell">
          <nav className="rail">
            <div className="brand">Divide<small>{familia.nome}</small></div>
            <div className="navlist">
              {telas.map(([k, l]) => (
                <button key={k} className={"navbtn" + (tela === k ? " on" : "")} onClick={() => setTela(k)}>
                  <span className="dot" />{l}
                </button>
              ))}
            </div>
            <div className="railfoot">
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <Avatar user={me} />
                <span style={{ color: "#fff", fontSize: 13 }}>{me.nome}</span>
              </div>
              <button onClick={() => { setSessao(null); setTela("familia-painel"); }}>Sair da conta</button>
            </div>
          </nav>

          <main className="main">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
              <MesNav mes={mes} setMes={setMes} />
            </div>

            {tela === "familia-painel" && <PainelFamilia familia={familia} membros={membros} mes={mes} calc={calc} />}
            {tela === "meu-painel" && <MeuPainel me={me} mes={mes} calc={calc} membros={membros} />}
            {tela === "gastos" && (
              <Gastos state={state} setState={setState} me={me} mes={mes}
                familia={familia} membros={membros} calc={calc} />
            )}
            {tela === "entradas" && <Entradas state={state} setState={setState} me={me} mes={mes} />}
            {tela === "familia" && (
              <Familia state={state} setState={setState} familia={familia} membros={membros} me={me} mes={mes} />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
