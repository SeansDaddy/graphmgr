import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SeverityLevel } from '../types';
import { FaultTreeDocument, FtaTreeNode } from '../types/fta';
import { useApp } from '../context/AppContext';
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
  FileText,
  ExternalLink,
  ShieldCheck,
  Compass,
  Crosshair,
  Sliders,
  X,
  Maximize2,
  Clock,
  Wrench,
  Search,
  Check,
} from 'lucide-react';

export interface NodeSopBinding {
  sopId: string;
  sopName: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4';
  phaseLabel: string;
  stepNum: number;
  stepId?: string;
  action: string;
  verification?: string;
  expectedOutcome?: string;
  toolRequired?: string;
  estimatedTime?: string;
}

export interface PropagationStepNode {
  id: string;
  name: string;
  stage: 'trigger' | 'gate' | 'top' | 'mitigation';
  stageLabel: string;
  gateType?: 'AND' | 'OR' | 'VOTE' | 'PRIORITY_AND';
  conditionText?: string;
  observationId?: string;
  conditionDetail?: any;
  triggered?: boolean;
  severity?: SeverityLevel;
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
  sopBinding?: NodeSopBinding;
  isShared?: boolean;
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
  onUpdateFtaDoc?: (updatedDoc: FaultTreeDocument) => void;
}

