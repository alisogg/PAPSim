import { useState, useRef, useCallback, useEffect } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const NODE_TYPES = {
  llegada:   { label: "Llegada",    shape: "circle",  color: "#5B6AF5", fill: true,  desc: "Inicio del flujo" },
  actividad: { label: "Actividad",  shape: "rect",    color: "#5B6AF5", fill: false, desc: "Proceso o tarea" },
  salida:    { label: "Salida",     shape: "circle",  color: "#6B7280", fill: false, desc: "Fin del flujo" },
  xor:       { label: "XOR",        shape: "diamond", color: "#F59E0B", fill: false, desc: "Decisión exclusiva" },
  and:       { label: "AND",        shape: "diamond", color: "#8B5CF6", fill: false, desc: "Bifurca / une todos" },
  or:        { label: "OR",         shape: "diamond", color: "#EC4899", fill: false, desc: "Una o más ramas" },
};

const PALETTE_ITEMS = [
  { type: "llegada" },
  { type: "actividad" },
  { type: "salida" },
  { type: "xor" },
  { type: "and" },
  { type: "or" },
];

const SNAP = 20;
const snap = (v) => Math.round(v / SNAP) * SNAP;

let _id = 1;
const uid = () => `n${_id++}`;

// ─── SVG SHAPES ──────────────────────────────────────────────────────────────

function NodeShape({ type, x, y, label, selected, onMouseDown, onPortClick, connecting }) {
  const cfg = NODE_TYPES[type];
  const W = 120, H = 48, R = 26;

  const portPositions = [
    { id: "l", cx: 0,      cy: H / 2 },
    { id: "r", cx: W,      cy: H / 2 },
    { id: "t", cx: W / 2,  cy: 0 },
    { id: "b", cx: W / 2,  cy: H },
  ];

  const circlePortPositions = [
    { id: "l", cx: -R,  cy: 0 },
    { id: "r", cx: R,   cy: 0 },
    { id: "t", cx: 0,   cy: -R },
    { id: "b", cx: 0,   cy: R },
  ];

  const diamondPortPositions = [
    { id: "l", cx: -R,  cy: 0 },
    { id: "r", cx: R,   cy: 0 },
    { id: "t", cx: 0,   cy: -R },
    { id: "b", cx: 0,   cy: R },
  ];

  const borderColor = selected ? "#F59E0B" : cfg.color;
  const strokeWidth = selected ? 2.5 : 1.8;

  let shape = null;
  let ports = [];

  if (cfg.shape === "circle") {
    shape = (
      <g>
        <circle r={R} fill={cfg.fill ? cfg.color : "#fff"} stroke={borderColor} strokeWidth={strokeWidth} />
        {cfg.fill && <circle r={R * 0.5} fill="#fff" />}
        {!cfg.fill && <rect x={-8} y={-8} width={16} height={16} rx={3} fill={borderColor} />}
      </g>
    );
    ports = circlePortPositions;
  } else if (cfg.shape === "rect") {
    shape = (
      <g>
        <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={8}
          fill={selected ? `${cfg.color}18` : "#fff"}
          stroke={borderColor} strokeWidth={strokeWidth} />
        <rect x={-W / 2 + 10} y={-8} width={14} height={14} rx={3} fill={cfg.color} opacity={0.7} />
        <text x={-W / 2 + 32} y={5} fontSize={12} fontFamily="Inter" fill="#111827" fontWeight="500">
          {label.length > 10 ? label.slice(0, 10) + "…" : label}
        </text>
      </g>
    );
    ports = portPositions.map(p => ({ ...p, cx: p.cx - W / 2, cy: p.cy - H / 2 }));
  } else if (cfg.shape === "diamond") {
    const S = 28;
    const pts = `0,${-S} ${S},0 0,${S} ${-S},0`;
    shape = (
      <g>
        <polygon points={pts}
          fill={selected ? `${cfg.color}22` : "#fff"}
          stroke={borderColor} strokeWidth={strokeWidth} />
        <text y={-3} textAnchor="middle" fontSize={10} fontFamily="Inter" fill={cfg.color} fontWeight="700">{type.toUpperCase()}</text>
        <text y={10} textAnchor="middle" fontSize={8} fontFamily="Inter" fill="#6B7280">{label}</text>
      </g>
    );
    ports = diamondPortPositions.map(p => ({ ...p, cx: p.cx * 1.0, cy: p.cy * 1.0 }));
  }

  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: "move" }} onMouseDown={onMouseDown}>
      {shape}
      {/* Label below for circle/diamond */}
      {(cfg.shape === "circle" || cfg.shape === "diamond") && (
        <text y={cfg.shape === "circle" ? R + 16 : 28 + 14}
          textAnchor="middle" fontSize={11} fontFamily="Inter" fill="#374151" fontWeight="500">
          {label.length > 12 ? label.slice(0, 12) + "…" : label}
        </text>
      )}
      {/* Ports */}
      {ports.map(port => (
        <circle key={port.id}
          cx={port.cx} cy={port.cy} r={5}
          fill={connecting ? "#F59E0B" : "#fff"}
          stroke={connecting ? "#F59E0B" : cfg.color}
          strokeWidth={1.5}
          style={{ cursor: "crosshair" }}
          onMouseDown={e => { e.stopPropagation(); onPortClick(port); }}
        />
      ))}
    </g>
  );
}

