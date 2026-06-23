import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import ModelEditor from "./ModelEditor";

const COLORS = {
  bg: "#F7F8FA",
  white: "#FFFFFF",
  border: "#E4E7ED",
  panel: "#F0F2F5",
  blue: "#5B6AF5",
  blueLight: "#EEF0FE",
  green: "#22C55E",
  greenLight: "#DCFCE7",
  yellow: "#F59E0B",
  yellowLight: "#FEF3C7",
  red: "#EF4444",
  redLight: "#FEE2E2",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
};

const CASOS = [
  { id: 1, label: "Caso 1 — M/M/1 Simple" },
  { id: 2, label: "Caso 2 — En Serie" },
  { id: 3, label: "Caso 3 — Compuerta XOR" },
  { id: "editor", label: "✏️ Editor" }
];

// ─── SIMULACIÓN REAL ──────────────────────────────────────────────────────────
// Genera entidades con distribución exponencial y calcula métricas reales

function exponential(mean) {
  return -mean * Math.log(1 - Math.random());
}

function runSimulation(caso, params) {
  const { tSim, tLlegada, tServicio, servidores, probDulces, limiteEntidades } = params;
  const maxT = parseFloat(tSim) || 120;
  const meanLlegada = parseFloat(tLlegada) || 8;
  const meanServicio = parseFloat(tServicio) || 12;
  const c = parseInt(servidores) || 1;
  const pDulces = parseFloat(probDulces) || 0.55;
  const limiteMax = limiteEntidades ? (parseInt(limiteEntidades) || Infinity) : Infinity;

  // Generar llegadas
  let t = 0;
  const llegadas = [];
  let id = 1;
  while (true) {
    t += exponential(meanLlegada);
    if (t > maxT) break;
    if (id > limiteMax) break;
    llegadas.push({ id, tLlegada: parseFloat(t.toFixed(1)) });
    id++;
  }

  // Simular colas por caso
  const rows = [];
  let totalEspera = 0;
  let totalSistema = 0;
  let contadorSi = 0;
  let contadorNo = 0;

  // Servidores: array con tiempo en que quedan libres
  const servidoresLibres = Array(c).fill(0);

  for (const ent of llegadas) {
    const tArr = ent.tLlegada;

    if (caso === 1) {
      // Elegir servidor más libre
      const srv = servidoresLibres.indexOf(Math.min(...servidoresLibres));
      const tInicioServ = Math.max(tArr, servidoresLibres[srv]);
      const tServ = parseFloat(exponential(meanServicio).toFixed(1));
      const tFin = parseFloat((tInicioServ + tServ).toFixed(1));
      const espera = parseFloat((tInicioServ - tArr).toFixed(1));
      servidoresLibres[srv] = tFin;
      totalEspera += espera;
      totalSistema += tFin - tArr;
      rows.push([`Cliente ${ent.id}`, tArr.toFixed(1), tInicioServ.toFixed(1), tFin.toFixed(1), espera.toFixed(1)]);
    }

    if (caso === 2) {
      // 3 actividades en serie
      const srv = servidoresLibres.indexOf(Math.min(...servidoresLibres));
      let tCurr = Math.max(tArr, servidoresLibres[srv]);
      const t1 = parseFloat(exponential(meanServicio).toFixed(1));
      const tFinTaq = parseFloat((tCurr + t1).toFixed(1));
      const t2 = parseFloat(exponential(meanServicio * 0.4).toFixed(1));
      const tFinRev = parseFloat((tFinTaq + t2).toFixed(1));
      const t3 = parseFloat(exponential(meanServicio * 0.3).toFixed(1));
      const tFinEnt = parseFloat((tFinRev + t3).toFixed(1));
      const espera = parseFloat((tCurr - tArr).toFixed(1));
      const total = parseFloat((tFinEnt - tArr).toFixed(1));
      servidoresLibres[srv] = tFinEnt;
      totalEspera += espera;
      totalSistema += total;
      rows.push([`Cliente ${ent.id}`, tArr.toFixed(1), tFinTaq.toFixed(1), tFinRev.toFixed(1), tFinEnt.toFixed(1), total.toFixed(1)]);
    }

    if (caso === 3) {
      const srv = servidoresLibres.indexOf(Math.min(...servidoresLibres));
      const tInicioServ = Math.max(tArr, servidoresLibres[srv]);
      const tServ = parseFloat(exponential(meanServicio).toFixed(1));
      const tFinTaq = parseFloat((tInicioServ + tServ).toFixed(1));
      const quiereDulces = Math.random() < pDulces;
      let tFinDulc = "—";
      let tSalida;
      if (quiereDulces) {
        const tDulc = parseFloat(exponential(meanServicio * 0.6).toFixed(1));
        tFinDulc = parseFloat((tFinTaq + tDulc).toFixed(1)).toFixed(1);
        tSalida = parseFloat(tFinDulc);
        contadorSi++;
      } else {
        tSalida = tFinTaq;
        contadorNo++;
      }
      const espera = parseFloat((tInicioServ - tArr).toFixed(1));
      servidoresLibres[srv] = tFinTaq;
      totalEspera += espera;
      totalSistema += tSalida - tArr;
      rows.push([
        `Cliente ${ent.id}`,
        tArr.toFixed(1),
        tFinTaq.toFixed(1),
        quiereDulces ? "Sí" : "No",
        tFinDulc === "—" ? "—" : tFinDulc,
        tSalida.toFixed(1),
      ]);
    }
  }

  const n = llegadas.length;
  const uso = Math.min(100, ((meanServicio / meanLlegada / c) * 100));
  const wqProm = n > 0 ? (totalEspera / n) : 0;
  const wProm = n > 0 ? (totalSistema / n) : 0;

  // Métricas por caso
  let metrics = [];
  if (caso === 1) {
    metrics = [
      { key: "Entidades atendidas", value: String(n), unit: "", sub: `de ${n} llegadas`, color: COLORS.blue },
      { key: "Tiempo de espera prom.", value: wqProm.toFixed(1), unit: " min", sub: "Promedio en cola", color: COLORS.blue },
      { key: "Utilización servidor", value: uso.toFixed(1), unit: "%", sub: `${c} servidor(es)`, color: COLORS.green, bar: Math.round(uso) },
      { key: "Tiempo en sistema", value: wProm.toFixed(1), unit: " min", sub: "Espera + servicio", color: COLORS.blue },
    ];
  } else if (caso === 2) {
    metrics = [
      { key: "Entidades atendidas", value: String(n), unit: "", sub: `de ${n} llegadas`, color: COLORS.blue },
      { key: "T. total promedio", value: wProm.toFixed(1), unit: " min", sub: "Por entidad", color: COLORS.blue },
      { key: "Utilización taquilla", value: uso.toFixed(1), unit: "%", sub: "Cuello de botella", color: COLORS.green, bar: Math.round(uso) },
      { key: "T. espera promedio", value: wqProm.toFixed(1), unit: " min", sub: "En cola de taquilla", color: COLORS.blue },
    ];
  } else {
    metrics = [
      { key: "Entidades atendidas", value: String(n), unit: "", sub: `de ${n} llegadas`, color: COLORS.blue },
      { key: "Rama Sí (dulces)", value: String(contadorSi), unit: "", sub: `${n > 0 ? ((contadorSi / n) * 100).toFixed(0) : 0}% del total`, color: COLORS.yellow },
      { key: "Rama No (directo)", value: String(contadorNo), unit: "", sub: `${n > 0 ? ((contadorNo / n) * 100).toFixed(0) : 0}% del total`, color: COLORS.blue },
      { key: "Utilización taquilla", value: uso.toFixed(1), unit: "%", sub: `ρ = λ/μ`, color: COLORS.green, bar: Math.round(uso) },
    ];
  }

  const headers = caso === 1
    ? ["Cliente", "Llegada", "Inicio Serv.", "Fin Serv.", "Espera"]
    : caso === 2
    ? ["Cliente", "Llegada", "Fin Taq.", "Fin Rev.", "Fin Ent.", "T.Total"]
    : ["Cliente", "Llegada", "Fin Taq.", "¿Dulces?", "Fin Dulc.", "Salida"];

  return {
    metrics,
    headers,
    rows,
    stats: { llegadas: n, salidas: n, uso: Math.round(uso), contadorSi, contadorNo },
  };
}

