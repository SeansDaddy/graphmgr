import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FaultTreeDocument } from '../types/fta';
import {
  Network,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  ChevronRight,
  Info,
  Flame,
  Zap,
  Activity,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  GitFork,
  FileCode,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';

export interface ForestGraphNode {
  id: string;
  name: string;
  stage: 1 | 2 | 3 | 4;
  stageName: string;
  x: number;
  y: number;
  severity: 'critical' | 'high' | 'medium';
  gate: 'OR' | 'AND';
  domain: string;
  coreIndicator: string;
  triggerCondition: string;
  description: string;
  isMaster?: boolean;
}

export interface ForestGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  mechanism: string;
  severity: 'critical' | 'high' | 'medium';
  chainType: 'thermal' | 'cooling' | 'electrical';
}

// 15 个故障场景在 4 个演进阶段的坐标定义与拓扑节点
export const FOREST_NODES: ForestGraphNode[] = [
  // Stage 1: 早期诱因与机械/环境缺陷 (x: 80 - 140)
  {
    id: 'F009',
    name: '液冷管路微泄漏',
    stage: 1,
    stageName: '阶段 1: 早期机理诱因',
    x: 100,
    y: 80,
    severity: 'high',
    gate: 'OR',
    domain: '冷却系统',
    coreIndicator: '进回水压差 / 膨胀水箱液位',
    triggerCondition: '压差 < 40kPa 且光电探头积液',
    description: '快换接头密封失效或主干管微破损引发微量渗液与系统失压',
  },
  {
    id: 'F015',
    name: '冷却系统参数漂移',
    stage: 1,
    stageName: '阶段 1: 早期机理诱因',
    x: 100,
    y: 240,
    severity: 'medium',
    gate: 'OR',
    domain: '冷却系统',
    coreIndicator: '目标出水温度 / PID定值',
    triggerCondition: '出水设定温度与基线偏差 > 5%',
    description: '温控上位机定值被非法篡改或 EEPROM 异常导致控制失配',
  },
  {
    id: 'F012',
    name: '舱内高湿凝露风险',
    stage: 1,
    stageName: '阶段 1: 早期机理诱因',
    x: 100,
    y: 400,
    severity: 'medium',
    gate: 'OR',
    domain: '消防与环控',
    coreIndicator: '电池舱湿度 / 露点裕度',
    triggerCondition: '湿度 > 85% 且露点温差 < 2.5℃',
    description: '工业空调除湿失效，环境温湿度逼近露点面临母排绝缘劣化',
  },
  {
    id: 'F010',
    name: '直流侧电弧故障',
    stage: 1,
    stageName: '阶段 1: 早期机理诱因',
    x: 100,
    y: 560,
    severity: 'critical',
    gate: 'OR',
    domain: '高压电气',
    coreIndicator: '光纤弧光脉冲 / 高频电流',
    triggerCondition: '弧光脉冲触发且高频噪声 > -15dBm',
    description: '直流汇流铜排接触螺栓松动引发剧烈串联或并联拉弧',
  },

  // Stage 2: 循环动力中断与控制失步 (x: 420 - 480)
  {
    id: 'F021',
    name: '冷却泵调速失效',
    stage: 2,
    stageName: '阶段 2: 动力与控制失步',
    x: 440,
    y: 160,
    severity: 'high',
    gate: 'OR',
    domain: '冷却系统',
    coreIndicator: 'PLC指令转速 / 反馈转速',
    triggerCondition: '指令 1800RPM 但反馈实际转速为 0',
    description: '变频器通讯中断或驱动模块过载导致水泵调速失步',
  },
  {
    id: 'F001',
    name: '冷却泵故障动力中断',
    stage: 2,
    stageName: '阶段 2: 动力与控制失步',
    x: 440,
    y: 80,
    severity: 'high',
    gate: 'OR',
    domain: '冷却系统',
    coreIndicator: '相电流 0A / 流量归零',
    triggerCondition: '断路器跳闸且流量持续归零 > 2min',
    description: '冷却循环主泵机械卡死或电气断路器跳闸导致强迫对流彻底中断',
  },
  {
    id: 'F005',
    name: 'BMS 通信总线丢包',
    stage: 2,
    stageName: '阶段 2: 动力与控制失步',
    x: 440,
    y: 310,
    severity: 'high',
    gate: 'OR',
    domain: 'BMS通信',
    coreIndicator: 'CAN丢包率 / CRC错误计数',
    triggerCondition: '报文丢包率 > 5% 且从板心跳超时',
    description: 'CAN 物理层抗干扰失效或终端电阻虚焊，主从监控链路中断',
  },
  {
    id: 'F004',
    name: '直流绝缘阻抗下降',
    stage: 2,
    stageName: '阶段 2: 动力与控制失步',
    x: 440,
    y: 470,
    severity: 'critical',
    gate: 'OR',
    domain: '高压电气',
    coreIndicator: '母线对地阻抗',
    triggerCondition: '母线绝缘阻抗持续 < 100kΩ',
    description: '电缆破损或凝露导致高压正负母线对地绝缘电阻断崖式衰减',
  },

  // Stage 3: 模组与电芯级联过热 (x: 780 - 840)
  {
    id: 'FT-ESS-CLUSTER-OVERHEAT',
    name: '储能电池簇过热故障',
    stage: 3,
    stageName: '阶段 3: 模组电热积聚与过热',
    x: 800,
    y: 140,
    severity: 'critical',
    gate: 'OR',
    domain: '储能电池本体',
    coreIndicator: '最高电芯温度 / 簇充放电电流',
    triggerCondition: '电芯温度突破 55℃ 且多模组一致温升',
    description: '冷却中断或连续超载导致热量积聚，触发 FAT/FTA 标杆故障树顶事件',
    isMaster: true,
  },
  {
    id: 'F003',
    name: '模组单体压差恶化',
    stage: 3,
    stageName: '阶段 3: 模组电热积聚与过热',
    x: 800,
    y: 290,
    severity: 'medium',
    gate: 'OR',
    domain: '储能电池本体',
    coreIndicator: '单体最大压差 / SOC极差',
    triggerCondition: '压差 > 80mV 且极差 > 6%',
    description: '电芯自放电偏大或极柱接触电阻异常导致内阻发热加剧',
  },
  {
    id: 'F002',
    name: 'PCS 功率器件过热',
    stage: 3,
    stageName: '阶段 3: 模组电热积聚与过热',
    x: 800,
    y: 440,
    severity: 'critical',
    gate: 'OR',
    domain: 'PCS变流',
    coreIndicator: 'IGBT芯片结温 / 风机转速',
    triggerCondition: '结温 > 95℃ 且散热风机停转',
    description: 'PCS 变流柜离心风机停转或长时间过载导致功率晶体管结温超限',
  },
  {
    id: 'F007',
    name: '升压主变轻瓦斯过热',
    stage: 3,
    stageName: '阶段 3: 模组电热积聚与过热',
    x: 800,
    y: 580,
    severity: 'high',
    gate: 'OR',
    domain: '主变压器',
    coreIndicator: '顶层油温 / 瓦斯继电器集气量',
    triggerCondition: '油温 > 65℃ 且瓦斯集气 > 150mL',
    description: '绕组强迫风冷失效或局部放电产气导致变压器油裂解',
  },

  // Stage 4: 恶性失控与安全跳闸 (x: 1140 - 1200)
  {
    id: 'F008',
    name: '电芯热失控微排气火警',
    stage: 4,
    stageName: '阶段 4: 终极失控与消防联动',
    x: 1160,
    y: 140,
    severity: 'critical',
    gate: 'OR',
    domain: '消防与安全',
    coreIndicator: 'CO / VOC 分解气体浓度',
    triggerCondition: 'CO > 20ppm 且 VOC > 10ppm 且消防报警',
    description: '电芯防爆阀开启微排气，触发整舱全氟己酮自动灭火浸润与总跳闸',
  },
  {
    id: 'F006',
    name: '直流接触器熔焊粘连',
    stage: 4,
    stageName: '阶段 4: 终极失控与消防联动',
    x: 1160,
    y: 350,
    severity: 'critical',
    gate: 'OR',
    domain: '高压电气',
    coreIndicator: '辅助触点状态 / 母线残压',
    triggerCondition: '分闸指令发出后母线残压仍 > 200V',
    description: '大电流带载切断导致主触头拉弧熔焊，断路器分闸拒动无法隔离',
  },
  {
    id: 'F011',
    name: '电网侧电压跌落与低穿',
    stage: 4,
    stageName: '阶段 4: 终极失控与消防联动',
    x: 1160,
    y: 520,
    severity: 'high',
    gate: 'OR',
    domain: '电网互联',
    coreIndicator: '并网点正序电压 / 动态无功',
    triggerCondition: '电压跌破 0.8 p.u. 持续超 100ms',
    description: '电网短路引发并网点暂态低穿，PCS 注入动态无功或跳闸解列',
  },
];

