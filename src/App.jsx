import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

const COLORS = {
  bg: "#F7F8FA",
  white: "#FFFFFF",
  border: "#E4E7ED",
  panel: "#F0F2F5",
  blue: "#5B6AF5",
  blueLight: "#EEF0FE",
  blueDot: "#5B6AF5",
  green: "#22C55E",
  greenLight: "#DCFCE7",
  yellow: "#F59E0B",
  yellowLight: "#FEF3C7",
  red: "#EF4444",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  inputBg: "#FFFFFF",
};

const CASOS = [
  {
    id: 1,
    label: "Caso 1",
    title: "M/M/1 Simple",
    desc: "Una sola actividad de servicio. El modelo de cola más básico: llegada, atención y salida.",
  },
  {
    id: 2,
    label: "Caso 2",
    title: "En Serie",
    desc: "Tres actividades encadenadas en secuencia: taquilla, revisión y entrada.",
  },
  {
    id: 3,
    label: "Caso 3",
    title: "Compuerta XOR",
    desc: "Incluye una decisión binaria que separa el flujo en dos caminos posibles.",
  },
];

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

function RectNode({ x, y, w = 200, h = 72, label, sublabel, badge, color, active, onClick }) {
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
      {/* icon */}
      <rect x={x - w / 2 + 12} y={y - 10} width={18} height={18} rx={4} fill={active ? c : COLORS.blueLight} />
      <text x={x - w / 2 + 21} y={y + 4} textAnchor="middle" fill={active ? COLORS.white : c} fontSize={11} fontFamily="Inter">■</text>
      <text x={x - w / 2 + 38} y={y - 4} textAnchor="start" fill={COLORS.textPrimary} fontSize={14} fontFamily="Inter, sans-serif" fontWeight="600">
        {label}
      </text>
      {sublabel && (
        <text x={x - w / 2 + 38} y={y + 14} textAnchor="start" fill={COLORS.textMuted} fontSize={10} fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.5">
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

function DiamondNode({ x, y, label, subLabel, active, onClick }) {
  const s = 34;
  const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      <polygon points={points}
        fill={active ? COLORS.yellowLight : COLORS.white}
        stroke={COLORS.yellow} strokeWidth={2} />
      <text x={x} y={y - 2} textAnchor="middle" fill={COLORS.yellow} fontSize={11} fontFamily="Inter" fontWeight="700">{label}</text>
      {subLabel && <text x={x} y={y + 12} textAnchor="middle" fill={COLORS.textSecondary} fontSize={10} fontFamily="Inter">{subLabel}</text>}
    </g>
  );
}

function DashedArrow({ x1, y1, x2, y2, label, color, vertical }) {
  const c = color || COLORS.textMuted;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const ex = x2 - ux * 10, ey = y2 - uy * 10;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={c} strokeWidth={1.5} strokeDasharray="5,4" />
      <polygon points={`${x2},${y2} ${x2 - ux * 10 - uy * 5},${y2 - uy * 10 + ux * 5} ${x2 - ux * 10 + uy * 5},${y2 - uy * 10 - ux * 5}`} fill={c} />
      {label && <text x={mx + (vertical ? 10 : 0)} y={my + (vertical ? 0 : -8)} textAnchor="middle" fill={c} fontSize={11} fontFamily="Inter">{label}</text>}
    </g>
  );
}

// ─── EXAMPLE DIAGRAMS (read-only, case 1/2/3) ─────────────────────────────────

function Diagram1({ active, onNodeClick, stats }) {
  const a = active || {};
  return (
    <svg width="100%" viewBox="0 0 600 160" style={{ overflow: "visible" }}>
      <DashedArrow x1={88} y1={80} x2={178} y2={80} />
      <DashedArrow x1={338} y1={80} x2={428} y2={80} />
      <CircleNode x={60} y={80} label="Llegada de Auto" sublabel={stats ? `${stats.llegadas} autos` : ""} filled active={a.llegada} onClick={() => onNodeClick("llegada")} />
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
      <CircleNode x={60} y={130} label="Llegada" sublabel={stats ? `${stats.llegadas} autos` : ""} filled active={a.llegada} onClick={() => onNodeClick("llegada")} />
      <RectNode x={238} y={130} label="Taquilla" sublabel="ACTIVIDAD · 1 SERVIDOR" badge={stats ? `${stats.uso}% uso` : ""} active={a.taquilla} onClick={() => onNodeClick("taquilla")} />
      <DiamondNode x={422} y={130} label="XOR" subLabel="¿Dulces?" active={a.gateway} onClick={() => onNodeClick("gateway")} />
      <RectNode x={584} y={50} w={160} h={64} label="Comprar" sublabel="ACTIVIDAD · DULCERÍA" active={a.comprar} color={COLORS.yellow} onClick={() => onNodeClick("comprar")} />
      <RectNode x={584} y={210} w={160} h={64} label="Ir a sala" sublabel="ACTIVIDAD · DIRECTO" active={a.sala} onClick={() => onNodeClick("sala")} />
      <CircleNode x={742} y={50} label="Fin A" filled={false} color={COLORS.textMuted} active={a.salidaA} onClick={() => onNodeClick("salidaA")} />
      <CircleNode x={742} y={210} label="Fin B" filled={false} color={COLORS.textMuted} active={a.salidaB} onClick={() => onNodeClick("salidaB")} />
    </svg>
  );
}

const DIAGRAMS = { 1: Diagram1, 2: Diagram2, 3: Diagram3 };

// ─── DATA ─────────────────────────────────────────────────────────────────────

const STEPS = {
  1: [
    { node: "llegada", msg: "Cliente #1 llega (t=0.0 min)" },
    { node: "taquilla", msg: "Atención en taquilla (t=0.0 → 2.3 min)" },
    { node: "salida", msg: "Cliente #1 sale (t=2.3 min)" },
    { node: "llegada", msg: "Cliente #2 llega (t=2.8 min)" },
    { node: "taquilla", msg: "Atención en taquilla (t=2.8 → 5.1 min)" },
    { node: "salida", msg: "Cliente #2 sale (t=5.1 min)" },
  ],
  2: [
    { node: "llegada", msg: "Cliente llega (t=0.0 min)" },
    { node: "taquilla", msg: "Compra boleto (t=0.0 → 1.8 min)" },
    { node: "revision", msg: "Revisión de boleto (t=1.8 → 2.4 min)" },
    { node: "entrada", msg: "Pasa por entrada (t=2.4 → 2.9 min)" },
    { node: "sala", msg: "Cliente en sala (t=2.9 min)" },
  ],
  3: [
    { node: "llegada", msg: "Cliente llega (t=0.0 min)" },
    { node: "taquilla", msg: "Compra boleto (t=0.0 → 2.1 min)" },
    { node: "gateway", msg: "Evaluando compuerta XOR — ¿quiere dulces?" },
    { node: "comprar", msg: "Sí → Compra dulces (t=2.1 → 4.5 min)" },
    { node: "salidaA", msg: "Entra a sala con dulces (t=4.5 min)" },
  ],
};

const RESULTS = {
  1: {
    stats: { llegadas: 50, salidas: 43, uso: 84 },
    metrics: [
      { key: "Tiempo de espera", value: "10,5", unit: "min", sub: "Promedio en cola", color: COLORS.blue },
      { key: "Clientes atendidos", value: "43", unit: "", sub: "de 50 llegadas", color: COLORS.blue },
      { key: "Utilización servidor", value: "84,0", unit: "%", sub: "Uso del servidor", color: COLORS.green, bar: 84 },
      { key: "Tiempo en sistema", value: "12,5", unit: "min", sub: "Espera + servicio", color: COLORS.blue },
    ],
    headers: ["Cliente", "Llegada", "Inicio Serv.", "Fin Serv.", "Espera"],
    rows: [
      ["Cliente 1", "0,0", "0,0", "2,3", "• 0,0"],
      ["Cliente 2", "2,8", "2,8", "5,1", "• 0,0"],
      ["Cliente 3", "4,1", "5,1", "7,4", "• 1,0"],
      ["Cliente 4", "5,9", "7,4", "9,7", "• 1,5"],
      ["Cliente 5", "7,3", "9,7", "11,8", "• 2,4"],
    ],
  },
  2: {
    stats: { llegadas: 40, salidas: 37, uso: 76 },
    metrics: [
      { key: "Tiempo total prom.", value: "5,8", unit: "min", sub: "Por cliente", color: COLORS.blue },
      { key: "Clientes atendidos", value: "37", unit: "", sub: "de 40 llegadas", color: COLORS.blue },
      { key: "Utilización taquilla", value: "76,0", unit: "%", sub: "Cuello de botella", color: COLORS.green, bar: 76 },
      { key: "Tiempo en sistema", value: "8,2", unit: "min", sub: "Espera + servicio", color: COLORS.blue },
    ],
    headers: ["Cliente", "Llegada", "Fin Taq.", "Fin Rev.", "Fin Ent.", "T.Total"],
    rows: [
      ["Cliente 1", "0,0", "1,8", "2,4", "2,9", "5,1"],
      ["Cliente 2", "2,6", "4,4", "5,0", "5,5", "7,9"],
      ["Cliente 3", "5,1", "6,3", "7,1", "7,6", "9,4"],
    ],
  },
  3: {
    stats: { llegadas: 50, salidas: 48, uso: 80 },
    metrics: [
      { key: "T. prom. con dulces", value: "6,3", unit: "min", sub: "55% de clientes", color: COLORS.yellow },
      { key: "T. prom. sin dulces", value: "3,9", unit: "min", sub: "45% de clientes", color: COLORS.blue },
      { key: "Utilización taquilla", value: "80,0", unit: "%", sub: "Uso del servidor", color: COLORS.green, bar: 80 },
      { key: "W prom. ponderado", value: "5,2", unit: "min", sub: "Espera + servicio", color: COLORS.blue },
    ],
    headers: ["Cliente", "Llegada", "Fin Taq.", "¿Dulces?", "Fin Dulc.", "Salida"],
    rows: [
      ["Cliente 1", "0,0", "2,1", "Sí", "4,5", "6,6"],
      ["Cliente 2", "1,4", "3,7", "No", "—", "4,8"],
      ["Cliente 3", "3,2", "5,9", "Sí", "8,4", "9,7"],
      ["Cliente 4", "5,0", "7,3", "No", "—", "6,8"],
      ["Cliente 5", "6,8", "9,2", "Sí", "12,1", "13,4"],
    ],
  },
};

// ─── EDITOR: free modeling node kinds ─────────────────────────────────────────

const PALETTE = [
  { kind: "inicio", label: "Inicio", desc: "Llegada", color: COLORS.blue, shape: "circle", filled: true },
  { kind: "actividad", label: "Actividad", desc: "Servicio", color: COLORS.blue, shape: "rect" },
  { kind: "compuerta", label: "Compuerta", desc: "Decisión XOR", color: COLORS.yellow, shape: "diamond" },
  { kind: "fin", label: "Fin", desc: "Salida", color: COLORS.textMuted, shape: "circle", filled: false },
];

let idCounter = 1;
const nextId = () => `n${idCounter++}`;

// Large free-form canvas: bigger than the viewport, scrollable in both directions
const CANVAS_W = 1700;
const CANVAS_H = 900;
const CANVAS_VIEW_H = 520; // visible viewport height before scroll kicks in

function EditorNode({ node, selected, onPointerDown, onClick }) {
  const c = node.color;
  const x = node.x, y = node.y;
  if (node.shape === "circle") {
    return (
      <g
        style={{ cursor: "grab" }}
        onPointerDown={(e) => onPointerDown(e, node.id)}
        onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
      >
        <circle cx={x} cy={y} r={28} fill={selected ? COLORS.blueLight : COLORS.white} stroke={c} strokeWidth={selected ? 3 : 2.5} />
        {node.filled && <circle cx={x} cy={y} r={14} fill={c} />}
        {!node.filled && <rect x={x - 8} y={y - 8} width={16} height={16} rx={3} fill={c} />}
        <text x={x} y={y + 46} textAnchor="middle" fill={COLORS.textSecondary} fontSize={13} fontFamily="Inter, sans-serif" fontWeight="500">
          {node.label}
        </text>
      </g>
    );
  }
  if (node.shape === "diamond") {
    const s = 34;
    const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
    return (
      <g
        style={{ cursor: "grab" }}
        onPointerDown={(e) => onPointerDown(e, node.id)}
        onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
      >
        <polygon points={points} fill={selected ? COLORS.yellowLight : COLORS.white} stroke={COLORS.yellow} strokeWidth={selected ? 3 : 2} />
        <text x={x} y={y - 2} textAnchor="middle" fill={COLORS.yellow} fontSize={11} fontFamily="Inter" fontWeight="700">XOR</text>
        <text x={x} y={y + 56} textAnchor="middle" fill={COLORS.textSecondary} fontSize={13} fontFamily="Inter, sans-serif" fontWeight="500">{node.label}</text>
      </g>
    );
  }
  // rect
  const w = 180, h = 64;
  return (
    <g
      style={{ cursor: "grab" }}
      onPointerDown={(e) => onPointerDown(e, node.id)}
      onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
    >
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={10}
        fill={selected ? COLORS.blueLight : COLORS.white}
        stroke={selected ? c : COLORS.border} strokeWidth={selected ? 2.5 : 1.5} />
      <rect x={x - w / 2 + 12} y={y - 9} width={18} height={18} rx={4} fill={selected ? c : COLORS.blueLight} />
      <text x={x - w / 2 + 21} y={y + 5} textAnchor="middle" fill={selected ? COLORS.white : c} fontSize={11} fontFamily="Inter">■</text>
      <text x={x - w / 2 + 38} y={y - 3} textAnchor="start" fill={COLORS.textPrimary} fontSize={14} fontFamily="Inter, sans-serif" fontWeight="600">
        {node.label}
      </text>
      <text x={x - w / 2 + 38} y={y + 15} textAnchor="start" fill={COLORS.textMuted} fontSize={10} fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.5">
        {node.sub || "ACTIVIDAD"}
      </text>
    </g>
  );
}

function EditorEdge({ from, to, onDelete }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const rFrom = from.shape === "rect" ? 95 : from.shape === "diamond" ? 40 : 30;
  const rTo = to.shape === "rect" ? 95 : to.shape === "diamond" ? 40 : 30;
  const x1 = from.x + ux * rFrom, y1 = from.y + uy * rFrom;
  const x2 = to.x - ux * rTo, y2 = to.y - uy * rTo;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - ux * 10} y2={y2 - uy * 10} stroke={COLORS.textMuted} strokeWidth={1.5} strokeDasharray="5,4" />
      <polygon points={`${x2},${y2} ${x2 - ux * 10 - uy * 5},${y2 - uy * 10 + ux * 5} ${x2 - ux * 10 + uy * 5},${y2 - uy * 10 - ux * 5}`} fill={COLORS.textMuted} />
      <circle cx={mx} cy={my} r={8} fill={COLORS.white} stroke={COLORS.border} strokeWidth={1} style={{ cursor: "pointer" }} onClick={onDelete} />
      <text x={mx} y={my + 3.5} textAnchor="middle" fontSize={10} fill={COLORS.textMuted} style={{ cursor: "pointer", pointerEvents: "none" }}>✕</text>
    </g>
  );
}

