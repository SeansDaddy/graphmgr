import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SeverityLevel } from '../types';
import { FaultTreeDocument, FtaTreeNode, FtaObservation } from '../types/fta';
import {
  Activity,
  ArrowRight,
  GitFork,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Flame,
  Zap,
  Info,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface PropagationStepNode {
  id: string;
  name: string;
  stage: 'trigger' | 'gate' | 'top' | 'mitigation';
  stageLabel: string;
  gateType?: 'AND' | 'OR' | 'VOTE' | 'PRIORITY_AND';
  conditionText?: string;
  observationId?: string;
  triggered?: boolean;
  severity?: SeverityLevel;
  x: number;
  y: number;
  description?: string;
}

export interface PropagationStepEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  gateLogic?: 'AND' | 'OR';
  active?: boolean;
}

interface FtaPropagationGraphProps {
  ftaDoc: FaultTreeDocument;
  simObservations?: Record<string, any>;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  compact?: boolean;
}

export const FtaPropagationGraph: React.FC<FtaPropagationGraphProps> = ({
  ftaDoc,
  simObservations = {},
  selectedNodeId,
  onSelectNode,
  compact = false,
}) => {
  // Viewport Zoom & Pan
  const [zoom, setZoom] = useState(compact ? 0.75 : 0.85);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Simulation Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playStep, setPlayStep] = useState<number | null>(null);
  const playTimerRef = useRef<any>(null);

  // Compute Active Node States based on simObservations
  const evaluatedStates: Record<string, boolean> = useMemo(() => {
    const states: Record<string, boolean> = {};

    // 1. Evaluate basic nodes from observations
    (ftaDoc.fault_tree.nodes || []).forEach((node) => {
      if (node.type === 'basic' && node.condition) {
        const obsId = node.condition.observation;
        const val = simObservations[obsId];
        let hit = false;
        if (val !== undefined) {
          const op = node.condition.operator;
          const target = node.condition.value;
          if (op === 'gt') hit = Number(val) > Number(target);
          else if (op === 'gte') hit = Number(val) >= Number(target);
          else if (op === 'lt') hit = Number(val) < Number(target);
          else if (op === 'lte') hit = Number(val) <= Number(target);
          else if (op === 'eq') hit = val === target;
          else if (op === 'ne') hit = val !== target;
          else if (op === 'active') hit = val === true || val === 'active';
          else if (op === 'exists') hit = Boolean(val);
        }
        states[node.id] = hit;
      }
    });

    // 2. Evaluate intermediate nodes
    (ftaDoc.fault_tree.nodes || []).forEach((node) => {
      if (node.type === 'intermediate' && node.children) {
        const childHits = node.children.map((cId) => states[cId] || false);
        if (node.gate === 'AND') {
          states[node.id] = childHits.length > 0 && childHits.every(Boolean);
        } else {
          states[node.id] = childHits.some(Boolean);
        }
      }
    });

    // 3. Evaluate root node
    const rootNode = ftaDoc.fault_tree.nodes.find((n) => n.id === ftaDoc.fault_tree.root) || ftaDoc.fault_tree.nodes[0];
    if (rootNode && rootNode.children) {
      const childHits = rootNode.children.map((cId) => states[cId] || false);
      if (rootNode.gate === 'AND') {
        states[rootNode.id] = childHits.length > 0 && childHits.every(Boolean);
      } else {
        states[rootNode.id] = childHits.some(Boolean);
      }
    }

    return states;
  }, [ftaDoc, simObservations]);

  // Construct Propagation Graph Nodes & Edges from FaultTreeDocument
  const { nodes, edges } = useMemo(() => {
    const graphNodes: PropagationStepNode[] = [];
    const graphEdges: PropagationStepEdge[] = [];

    const rootNode = ftaDoc.fault_tree.nodes.find((n) => n.id === ftaDoc.fault_tree.root) || ftaDoc.fault_tree.nodes[0];
    const intermediateNodes = (ftaDoc.fault_tree.nodes || []).filter(
      (n) => n.type === 'intermediate' || (rootNode?.children || []).includes(n.id)
    );
    const basicNodes = (ftaDoc.fault_tree.nodes || []).filter((n) => n.type === 'basic');

    // Layout configuration: 4 Horizontal Columns
    // Column 1: Triggers & Basic Events (x: 40)
    // Column 2: Intermediate Gate Confluence (x: 360)
    // Column 3: Top Event & Climax (x: 700)
    // Column 4: Mitigation & Barrier (x: 1040)
    const col1X = 40;
    const col2X = 360;
    const col3X = 700;
    const col4X = 1040;

    // 1. Layout Basic Event Nodes (Column 1)
    const basicSpacing = Math.max(90, 480 / Math.max(1, basicNodes.length));
    basicNodes.forEach((bNode, idx) => {
      let condText = '';
      if (bNode.condition) {
        condText = `${bNode.condition.observation} ${bNode.condition.operator} ${bNode.condition.value ?? ''}`;
      }

      graphNodes.push({
        id: bNode.id,
        name: bNode.name,
        stage: 'trigger',
        stageLabel: '阶段 1: 物理异常触发',
        conditionText: condText,
        observationId: bNode.condition?.observation,
        triggered: evaluatedStates[bNode.id],
        x: col1X,
        y: 40 + idx * basicSpacing,
        description: `底层传感器与遥测观测判据，当满足阈值时产生初始故障激励`,
      });
    });

    // 2. Layout Intermediate Gate Nodes (Column 2)
    const interSpacing = Math.max(110, 480 / Math.max(1, intermediateNodes.length));
    intermediateNodes.forEach((iNode, idx) => {
      graphNodes.push({
        id: iNode.id,
        name: iNode.name,
        stage: 'gate',
        stageLabel: '阶段 2: 逻辑门传导汇聚',
        gateType: (iNode.gate as any) || 'AND',
        triggered: evaluatedStates[iNode.id],
        severity: ftaDoc.metadata.severity,
        x: col2X,
        y: 60 + idx * interSpacing,
        description: `布尔逻辑门【${iNode.gate || 'AND'} 门】，${
          iNode.gate === 'AND' ? '需全部子事件同时满足方可向上传导' : '任一子事件命中即触发向下级扩散'
        }`,
      });

      // Connect children to this intermediate node
      (iNode.children || []).forEach((cId) => {
        graphEdges.push({
          id: `E_${cId}_${iNode.id}`,
          from: cId,
          to: iNode.id,
          label: iNode.gate === 'AND' ? '⋀ 协同输入' : '⋁ 独立输入',
          gateLogic: iNode.gate === 'AND' ? 'AND' : 'OR',
          active: evaluatedStates[cId] && evaluatedStates[iNode.id],
        });
      });
    });

    // 3. Layout Top Event Node (Column 3)
    if (rootNode) {
      const topY = 160;
      graphNodes.push({
        id: rootNode.id,
        name: rootNode.name,
        stage: 'top',
        stageLabel: '阶段 3: 顶事件确诊爆发',
        gateType: (rootNode.gate as any) || 'OR',
        triggered: evaluatedStates[rootNode.id],
        severity: ftaDoc.metadata.severity,
        x: col3X,
        y: topY,
        description: `FTA 顶事件爆发：${rootNode.output?.conclusion || '系统严重故障确诊'} (置信度阈值: ${
          rootNode.output?.confidence?.threshold || 0.8
        })`,
      });

      // Connect intermediate nodes to root
      (rootNode.children || []).forEach((cId) => {
        graphEdges.push({
          id: `E_${cId}_${rootNode.id}`,
          from: cId,
          to: rootNode.id,
          label: rootNode.gate === 'AND' ? '⋀ 协同致危' : '⋁ 触发顶事件',
          gateLogic: rootNode.gate === 'AND' ? 'AND' : 'OR',
          active: evaluatedStates[cId] && evaluatedStates[rootNode.id],
        });
      });
    }

    // 4. Layout Mitigation Recommendations (Column 4)
    const recs = ftaDoc.diagnosis?.conclusions?.[0]?.recommendations || [
      '切断直流主接触器与断路器',
      '启动应急散热与备用系统',
      '联动声光报警并上报调度',
    ];

    const recSpacing = Math.max(90, 360 / Math.max(1, recs.length));
    recs.slice(0, 3).forEach((recText, idx) => {
      const recId = `SOP_STEP_${idx + 1}`;
      graphNodes.push({
        id: recId,
        name: recText,
        stage: 'mitigation',
        stageLabel: '阶段 4: 阻断与应急响应',
        triggered: evaluatedStates[rootNode?.id || ''],
        x: col4X,
        y: 80 + idx * recSpacing,
        description: `标准应急处置程序 (SOP)：在故障传播至顶事件后实施阻断隔离与安全泄放措施`,
      });

      if (rootNode) {
        graphEdges.push({
          id: `E_${rootNode.id}_${recId}`,
          from: rootNode.id,
          to: recId,
          label: '联动阻断',
          active: evaluatedStates[rootNode.id],
        });
      }
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [ftaDoc, evaluatedStates]);

  // Simulation Play Animation Loop
  const handleTogglePlay = () => {
    if (isPlaying) {
      clearInterval(playTimerRef.current);
      setIsPlaying(false);
      setPlayStep(null);
    } else {
      setIsPlaying(true);
      setPlayStep(1);
      let step = 1;
      playTimerRef.current = setInterval(() => {
        step++;
        if (step > 4) {
          clearInterval(playTimerRef.current);
          setIsPlaying(false);
          setPlayStep(4);
        } else {
          setPlayStep(step);
        }
      }, 1200);
    }
  };

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // Mouse Canvas Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-propagation-node')) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-md">
      {/* Top Banner Toolbar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center space-x-2.5">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Activity className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">FTA 故障因果传播推演图</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                逻辑门关系 ➔ 物理传播链映射
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              将树状逻辑门（AND ⋀ / OR ⋁）转换为从物理传感器判据、中间机理演进至顶事件与应急阻断的时序传播流
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Play Animation */}
          <button
            onClick={handleTogglePlay}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              isPlaying
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? `推演中: 阶段 ${playStep}` : '推演演变动画'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 text-slate-300 text-xs">
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 hover:text-white"
              title="放大"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-1.5 hover:text-white"
              title="缩小"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setZoom(compact ? 0.75 : 0.85);
                setPan({ x: 20, y: 20 });
              }}
              className="p-1.5 hover:text-white border-l border-slate-700"
              title="复位"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div
        className={`relative h-[560px] bg-slate-950 overflow-hidden cursor-grab select-none ${
          isPanning ? 'cursor-grabbing' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Stage Columns Watermark Headers */}
        <div
          className="absolute top-2 pointer-events-none flex text-[11px] font-mono font-bold"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <div className="w-[300px] pl-6 text-blue-400/80 border-b border-blue-500/20 pb-1">
            阶段 1: 物理异常触发 (Basic Events)
          </div>
          <div className="w-[320px] pl-6 text-indigo-400/80 border-b border-indigo-500/20 pb-1">
            阶段 2: 逻辑门传导汇聚 (Logic Gates)
          </div>
          <div className="w-[320px] pl-6 text-rose-400/80 border-b border-rose-500/20 pb-1">
            阶段 3: 顶事件确诊爆发 (Top Event)
          </div>
          <div className="w-[300px] pl-6 text-emerald-400/80 border-b border-emerald-500/20 pb-1">
            阶段 4: 阻断与应急响应 (SOP Barrier)
          </div>
        </div>

        {/* SVG Drawing Layer (Curves & Connectors) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <marker
              id="prop-arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker
              id="prop-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker
              id="prop-arrow-critical"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          <g
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Draw Stage Column Shading */}
            <rect
              x="20"
              y="20"
              width="280"
              height="500"
              rx="14"
              fill="#1e293b"
              fillOpacity="0.2"
              stroke="#334155"
              strokeDasharray="4 4"
              strokeOpacity="0.3"
            />
            <rect
              x="340"
              y="20"
              width="280"
              height="500"
              rx="14"
              fill="#1e293b"
              fillOpacity="0.2"
              stroke="#334155"
              strokeDasharray="4 4"
              strokeOpacity="0.3"
            />
            <rect
              x="680"
              y="20"
              width="280"
              height="500"
              rx="14"
              fill="#1e293b"
              fillOpacity="0.2"
              stroke="#334155"
              strokeDasharray="4 4"
              strokeOpacity="0.3"
            />
            <rect
              x="1020"
              y="20"
              width="260"
              height="500"
              rx="14"
              fill="#1e293b"
              fillOpacity="0.2"
              stroke="#334155"
              strokeDasharray="4 4"
              strokeOpacity="0.3"
            />

            {/* Draw Directed Propagation Edges */}
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.from);
              const target = nodes.find((n) => n.id === edge.to);
              if (!source || !target) return null;

              const cardWidth = 240;
              const cardHeight = 65;

              const startX = source.x + cardWidth;
              const startY = source.y + cardHeight / 2;
              const endX = target.x;
              const endY = target.y + cardHeight / 2;

              const dx = endX - startX;
              const cp1x = startX + dx * 0.5;
              const cp1y = startY;
              const cp2x = startX + dx * 0.5;
              const cp2y = endY;

              const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;

              const isEdgeActive = edge.active;

              return (
                <g key={edge.id} className="transition-all duration-300">
                  {/* Glow layer */}
                  {isEdgeActive && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="5"
                      strokeOpacity="0.4"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Curve */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isEdgeActive ? '#f59e0b' : '#475569'}
                    strokeWidth={isEdgeActive ? 2.5 : 1.5}
                    strokeOpacity={isEdgeActive ? 0.95 : 0.4}
                    strokeDasharray={isEdgeActive ? '5 3' : undefined}
                    markerEnd={isEdgeActive ? 'url(#prop-arrow-active)' : 'url(#prop-arrow-default)'}
                  />

                  {/* Edge Label Badge */}
                  {edge.label && (
                    <g transform={`translate(${midX}, ${midY})`} className="pointer-events-auto">
                      <rect
                        x="-38"
                        y="-9"
                        width="76"
                        height="18"
                        rx="9"
                        fill={isEdgeActive ? '#1e293b' : '#0f172a'}
                        stroke={isEdgeActive ? '#f59e0b' : '#334155'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={isEdgeActive ? '#fde68a' : '#94a3b8'}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* HTML Node Elements Layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isTriggered = node.triggered;
            const stageNum =
              node.stage === 'trigger'
                ? 1
                : node.stage === 'gate'
                ? 2
                : node.stage === 'top'
                ? 3
                : 4;
            const isSimHighlighted = playStep !== null && playStep >= stageNum;

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectNode) onSelectNode(node.id);
                }}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: node.stage === 'top' ? '250px' : '240px',
                }}
                className={`interactive-propagation-node pointer-events-auto rounded-xl p-3 cursor-pointer transition-all select-none border ${
                  node.stage === 'top'
                    ? isTriggered
                      ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/40 shadow-lg text-white'
                      : 'bg-slate-900 border-2 border-rose-800/80 text-white'
                    : node.stage === 'mitigation'
                    ? 'bg-emerald-950/60 border border-emerald-700/60 hover:border-emerald-500 text-emerald-100'
                    : isSelected
                    ? 'bg-slate-850 border-2 border-indigo-400 ring-2 ring-indigo-400/30 text-white shadow-md'
                    : isTriggered
                    ? 'bg-amber-950/80 border-amber-500/80 text-amber-100 shadow-sm'
                    : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500 text-slate-200'
                } ${isSimHighlighted ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
              >
                {/* Node Stage & Type Pill */}
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-800">
                  <span className="font-mono text-slate-400 truncate max-w-[120px]">
                    {node.id}
                  </span>

                  {node.gateType ? (
                    <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-900 text-indigo-200 border border-indigo-700">
                      {node.gateType === 'AND' ? '⋀ AND 门' : '⋁ OR 门'}
                    </span>
                  ) : node.stage === 'mitigation' ? (
                    <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 border border-emerald-700">
                      阻断措施
                    </span>
                  ) : (
                    <span className="font-mono px-1 rounded bg-slate-800 text-slate-300">
                      底事件
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="text-xs font-bold mt-1.5 truncate text-white" title={node.name}>
                  {node.name}
                </div>

                {/* Condition / Observation Info */}
                {node.conditionText && (
                  <div className="text-[10px] font-mono text-amber-300 bg-slate-950 px-1.5 py-0.5 rounded mt-1 truncate border border-slate-800">
                    判据: {node.conditionText}
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400">{node.stageLabel.split(':')[0]}</span>
                  <span
                    className={`font-semibold flex items-center space-x-1 ${
                      isTriggered ? 'text-rose-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isTriggered ? 'bg-rose-500 animate-ping' : 'bg-slate-600'
                      }`}
                    />
                    <span>{isTriggered ? '传导命中' : '正常未激'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary Legend */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>阶段 1: 物理传感器与指标超限</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>阶段 2: 逻辑门布尔汇聚推演</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>阶段 3: 顶事件确诊与告警跳闸</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>阶段 4: 联动处置阻断</span>
          </span>
        </div>

        <div className="text-amber-400 font-mono">
          当前状态: {Object.values(evaluatedStates).filter(Boolean).length} / {Object.keys(evaluatedStates).length} 节点处于激活传导态
        </div>
      </div>
    </div>
  );
};