// 跨场景因果有向级联关系
export const FOREST_EDGES: ForestGraphEdge[] = [
  // 冷却失效链路 (Cooling Chain)
  {
    id: 'E_F009_F001',
    from: 'F009',
    to: 'F001',
    label: '管网失压停运',
    mechanism: '管道微漏失液导致膨胀罐液位击穿，系统失压引发泵气蚀停运',
    severity: 'high',
    chainType: 'cooling',
  },
  {
    id: 'E_F015_F021',
    from: 'F015',
    to: 'F021',
    label: '定值失配超调',
    mechanism: '目标出水定值与实际工况背离，PLC 输出调速异常引发变频器保护',
    severity: 'medium',
    chainType: 'cooling',
  },
  {
    id: 'E_F021_F001',
    from: 'F021',
    to: 'F001',
    label: '调速失步停水',
    mechanism: '变频器调速响应失控，实际转速归零，冷却液主管路循环彻底停滞',
    severity: 'high',
    chainType: 'cooling',
  },
  {
    id: 'E_F001_FT_ESS',
    from: 'F001',
    to: 'FT-ESS-CLUSTER-OVERHEAT',
    label: '循环动力中断',
    mechanism: '冷却泵停转换热动力阻断，电芯散热受阻，热量急剧累积突破55℃',
    severity: 'critical',
    chainType: 'cooling',
  },

  // 电热与电池链路 (Thermal Chain)
  {
    id: 'E_F005_FT_ESS',
    from: 'F005',
    to: 'FT-ESS-CLUSTER-OVERHEAT',
    label: '从控离线失控',
    mechanism: 'CAN 总线丢包超限，主控丢失模组温度反馈，无法下发限功率保护',
    severity: 'high',
    chainType: 'thermal',
  },
  {
    id: 'E_F003_FT_ESS',
    from: 'F003',
    to: 'FT-ESS-CLUSTER-OVERHEAT',
    label: '微短路焦耳热',
    mechanism: '单体一致性恶化导致自放电与接触内阻偏大，局部电芯过热加剧',
    severity: 'high',
    chainType: 'thermal',
  },
  {
    id: 'E_FT_ESS_F008',
    from: 'FT-ESS-CLUSTER-OVERHEAT',
    to: 'F008',
    label: '电解液分解微排气',
    mechanism: '电池簇持续超温突破 65℃，引发固液界面副反应，防爆阀开启微排气',
    severity: 'critical',
    chainType: 'thermal',
  },

  // 电气与电弧绝缘链路 (Electrical Chain)
  {
    id: 'E_F012_F004',
    from: 'F012',
    to: 'F004',
    label: '高湿凝露爬电',
    mechanism: '舱内湿度逼近露点，高压母排及快插表面水膜凝结，对地绝缘骤跌',
    severity: 'high',
    chainType: 'electrical',
  },
  {
    id: 'E_F004_F010',
    from: 'F004',
    to: 'F010',
    label: '介质击穿拉弧',
    mechanism: '绝缘破损后间歇性放电击穿空气间隙，诱发持续性直流强电弧',
    severity: 'critical',
    chainType: 'electrical',
  },
  {
    id: 'E_F010_F006',
    from: 'F010',
    to: 'F006',
    label: '大电流触点熔焊',
    mechanism: '电弧短路大电流在带压切断瞬间产生高温金属电离，主触点熔焊粘连',
    severity: 'critical',
    chainType: 'electrical',
  },
  {
    id: 'E_F006_F008',
    from: 'F006',
    to: 'F008',
    label: '切断失效失控',
    mechanism: '接触器粘连分闸拒动，外部高压电源无法断开，恶化为电芯热失控',
    severity: 'critical',
    chainType: 'electrical',
  },

  // PCS 与电网链路
  {
    id: 'E_F002_F011',
    from: 'F002',
    to: 'F011',
    label: '功率降额与脱网',
    mechanism: 'PCS 功率器件过热触发封锁脉冲降额，恶化电网侧暂态低电压穿越',
    severity: 'high',
    chainType: 'electrical',
  },
  {
    id: 'E_F007_F011',
    from: 'F007',
    to: 'F011',
    label: '主变重瓦斯跳闸',
    mechanism: '变压器油裂解产气超限触发跳闸保护，并网断路器分断引起电网冲击',
    severity: 'high',
    chainType: 'electrical',
  },
];