export const FtaPropagationGraph: React.FC<FtaPropagationGraphProps> = ({
  ftaDoc,
  simObservations = {},
  selectedNodeId,
  onSelectNode,
  compact = false,
  onUpdateFtaDoc,
}) => {
  const { sops, openSopEditor, updateFault, faults, showToast } = useApp();

  // Viewport Zoom & Pan
  const [zoom, setZoom] = useState(compact ? 0.72 : 0.82);
  const [pan, setPan] = useState({ x: 20, y: 15 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Simulation Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playStep, setPlayStep] = useState<number | null>(null);
  const playTimerRef = useRef<any>(null);

  // Active SOP Modal Node
  const [activeSopModalNode, setActiveSopModalNode] = useState<PropagationStepNode | null>(null);

  // Filter highlight mode
  const [filterMode, setFilterMode] = useState<'all' | 'active_only'>('all');

  // Match system SOP for this fault pattern
  const matchingSop = useMemo(() => {
    return (
      sops.find(
        (s) =>
          s.associated_fault_ids.includes(ftaDoc.metadata.id) ||
          s.id.includes(ftaDoc.metadata.id) ||
          (ftaDoc.metadata.name && s.name.includes(ftaDoc.metadata.name.slice(0, 4)))
      ) || sops[0]
    );
  }, [sops, ftaDoc]);

  // Modal editing state for SOP binding
  const [modalSopId, setModalSopId] = useState<string>('');

  // Selected SOP object inside modal
  const selectedModalSop = useMemo(() => {
    return sops.find((s) => s.id === modalSopId) || matchingSop || sops[0];
  }, [sops, modalSopId, matchingSop]);

  // Synchronize modal state when activeSopModalNode opens
  useEffect(() => {
    if (activeSopModalNode) {
      const binding = activeSopModalNode.sopBinding;
      const initialSopId = binding?.sopId || matchingSop?.id || (sops[0]?.id ?? '');
      setModalSopId(initialSopId);
    }
  }, [activeSopModalNode, matchingSop, sops]);

  // Save SOP binding from modal
  const handleSaveSopBinding = () => {
    if (!activeSopModalNode || !selectedModalSop) return;

    const chosenSop = selectedModalSop;
    const defaultAction = chosenSop.procedures?.[0]?.action || chosenSop.name;

    const newBinding: NodeSopBinding = {
      sopId: chosenSop.id,
      sopName: chosenSop.name,
      phase: 'Phase 1',
      phaseLabel: 'SOP 联动处置',
      stepNum: 1,
      action: defaultAction,
      expectedOutcome: chosenSop.procedures?.[0]?.expected_outcome || '依规程执行阻断处置',
    };

    // Update the node in ftaDoc.fault_tree.nodes
    const updatedNodes = ftaDoc.fault_tree.nodes.map((node) => {
      if (node.id === activeSopModalNode.id) {
        return {
          ...node,
          sop_binding: {
            sop_id: newBinding.sopId,
            sop_name: newBinding.sopName,
            action: newBinding.action,
            expected_outcome: newBinding.expectedOutcome,
            priority: 'high' as const,
          },
        };
      }
      return node;
    });

    const updatedDoc: FaultTreeDocument = {
      ...ftaDoc,
      fault_tree: {
        ...ftaDoc.fault_tree,
        nodes: updatedNodes,
      },
    };

    if (onUpdateFtaDoc) {
      onUpdateFtaDoc(updatedDoc);
    }

    // Also persist via AppContext updateFault if fault exists
    const matchedFault = faults.find(
      (f) => f.id === ftaDoc.metadata.id || f.fta_document?.metadata?.id === ftaDoc.metadata.id
    );
    if (matchedFault) {
      updateFault(matchedFault.id, { fta_document: updatedDoc });
    }

    showToast(
      `已成功将处置SOP【${newBinding.sopName}】绑定至节点【${activeSopModalNode.name}】！`,
      'success'
    );
    setActiveSopModalNode(null);
  };

  // Compute Active Node States based on simObservations
  const evaluatedStates: Record<string, boolean> = useMemo(() => {
    const states: Record<string, boolean> = {};

    // 1. Evaluate basic nodes from observations
    (ftaDoc.fault_tree.nodes || []).forEach((node) => {
      if (node.type === 'basic' && node.condition) {
        const obsId = node.condition.observation;
        const val = obsId ? simObservations[obsId] : undefined;
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

    // 2. Evaluate shared events if present
    (ftaDoc.shared_events || []).forEach((se) => {
      let hit = false;
      if (se.condition?.all) {
        hit = se.condition.all.every((c: any) => {
          const val = simObservations[c.observation];
          if (val === undefined) return false;
          if (c.operator === 'lt') return Number(val) < Number(c.value);
          if (c.operator === 'gt') return Number(val) > Number(c.value);
          if (c.operator === 'active') return val === true || val === 'active';
          return false;
        });
      } else if (se.condition?.any) {
        hit = se.condition.any.some((c: any) => {
          const val = simObservations[c.observation];
          if (val === undefined) return false;
          if (c.operator === 'lt') return Number(val) < Number(c.value);
          if (c.operator === 'gt') return Number(val) > Number(c.value);
          if (c.operator === 'active') return val === true || val === 'active';
          return false;
        });
      }
      states[se.id] = hit;
    });

    // 3. Evaluate intermediate nodes
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

    // 4. Evaluate root node
    const rootNode =
      ftaDoc.fault_tree.nodes.find((n) => n.id === ftaDoc.fault_tree.root) ||
      ftaDoc.fault_tree.nodes.find((n) => n.type === 'top_event') ||
      ftaDoc.fault_tree.nodes[0];
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

  // Construct Propagation Graph Nodes & Edges with Dynamic Overlap-Free Layout
  const { nodes, edges, canvasContentHeight } = useMemo(() => {
    const graphNodes: PropagationStepNode[] = [];
    const graphEdges: PropagationStepEdge[] = [];

    // 1. Root Node Identification
    const rootNode =
      ftaDoc.fault_tree.nodes.find((n) => n.id === ftaDoc.fault_tree.root) ||
      ftaDoc.fault_tree.nodes.find((n) => n.type === 'top_event') ||
      ftaDoc.fault_tree.nodes[0];

    // 2. Intermediate Nodes - STRICTLY EXCLUDE rootNode!
    const intermediateNodes = (ftaDoc.fault_tree.nodes || []).filter(
      (n) => n.id !== rootNode?.id && (n.type === 'intermediate' || (n.gate && n.children && n.children.length > 0))
    );

    // 3. Basic Nodes - STRICTLY EXCLUDE rootNode and intermediateNodes!
    const basicNodes = (ftaDoc.fault_tree.nodes || []).filter(
      (n) => n.id !== rootNode?.id && n.type === 'basic' && !intermediateNodes.some((i) => i.id === n.id)
    );

    // 4. Shared Events (if any are referenced in nodes or defined in ftaDoc)
    const sharedEvents = (ftaDoc.shared_events || []).filter(
      (se) => !basicNodes.some((b) => b.id === se.id) && se.id !== rootNode?.id
    );

    // Col 1 combines basic events and shared events
    const col1InputNodes = [
      ...basicNodes,
      ...sharedEvents.map((se) => ({
        id: se.id,
        name: se.name,
        type: 'basic' as const,
        condition: se.condition as any,
        sop_binding: undefined,
        isShared: true,
      })),
    ];

    // Fixed Non-Overlapping Grid System Constants
    const CARD_WIDTH = 260;
    const CARD_HEIGHT = 132;
    const MIN_GAP_Y = 28;
    const PITCH_Y = CARD_HEIGHT + MIN_GAP_Y; // 160px guaranteed vertical spacing

    // 4 Column Horizontal Coordinates (Ample clearance prevents horizontal collision)
    const col1X = 40;   // 阶段 1: 物理异常触发 (Basic & Shared Events)
    const col2X = 370;  // 阶段 2: 逻辑门传导汇聚 (Logic Gates)
    const col3X = 700;  // 阶段 3: 顶事件确诊爆发 (Top Event)
    const col4X = 1030; // 阶段 4: SOP 4-Phase 联动编排阻断

    // -------------------------------------------------------------
    // COLUMN 1: Basic Event / Shared Event Trigger Nodes
    // -------------------------------------------------------------
    col1InputNodes.forEach((bNode, idx) => {
      let condText = '';
      if (bNode.condition) {
        if (bNode.condition.observation) {
          condText = `${bNode.condition.observation} ${bNode.condition.operator || '>'} ${bNode.condition.value ?? ''}`;
          if (bNode.condition.for) condText += ` (${bNode.condition.for})`;
        } else if (bNode.condition.all) {
          condText = bNode.condition.all.map((c: any) => `${c.observation} ${c.operator} ${c.value}`).join(' & ');
        } else if (bNode.condition.any) {
          condText = bNode.condition.any.map((c: any) => `${c.observation} ${c.operator} ${c.value}`).join(' | ');
        }
      }

      // Check if node has explicit sop_binding
      const existingBinding = (bNode as any).sop_binding;
      const targetSop = existingBinding?.sop_id
        ? sops.find((s) => s.id === existingBinding.sop_id) || matchingSop
        : matchingSop;
      const step1 = targetSop?.procedures?.[0];

      // Sequential non-overlapping Y position
      const nodeY = 55 + idx * PITCH_Y;

      graphNodes.push({
        id: bNode.id,
        name: bNode.name,
        stage: 'trigger',
        stageLabel: '阶段 1: 物理异常触发',
        conditionText: condText,
        observationId: bNode.condition?.observation,
        conditionDetail: bNode.condition,
        triggered: evaluatedStates[bNode.id],
        x: col1X,
        y: nodeY,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        isShared: (bNode as any).isShared,
        description: `底层传感器遥测或共享事件判据，满足表达式时产生初始激励`,
        sopBinding: {
          sopId: existingBinding?.sop_id || targetSop?.id || 'RP-01',
          sopName: existingBinding?.sop_name || targetSop?.name || '标准应急处置程序',
          phase: 'Phase 1',
          phaseLabel: 'Phase 1: 预防与早研排查',
          stepNum: existingBinding?.step_num || 1,
          stepId: existingBinding?.step_id || step1?.id || 'STEP-1',
          action:
            existingBinding?.action ||
            step1?.action ||
            '核查传感器引线绝缘与零漂，执行遥测数据交叉比对仲裁',
          expectedOutcome:
            existingBinding?.expected_outcome ||
            step1?.expected_outcome ||
            '确认测点有效性，排除虚警，准确定位初始故障源',
          toolRequired: step1?.tool_required || '手持数字万用表 / 红外测温热像仪',
          estimatedTime: step1?.estimated_time || '2-3 分钟',
        },
      });
    });

    const totalCol1Height = 55 + Math.max(1, col1InputNodes.length) * PITCH_Y;

    // -------------------------------------------------------------
    // COLUMN 2: Intermediate Gate Confluence Nodes
    // -------------------------------------------------------------
    const numInter = intermediateNodes.length;
    let startY_Col2 = 55;
    let col2Pitch = PITCH_Y;

    if (numInter === 1) {
      startY_Col2 = Math.max(55, (totalCol1Height - CARD_HEIGHT) / 2);
    } else if (numInter > 1) {
      const idealSpan = Math.max((numInter - 1) * PITCH_Y, totalCol1Height - CARD_HEIGHT - 55);
      col2Pitch = Math.max(PITCH_Y, idealSpan / (numInter - 1));
      startY_Col2 = Math.max(55, (totalCol1Height - (numInter - 1) * col2Pitch - CARD_HEIGHT) / 2);
    }

    intermediateNodes.forEach((iNode, idx) => {
      const nodeY = startY_Col2 + idx * col2Pitch;
      const isAnd = iNode.gate === 'AND';

      const existingBinding = iNode.sop_binding;
      const targetSop = existingBinding?.sop_id
        ? sops.find((s) => s.id === existingBinding.sop_id) || matchingSop
        : matchingSop;
      const step2 = targetSop?.procedures?.[1] || targetSop?.procedures?.[0];

      graphNodes.push({
        id: iNode.id,
        name: iNode.name,
        stage: 'gate',
        stageLabel: '阶段 2: 逻辑门传导汇聚',
        gateType: (iNode.gate as any) || 'AND',
        triggered: evaluatedStates[iNode.id],
        severity: ftaDoc.metadata.severity,
        x: col2X,
        y: nodeY,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        description: `布尔逻辑门【${iNode.gate || 'AND'} 门】，${
          isAnd ? '需全部子事件同时满足方可向上传导' : '任一子事件命中即触发向下级扩散'
        }`,
        sopBinding: {
          sopId: existingBinding?.sop_id || targetSop?.id || 'RP-01',
          sopName: existingBinding?.sop_name || targetSop?.name || '标准应急处置程序',
          phase: 'Phase 2',
          phaseLabel: 'Phase 2: 限额隔离与通路截断',
          stepNum: existingBinding?.step_num || 2,
          stepId: existingBinding?.step_id || step2?.id || 'STEP-2',
          action:
            existingBinding?.action ||
            step2?.action ||
            (isAnd
              ? '协同传导成立：强制执行功率降额 50%，联锁备用泵组投入，截断级联扩散通道'
              : '单路异常汇聚：限制充放电倍率至 0.2C，隔离异常支路并上报值班调度'),
          expectedOutcome:
            existingBinding?.expected_outcome ||
            step2?.expected_outcome ||
            '故障温升或水力冲击停止蔓延，系统维持安全受控受限运行',
          toolRequired: step2?.tool_required || '能量管理系统 (EMS) 远程降额控制台',
          estimatedTime: step2?.estimated_time || '30 秒内完成指令下发',
        },
      });

      // Connect children from basic/intermediate nodes to this intermediate node
      (iNode.children || []).forEach((cId) => {
        graphEdges.push({
          id: `E_${cId}_${iNode.id}`,
          from: cId,
          to: iNode.id,
          label: isAnd ? '⋀ 协同输入' : '⋁ 独立输入',
          gateLogic: isAnd ? 'AND' : 'OR',
          active: Boolean(evaluatedStates[cId] && evaluatedStates[iNode.id]),
        });
      });
    });

    const totalCol2Height = startY_Col2 + Math.max(1, numInter) * col2Pitch;

    // -------------------------------------------------------------
    // COLUMN 3: Top Event Diagnosis Node (Vertically Centered)
    // -------------------------------------------------------------
    let topY = 55;
    if (numInter > 0) {
      topY = (startY_Col2 + (startY_Col2 + (numInter - 1) * col2Pitch)) / 2;
    } else {
      topY = Math.max(55, (totalCol1Height - CARD_HEIGHT) / 2);
    }

    if (rootNode) {
      const existingBinding = rootNode.sop_binding;
      const targetSop = existingBinding?.sop_id
        ? sops.find((s) => s.id === existingBinding.sop_id) || matchingSop
        : matchingSop;
      const step3 = targetSop?.procedures?.[2] || targetSop?.procedures?.[0];

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
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        description: `FTA 顶事件爆发：${rootNode.output?.conclusion || '系统严重故障确诊'} (置信度阈值: ${
          rootNode.output?.confidence?.threshold || 0.8
        })`,
        sopBinding: {
          sopId: existingBinding?.sop_id || targetSop?.id || 'RP-01',
          sopName: existingBinding?.sop_name || targetSop?.name || '标准应急处置程序',
          phase: 'Phase 3',
          phaseLabel: 'Phase 3: 紧急跳闸与回路隔离',
          stepNum: existingBinding?.step_num || 3,
          stepId: existingBinding?.step_id || step3?.id || 'STEP-3',
          action:
            existingBinding?.action ||
            step3?.action ||
            '顶事件判定确诊：主断路器毫秒级跳闸分闸，脱开高压母线，启动防爆通风与消防联动闭锁',
          expectedOutcome:
            existingBinding?.expected_outcome ||
            step3?.expected_outcome ||
            '主回路能源彻底切断失电，阻断电热失控化学能源输入',
          toolRequired: step3?.tool_required || '高压直流快速分励脱扣器 / 防火闭锁开关',
          estimatedTime: step3?.estimated_time || '系统级自动保护响应 < 100ms',
        },
      });

      // Connect intermediate nodes to root
      (rootNode.children || []).forEach((cId) => {
        graphEdges.push({
          id: `E_${cId}_${rootNode.id}`,
          from: cId,
          to: rootNode.id,
          label: rootNode.gate === 'AND' ? '⋀ 协同致危' : '⋁ 触发顶事件',
          gateLogic: rootNode.gate === 'AND' ? 'AND' : 'OR',
          active: Boolean(evaluatedStates[cId] && evaluatedStates[rootNode.id]),
        });
      });
    }

    // -------------------------------------------------------------
    // COLUMN 4: Standard 4-Phase SOP Orchestration (4-Phase 编排矩阵)
    // -------------------------------------------------------------
    const totalMaxHeight = Math.max(totalCol1Height, totalCol2Height, 640);
    const phasePitch = Math.max(PITCH_Y, (totalMaxHeight - 110) / 4);

    const phaseDefinitions: Array<{
      phaseId: string;
      phaseShort: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4';
      title: string;
      stepNum: number;
      defaultAction: string;
      defaultExpected: string;
      connectFromIds: string[];
    }> = [
      {
        phaseId: 'SOP_PHASE_1',
        phaseShort: 'Phase 1',
        title: 'Phase 1: 早期预警与源头排查',
        stepNum: 1,
        defaultAction:
          matchingSop?.procedures?.[0]?.action ||
          '核查异常测点采样与零漂，执行传感器交叉校验与早期消警',
        defaultExpected:
          matchingSop?.procedures?.[0]?.expected_outcome ||
          '确认测点有效性，排除虚假跳闸风险',
        connectFromIds: col1InputNodes.slice(0, 2).map((b) => b.id),
      },
      {
        phaseId: 'SOP_PHASE_2',
        phaseShort: 'Phase 2',
        title: 'Phase 2: 降额限流与传播阻断',
        stepNum: 2,
        defaultAction:
          matchingSop?.procedures?.[1]?.action ||
          '触发系统降额 50%，联锁备用泵与辅助散热，阻断级联扩散',
        defaultExpected:
          matchingSop?.procedures?.[1]?.expected_outcome ||
          '温升与压力停止恶化，防止热量进一步积聚',
        connectFromIds: intermediateNodes.map((i) => i.id),
      },
      {
        phaseId: 'SOP_PHASE_3',
        phaseShort: 'Phase 3',
        title: 'Phase 3: 紧急停机与主回路隔离',
        stepNum: 3,
        defaultAction:
          matchingSop?.procedures?.[2]?.action ||
          '主断路器毫秒级分闸跳闸，高压直流侧脱扣并闭锁合闸',
        defaultExpected:
          matchingSop?.procedures?.[2]?.expected_outcome ||
          '主功率回路完全失电隔离，保障人员与站址安全',
        connectFromIds: rootNode ? [rootNode.id] : [],
      },
      {
        phaseId: 'SOP_PHASE_4',
        phaseShort: 'Phase 4',
        title: 'Phase 4: 现场复归与后评估处置',
        stepNum: 4,
        defaultAction:
          matchingSop?.procedures?.[3]?.action ||
          '站级消防联动待命，绝缘阻抗摇测，后评估后安全复归',
        defaultExpected:
          matchingSop?.procedures?.[3]?.expected_outcome ||
          '受影响回路隔离修复，正常支路恢复供电',
        connectFromIds: ['SOP_PHASE_3'],
      },
    ];

    phaseDefinitions.forEach((pDef, idx) => {
      const nodeY = 55 + idx * phasePitch;
      const isPhaseTriggered =
        idx === 0
          ? col1InputNodes.some((b) => evaluatedStates[b.id])
          : idx === 1
          ? intermediateNodes.some((i) => evaluatedStates[i.id])
          : Boolean(evaluatedStates[rootNode?.id || '']);

      graphNodes.push({
        id: pDef.phaseId,
        name: pDef.title,
        stage: 'mitigation',
        stageLabel: '阶段 4: 阻断与应急响应',
        triggered: isPhaseTriggered,
        x: col4X,
        y: nodeY,
        width: 270,
        height: CARD_HEIGHT,
        description: `标准应急处置 SOP [${pDef.phaseShort}]：当故障推演至对应阶段时自动激活对应的安全防护规程`,
        sopBinding: {
          sopId: matchingSop?.id || 'RP-01',
          sopName: matchingSop?.name || '标准应急处置程序',
          phase: pDef.phaseShort,
          phaseLabel: pDef.title,
          stepNum: pDef.stepNum,
          action: pDef.defaultAction,
          expectedOutcome: pDef.defaultExpected,
          toolRequired: '绝缘手套 / 防护面罩 / 专用操作手柄',
          estimatedTime: idx === 2 ? '< 100ms' : '5-15 分钟',
        },
      });

      // Connect causality edges to this phase SOP node
      pDef.connectFromIds.forEach((fromId) => {
        graphEdges.push({
          id: `E_${fromId}_${pDef.phaseId}`,
          from: fromId,
          to: pDef.phaseId,
          label: `➔ ${pDef.phaseShort} 处置`,
          gateLogic: 'AND',
          active: isPhaseTriggered,
        });
      });
    });

    const computedHeight = Math.max(
      totalCol1Height + 60,
      totalCol2Height + 60,
      55 + 4 * phasePitch + 60,
      720
    );

    return {
      nodes: graphNodes,
      edges: graphEdges,
      canvasContentHeight: computedHeight,
    };
  }, [ftaDoc, evaluatedStates, matchingSop, sops]);

  // Animation Playback Controller
  const handleTogglePlay = () => {
    if (isPlaying) {
      clearInterval(playTimerRef.current);
      setIsPlaying(false);
      setPlayStep(null);
    } else {
      setIsPlaying(true);
      setPlayStep(1);
      let cur = 1;
      playTimerRef.current = setInterval(() => {
        cur += 1;
        if (cur > 4) {
          clearInterval(playTimerRef.current);
          setIsPlaying(false);
          setPlayStep(null);
        } else {
          setPlayStep(cur);
        }
      }, 1200);
    }
  };

  // Reset View to optimal fit
  const handleFitView = () => {
    setZoom(compact ? 0.72 : 0.82);
    setPan({ x: 20, y: 15 });
  };

  // Mouse Canvas Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-propagation-node')) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
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

  const stageShadingHeight = Math.max(560, canvasContentHeight - 30);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs">
      {/* Top Banner Toolbar */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center space-x-2.5">
          <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
            <Activity className="w-4 h-4 text-slate-700" />
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900">FTA 故障因果传播推演图</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                节点级判据 ➔ SOP 联动处置
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              已彻底消除节点几何重叠；直观展现从底层传感器物理判据、逻辑门传导汇聚，到顶事件确诊与对应处置 SOP 的全链路联动
            </p>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* View Filter Mode */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全景因果链
            </button>
            <button
              onClick={() => setFilterMode('active_only')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                filterMode === 'active_only'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              仅高亮激活态
            </button>
          </div>

          {/* Play Animation */}
          <button
            onClick={handleTogglePlay}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? `推演阶段 ${playStep}/4` : '动态推演'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs">
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 font-semibold">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.45, z - 0.1))}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitView}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 border-l border-slate-200 transition cursor-pointer"
              title="适屏居中复位"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div
        className={`relative h-[640px] bg-slate-50/70 overflow-hidden cursor-grab select-none ${
          isPanning ? 'cursor-grabbing' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Stage Columns Watermark Headers (Pan & Zoom Synchronized) */}
        <div
          className="absolute top-2 pointer-events-none flex text-[11px] font-mono font-bold"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <div className="w-[330px] pl-6 text-slate-700 border-b border-slate-300 pb-1 flex items-center justify-between pr-4">
            <span>阶段 1: 物理异常触发 (Basic Events)</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">判据级</span>
          </div>
          <div className="w-[330px] pl-6 text-slate-700 border-b border-slate-300 pb-1 flex items-center justify-between pr-4">
            <span>阶段 2: 逻辑门传导汇聚 (Logic Gates)</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">因果级</span>
          </div>
          <div className="w-[330px] pl-6 text-slate-700 border-b border-slate-300 pb-1 flex items-center justify-between pr-4">
            <span>阶段 3: 顶事件确诊爆发 (Top Event)</span>
            <span className="text-[10px] text-rose-500 font-sans font-normal">失稳级</span>
          </div>
          <div className="w-[330px] pl-6 text-slate-700 border-b border-slate-300 pb-1 flex items-center justify-between pr-4">
            <span>阶段 4: 联动处置阻断 (SOP)</span>
            <span className="text-[10px] text-emerald-600 font-sans font-semibold">处置级</span>
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
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
          </defs>

          <g
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Draw Stage Column Shading Background Rects with Zero Overlap */}
            <rect
              x="20"
              y="20"
              width="310"
              height={stageShadingHeight}
              rx="16"
              fill="#f8fafc"
              fillOpacity="0.8"
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <rect
              x="350"
              y="20"
              width="310"
              height={stageShadingHeight}
              rx="16"
              fill="#f8fafc"
              fillOpacity="0.8"
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <rect
              x="680"
              y="20"
              width="310"
              height={stageShadingHeight}
              rx="16"
              fill="#fff1f2"
              fillOpacity="0.45"
              stroke="#fecdd3"
              strokeDasharray="4 4"
            />
            <rect
              x="1010"
              y="20"
              width="310"
              height={stageShadingHeight}
              rx="16"
              fill="#f0fdf4"
              fillOpacity="0.5"
              stroke="#bbf7d0"
              strokeDasharray="4 4"
            />

            {/* Draw Directed Propagation & SOP Linking Edges */}
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.from);
              const target = nodes.find((n) => n.id === edge.to);
              if (!source || !target) return null;

              if (filterMode === 'active_only' && !edge.active) return null;

              // Check if both nodes are in the same column (e.g. SOP_PHASE_3 -> SOP_PHASE_4 in Column 4)
              let pathData = '';
              let midX = 0;
              let midY = 0;

              if (source.x === target.x) {
                // Vertical downwards routing inside same column
                const startX = source.x + source.width / 2;
                const startY = source.y + source.height;
                const endX = target.x + target.width / 2;
                const endY = target.y;

                pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
                midX = (startX + endX) / 2;
                midY = (startY + endY) / 2;
              } else {
                // Standard horizontal left-to-right cubic curve
                const startX = source.x + source.width;
                const startY = source.y + source.height / 2;
                const endX = target.x;
                const endY = target.y + target.height / 2;

                const dx = endX - startX;
                const cp1x = startX + dx * 0.45;
                const cp1y = startY;
                const cp2x = startX + dx * 0.55;
                const cp2y = endY;

                pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
                midX = (startX + endX) / 2;
                midY = (startY + endY) / 2;
              }

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
                      strokeOpacity="0.35"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Curve */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isEdgeActive ? '#f59e0b' : '#94a3b8'}
                    strokeWidth={isEdgeActive ? 2.5 : 1.5}
                    strokeOpacity={isEdgeActive ? 1 : 0.6}
                    strokeDasharray={isEdgeActive ? '5 3' : undefined}
                    markerEnd={isEdgeActive ? 'url(#prop-arrow-active)' : 'url(#prop-arrow-default)'}
                  />

                  {/* Sleek Non-Obstructive Edge Label Badge */}
                  {edge.label && (
                    <g transform={`translate(${midX}, ${midY})`} className="pointer-events-auto">
                      <rect
                        x="-30"
                        y="-8"
                        width="60"
                        height="16"
                        rx="8"
                        fill={isEdgeActive ? '#0f172a' : '#ffffff'}
                        stroke={isEdgeActive ? '#f59e0b' : '#cbd5e1'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={isEdgeActive ? '#ffffff' : '#475569'}
                        fontSize="8"
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

            if (filterMode === 'active_only' && !isTriggered) return null;

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectNode) onSelectNode(node.id);
                  setActiveSopModalNode(node);
                }}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
                className={`interactive-propagation-node pointer-events-auto rounded-xl p-3 cursor-pointer transition-all select-none border-2 shadow-xs flex flex-col justify-between ${
                  node.stage === 'top'
                    ? isTriggered
                      ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-md text-slate-900'
                      : 'bg-white border-rose-300 hover:border-rose-500 text-slate-900'
                    : node.stage === 'mitigation'
                    ? isTriggered
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md text-slate-900'
                      : 'bg-white border-emerald-300 hover:border-emerald-500 text-slate-900'
                    : isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-slate-900/10'
                    : isTriggered
                    ? 'bg-amber-50 border-amber-400 text-slate-900'
                    : 'bg-white border-slate-200 hover:border-slate-400 text-slate-800'
                } ${isSimHighlighted ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
              >
                {/* 1. Header: Node ID & Gate/Phase Badge */}
                <div
                  className={`flex items-center justify-between text-[10px] pb-1 border-b ${
                    isSelected ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <span
                    className={`font-mono truncate max-w-[125px] font-semibold ${
                      isSelected ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {node.id}
                  </span>

                  {node.gateType ? (
                    <span
                      className={`font-mono font-bold px-1.5 py-0.2 rounded border text-[10px] ${
                        isSelected
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {node.gateType === 'AND' ? '⋀ AND 门' : '⋁ OR 门'}
                    </span>
                  ) : node.stage === 'mitigation' ? (
                    <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                      SOP 编排
                    </span>
                  ) : (
                    <span
                      className={`font-mono px-1 rounded text-[10px] ${
                        isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {node.isShared ? '共享判据' : '底事件'}
                    </span>
                  )}
                </div>

                {/* 2. Body: Node Name & Condition */}
                <div className="my-1">
                  <div
                    className={`text-xs font-bold truncate ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}
                    title={node.name}
                  >
                    {node.name}
                  </div>

                  {node.conditionText ? (
                    <div
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 truncate border ${
                        isSelected
                          ? 'bg-slate-800 text-amber-300 border-slate-700'
                          : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                      title={node.conditionText}
                    >
                      判据: {node.conditionText}
                    </div>
                  ) : (
                    <div
                      className={`text-[10px] truncate mt-0.5 ${
                        isSelected ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {node.stage === 'mitigation' ? node.sopBinding?.action : node.description}
                    </div>
                  )}
                </div>

                {/* 3. Footer: Node-Level Bound SOP & Status */}
                <div
                  className={`pt-1 border-t flex items-center justify-between text-[10px] ${
                    isSelected ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  {node.sopBinding ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSopModalNode(node);
                      }}
                      className={`px-1.5 py-0.5 rounded font-medium flex items-center space-x-1 transition cursor-pointer max-w-[155px] ${
                        isSelected
                          ? 'bg-slate-800 text-indigo-300 hover:text-white'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                      }`}
                      title="点击配置/选择此节点绑定的联动处置 SOP"
                    >
                      <FileText className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">
                        {node.sopBinding.sopName || node.sopBinding.sopId}
                      </span>
                    </button>
                  ) : (
                    <span className="text-slate-400">无 SOP 预案</span>
                  )}

                  <span
                    className={`font-semibold flex items-center space-x-1 shrink-0 ${
                      isTriggered
                        ? 'text-rose-600 font-bold'
                        : isSelected
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isTriggered ? 'bg-rose-500 animate-ping' : isSelected ? 'bg-slate-400' : 'bg-slate-300'
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
      <div className="px-4 py-2.5 bg-white border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-4 flex-wrap">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>阶段 1: 物理传感器判据</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>阶段 2: 逻辑门布尔汇聚</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>阶段 3: 顶事件确诊爆发</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>阶段 4: SOP 联动处置阻断</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-500">点击任意节点卡片即可从处置预案库中选择并绑定对应处置 SOP</span>
          <span className="text-slate-900 font-mono font-bold">
            激活节点: {Object.values(evaluatedStates).filter(Boolean).length}/{Object.keys(evaluatedStates).length}
          </span>
        </div>
      </div>

      {/* Interactive Node-Level SOP Binding Modal (Select from 处置SOP) */}
      {activeSopModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl text-slate-800 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <FileText className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <span>节点联动处置 SOP</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    节点 ID: {activeSopModalNode.id} • 所属阶段: {activeSopModalNode.stageLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveSopModalNode(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Node Info & Triggering Condition Box (条件级判据) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <div className="flex items-center space-x-2">
                  <span>{activeSopModalNode.name}</span>
                  {activeSopModalNode.gateType && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">
                      {activeSopModalNode.gateType} 门
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    activeSopModalNode.triggered
                      ? 'bg-rose-100 text-rose-700 font-bold'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {activeSopModalNode.triggered ? '真值状态: 已触发激起' : '真值状态: 正常未激'}
                </span>
              </div>

              {activeSopModalNode.conditionText ? (
                <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-200 space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-500">条件级判据触发表达式 (Condition):</div>
                  <div className="font-bold text-indigo-700">{activeSopModalNode.conditionText}</div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                    当物理测点满足此表达式时，将作为故障激励，并立即触发本节点所绑定的联动处置 SOP 预案。
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  {activeSopModalNode.description}
                </div>
              )}
            </div>

            {/* 2. CORE SECTION: Select from 处置SOP */}
            <div className="space-y-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>选择联动处置 SOP 预案</span>
                </span>
                <span className="text-[10px] text-indigo-700 font-medium">
                  预案库共 {sops.length} 套处置方案
                </span>
              </div>

              {/* SOP Dropdown Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  目标处置预案 (Target SOP) *
                </label>
                <select
                  value={modalSopId}
                  onChange={(e) => setModalSopId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:outline-none focus:border-indigo-500 shadow-2xs"
                >
                  {sops.map((sop) => (
                    <option key={sop.id} value={sop.id}>
                      [{sop.id}] {sop.name} ({sop.procedures?.length || 0} 个处置步骤)
                    </option>
                  ))}
                </select>
              </div>

              {/* Chosen SOP Overview Card (Read-only procedure summary) */}
              {selectedModalSop && (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm">{selectedModalSop.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ID: {selectedModalSop.id}
                    </span>
                  </div>

                  {selectedModalSop.escalation?.target_role && (
                    <div className="text-[11px] text-slate-600 flex items-center space-x-3">
                      <span><strong>责任角色:</strong> {selectedModalSop.escalation.target_role}</span>
                      <span><strong>升级超时:</strong> {selectedModalSop.escalation.timeout_minutes} 分钟</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-700 block text-[11px]">预案包含处置流程 ({selectedModalSop.procedures?.length || 0} 步):</span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 max-h-36 overflow-y-auto">
                      {selectedModalSop.procedures?.map((step) => (
                        <li key={step.id || step.step_num} className="truncate">
                          <span className="font-medium text-slate-800">{step.action}</span>
                          {step.expected_outcome && (
                            <span className="text-slate-400 text-[10px]"> (预期: {step.expected_outcome})</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const targetSopId = modalSopId || matchingSop?.id || `RP-${ftaDoc.metadata.id}`;
                  setActiveSopModalNode(null);
                  openSopEditor(targetSopId);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>进入 SOP 处置编辑器</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveSopModalNode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveSopBinding}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存 SOP 联动绑定</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
