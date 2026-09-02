import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RecoveryProcedure, RecoveryStep } from '../types';
import {
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Rocket,
  ArrowLeft,
  Clock,
  ShieldAlert,
  Code,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Wrench,
} from 'lucide-react';
import { generateSingleProcedureYaml } from '../utils/yamlUtils';

export const SopEditor: React.FC = () => {
  const {
    sops,
    faults,
    selectedSopId,
    saveSopDraft,
    publishSop,
    setActiveTab,
    showToast,
    openFaultEditor,
  } = useApp();

  const currentSop = useMemo(() => {
    return sops.find((s) => s.id === selectedSopId) || sops[0];
  }, [sops, selectedSopId]);

  const [formData, setFormData] = useState<RecoveryProcedure>(() => currentSop || ({} as RecoveryProcedure));
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const [showFaultPicker, setShowFaultPicker] = useState(false);

  useEffect(() => {
    if (currentSop) {
      setFormData(JSON.parse(JSON.stringify(currentSop)));
    }
  }, [currentSop]);

  // Keyboard shortcut Ctrl+S
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
    saveSopDraft(formData.id, formData);
  };

  const handlePublish = () => {
    if (!formData.id) return;
    saveSopDraft(formData.id, formData);
    publishSop(formData.id);
  };

  const handleAddStep = () => {
    const nextNum = (formData.procedures?.length || 0) + 1;
    const newStep: RecoveryStep = {
      id: `STEP-${Date.now()}-${nextNum}`,
      step_num: nextNum,
      action: `第 ${nextNum} 步：执行安全检查与隔离`,
      verification: '核查现场状态指示与监控读数',
      expected_outcome: '确认系统处于安全可控状态',
      estimated_time: '5分钟',
      tool_required: '绝缘手套 / 万用表',
    };

    setFormData({
      ...formData,
      procedures: [...(formData.procedures || []), newStep],
    });
  };

  const handleUpdateStep = (id: string, updates: Partial<RecoveryStep>) => {
    setFormData({
      ...formData,
      procedures: (formData.procedures || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const handleDeleteStep = (id: string) => {
    const remaining = (formData.procedures || [])
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, step_num: idx + 1 }));
    setFormData({ ...formData, procedures: remaining });
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    const list = [...(formData.procedures || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const renumbered = list.map((s, i) => ({ ...s, step_num: i + 1 }));
    setFormData({ ...formData, procedures: renumbered });
  };

  const yamlOutput = useMemo(() => {
    if (!formData.id) return '';
    return generateSingleProcedureYaml(formData);
  }, [formData]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('procedures')}
            className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-xs"
            title="返回 SOP 列表"
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
              定义运维应急 SOP 操作序列、闭环验证动作及自动升级策略
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
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
            <span>正式发布 SOP</span>
          </button>
        </div>
      </div>

      {/* Basic Settings & Associated Faults */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SOP 方案名称 (name) *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SOP 方案编码 (id) *
              </label>
              <input
                type="text"
                value={formData.id || ''}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Associated Faults */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">
                关联故障模式 (associated_fault_ids)
              </label>
              <button
                onClick={() => setShowFaultPicker(true)}
                className="text-xs text-slate-900 hover:text-slate-700 font-medium flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>关联故障</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 min-h-[46px]">
              {(formData.associated_fault_ids || []).map((fid) => {
                const f = faults.find((item) => item.id === fid);
                return (
                  <div
                    key={fid}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 text-xs font-medium shadow-xs"
                  >
                    <span>{f ? f.name : fid}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({fid})</span>
                    {f && (
                      <button
                        onClick={() => openFaultEditor(f.id)}
                        className="p-0.5 text-slate-400 hover:text-slate-700"
                        title="查看故障"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          associated_fault_ids: formData.associated_fault_ids.filter(
                            (id) => id !== fid
                          ),
                        })
                      }
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {(!formData.associated_fault_ids || formData.associated_fault_ids.length === 0) && (
                <span className="text-xs text-slate-400 italic flex items-center">暂未关联具体故障模式</span>
              )}
            </div>
          </div>
        </div>

        {/* Escalation Policy Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900">超时升级策略 (Escalation)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                升级响应超时 (timeout_minutes)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.escalation?.timeout_minutes || 30}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      escalation: {
                        ...formData.escalation,
                        timeout_minutes: parseInt(e.target.value) || 30,
                      },
                    })
                  }
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                />
                <span className="text-slate-500">分钟内未闭环</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                升级目标角色 (target_role)
              </label>
              <input
                type="text"
                value={formData.escalation?.target_role || '高级储能运维专家'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    escalation: {
                      ...formData.escalation,
                      target_role: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                自动联动措施 (auto_actions)
              </label>
              <input
                type="text"
                value={(formData.escalation?.auto_actions || []).join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    escalation: {
                      ...formData.escalation,
                      auto_actions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    },
                  })
                }
                placeholder="如: 自动降额运行至30%, 触发告警工单升级"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step by Step Procedures Table & Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <span>SOP 处置步骤序列 ({formData.procedures?.length || 0} 个步骤)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              严格按照运维规范编写动作、闭环验证手段与预期恢复结果
            </p>
          </div>

          <button
            onClick={handleAddStep}
            className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 添加处置步骤</span>
          </button>
        </div>

        <div className="space-y-3">
          {(formData.procedures || []).map((step, idx) => (
            <div
              key={step.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-mono">
                    {step.step_num}
                  </span>
                  <span className="text-xs font-bold text-slate-900">步骤 {step.step_num}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleMoveStep(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="上移步骤"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveStep(idx, 'down')}
                    disabled={idx === (formData.procedures?.length || 0) - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="下移步骤"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteStep(step.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                    title="删除此步骤"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    1. 处置动作 (action) *
                  </label>
                  <textarea
                    rows={2}
                    value={step.action}
                    onChange={(e) => handleUpdateStep(step.id, { action: e.target.value })}
                    placeholder="如: 立即切断变压器冷却泵主回路电源断路器 QF-03"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    2. 验证动作 (verification) *
                  </label>
                  <textarea
                    rows={2}
                    value={step.verification}
                    onChange={(e) => handleUpdateStep(step.id, { verification: e.target.value })}
                    placeholder="如: 检查控制柜指示灯熄灭，使用万用表测量下端无电压"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    3. 预期恢复结果 (expected_outcome) *
                  </label>
                  <textarea
                    rows={2}
                    value={step.expected_outcome}
                    onChange={(e) =>
                      handleUpdateStep(step.id, { expected_outcome: e.target.value })
                    }
                    placeholder="如: 确认彻底断电隔离，防止二次短路起火"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-600">预估耗时:</span>
                  <input
                    type="text"
                    value={step.estimated_time || ''}
                    onChange={(e) =>
                      handleUpdateStep(step.id, { estimated_time: e.target.value })
                    }
                    placeholder="如: 3分钟"
                    className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Wrench className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-600">所需工具:</span>
                  <input
                    type="text"
                    value={step.tool_required || ''}
                    onChange={(e) =>
                      handleUpdateStep(step.id, { tool_required: e.target.value })
                    }
                    placeholder="如: 防护手套、万用表"
                    className="flex-1 px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          ))}

          {(!formData.procedures || formData.procedures.length === 0) && (
            <div className="text-center py-8 text-xs text-slate-400">
              暂未添加处置步骤，点击上方"+ 添加处置步骤"
            </div>
          )}
        </div>
      </div>

      {/* Collapsible YAML Preview */}
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
          </div>

          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <span>{showYamlPreview ? '收起' : '展开查看'}</span>
            {showYamlPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showYamlPreview && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex justify-end pb-2 mb-2 border-b border-slate-200">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yamlOutput);
                  showToast('已复制 YAML 至剪贴板', 'success');
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs transition text-xs"
              >
                <Copy className="w-3 h-3" />
                <span>复制代码</span>
              </button>
            </div>
            <pre className="text-slate-200 font-mono text-xs overflow-x-auto p-3.5 rounded-lg bg-slate-900 leading-relaxed max-h-80">
              {yamlOutput}
            </pre>
          </div>
        )}
      </div>

      {/* Faults Picker Modal */}
      {showFaultPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">选择此 SOP 关联的故障模式</h3>
              <button
                onClick={() => setShowFaultPicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {faults.map((f) => {
                const isSelected = (formData.associated_fault_ids || []).includes(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      const cur = formData.associated_fault_ids || [];
                      const next = isSelected ? cur.filter((id) => id !== f.id) : [...cur, f.id];
                      setFormData({ ...formData, associated_fault_ids: next });
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs transition ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{f.id}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-white border-white text-slate-900 font-bold'
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
                onClick={() => setShowFaultPicker(false)}
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
