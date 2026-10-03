import React, { useState, useMemo, useEffect } from 'react';
import {
  FaultTreeDocument,
  FtaTreeNode,
  FtaDiagnosisConclusion,
} from '../types/fta';
import { FaultPattern } from '../types';
import { useApp } from '../context/AppContext';
import {
  getFtaDocumentForFault,
  formatFtaDocumentToYaml,
  synthesizeFtaFromSymptoms,
} from '../data/ftaRepository';
import {
  evaluateFtaLogic,
  runFtaTestSuite,
  FtaEvaluationResult,
  FtaTestSuiteSummary,
} from '../utils/ftaEngine';
import {
  GitFork,
  Network,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Flame,
  Zap,
  Activity,
  Copy,
  Download,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  ShieldAlert,
  Code,
  Check,
  X,
  Sliders,
  FileCheck2,
  Gauge,
  SlidersHorizontal,
  BellRing,
  History,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FtaPropagationGraph } from './FtaPropagationGraph';
import {
  FtaAddSymptomModal,
  FtaAddGateModal,
  FtaEditNodeModal,
} from './FtaNodeEditorModal';
import { generateFtaDocumentFromFault } from '../data/ftaRepository';

interface FtaTreeViewerProps {
  ftaDoc?: FaultTreeDocument;
  fault?: FaultPattern;
  faultId?: string;
  showFaultSelector?: boolean;
  initialTab?: 'tree' | 'simulation' | 'tests' | 'yaml';
  isEditable?: boolean;
  onUpdateFtaDoc?: (updatedDoc: FaultTreeDocument) => void;
  onOpenSop?: (sopId: string) => void;
  onOpenTestInPlayground?: (testGiven: Record<string, any>) => void;
  onClose?: () => void;
}

