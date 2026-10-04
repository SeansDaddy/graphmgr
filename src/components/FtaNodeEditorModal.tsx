import React, { useState, useEffect, useMemo } from 'react';
import { FtaTreeNode, FtaObservation, FtaLogicGate } from '../types/fta';
import { FaultSymptom } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  Plus,
  GitFork,
  Sliders,
  BellRing,
  Activity,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Info,
  FileText,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

// ================= 1. 从异常症状特征添加/绑定底事件弹窗 =================
interface FtaAddSymptomModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultSymptoms?: FaultSymptom[];
  existingGates: { id: string; name: string; gate?: string }[];
  defaultParentId?: string;
  onConfirm: (newNode: FtaTreeNode, newObservation: FtaObservation, parentId: string) => void;
}

export const FtaAddSymptomModal: React.FC<FtaAddSymptomModalProps> = ({
  isOpen,
  onClose,
  faultSymptoms = [],
  existingGates = [],
  defaultParentId,
  onConfirm,
}) => {
  const [selectedSymptomId, setSelectedSymptomId] = useState<string>('');
  const [selectedParentId, setSelectedParentId] = useState<string>(() => {
    return defaultParentId || (existingGates[0]?.id ?? 'TOP');
  });

  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [obsId, setObsId] = useState('');
  const [obsType, setObsType] = useState<'metric' | 'alarm' | 'config' | 'log' | 'waveform'>('metric');
  const [operator, setOperator] = useState<'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne' | 'active' | 'exists'>('gt');
  const [thresholdValue, setThresholdValue] = useState<string>('50');
  const [forDuration, setForDuration] = useState<string>('3s');
  const [withinWindow, setWithinWindow] = useState<string>('5m');

  // When defaultParentId changes
  useEffect(() => {
    if (defaultParentId) {
      setSelectedParentId(defaultParentId);
    } else if (existingGates.length > 0 && !selectedParentId) {
      setSelectedParentId(existingGates[0].id);
    }
  }, [defaultParentId, existingGates]);

  // When a symptom is picked from the list, auto-fill form
  const handlePickSymptom = (sym: FaultSymptom) => {
    setSelectedSymptomId(sym.id);
    const safeObsId =
      sym.metric_code ||
      sym.alarm_code ||
      sym.parameter_code ||
      `obs_${sym.id.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    setNodeId(`BE_${sym.id.replace(/[^a-zA-Z0-9_]/g, '_')}`);
    setNodeName(`${sym.device_name ? `[${sym.device_name}] ` : ''}${sym.metric_name || sym.alarm_name || sym.parameter_name || '异常特征'}`);
    setObsId(safeObsId);

    if (sym.type === 'alarm') {
      setObsType('alarm');
      setOperator('active');
      setThresholdValue('active');
    } else if (sym.type === 'parameter') {
      setObsType('config');
      setOperator('eq');
      setThresholdValue(String(sym.abnormal_value || 'manual'));
    } else {
      setObsType('metric');
      const isLow =
        sym.condition_operator === '<' ||
        sym.direction === 'down' ||
        sym.direction === 'abnormal_low' ||
        sym.trend === 'DOWN' ||
        sym.trend === 'REVERSAL_DOWN';
      setOperator(isLow ? 'lt' : 'gt');
      const matchNum = sym.normal_range ? sym.normal_range.match(/[-+]?\d*\.?\d+/g) : null;
      const parsedVal = matchNum && matchNum.length > 0 ? (isLow ? matchNum[0] : matchNum[matchNum.length - 1]) : '50';
      setThresholdValue(parsedVal);
    }

    setForDuration('3s');
    setWithinWindow(sym.time_window || '5m');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim()) return;

    const finalNodeId = nodeId.trim() || `BE_${Date.now()}`;
    const finalObsId = obsId.trim() || `obs_${Date.now()}`;

    const numVal = Number(thresholdValue);
    const finalValue = !isNaN(numVal) && thresholdValue !== '' ? numVal : thresholdValue;

    const newNode: FtaTreeNode = {
      id: finalNodeId,
      name: nodeName.trim(),
      type: 'basic',
      condition: {
        observation: finalObsId,
        operator: operator,
        value: operator === 'active' || operator === 'exists' ? undefined : finalValue,
        for: forDuration ? forDuration : undefined,
        within: withinWindow ? withinWindow : undefined,
      },
    };

    const newObservation: FtaObservation = {
      id: finalObsId,
      name: nodeName.trim(),
      type: obsType,
      selector: {
        asset_id: '${asset.id}',
        point_id: finalObsId,
        point_type: obsType === 'alarm' ? 'digital' : 'analog',
      },
      query: { range: withinWindow || '5m', aggregation: 'latest' },
    };

    onConfirm(newNode, newObservation, selectedParentId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">从异常症状特征添加 FTA 底事件</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                直接选择故障建模中已定义的异常特征指标/告警，将其绑定为故障树判定叶节点
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Pick from existing Symptoms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                <span>1. 选择来源异常症状特征 ({faultSymptoms.length})</span>
                <span className="text-[10px] text-indigo-600 font-normal">点击快速填充判定条件</span>
              </label>
            </div>

            {faultSymptoms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                {faultSymptoms.map((sym) => {
                  const isSelected = selectedSymptomId === sym.id;
                  return (
                    <div
                      key={sym.id}
                      onClick={() => handlePickSymptom(sym)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-400 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded">
                          {sym.type === 'alarm' ? '告警' : sym.type === 'parameter' ? '配置' : '指标'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">{sym.id}</span>
                      </div>
                      <div className="font-bold text-slate-900 mt-1 truncate" title={sym.metric_name || sym.alarm_name}>
                        {sym.metric_name || sym.alarm_name || sym.parameter_name || '异常特征'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {sym.device_name || '设备'} • {sym.trigger_condition || sym.deviation_desc || sym.normal_range || (sym.direction === 'down' ? '偏低越限' : '偏高越限')}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                提示：当前故障模式尚未录入异常症状特征，您可以直接在下方手动定义底事件判据。
              </div>
            )}
          </div>

          {/* Step 2: Target Parent Gate Selection */}
          <div>
            <label className="font-bold text-slate-900 block mb-1.5">
              2. 挂载到的目标父逻辑门 (Parent Gate) *
            </label>
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              {existingGates.map((gate) => (
                <option key={gate.id} value={gate.id}>
                  [{gate.id}] {gate.name} ({gate.gate || 'OR'} 门)
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Node details */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
              3. 底事件节点与判定算子配置
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1">节点名称 (Node Name) *</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  placeholder="例如: 冷却液流量骤降越限"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">节点标识 (Node ID)</label>
                <input
                  type="text"
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  placeholder="例如: BE_COOLANT_FLOW_LOW"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-600 block mb-1">观测特征类型</label>
                <select
                  value={obsType}
                  onChange={(e) => setObsType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="metric">遥测指标 (Metric)</option>
                  <option value="alarm">告警事件 (Alarm)</option>
                  <option value="config">定值配置 (Config)</option>
                  <option value="log">时序日志 (Log)</option>
                  <option value="waveform">录波瞬态 (Waveform)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">比较算子 (Operator)</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gt">&gt; 大于</option>
                  <option value="lt">&lt; 小于</option>
                  <option value="gte">&gt;= 大于等于</option>
                  <option value="lte">&lt;= 小于等于</option>
                  <option value="eq">== 等于</option>
                  <option value="ne">!= 不等于</option>
                  <option value="active">active 激活 (告警)</option>
                  <option value="exists">exists 存在 (日志/特征)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">阈值/判定值 (Value)</label>
                <input
                  type="text"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  placeholder="例如: 50 或 active"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1">持续越限时长 (for)</label>
                <input
                  type="text"
                  value={forDuration}
                  onChange={(e) => setForDuration(e.target.value)}
                  placeholder="例如: 3s 或 1m"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">回溯时间窗口 (within)</label>
                <input
                  type="text"
                  value={withinWindow}
                  onChange={(e) => setWithinWindow(e.target.value)}
                  placeholder="例如: 5m 或 30m"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>确认添加到底事件</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================= 2. 添加中间逻辑门弹窗 =================
interface FtaAddGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGates: { id: string; name: string }[];
  defaultParentId?: string;
  onConfirm: (newGateNode: FtaTreeNode, parentId: string) => void;
}

export const FtaAddGateModal: React.FC<FtaAddGateModalProps> = ({
  isOpen,
  onClose,
  existingGates = [],
  defaultParentId,
  onConfirm,
}) => {
  const [gateId, setGateId] = useState('');
  const [gateName, setGateName] = useState('');
  const [gateType, setGateType] = useState<FtaLogicGate>('AND');
  const [weight, setWeight] = useState('1.0');
  const [parentId, setParentId] = useState<string>(() => defaultParentId || existingGates[0]?.id || 'TOP');

  useEffect(() => {
    if (defaultParentId) setParentId(defaultParentId);
  }, [defaultParentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateName.trim()) return;

    const finalId = gateId.trim() || `GATE_${Date.now()}`;
    const newGate: FtaTreeNode = {
      id: finalId,
      name: gateName.trim(),
      type: 'intermediate',
      gate: gateType,
      weight: parseFloat(weight) || 1.0,
      children: [],
    };

    onConfirm(newGate, parentId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <GitFork className="w-4 h-4 transform -rotate-45" />
            </span>
            <h3 className="text-sm font-bold text-white">添加中间逻辑门分支</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          <div>
            <label className="font-bold text-slate-900 block mb-1">逻辑门名称 (Gate Name) *</label>
            <input
              type="text"
              value={gateName}
              onChange={(e) => setGateName(e.target.value)}
              placeholder="例如: 循环水路机械故障或卡涩"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-900 block mb-1">逻辑门标识 (Gate ID)</label>
            <input
              type="text"
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              placeholder="例如: CAUSE_PUMP_MECHANICAL"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-900 block mb-1">布尔逻辑门体系</label>
              <select
                value={gateType}
                onChange={(e) => setGateType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="AND">⋀ AND 门 (全满足)</option>
                <option value="OR">⋁ OR 门 (任一满足)</option>
                <option value="VOTE">VOTE (M/N 门)</option>
                <option value="PRIORITY_AND">PRIORITY_AND (时序与)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-900 block mb-1">权重 (Weight 0-1)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-900 block mb-1">挂载到的父节点 (Parent Gate)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              {existingGates.map((gate) => (
                <option key={gate.id} value={gate.id}>
                  [{gate.id}] {gate.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>创建逻辑门</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================= 3. 编辑节点属性与逻辑判据弹窗 =================
interface FtaEditNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: FtaTreeNode | null;
  existingGates: { id: string; name: string }[];
  currentParentId?: string;
  onConfirm: (updatedNode: FtaTreeNode, newParentId?: string) => void;
  onDelete?: (nodeId: string) => void;
}

export const FtaEditNodeModal: React.FC<FtaEditNodeModalProps> = ({
  isOpen,
  onClose,
  node,
  existingGates,
  currentParentId,
  onConfirm,
  onDelete,
}) => {
  const { sops, openSopEditor } = useApp();
  const [name, setName] = useState('');
  const [gate, setGate] = useState<FtaLogicGate>('AND');
  const [weight, setWeight] = useState('1.0');
  const [parentId, setParentId] = useState('');
  const [operator, setOperator] = useState('gt');
  const [thresholdValue, setThresholdValue] = useState('');
  const [forDuration, setForDuration] = useState('');
  const [withinWindow, setWithinWindow] = useState('');
  const [conclusionText, setConclusionText] = useState('');
  const [selectedSopId, setSelectedSopId] = useState('');

  const currentSelectedSop = useMemo(() => {
    return sops.find((s) => s.id === selectedSopId) || sops[0];
  }, [sops, selectedSopId]);

  useEffect(() => {
    if (node) {
      setName(node.name || '');
      setGate(node.gate || 'AND');
      setWeight(node.weight !== undefined ? String(node.weight) : '1.0');
      setParentId(currentParentId || '');

      if (node.condition) {
        setOperator(node.condition.operator || 'gt');
        setThresholdValue(node.condition.value !== undefined ? String(node.condition.value) : '');
        setForDuration(node.condition.for || '');
        setWithinWindow(node.condition.within || '');
      }

      if (node.output) {
        setConclusionText(node.output.conclusion || '');
      }

      if (node.sop_binding) {
        setSelectedSopId(node.sop_binding.sop_id || (sops[0]?.id ?? ''));
      } else {
        const defaultSop = sops[0];
        setSelectedSopId(defaultSop?.id ?? '');
      }
    }
  }, [node, currentParentId, sops]);

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updatedNode: FtaTreeNode = {
      ...node,
      name: name.trim(),
    };

    if (node.type === 'intermediate' || node.type === 'top_event') {
      updatedNode.gate = gate;
      updatedNode.weight = parseFloat(weight) || 1.0;
    }

    if (node.type === 'top_event' && node.output) {
      updatedNode.output = {
        ...node.output,
        conclusion: conclusionText.trim() || node.output.conclusion,
      };
    }

    if (node.type === 'basic') {
      const numVal = Number(thresholdValue);
      const val = !isNaN(numVal) && thresholdValue !== '' ? numVal : thresholdValue;

      updatedNode.condition = {
        ...node.condition,
        operator: operator as any,
        value: operator === 'active' || operator === 'exists' ? undefined : val,
        for: forDuration || undefined,
        within: withinWindow || undefined,
      };
    }

    if (selectedSopId) {
      const chosen = sops.find((s) => s.id === selectedSopId) || currentSelectedSop;
      updatedNode.sop_binding = {
        sop_id: chosen?.id || selectedSopId,
        sop_name: chosen?.name || '标准应急处置程序',
        action: chosen?.procedures?.[0]?.action || chosen?.name || '执行关联处置预案规程',
      };
    }

    onConfirm(updatedNode, parentId !== currentParentId ? parentId : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              {node.id}
            </span>
            <h3 className="text-sm font-bold text-white">编辑 FTA 节点属性与判据</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          <div>
            <label className="font-bold text-slate-900 block mb-1">节点名称 (Name) *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* If Intermediate / Top Gate */}
          {(node.type === 'intermediate' || node.type === 'top_event') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-900 block mb-1">逻辑门体系 (Gate)</label>
                <select
                  value={gate}
                  onChange={(e) => setGate(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="AND">⋀ AND 门 (全子事件满足)</option>
                  <option value="OR">⋁ OR 门 (任一子事件触发)</option>
                  <option value="VOTE">VOTE (M/N 门)</option>
                  <option value="PRIORITY_AND">PRIORITY_AND (时序与)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1">权重 (Weight)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* If Top Event Output */}
          {node.type === 'top_event' && (
            <div>
              <label className="font-bold text-slate-900 block mb-1">顶事件确诊结论 (Conclusion)</label>
              <input
                type="text"
                value={conclusionText}
                onChange={(e) => setConclusionText(e.target.value)}
                placeholder="例如: 冷却泵动力中断确诊"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-rose-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* If Basic Event */}
          {node.type === 'basic' && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block text-[11px]">底层条件判据 (Observation Condition)</span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">比较算子 (Operator)</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gt">&gt; 大于</option>
                    <option value="lt">&lt; 小于</option>
                    <option value="gte">&gt;= 大于等于</option>
                    <option value="lte">&lt;= 小于等于</option>
                    <option value="eq">== 等于</option>
                    <option value="ne">!= 不等于</option>
                    <option value="active">active 激活</option>
                    <option value="exists">exists 存在</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">判定阈值 (Value)</label>
                  <input
                    type="text"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    placeholder="数值或状态"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">持续时长 (for)</label>
                  <input
                    type="text"
                    value={forDuration}
                    onChange={(e) => setForDuration(e.target.value)}
                    placeholder="例如: 3s"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">回溯窗口 (within)</label>
                  <input
                    type="text"
                    value={withinWindow}
                    onChange={(e) => setWithinWindow(e.target.value)}
                    placeholder="例如: 5m"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Node-Level SOP Action & Phase Binding */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 block text-[11px] flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>节点联动处置 SOP 与 Phase 编排</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                从处置预案库中选择绑定动作
              </span>
            </div>

            {/* SOP Selection from sops */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                选择联动处置 SOP 方案
              </label>
              <select
                value={selectedSopId}
                onChange={(e) => setSelectedSopId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-medium text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- 无联动处置 SOP --</option>
                {sops.map((sop) => (
                  <option key={sop.id} value={sop.id}>
                    [{sop.id}] {sop.name} ({sop.procedures?.length || 0} 步骤)
                  </option>
                ))}
              </select>
            </div>

            {currentSelectedSop && selectedSopId && (
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span className="truncate max-w-[280px]">
                  已选预案: <strong className="text-slate-900">{currentSelectedSop.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => openSopEditor(currentSelectedSop.id)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 shrink-0 cursor-pointer"
                >
                  <span>查看规程</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Parent gate migration if not top event */}
          {node.type !== 'top_event' && existingGates.length > 0 && (
            <div>
              <label className="font-bold text-slate-900 block mb-1">所属父逻辑门 (Parent Gate)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {existingGates.map((gate) => (
                  <option key={gate.id} value={gate.id}>
                    [{gate.id}] {gate.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {node.type !== 'top_event' && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-rose-600 font-bold">确定删除?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(node.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
                  >
                    确认
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs transition"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition"
                >
                  删除节点
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs"
              >
                保存变更
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
