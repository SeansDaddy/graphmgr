import React, { useState, useRef, useEffect } from 'react';
import {
  PropagationStep,
  PropagationNodePos,
  FaultSymptom,
  DeviceTypeCategory,
  DEVICE_TYPE_OPTIONS,
} from '../types';
import {
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Clock,
  Link as LinkIcon,
  LayoutGrid,
  List,
  X,
  Edit2,
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface PropagationCanvasProps {
  faultName: string;
  symptoms?: FaultSymptom[];
  affectedDevices?: string[];
  propagationChain: PropagationStep[];
  onUpdateChain: (chain: PropagationStep[], layout?: PropagationNodePos[]) => void;
  savedLayout?: PropagationNodePos[];
}

export const getDeviceTypeStyle = (type?: DeviceTypeCategory) => {
  switch (type) {
    case 'cooling_pump':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-800',
        border: 'border-cyan-300',
        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        dot: 'bg-cyan-500',
      };
    case 'transformer':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'battery':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'bms':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-300',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'pcs':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        dot: 'bg-indigo-500',
      };
    case 'switchgear':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-300',
        badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'cabin':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-300',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
        dot: 'bg-sky-500',
      };
    case 'pipe':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-300',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
        dot: 'bg-teal-500',
      };
    case 'fss':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'gas_relay':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        dot: 'bg-yellow-500',
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-800',
        border: 'border-slate-300',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
        dot: 'bg-slate-500',
      };
  }
};

export const getDeviceTypeLabel = (type?: DeviceTypeCategory) => {
  const opt = DEVICE_TYPE_OPTIONS.find((o) => o.value === type);
  return opt ? opt.label : '辅助设备';
};