// ─── STEPS animación ──────────────────────────────────────────────────────────

const STEPS = {
  1: [
    { node: "llegada", msg: "Cliente #1 llega al sistema" },
    { node: "taquilla", msg: "Inicia atención en taquilla" },
    { node: "salida", msg: "Cliente #1 sale del sistema" },
    { node: "llegada", msg: "Cliente #2 llega al sistema" },
    { node: "taquilla", msg: "Inicia atención en taquilla" },
    { node: "salida", msg: "Cliente #2 sale del sistema" },
  ],
  2: [
    { node: "llegada", msg: "Cliente llega al sistema" },
    { node: "taquilla", msg: "Compra boleto en taquilla" },
    { node: "revision", msg: "Pasa revisión de boleto" },
    { node: "entrada", msg: "Cruza la entrada" },
    { node: "sala", msg: "Cliente en sala" },
  ],
  3: [
    { node: "llegada", msg: "Cliente llega al sistema" },
    { node: "taquilla", msg: "Compra boleto en taquilla" },
    { node: "gateway", msg: "Evaluando compuerta XOR — ¿quiere dulces?" },
    { node: "comprar", msg: "Sí → Va a dulcería" },
    { node: "salidaA", msg: "Entra a sala con dulces" },
  ],
};

// ─── NODE SHAPES ──────────────────────────────────────────────────────────────