// ─── SHARED STYLES ─────────────────────────────────────────────────────────────

const inputStyle = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 15,
  fontFamily: "Inter, sans-serif",
  color: COLORS.textPrimary,
  background: COLORS.white,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: COLORS.textPrimary,
  marginBottom: 4,
  display: "block",
};

const subLabelStyle = {
  fontSize: 11,
  color: COLORS.textMuted,
  marginTop: 4,
};

// ─── EJEMPLOS VIEW (single selected case, same design as before) ──────────────

function EjemplosPicker({ onSelect }) {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>Ejemplos</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.textSecondary }}>
          Elige un caso de estudio para ver su modelo, configurar parámetros y simular.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {CASOS.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              textAlign: "left",
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              transition: "border-color 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.blue)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.blue, letterSpacing: 1, textTransform: "uppercase" }}>{c.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>{c.title}</span>
            <span style={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.5 }}>{c.desc}</span>
            <span style={{ marginTop: 4, fontSize: 12.5, color: COLORS.blue, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              Abrir caso →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EjemploDetalle({ caso, onBack }) {
  const [activeNode, setActiveNode] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [simRunning, setSim] = useState(false);
  const [simDone, setSimDone] = useState(false);
  const [tSim, setTSim] = useState("120");
  const [llegada, setLlegada] = useState("8");
  const [servicio, setServicio] = useState("12");
  const [servidores, setServidores] = useState("2");
  const [prob, setProb] = useState("0.55");
  const [log, setLog] = useState([]);
  const [filterEspera, setFilterEspera] = useState(false);

  const steps = STEPS[caso] || [];
  const results = RESULTS[caso];
  const DiagramComp = DIAGRAMS[caso];
  const casoMeta = CASOS.find((c) => c.id === caso);
  const casoLabel = `${casoMeta?.label} — ${casoMeta?.title}`;

  useEffect(() => {
    setActiveNode(null);
    setStepIndex(-1);
    setSim(false);
    setSimDone(false);
    setLog([]);
    setFilterEspera(false);
  }, [caso]);

  const handleSimulate = () => {
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
      [],
      ["MÉTRICAS"],
      ...results.metrics.map((m) => [m.key, `${m.value}${m.unit}`]),
      [],
      ["TRAZA DE EVENTOS"],
      results.headers,
      ...results.rows,
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
        const num = parseFloat(String(espera).replace("• ", "").replace(",", "."));
        return !isNaN(num) && num > 0;
      })
    : results.rows;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back + Title */}
      <div>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", padding: 0, marginBottom: 10,
            color: COLORS.textSecondary, fontFamily: "Inter, sans-serif", fontSize: 12.5,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ← Volver a Ejemplos
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>
          Simulación de proceso — {casoMeta?.title}
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.textSecondary }}>
          Configura los parámetros y ejecuta una réplica de eventos discretos para el modelo seleccionado.
        </p>
      </div>

      {/* ── SECTION 1: Diagram ── */}
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Modelo</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>{casoLabel}</span>
          </div>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            {caso === 1 ? "Cola M/M/1 · 1 actividad" : caso === 2 ? "Cola M/M/1 · 3 actividades en serie" : "Cola M/M/1 · Compuerta XOR"}
          </span>
        </div>
        <div style={{ overflowX: "auto", padding: "8px 0 20px" }}>
          <DiagramComp active={activeMap} onNodeClick={(n) => setActiveNode(activeNode === n ? null : n)} stats={simDone ? results.stats : null} />
        </div>
        {log.length > 0 && (
          <div style={{ background: COLORS.panel, borderRadius: 8, padding: "10px 16px", fontSize: 12, color: COLORS.textSecondary, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.8, maxHeight: 100, overflowY: "auto" }}>
            {log.map((l, i) => <div key={i} style={{ color: i === log.length - 1 ? COLORS.blue : COLORS.textMuted }}>→ {l}</div>)}
            {simDone && <div style={{ color: COLORS.green, fontWeight: 600 }}>✓ Simulación completa</div>}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Config + Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>02</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Configuración</span>
          </div>

          {[
            { label: "Tiempo entre llegadas", sub: "Intervalo promedio entre dos llegadas consecutivas.", unit: "min", val: llegada, set: setLlegada },
            { label: "Tiempo de servicio", sub: "Duración promedio del servicio.", unit: "min", val: servicio, set: setServicio },
            { label: "Servidores disponibles", sub: "Número de servidores en paralelo.", unit: "#", val: servidores, set: setServidores },
            ...(caso === 3 ? [{ label: "P(quiere dulces)", sub: "Probabilidad de ir a dulcería.", unit: "%", val: prob, set: setProb }] : []),
            { label: "Tiempo de simulación", sub: "Duración total de la corrida.", unit: "min", val: tSim, set: setTSim },
          ].map(({ label, sub, unit, val, set }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={labelStyle}>{label}</label>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>media · {unit}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={val} onChange={(e) => set(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => set(String(parseFloat(val) + 1))} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, background: COLORS.white, width: 24, height: 18, cursor: "pointer", fontSize: 9, color: COLORS.textSecondary }}>▲</button>
                  <button onClick={() => set(String(Math.max(0, parseFloat(val) - 1)))} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, background: COLORS.white, width: 24, height: 18, cursor: "pointer", fontSize: 9, color: COLORS.textSecondary }}>▼</button>
                </div>
                <span style={{ fontSize: 12, color: COLORS.textMuted, width: 28 }}>{unit}</span>
              </div>
              <div style={subLabelStyle}>{sub}</div>
            </div>
          ))}

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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    <div style={{ width: `${bar}%`, height: "100%", background: COLORS.green, borderRadius: 4 }} />
                  </div>
                )}
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Event trace ── */}
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>03</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Traza de eventos</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExport} style={{
              background: COLORS.green, border: "none", borderRadius: 6,
              padding: "5px 16px", color: COLORS.white,
              fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}>
              ⬇ Exportar Excel
            </button>
          </div>
        </div>
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
              <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                {row.map((cell, j) => {
                  const isEspera = j === row.length - 1 && String(cell).startsWith("•");
                  const isDulces = cell === "Sí" || cell === "No";
                  return (
                    <td key={j} style={{
                      padding: "12px 24px", fontSize: 13,
                      color: isEspera ? COLORS.green : isDulces && cell === "Sí" ? COLORS.yellow : COLORS.textPrimary,
                      fontWeight: j === 0 ? 500 : 400,
                    }}>
                      {isEspera ? <span style={{ color: COLORS.green }}>● {String(cell).replace("• ", "")}</span> : cell}
                      {j === 1 && i < 2 && <span style={{ marginLeft: 8, fontSize: 10, color: COLORS.textMuted, background: COLORS.panel, borderRadius: 4, padding: "2px 6px" }}>M{i + 1}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textMuted }}>
          * T.sim = {tSim} min · Distribución exponencial · {servidores} servidor(es)
        </div>
      </div>
    </div>
  );
}

// ─── EDITOR VIEW (free drag-and-drop modeling) ────────────────────────────────

function EditorView() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [linking, setLinking] = useState(null); // node id we're linking from
  const [tSim, setTSim] = useState("120");
  const [simRunning, setSimRunning] = useState(false);
  const [simDone, setSimDone] = useState(false);
  const [simRows, setSimRows] = useState([]);
  const [simError, setSimError] = useState("");
  const svgRef = useRef(null);
  const dragRef = useRef(null); // { id, offsetX, offsetY }
  const suppressNextClickRef = useRef(false);

  const selected = nodes.find((n) => n.id === selectedId) || null;

  const toSvgPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    // Canvas is rendered at 1:1 scale (no viewBox scaling), so this is a direct offset.
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleNodePointerDown = (e, id) => {
    e.preventDefault();
    if (e.shiftKey) {
      setLinking(id);
      // Prevent the click event that follows this pointerdown (on the same node)
      // from immediately cancelling the linking mode we just activated.
      suppressNextClickRef.current = true;
      return;
    }
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    const offsetX = p.x - node.x;
    const offsetY = p.y - node.y;
    dragRef.current = { id, offsetX, offsetY };
    setSelectedId(id);

    const handleMove = (ev) => {
      const pt = toSvgPoint(ev.clientX, ev.clientY);
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: pt.x - offsetX, y: pt.y - offsetY } : n)));
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleNodeClick = (id) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (linking) {
      if (linking !== id) {
        setEdges((prev) => {
          const exists = prev.some((e) => e.from === linking && e.to === id);
          if (exists) return prev;
          return [...prev, { id: `e${Date.now()}`, from: linking, to: id }];
        });
      }
      setLinking(null);
      return;
    }
    setSelectedId(id);
  };

  const handleCanvasClick = () => {
    setLinking(null);
  };

  const handleDeleteEdge = (id) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.from !== selectedId && e.to !== selectedId));
    setSelectedId(null);
  };

  const handleInsertTemplate = () => {
    const s = nextId(), a = nextId(), f = nextId();
    setNodes((prev) => [
      ...prev,
      { id: s, kind: "inicio", label: "Llegada", shape: "circle", filled: true, color: COLORS.blue, x: 110, y: 140, sub: "" },
      { id: a, kind: "actividad", label: "Actividad 1", shape: "rect", color: COLORS.blue, x: 380, y: 140, sub: "ACTIVIDAD · 1 SERVIDOR", llegada: "8", servicio: "12", servidores: "1" },
      { id: f, kind: "fin", label: "Fin", shape: "circle", filled: false, color: COLORS.textMuted, x: 660, y: 140, sub: "" },
    ]);
    setEdges((prev) => [...prev, { id: `e${Date.now()}a`, from: s, to: a }, { id: `e${Date.now()}b`, from: a, to: f }]);
    setSelectedId(a);
  };

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
  };

  const handlePaletteDragStart = (e, kind) => {
    e.dataTransfer.setData("text/kind", kind);
  };
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("text/kind");
    const def = PALETTE.find((p) => p.kind === kind);
    if (!def) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    const id = nextId();
    const base = {
      id,
      kind,
      label: def.label,
      shape: def.shape,
      filled: def.filled,
      color: def.color,
      x: p.x,
      y: p.y,
      sub: def.shape === "rect" ? "ACTIVIDAD · 1 SERVIDOR" : "",
    };
    if (kind === "actividad") {
      base.llegada = "8";
      base.servicio = "12";
      base.servidores = "1";
    }
    if (kind === "compuerta") {
      base.prob = "0.5";
    }
    setNodes((prev) => [...prev, base]);
    setSelectedId(id);
  };
  const handleCanvasDragOver = (e) => e.preventDefault();

  const updateSelected = (patch) => {
    setNodes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, ...patch } : n)));
  };

  // ── Simulation engine: walks the free-form graph from each "inicio" node ──
  const runSimulation = () => {
    setSimError("");

    const starts = nodes.filter((n) => n.kind === "inicio");
    if (starts.length === 0) {
      setSimError("Agrega al menos un nodo de Inicio para poder simular.");
      setSimRows([]);
      setSimDone(false);
      return;
    }

    const outgoing = (id) => edges.filter((e) => e.from === id).map((e) => nodes.find((n) => n.id === e.to)).filter(Boolean);

    const simMinutes = parseFloat(tSim) || 0;
    const rows = [];
    let clientCounter = 0;

    starts.forEach((start) => {
      const meanArrival = parseFloat(start.llegada) || 5;
      const maxClients = meanArrival > 0 ? Math.max(1, Math.min(200, Math.ceil(simMinutes / meanArrival))) : 1;

      let arrivalClock = 0;
      for (let i = 0; i < maxClients; i++) {
        clientCounter += 1;
        // exponential-ish spacing using the configured mean (deterministic jitter, no RNG dependency issues)
        arrivalClock += meanArrival * (0.6 + (((clientCounter * 53) % 80) / 100));
        if (arrivalClock > simMinutes) break;

        let t = arrivalClock;
        const path = [`Inicio (${start.label})`];
        let current = start;
        let guard = 0;
        let branch = "";

        while (guard < 50) {
          guard += 1;
          const nexts = outgoing(current.id);
          if (nexts.length === 0) break;

          let nextNode;
          if (current.kind === "compuerta" && nexts.length >= 2) {
            const p = Math.max(0, Math.min(1, parseFloat(current.prob) ?? 0.5));
            const takeFirst = (((clientCounter * 37) % 100) / 100) < p;
            nextNode = takeFirst ? nexts[0] : nexts[1];
            branch = takeFirst ? "Sí" : "No";
          } else {
            nextNode = nexts[0];
          }

          if (nextNode.kind === "actividad") {
            const servicio = parseFloat(nextNode.servicio) || 5;
            const servidores = Math.max(1, parseInt(nextNode.servidores) || 1);
            const tInicio = t;
            const tFin = t + servicio / servidores;
            path.push(`${nextNode.label} (${tInicio.toFixed(1)}→${tFin.toFixed(1)})`);
            t = tFin;
          } else if (nextNode.kind === "fin") {
            path.push(`${nextNode.label} (${t.toFixed(1)})`);
            current = nextNode;
            break;
          } else if (nextNode.kind === "compuerta") {
            path.push(`${nextNode.label}`);
          }
          current = nextNode;
          if (current.kind === "fin") break;
        }

        rows.push({
          cliente: `Cliente ${clientCounter}`,
          llegada: arrivalClock.toFixed(1),
          salida: t.toFixed(1),
          tiempoTotal: (t - arrivalClock).toFixed(1),
          rama: branch,
          recorrido: path.join(" → "),
        });
      }
    });

    setSimRows(rows);
    setSimDone(true);
  };

  const handleSimulate = () => {
    setSimRunning(true);
    setSimDone(false);
    setTimeout(() => {
      runSimulation();
      setSimRunning(false);
    }, 500);
  };

  const simMetrics = (() => {
    if (!simDone || simRows.length === 0) return null;
    const tiempos = simRows.map((r) => parseFloat(r.tiempoTotal));
    const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    const actividades = nodes.filter((n) => n.kind === "actividad").length;
    return {
      clientes: simRows.length,
      promedio: promedio.toFixed(1),
      actividades,
      compuertas: nodes.filter((n) => n.kind === "compuerta").length,
    };
  })();

  const handleExport = () => {
    const data = [
      ["PROCSIM — Modelo libre (Editor)"],
      [],
      ["NODOS"],
      ["ID", "Tipo", "Etiqueta", "T. llegadas", "T. servicio", "Servidores", "Prob."],
      ...nodes.map((n) => [n.id, n.kind, n.label, n.llegada || "", n.servicio || "", n.servidores || "", n.prob || ""]),
      [],
      ["CONEXIONES"],
      ["Desde", "Hacia"],
      ...edges.map((e) => {
        const from = nodes.find((n) => n.id === e.from);
        const to = nodes.find((n) => n.id === e.to);
        return [from?.label || e.from, to?.label || e.to];
      }),
      [],
      ["T. simulación (min)", tSim],
      [],
      ["RESULTADOS DE LA SIMULACIÓN"],
      ["Cliente", "Llegada", "Salida", "T. total", "Rama", "Recorrido"],
      ...simRows.map((r) => [r.cliente, r.llegada, r.salida, r.tiempoTotal, r.rama, r.recorrido]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "procsim_editor.xlsx");
  };

  const kindLabel = { inicio: "Inicio", actividad: "Actividad", compuerta: "Compuerta XOR", fin: "Fin" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>
          Editor — Modelado libre
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.textSecondary }}>
          Arrastra elementos desde la paleta al lienzo, conéctalos y ajusta sus parámetros en el panel de configuración.
        </p>
      </div>

      {/* ── SECTION 1: Canvas + palette ── */}
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Modelo</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>Lienzo libre</span>
          </div>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            {linking ? "Haz clic en el nodo destino para conectar · Esc para cancelar" : "Shift + arrastrar = conectar nodos"}
          </span>
        </div>

        {/* Palette */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {PALETTE.map((p) => (
            <div
              key={p.kind}
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, p.kind)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                border: `1px solid ${COLORS.border}`, borderRadius: 8,
                padding: "8px 14px", cursor: "grab", background: COLORS.panel,
                fontFamily: "Inter, sans-serif", userSelect: "none",
              }}
              title={`Arrastra al lienzo: ${p.label}`}
            >
              <span style={{
                width: 14, height: 14, borderRadius: p.shape === "circle" ? "50%" : p.shape === "diamond" ? 3 : 4,
                background: p.shape === "diamond" ? COLORS.white : p.color,
                border: `2px solid ${p.color}`, display: "inline-block",
                transform: p.shape === "diamond" ? "rotate(45deg)" : "none",
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{p.label}</span>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>· {p.desc}</span>
            </div>
          ))}
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedId}
            style={{
              marginLeft: "auto",
              border: `1px solid ${selectedId ? COLORS.red : COLORS.border}`,
              borderRadius: 8, padding: "8px 14px", background: COLORS.white,
              color: selectedId ? COLORS.red : COLORS.textMuted,
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              cursor: selectedId ? "pointer" : "not-allowed",
            }}
          >
            🗑 Eliminar seleccionado
          </button>
          <button
            onClick={handleClearCanvas}
            disabled={nodes.length === 0}
            style={{
              border: `1px solid ${nodes.length ? COLORS.border : COLORS.border}`,
              borderRadius: 8, padding: "8px 14px", background: COLORS.white,
              color: nodes.length ? COLORS.textSecondary : COLORS.textMuted,
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              cursor: nodes.length ? "pointer" : "not-allowed",
            }}
          >
            ✕ Vaciar lienzo
          </button>
        </div>

        {/* Canvas */}
        <div
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          style={{
            background: COLORS.bg,
            borderRadius: 10,
            border: `1.5px dashed ${COLORS.border}`,
            overflow: "auto",
            maxHeight: CANVAS_VIEW_H,
          }}
        >
          <svg
            ref={svgRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: "block", touchAction: "none" }}
            onClick={handleCanvasClick}
          >
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.from);
              const to = nodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              return <EditorEdge key={e.id} from={from} to={to} onDelete={() => handleDeleteEdge(e.id)} />;
            })}
            {linking && (() => {
              const from = nodes.find((n) => n.id === linking);
              if (!from) return null;
              return <circle cx={from.x} cy={from.y} r={36} fill="none" stroke={COLORS.blue} strokeWidth={2} strokeDasharray="4,3" />;
            })()}
            {nodes.map((n) => (
              <EditorNode key={n.id} node={n} selected={n.id === selectedId} onPointerDown={handleNodePointerDown} onClick={handleNodeClick} />
            ))}
          </svg>
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
          Lienzo de {CANVAS_W}×{CANVAS_H}px · usa scroll para navegar todo el espacio de trabajo.
        </div>
        {nodes.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>
              El lienzo está vacío. Arrastra elementos de la paleta para comenzar.
            </span>
            <button
              onClick={handleInsertTemplate}
              style={{
                border: `1px solid ${COLORS.blue}`, borderRadius: 8, padding: "7px 16px",
                background: COLORS.blueLight, color: COLORS.blue,
                fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              + Insertar plantilla básica (Inicio → Actividad → Fin)
            </button>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Config (edits selected node) + summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>02</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Configuración</span>
          </div>

          {!selected && (
            <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.6 }}>
              Selecciona un nodo en el lienzo para editar su etiqueta y parámetros.
            </div>
          )}

          {selected && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: selected.color, letterSpacing: 0.5,
                  textTransform: "uppercase", background: COLORS.blueLight, borderRadius: 5, padding: "2px 8px",
                }}>
                  {kindLabel[selected.kind] || selected.kind}
                </span>
              </div>

              <div>
                <label style={labelStyle}>Etiqueta</label>
                <input
                  value={selected.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                  style={inputStyle}
                />
                <div style={subLabelStyle}>Nombre visible del nodo en el diagrama.</div>
              </div>

              {selected.kind === "actividad" && (
                <>
                  {[
                    { label: "Tiempo entre llegadas", sub: "Sólo aplica si esta actividad recibe llegadas externas.", unit: "min", key: "llegada" },
                    { label: "Tiempo de servicio", sub: "Duración promedio del servicio.", unit: "min", key: "servicio" },
                    { label: "Servidores disponibles", sub: "Número de servidores en paralelo.", unit: "#", key: "servidores" },
                  ].map(({ label, sub, unit, key }) => (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <label style={labelStyle}>{label}</label>
                        <span style={{ fontSize: 11, color: COLORS.textMuted }}>media · {unit}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          value={selected[key] ?? ""}
                          onChange={(e) => updateSelected({ [key]: e.target.value })}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button onClick={() => updateSelected({ [key]: String((parseFloat(selected[key]) || 0) + 1) })} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, background: COLORS.white, width: 24, height: 18, cursor: "pointer", fontSize: 9, color: COLORS.textSecondary }}>▲</button>
                          <button onClick={() => updateSelected({ [key]: String(Math.max(0, (parseFloat(selected[key]) || 0) - 1)) })} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 4, background: COLORS.white, width: 24, height: 18, cursor: "pointer", fontSize: 9, color: COLORS.textSecondary }}>▼</button>
                        </div>
                        <span style={{ fontSize: 12, color: COLORS.textMuted, width: 28 }}>{unit}</span>
                      </div>
                      <div style={subLabelStyle}>{sub}</div>
                    </div>
                  ))}
                </>
              )}

              {selected.kind === "compuerta" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={labelStyle}>Probabilidad (rama "Sí")</label>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>0–1</span>
                  </div>
                  <input
                    value={selected.prob ?? ""}
                    onChange={(e) => updateSelected({ prob: e.target.value })}
                    style={inputStyle}
                  />
                  <div style={subLabelStyle}>Probabilidad de que el flujo tome la primera rama conectada.</div>
                </div>
              )}

              {selected.kind === "inicio" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={labelStyle}>Tiempo entre llegadas</label>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>media · min</span>
                  </div>
                  <input
                    value={selected.llegada ?? ""}
                    onChange={(e) => updateSelected({ llegada: e.target.value })}
                    style={inputStyle}
                    placeholder="8"
                  />
                  <div style={subLabelStyle}>Intervalo promedio entre dos llegadas consecutivas.</div>
                </div>
              )}

              {selected.kind === "fin" && (
                <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.6 }}>
                  Este nodo no tiene parámetros: marca la salida del flujo.
                </div>
              )}
            </>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={labelStyle}>Tiempo de simulación</label>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>min</span>
            </div>
            <input value={tSim} onChange={(e) => setTSim(e.target.value)} style={inputStyle} />
            <div style={subLabelStyle}>Duración total de la corrida.</div>
          </div>

          {simError && (
            <div style={{ fontSize: 12, color: COLORS.red, background: "#FEF2F2", borderRadius: 8, padding: "8px 12px" }}>
              {simError}
            </div>
          )}

          <button onClick={handleSimulate} disabled={simRunning || nodes.length === 0} style={{
            background: simRunning || nodes.length === 0 ? COLORS.border : COLORS.blue,
            border: "none", borderRadius: 9, padding: "11px 0",
            color: simRunning || nodes.length === 0 ? COLORS.textMuted : COLORS.white,
            fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14,
            cursor: simRunning || nodes.length === 0 ? "not-allowed" : "pointer", marginTop: 4,
          }}>
            {simRunning ? "▶  Simulando..." : "▶  Ejecutar simulación"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {simMetrics && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.blue, display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Clientes simulados</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>{simMetrics.clientes}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>Atravesaron el modelo</div>
              </div>
              <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.blue, display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Tiempo total promedio</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                  {simMetrics.promedio}<span style={{ fontSize: 14, fontWeight: 400, color: COLORS.textSecondary, marginLeft: 3 }}>min</span>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>Desde llegada hasta salida</div>
              </div>
            </div>
          )}

          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Resumen</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Modelo actual</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Nodos</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary }}>{nodes.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Conexiones</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary }}>{edges.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Actividades</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary }}>{nodes.filter((n) => n.kind === "actividad").length}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Compuertas</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary }}>{nodes.filter((n) => n.kind === "compuerta").length}</div>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 14, lineHeight: 1.6 }}>
              Arrastra nodos para moverlos, usa Shift + arrastrar para crear una conexión entre dos nodos, y haz clic en el punto medio de una flecha para eliminarla.
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Simulation results / export ── */}
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>03</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Traza de eventos</span>
          </div>
          <button onClick={handleExport} disabled={!simDone} style={{
            background: simDone ? COLORS.green : COLORS.border, border: "none", borderRadius: 6,
            padding: "5px 16px", color: simDone ? COLORS.white : COLORS.textMuted,
            fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: simDone ? "pointer" : "not-allowed",
          }}>
            ⬇ Exportar Excel
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: COLORS.panel }}>
              {["Cliente", "Llegada", "Salida", "T. total", "Rama", "Recorrido"].map((h) => (
                <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 11, color: COLORS.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {simRows.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "12px 24px", fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>{r.cliente}</td>
                <td style={{ padding: "12px 24px", fontSize: 13, color: COLORS.textSecondary }}>{r.llegada}</td>
                <td style={{ padding: "12px 24px", fontSize: 13, color: COLORS.textSecondary }}>{r.salida}</td>
                <td style={{ padding: "12px 24px", fontSize: 13, color: COLORS.green, fontWeight: 600 }}>● {r.tiempoTotal}</td>
                <td style={{ padding: "12px 24px", fontSize: 13, color: r.rama === "Sí" ? COLORS.yellow : COLORS.textSecondary }}>{r.rama || "—"}</td>
                <td style={{ padding: "12px 24px", fontSize: 12, color: COLORS.textMuted, fontFamily: "JetBrains Mono, monospace" }}>{r.recorrido}</td>
              </tr>
            ))}
            {simRows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "20px 24px", fontSize: 12.5, color: COLORS.textMuted, textAlign: "center" }}>
                  {nodes.length === 0
                    ? "Construye un modelo y ejecuta la simulación para ver resultados."
                    : "Aún no hay resultados. Pulsa \"Ejecutar simulación\" arriba."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textMuted }}>
          * T.sim = {tSim} min · Modelo libre creado en el Editor
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("ejemplos"); // "ejemplos" | "editor"
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);

  const goToTab = (t) => {
    setTab(t);
    if (t === "ejemplos") setCasoSeleccionado(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.textPrimary, fontFamily: "Inter, sans-serif" }}>

      {/* Top nav */}
      <div style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: "0 32px", display: "flex", alignItems: "center", gap: 0, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.blue, padding: "14px 0", marginRight: 32, letterSpacing: 0.5 }}>PROCSIM</div>
        {[{ id: "ejemplos", label: "Ejemplos" }, { id: "editor", label: "Editor" }].map((t) => (
          <button key={t.id} onClick={() => goToTab(t.id)} style={{
            background: "none", border: "none",
            borderBottom: tab === t.id ? `2px solid ${COLORS.blue}` : "2px solid transparent",
            color: tab === t.id ? COLORS.blue : COLORS.textSecondary,
            padding: "14px 18px", cursor: "pointer",
            fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {tab === "ejemplos" && (
          casoSeleccionado === null
            ? <EjemplosPicker onSelect={setCasoSeleccionado} />
            : <EjemploDetalle caso={casoSeleccionado} onBack={() => setCasoSeleccionado(null)} />
        )}
        {tab === "editor" && <EditorView />}
      </div>
    </div>
  );
}
