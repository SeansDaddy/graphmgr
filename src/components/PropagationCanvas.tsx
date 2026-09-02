import React, { useState, useRef, useEffect } from 'react';
import { PropagationStep, PropagationNodePos } from '../types';
import {
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Clock,
  Link,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';

interface PropagationCanvasProps {
  faultName: string;
  propagationChain: PropagationStep[];
  onUpdateChain: (chain: PropagationStep[], layout?: PropagationNodePos[]) => void;
  savedLayout?: PropagationNodePos[];
}

export const PropagationCanvas: React.FC<PropagationCanvasProps> = ({
  faultName,
  propagationChain,
  onUpdateChain,
  savedLayout,
}) => {
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Dialog for editing link time window
  const [linkDialog, setLinkDialog] = useState<{
    show: boolean;
    from: string;
    to: string;
    timeWindow: string;
    probability: number;
    description: string;
  } | null>(null);

  // Nodes management
  const [nodes, setNodes] = useState<PropagationNodePos[]>(() => {
    if (savedLayout && savedLayout.length > 0) return savedLayout;

    // Default layout derived from fault name and chain
    const initialNodes: PropagationNodePos[] = [
      { id: 'node-root', label: faultName || '故障根因', type: 'fault', x: 60, y: 120 },
    ];

    const allNames: string[] = propagationChain.flatMap((p) => [p.from, p.to]);
    const uniqueTargets: string[] = Array.from(new Set(allNames)).filter(
      (name) => name !== faultName && name !== 'node-root'
    );

    uniqueTargets.forEach((targetName, idx) => {
      initialNodes.push({
        id: `node-${idx + 1}`,
        label: targetName,
        type: idx === uniqueTargets.length - 1 ? 'consequence' : 'symptom',
        x: 320 + (idx % 2) * 40,
        y: 80 + idx * 120,
      });
    });

    return initialNodes;
  });

  // Sync if faultName changed
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => (n.type === 'fault' ? { ...n, label: faultName || '故障根因' } : n))
    );
  }, [faultName]);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDownNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingFromId) {
      // Complete connection
      if (connectingFromId !== id) {
        const sourceNode = nodes.find((n) => n.id === connectingFromId);
        const targetNode = nodes.find((n) => n.id === id);
        if (sourceNode && targetNode) {
          setLinkDialog({
            show: true,
            from: sourceNode.label,
            to: targetNode.label,
            timeWindow: '5-15min',
            probability: 0.9,
            description: '',
          });
        }
      }
      setConnectingFromId(null);
      return;
    }

    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    setDraggingNodeId(id);
    setSelectedNodeId(id);
    dragOffset.current = {
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round(e.clientX / zoom - dragOffset.current.x);
      const newY = Math.round(e.clientY / zoom - dragOffset.current.y);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(20, newX), y: Math.max(20, newY) } : n))
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      onUpdateChain(propagationChain, nodes);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const panPan = pan;

  const handleStartPan = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      panStart.current = {
        x: e.clientX - panPan.x,
        y: e.clientY - panPan.y,
      };
      setConnectingFromId(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  const handleAddNode = (type: 'symptom' | 'intermediate' | 'consequence' = 'intermediate') => {
    const nextIdx = nodes.length + 1;
    let label = `新传播阶段 ${nextIdx}`;
    if (type === 'consequence') label = `保护动作/跳闸 ${nextIdx}`;
    if (type === 'symptom') label = `监测异常指标 ${nextIdx}`;

    const newNode: PropagationNodePos = {
      id: `node-${Date.now()}`,
      label,
      type,
      x: 200 + (nodes.length % 3) * 60,
      y: 100 + (nodes.length % 4) * 80,
    };

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    setSelectedNodeId(newNode.id);
    onUpdateChain(propagationChain, updatedNodes);
  };

  const handleDeleteNode = (id: string) => {
    const nodeToDelete = nodes.find((n) => n.id === id);
    if (!nodeToDelete) return;

    const updatedNodes = nodes.filter((n) => n.id !== id);
    const updatedChain = propagationChain.filter(
      (p) => p.from !== nodeToDelete.label && p.to !== nodeToDelete.label
    );

    setNodes(updatedNodes);
    setSelectedNodeId(null);
    onUpdateChain(updatedChain, updatedNodes);
  };

  const handleConfirmLink = () => {
    if (!linkDialog) return;
    const newStep: PropagationStep = {
      id: `PROP-${Date.now()}`,
      from: linkDialog.from,
      to: linkDialog.to,
      time_window: linkDialog.timeWindow,
      probability: linkDialog.probability,
      description: linkDialog.description,
    };

    const updatedChain = [...propagationChain, newStep];
    onUpdateChain(updatedChain, nodes);
    setLinkDialog(null);
  };

  const handleDeleteEdge = (id: string) => {
    const updatedChain = propagationChain.filter((p) => p.id !== id);
    onUpdateChain(updatedChain, nodes);
    setSelectedEdgeId(null);
  };

  const handleResetLayout = () => {
    const arrangedNodes = nodes.map((node, i) => {
      if (node.type === 'fault') return { ...node, x: 60, y: 140 };
      return {
        ...node,
        x: 320,
        y: 60 + (i - 1) * 130,
      };
    });
    setNodes(arrangedNodes);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    onUpdateChain(propagationChain, arrangedNodes);
  };

  return (
    <div className="space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="flex items-center rounded-lg bg-slate-200/80 p-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'canvas'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>画布视图</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>列表视图</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />

          {/* Quick Node Creator buttons */}
          <button
            onClick={() => handleAddNode('symptom')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs border border-slate-200 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ 症状节点</span>
          </button>
          <button
            onClick={() => handleAddNode('intermediate')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs border border-slate-200 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ 传导阶段</span>
          </button>
          <button
            onClick={() => handleAddNode('consequence')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs border border-slate-200 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ 保护后果</span>
          </button>
        </div>

        {/* Zoom & Canvas controls */}
        {viewMode === 'canvas' && (
          <div className="flex items-center space-x-1 text-xs text-slate-600">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs"
              title="缩小"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-[11px] text-slate-700">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs"
              title="放大"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetLayout}
              className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs ml-1"
              title="重置居中布局"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* View 1: Canvas Mode */}
      {viewMode === 'canvas' ? (
        <div
          ref={containerRef}
          onMouseDown={handleStartPan}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative w-full h-[460px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-crosshair select-none shadow-inner"
        >
          {/* Background Grid Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Canvas Viewport with Pan/Zoom */}
          <div
            className="absolute inset-0 transition-transform duration-75 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Linking Lines */}
            <svg className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none z-0">
              <defs>
                <marker
                  id="arrow-dark"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                </marker>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#b45309" />
                </marker>
              </defs>

              {propagationChain.map((step) => {
                const sourceNode = nodes.find((n) => n.label === step.from);
                const targetNode = nodes.find((n) => n.label === step.to);
                if (!sourceNode || !targetNode) return null;

                const x1 = sourceNode.x + 90;
                const y1 = sourceNode.y + 24;
                const x2 = targetNode.x + 90;
                const y2 = targetNode.y + 24;

                const dx = x2 - x1;
                const dy = y2 - y1;

                const isSelected = selectedEdgeId === step.id;

                return (
                  <g
                    key={step.id}
                    className="pointer-events-auto cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(step.id);
                    }}
                  >
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx * 0.4} ${y1}, ${x2 - dx * 0.4} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                    />
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx * 0.4} ${y1}, ${x2 - dx * 0.4} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isSelected ? '#b45309' : '#475569'}
                      strokeWidth={isSelected ? '2.5' : '2'}
                      markerEnd={isSelected ? 'url(#arrow-amber)' : 'url(#arrow-dark)'}
                      className="group-hover:stroke-slate-900 transition"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Edge Time Window Badges */}
            {propagationChain.map((step) => {
              const sourceNode = nodes.find((n) => n.label === step.from);
              const targetNode = nodes.find((n) => n.label === step.to);
              if (!sourceNode || !targetNode) return null;

              const x1 = sourceNode.x + 90;
              const y1 = sourceNode.y + 24;
              const x2 = targetNode.x + 90;
              const y2 = targetNode.y + 24;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const isSelected = selectedEdgeId === step.id;

              return (
                <div
                  key={`badge-${step.id}`}
                  style={{ left: midX - 35, top: midY - 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(step.id);
                  }}
                  className={`absolute z-10 flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition shadow-xs ${
                    isSelected
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 scale-105'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span>{step.time_window || '5min'}</span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEdge(step.id);
                      }}
                      className="ml-1 text-slate-500 hover:text-rose-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            {/* Draggable HTML Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectingFromId === node.id;

              let typeBadge = '故障根因';
              let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
              let borderColor = 'border-slate-300 bg-white';

              if (node.type === 'symptom') {
                typeBadge = '症状';
                badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
              } else if (node.type === 'intermediate') {
                typeBadge = '传导阶段';
                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
              } else if (node.type === 'consequence') {
                typeBadge = '后果/跳闸';
                badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
              }

              return (
                <div
                  key={node.id}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '180px',
                  }}
                  onMouseDown={(e) => handleMouseDownNode(node.id, e)}
                  className={`absolute z-20 p-2.5 rounded-xl border shadow-xs cursor-grab active:cursor-grabbing transition-all ${borderColor} ${
                    isSelected ? 'ring-2 ring-slate-900 shadow-md' : ''
                  } ${isConnecting ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${badgeColor}`}>
                      {typeBadge}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectingFromId(connectingFromId === node.id ? null : node.id);
                        }}
                        className={`p-1 rounded text-slate-500 hover:text-slate-900 transition ${
                          isConnecting ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
                        }`}
                        title="点击此点，再点击目标点建立连线"
                      >
                        <Link className="w-3 h-3" />
                      </button>

                      {node.type !== 'fault' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                          title="删除此节点"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline editable label */}
                  <input
                    type="text"
                    value={node.label}
                    disabled={node.type === 'fault'}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === node.id ? { ...n, label: newLabel } : n))
                      );
                    }}
                    onBlur={() => onUpdateChain(propagationChain, nodes)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none focus:bg-slate-50 px-1 py-0.5 rounded truncate"
                  />
                </div>
              );
            })}
          </div>

          {/* Quick Help & Status Overlay */}
          <div className="absolute bottom-2 left-2 z-30 pointer-events-none">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-[11px] text-slate-600 backdrop-blur shadow-xs">
              <span>拖拽节点调整位置；点击节点 🔗 按钮再点击目标节点建立传导连接</span>
            </div>
          </div>
        </div>
      ) : (
        /* View 2: List / Table View of Propagation Steps */
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">
              传播链环节列表 ({propagationChain.length} 段)
            </span>
            <button
              onClick={() => {
                if (nodes.length < 2) return;
                setLinkDialog({
                  show: true,
                  from: nodes[0].label,
                  to: nodes[1]?.label || '下一阶段',
                  timeWindow: '5-15min',
                  probability: 0.9,
                  description: '',
                });
              }}
              className="text-xs text-slate-900 hover:text-slate-700 font-medium flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加连接</span>
            </button>
          </div>

          <div className="space-y-2">
            {propagationChain.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-900">[{step.from}]</span>
                  <div className="flex items-center space-x-1 text-slate-600 text-[11px] font-mono">
                    <span>──</span>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
                      {step.time_window}
                    </span>
                    <span>─▶</span>
                  </div>
                  <span className="font-semibold text-slate-900">[{step.to}]</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-slate-500">
                    概率: {Math.round((step.probability ?? 0.9) * 100)}%
                  </span>
                  <button
                    onClick={() => handleDeleteEdge(step.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {propagationChain.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                暂未定义故障传播链，请切换至画布或点击上方"+ 添加连接"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link Time Window Configuration Modal */}
      {linkDialog && linkDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">配置传播链连接与时间窗口</h3>
              <button
                onClick={() => setLinkDialog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-900 font-semibold">{linkDialog.from}</span>
                <span className="text-slate-400">──▶</span>
                <span className="text-slate-900 font-semibold">{linkDialog.to}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  传播时间窗口 (time_window)
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {['0-2min', '0-5min', '5-15min', '15-30min', '30-60min', '1-4小时'].map((tw) => (
                    <button
                      key={tw}
                      type="button"
                      onClick={() => setLinkDialog({ ...linkDialog, timeWindow: tw })}
                      className={`px-2 py-1 rounded-md text-[11px] border transition ${
                        linkDialog.timeWindow === tw
                          ? 'bg-slate-900 border-slate-900 text-white font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {tw}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={linkDialog.timeWindow}
                  onChange={(e) => setLinkDialog({ ...linkDialog, timeWindow: e.target.value })}
                  placeholder="自定义如: 0-5min"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  传导机理描述 (可选)
                </label>
                <input
                  type="text"
                  value={linkDialog.description}
                  onChange={(e) => setLinkDialog({ ...linkDialog, description: e.target.value })}
                  placeholder="如: 水泵停转直接阻断主管路循环对流"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setLinkDialog(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition"
              >
                取消
              </button>
              <button
                onClick={handleConfirmLink}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
              >
                建立连接
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