function CircleNode({ x, y, label, sublabel, color, filled, active, onClick }) {
  const c = color || COLORS.blue;
  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      <circle cx={x} cy={y} r={28} fill={active ? c : COLORS.white} stroke={c} strokeWidth={2.5} />
      {filled && <circle cx={x} cy={y} r={14} fill={c} />}
      {!filled && <rect x={x - 8} y={y - 8} width={16} height={16} rx={3} fill={active ? COLORS.white : c} />}
      {label && (
        <text x={x} y={y + 46} textAnchor="middle" fill={COLORS.textSecondary} fontSize={13} fontFamily="Inter, sans-serif" fontWeight="500">
          {label}
        </text>
      )}
      {sublabel && (
        <text x={x} y={y + 62} textAnchor="middle" fill={COLORS.textMuted} fontSize={11} fontFamily="Inter, sans-serif">
          {sublabel}
        </text>
      )}
    </g>
  );
}

function RectNode({ x, y, w = 160, h = 72, label, sublabel, badge, color, active, onClick }) {
  const c = color || COLORS.blue;
  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      {badge && (
        <text x={x} y={y - h / 2 - 8} textAnchor="middle" fill={COLORS.textMuted} fontSize={10} fontFamily="Inter, sans-serif">
          • {badge}
        </text>
      )}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={10}
        fill={active ? COLORS.blueLight : COLORS.white}
        stroke={active ? c : COLORS.border} strokeWidth={active ? 2 : 1.5} />
      <rect x={x - w / 2 + 12} y={y - 10} width={16} height={16} rx={4} fill={active ? c : COLORS.blueLight} />
      <text x={x - w / 2 + 20} y={y + 4} textAnchor="middle" fill={active ? COLORS.white : c} fontSize={10} fontFamily="Inter">■</text>
      <text x={x - w / 2 + 36} y={y - 2} textAnchor="start" fill={COLORS.textPrimary} fontSize={13} fontFamily="Inter, sans-serif" fontWeight="600">
        {label}
      </text>
      {sublabel && (
        <text x={x - w / 2 + 36} y={y + 14} textAnchor="start" fill={COLORS.textMuted} fontSize={9} fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.5">
          {sublabel}
        </text>
      )}
      {label && (
        <text x={x} y={y + h / 2 + 18} textAnchor="middle" fill={COLORS.textSecondary} fontSize={12} fontFamily="Inter, sans-serif">
          Servicio
        </text>
      )}
    </g>
  );
}

