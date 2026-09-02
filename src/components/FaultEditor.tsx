import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FaultPattern,
  FaultSymptom,
  SeverityLevel,
} from '../types';
import { PropagationCanvas } from './PropagationCanvas';
import {
  AlertOctagon,
  Save,
  Rocket,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Code,
  Copy,
  Activity,
  Layers,
  FileText,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  X,
  Gauge,
  Tag,
} from 'lucide-react';
import { generateSingleFaultYaml } from '../utils/yamlUtils';

export const FaultEditor: React.FC = () => {
  const {
    faults,
    devices,
    sops,
    indicators,
    selectedFaultId,
    saveFaultDraft,
    publishFault,
    setActiveTab,
    showToast,
    openSopEditor,
    openIndicatorEditor,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'symptoms' | 'propagation' | 'sop'>(
    'basic'
  );
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  // Get current active fault
  const currentFault = useMemo(() => {
    return faults.find((f) => f.id === selectedFaultId) || faults[0];
  }, [faults, selectedFaultId]);

  // Local editable state
  const [formData, setFormData] = useState<FaultPattern>(() => currentFault || ({} as FaultPattern));

  useEffect(() => {
    if (currentFault) {
      setFormData(JSON.parse(JSON.stringify(currentFault)));
    }
  }, [currentFault]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSaveDraft = () => {
    if (!formData.id) return;
    saveFaultDraft(formData.id, formData);
  };

  const handlePublish = () => {
    if (!formData.id) return;
    saveFaultDraft(formData.id, formData);
    publishFault(formData.id);
  };

  const handleAddSymptom = (preset?: Partial<FaultSymptom>) => {
    const nextIdx = (formData.symptoms?.length || 0) + 1;
    const defaultInd = indicators[0];
    const newSymptom: FaultSymptom = {
      id: `SYM-${Date.now()}-${nextIdx}`,
      indicator_id: preset?.indicator_id || defaultInd?.id || 'coolant_flow',
      metric_code: preset?.metric_code || defaultInd?.code || 'coolant_flow',
      metric_name: preset?.metric_name || defaultInd?.name || `监测参数指标 ${nextIdx}`,
      direction: preset?.direction || 'up',
      time_window: preset?.time_window || '0-5min',
      normal_range: preset?.normal_range || defaultInd?.normal_range || '20-40°C',
      unit: preset?.unit || defaultInd?.unit || '',
    };

    setFormData({
      ...formData,
      symptoms: [...(formData.symptoms || []), newSymptom],
    });
  };

  const handleSelectIndicatorForSymptom = (symptomId: string, indicatorIdOrCode: string) => {
    const selectedInd = indicators.find(
      (i) => i.id === indicatorIdOrCode || i.code === indicatorIdOrCode
    );
    if (!selectedInd) return;

    handleUpdateSymptom(symptomId, {
      indicator_id: selectedInd.id,
      metric_code: selectedInd.code,
      metric_name: selectedInd.name,
      unit: selectedInd.unit,
      normal_range: selectedInd.normal_range || '',
    });
  };

  const handleDeleteSymptom = (id: string) => {
    setFormData({
      ...formData,
      symptoms: (formData.symptoms || []).filter((s) => s.id !== id),
    });
  };

  const handleUpdateSymptom = (id: string, updates: Partial<FaultSymptom>) => {
    setFormData({
      ...formData,
      symptoms: (formData.symptoms || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  // Symptom preset templates
  const PRESET_SYMPTOMS: Array<Partial<FaultSymptom>> = [
    { metric_name: '主变压器顶层油温', direction: 'up', time_window: '0-15min', normal_range: '40-65°C', unit: '°C' },
    { metric_name: '冷却回路实际流量', direction: 'down', time_window: '0-2min', normal_range: '120-150 L/min', unit: 'L/min' },
    { metric_name: '重轻瓦斯继电器动作信号', direction: 'fluctuate', time_window: '15-30min', normal_range: '正常复归(0)', unit: 'BOOL' },
    { metric_name: '直流母线对地绝缘阻抗', direction: 'down', time_window: '0-5min', normal_range: '≥ 500 kΩ', unit: 'kΩ' },
    { metric_name: '电芯最大温差 ΔT', direction: 'up', time_window: '0-10min', normal_range: '≤ 3.0°C', unit: '°C' },
    { metric_name: 'IGBT 桥臂工作温度', direction: 'up', time_window: '0-5min', normal_range: '35-75°C', unit: '°C' },
    { metric_name: '一氧化碳 CO 气体浓度', direction: 'up', time_window: '0-5min', normal_range: '≤ 10 ppm', unit: 'ppm' },
  ];

  const yamlOutput = useMemo(() => {
    if (!formData.id) return '';
    return generateSingleFaultYaml(formData);
  }, [formData]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('faults')}
            className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-xs"
            title="返回故障列表"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                {formData.id}
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{formData.name}</h1>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  formData.status === 'draft'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {formData.status === 'draft' ? '草稿待发布' : '已入库诊断引擎'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              所见即所得故障建模 • 对应 fault_patterns.yaml • 支持测试场直接仿真
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setActiveTab('test-playground')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition shadow-xs"
          >
            <FlaskConical className="w-3.5 h-3.5 text-slate-600" />
            <span>去测试场验证</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-medium transition shadow-xs"
            title="快捷键 Ctrl+S"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>保存草稿</span>
          </button>

          <button
            onClick={handlePublish}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
          >
            <Rocket className="w-3.5 h-3.5 text-slate-300" />
            <span>正式发布</span>
          </button>
        </div>
      </div>

      {/* Editor Sub-Tabs Navigation */}
      <div className="flex items-center space-x-1 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('basic')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'basic'
              ? 'bg-white text-slate-900 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>1. 基础机理与受影响设备</span>
        </button>

        <button
          onClick={() => setActiveSubTab('symptoms')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'symptoms'
              ? 'bg-white text-slate-900 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>2. 异常症状特征 ({formData.symptoms?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('propagation')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'propagation'
              ? 'bg-white text-slate-900 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3. 故障传播链画布 ({formData.propagation_chain?.length || 0} 环节)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sop')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'sop'
              ? 'bg-white text-slate-900 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>4. 关联处置 SOP ({formData.associated_procedure_ids?.length || 0})</span>
        </button>
      </div>

      {/* Main Form Content by Sub-Tab */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        {/* Sub-Tab 1: Basic Info & Devices */}
        {activeSubTab === 'basic' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  故障名称 (name) *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 主变压器冷却泵机械卡死故障"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  故障模式编码 (id) *
                </label>
                <input
                  type="text"
                  value={formData.id || ''}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="如: F001"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  故障严重等级 (severity)
                </label>
                <select
                  value={formData.severity || 'high'}
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value as SeverityLevel })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                >
                  <option value="critical">致命 (Critical) - 立即停机与跳闸</option>
                  <option value="high">严重 (High) - 系统降额与紧急隔离</option>
                  <option value="medium">中度 (Medium) - 性能受损与限额运行</option>
                  <option value="low">轻微 (Low) - 预防性维护提示</option>
                </select>
              </div>
            </div>

            {/* Affected Devices Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700">
                  受影响设备 (affected_devices) *
                </label>
                <button
                  onClick={() => setShowDevicePicker(true)}
                  className="text-xs text-slate-900 hover:text-slate-700 font-medium flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>选择设备</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 min-h-[50px]">
                {(formData.affected_devices || []).map((devId) => {
                  const dev = devices.find((d) => d.id === devId);
                  return (
                    <div
                      key={devId}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 text-xs font-medium shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dev ? dev.name : devId}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({devId})</span>
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            affected_devices: formData.affected_devices.filter((id) => id !== devId),
                          })
                        }
                        className="text-slate-400 hover:text-rose-600 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {(!formData.affected_devices || formData.affected_devices.length === 0) && (
                  <span className="text-xs text-slate-400 italic flex items-center">
                    请至少关联 1 个受影响设备节点
                  </span>
                )}
              </div>
            </div>

            {/* Root Cause & Engineering Mechanism */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                诱因机理与物理原因 (root_cause)
              </label>
              <textarea
                rows={4}
                value={formData.root_cause || ''}
                onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                placeholder="详细记录故障发生的物理诱因、机械或电气机理、环境催化因素等..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                支持清晰记录专家经验，将直接注入 DiagnosGraph 诊断引擎的可解释性归因报告中。
              </p>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Symptoms Table */}
        {activeSubTab === 'symptoms' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-slate-700" />
                  <span>特征症状定义 (引用指标库 & 表格录入)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  从统一时序指标库引用监测参数，自动带入量程基准，定义异常变化方向与时间窗口
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleAddSymptom()}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ 添加症状特征</span>
                </button>
              </div>
            </div>

            {/* Quick Indicators from Library */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 flex items-center space-x-1 mr-1">
                <Sparkles className="w-3 h-3 text-slate-400" />
                <span>指标库快速挂载:</span>
              </span>
              {indicators.slice(0, 8).map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() =>
                    handleAddSymptom({
                      indicator_id: ind.id,
                      metric_code: ind.code,
                      metric_name: ind.name,
                      unit: ind.unit,
                      normal_range: ind.normal_range || '',
                      direction: ind.code.includes('leak') || ind.code.includes('fire') ? 'abnormal_high' : 'up',
                    })
                  }
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center space-x-1"
                >
                  <Gauge className="w-3 h-3 text-slate-500" />
                  <span>+ {ind.name}</span>
                  <span className="text-[9px] font-mono text-slate-400">({ind.code})</span>
                </button>
              ))}
            </div>

            {/* Symptoms Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 min-w-[240px]">关联标准指标 (Indicator)</th>
                    <th className="py-2.5 px-3 min-w-[140px]">变化方向 (direction)</th>
                    <th className="py-2.5 px-3 min-w-[120px]">时间窗口 (time_window)</th>
                    <th className="py-2.5 px-3 min-w-[150px]">正常基准范围 (normal_range)</th>
                    <th className="py-2.5 px-3 w-16 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(formData.symptoms || []).map((symptom, sIdx) => {
                    const matchedInd = indicators.find(
                      (i) =>
                        i.id === symptom.indicator_id ||
                        i.code === symptom.indicator_id ||
                        i.code === symptom.metric_code ||
                        i.name === symptom.metric_name
                    );

                    return (
                      <tr key={symptom.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{sIdx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <select
                              value={matchedInd?.id || symptom.indicator_id || ''}
                              onChange={(e) =>
                                handleSelectIndicatorForSymptom(symptom.id, e.target.value)
                              }
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                            >
                              <option value="">-- 从指标库选择标准时序参数 --</option>
                              {indicators.map((ind) => (
                                <option key={ind.id} value={ind.id}>
                                  [{ind.domain}] {ind.name} ({ind.code}) • {ind.unit}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                              <span className="flex items-center space-x-1">
                                <span className="font-semibold text-slate-700">
                                  {symptom.metric_name}
                                </span>
                                {symptom.metric_code && (
                                  <span className="font-mono text-slate-400">
                                    ({symptom.metric_code})
                                  </span>
                                )}
                              </span>
                              {matchedInd && (
                                <button
                                  type="button"
                                  onClick={() => openIndicatorEditor(matchedInd.id)}
                                  className="text-slate-900 hover:underline flex items-center space-x-0.5"
                                  title="前往指标库查看此定义"
                                >
                                  <span>指标库定义</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={symptom.direction}
                            onChange={(e) =>
                              handleUpdateSymptom(symptom.id, {
                                direction: e.target.value as any,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                          >
                            <option value="up">↑ 持续升高 / 越上限</option>
                            <option value="down">↓ 持续骤降 / 越下限</option>
                            <option value="fluctuate">~ 剧烈波动 / 异常震荡</option>
                            <option value="abnormal_high">▲ 偏高异常</option>
                            <option value="abnormal_low">▼ 偏低异常</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={symptom.time_window}
                            onChange={(e) =>
                              handleUpdateSymptom(symptom.id, { time_window: e.target.value })
                            }
                            placeholder="如: 0-5min"
                            className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={symptom.normal_range || ''}
                            onChange={(e) =>
                              handleUpdateSymptom(symptom.id, { normal_range: e.target.value })
                            }
                            placeholder="如: 40-65°C"
                            className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteSymptom(symptom.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="删除此症状"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!formData.symptoms || formData.symptoms.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                        暂无症状指标，点击上方"+ 添加症状特征"或从快捷指标挂载
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-Tab 3: Propagation Canvas */}
        {activeSubTab === 'propagation' && (
          <div className="space-y-3">
            <div className="pb-1">
              <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-slate-700" />
                <span>故障演变与传播链 (拓扑画布)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                拖拽节点和建立传导箭头，定义故障从根因触发到各级症状演进的时间历程
              </p>
            </div>

            <PropagationCanvas
              faultName={formData.name}
              propagationChain={formData.propagation_chain || []}
              onUpdateChain={(newChain, newLayout) => {
                setFormData({
                  ...formData,
                  propagation_chain: newChain,
                  propagation_layout: newLayout,
                });
              }}
              savedLayout={formData.propagation_layout}
            />
          </div>
        )}

        {/* Sub-Tab 4: Associated SOPs */}
        {activeSubTab === 'sop' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span>关联应急处置 SOP 方案</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  当诊断引擎命中本故障模式时，将向值班运维人员推送此 SOP 处置步骤
                </p>
              </div>

              <button
                onClick={() => {
                  const newSopId = `RP-${formData.id}`;
                  openSopEditor(newSopId);
                }}
                className="text-xs text-slate-900 hover:text-slate-700 font-medium flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>为本故障新建 SOP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sops.map((sop) => {
                const isSelected = (formData.associated_procedure_ids || []).includes(sop.id);
                return (
                  <div
                    key={sop.id}
                    onClick={() => {
                      const cur = formData.associated_procedure_ids || [];
                      const next = isSelected
                        ? cur.filter((id) => id !== sop.id)
                        : [...cur, sop.id];
                      setFormData({ ...formData, associated_procedure_ids: next });
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                          {sop.id}
                        </span>
                        <h4 className={`text-xs font-bold mt-1.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>{sop.name}</h4>
                        <div className={`text-[11px] mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          包含 {sop.procedures.length} 个标准步骤 • 升级超时: {sop.escalation.timeout_minutes}分钟
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                          isSelected
                            ? 'bg-white border-white text-slate-900 font-bold'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                      <span>
                        第一步: {sop.procedures[0]?.action?.slice(0, 20)}...
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSopEditor(sop.id);
                        }}
                        className={`font-medium flex items-center space-x-1 ${isSelected ? 'text-slate-200 hover:text-white' : 'text-slate-900 hover:underline'}`}
                      >
                        <span>查看 SOP</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible YAML Preview Box (Default collapsed as per spec) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <button
          onClick={() => setShowYamlPreview(!showYamlPreview)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center space-x-2.5">
            <Code className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-900">
              技术评审 YAML 结构预览 ({formData.id}.yaml)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
              所见即所得
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <span>{showYamlPreview ? '收起' : '展开查看'}</span>
            {showYamlPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showYamlPreview && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-[11px] text-slate-500">
              <span>与 DiagnosGraph 诊断引擎 YAML 字段 100% 对齐</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yamlOutput);
                  showToast('已复制 YAML 至剪贴板', 'success');
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs transition"
              >
                <Copy className="w-3 h-3" />
                <span>复制代码</span>
              </button>
            </div>
            <pre className="text-slate-800 font-mono text-xs overflow-x-auto p-3.5 rounded-lg bg-slate-900 text-slate-200 leading-relaxed max-h-80">
              {yamlOutput}
            </pre>
          </div>
        )}
      </div>

      {/* Device Multi-Select Modal */}
      {showDevicePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">选择受影响的设备节点</h3>
              <button
                onClick={() => setShowDevicePicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {devices.map((d) => {
                const isSelected = (formData.affected_devices || []).includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      const cur = formData.affected_devices || [];
                      const next = isSelected ? cur.filter((id) => id !== d.id) : [...cur, d.id];
                      setFormData({ ...formData, affected_devices: next });
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs transition ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{d.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {d.id} • 类型: {d.device_type}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-white text-slate-900 border-white font-bold'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowDevicePicker(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs"
              >
                完成选择
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