export const PropagationCanvas: React.FC<PropagationCanvasProps> = ({
  faultName,
  symptoms = [],
  affectedDevices = [],
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

  // Dialog for editing causal link between two device-symptom pairs
  const [linkDialog, setLinkDialog] = useState<{
    show: boolean;
    stepId?: string;
    fromLabel: string;
    toLabel: string;
    fromDeviceType: DeviceTypeCategory;
    fromDeviceName: string;
    fromSymptomName: string;
    toDeviceType: DeviceTypeCategory;
    toDeviceName: string;
    toSymptomName: string;
    timeWindow: string;
    probability: number;
    description: string;
  } | null>(null);

  // Dialog for editing a single node's device and symptom details
  const [nodeDialog, setNodeDialog] = useState<{
    show: boolean;
    nodeId: string;
    label: string;
    type: 'fault' | 'symptom' | 'intermediate' | 'consequence';
    device_type: DeviceTypeCategory;
    device_name: string;
    symptom_name: string;
  } | null>(null);

  // Helper to build initial nodes
  const buildInitialNodes = (): PropagationNodePos[] => {
    if (savedLayout && savedLayout.length > 0) {
      return savedLayout;
    }

    const firstSymptom = symptoms[0];
    const initialNodes: PropagationNodePos[] = [
      {
        id: 'node-root',
        label: faultName || '故障根因',
        type: 'fault',
        x: 40,
        y: 120,
        device_type: firstSymptom?.device_type || 'transformer',
        device_name: firstSymptom?.device_name || '主设备根因源',
        symptom_name: faultName || '故障初发征兆',
      },
    ];

    // Build nodes from propagation chain if available
    const nodeMap = new Map<string, PropagationNodePos>();
    nodeMap.set(initialNodes[0].label, initialNodes[0]);

    propagationChain.forEach((step, idx) => {
      // Source node
      if (!nodeMap.has(step.from) && step.from !== initialNodes[0].label) {
        nodeMap.set(step.from, {
          id: `node-from-${idx}-${Date.now()}`,
          label: step.from,
          type: 'symptom',
          x: 280 + (idx % 2) * 50,
          y: 70 + idx * 130,
          device_type: step.from_device_type || 'other',
          device_name: step.from_device_name || '',
          symptom_name: step.from_symptom_name || step.from,
        });
      }
      // Target node
      if (!nodeMap.has(step.to)) {
        const isLast = idx === propagationChain.length - 1;
        nodeMap.set(step.to, {
          id: `node-to-${idx}-${Date.now()}`,
          label: step.to,
          type: isLast ? 'consequence' : 'symptom',
          x: 560 + (idx % 2) * 40,
          y: 80 + idx * 130,
          device_type: step.to_device_type || 'other',
          device_name: step.to_device_name || '',
          symptom_name: step.to_symptom_name || step.to,
        });
      }
    });

    return Array.from(nodeMap.values());
  };

  // Nodes state
  const [nodes, setNodes] = useState<PropagationNodePos[]>(buildInitialNodes);

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

    // If currently connecting
    if (connectingFromId) {
      if (connectingFromId !== id) {
        const sourceNode = nodes.find((n) => n.id === connectingFromId);
        const targetNode = nodes.find((n) => n.id === id);
        if (sourceNode && targetNode) {
          setLinkDialog({
            show: true,
            fromLabel: sourceNode.label,
            toLabel: targetNode.label,
            fromDeviceType: sourceNode.device_type || 'other',
            fromDeviceName: sourceNode.device_name || sourceNode.label,
            fromSymptomName: sourceNode.symptom_name || sourceNode.label,
            toDeviceType: targetNode.device_type || 'other',
            toDeviceName: targetNode.device_name || targetNode.label,
            toSymptomName: targetNode.symptom_name || targetNode.label,
            timeWindow: '0-5min',
            probability: 0.95,
            description: `${sourceNode.device_name || getDeviceTypeLabel(sourceNode.device_type)} 异常导致 ${targetNode.device_name || getDeviceTypeLabel(targetNode.device_type)} 受累`,
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
        prev.map((n) =>
          n.id === draggingNodeId
            ? { ...n, x: Math.max(10, newX), y: Math.max(10, newY) }
            : n
        )
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

  const handleStartPan = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      panStart.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
      setConnectingFromId(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  // Add a new node
  const handleAddNode = (type: 'symptom' | 'intermediate' | 'consequence' = 'symptom') => {
    const nextIdx = nodes.length + 1;
    let label = `监测异常指标 ${nextIdx}`;
    let defaultDev: DeviceTypeCategory = 'transformer';
    let defaultDevName = '受累设备';
    if (type === 'consequence') {
      label = `保护跳闸动作 ${nextIdx}`;
      defaultDev = 'switchgear';
      defaultDevName = '保护与开关回路';
    }

    const newNode: PropagationNodePos = {
      id: `node-${Date.now()}`,
      label,
      type,
      device_type: defaultDev,
      device_name: defaultDevName,
      symptom_name: label,
      x: 260 + (nodes.length % 3) * 80,
      y: 80 + (nodes.length % 4) * 80,
    };

    const updated = [...nodes, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    onUpdateChain(propagationChain, updated);
  };

  // Import defined symptoms from Fault Symptoms Table as Nodes
  const handleImportSymptomsAsNodes = () => {
    if (!symptoms || symptoms.length === 0) return;

    const existingLabels = new Set(nodes.map((n) => n.label));
    const newNodesToAdd: PropagationNodePos[] = [];

    symptoms.forEach((sym, idx) => {
      const label = sym.metric_name || `指标 ${sym.metric_code}`;
      if (!existingLabels.has(label)) {
        newNodesToAdd.push({
          id: `sym-node-${sym.id}-${idx}`,
          label,
          type: 'symptom',
          device_type: sym.device_type || 'other',
          device_name: sym.device_name || getDeviceTypeLabel(sym.device_type),
          symptom_name: `${sym.metric_name} (${sym.direction === 'up' ? '升高' : sym.direction === 'down' ? '骤降' : '异常'})`,
          x: 260 + (idx % 3) * 90,
          y: 70 + idx * 100,
        });
      }
    });

    if (newNodesToAdd.length > 0) {
      const updated = [...nodes, ...newNodesToAdd];
      setNodes(updated);
      onUpdateChain(propagationChain, updated);
    }
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

  // Open link dialog for existing edge
  const handleEditEdge = (step: PropagationStep) => {
    const sourceNode = nodes.find((n) => n.label === step.from);
    const targetNode = nodes.find((n) => n.label === step.to);

    setLinkDialog({
      show: true,
      stepId: step.id,
      fromLabel: step.from,
      toLabel: step.to,
      fromDeviceType: step.from_device_type || sourceNode?.device_type || 'other',
      fromDeviceName: step.from_device_name || sourceNode?.device_name || step.from,
      fromSymptomName: step.from_symptom_name || sourceNode?.symptom_name || step.from,
      toDeviceType: step.to_device_type || targetNode?.device_type || 'other',
      toDeviceName: step.to_device_name || targetNode?.device_name || step.to,
      toSymptomName: step.to_symptom_name || targetNode?.symptom_name || step.to,
      timeWindow: step.time_window || '0-5min',
      probability: step.probability ?? 0.95,
      description: step.description || '',
    });
  };

  // Confirm or update causal link
  const handleConfirmLink = () => {
    if (!linkDialog) return;

    let updatedChain: PropagationStep[];

    if (linkDialog.stepId) {
      // Update existing step
      updatedChain = propagationChain.map((p) =>
        p.id === linkDialog.stepId
          ? {
              ...p,
              from: linkDialog.fromLabel,
              to: linkDialog.toLabel,
              from_device_type: linkDialog.fromDeviceType,
              from_device_name: linkDialog.fromDeviceName,
              from_symptom_name: linkDialog.fromSymptomName,
              to_device_type: linkDialog.toDeviceType,
              to_device_name: linkDialog.toDeviceName,
              to_symptom_name: linkDialog.toSymptomName,
              time_window: linkDialog.timeWindow,
              probability: linkDialog.probability,
              description: linkDialog.description,
            }
          : p
      );
    } else {
      // Create new step
      const newStep: PropagationStep = {
        id: `PROP-${Date.now()}`,
        from: linkDialog.fromLabel,
        to: linkDialog.toLabel,
        from_device_type: linkDialog.fromDeviceType,
        from_device_name: linkDialog.fromDeviceName,
        from_symptom_name: linkDialog.fromSymptomName,
        to_device_type: linkDialog.toDeviceType,
        to_device_name: linkDialog.toDeviceName,
        to_symptom_name: linkDialog.toSymptomName,
        time_window: linkDialog.timeWindow,
        probability: linkDialog.probability,
        description: linkDialog.description,
      };
      updatedChain = [...propagationChain, newStep];
    }

    // Also synchronize nodes device and symptom if they match
    const updatedNodes = nodes.map((n) => {
      if (n.label === linkDialog.fromLabel) {
        return {
          ...n,
          device_type: linkDialog.fromDeviceType,
          device_name: linkDialog.fromDeviceName,
          symptom_name: linkDialog.fromSymptomName,
        };
      }
      if (n.label === linkDialog.toLabel) {
        return {
          ...n,
          device_type: linkDialog.toDeviceType,
          device_name: linkDialog.toDeviceName,
          symptom_name: linkDialog.toSymptomName,
        };
      }
      return n;
    });

    setNodes(updatedNodes);
    onUpdateChain(updatedChain, updatedNodes);
    setLinkDialog(null);
  };

  const handleDeleteEdge = (id: string) => {
    const updated = propagationChain.filter((p) => p.id !== id);
    onUpdateChain(updated, nodes);
    setSelectedEdgeId(null);
  };

  // Open node dialog
  const handleOpenNodeDialog = (node: PropagationNodePos) => {
    setNodeDialog({
      show: true,
      nodeId: node.id,
      label: node.label,
      type: node.type,
      device_type: node.device_type || 'other',
      device_name: node.device_name || node.label,
      symptom_name: node.symptom_name || node.label,
    });
  };

  // Save node dialog
  const handleSaveNodeDialog = () => {
    if (!nodeDialog) return;

    const oldNode = nodes.find((n) => n.id === nodeDialog.nodeId);
    if (!oldNode) return;

    const newLabel = nodeDialog.label.trim() || oldNode.label;

    const updatedNodes = nodes.map((n) =>
      n.id === nodeDialog.nodeId
        ? {
            ...n,
            label: newLabel,
            type: nodeDialog.type,
            device_type: nodeDialog.device_type,
            device_name: nodeDialog.device_name,
            symptom_name: nodeDialog.symptom_name,
          }
        : n
    );

    // If label changed, update propagationChain references
    let updatedChain = propagationChain;
    if (oldNode.label !== newLabel) {
      updatedChain = propagationChain.map((p) => ({
        ...p,
        from: p.from === oldNode.label ? newLabel : p.from,
        to: p.to === oldNode.label ? newLabel : p.to,
        from_device_type:
          p.from === oldNode.label ? nodeDialog.device_type : p.from_device_type,
        from_device_name:
          p.from === oldNode.label ? nodeDialog.device_name : p.from_device_name,
        from_symptom_name:
          p.from === oldNode.label ? nodeDialog.symptom_name : p.from_symptom_name,
        to_device_type:
          p.to === oldNode.label ? nodeDialog.device_type : p.to_device_type,
        to_device_name:
          p.to === oldNode.label ? nodeDialog.device_name : p.to_device_name,
        to_symptom_name:
          p.to === oldNode.label ? nodeDialog.symptom_name : p.to_symptom_name,
      }));
    }

    setNodes(updatedNodes);
    onUpdateChain(updatedChain, updatedNodes);
    setNodeDialog(null);
  };

  const handleResetLayout = () => {
    const arranged = nodes.map((node, i) => {
      if (node.type === 'fault') return { ...node, x: 40, y: 140 };
      return {
        ...node,
        x: 300 + ((i - 1) % 2) * 260,
        y: 60 + Math.floor((i - 1) / 2) * 130,
      };
    });
    setNodes(arranged);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    onUpdateChain(propagationChain, arranged);
  };

  // Node dimension constants
  const NODE_WIDTH = 210;
  const NODE_HEIGHT = 76;

  return (
    <div className="space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
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
              <span>拓扑演变画布</span>
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
              <span>因果链明细 ({propagationChain.length} 段)</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />

          {/* Quick Node Creator buttons */}
          <button
            onClick={() => handleAddNode('symptom')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs border border-slate-200 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ 异常症状节点</span>
          </button>

          <button
            onClick={() => handleAddNode('consequence')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs border border-slate-200 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ 保护跳闸动作</span>
          </button>

          {symptoms && symptoms.length > 0 && (
            <button
              onClick={handleImportSymptomsAsNodes}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs border border-emerald-200 shadow-xs transition"
              title="将特征症状库中已配置的设备与指标一键同步至画布节点"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>一键同步已定义特征</span>
            </button>
          )}

          <button
            onClick={() => {
              if (nodes.length >= 2) {
                const src = nodes[0];
                const dst = nodes[1];
                setLinkDialog({
                  show: true,
                  fromLabel: src.label,
                  toLabel: dst.label,
                  fromDeviceType: src.device_type || 'other',
                  fromDeviceName: src.device_name || src.label,
                  fromSymptomName: src.symptom_name || src.label,
                  toDeviceType: dst.device_type || 'other',
                  toDeviceName: dst.device_name || dst.label,
                  toSymptomName: dst.symptom_name || dst.label,
                  timeWindow: '0-5min',
                  probability: 0.95,
                  description: `${src.device_name || getDeviceTypeLabel(src.device_type)} 异常导致 ${dst.device_name || getDeviceTypeLabel(dst.device_type)} 受累`,
                });
              } else {
                handleAddNode('symptom');
              }
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>+ 建立传播因果关系</span>
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
            <span className="w-10 text-center font-mono text-[11px] text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
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
          className="relative w-full h-[490px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-crosshair select-none shadow-inner"
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
            <svg className="absolute inset-0 w-[2400px] h-[2400px] pointer-events-none z-0">
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
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
                </marker>
              </defs>

              {propagationChain.map((step) => {
                const sourceNode = nodes.find((n) => n.label === step.from);
                const targetNode = nodes.find((n) => n.label === step.to);
                if (!sourceNode || !targetNode) return null;

                const x1 = sourceNode.x + NODE_WIDTH / 2;
                const y1 = sourceNode.y + NODE_HEIGHT / 2;
                const x2 = targetNode.x + NODE_WIDTH / 2;
                const y2 = targetNode.y + NODE_HEIGHT / 2;

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
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleEditEdge(step);
                    }}
                  >
                    {/* Wide transparent hover area */}
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx * 0.45} ${y1}, ${x2 - dx * 0.45} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                    />
                    {/* Main connector curve */}
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx * 0.45} ${y1}, ${x2 - dx * 0.45} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isSelected ? '#d97706' : '#64748b'}
                      strokeWidth={isSelected ? '3' : '2'}
                      strokeDasharray={step.probability && step.probability < 0.8 ? '5,5' : 'none'}
                      markerEnd={isSelected ? 'url(#arrow-amber)' : 'url(#arrow-dark)'}
                      className="group-hover:stroke-slate-900 transition"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Edge Interactive Badges (A设备 a症状 ➔ B设备 b症状) */}
            {propagationChain.map((step) => {
              const sourceNode = nodes.find((n) => n.label === step.from);
              const targetNode = nodes.find((n) => n.label === step.to);
              if (!sourceNode || !targetNode) return null;

              const x1 = sourceNode.x + NODE_WIDTH / 2;
              const y1 = sourceNode.y + NODE_HEIGHT / 2;
              const x2 = targetNode.x + NODE_WIDTH / 2;
              const y2 = targetNode.y + NODE_HEIGHT / 2;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const isSelected = selectedEdgeId === step.id;

              return (
                <div
                  key={`badge-${step.id}`}
                  style={{ left: midX - 60, top: midY - 14 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(step.id);
                  }}
                  className={`absolute z-10 flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] cursor-pointer transition shadow-sm ${
                    isSelected
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 ring-2 ring-amber-400 scale-105'
                      : 'bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title={`${step.from} 导致 ${step.to} (${step.time_window || '5min'})\n双击编辑此因果传导属性`}
                >
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span className="font-mono font-medium">{step.time_window || '5min'}</span>
                  {step.probability && (
                    <span className="text-slate-400 text-[9px]">
                      ({Math.round(step.probability * 100)}%)
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEdge(step);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-800 ml-1"
                    title="编辑此传导关系"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>

                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEdge(step.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                      title="删除此传导连接"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Draggable HTML Nodes with Device Type Header & Symptom Body */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectingFromId === node.id;

              const style = getDeviceTypeStyle(node.device_type);
              const devLabel = getDeviceTypeLabel(node.device_type);

              let roleBadge = '特征症状';
              let roleColor = 'bg-slate-100 text-slate-700 border-slate-200';

              if (node.type === 'fault') {
                roleBadge = '根因触发';
                roleColor = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (node.type === 'consequence') {
                roleBadge = '保护后果';
                roleColor = 'bg-slate-200 text-slate-800 border-slate-300';
              } else if (node.type === 'intermediate') {
                roleBadge = '传导阶段';
                roleColor = 'bg-amber-50 text-amber-800 border-amber-200';
              }

              return (
                <div
                  key={node.id}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${NODE_WIDTH}px`,
                  }}
                  onMouseDown={(e) => handleMouseDownNode(node.id, e)}
                  className={`absolute z-20 rounded-xl border bg-white shadow-xs cursor-grab active:cursor-grabbing transition-all overflow-hidden ${
                    isSelected ? 'ring-2 ring-slate-900 shadow-md' : 'border-slate-200 hover:border-slate-400'
                  } ${isConnecting ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
                >
                  {/* Top Device Banner */}
                  <div
                    className={`px-2.5 py-1 border-b flex items-center justify-between text-[10px] ${style.bg} ${style.border}`}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                      <span className="font-bold text-slate-900 truncate">
                        [{devLabel}] {node.device_name || ''}
                      </span>
                    </div>

                    <div className="flex items-center space-x-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectingFromId(connectingFromId === node.id ? null : node.id);
                        }}
                        className={`p-1 rounded text-slate-500 hover:text-slate-900 transition ${
                          isConnecting ? 'bg-amber-500 text-white' : 'hover:bg-white/60'
                        }`}
                        title="点击此按钮，再点击目标节点建立传导箭头"
                      >
                        <LinkIcon className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNodeDialog(node);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-white/60 transition"
                        title="配置此节点的设备类型与特征症状"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>

                      {node.type !== 'fault' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white/60 transition"
                          title="删除此节点"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Symptom / Event Content */}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${roleColor}`}>
                        {roleBadge}
                      </span>
                    </div>

                    <div
                      className="text-xs font-semibold text-slate-900 truncate cursor-pointer hover:text-slate-700"
                      title={node.symptom_name || node.label}
                      onClick={() => handleOpenNodeDialog(node)}
                    >
                      {node.symptom_name || node.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Help & Status Overlay */}
          <div className="absolute bottom-2 left-2 z-30 pointer-events-none">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-[11px] text-slate-600 backdrop-blur shadow-xs">
              <span className="font-semibold text-slate-800">因果链操作提示:</span>
              <span>拖拽节点移动位置；点击节点 🔗 按钮再点击目标节点可快速建立"A设备a症状 ➔ B设备b症状"传导</span>
            </div>
          </div>
        </div>
      ) : (
        /* View 2: List / Table View of Structured Propagation Steps */
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                故障因果传播链 (A设备 a症状 ──▶ B设备 b症状)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                严密记录设备间跨机理的失效扩散路径，为 DiagnosGraph 诊断引擎提供反向根因追溯凭据
              </p>
            </div>

            <button
              onClick={() => {
                if (nodes.length >= 2) {
                  const src = nodes[0];
                  const dst = nodes[1];
                  setLinkDialog({
                    show: true,
                    fromLabel: src.label,
                    toLabel: dst.label,
                    fromDeviceType: src.device_type || 'other',
                    fromDeviceName: src.device_name || src.label,
                    fromSymptomName: src.symptom_name || src.label,
                    toDeviceType: dst.device_type || 'other',
                    toDeviceName: dst.device_name || dst.label,
                    toSymptomName: dst.symptom_name || dst.label,
                    timeWindow: '0-5min',
                    probability: 0.95,
                    description: '',
                  });
                } else {
                  handleAddNode('symptom');
                }
              }}
              className="text-xs text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 shadow-xs self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加传播因果步骤</span>
            </button>
          </div>

          <div className="space-y-3">
            {propagationChain.map((step, idx) => {
              const fromStyle = getDeviceTypeStyle(step.from_device_type);
              const toStyle = getDeviceTypeStyle(step.to_device_type);

              return (
                <div
                  key={step.id}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:bg-slate-50 transition space-y-2.5"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    {/* Source Device & Symptom (A设备 a症状) */}
                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">
                          {idx + 1}A
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${fromStyle.badgeBg}`}
                        >
                          {getDeviceTypeLabel(step.from_device_type)}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {step.from_device_name || step.from}
                        </span>
                      </div>
                      <div className="text-slate-700 text-xs pl-6 flex items-center space-x-1">
                        <span className="text-slate-400 text-[11px]">原因症状:</span>
                        <span className="font-semibold text-slate-900">
                          {step.from_symptom_name || step.from}
                        </span>
                      </div>
                    </div>

                    {/* Causal Link with Timing, Probability & Mechanism */}
                    <div className="flex flex-col items-center justify-center px-2 py-1 shrink-0 space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-600 text-xs font-mono">
                        <span className="text-slate-400">────▶</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-900 text-[11px] shadow-xs">
                          {step.time_window || '0-5min'}
                        </span>
                        <span className="text-slate-400">────▶</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        发生概率: {Math.round((step.probability ?? 0.95) * 100)}%
                      </span>
                    </div>

                    {/* Target Device & Symptom (B设备 b症状) */}
                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">
                          {idx + 1}B
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${toStyle.badgeBg}`}
                        >
                          {getDeviceTypeLabel(step.to_device_type)}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {step.to_device_name || step.to}
                        </span>
                      </div>
                      <div className="text-slate-700 text-xs pl-6 flex items-center space-x-1">
                        <span className="text-slate-400 text-[11px]">诱发症状:</span>
                        <span className="font-semibold text-slate-900">
                          {step.to_symptom_name || step.to}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleEditEdge(step)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                        title="编辑此传导关系"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEdge(step.id)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                        title="删除此步骤"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mechanism description line */}
                  {step.description && (
                    <div className="text-[11px] text-slate-600 bg-white/80 px-3 py-1.5 rounded-md border border-slate-200 flex items-center space-x-1.5">
                      <span className="font-medium text-slate-500">机理释义:</span>
                      <span>{step.description}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {propagationChain.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                <p>暂未定义设备间的因果传播链</p>
                <p className="text-[11px] text-slate-400">
                  可切换至画布建立节点连线，或点击右上角 "+ 添加传播因果步骤"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Link Configuration Modal (A设备 a症状 ➔ B设备 b症状) */}
      {linkDialog && linkDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <ArrowRight className="w-4 h-4 text-slate-800" />
                  <span>配置跨设备故障传播因果 (A设备 a症状 ➔ B设备 b症状)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  建立精准的设备级因果链与传播时间窗口
                </p>
              </div>
              <button
                onClick={() => setLinkDialog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              {/* Row 1: Source (A设备 a症状) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                      A
                    </span>
                    <span>原因端 (Source Device & Symptom)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      A 所属设备类型
                    </label>
                    <select
                      value={linkDialog.fromDeviceType}
                      onChange={(e) => {
                        const val = e.target.value as DeviceTypeCategory;
                        const opt = DEVICE_TYPE_OPTIONS.find((o) => o.value === val);
                        setLinkDialog({
                          ...linkDialog,
                          fromDeviceType: val,
                          fromDeviceName: linkDialog.fromDeviceName || opt?.label || '',
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                    >
                      {DEVICE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      A 具体设备名称
                    </label>
                    <input
                      type="text"
                      value={linkDialog.fromDeviceName}
                      onChange={(e) =>
                        setLinkDialog({ ...linkDialog, fromDeviceName: e.target.value })
                      }
                      placeholder="如: 主变冷却水泵 Pump-01"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    a 特征异常症状描述
                  </label>
                  <input
                    type="text"
                    value={linkDialog.fromSymptomName}
                    onChange={(e) =>
                      setLinkDialog({
                        ...linkDialog,
                        fromSymptomName: e.target.value,
                        fromLabel: e.target.value,
                      })
                    }
                    placeholder="如: 冷却回路流量骤降为 0 L/min"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Transmission Dynamics (Time Window, Probability, Mechanism) */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>传导规律与演化时延 (Transmission Dynamics)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      传播演进时间窗口 (time_window)
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {['0-2min', '0-5min', '5-15min', '15-30min', '1-4h'].map((tw) => (
                        <button
                          key={tw}
                          type="button"
                          onClick={() => setLinkDialog({ ...linkDialog, timeWindow: tw })}
                          className={`px-2 py-0.5 rounded text-[10px] border transition ${
                            linkDialog.timeWindow === tw
                              ? 'bg-slate-900 border-slate-900 text-white font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {tw}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={linkDialog.timeWindow}
                      onChange={(e) =>
                        setLinkDialog({ ...linkDialog, timeWindow: e.target.value })
                      }
                      placeholder="如: 0-5min"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      条件发生概率: {Math.round(linkDialog.probability * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={linkDialog.probability}
                      onChange={(e) =>
                        setLinkDialog({
                          ...linkDialog,
                          probability: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-slate-900 mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    传导物理机理 / 专家归因释义 (description)
                  </label>
                  <input
                    type="text"
                    value={linkDialog.description}
                    onChange={(e) =>
                      setLinkDialog({ ...linkDialog, description: e.target.value })
                    }
                    placeholder="如: 强油风冷水泵停转导致对流中断，变压器线圈热量快速蓄积"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Row 3: Target (B设备 b症状) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                      B
                    </span>
                    <span>后果端 (Target Device & Induced Symptom)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      B 所属设备类型
                    </label>
                    <select
                      value={linkDialog.toDeviceType}
                      onChange={(e) => {
                        const val = e.target.value as DeviceTypeCategory;
                        const opt = DEVICE_TYPE_OPTIONS.find((o) => o.value === val);
                        setLinkDialog({
                          ...linkDialog,
                          toDeviceType: val,
                          toDeviceName: linkDialog.toDeviceName || opt?.label || '',
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                    >
                      {DEVICE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      B 具体设备名称
                    </label>
                    <input
                      type="text"
                      value={linkDialog.toDeviceName}
                      onChange={(e) =>
                        setLinkDialog({ ...linkDialog, toDeviceName: e.target.value })
                      }
                      placeholder="如: 储能主变压器"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    b 诱发异常症状或保护动作描述
                  </label>
                  <input
                    type="text"
                    value={linkDialog.toSymptomName}
                    onChange={(e) =>
                      setLinkDialog({
                        ...linkDialog,
                        toSymptomName: e.target.value,
                        toLabel: e.target.value,
                      })
                    }
                    placeholder="如: 主变顶层油温突破 85°C 告警"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                确定后将更新拓扑画布与时序因果链路
              </span>
              <div className="flex space-x-2">
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
                  保存因果传导关系
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Node Attribute Dialog */}
      {nodeDialog && nodeDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Edit2 className="w-4 h-4 text-slate-800" />
                  <span>配置节点设备与症状属性</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  设定此节点在传播拓扑中的设备归属与异常参数
                </p>
              </div>
              <button
                onClick={() => setNodeDialog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  节点在故障链中的角色
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 'symptom', label: '特征症状' },
                    { val: 'intermediate', label: '传导阶段' },
                    { val: 'consequence', label: '保护后果' },
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setNodeDialog({ ...nodeDialog, type: r.val as any })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition ${
                        nodeDialog.type === r.val
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  所属设备类型 (Device Type)
                </label>
                <select
                  value={nodeDialog.device_type}
                  onChange={(e) => {
                    const val = e.target.value as DeviceTypeCategory;
                    const opt = DEVICE_TYPE_OPTIONS.find((o) => o.value === val);
                    setNodeDialog({
                      ...nodeDialog,
                      device_type: val,
                      device_name: nodeDialog.device_name || opt?.label || '',
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                >
                  {DEVICE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  具体设备名称 (Device Name)
                </label>
                <input
                  type="text"
                  value={nodeDialog.device_name}
                  onChange={(e) =>
                    setNodeDialog({ ...nodeDialog, device_name: e.target.value })
                  }
                  placeholder="如: 主变冷却水泵 Pump-01"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  特征症状 / 动作描述 (Symptom / Event)
                </label>
                <input
                  type="text"
                  value={nodeDialog.symptom_name}
                  onChange={(e) =>
                    setNodeDialog({
                      ...nodeDialog,
                      symptom_name: e.target.value,
                      label: e.target.value,
                    })
                  }
                  placeholder="如: 冷却回路流量骤降为 0 L/min"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
                />
              </div>

              {/* Select from existing symptoms */}
              {symptoms && symptoms.length > 0 && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    或从已配置特征症状中快速填充:
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {symptoms.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setNodeDialog({
                            ...nodeDialog,
                            device_type: s.device_type || 'other',
                            device_name: s.device_name || getDeviceTypeLabel(s.device_type),
                            symptom_name: s.metric_name,
                            label: s.metric_name,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 border border-slate-200"
                      >
                        [{getDeviceTypeLabel(s.device_type)}] {s.metric_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setNodeDialog(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveNodeDialog}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