function DiamondNode({ x, y, label, subLabel, active, onClick, countSi, countNo }) {
  const s = 34;
  const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      <polygon points={points}
        fill={active ? COLORS.yellowLight : COLORS.white}
        stroke={COLORS.yellow} strokeWidth={2} />
      <text x={x} y={y - 2} textAnchor="middle" fill={COLORS.yellow} fontSize={11} fontFamily="Inter" fontWeight="700">{label}</text>
      {subLabel && <text x={x} y={y + 12} textAnchor="middle" fill={COLORS.textSecondary} fontSize={10} fontFamily="Inter">{subLabel}</text>}
      {/* Contadores de rama */}
      {countSi !== undefined && (
        <text x={x + s + 30} y={y - 20} textAnchor="middle" fill={COLORS.yellow} fontSize={10} fontFamily="Inter" fontWeight="600">
          Sí: {countSi}
        </text>
      )}
      {countNo !== undefined && (
        <text x={x + s + 30} y={y + 30} textAnchor="middle" fill={COLORS.textSecondary} fontSize={10} fontFamily="Inter" fontWeight="600">
          No: {countNo}
        </text>
      )}
    </g>
  );
}

function DashedArrow({ x1, y1, x2, y2, label, color }) {
  const c = color || COLORS.textMuted;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const ex = x2 - ux * 10, ey = y2 - uy * 10;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={c} strokeWidth={1.5} strokeDasharray="5,4" />
      <polygon points={`${x2},${y2} ${x2 - ux * 10 - uy * 5},${y2 - uy * 10 + ux * 5} ${x2 - ux * 10 + uy * 5},${y2 - uy * 10 - ux * 5}`} fill={c} />
      {label && <text x={mx} y={my - 8} textAnchor="middle" fill={c} fontSize={11} fontFamily="Inter">{label}</text>}
    </g>
  );
}

// ─── DIAGRAMS ─────────────────────────────────────────────────────────────────

function Diagram1({ active, onNodeClick, stats }) {
  const a = active || {};
  return (
    <svg width="100%" viewBox="0 0 600 160" style={{ overflow: "visible" }}>
      <DashedArrow x1={88} y1={80} x2={178} y2={80} />
      <DashedArrow x1={338} y1={80} x2={428} y2={80} />
      <CircleNode x={60} y={80} label="Llegada" sublabel={stats ? `${stats.llegadas} ents.` : ""} filled active={a.llegada} onClick={() => onNodeClick("llegada")} />
      <RectNode x={258} y={80} label="Taquilla" sublabel="ACTIVIDAD · 1 SERVIDOR" badge={stats ? `${stats.uso}% uso` : ""} active={a.taquilla} onClick={() => onNodeClick("taquilla")} />
      <CircleNode x={456} y={80} label="Fin" sublabel={stats ? `${stats.salidas} salidas` : ""} filled={false} color={COLORS.textMuted} active={a.salida} onClick={() => onNodeClick("salida")} />
    </svg>
  );
}