export const FtaTreeViewer: React.FC<FtaTreeViewerProps> = ({
  ftaDoc,
  fault,
  faultId,
  showFaultSelector = true,
  initialTab = 'tree',
  isEditable = false,
  onUpdateFtaDoc,
  onOpenSop,
  onOpenTestInPlayground,
  onClose,
}) => {
  const { faults, selectedFaultId, setSelectedFaultId, showToast, updateFault } = useApp();

  // Active fault ID resolution
  const [internalFaultId, setInternalFaultId] = useState<string>(() => {
    return faultId || (fault ? fault.id : selectedFaultId) || 'FT-ESS-CLUSTER-OVERHEAT';
  });

  useEffect(() => {
    if (faultId) {
      setInternalFaultId(faultId);
    } else if (fault?.id) {
      setInternalFaultId(fault.id);
    }
  }, [faultId, fault]);

  // Active Fault resolution
  const activeFault = useMemo(() => {
    if (fault && fault.id === internalFaultId) return fault;
    return faults.find((f) => f.id === internalFaultId);
  }, [fault, internalFaultId, faults]);

  // Base FTA Document resolution
  const rawFtaDoc: FaultTreeDocument = useMemo(() => {
    if (ftaDoc && !faultId && !fault) return ftaDoc;
    if (activeFault) {
      return getFtaDocumentForFault(activeFault, faults);
    }
    return getFtaDocumentForFault(internalFaultId, faults);
  }, [ftaDoc, fault, faultId, internalFaultId, activeFault, faults]);

  // Live mutable active FTA Document for tree structure editing
  const [activeFtaDoc, setActiveFtaDoc] = useState<FaultTreeDocument>(rawFtaDoc);

  useEffect(() => {
    setActiveFtaDoc(rawFtaDoc);
  }, [rawFtaDoc]);

  // Modals for editing FTA tree structure
  const [isAddSymptomModalOpen, setIsAddSymptomModalOpen] = useState(false);
  const [isAddGateModalOpen, setIsAddGateModalOpen] = useState(false);
  const [isEditNodeModalOpen, setIsEditNodeModalOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<FtaTreeNode | null>(null);
  const [targetParentGateId, setTargetParentGateId] = useState<string>('TOP');

  // Coverage of abnormal symptoms in FTA tree
  const symptomStats = useMemo(() => {
    const symptoms = activeFault?.symptoms || [];
    if (symptoms.length === 0) {
      return { total: 0, mapped: 0, unmapped: [], mappedRatio: 0 };
    }

    const existingObsIds = new Set(activeFtaDoc.observations.map((o) => o.id));
    const existingConditions = new Set<string>();
    activeFtaDoc.fault_tree.nodes.forEach((n) => {
      if (n.condition?.observation) {
        existingConditions.add(n.condition.observation);
      }
    });

    const mappedList: typeof symptoms = [];
    const unmappedList: typeof symptoms = [];

    symptoms.forEach((sym) => {
      const candidates = [
        sym.id,
        sym.indicator_id,
        sym.metric_code,
        sym.alarm_code,
        sym.parameter_code,
        `obs_${(sym.id || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`,
        `BE_${(sym.id || '').replace(/[^a-zA-Z0-9_]/g, '_')}`,
      ].filter(Boolean) as string[];

      const hit = candidates.some(
        (c) =>
          existingObsIds.has(c) ||
          existingConditions.has(c) ||
          activeFtaDoc.fault_tree.nodes.some((n) => n.id === c || n.id.includes(c))
      );

      if (hit) mappedList.push(sym);
      else unmappedList.push(sym);
    });

    return {
      total: symptoms.length,
      mapped: mappedList.length,
      unmapped: unmappedList,
      mappedRatio: Math.round((mappedList.length / symptoms.length) * 100),
    };
  }, [activeFault, activeFtaDoc]);

  // Existing gates available as parent
  const existingGatesList = useMemo(() => {
    const root =
      activeFtaDoc.fault_tree.nodes.find((n) => n.id === activeFtaDoc.fault_tree.root) ||
      activeFtaDoc.fault_tree.nodes[0];
    const gates = activeFtaDoc.fault_tree.nodes.filter(
      (n) =>
        n.id === root?.id ||
        n.type === 'intermediate' ||
        n.type === 'top_event' ||
        Boolean(n.gate) ||
        (n.children && n.children.length > 0)
    );
    return gates.map((g) => ({
      id: g.id,
      name: g.id === root?.id ? `${g.name} [顶事件]` : g.name,
      gate: g.gate || 'OR',
    }));
  }, [activeFtaDoc]);

  // Commit updated document and propagate
  const commitUpdatedDoc = (newDoc: FaultTreeDocument, toastMsg?: string) => {
    setActiveFtaDoc(newDoc);
    if (onUpdateFtaDoc) {
      onUpdateFtaDoc(newDoc);
    }
    if (activeFault) {
      updateFault(activeFault.id, { fta_document: newDoc });
    }
    if (toastMsg) {
      showToast(toastMsg, 'success');
    }
  };

  // 1. One-click synthesize from symptoms
  const handleSynthesizeFromSymptoms = () => {
    if (!activeFault) return;
    const synthesized = synthesizeFtaFromSymptoms(activeFault, 'by_device');
    commitUpdatedDoc(
      synthesized,
      `已成功基于当前 ${activeFault.symptoms?.length || 0} 项异常症状特征智能合成 FTA 故障树！`
    );
  };

  // 2. Add basic event from symptom
  const handleConfirmAddSymptomNode = (
    newNode: FtaTreeNode,
    newObs: any,
    parentId: string
  ) => {
    const newDoc: FaultTreeDocument = JSON.parse(JSON.stringify(activeFtaDoc));

    // Add node
    newDoc.fault_tree.nodes.push(newNode);

    // Add observation if not present
    if (!newDoc.observations.some((o) => o.id === newObs.id)) {
      newDoc.observations.push(newObs);
    }

    // Attach to parent gate
    const parentNode = newDoc.fault_tree.nodes.find((n) => n.id === parentId);
    if (parentNode) {
      parentNode.children = [...(parentNode.children || []), newNode.id];
    } else {
      const rootNode =
        newDoc.fault_tree.nodes.find((n) => n.id === newDoc.fault_tree.root) ||
        newDoc.fault_tree.nodes[0];
      if (rootNode) {
        rootNode.children = [...(rootNode.children || []), newNode.id];
      }
    }

    commitUpdatedDoc(newDoc, `已成功挂载底事件 [${newNode.name}] 至逻辑门 [${parentId}]`);
  };

  // 3. Add intermediate gate
  const handleConfirmAddGateNode = (newGate: FtaTreeNode, parentId: string) => {
    const newDoc: FaultTreeDocument = JSON.parse(JSON.stringify(activeFtaDoc));

    // Add gate
    newDoc.fault_tree.nodes.push(newGate);

    // Attach to parent gate
    const parentNode = newDoc.fault_tree.nodes.find((n) => n.id === parentId);
    if (parentNode) {
      parentNode.children = [...(parentNode.children || []), newGate.id];
    } else {
      const rootNode =
        newDoc.fault_tree.nodes.find((n) => n.id === newDoc.fault_tree.root) ||
        newDoc.fault_tree.nodes[0];
      if (rootNode) {
        rootNode.children = [...(rootNode.children || []), newGate.id];
      }
    }

    // Add conclusion if applicable
    if (!newDoc.diagnosis.conclusions.some((c) => c.when === newGate.id)) {
      newDoc.diagnosis.conclusions.push({
        id: `D_${newGate.id}`,
        when: newGate.id,
        text: `${newGate.name} 触发成立`,
        severity: activeFtaDoc.metadata.severity || 'high',
        recommendations: ['检查此分支对应设备运行工况', '执行消缺巡检规程'],
      });
    }

    commitUpdatedDoc(newDoc, `已成功创建中间逻辑门 [${newGate.name}]`);
  };

  // 4. Update node (and optional reparenting)
  const handleConfirmUpdateNode = (updatedNode: FtaTreeNode, newParentId?: string) => {
    const newDoc: FaultTreeDocument = JSON.parse(JSON.stringify(activeFtaDoc));

    // Replace node
    newDoc.fault_tree.nodes = newDoc.fault_tree.nodes.map((n) =>
      n.id === updatedNode.id ? updatedNode : n
    );

    // If reparenting requested
    if (newParentId) {
      newDoc.fault_tree.nodes.forEach((n) => {
        if (n.children && n.children.includes(updatedNode.id)) {
          n.children = n.children.filter((cId) => cId !== updatedNode.id);
        }
      });
      const targetParent = newDoc.fault_tree.nodes.find((n) => n.id === newParentId);
      if (targetParent) {
        targetParent.children = [...(targetParent.children || []), updatedNode.id];
      }
    }

    commitUpdatedDoc(newDoc, `已更新节点 [${updatedNode.name}] 属性与判据`);
  };

  // 5. Delete node
  const handleDeleteNode = (nodeId: string) => {
    const rootId = activeFtaDoc.fault_tree.root || 'TOP';
    if (nodeId === rootId || nodeId === 'TOP') {
      showToast('顶事件为根节点，不可删除', 'error');
      return;
    }

    const newDoc: FaultTreeDocument = JSON.parse(JSON.stringify(activeFtaDoc));

    newDoc.fault_tree.nodes.forEach((n) => {
      if (n.children) {
        n.children = n.children.filter((cId) => cId !== nodeId);
      }
    });

    newDoc.fault_tree.nodes = newDoc.fault_tree.nodes.filter((n) => n.id !== nodeId);
    newDoc.diagnosis.conclusions = newDoc.diagnosis.conclusions.filter((c) => c.when !== nodeId);

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(rootId);
    }

    commitUpdatedDoc(newDoc, `已从故障树中移除节点 [${nodeId}]`);
  };

  // 6. Fast toggle gate type (AND ⋀ ⟷ OR ⋁)
  const handleToggleGateType = (gateId: string) => {
    const newDoc: FaultTreeDocument = JSON.parse(JSON.stringify(activeFtaDoc));
    const target = newDoc.fault_tree.nodes.find((n) => n.id === gateId);
    if (!target) return;

    const nextGate: 'AND' | 'OR' = target.gate === 'AND' ? 'OR' : 'AND';
    target.gate = nextGate;

    commitUpdatedDoc(
      newDoc,
      `已将逻辑门 [${target.name}] 切换为 ${nextGate === 'AND' ? 'AND ⋀ (全满足)' : 'OR ⋁ (任一满足)'}`
    );
  };

  const [activeTab, setActiveTab] = useState<'tree' | 'simulation' | 'tests' | 'yaml'>(initialTab);
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeLayoutMode, setTreeLayoutMode] = useState<'split' | 'tree' | 'propagation'>('split');

  // Initialize simulation observations based on active FTA doc
  const [simObservations, setSimObservations] = useState<Record<string, any>>({});

  // Reset or initialize simulation observations when activeFtaDoc changes
  useEffect(() => {
    const firstTest = activeFtaDoc.tests?.[0];
    if (firstTest && firstTest.given && firstTest.given.observations) {
      setSimObservations(JSON.parse(JSON.stringify(firstTest.given.observations)));
    } else {
      const initialObs: Record<string, any> = {};
      activeFtaDoc.observations.forEach((obs) => {
        if (obs.type === 'metric') {
          initialObs[obs.id] = obs.id.includes('temp') ? 32 : obs.id.includes('current') ? 100 : 50;
        } else if (obs.type === 'alarm') {
          initialObs[obs.id] = 'inactive';
        } else if (obs.type === 'config') {
          initialObs[obs.id] = { mismatch: false };
        } else {
          initialObs[obs.id] = false;
        }
      });
      setSimObservations(initialObs);
    }
    setSelectedNodeId(activeFtaDoc.fault_tree.root || 'TOP');
  }, [activeFtaDoc]);

  // Automated Test Suite State
  const [testSuiteResult, setTestSuiteResult] = useState<FtaTestSuiteSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    setTestSuiteResult(runFtaTestSuite(activeFtaDoc));
  }, [activeFtaDoc]);

  // Live evaluation results
  const evaluationResult: FtaEvaluationResult = useMemo(() => {
    return evaluateFtaLogic(activeFtaDoc, simObservations);
  }, [activeFtaDoc, simObservations]);

  // Selected node object
  const selectedNode = useMemo(() => {
    return activeFtaDoc.fault_tree.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [activeFtaDoc, selectedNodeId]);

  const handleRunAllTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runFtaTestSuite(activeFtaDoc);
      setTestSuiteResult(res);
      setIsRunningTests(false);
      if (res.passRate === 100) {
        try {
          confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    }, 250);
  };

  const topNode = activeFtaDoc.fault_tree.nodes.find((n) => n.id === activeFtaDoc.fault_tree.root) || activeFtaDoc.fault_tree.nodes[0];
  const causeNodes = (topNode?.children || []).map((id) =>
    activeFtaDoc.fault_tree.nodes.find((n) => n.id === id)
  ).filter(Boolean) as FtaTreeNode[];

  // Categorize observations
  const metricObs = activeFtaDoc.observations.filter((o) => o.type === 'metric');
  const alarmObs = activeFtaDoc.observations.filter((o) => o.type === 'alarm');
  const configObs = activeFtaDoc.observations.filter((o) => o.type === 'config');
  const logWaveformObs = activeFtaDoc.observations.filter((o) => o.type === 'log' || o.type === 'waveform');

  const yamlContent = useMemo(() => formatFtaDocumentToYaml(activeFtaDoc), [activeFtaDoc]);

  const renderLogicTreeHierarchy = () => (
    <div className="space-y-6">
      {/* 1. SYMPTOM-DRIVEN MAPPING & TREE EDITING TOOLBAR */}
      <div className="p-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm space-y-3 border border-indigo-950/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </span>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h4 className="text-xs font-bold text-white tracking-wide">
                  异常症状特征 ➔ FTA 故障树构建引擎
                </h4>
                {symptomStats.total > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      symptomStats.mappedRatio === 100
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : symptomStats.mappedRatio > 50
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    特征对齐率 {symptomStats.mapped}/{symptomStats.total} ({symptomStats.mappedRatio}%)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                支持直接将已录入的 5D 时序测点、告警事件与配置定值映射为故障树判定底事件，或一键智能重构
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSynthesizeFromSymptoms}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="根据当前录入的全部异常症状特征，自动按设备/机制合成标准 FTA 树"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-200" />
              <span>智能根据特征重构树</span>
            </button>

            <button
              onClick={() => {
                setTargetParentGateId(existingGatesList[1]?.id || 'TOP');
                setIsAddSymptomModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="选择异常症状特征添加为底事件"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>挂载特征底事件</span>
            </button>

            <button
              onClick={() => {
                setTargetParentGateId('TOP');
                setIsAddGateModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="新增中间逻辑门分支"
            >
              <GitFork className="w-3.5 h-3.5 text-blue-400 transform -rotate-45" />
              <span>新增逻辑门</span>
            </button>

            <button
              onClick={() => commitUpdatedDoc(activeFtaDoc, 'FTA 故障树结构已成功保存')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="保存当前故障树"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存架构</span>
            </button>
          </div>
        </div>

        {/* Unmapped Symptoms Quick Chips */}
        {symptomStats.unmapped.length > 0 && (
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>待映射特征 ({symptomStats.unmapped.length}):</span>
            </span>
            {symptomStats.unmapped.map((sym) => (
              <button
                key={sym.id}
                onClick={() => {
                  setTargetParentGateId(existingGatesList[1]?.id || 'TOP');
                  setIsAddSymptomModalOpen(true);
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-indigo-900/60 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-500 text-[11px] flex items-center space-x-1 transition cursor-pointer"
                title={`点击快速将此特征挂载入故障树: ${sym.metric_name || sym.alarm_name}`}
              >
                <Plus className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate max-w-[150px] font-medium">
                  {sym.device_name ? `[${sym.device_name}] ` : ''}
                  {sym.metric_name || sym.alarm_name || sym.parameter_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TOP EVENT (Root) */}
      <div className="flex flex-col items-center">
        <div
          onClick={() => setSelectedNodeId(topNode.id)}
          className={`p-4.5 rounded-2xl border-2 cursor-pointer transition-all max-w-lg w-full text-center relative group ${
            selectedNodeId === topNode.id
              ? 'border-slate-900 bg-slate-900 text-white shadow-md'
              : 'border-rose-300 bg-rose-50/70 hover:border-rose-500 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
            <span className="font-bold opacity-80 uppercase tracking-wide">TOP EVENT [顶事件]</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGateType(topNode.id);
                }}
                className="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition cursor-pointer shadow-2xs"
                title="点击切换顶事件逻辑门体系 (AND ⋀ / OR ⋁)"
              >
                {topNode.gate || 'OR'} 门 {topNode.gate === 'AND' ? '⋀' : '⋁'}
              </button>
            </div>
          </div>
          <h3 className="font-black text-base tracking-tight">{topNode.name}</h3>
          <div className="text-xs opacity-75 mt-0.5 font-mono">{topNode.id}</div>

          {/* Quick Node Actions Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-center space-x-2 text-[11px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTargetParentGateId(topNode.id);
                setIsAddSymptomModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-800 border border-slate-300 font-semibold flex items-center space-x-1 shadow-2xs transition cursor-pointer"
              title="在顶事件下直接挂载异常症状底事件"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>挂载特征</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setTargetParentGateId(topNode.id);
                setIsAddGateModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-800 border border-slate-300 font-semibold flex items-center space-x-1 shadow-2xs transition cursor-pointer"
              title="在顶事件下添加逻辑门分支"
            >
              <GitFork className="w-3 h-3 text-blue-600 transform -rotate-45" />
              <span>添加逻辑门</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setNodeToEdit(topNode);
                setIsEditNodeModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-800 border border-slate-300 font-semibold flex items-center space-x-1 shadow-2xs transition cursor-pointer"
              title="编辑顶事件名称与输出结论"
            >
              <Edit3 className="w-3 h-3 text-slate-600" />
              <span>编辑</span>
            </button>
          </div>
        </div>

        {/* Connecting Line Downward */}
        <div className="w-0.5 h-7 bg-slate-300 my-0" />
        <div className="w-11/12 h-0.5 bg-slate-300 mb-6" />
      </div>

      {/* LEVEL 1: Intermediate Cause Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {causeNodes.map((cause) => {
          const isSelected = selectedNodeId === cause.id;
          const isTriggered = evaluationResult.nodeStates[cause.id];
          const childNodeObjs = (cause.children || []).map((cId) =>
            activeFtaDoc.fault_tree.nodes.find((n) => n.id === cId) ||
            activeFtaDoc.shared_events?.find((se) => se.id === cId)
          ).filter(Boolean);

          return (
            <div
              key={cause.id}
              className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
              }`}
            >
              {/* Cause Header */}
              <div
                onClick={() => setSelectedNodeId(cause.id)}
                className="cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGateType(cause.id);
                      }}
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 transition cursor-pointer"
                      title="点击快速切换 AND ⋀ / OR ⋁"
                    >
                      {cause.gate || 'AND'} 门 {cause.gate === 'OR' ? '⋁' : '⋀'}
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (权重: {cause.weight ?? 1.0})
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isTriggered
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isTriggered ? '● 门逻辑命中' : '○ 未触发'}
                    </span>

                    {/* Node Actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNodeToEdit(cause);
                        setIsEditNodeModalOpen(true);
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      title="编辑逻辑门"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(cause.id);
                      }}
                      className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="删除此逻辑门分支"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900">{cause.name}</h4>
                  <div className="text-[10px] font-mono text-slate-400">{cause.id}</div>
                </div>
              </div>

              {/* Sub-Events (Basic / Shared / Aggregate / Rules) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    子事件与判据条件 ({childNodeObjs.length})
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setTargetParentGateId(cause.id);
                        setIsAddSymptomModalOpen(true);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center space-x-0.5 transition cursor-pointer"
                      title="从异常症状特征添加底事件到本逻辑门"
                    >
                      <Plus className="w-3 h-3" />
                      <span>挂载特征</span>
                    </button>
                    <button
                      onClick={() => {
                        setTargetParentGateId(cause.id);
                        setIsAddGateModalOpen(true);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center space-x-0.5 transition cursor-pointer"
                      title="在此门下新增子逻辑门"
                    >
                      <GitFork className="w-3 h-3 transform -rotate-45" />
                      <span>子门</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {childNodeObjs.length === 0 ? (
                    <div className="p-3 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      暂无子事件，点击上方【挂载特征】添加
                    </div>
                  ) : (
                    childNodeObjs.map((child: any) => {
                      const isChildSelected = selectedNodeId === child.id;
                      const isChildTriggered =
                        evaluationResult.nodeStates[child.id] ||
                        evaluationResult.sharedEventStates[child.id];

                      return (
                        <div
                          key={child.id}
                          onClick={() => setSelectedNodeId(child.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                            isChildSelected
                              ? 'border-slate-800 bg-slate-900 text-white'
                              : isChildTriggered
                              ? 'border-amber-300 bg-amber-50/80 text-amber-950 font-medium'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="truncate mr-2 flex-1">
                            <div className="flex items-center space-x-1.5 truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isChildTriggered ? 'bg-rose-500' : 'bg-slate-300'
                                }`}
                              />
                              <span className="font-medium truncate">{child.name}</span>
                            </div>
                            <span
                              className={`text-[10px] font-mono block truncate ${
                                isChildSelected ? 'text-slate-400' : 'text-slate-400'
                              }`}
                            >
                              {child.id} • {child.type || 'basic'}
                              {child.condition &&
                                ` [${child.condition.observation} ${child.condition.operator} ${
                                  child.condition.value !== undefined ? child.condition.value : ''
                                }]`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                                isChildSelected
                                  ? 'bg-slate-800 text-slate-200'
                                  : isChildTriggered
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isChildTriggered ? 'TRUE' : 'FALSE'}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNodeToEdit(child);
                                setIsEditNodeModalOpen(true);
                              }}
                              className={`p-1 rounded transition ${
                                isChildSelected
                                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                              }`}
                              title="编辑此节点判据"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(child.id);
                              }}
                              className={`p-1 rounded transition ${
                                isChildSelected
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title="移除此节点"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderNodeInspectorCard = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-slate-700" />
          <h4 className="font-bold text-sm text-slate-900">节点属性与观测判据详情</h4>
        </div>
        <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600">
          {selectedNode?.type || 'node'}
        </span>
      </div>

      {selectedNode ? (
        <div className="space-y-4 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">节点唯一标识 (ID):</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{selectedNode.id}</span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">节点名称:</span>
            <span className="font-bold text-slate-900 text-sm">{selectedNode.name}</span>
          </div>

          {selectedNode.gate && (
            <div>
              <span className="text-slate-400 text-[11px] block">逻辑门类型 (Gate):</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-mono font-bold text-blue-700">
                  {selectedNode.gate === 'AND'
                    ? '⋀ AND 门 (全子事件同时满足)'
                    : '⋁ OR 门 (任一子事件满足)'}
                </span>
                <button
                  onClick={() => handleToggleGateType(selectedNode.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition cursor-pointer"
                  title="一键切换 AND / OR"
                >
                  切换门
                </button>
              </div>
            </div>
          )}

          {selectedNode.children && selectedNode.children.length > 0 && (
            <div>
              <span className="text-slate-400 text-[11px] block">下游子事件清单:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedNode.children.map((cId) => (
                  <span
                    key={cId}
                    onClick={() => setSelectedNodeId(cId)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer transition"
                  >
                    {cId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conditions Details */}
          {selectedNode.condition && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-[11px]">判定条件 (Condition):</span>
              <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedNode.condition, null, 2)}
              </pre>
            </div>
          )}

          {/* Output conclusion if top event */}
          {selectedNode.output && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-rose-950">
              <span className="font-bold text-[11px] block">触发结论 (Output Conclusion):</span>
              <p className="font-bold">{selectedNode.output.conclusion}</p>
              <div className="text-[10px] font-mono text-rose-700">
                严重度: {selectedNode.output.severity} • 置信度阈值:{' '}
                {selectedNode.output.confidence?.threshold}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">当前真值状态:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded ${
                evaluationResult.nodeStates[selectedNode.id]
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {evaluationResult.nodeStates[selectedNode.id] ? 'TRUE (已触发)' : 'FALSE (未触发)'}
            </span>
          </div>

          {/* Quick Node Actions in Inspector */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => {
                setNodeToEdit(selectedNode);
                setIsEditNodeModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>编辑此节点属性与判据</span>
            </button>

            {selectedNode.id !== (activeFtaDoc.fault_tree.root || 'TOP') &&
              selectedNode.id !== 'TOP' && (
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>从树中移除</span>
                </button>
              )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-xs">
          点击逻辑门树或右侧故障传播图中任意节点查看属性详情与编辑
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner with Integrated Fault Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold flex items-center space-x-1.5 shadow-2xs">
                <GitFork className="w-3.5 h-3.5 transform -rotate-45" />
                <span>FTA 工业级故障树标准 (FAT/FTA)</span>
              </span>

              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                activeFtaDoc.metadata.severity === 'critical'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : activeFtaDoc.metadata.severity === 'high'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {activeFtaDoc.metadata.severity.toUpperCase()} 等级
              </span>

              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200">
                {activeFtaDoc.apiVersion} • kind: {activeFtaDoc.kind}
              </span>

              {showFaultSelector && (
                <div className="ml-2 flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400">切换故障模型:</span>
                  <select
                    value={internalFaultId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setInternalFaultId(newId);
                      if (setSelectedFaultId) setSelectedFaultId(newId);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-500"
                  >
                    <option value="FT-ESS-CLUSTER-OVERHEAT">【标准】储能电池簇过热故障 (FT-ESS-CLUSTER-OVERHEAT)</option>
                    {faults.filter((f) => f.id !== 'FT-ESS-CLUSTER-OVERHEAT').map((f) => (
                      <option key={f.id} value={f.id}>
                        [{f.id}] {f.name} ({f.severity})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>{activeFtaDoc.metadata.name}</span>
              </h1>
              <span className="text-xs font-mono text-slate-400">
                [ID: {activeFtaDoc.metadata.id} v{activeFtaDoc.metadata.version}]
              </span>
            </div>

            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              {activeFtaDoc.metadata.description || '工业标准故障树分析（Boolean Logic Gates 门体系：AND 门 ⋀、OR 门 ⋁、最小割集 MCS、多源观测映射与自动化验证测试套件）'}
            </p>
          </div>

          {/* Action Tabs Bar */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('tree')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'tree'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>逻辑门树图</span>
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'simulation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>真值动态推演</span>
              {evaluationResult.topEventTriggered && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'tests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>自动化测试 ({activeFtaDoc.tests?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('yaml')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'yaml'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>原生 YAML</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: Visual Logic Gate Tree & Fault Propagation Graph */}
      {activeTab === 'tree' && (
        <div className="space-y-6">
          {/* Tree & Propagation Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-800 flex items-center space-x-1">
                <span>视图布局:</span>
              </span>

              {/* Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setTreeLayoutMode('split')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                    treeLayoutMode === 'split'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="左侧逻辑门树 ⟷ 右侧故障传播图并排对照"
                >
                  <Network className="w-3.5 h-3.5 text-indigo-600" />
                  <span>双图并排对照 (逻辑门树 ⟷ 故障传播图)</span>
                </button>

                <button
                  onClick={() => setTreeLayoutMode('tree')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                    treeLayoutMode === 'tree'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="仅查看 FTA 逻辑门树"
                >
                  <GitFork className="w-3.5 h-3.5 text-blue-600 transform -rotate-45" />
                  <span>仅逻辑门树</span>
                </button>

                <button
                  onClick={() => setTreeLayoutMode('propagation')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                    treeLayoutMode === 'propagation'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="仅查看故障传播图"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span>仅故障传播图</span>
                </button>
              </div>
            </div>

            {/* Logic Gates Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold">
                <span>⋀ AND 门</span>
                <span className="text-[10px] font-normal font-sans">(全满足)</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold">
                <span>⋁ OR 门</span>
                <span className="text-[10px] font-normal font-sans">(任一触发)</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                <span>基本事件</span>
              </span>
            </div>
          </div>

          {/* DUAL MODE 1: SPLIT SIDE-BY-SIDE (逻辑门树 ⟷ 故障传播图并排) */}
          {treeLayoutMode === 'split' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left: Logic Gate Tree */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs overflow-x-auto space-y-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        <GitFork className="w-3.5 h-3.5 transform -rotate-45" />
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        FTA 逻辑门树 (Boolean Logic Gates)
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      Top-Down 演绎结构
                    </span>
                  </div>

                  {renderLogicTreeHierarchy()}
                </div>

                {/* Right: Fault Propagation Graph */}
                <div className="space-y-3">
                  <FtaPropagationGraph
                    ftaDoc={activeFtaDoc}
                    simObservations={simObservations}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    compact={true}
                  />
                </div>
              </div>

              {/* Node Inspector Card below */}
              {renderNodeInspectorCard()}
            </div>
          )}

          {/* DUAL MODE 2: TREE ONLY */}
          {treeLayoutMode === 'tree' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs overflow-x-auto space-y-8">
                {renderLogicTreeHierarchy()}
              </div>
              <div className="lg:col-span-4">
                {renderNodeInspectorCard()}
              </div>
            </div>
          )}

          {/* DUAL MODE 3: PROPAGATION GRAPH ONLY */}
          {treeLayoutMode === 'propagation' && (
            <div className="space-y-6">
              <FtaPropagationGraph
                ftaDoc={activeFtaDoc}
                simObservations={simObservations}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                compact={false}
              />
              {renderNodeInspectorCard()}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Real-time Live Simulation Engine */}
      {activeTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Multi-Source Observation Injector */}
          <div className="lg:col-span-6 xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-slate-700" />
                  <span>观测信号多源注入面板</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  动态调节测点指标、告警开关、静态定值与录波，实时推演真值表
                </p>
              </div>

              <button
                onClick={() => {
                  const resetObs: Record<string, any> = {};
                  activeFtaDoc.observations.forEach((o) => {
                    if (o.type === 'metric') resetObs[o.id] = 25;
                    else if (o.type === 'alarm') resetObs[o.id] = 'inactive';
                    else if (o.type === 'config') resetObs[o.id] = { mismatch: false };
                    else resetObs[o.id] = false;
                  });
                  setSimObservations(resetObs);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                title="重置为正常健康工况"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置健康</span>
              </button>
            </div>

            {/* Quick Test Presets */}
            {activeFtaDoc.tests && activeFtaDoc.tests.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  一键载入标准测试工况:
                </span>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {activeFtaDoc.tests.map((test, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSimObservations(JSON.parse(JSON.stringify(test.given.observations)))}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 font-semibold text-left transition flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{test.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">用例 #{idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Observation Controls */}
            <div className="space-y-4 pt-2 border-t border-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {/* 1. Metric Sliders */}
              {metricObs.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-blue-700 flex items-center space-x-1">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>连续测点指标 (Metrics)</span>
                  </span>

                  {metricObs.map((m) => {
                    const currentVal = simObservations[m.id] ?? 30;
                    const isStringState = typeof currentVal === 'string' && (currentVal === 'ON' || currentVal === 'OFF');

                    if (isStringState) {
                      return (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <div className="font-semibold text-slate-800">{m.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.id}</div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setSimObservations({ ...simObservations, [m.id]: 'ON' })}
                              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                simObservations[m.id] === 'ON' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              ON (运行)
                            </button>
                            <button
                              onClick={() => setSimObservations({ ...simObservations, [m.id]: 'OFF' })}
                              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                simObservations[m.id] === 'OFF' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              OFF (停运)
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const numVal = Number(currentVal) || 0;
                    const maxBound = m.id.includes('current') ? 350 : m.id.includes('temp') ? 95 : m.id.includes('diff') ? 250 : 200;

                    return (
                      <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-800">{m.name} ({m.id})</span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {numVal} {m.selector.unit || ''}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={maxBound}
                          step="1"
                          value={numVal}
                          onChange={(e) =>
                            setSimObservations({ ...simObservations, [m.id]: Number(e.target.value) })
                          }
                          className="w-full accent-slate-900"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Alarm Checkboxes */}
              {alarmObs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-amber-700 flex items-center space-x-1">
                    <BellRing className="w-3.5 h-3.5" />
                    <span>系统离散告警 (Alarms)</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {alarmObs.map((a) => (
                      <label key={a.id} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simObservations[a.id] === 'active'}
                          onChange={(e) =>
                            setSimObservations({
                              ...simObservations,
                              [a.id]: e.target.checked ? 'active' : 'inactive',
                            })
                          }
                          className="rounded border-slate-300 text-slate-900"
                        />
                        <span className="text-[11px] font-medium text-slate-800 truncate" title={a.name}>
                          {a.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Config Parameter Comparison */}
              {configObs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-indigo-700 flex items-center space-x-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>静态参数比对校验 (Configs)</span>
                  </span>

                  {configObs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.id}</div>
                      </div>
                      <button
                        onClick={() => {
                          const curr = simObservations[c.id];
                          const isMis = curr?.mismatch === true || curr === 'mismatch';
                          setSimObservations({
                            ...simObservations,
                            [c.id]: isMis ? { mismatch: false } : { mismatch: true },
                          });
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          simObservations[c.id]?.mismatch === true
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {simObservations[c.id]?.mismatch === true ? '定值偏离/不符' : '基线一致 (正常)'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Log & Waveform Triggers */}
              {logWaveformObs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                    <History className="w-3.5 h-3.5" />
                    <span>SOE 日志与故障录波 (Logs & Waveforms)</span>
                  </span>

                  {logWaveformObs.map((lw) => (
                    <label key={lw.id} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(simObservations[lw.id])}
                        onChange={(e) =>
                          setSimObservations({
                            ...simObservations,
                            [lw.id]: e.target.checked
                              ? (lw.type === 'waveform' ? { rms_current: 280, thd_current: 0.15 } : { action: 'trip' })
                              : undefined,
                          })
                        }
                        className="rounded border-slate-300 text-slate-900"
                      />
                      <span className="text-[11px] font-medium text-slate-800 truncate" title={lw.name}>
                        {lw.name} ({lw.type === 'waveform' ? '录波异常' : '保护跳闸日志'})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Real-Time Diagnostic Reasoning Report & MCS */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            {/* Status Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              evaluationResult.topEventTriggered
                ? 'bg-rose-50/80 border-rose-200 text-rose-950 shadow-xs'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-xs'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    evaluationResult.topEventTriggered
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {evaluationResult.topEventTriggered ? 'FTA 顶事件已激活' : '全系统受控运行'}
                  </span>
                  <h3 className="text-xl font-bold mt-2">
                    {evaluationResult.topEventTriggered
                      ? `已触发：${activeFtaDoc.metadata.name} (${activeFtaDoc.metadata.id})`
                      : '正常：未达到故障树激活逻辑阈值'}
                  </h3>
                  <p className="text-xs mt-1 text-slate-600">
                    逻辑推理耗时: &lt; 1ms • 推演时间戳: {evaluationResult.executionTimestamp}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black font-mono">
                    {evaluationResult.confidence}%
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">综合诊断置信度</span>
                </div>
              </div>
            </div>

            {/* Matched Conclusions & Recommendations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>命中确诊结论与处置建议 ({evaluationResult.matchedConclusions.length})</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  来自 diagnosis.conclusions
                </span>
              </h4>

              {evaluationResult.matchedConclusions.length > 0 ? (
                <div className="space-y-3">
                  {evaluationResult.matchedConclusions.map((concl) => (
                    <div
                      key={concl.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            concl.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {concl.severity.toUpperCase()}
                          </span>
                          <span className="font-bold text-sm text-slate-900">{concl.text}</span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">{concl.id}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">规程处置 SOP 步骤:</span>
                        <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5 pl-1">
                          {concl.recommendations.map((rec, rIdx) => (
                            <li key={rIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  暂无匹配的故障结论，系统工况在基线允许安全范围内
                </div>
              )}
            </div>

            {/* Minimal Cut Sets (MCS) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>最小割集 (Minimal Cut Sets - MCS)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  命中 {evaluationResult.matchedMcs.length} / {activeFtaDoc.diagnosis.mcs_matched?.length || 0} 组
                </span>
              </h4>

              <div className="space-y-2">
                {(activeFtaDoc.diagnosis.mcs_matched || []).map((cutSet, idx) => {
                  const isCutSetHit = evaluationResult.matchedMcs.some(
                    (m) => m.length === cutSet.length && m.every((item) => cutSet.includes(item))
                  );

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                        isCutSetHit
                          ? 'border-purple-300 bg-purple-50 text-purple-950 font-medium'
                          : 'border-slate-100 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border">
                          割集 #{idx + 1}
                        </span>
                        <span className="font-mono text-xs truncate">
                          {cutSet.join(' ⋀ ')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isCutSetHit ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isCutSetHit ? '割集激活' : '未满足'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Automated Test Verification Suite */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <span>FTA 内置自动化验证测试套件 (Test Suite)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  对应 YAML 顶层 tests 定义，执行故障树全逻辑门真值表回归验证，确保 0 误判与逻辑自洽
                </p>
              </div>

              <button
                onClick={handleRunAllTests}
                disabled={isRunningTests}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : 'fill-current'}`} />
                <span>{isRunningTests ? '正在执行回归...' : `一键运行全部 ${activeFtaDoc.tests?.length || 0} 项测试`}</span>
              </button>
            </div>

            {/* Test Summary Cards */}
            {testSuiteResult && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block">测试用例总计</span>
                  <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                    {testSuiteResult.total}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="text-emerald-700 block font-medium">通过用例</span>
                  <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
                    {testSuiteResult.passed}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block">失败用例</span>
                  <span className="text-2xl font-bold font-mono text-slate-700 mt-1 block">
                    {testSuiteResult.failed}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                  <span className="text-blue-700 block font-medium">回归通过率</span>
                  <span className="text-2xl font-bold font-mono text-blue-700 mt-1 block">
                    {testSuiteResult.passRate}%
                  </span>
                </div>
              </div>
            )}

            {/* Test Cases Table */}
            <div className="space-y-4">
              {(activeFtaDoc.tests || []).map((t, idx) => {
                const resItem = testSuiteResult?.results.find((r) => r.name === t.name);
                const isPassed = resItem ? resItem.passed : true;

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-bold">
                          #{idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        {resItem && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {resItem.latencyMs}ms
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPassed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          <span>{isPassed ? 'PASSED 校验通过' : 'FAILED'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Inputs & Outputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          GIVEN 输入观测条件:
                        </span>
                        <pre className="font-mono text-[11px] text-slate-800 overflow-x-auto">
                          {JSON.stringify(t.given.observations, null, 2)}
                        </pre>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            EXPECT 预期结论:
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {t.expect.conclusions.join(', ')}
                          </span>
                        </div>

                        {resItem && (
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                              ACTUAL 实际推演命中结论:
                            </span>
                            <span className="font-mono font-bold text-xs text-emerald-700">
                              {resItem.actualConclusions.join(', ') || '未命中'}
                            </span>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setSimObservations(t.given.observations);
                              setActiveTab('simulation');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                          >
                            <span>载入仿真器单步推演</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: Raw YAML Spec */}
      {activeTab === 'yaml' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">原生标准 FTA 声明式 YAML 规范</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                严格遵循 apiVersion: diag.example.com/v1, kind: FaultTree 规范标准，支持版本化留存与资产导入导出
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yamlContent);
                  showToast('已复制 FTA 故障树 YAML 内容至剪贴板', 'success');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制 YAML</span>
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeFtaDoc.metadata.id}_fta.yaml`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showToast(`已导出 ${activeFtaDoc.metadata.id}_fta.yaml`, 'success');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载 YAML</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 overflow-x-auto leading-relaxed max-h-[600px] select-text whitespace-pre">
            {yamlContent}
          </pre>
        </div>
      )}

      {/* 5. Modals for Editing FTA Tree Structure through Symptom Features */}
      <FtaAddSymptomModal
        isOpen={isAddSymptomModalOpen}
        onClose={() => setIsAddSymptomModalOpen(false)}
        faultSymptoms={activeFault?.symptoms || []}
        existingGates={existingGatesList}
        defaultParentId={targetParentGateId}
        onConfirm={handleConfirmAddSymptomNode}
      />

      <FtaAddGateModal
        isOpen={isAddGateModalOpen}
        onClose={() => setIsAddGateModalOpen(false)}
        existingGates={existingGatesList}
        defaultParentId={targetParentGateId}
        onConfirm={handleConfirmAddGateNode}
      />

      <FtaEditNodeModal
        isOpen={isEditNodeModalOpen}
        onClose={() => {
          setIsEditNodeModalOpen(false);
          setNodeToEdit(null);
        }}
        node={nodeToEdit}
        existingGates={existingGatesList}
        currentParentId={
          existingGatesList.find((g) => {
            const parent = activeFtaDoc.fault_tree.nodes.find((n) => n.id === g.id);
            return parent?.children?.includes(nodeToEdit?.id || '');
          })?.id || 'TOP'
        }
        onConfirm={handleConfirmUpdateNode}
        onDelete={handleDeleteNode}
      />
    </div>
  );
};