function ArrowLine({ x1, y1, x2, y2, label, selected, onClick }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const ex = x2 - ux * 10, ey = y2 - uy * 10;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const color = selected ? "#F59E0B" : "#9CA3AF";

  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      {/* Wide invisible hit area */}
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke="transparent" strokeWidth={12} />
      <line x1={x1} y1={y1} x2={ex} y2={ey}
        stroke={color} strokeWidth={selected ? 2 : 1.5} strokeDasharray="6,4" />
      <polygon
        points={`${x2},${y2} ${x2 - ux * 10 - uy * 5},${y2 - uy * 10 + ux * 5} ${x2 - ux * 10 + uy * 5},${y2 - uy * 10 - ux * 5}`}
        fill={color} />
      {label && (
        <text x={mx} y={my - 8} textAnchor="middle" fontSize={10} fontFamily="Inter" fill={color}
          style={{ pointerEvents: "none" }}>
          {label}
        </text>
      )}
    </g>
  );
}

// ─── PALETTE ITEM ─────────────────────────────────────────────────────────────

function PaletteItem({ type, onDragStart }) {
  const cfg = NODE_TYPES[type];
  const W = 36, H = 28, R = 14;

  let preview = null;
  if (cfg.shape === "circle") {
    preview = (
      <svg width={32} height={32} viewBox="-16 -16 32 32">
        <circle r={R} fill={cfg.fill ? cfg.color : "#fff"} stroke={cfg.color} strokeWidth={2} />
        {cfg.fill && <circle r={7} fill="#fff" />}
        {!cfg.fill && <rect x={-5} y={-5} width={10} height={10} rx={2} fill={cfg.color} />}
      </svg>
    );
  } else if (cfg.shape === "rect") {
    preview = (
      <svg width={48} height={28} viewBox={`0 0 ${W * 1.3} ${H}`}>
        <rect x={0} y={0} width={W * 1.3} height={H} rx={5} fill="#fff" stroke={cfg.color} strokeWidth={2} />
        <rect x={6} y={7} width={10} height={10} rx={2} fill={cfg.color} opacity={0.7} />
      </svg>
    );
  } else if (cfg.shape === "diamond") {
    const S = 13;
    preview = (
      <svg width={32} height={32} viewBox="-16 -16 32 32">
        <polygon points={`0,${-S} ${S},0 0,${S} ${-S},0`} fill="#fff" stroke={cfg.color} strokeWidth={2} />
        <text textAnchor="middle" y={4} fontSize={7} fontFamily="Inter" fill={cfg.color} fontWeight="700">
          {type.toUpperCase()}
        </text>
      </svg>
    );
  }

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("nodeType", type); onDragStart && onDragStart(type); }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 8px", borderRadius: 8, cursor: "grab",
        border: "1px solid #E4E7ED", background: "#fff",
        userSelect: "none",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(91,106,245,0.18)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
      title={cfg.desc}
    >
      {preview}
      <span style={{ fontSize: 10, color: "#6B7280", fontFamily: "Inter", textAlign: "center" }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── PROPERTY PANEL ───────────────────────────────────────────────────────────

function PropertiesPanel({ selected, nodes, edges, onUpdateNode, onUpdateEdge, onDelete }) {
  if (!selected) {
    return (
      <div style={{ padding: 20, color: "#9CA3AF", fontSize: 12, fontFamily: "Inter", textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
        Selecciona un nodo o flecha para editar sus propiedades
      </div>
    );
  }

  if (selected.kind === "node") {
    const node = nodes.find(n => n.id === selected.id);
    if (!node) return null;
    const cfg = NODE_TYPES[node.type];
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", letterSpacing: 1, textTransform: "uppercase" }}>
          Propiedades del nodo
        </div>

        {/* Type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: cfg.color, color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "Inter", fontWeight: 600 }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{cfg.desc}</span>
        </div>

        {/* Label */}
        <div>
          <label style={{ fontSize: 12, color: "#374151", fontFamily: "Inter", fontWeight: 500, display: "block", marginBottom: 4 }}>
            Etiqueta
          </label>
          <input
            value={node.label}
            onChange={e => onUpdateNode(node.id, { label: e.target.value })}
            style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Inter", color: "#111827", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        {/* Params per type */}
        {node.type === "llegada" && (
          <div>
            <label style={{ fontSize: 12, color: "#374151", fontFamily: "Inter", fontWeight: 500, display: "block", marginBottom: 4 }}>
              Tasa de llegada (λ) — ents/min
            </label>
            <input type="number" value={node.params?.lambda || ""} placeholder="ej. 0.5"
              onChange={e => onUpdateNode(node.id, { params: { ...node.params, lambda: e.target.value } })}
              style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Inter", boxSizing: "border-box", outline: "none" }} />
          </div>
        )}

        {node.type === "actividad" && (
          <>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontFamily: "Inter", fontWeight: 500, display: "block", marginBottom: 4 }}>
                Tiempo de servicio (μ) — min
              </label>
              <input type="number" value={node.params?.mu || ""} placeholder="ej. 5"
                onChange={e => onUpdateNode(node.id, { params: { ...node.params, mu: e.target.value } })}
                style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Inter", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontFamily: "Inter", fontWeight: 500, display: "block", marginBottom: 4 }}>
                Servidores (c)
              </label>
              <input type="number" min={1} value={node.params?.servers || 1}
                onChange={e => onUpdateNode(node.id, { params: { ...node.params, servers: e.target.value } })}
                style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Inter", boxSizing: "border-box", outline: "none" }} />
            </div>
          </>
        )}

        {(node.type === "xor" || node.type === "or") && (
          <div>
            <label style={{ fontSize: 12, color: "#374151", fontFamily: "Inter", fontWeight: 500, display: "block", marginBottom: 4 }}>
              Probabilidad rama principal (0–1)
            </label>
            <input type="number" min={0} max={1} step={0.05} value={node.params?.prob || ""}
              placeholder="ej. 0.6"
              onChange={e => onUpdateNode(node.id, { params: { ...node.params, prob: e.target.value } })}
              style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Inter", boxSizing: "border-box", outline: "none" }} />
          </div>
        )}

        {/* Position */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {["x", "y"].map(axis => (
            <div key={axis}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", display: "block", marginBottom: 3 }}>{axis.toUpperCase()}</label>
              <input type="number" value={node[axis]}
                onChange={e => onUpdateNode(node.id, { [axis]: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "Inter", boxSizing: "border-box", outline: "none" }} />
            </div>
          ))}
        </div>

        <button onClick={() => onDelete(selected)}
          style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 6, padding: "7px 0", color: "#EF4444", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          🗑 Eliminar nodo
        </button>
      </div>
    );
  }

  if (selected.kind === "edge") {
    const edge = edges.find(e => e.id === selected.id);
    if (!edge) return null;
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", letterSpacing: 1, textTransform: "uppercase" }}>
          Propiedades de la flecha
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#374151", fontFamily: "Inter", fontWeight: 500, display: "block", marginBottom: 4 }}>
            Etiqueta (opcional)
          </label>
          <input value={edge.label || ""} placeholder="ej. Sí / No"
            onChange={e => onUpdateEdge(edge.id, { label: e.target.value })}
            style={{ width: "100%", border: "1px solid #E4E7ED", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Inter", boxSizing: "border-box", outline: "none" }} />
        </div>
        <button onClick={() => onDelete(selected)}
          style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 6, padding: "7px 0", color: "#EF4444", fontFamily: "Inter", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          🗑 Eliminar flecha
        </button>
      </div>
    );
  }

  return null;
}

// ─── MAIN EDITOR ─────────────────────────────────────────────────────────────

export default function ModelEditor() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selected, setSelected] = useState(null);          // { kind: "node"|"edge", id }
  const [draggingNode, setDraggingNode] = useState(null);  // { id, offsetX, offsetY }
  const [connecting, setConnecting] = useState(null);      // { fromId, fromPort, x, y }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Get SVG coordinates from mouse event
  const getSVGPoint = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: snap((e.clientX - rect.left - canvasOffset.x) / zoom),
      y: snap((e.clientY - rect.top - canvasOffset.y) / zoom),
    };
  }, [canvasOffset, zoom]);

  // Port world position
  const portPos = useCallback((node, port) => {
    const cfg = NODE_TYPES[node.type];
    const R = 26, W = 120, H = 48, S = 28;
    const offsets = {
      l: cfg.shape === "rect" ? { x: -W / 2, y: 0 } : { x: -R, y: 0 },
      r: cfg.shape === "rect" ? { x: W / 2, y: 0 } : { x: R, y: 0 },
      t: cfg.shape === "rect" ? { x: 0, y: -H / 2 } : { x: 0, y: -R },
      b: cfg.shape === "rect" ? { x: 0, y: H / 2 } : { x: 0, y: R },
    };
    const off = offsets[port.id] || { x: 0, y: 0 };
    return { x: node.x + off.x, y: node.y + off.y };
  }, []);

  // ─── DROP from palette ────────────────────────────────────────────────────

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("nodeType");
    if (!type) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = snap((e.clientX - rect.left - canvasOffset.x) / zoom);
    const y = snap((e.clientY - rect.top - canvasOffset.y) / zoom);
    const cfg = NODE_TYPES[type];
    setNodes(prev => [...prev, {
      id: uid(), type, x, y,
      label: cfg.label,
      params: {},
    }]);
  }, [canvasOffset, zoom]);

  // ─── NODE DRAG ────────────────────────────────────────────────────────────

  const handleNodeMouseDown = useCallback((e, id) => {
    e.stopPropagation();
    if (connecting) return;
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left - canvasOffset.x) / zoom;
    const my = (e.clientY - rect.top - canvasOffset.y) / zoom;
    setDraggingNode({ id, offsetX: mx - node.x, offsetY: my - node.y });
    setSelected({ kind: "node", id });
  }, [nodes, connecting, canvasOffset, zoom]);

  const handleSVGMouseMove = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left - canvasOffset.x) / zoom;
    const my = (e.clientY - rect.top - canvasOffset.y) / zoom;
    setMousePos({ x: mx, y: my });
    if (draggingNode) {
      setNodes(prev => prev.map(n =>
        n.id === draggingNode.id
          ? { ...n, x: snap(mx - draggingNode.offsetX), y: snap(my - draggingNode.offsetY) }
          : n
      ));
    }
  }, [draggingNode, canvasOffset, zoom]);

  const handleSVGMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  // ─── CONNECT ─────────────────────────────────────────────────────────────

  const handlePortClick = useCallback((nodeId, port) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pp = portPos(node, port);

    if (!connecting) {
      setConnecting({ fromId: nodeId, fromPort: port.id, x: pp.x, y: pp.y });
    } else {
      if (connecting.fromId !== nodeId) {
        setEdges(prev => [...prev, {
          id: uid(),
          from: connecting.fromId,
          fromPort: connecting.fromPort,
          to: nodeId,
          toPort: port.id,
          label: "",
        }]);
      }
      setConnecting(null);
    }
  }, [connecting, nodes, portPos]);

  // ─── CANVAS CLICK (deselect / cancel connect) ─────────────────────────────

  const handleSVGClick = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect" && e.target.getAttribute("data-bg")) {
      setSelected(null);
      setConnecting(null);
    }
  }, []);

  // ─── KEYBOARD DELETE ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        if (e.target.tagName === "INPUT") return;
        handleDelete(selected);
      }
      if (e.key === "Escape") setConnecting(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected]);

  const handleDelete = useCallback((sel) => {
    if (!sel) return;
    if (sel.kind === "node") {
      setNodes(prev => prev.filter(n => n.id !== sel.id));
      setEdges(prev => prev.filter(e => e.from !== sel.id && e.to !== sel.id));
    } else {
      setEdges(prev => prev.filter(e => e.id !== sel.id));
    }
    setSelected(null);
  }, []);

  // ─── UPDATES ─────────────────────────────────────────────────────────────

  const updateNode = useCallback((id, patch) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const updateEdge = useCallback((id, patch) => {
    setEdges(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);

  // ─── CLEAR ───────────────────────────────────────────────────────────────

  const clearCanvas = () => {
    if (nodes.length === 0 && edges.length === 0) return;
    if (confirm("¿Limpiar el canvas? Se perderá el modelo actual.")) {
      setNodes([]); setEdges([]); setSelected(null); setConnecting(null);
    }
  };

  // ─── RENDER EDGES ─────────────────────────────────────────────────────────

  const renderedEdges = edges.map(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return null;
    const fp = portPos(fromNode, { id: edge.fromPort });
    const tp = portPos(toNode, { id: edge.toPort });
    return (
      <ArrowLine key={edge.id}
        x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
        label={edge.label}
        selected={selected?.kind === "edge" && selected.id === edge.id}
        onClick={(e) => { e.stopPropagation(); setSelected({ kind: "edge", id: edge.id }); }}
      />
    );
  });

  const CANVAS_W = 1800;
  const CANVAS_H = 1000;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E7ED", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 52, position: "sticky", top: 0, zIndex: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#5B6AF5", letterSpacing: 0.5 }}>PROCSIM</span>
        <span style={{ color: "#9CA3AF", fontSize: 12 }}>Editor de Modelos</span>
        <div style={{ flex: 1 }} />
        {/* Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            style={{ border: "1px solid #E4E7ED", borderRadius: 5, background: "#fff", width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#6B7280" }}>−</button>
          <span style={{ fontSize: 12, color: "#6B7280", width: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            style={{ border: "1px solid #E4E7ED", borderRadius: 5, background: "#fff", width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#6B7280" }}>+</button>
          <button onClick={() => setZoom(1)}
            style={{ border: "1px solid #E4E7ED", borderRadius: 5, background: "#fff", padding: "0 8px", height: 28, cursor: "pointer", fontSize: 11, color: "#6B7280" }}>Fit</button>
        </div>
        <button onClick={clearCanvas}
          style={{ border: "1px solid #FECACA", borderRadius: 6, background: "#FEF2F2", padding: "5px 14px", color: "#EF4444", fontFamily: "Inter", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
          🗑 Limpiar
        </button>
        {/* Stats */}
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{nodes.length} nodo{nodes.length !== 1 ? "s" : ""}  ·  {edges.length} flecha{edges.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT: Palette */}
        <div style={{ width: 140, background: "#fff", borderRight: "1px solid #E4E7ED", padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Elementos</div>
          {PALETTE_ITEMS.map(item => (
            <PaletteItem key={item.type} type={item.type} />
          ))}
          <div style={{ marginTop: 8, padding: "10px 8px", background: "#F0F2F5", borderRadius: 8, fontSize: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
            <strong style={{ color: "#6B7280" }}>Tips:</strong><br />
            • Arrastra al canvas<br />
            • Haz click en ● para conectar<br />
            • Selecciona y presiona <kbd style={{ background: "#fff", border: "1px solid #E4E7ED", borderRadius: 3, padding: "0 3px" }}>Del</kbd> para borrar<br />
            • <kbd style={{ background: "#fff", border: "1px solid #E4E7ED", borderRadius: 3, padding: "0 3px" }}>Esc</kbd> cancela conexión
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div ref={containerRef} style={{ flex: 1, overflow: "auto", position: "relative", background: "#F7F8FA" }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Connection hint */}
          {connecting && (
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#fff", borderRadius: 20, padding: "5px 16px", fontSize: 12, fontFamily: "Inter", fontWeight: 600, zIndex: 10, pointerEvents: "none" }}>
              Haz click en otro puerto para conectar · Esc para cancelar
            </div>
          )}

          {nodes.length === 0 && !connecting && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: "#D1D5DB", pointerEvents: "none", userSelect: "none" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⬡</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Canvas vacío</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Arrastra elementos del panel izquierdo para comenzar</div>
            </div>
          )}

          <svg
            ref={svgRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: "block", cursor: connecting ? "crosshair" : "default" }}
            onClick={handleSVGClick}
            onMouseMove={handleSVGMouseMove}
            onMouseUp={handleSVGMouseUp}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse"
                x={canvasOffset.x} y={canvasOffset.y}>
                <circle cx={SNAP / 2} cy={SNAP / 2} r={0.8} fill="#E4E7ED" />
              </pattern>
            </defs>
            <rect data-bg="true" width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />

            <g transform={`translate(${canvasOffset.x},${canvasOffset.y}) scale(${zoom})`}>
              {/* Edges */}
              {renderedEdges}

              {/* Live connecting line */}
              {connecting && (() => {
                const fromNode = nodes.find(n => n.id === connecting.fromId);
                if (!fromNode) return null;
                const fp = portPos(fromNode, { id: connecting.fromPort });
                return (
                  <line x1={fp.x} y1={fp.y} x2={mousePos.x} y2={mousePos.y}
                    stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5,4" />
                );
              })()}

              {/* Nodes */}
              {nodes.map(node => (
                <NodeShape
                  key={node.id}
                  type={node.type}
                  x={node.x}
                  y={node.y}
                  label={node.label}
                  selected={selected?.kind === "node" && selected.id === node.id}
                  connecting={!!connecting}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onPortClick={(port) => handlePortClick(node.id, port)}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* RIGHT: Properties */}
        <div style={{ width: 220, background: "#fff", borderLeft: "1px solid #E4E7ED", overflowY: "auto" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E4E7ED", fontSize: 11, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase" }}>
            Propiedades
          </div>
          <PropertiesPanel
            selected={selected}
            nodes={nodes}
            edges={edges}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onDelete={handleDelete}
          />
        </div>

      </div>
    </div>
  );
}