interface FtaCascadeForestGraphProps {
  onSelectScenario: (faultId: string, initialTab?: 'tree' | 'simulation' | 'yaml') => void;
}

export const FtaCascadeForestGraph: React.FC<FtaCascadeForestGraphProps> = ({
  onSelectScenario,
}) => {
  // Graph Viewport State
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Node Selection & Highlighting
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('FT-ESS-CLUSTER-OVERHEAT');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [chainFilter, setChainFilter] = useState<'all' | 'thermal' | 'cooling' | 'electrical'>('all');

  // Evolution Play Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [simActiveStage, setSimActiveStage] = useState<number | null>(null);
  const simTimerRef = useRef<any>(null);

  // Selected Node Details
  const selectedNode = useMemo(() => {
    return FOREST_NODES.find((n) => n.id === selectedNodeId) || FOREST_NODES[8]; // default to FT-ESS
  }, [selectedNodeId]);

  // Compute Active Edges & Ancestors/Descendants of Selected Node
  const { activeNodeIds, activeEdgeIds, upstreamCauses, downstreamEffects } = useMemo(() => {
    const focusId = hoveredNodeId || selectedNodeId;
    if (!focusId) {
      return {
        activeNodeIds: new Set<string>(FOREST_NODES.map((n) => n.id)),
        activeEdgeIds: new Set<string>(FOREST_EDGES.map((e) => e.id)),
        upstreamCauses: [],
        downstreamEffects: [],
      };
    }

    const nodeIds = new Set<string>([focusId]);
    const edgeIds = new Set<string>();

    // 向上溯源 (Upstream Ancestors)
    const findUpstream = (curId: string) => {
      FOREST_EDGES.filter((e) => e.to === curId).forEach((e) => {
        edgeIds.add(e.id);
        nodeIds.add(e.from);
        findUpstream(e.from);
      });
    };

    // 向下扩散 (Downstream Descendants)
    const findDownstream = (curId: string) => {
      FOREST_EDGES.filter((e) => e.from === curId).forEach((e) => {
        edgeIds.add(e.id);
        nodeIds.add(e.to);
        findDownstream(e.to);
      });
    };

    findUpstream(focusId);
    findDownstream(focusId);

    // Direct inbounds & outbounds for inspector
    const inbounds = FOREST_EDGES.filter((e) => e.to === selectedNode.id).map((e) => {
      const fromNode = FOREST_NODES.find((n) => n.id === e.from);
      return { edge: e, node: fromNode };
    });

    const outbounds = FOREST_EDGES.filter((e) => e.from === selectedNode.id).map((e) => {
      const toNode = FOREST_NODES.find((n) => n.id === e.to);
      return { edge: e, node: toNode };
    });

    return {
      activeNodeIds: nodeIds,
      activeEdgeIds: edgeIds,
      upstreamCauses: inbounds,
      downstreamEffects: outbounds,
    };
  }, [selectedNodeId, hoveredNodeId, selectedNode]);

  // Filter edges based on chainType filter
  const visibleEdges = useMemo(() => {
    if (chainFilter === 'all') return FOREST_EDGES;
    return FOREST_EDGES.filter((e) => e.chainType === chainFilter);
  }, [chainFilter]);

  // Handle Simulation
  const handleToggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simTimerRef.current);
      setIsSimulating(false);
      setSimActiveStage(null);
    } else {
      setIsSimulating(true);
      setSimActiveStage(1);
      let step = 1;

      simTimerRef.current = setInterval(() => {
        step++;
        if (step > 4) {
          clearInterval(simTimerRef.current);
          setIsSimulating(false);
          setSimActiveStage(4);
        } else {
          setSimActiveStage(step);
        }
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // Canvas Mouse Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-node-card')) return;
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* 1. Canvas Top Toolbar */}
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center space-x-2">
              <span>全系统故障树级联演变森林拓扑图</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700">
                15 场景 • 13 组因果链路
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              直观呈现从初期部件偏离到最终热失控失控的 4 阶段跨故障场景因果演化网络，支持点击高亮与下钻
            </p>
          </div>
        </div>

        {/* Chain Filters & Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Chain Filters */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
            <button
              onClick={() => setChainFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                chainFilter === 'all' ? 'bg-slate-700 text-white shadow-2xs font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              全部链路
            </button>
            <button
              onClick={() => setChainFilter('cooling')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                chainFilter === 'cooling' ? 'bg-cyan-900 text-cyan-200 shadow-2xs font-bold' : 'text-slate-400 hover:text-cyan-200'
              }`}
            >
              冷却中断链
            </button>
            <button
              onClick={() => setChainFilter('thermal')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                chainFilter === 'thermal' ? 'bg-orange-900 text-orange-200 shadow-2xs font-bold' : 'text-slate-400 hover:text-orange-200'
              }`}
            >
              热失控火警链
            </button>
            <button
              onClick={() => setChainFilter('electrical')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                chainFilter === 'electrical' ? 'bg-rose-900 text-rose-200 shadow-2xs font-bold' : 'text-slate-400 hover:text-rose-200'
              }`}
            >
              电气电弧绝缘链
            </button>
          </div>

          {/* Simulation Play Button */}
          <button
            onClick={handleToggleSimulation}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
              isSimulating
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? `推演中: 阶段 ${simActiveStage}` : '演变推演模拟'}</span>
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 hover:text-white"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-1.5 hover:text-white"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(0.85);
                setPan({ x: 30, y: 20 });
              }}
              className="p-1.5 hover:text-white border-l border-slate-700"
              title="复位视口"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Graph Viewport + Inspector Drawer */}
      <div className="relative flex flex-col lg:flex-row h-[720px] bg-slate-950 overflow-hidden">
        {/* SVG Interactive Canvas Area */}
        <div
          className={`flex-1 h-full relative cursor-grab overflow-hidden select-none ${
            isPanning ? 'cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Engineering Background Grid Dots */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Stage Watermark Labels at Canvas Top */}
          <div
            className="absolute top-4 pointer-events-none transition-transform duration-75 flex text-xs font-mono font-bold"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <div className="w-[300px] text-center pl-6 text-blue-400/70 border-b border-blue-500/20 pb-1">
              阶段 I: 早期机理诱因 (Phase 1)
            </div>
            <div className="w-[340px] text-center text-amber-400/70 border-b border-amber-500/20 pb-1">
              阶段 II: 动力中断与通信失调 (Phase 2)
            </div>
            <div className="w-[360px] text-center text-orange-400/70 border-b border-orange-500/20 pb-1">
              阶段 III: 模组与电芯级联过热 (Phase 3)
            </div>
            <div className="w-[340px] text-center text-rose-400/70 border-b border-rose-500/20 pb-1">
              阶段 IV: 恶性失控与消防跳闸 (Phase 4)
            </div>
          </div>

          {/* SVG Elements Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Arrow Markers */}
              <marker
                id="forest-arrow-normal"
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
                id="forest-arrow-active"
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
                id="forest-arrow-critical"
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

            {/* Transform Group for Pan & Zoom */}
            <g
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {/* Stage Background Swimlane Rectangles */}
              <rect
                x="60"
                y="30"
                width="280"
                height="670"
                rx="16"
                fill="#1e293b"
                fillOpacity="0.25"
                stroke="#334155"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />
              <rect
                x="400"
                y="30"
                width="280"
                height="670"
                rx="16"
                fill="#1e293b"
                fillOpacity="0.25"
                stroke="#334155"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />
              <rect
                x="760"
                y="30"
                width="280"
                height="670"
                rx="16"
                fill="#1e293b"
                fillOpacity="0.25"
                stroke="#334155"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />
              <rect
                x="1120"
                y="30"
                width="280"
                height="670"
                rx="16"
                fill="#1e293b"
                fillOpacity="0.25"
                stroke="#334155"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />

              {/* Cascade Edges (Cubic Bezier Curves) */}
              {visibleEdges.map((edge) => {
                const source = FOREST_NODES.find((n) => n.id === edge.from);
                const target = FOREST_NODES.find((n) => n.id === edge.to);
                if (!source || !target) return null;

                // Source connects from right side of card (w: 220), target connects at left side (w: 0)
                const startX = source.x + 220;
                const startY = source.y + 45;
                const endX = target.x;
                const endY = target.y + 45;

                const dx = endX - startX;
                const cp1x = startX + dx * 0.5;
                const cp1y = startY;
                const cp2x = startX + dx * 0.5;
                const cp2y = endY;

                const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                const isEdgeActive = activeEdgeIds.has(edge.id);
                const isCritical = edge.severity === 'critical';

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    {/* Shadow / Glow Line */}
                    {isEdgeActive && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke={isCritical ? '#f43f5e' : '#f59e0b'}
                        strokeWidth="5"
                        strokeOpacity="0.4"
                        className="animate-pulse"
                      />
                    )}

                    {/* Main Curve */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={
                        isEdgeActive
                          ? isCritical
                            ? '#f43f5e'
                            : '#f59e0b'
                          : '#475569'
                      }
                      strokeWidth={isEdgeActive ? 2.5 : 1.5}
                      strokeOpacity={isEdgeActive ? 0.95 : 0.4}
                      strokeDasharray={isEdgeActive ? '6 4' : undefined}
                      markerEnd={
                        isEdgeActive
                          ? isCritical
                            ? 'url(#forest-arrow-critical)'
                            : 'url(#forest-arrow-active)'
                          : 'url(#forest-arrow-normal)'
                      }
                    />

                    {/* Edge Label Badge on Curve Midpoint */}
                    <g
                      transform={`translate(${midX}, ${midY})`}
                      className="pointer-events-auto cursor-help"
                    >
                      <rect
                        x="-45"
                        y="-10"
                        width="90"
                        height="20"
                        rx="10"
                        fill={isEdgeActive ? '#1e293b' : '#0f172a'}
                        stroke={isEdgeActive ? (isCritical ? '#f43f5e' : '#f59e0b') : '#334155'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={isEdgeActive ? (isCritical ? '#fda4af' : '#fde68a') : '#94a3b8'}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {edge.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* HTML Interactive Node Cards Layer (Positioned absolutely according to Zoom & Pan) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {FOREST_NODES.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isActive = activeNodeIds.has(node.id);
              const isSimHighlighted = simActiveStage !== null && simActiveStage >= node.stage;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '220px',
                  }}
                  className={`interactive-node-card pointer-events-auto rounded-xl p-3 cursor-pointer transition-all duration-200 select-none ${
                    node.isMaster
                      ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950/80 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : isSelected
                      ? 'bg-slate-850 border-2 border-indigo-400 ring-2 ring-indigo-400/30 shadow-md'
                      : isActive
                      ? 'bg-slate-900/90 border border-slate-700 hover:border-slate-500 shadow-xs'
                      : 'bg-slate-900/40 border border-slate-800 opacity-40 hover:opacity-90'
                  } ${
                    isSimHighlighted ? 'ring-2 ring-rose-500 animate-pulse' : ''
                  }`}
                >
                  {/* Master Benchmark Badge */}
                  {node.isMaster && (
                    <div className="text-[9px] font-bold text-amber-300 font-mono flex items-center justify-between pb-1 mb-1 border-b border-amber-500/30">
                      <span>★ 核心标杆顶事件</span>
                      <span>v1.0.0</span>
                    </div>
                  )}

                  {/* Header Row: ID + Severity + Gate */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {node.id}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          node.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : node.severity === 'high'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {node.severity.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[9px] font-mono px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      门: {node.gate} ⋁
                    </span>
                  </div>

                  {/* Title */}
                  <div className="text-xs font-bold text-white mt-1.5 truncate" title={node.name}>
                    {node.name}
                  </div>

                  {/* Core Condition / Symptom Pill */}
                  <div className="mt-1.5 bg-slate-950/80 px-2 py-1 rounded text-[10px] text-slate-300 font-mono truncate border border-slate-800">
                    {node.triggerCondition}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{node.domain}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScenario(node.id, 'tree');
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-0.5 hover:underline"
                    >
                      <span>单树下钻</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Right Side Scenario Inspector Drawer */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto space-y-5 text-white shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                {selectedNode.stageName}
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5 flex items-center space-x-1.5">
                <span>{selectedNode.name}</span>
                <span className="text-xs font-mono text-slate-400">[{selectedNode.id}]</span>
              </h4>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                selectedNode.severity === 'critical'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : selectedNode.severity === 'high'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {selectedNode.severity.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-850 p-3 rounded-xl border border-slate-800">
            {selectedNode.description}
          </p>

          {/* Inbound Causes & Outbound Effects */}
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-cyan-400 transform rotate-180" />
                <span>上游触发机理 ({upstreamCauses.length})</span>
              </span>
              {upstreamCauses.length > 0 ? (
                <div className="space-y-1.5">
                  {upstreamCauses.map(({ edge, node }) => (
                    <div
                      key={edge.id}
                      onClick={() => node && setSelectedNodeId(node.id)}
                      className="p-2 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-cyan-300 font-mono">[{edge.from}] {node?.name}</span>
                        <span className="text-[10px] text-slate-400">{edge.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{edge.mechanism}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/60 rounded-lg">
                  属于源头根因节点，无上游诱发依赖
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-rose-400" />
                <span>下游恶化后果 ({downstreamEffects.length})</span>
              </span>
              {downstreamEffects.length > 0 ? (
                <div className="space-y-1.5">
                  {downstreamEffects.map(({ edge, node }) => (
                    <div
                      key={edge.id}
                      onClick={() => node && setSelectedNodeId(node.id)}
                      className="p-2 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-rose-300 font-mono">➔ [{edge.to}] {node?.name}</span>
                        <span className="text-[10px] text-slate-400">{edge.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{edge.mechanism}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/60 rounded-lg">
                  属于末端终极风险节点（已触发灭火或总跳闸）
                </div>
              )}
            </div>
          </div>

          {/* Drilldown Actions */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => onSelectScenario(selectedNode.id, 'tree')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition"
            >
              <GitFork className="w-4 h-4 transform -rotate-45" />
              <span>展开该场景 FTA 逻辑门树与仿真</span>
            </button>

            <button
              onClick={() => onSelectScenario(selectedNode.id, 'yaml')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>查看该场景 FAT YAML 定义</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