function Diagram2({ active, onNodeClick, stats }) {
  const a = active || {};
  return (
    <svg width="100%" viewBox="0 0 820 160" style={{ overflow: "visible" }}>
      <DashedArrow x1={88} y1={80} x2={158} y2={80} />
      <DashedArrow x1={318} y1={80} x2={388} y2={80} />
      <DashedArrow x1={548} y1={80} x2={618} y2={80} />
      <DashedArrow x1={778} y1={80} x2={820} y2={80} />
      <CircleNode x={60} y={80} label="Llegada" sublabel={stats ? `${stats.llegadas} ents.` : ""} filled active={a.llegada} onClick={() => onNodeClick("llegada")} />
      <RectNode x={238} y={80} label="Taquilla" sublabel="ACTIVIDAD · 1 SERVIDOR" badge={stats ? `${stats.uso}% uso` : ""} active={a.taquilla} onClick={() => onNodeClick("taquilla")} />
      <RectNode x={468} y={80} label="Revisión" sublabel="ACTIVIDAD · 1 SERVIDOR" active={a.revision} onClick={() => onNodeClick("revision")} />
      <RectNode x={698} y={80} label="Entrada" sublabel="ACTIVIDAD · 1 SERVIDOR" active={a.entrada} onClick={() => onNodeClick("entrada")} />
    </svg>
  );
}

function Diagram3({ active, onNodeClick, stats }) {
  const a = active || {};
  return (
    <svg width="100%" viewBox="0 0 780 260" style={{ overflow: "visible" }}>
      <DashedArrow x1={88} y1={130} x2={158} y2={130} />
      <DashedArrow x1={318} y1={130} x2={388} y2={130} />
      <DashedArrow x1={424} y1={96} x2={504} y2={50} label="Sí" color={COLORS.yellow} />
      <DashedArrow x1={424} y1={164} x2={504} y2={210} label="No" color={COLORS.textMuted} />
      <DashedArrow x1={664} y1={50} x2={720} y2={50} />
      <DashedArrow x1={664} y1={210} x2={720} y2={210} />
      <CircleNode x={60} y={130} label="Llegada" sublabel={stats ? `${stats.llegadas} ents.` : ""} filled active={a.llegada} onClick={() => onNodeClick("llegada")} />
      <RectNode x={238} y={130} label="Taquilla" sublabel="ACTIVIDAD · 1 SERVIDOR" badge={stats ? `${stats.uso}% uso` : ""} active={a.taquilla} onClick={() => onNodeClick("taquilla")} />
      <DiamondNode
        x={422} y={130} label="XOR" subLabel="¿Dulces?" active={a.gateway}
        onClick={() => onNodeClick("gateway")}
        countSi={stats ? stats.contadorSi : undefined}
        countNo={stats ? stats.contadorNo : undefined}
      />
      <RectNode x={584} y={50} w={160} h={64} label="Comprar" sublabel="ACTIVIDAD · DULCERÍA" active={a.comprar} color={COLORS.yellow} onClick={() => onNodeClick("comprar")} />
      <RectNode x={584} y={210} w={160} h={64} label="Ir a sala" sublabel="ACTIVIDAD · DIRECTO" active={a.sala} onClick={() => onNodeClick("sala")} />
      <CircleNode x={742} y={50} label="Fin A" sublabel={stats ? `${stats.contadorSi} ents.` : ""} filled={false} color={COLORS.textMuted} active={a.salidaA} onClick={() => onNodeClick("salidaA")} />
      <CircleNode x={742} y={210} label="Fin B" sublabel={stats ? `${stats.contadorNo} ents.` : ""} filled={false} color={COLORS.textMuted} active={a.salidaB} onClick={() => onNodeClick("salidaB")} />
    </svg>
  );
}

