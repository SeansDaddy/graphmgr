import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SeverityLevel, DeviceNode, FaultPattern } from '../types';
import {
  GitFork,
  Layers,
  AlertOctagon,
  Maximize2,
  Minimize2,
  RotateCcw,
  ExternalLink,
  Search,
  FlaskConical,
  Activity,
  Zap,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Move,
  Sparkles,
} from 'lucide-react';

export const GlobalNetworkGraph: React.FC<{
  embedded?: boolean;
}> = ({ embedded = false }) => {
  const { devices, faults, openFaultEditor, openDeviceInBom, setSelectedFaultId, setActiveTab } = useApp();
  
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showHierarchyLinks, setShowHierarchyLinks] = useState<boolean>(true);
  const [showFaultLinks, setShowFaultLinks] = useState<boolean>(true);
  const [showPropagationLinks, setShowPropagationLinks] = useState<boolean>(true);

  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    type: 'device' | 'fault';
    data: any;
  } | null>(null);

  // Viewport zoom and pan
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 50, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Custom user-dragged node coordinates: { [nodeId]: { x, y } }
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initNodeX: number; initNodeY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Global mouseup release to ensure drag terminates cleanly
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingNodeId) {
        setDraggingNodeId(null);
        dragStartRef.current = null;
      }
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggingNodeId]);

  // Subsystems derived dynamically from device categories
  const subsystems = useMemo(() => {
    const categories = Array.from(new Set(devices.map((d) => d.category).filter(Boolean)));
    return [
      { id: 'ALL', label: '全电站综合图谱' },
      ...categories.map((c) => ({ id: c, label: c })),
    ];
  }, [devices]);

  // Compute collision-free base layout
  const { baseGraphNodes, graphLinks, stats } = useMemo(() => {
    const nodes: Array<{
      id: string;
      label: string;
      subLabel?: string;
      type: 'device' | 'fault';
      severity?: SeverityLevel;
      x: number;
      y: number;
      parentId?: string | null;
      original: any;
      matchedSearch: boolean;
    }> = [];

    const links: Array<{
      source: string;
      target: string;
      label?: string;
      type: 'hierarchy' | 'fault_link' | 'propagation';
    }> = [];

    // Filter devices based on subsystem selection
    const filteredDevs =
      selectedSubsystem === 'ALL'
        ? devices
        : devices.filter(
            (d) =>
              d.category === selectedSubsystem ||
              d.id === selectedSubsystem ||
              d.parent_id === selectedSubsystem ||
              devices.find((p) => p.id === d.parent_id)?.category === selectedSubsystem
          );

    const devIdSet = new Set(filteredDevs.map((d) => d.id));

    // Group devices by category into spacious, dedicated column lanes
    const categoryGroups = new Map<string, DeviceNode[]>();
    filteredDevs.forEach((dev) => {
      const cat = dev.category || '通用辅助系统';
      if (!categoryGroups.has(cat)) {
        categoryGroups.set(cat, []);
      }
      categoryGroups.get(cat)!.push(dev);
    });

    // Subsystem lane layout constants
    const LANE_GAP = 50;
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 74;
    const MIN_HORIZ_GAP = 220;
    const MIN_VERT_GAP = 100;

    let currentLaneX = 60;

    // Track which faults have been placed under their respective device category
    const placedFaultIdSet = new Set<string>();

    categoryGroups.forEach((groupDevs, categoryName) => {
      // Find root devices (parent is null or parent not in this category)
      const roots = groupDevs.filter(
        (d) => !d.parent_id || !groupDevs.some((other) => other.id === d.parent_id)
      );
      const subDevices = groupDevs.filter((d) => !roots.some((r) => r.id === d.id));

      // Find faults affected by devices in this category
      const groupDeviceIds = new Set(groupDevs.map((d) => d.id));
      const groupFaults = faults.filter((f) => {
        const matchSev = severityFilter === 'ALL' || f.severity === severityFilter;
        if (!matchSev) return false;
        return f.affected_devices.some((did) => groupDeviceIds.has(did));
      });

      // Calculate how wide this column lane needs to be
      const maxColItems = Math.max(
        roots.length,
        Math.ceil(subDevices.length / 2),
        Math.ceil(groupFaults.length / 2),
        1
      );
      const laneWidth = Math.max(480, maxColItems * MIN_HORIZ_GAP);

      // 1. Place Root Devices at Tier 1 (y = 80)
      roots.forEach((rootDev, rIdx) => {
        const x = currentLaneX + rIdx * MIN_HORIZ_GAP + 20;
        const y = 80;

        const isMatched =
          Boolean(searchTerm) &&
          (rootDev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rootDev.id.toLowerCase().includes(searchTerm.toLowerCase()));

        nodes.push({
          id: rootDev.id,
          label: rootDev.name,
          subLabel: rootDev.device_type,
          type: 'device',
          x,
          y,
          parentId: rootDev.parent_id,
          original: rootDev,
          matchedSearch: isMatched,
        });
      });

      // 2. Place Sub-devices at Tier 2 (y = 210, 320)
      subDevices.forEach((subDev, sIdx) => {
        const col = sIdx % 2;
        const row = Math.floor(sIdx / 2);
        const x = currentLaneX + col * MIN_HORIZ_GAP + 20;
        const y = 210 + row * 110;

        const isMatched =
          Boolean(searchTerm) &&
          (subDev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subDev.id.toLowerCase().includes(searchTerm.toLowerCase()));

        nodes.push({
          id: subDev.id,
          label: subDev.name,
          subLabel: subDev.device_type,
          type: 'device',
          x,
          y,
          parentId: subDev.parent_id,
          original: subDev,
          matchedSearch: isMatched,
        });

        if (subDev.parent_id && devIdSet.has(subDev.parent_id)) {
          links.push({
            source: subDev.parent_id,
            target: subDev.id,
            type: 'hierarchy',
            label: '挂载拓扑',
          });
        }
      });

      // 3. Place Faults associated with this category at Tier 3 (y = 480, 590, 700...)
      const subDevRows = Math.ceil(subDevices.length / 2);
      const faultBaseY = 210 + subDevRows * 110 + 40;

      groupFaults.forEach((fault, fIdx) => {
        placedFaultIdSet.add(fault.id);
        const col = fIdx % 2;
        const row = Math.floor(fIdx / 2);
        const x = currentLaneX + col * MIN_HORIZ_GAP + 20;
        const y = faultBaseY + row * 115;

        const faultNodeId = `F_NODE_${fault.id}`;
        const isMatched =
          Boolean(searchTerm) &&
          (fault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fault.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fault.root_cause?.toLowerCase().includes(searchTerm.toLowerCase()));

        nodes.push({
          id: faultNodeId,
          label: fault.name,
          subLabel: `${fault.symptoms?.length || 0} 项特征指标`,
          type: 'fault',
          severity: fault.severity,
          x,
          y,
          original: fault,
          matchedSearch: isMatched,
        });

        // Link affected devices in this category
        fault.affected_devices.forEach((did) => {
          if (groupDeviceIds.has(did)) {
            links.push({
              source: did,
              target: faultNodeId,
              label: '故障诱因',
              type: 'fault_link',
            });
          }
        });
      });

      // Advance lane X position
      currentLaneX += laneWidth + LANE_GAP;
    });

    // 4. Place remaining unassigned or cross-system faults in a dedicated column lane
    const remainingFaults = faults.filter((f) => {
      const matchSev = severityFilter === 'ALL' || f.severity === severityFilter;
      return matchSev && !placedFaultIdSet.has(f.id);
    });

    if (remainingFaults.length > 0) {
      remainingFaults.forEach((fault, fIdx) => {
        const col = fIdx % 2;
        const row = Math.floor(fIdx / 2);
        const x = currentLaneX + col * MIN_HORIZ_GAP + 20;
        const y = 140 + row * 115;

        const faultNodeId = `F_NODE_${fault.id}`;
        const isMatched =
          Boolean(searchTerm) &&
          (fault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fault.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fault.root_cause?.toLowerCase().includes(searchTerm.toLowerCase()));

        nodes.push({
          id: faultNodeId,
          label: fault.name,
          subLabel: `${fault.symptoms?.length || 0} 项特征指标`,
          type: 'fault',
          severity: fault.severity,
          x,
          y,
          original: fault,
          matchedSearch: isMatched,
        });

        fault.affected_devices.forEach((did) => {
          if (devIdSet.has(did)) {
            links.push({
              source: did,
              target: faultNodeId,
              label: '故障诱因',
              type: 'fault_link',
            });
          }
        });
      });
      currentLaneX += MIN_HORIZ_GAP * 2 + LANE_GAP;
    }

    // 5. Add propagation chain links
    let totalPropChains = 0;
    const nodeLookup = new Map(nodes.map((n) => [n.id, n]));

    faults.forEach((fault) => {
      const sourceFaultNodeId = `F_NODE_${fault.id}`;
      if (!nodeLookup.has(sourceFaultNodeId)) return;

      if (fault.propagation_chain && fault.propagation_chain.length > 0) {
        totalPropChains += fault.propagation_chain.length;
        fault.propagation_chain.forEach((step) => {
          const targetFault = faults.find(
            (f) => f.name.includes(step.to) || f.id === step.to || step.to.includes(f.name)
          );
          if (targetFault) {
            const targetFaultNodeId = `F_NODE_${targetFault.id}`;
            if (nodeLookup.has(targetFaultNodeId)) {
              links.push({
                source: sourceFaultNodeId,
                target: targetFaultNodeId,
                label: `${step.time_window || ''} 连锁演变`,
                type: 'propagation',
              });
            }
          }
        });
      }
    });

    // 6. Anti-Overlap Collision Resolution Pass (Guarantees zero overlap)
    const SAFE_DX = 210;
    const SAFE_DY = 95;
    for (let iter = 0; iter < 12; iter++) {
      let overlapFound = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (absDx < SAFE_DX && absDy < SAFE_DY) {
            overlapFound = true;
            // Push away along the axis with smaller overlap needed
            const pushY = SAFE_DY - absDy;
            const pushX = SAFE_DX - absDx;
            if (pushY <= pushX) {
              b.y += dy >= 0 ? pushY : -pushY;
            } else {
              b.x += dx >= 0 ? pushX : -pushX;
            }
          }
        }
      }
      if (!overlapFound) break;
    }

    return {
      baseGraphNodes: nodes,
      graphLinks: links,
      stats: {
        totalNodes: nodes.length,
        devicesCount: nodes.filter((n) => n.type === 'device').length,
        faultsCount: nodes.filter((n) => n.type === 'fault').length,
        linksCount: links.length,
        propChainsCount: totalPropChains,
      },
    };
  }, [devices, faults, selectedSubsystem, severityFilter, searchTerm]);

  // Combine base layout with user-dragged coordinates
  const graphNodes = useMemo(() => {
    return baseGraphNodes.map((node) => {
      const custom = customPositions[node.id];
      return {
        ...node,
        x: custom ? custom.x : node.x,
        y: custom ? custom.y : node.y,
      };
    });
  }, [baseGraphNodes, customPositions]);

  // Fast node lookup for links
  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof graphNodes)[0]>();
    graphNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graphNodes]);

  // Mouse pan handlers on canvas
  const handleStartPan = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  // Node Drag Start handler
  const handleMouseDownNode = (nodeId: string, nodeX: number, nodeY: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initNodeX: nodeX,
      initNodeY: nodeY,
    };
    hasDraggedRef.current = false;
    setDraggingNodeId(nodeId);
  };

  // Canvas Mouse Move handler (handles both node dragging & canvas panning)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId && dragStartRef.current) {
      const dx = (e.clientX - dragStartRef.current.clientX) / zoom;
      const dy = (e.clientY - dragStartRef.current.clientY) / zoom;
      if (Math.hypot(dx, dy) > 3) {
        hasDraggedRef.current = true;
      }
      const newX = Math.round(dragStartRef.current.initNodeX + dx);
      const newY = Math.round(dragStartRef.current.initNodeY + dy);
      setCustomPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY },
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    }
  };

  // Canvas Mouse Up handler
  const handleMouseUp = () => {
    if (draggingNodeId) {
      // If user simply clicked the node without dragging, select it
      if (!hasDraggedRef.current) {
        const targetNode = nodeMap.get(draggingNodeId);
        if (targetNode) {
          setSelectedNode({
            id: targetNode.id,
            type: targetNode.type,
            data: targetNode.original,
          });
        }
      }
      setDraggingNodeId(null);
      dragStartRef.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.max(0.35, Math.min(2.0, Number((prev + zoomDelta).toFixed(2)))));
  };

  // Reset view to default zoom & center
  const handleResetView = () => {
    setZoom(0.85);
    setPan({ x: 50, y: 30 });
  };

  // Auto-arrange layout (clear custom positions to restore zero-overlap base layout)
  const handleAutoLayout = () => {
    setCustomPositions({});
    setZoom(0.85);
    setPan({ x: 50, y: 30 });
  };

  const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    critical: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', dot: 'bg-rose-500' },
    high: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', dot: 'bg-amber-500' },
    medium: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-900', dot: 'bg-sky-500' },
    low: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-900', dot: 'bg-slate-400' },
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Subsystem Filtering */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {/* Left Subsystems Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {subsystems.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setSelectedSubsystem(sub.id);
                setCustomPositions({});
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSubsystem === sub.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>

        {/* Right Search & Severity Filter */}
        <div className="flex items-center space-x-3 flex-wrap sm:flex-nowrap">
          {/* Quick Node Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索图谱节点/机理..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 flex-shrink-0">
            <span className="font-medium text-slate-500">严重度:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
            >
              <option value="ALL">全部等级</option>
              <option value="critical">致命 (Critical)</option>
              <option value="high">严重 (High)</option>
              <option value="medium">中度 (Medium)</option>
              <option value="low">轻微 (Low)</option>
            </select>
          </div>

          {/* Link Toggles */}
          <div className="hidden xl:flex items-center space-x-2 text-[11px] text-slate-600 border-l border-slate-200 pl-3">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showHierarchyLinks}
                onChange={(e) => setShowHierarchyLinks(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>BOM拓扑</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showFaultLinks}
                onChange={(e) => setShowFaultLinks(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>故障因果</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showPropagationLinks}
                onChange={(e) => setShowPropagationLinks(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>传播演变</span>
            </label>
          </div>

          {/* Auto Layout Action Button */}
          <button
            onClick={handleAutoLayout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 shadow-2xs transition whitespace-nowrap"
            title="重新智能排版，消除重叠并恢复自动布局"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>整理布局</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative w-full h-[760px] bg-slate-900/5 rounded-2xl border border-slate-200 overflow-hidden shadow-inner select-none">
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Stats Pill Overlay Top Left */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2.5 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs text-slate-700">
          <div className="flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">全局图谱全景</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            设备 <b>{stats.devicesCount}</b>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">
            故障 <b>{stats.faultsCount}</b>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">
            连锁演变 <b>{stats.propChainsCount}</b>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline flex items-center space-x-1">
            <Move className="w-3 h-3 text-slate-400 inline mr-0.5" />
            <span>支持单独拖动节点排版</span>
          </span>
        </div>

        {/* Pan & Zoom Canvas Area */}
        <div
          onMouseDown={handleStartPan}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className={`absolute inset-0 ${
            draggingNodeId ? 'cursor-grabbing' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div
            className="absolute inset-0 transition-transform duration-75 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Connecting Links */}
            <svg className="absolute inset-0 w-[6000px] h-[6000px] pointer-events-none">
              <defs>
                {/* Arrow markers */}
                <marker
                  id="hierarchy-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="fault-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
                </marker>
                <marker
                  id="prop-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#e11d48" />
                </marker>
              </defs>

              {graphLinks.map((link, idx) => {
                if (link.type === 'hierarchy' && !showHierarchyLinks) return null;
                if (link.type === 'fault_link' && !showFaultLinks) return null;
                if (link.type === 'propagation' && !showPropagationLinks) return null;

                const sNode = nodeMap.get(link.source);
                const tNode = nodeMap.get(link.target);
                if (!sNode || !tNode) return null;

                const isFaultLink = link.type === 'fault_link';
                const isPropLink = link.type === 'propagation';

                const x1 = sNode.x + 100;
                const y1 = sNode.y + 36;
                const x2 = tNode.x + 100;
                const y2 = tNode.y + 36;

                const strokeColor = isPropLink ? '#f43f5e' : isFaultLink ? '#d97706' : '#cbd5e1';
                const markerEnd = isPropLink ? 'url(#prop-arrow)' : isFaultLink ? 'url(#fault-arrow)' : 'url(#hierarchy-arrow)';

                // Curved path for propagation evolution for enhanced clarity
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                const pathD = isPropLink
                  ? `M ${x1} ${y1} Q ${midX} ${midY - 25} ${x2} ${y2}`
                  : `M ${x1} ${y1} L ${x2} ${y2}`;

                return (
                  <g key={idx}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isPropLink ? 2.5 : isFaultLink ? 2 : 1.5}
                      strokeDasharray={isPropLink ? '6 3' : isFaultLink ? '4 3' : 'none'}
                      markerEnd={markerEnd}
                      className={isPropLink ? 'animate-pulse' : ''}
                    />
                    {link.label && (
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - (isPropLink ? 16 : 4)}
                        fill={isPropLink ? '#be123c' : isFaultLink ? '#92400e' : '#64748b'}
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                        className="font-mono bg-white px-1"
                      >
                        {link.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Graph Nodes (Draggable individually) */}
            {graphNodes.map((node, idx) => {
              const isSelected = selectedNode?.id === node.id;
              const isDraggingThis = draggingNodeId === node.id;
              const isDevice = node.type === 'device';
              const sev = node.severity ? SEVERITY_COLORS[node.severity] : SEVERITY_COLORS.high;

              return (
                <div
                  key={`${node.id}-${idx}`}
                  onMouseDown={(e) => handleMouseDownNode(node.id, node.x, node.y, e)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '200px',
                    zIndex: isDraggingThis ? 40 : isSelected ? 30 : 10,
                  }}
                  className={`absolute p-3 rounded-2xl border transition-shadow select-none ${
                    isDraggingThis
                      ? 'cursor-grabbing shadow-2xl ring-2 ring-slate-900 scale-105 bg-white'
                      : 'cursor-grab hover:shadow-md hover:border-slate-400'
                  } ${
                    isDevice
                      ? 'bg-white border-slate-200 text-slate-900'
                      : `${sev.bg} ${sev.border} ${sev.text}`
                  } ${isSelected ? 'ring-2 ring-slate-900 shadow-lg' : ''} ${
                    node.matchedSearch ? 'ring-2 ring-emerald-500 shadow-md' : ''
                  }`}
                >
                  {/* Node Top Bar: Type Icon, ID & Drag Indicator */}
                  <div className="flex items-center justify-between space-x-1.5 mb-1.5">
                    <div className="flex items-center space-x-1.5 truncate">
                      {isDevice ? (
                        <div className="p-1 rounded-lg bg-slate-100 text-slate-700">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-lg bg-amber-100 text-amber-800">
                          <AlertOctagon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="text-[10px] font-mono text-slate-500 font-bold truncate">
                        {node.original.id}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {!isDevice && node.original.status && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            node.original.status === 'draft'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {node.original.status === 'draft' ? '草稿' : '已发布'}
                        </span>
                      )}
                      <Move className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    </div>
                  </div>

                  {/* Node Title */}
                  <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {node.label}
                  </div>

                  {/* Subtitle / Specs */}
                  <div className="text-[10px] text-slate-500 mt-1 truncate">
                    {isDevice ? (
                      <span>{node.original.device_type}</span>
                    ) : (
                      <span className="flex items-center space-x-1 text-amber-800 font-medium">
                        <Activity className="w-3 h-3 text-amber-600" />
                        <span>{node.original.symptoms?.length || 0} 项特征指标</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Left Legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-xs text-xs space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">图谱图例</div>
          <div className="flex items-center space-x-2 text-slate-700">
            <span className="w-3 h-3 rounded bg-white border border-slate-300 shadow-2xs" />
            <span>设备 BOM 节点 (分层拓扑)</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-700">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            <span>故障模式节点 (机理特征)</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-700">
            <span className="w-4 h-0.5 bg-rose-500 border-dashed inline-block" />
            <span>连锁演变与跳闸传播链</span>
          </div>
        </div>

        {/* Canvas Zoom & Pan Controls Top Right */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-white/95 backdrop-blur-md border border-slate-200 p-1.5 rounded-2xl shadow-xs text-xs">
          <button
            onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            title="缩小"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-mono text-xs font-bold text-slate-800">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            title="放大"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition ml-1"
            title="复位视图 (居中)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Node Details Drawer / Popover Bottom Right */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 z-30 max-w-md w-full bg-white/98 border border-slate-200 rounded-2xl p-5 shadow-xl backdrop-blur-md text-xs space-y-3.5 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    {selectedNode.data.id}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                      selectedNode.type === 'fault'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {selectedNode.type === 'fault' ? '能源领域故障模式' : 'BOM 设备节点'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{selectedNode.data.name}</h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-700 p-1 text-sm rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Node Content */}
            {selectedNode.type === 'fault' ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">根因诱发机理:</div>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs line-clamp-3">
                    {selectedNode.data.root_cause || '暂无详细机理描述'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">严重度等级</span>
                    <span className="font-bold text-slate-900 uppercase">{selectedNode.data.severity}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">特征指标项</span>
                    <span className="font-bold text-slate-900">{selectedNode.data.symptoms?.length || 0} 个</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedFaultId(selectedNode.data.id);
                      setActiveTab('test-playground');
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-slate-600" />
                    <span>送入测试场</span>
                  </button>

                  <button
                    onClick={() => openFaultEditor(selectedNode.data.id)}
                    className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs transition"
                  >
                    <span>进入完整编辑</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">设备类型</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedNode.data.device_type}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">关联故障</span>
                    <span className="font-bold text-slate-900">{selectedNode.data.associated_fault_ids?.length || 0} 个</span>
                  </div>
                </div>

                {selectedNode.data.description && (
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    {selectedNode.data.description}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => openDeviceInBom(selectedNode.data.id)}
                    className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs transition"
                  >
                    <span>在设备 BOM 中定位</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
