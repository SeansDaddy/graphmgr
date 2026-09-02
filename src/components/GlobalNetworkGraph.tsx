import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SeverityLevel } from '../types';
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

  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Subsystems definition
  const subsystems = useMemo(() => {
    return [
      { id: 'ALL', label: '全电站综合图谱' },
      { id: 'D001', label: '主变压器系统 (HV)' },
      { id: 'D-PCS-01', label: 'PCS 变流系统 (PCS)' },
      { id: 'D-BMS-01', label: 'BMS 电池簇系统 (BMS)' },
      { id: 'D-FSS-01', label: '消防温控系统 (HVAC/FSS)' },
    ];
  }, []);

  // Compute graph nodes & links layout
  const { graphNodes, graphLinks, stats } = useMemo(() => {
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
              d.id === selectedSubsystem ||
              d.parent_id === selectedSubsystem ||
              devices.find((p) => p.id === d.parent_id)?.parent_id === selectedSubsystem
          );

    const devIdSet = new Set(filteredDevs.map((d) => d.id));

    // Position devices in organized hierarchical columns & rows
    // Level 0: Station Root (ESS-01)
    // Level 1: Subsystems (Transformer, PCS, BMS, FSS)
    // Level 2: Sub-devices (Pumps, Inverters, Racks, Detectors)
    const levelMap: Record<string, number> = {
      'ESS-01': 0,
      'D001': 1,
      'D-PCS-01': 1,
      'D-BMS-01': 1,
      'D-FSS-01': 1,
    };

    filteredDevs.forEach((dev, idx) => {
      let x = 160 + (idx % 4) * 260;
      let y = 100 + Math.floor(idx / 4) * 160;

      if (dev.id === 'ESS-01') {
        x = 520;
        y = 40;
      } else if (dev.id === 'D001') {
        x = 100;
        y = 160;
      } else if (dev.id === 'D-PCS-01') {
        x = 380;
        y = 160;
      } else if (dev.id === 'D-BMS-01') {
        x = 680;
        y = 160;
      } else if (dev.id === 'D-FSS-01') {
        x = 980;
        y = 160;
      } else if (dev.parent_id === 'D001') {
        x = 100 + (idx % 2) * 130;
        y = 300 + Math.floor(idx / 2) * 120;
      } else if (dev.parent_id === 'D-PCS-01') {
        x = 360 + (idx % 2) * 130;
        y = 300 + Math.floor(idx / 2) * 120;
      } else if (dev.parent_id === 'D-BMS-01') {
        x = 640 + (idx % 2) * 130;
        y = 300 + Math.floor(idx / 2) * 120;
      } else if (dev.parent_id === 'D-FSS-01') {
        x = 940 + (idx % 2) * 130;
        y = 300 + Math.floor(idx / 2) * 120;
      }

      const isMatched =
        Boolean(searchTerm) &&
        (dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dev.id.toLowerCase().includes(searchTerm.toLowerCase()));

      nodes.push({
        id: dev.id,
        label: dev.name,
        subLabel: dev.device_type,
        type: 'device',
        x,
        y,
        parentId: dev.parent_id,
        original: dev,
        matchedSearch: isMatched,
      });

      if (dev.parent_id && devIdSet.has(dev.parent_id)) {
        links.push({
          source: dev.parent_id,
          target: dev.id,
          type: 'hierarchy',
          label: '挂载拓扑',
        });
      }
    });

    // Place faults connected to devices
    let totalPropChains = 0;
    faults.forEach((fault, fIdx) => {
      const matchSev = severityFilter === 'ALL' || fault.severity === severityFilter;
      if (!matchSev) return;

      const isRelated = fault.affected_devices.some((did) => devIdSet.has(did));
      if (isRelated || selectedSubsystem === 'ALL') {
        const parentDev = devices.find((d) => fault.affected_devices.includes(d.id));
        const pNode = parentDev ? nodes.find((n) => n.id === parentDev.id) : null;
        const baseX = pNode ? pNode.x : 200 + (fIdx % 4) * 260;
        const baseY = pNode ? pNode.y + 110 : 450 + Math.floor(fIdx / 4) * 120;

        const faultNodeId = `F_NODE_${fault.id}`;
        const isMatched =
          Boolean(searchTerm) &&
          (fault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fault.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fault.root_cause.toLowerCase().includes(searchTerm.toLowerCase()));

        nodes.push({
          id: faultNodeId,
          label: fault.name,
          subLabel: `${fault.symptoms?.length || 0} 项特征指标`,
          type: 'fault',
          severity: fault.severity,
          x: baseX + (fIdx % 2 === 0 ? -45 : 45),
          y: baseY + (fIdx % 3) * 35,
          original: fault,
          matchedSearch: isMatched,
        });

        if (parentDev && devIdSet.has(parentDev.id)) {
          links.push({
            source: parentDev.id,
            target: faultNodeId,
            label: '故障诱因',
            type: 'fault_link',
          });
        }

        // Add propagation chain links
        if (fault.propagation_chain && fault.propagation_chain.length > 0) {
          totalPropChains += fault.propagation_chain.length;
          fault.propagation_chain.forEach((step) => {
            // Find target node if matches another fault or device
            const targetFault = faults.find(
              (f) => f.name.includes(step.to) || f.id === step.to || step.to.includes(f.name)
            );
            if (targetFault) {
              links.push({
                source: faultNodeId,
                target: `F_NODE_${targetFault.id}`,
                label: `${step.time_window || ''} 连锁演变`,
                type: 'propagation',
              });
            }
          });
        }
      }
    });

    return {
      graphNodes: nodes,
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

  // Pan handlers
  const handleStartPan = (e: React.MouseEvent) => {
    // Only pan if left clicked on canvas background
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleResetView = () => {
    setZoom(0.95);
    setPan({ x: 60, y: 40 });
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
              onClick={() => setSelectedSubsystem(sub.id)}
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
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative w-full h-[740px] bg-slate-900/5 rounded-2xl border border-slate-200 overflow-hidden shadow-inner select-none">
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Stats Pill Overlay Top Left */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs text-slate-700">
          <div className="flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">全局全景图谱</span>
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
            演变链 <b>{stats.propChainsCount}</b>
          </span>
        </div>

        {/* Pan & Zoom Canvas Area */}
        <div
          onMouseDown={handleStartPan}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <div
            className="absolute inset-0 transition-transform duration-75 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Connecting Links */}
            <svg className="absolute inset-0 w-[4000px] h-[4000px] pointer-events-none">
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

                const sNode = graphNodes.find((n) => n.id === link.source);
                const tNode = graphNodes.find((n) => n.id === link.target);
                if (!sNode || !tNode) return null;

                const isFaultLink = link.type === 'fault_link';
                const isPropLink = link.type === 'propagation';

                const x1 = sNode.x + 95;
                const y1 = sNode.y + 24;
                const x2 = tNode.x + 95;
                const y2 = tNode.y + 24;

                const strokeColor = isPropLink ? '#f43f5e' : isFaultLink ? '#d97706' : '#cbd5e1';
                const markerEnd = isPropLink ? 'url(#prop-arrow)' : isFaultLink ? 'url(#fault-arrow)' : 'url(#hierarchy-arrow)';

                return (
                  <g key={idx}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={strokeColor}
                      strokeWidth={isPropLink ? 2.5 : isFaultLink ? 2 : 1.5}
                      strokeDasharray={isPropLink ? '6 3' : isFaultLink ? '4 3' : 'none'}
                      markerEnd={markerEnd}
                      className={isPropLink ? 'animate-pulse' : ''}
                    />
                    {link.label && (
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 4}
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

            {/* Interactive Graph Nodes */}
            {graphNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isDevice = node.type === 'device';
              const sev = node.severity ? SEVERITY_COLORS[node.severity] : SEVERITY_COLORS.high;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode({
                      id: node.id,
                      type: isDevice ? 'device' : 'fault',
                      data: node.original,
                    });
                  }}
                  style={{ left: `${node.x}px`, top: `${node.y}px`, width: '190px' }}
                  className={`absolute z-10 p-3 rounded-2xl border transition-all duration-150 cursor-pointer shadow-xs transform hover:scale-[1.03] ${
                    isDevice
                      ? 'bg-white border-slate-200 text-slate-900 hover:border-slate-400'
                      : `${sev.bg} ${sev.border} ${sev.text} hover:border-amber-400`
                  } ${isSelected ? 'ring-2 ring-slate-900 shadow-lg scale-[1.04]' : ''} ${
                    node.matchedSearch ? 'ring-2 ring-emerald-500 shadow-md' : ''
                  }`}
                >
                  {/* Node Header */}
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
                  </div>

                  {/* Node Title */}
                  <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {node.label}
                  </div>

                  {/* Subtitle / specs */}
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
            <span>设备 BOM 节点 (5级拓扑)</span>
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
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            title="缩小"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-mono text-xs font-bold text-slate-800">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            title="放大"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition ml-1"
            title="复位视图 (100%)"
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
                    {selectedNode.type === 'fault' ? '储能故障模式' : 'BOM 设备节点'}
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