const DIAGRAMS = { 1: Diagram1, 2: Diagram2, 3: Diagram3 };

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [caso, setCaso] = useState(3);
  const [activeNode, setActiveNode] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [simRunning, setSim] = useState(false);
  const [simDone, setSimDone] = useState(false);
  const [tSim, setTSim] = useState("120");
  const [llegada, setLlegada] = useState("8");
  const [servicio, setServicio] = useState("12");
  const [servidores, setServidores] = useState("1");
  const [prob, setProb] = useState("0.55");
  const [limiteEntidades, setLimiteEntidades] = useState("");
  const [usarLimite, setUsarLimite] = useState(false);
  const [log, setLog] = useState([]);
  const [filterEspera, setFilterEspera] = useState(false);
  const [simResults, setSimResults] = useState(null);

  const steps = STEPS[caso] || [];
  const DiagramComp = DIAGRAMS[caso];
  const casoLabel = CASOS.find((c) => c.id === caso)?.label || "";

  // Resultados actuales: los calculados o placeholder vacío
  const results = simResults || {
    metrics: [],
    headers: caso === 1
      ? ["Cliente", "Llegada", "Inicio Serv.", "Fin Serv.", "Espera"]
      : caso === 2
      ? ["Cliente", "Llegada", "Fin Taq.", "Fin Rev.", "Fin Ent.", "T.Total"]
      : ["Cliente", "Llegada", "Fin Taq.", "¿Dulces?", "Fin Dulc.", "Salida"],
    rows: [],
    stats: null,
  };

  useEffect(() => {
    setActiveNode(null);
    setStepIndex(-1);
    setSim(false);
    setSimDone(false);
    setLog([]);
    setFilterEspera(false);
    setSimResults(null);
  }, [caso]);

  const handleSimulate = () => {
    // Calcular resultados reales primero
    const res = runSimulation(caso, {
      tSim, tLlegada: llegada, tServicio: servicio, servidores,
      probDulces: prob,
      limiteEntidades: usarLimite ? limiteEntidades : null,
    });
    setSimResults(res);
    setSim(true);
    setSimDone(false);
    setStepIndex(0);
    setLog([]);
    setActiveNode(null);
  };

  useEffect(() => {
    if (!simRunning || stepIndex < 0) return;
    if (stepIndex >= steps.length) {
      setSim(false);
      setSimDone(true);
      setActiveNode(null);
      return;
    }
    const s = steps[stepIndex];
    setActiveNode(s.node);
    setLog((prev) => [...prev, s.msg]);
    const t = setTimeout(() => setStepIndex((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [simRunning, stepIndex]);

  const handleExport = () => {
    if (!simResults) return;
    const data = [
      ["PROCSIM — Exportación de resultados"],
      [],
      ["PARÁMETROS"],
      ["Caso", casoLabel],
      ["T. entre llegadas (min)", llegada],
      ["T. de servicio (min)", servicio],
      ["Servidores", servidores],
      ...(caso === 3 ? [["P(dulces)", prob]] : []),
      ["T. simulación (min)", tSim],
      ...(usarLimite ? [["Límite de entidades", limiteEntidades]] : []),
      [],
      ["MÉTRICAS"],
      ...simResults.metrics.map((m) => [m.key, `${m.value}${m.unit}`]),
      [],
      ["TRAZA DE EVENTOS"],
      simResults.headers,
      ...simResults.rows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Simulación");
    XLSX.writeFile(wb, `procsim_caso${caso}.xlsx`);
  };

  const activeMap = activeNode ? { [activeNode]: true } : {};

  const filteredRows = filterEspera
    ? results.rows.filter((r) => {
        const espera = r[r.length - 1];
        const num = parseFloat(String(espera).replace(",", "."));
        return !isNaN(num) && num > 0;
      })
    : results.rows;

  const inputStyle = {
    border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px",
    fontSize: 15, fontFamily: "Inter, sans-serif", color: COLORS.textPrimary,
    background: COLORS.white, width: "100%", boxSizing: "border-box", outline: "none",
  };
  const labelStyle = { fontSize: 14, fontWeight: 500, color: COLORS.textPrimary, marginBottom: 4, display: "block" };
  const subLabelStyle = { fontSize: 11, color: COLORS.textMuted, marginTop: 4 };

  const paramFields = [
    { label: "Tiempo entre llegadas", sub: "Intervalo promedio entre dos llegadas.", unit: "min", val: llegada, set: setLlegada },
    { label: "Tiempo de servicio", sub: "Duración promedio del servicio.", unit: "min", val: servicio, set: setServicio },
    { label: "Servidores disponibles", sub: "Servidores en paralelo (cola M/M/c).", unit: "#", val: servidores, set: setServidores },
    ...(caso === 3 ? [{ label: "P(quiere dulces)", sub: "Probabilidad de ir a dulcería (0–1).", unit: "", val: prob, set: setProb }] : []),
    { label: "Tiempo de simulación", sub: "Duración total de la corrida.", unit: "min", val: tSim, set: setTSim },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.textPrimary, fontFamily: "Inter, sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: "0 32px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.blue, padding: "14px 0", marginRight: 32, letterSpacing: 0.5 }}>PROCSIM</div>
        {CASOS.map((c) => (
          
          <button key={c.id} onClick={() => setCaso(c.id)} style={{
            background: "none", border: "none",
            borderBottom: caso === c.id ? `2px solid ${COLORS.blue}` : "2px solid transparent",
            color: caso === c.id ? COLORS.blue : COLORS.textSecondary,
            padding: "14px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Title */}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Simulación de proceso — {casoLabel.split("—")[1]?.trim()}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.textSecondary }}>
            Configura los parámetros y ejecuta una réplica de eventos discretos.
          </p>
        </div>

        {/* SECTION 1: Diagram */}
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Modelo</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{casoLabel}</span>
            </div>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
              {caso === 1 ? "Cola M/M/c · 1 actividad" : caso === 2 ? "Cola M/M/c · 3 actividades en serie" : "Cola M/M/c · Compuerta XOR"}
            </span>
          </div>
          <div style={{ overflowX: "auto", padding: "8px 0 20px" }}>
            <DiagramComp
              active={activeMap}
              onNodeClick={(n) => setActiveNode(activeNode === n ? null : n)}
              stats={simDone ? results.stats : null}
            />
          </div>
          {log.length > 0 && (
            <div style={{ background: COLORS.panel, borderRadius: 8, padding: "10px 16px", fontSize: 12, color: COLORS.textSecondary, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.8, maxHeight: 100, overflowY: "auto" }}>
              {log.map((l, i) => <div key={i} style={{ color: i === log.length - 1 ? COLORS.blue : COLORS.textMuted }}>→ {l}</div>)}
              {simDone && <div style={{ color: COLORS.green, fontWeight: 600 }}>✓ Simulación completa — {results.stats?.llegadas} entidades procesadas</div>}
            </div>
          )}
        </div>

        {/* SECTION 2: Config + Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>

          {/* Config */}
          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>02</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Configuración</span>
            </div>

            {paramFields.map(({ label, sub, unit, val, set }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={labelStyle}>{label}</label>
                  {unit && <span style={{ fontSize: 11, color: COLORS.textMuted }}>media · {unit}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={val} onChange={(e) => set(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button onClick={() => set(String(parseFloat(val) + (unit === "#" || unit === "" ? 0.05 : 1)))}
                      style={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, background: COLORS.white, width: 24, height: 18, cursor: "pointer", fontSize: 9, color: COLORS.textSecondary }}>▲</button>
                    <button onClick={() => set(String(Math.max(0, parseFloat(val) - (unit === "#" || unit === "" ? 0.05 : 1))))}
                      style={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, background: COLORS.white, width: 24, height: 18, cursor: "pointer", fontSize: 9, color: COLORS.textSecondary }}>▼</button>
                  </div>
                  {unit && <span style={{ fontSize: 12, color: COLORS.textMuted, width: 28 }}>{unit}</span>}
                </div>
                <div style={subLabelStyle}>{sub}</div>
              </div>
            ))}

            {/* Límite de entidades */}
            <div style={{ borderTop: `1px dashed ${COLORS.border}`, paddingTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input type="checkbox" id="usarLimite" checked={usarLimite}
                  onChange={(e) => setUsarLimite(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: COLORS.blue }} />
                <label htmlFor="usarLimite" style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary, cursor: "pointer" }}>
                  Límite de entidades
                </label>
              </div>
              {usarLimite && (
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={limiteEntidades}
                      onChange={(e) => setLimiteEntidades(e.target.value)}
                      placeholder="ej. 50"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <span style={{ fontSize: 12, color: COLORS.textMuted, width: 40 }}>ents.</span>
                  </div>
                  <div style={{ ...subLabelStyle, color: COLORS.blue }}>
                    La simulación termina al procesar este número de entidades o al acabar el tiempo, lo que ocurra primero.
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleSimulate} disabled={simRunning} style={{
              background: simRunning ? COLORS.border : COLORS.blue,
              border: "none", borderRadius: 9, padding: "11px 0",
              color: simRunning ? COLORS.textMuted : COLORS.white,
              fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
              cursor: simRunning ? "not-allowed" : "pointer", marginTop: 4,
            }}>
              {simRunning ? "▶  Simulando..." : "▶  Ejecutar simulación"}
            </button>
          </div>

          {/* Metrics */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!simDone ? (
              <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, height: "100%" }}>
                <div style={{ fontSize: 32 }}>📊</div>
                <div style={{ fontSize: 14, color: COLORS.textMuted, textAlign: "center" }}>
                  Ejecuta la simulación para ver las métricas calculadas
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {results.metrics.map(({ key, value, unit, sub, color, bar }) => (
                  <div key={key} style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{key}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                      {value}<span style={{ fontSize: 14, fontWeight: 400, color: COLORS.textSecondary, marginLeft: 3 }}>{unit}</span>
                    </div>
                    {bar !== undefined && (
                      <div style={{ marginTop: 10, background: COLORS.border, borderRadius: 4, height: 5 }}>
                        <div style={{ width: `${Math.min(bar, 100)}%`, height: "100%", background: bar > 90 ? COLORS.red : COLORS.green, borderRadius: 4 }} />
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>{sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Traza */}
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>03</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Traza de eventos</span>
              {simDone && <span style={{ fontSize: 12, color: COLORS.textMuted }}>({results.rows.length} entidades)</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Todos", "Con espera"].map((f) => (
                <button key={f} onClick={() => setFilterEspera(f === "Con espera")} style={{
                  border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12,
                  background: (f === "Con espera") === filterEspera ? COLORS.blue : COLORS.white,
                  color: (f === "Con espera") === filterEspera ? COLORS.white : COLORS.textSecondary,
                  fontFamily: "Inter",
                }}>
                  {f}
                </button>
              ))}
              <button onClick={handleExport} disabled={!simDone} style={{
                background: simDone ? COLORS.green : COLORS.border, border: "none", borderRadius: 6,
                padding: "5px 16px", color: simDone ? COLORS.white : COLORS.textMuted,
                fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: simDone ? "pointer" : "not-allowed",
              }}>
                ⬇ Exportar Excel
              </button>
            </div>
          </div>

          {results.rows.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
              Ejecuta la simulación para ver la traza de eventos generada.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.panel }}>
                  {results.headers.map((h) => (
                    <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 11, color: COLORS.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 === 0 ? COLORS.white : COLORS.bg }}>
                    {row.map((cell, j) => {
                      const isDulceSi = cell === "Sí";
                      const isDulceNo = cell === "No";
                      const isEspera = caso === 1 && j === row.length - 1;
                      const numEspera = isEspera ? parseFloat(String(cell)) : 0;
                      return (
                        <td key={j} style={{
                          padding: "11px 24px", fontSize: 13,
                          color: isDulceSi ? COLORS.yellow : isDulceNo ? COLORS.textSecondary : COLORS.textPrimary,
                          fontWeight: j === 0 ? 500 : 400,
                        }}>
                          {isEspera && numEspera > 0
                            ? <span style={{ color: COLORS.red }}>● {cell}</span>
                            : isEspera
                            ? <span style={{ color: COLORS.green }}>● {cell}</span>
                            : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ padding: "12px 24px", borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textMuted }}>
            * T.sim = {tSim} min · Distribución exponencial · {servidores} servidor(es){usarLimite && limiteEntidades ? ` · Límite: ${limiteEntidades} entidades` : ""}
          </div>
        </div>
        {caso === "editor" && <ModelEditor />}
      </div>
    </div>
  );
}
