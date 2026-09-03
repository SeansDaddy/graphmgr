import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ConfigParameter, ParameterDataType, ParameterEnumValue } from '../types';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCode,
  Layers,
  Zap,
  Cpu,
  Activity,
  Flame,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const ALL_DEVICE_TYPES = [
  { code: 'pump', name: '循环泵 (pump)' },
  { code: 'pipe', name: '管路系统 (pipe)' },
  { code: 'battery', name: '电池模组/电芯 (battery)' },
  { code: 'bms', name: 'BMS电池管理 (bms)' },
  { code: 'pcs', name: 'PCS储能变流器 (pcs)' },
  { code: 'transformer', name: '变压器 (transformer)' },
  { code: 'switchgear', name: '高压开关柜 (switchgear)' },
  { code: 'cabin', name: '集装箱舱体 (cabin)' },
  { code: 'fss', name: '消防灭火系统 (fss)' },
  { code: 'hvac', name: '环境温控空调 (hvac)' },
];

const DOMAINS = ['冷却', '储能', 'PCS', 'BMS', '消防', '电气', '环控'];

const COMMON_UNITS = ['°C', '%', 'kW', 'L/min', 'MPa', 'V', 'mV', 'A', 's', 'min', 'h', 'ppm', 'kΩ', 'bar', 'rpm'];

export const ParameterEditor: React.FC = () => {
  const {
    parameters,
    selectedParameterId,
    updateParameter,
    deleteParameter,
    publishParameter,
    setActiveTab,
    faults,
    openFaultEditor,
    showToast,
  } = useApp();

  const currentParam = useMemo(() => {
    return (
      parameters.find((p) => p.id === selectedParameterId || p.code === selectedParameterId) ||
      parameters[0]
    );
  }, [parameters, selectedParameterId]);

  // Local editing form state
  const [formData, setFormData] = useState<ConfigParameter>(currentParam);
  const [isYamlExpanded, setIsYamlExpanded] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [newEnumKey, setNewEnumKey] = useState('');
  const [newEnumLabel, setNewEnumLabel] = useState('');
  const [newEnumDesc, setNewEnumDesc] = useState('');
  const [isLinkingFaultOpen, setIsLinkingFaultOpen] = useState(false);

  useEffect(() => {
    if (currentParam) {
      setFormData(currentParam);
    }
  }, [currentParam]);

  if (!formData) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>未找到选中的配置参数，请从参数库选择。</p>
        <button
          onClick={() => setActiveTab('parameters')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
        >
          返回参数库
        </button>
      </div>
    );
  }

  // Associated faults details
  const associatedFaults = useMemo(() => {
    const ids = formData.associated_fault_ids || [];
    return faults.filter((f) => ids.includes(f.id));
  }, [faults, formData.associated_fault_ids]);

  // Unlinked faults for selection
  const unlinkedFaults = useMemo(() => {
    const ids = new Set(formData.associated_fault_ids || []);
    return faults.filter((f) => !ids.has(f.id));
  }, [faults, formData.associated_fault_ids]);

  // Device type toggle
  const toggleDeviceType = (dtCode: string) => {
    const list = formData.applicable_device_types || [];
    if (list.includes(dtCode)) {
      if (list.length === 1) {
        showToast('至少保留一个适用设备类型', 'warning');
        return;
      }
      setFormData({
        ...formData,
        applicable_device_types: list.filter((t) => t !== dtCode),
      });
    } else {
      setFormData({
        ...formData,
        applicable_device_types: [...list, dtCode],
      });
    }
  };

  // Add enum value
  const handleAddEnumValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnumKey.trim() || !newEnumLabel.trim()) {
      showToast('请输入枚举键名与中文标签', 'warning');
      return;
    }
    const safeKey = newEnumKey.trim().toLowerCase();
    const existing = formData.enum_values || [];
    if (existing.some((v) => v.key === safeKey)) {
      showToast(`枚举键名 [${safeKey}] 已存在`, 'warning');
      return;
    }
    const newEntry: ParameterEnumValue = {
      key: safeKey,
      label: newEnumLabel.trim(),
      description: newEnumDesc.trim(),
    };
    setFormData({
      ...formData,
      enum_values: [...existing, newEntry],
    });
    setNewEnumKey('');
    setNewEnumLabel('');
    setNewEnumDesc('');
    showToast(`已添加枚举项: ${newEntry.label} (${newEntry.key})`, 'info');
  };

  // Remove enum value
  const handleRemoveEnumValue = (keyToRemove: string) => {
    const updated = (formData.enum_values || []).filter((v) => v.key !== keyToRemove);
    setFormData({
      ...formData,
      enum_values: updated,
      default_value: formData.default_value === keyToRemove ? (updated[0]?.key || '') : formData.default_value,
    });
  };

  // Link/unlink faults
  const handleLinkFault = (faultId: string) => {
    const current = formData.associated_fault_ids || [];
    if (!current.includes(faultId)) {
      const updated = [...current, faultId];
      setFormData({ ...formData, associated_fault_ids: updated });
      showToast(`已将故障 [${faultId}] 关联至此参数`, 'success');
    }
    setIsLinkingFaultOpen(false);
  };

  const handleUnlinkFault = (faultId: string) => {
    const updated = (formData.associated_fault_ids || []).filter((id) => id !== faultId);
    setFormData({ ...formData, associated_fault_ids: updated });
    showToast(`已解除与故障 [${faultId}] 的关联`, 'info');
  };

  // Save changes
  const handleSaveDraft = () => {
    updateParameter(formData.id, {
      ...formData,
      status: 'draft',
    });
  };

  // Publish
  const handlePublish = () => {
    updateParameter(formData.id, formData);
    publishParameter(formData.id);
  };

  // Delete
  const handleDelete = () => {
    if (window.confirm(`确定要删除配置参数 [${formData.code}] 吗？`)) {
      deleteParameter(formData.id);
      setActiveTab('parameters');
    }
  };

  // Generated YAML string
  const yamlContent = useMemo(() => {
    return `# DiagnosGraph v1.1 配置参数结构化标准定义
parameter_code: "${formData.code}"
name: "${formData.name}"
domain: "${formData.domain}"
param_type: "${formData.param_type}"
default_value: ${JSON.stringify(formData.default_value)}
${formData.unit ? `unit: "${formData.unit}"\n` : ''}${
      formData.range_min !== undefined ? `range_min: ${formData.range_min}\n` : ''
    }${formData.range_max !== undefined ? `range_max: ${formData.range_max}\n` : ''}${
      formData.enum_values && formData.enum_values.length > 0
        ? `enum_values:\n` +
          formData.enum_values
            .map(
              (ev) =>
                `  - key: "${ev.key}"\n    label: "${ev.label}"${
                  ev.description ? `\n    description: "${ev.description}"` : ''
                }`
            )
            .join('\n') +
          '\n'
        : ''
    }applicable_device_types:
${formData.applicable_device_types.map((dt) => `  - "${dt}"`).join('\n')}
associated_fault_ids:
${(formData.associated_fault_ids || []).map((fid) => `  - "${fid}"`).join('\n')}
description: "${formData.description.replace(/"/g, '\\"')}"
author: "${formData.author || '系统专家'}"
status: "${formData.status}"
updated_at: "${formData.updated_at}"
`;
  }, [formData]);

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlContent);
    setCopiedYaml(true);
    showToast('YAML 内容已复制至剪贴板', 'success');
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* 顶部导航与状态条 */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('parameters')}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="返回配置参数库"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  配置参数
                </span>
                <h1 className="text-xl font-bold font-mono text-slate-900">{formData.code}</h1>
                {formData.status === 'published' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    已发布生效
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    草稿版本
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.name} · 所属域: {formData.domain} · 最后更新: {formData.updated_at}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>保存修改</span>
            </button>

            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>发布生效</span>
            </button>

            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="删除此参数"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 主表单编辑区域 */}
      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* 卡片 1: 基础信息 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-600 rounded-sm"></span>
              基础属性与适用范围
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              author: {formData.author || '系统专家'}
            </span>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 编码 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  编码 (Code, snake_case 唯一) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toLowerCase().trim() })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">全局唯一字段，用于算法调用与下发</p>
              </div>

              {/* 中文名称 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  标准名称 (Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">中文人机交互显示名</p>
              </div>

              {/* 所属域 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  所属系统域 (Domain)
                </label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {DOMAINS.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 适用设备多选 Checkbox 标签 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                适用设备类型 (Applicable Device Types)
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_DEVICE_TYPES.map((dt) => {
                  const isChecked = (formData.applicable_device_types || []).includes(dt.code);
                  return (
                    <button
                      key={dt.code}
                      type="button"
                      onClick={() => toggleDeviceType(dt.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                      }`}
                    >
                      <span>{isChecked ? '☑' : '☐'}</span>
                      <span>{dt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 参数详细描述 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                参数机理与功能说明 (Description)
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细说明此参数的作用机理、标准设定原则、在储能系统运行中的重要性..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 卡片 2: 参数类型与取值范围 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-4 bg-blue-600 rounded-sm"></span>
              参数数据类型与约束范围 (Type & Constraints)
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">当前模式:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-semibold">
                {formData.param_type}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 类型切换 Radio 组 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                选择参数数据类型:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(['enum', 'int', 'float', 'bool', 'string'] as ParameterDataType[]).map((t) => {
                  const isSelected = formData.param_type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        let newDef: any = formData.default_value;
                        if (t === 'bool') newDef = true;
                        if (t === 'int') newDef = 0;
                        if (t === 'float') newDef = 0.0;
                        if (t === 'enum') newDef = formData.enum_values?.[0]?.key || 'auto';
                        if (t === 'string') newDef = '';
                        setFormData({
                          ...formData,
                          param_type: t,
                          default_value: newDef,
                        });
                      }}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="font-mono text-xs uppercase">{t}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t === 'enum' && '枚举选项'}
                        {t === 'int' && '整数范围'}
                        {t === 'float' && '浮点实数'}
                        {t === 'bool' && '布尔开关'}
                        {t === 'string' && '字符文本'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 条件 1: 枚举类型 (enum) 编辑器 */}
            {formData.param_type === 'enum' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>枚举值定义 (Enum Values):</span>
                    <span className="text-slate-500 font-normal">
                      ({(formData.enum_values || []).length} 项)
                    </span>
                  </h3>
                </div>

                {/* 现存枚举列表 */}
                <div className="space-y-2">
                  {(formData.enum_values || []).map((ev) => (
                    <div
                      key={ev.key}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                          {ev.key}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{ev.label}</div>
                          {ev.description && (
                            <div className="text-[11px] text-slate-500">{ev.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {formData.default_value === ev.key && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            当前默认值
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveEnumValue(ev.key)}
                          className="text-slate-400 hover:text-rose-600 p-1 text-xs transition-colors cursor-pointer"
                          title="删除此枚举项"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 添加新枚举项 */}
                <form
                  onSubmit={handleAddEnumValue}
                  className="pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      枚举键 (key, 英文小写)
                    </label>
                    <input
                      type="text"
                      placeholder="如: auto / off"
                      value={newEnumKey}
                      onChange={(e) => setNewEnumKey(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      中文标签 (label)
                    </label>
                    <input
                      type="text"
                      placeholder="如: 自动调节模式"
                      value={newEnumLabel}
                      onChange={(e) => setNewEnumLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      描述解释 (description, 可选)
                    </label>
                    <input
                      type="text"
                      placeholder="控制逻辑说明"
                      value={newEnumDesc}
                      onChange={(e) => setNewEnumDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>添加枚举项</span>
                    </button>
                  </div>
                </form>

                {/* 默认值选择 */}
                <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    默认选定值 (Default Value):
                  </label>
                  <select
                    value={String(formData.default_value)}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800 bg-white"
                  >
                    {(formData.enum_values || []).map((ev) => (
                      <option key={ev.key} value={ev.key}>
                        {ev.key} ({ev.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 条件 2: 数值类型 (int / float) 编辑器 */}
            {(formData.param_type === 'int' || formData.param_type === 'float') && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      安全下限 (Range Min)
                    </label>
                    <input
                      type="number"
                      step={formData.param_type === 'float' ? '0.1' : '1'}
                      value={formData.range_min !== undefined ? formData.range_min : ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          range_min: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="-∞"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      安全上限 (Range Max)
                    </label>
                    <input
                      type="number"
                      step={formData.param_type === 'float' ? '0.1' : '1'}
                      value={formData.range_max !== undefined ? formData.range_max : ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          range_max: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="+∞"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      工程单位 (Unit)
                    </label>
                    <input
                      type="text"
                      value={formData.unit || ''}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="例如: °C, %, kW"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      出厂默认安全基准值 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step={formData.param_type === 'float' ? '0.1' : '1'}
                      value={formData.default_value !== undefined ? Number(formData.default_value) : 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_value: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-700 bg-white"
                    />
                  </div>
                </div>

                {/* 常用单位快捷选项 */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                  <span className="text-slate-400 text-[11px]">快捷填入单位:</span>
                  {COMMON_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setFormData({ ...formData, unit: u })}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 hover:border-slate-300 rounded text-[11px] font-mono text-slate-600 cursor-pointer"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 条件 3: 布尔类型 (bool) 编辑器 */}
            {formData.param_type === 'bool' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">默认开关状态</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    储能电站标准基准出厂默认是开启还是禁用
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, default_value: true })}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      formData.default_value === true
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    true (默认启用)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, default_value: false })}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      formData.default_value === false
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    false (默认关闭)
                  </button>
                </div>
              </div>
            )}

            {/* 条件 4: 字符串类型 (string) 编辑器 */}
            {formData.param_type === 'string' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    默认字符串值 (Default Value)
                  </label>
                  <input
                    type="text"
                    value={String(formData.default_value || '')}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 卡片 3: 关联故障 (反向查询 - 核心工业故障机理因果网络) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-4 bg-amber-500 rounded-sm"></span>
                关联故障模式 (反向查询 & 因果建模)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                当现场此参数发生漂移、误配置或越限时，将诱发或关联以下故障模式
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLinkingFaultOpen(!isLinkingFaultOpen)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>关联新故障</span>
            </button>
          </div>

          {/* 关联故障快捷选择下拉 */}
          {isLinkingFaultOpen && (
            <div className="p-4 bg-amber-50/50 border-b border-amber-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-900">
                  选择待建立关联因果关系的故障模式:
                </span>
                <button
                  onClick={() => setIsLinkingFaultOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  关闭
                </button>
              </div>
              {unlinkedFaults.length === 0 ? (
                <p className="text-xs text-slate-500">已全部关联当前所有故障模式。</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {unlinkedFaults.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => handleLinkFault(f.id)}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 hover:border-amber-400 hover:shadow-2xs cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-600">{f.id}</span>
                          <span className="text-xs font-medium text-slate-800">{f.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {f.root_cause || '暂无根因'}
                        </div>
                      </div>
                      <span className="text-xs text-amber-600 font-medium">+ 关联</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-6">
            {associatedFaults.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  当前参数尚未建立与故障模式的因果关联
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  点击上方“关联新故障”按钮，将此参数作为故障诊断的诱因条件
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  使用/受此参数漂移影响的故障 ({associatedFaults.length} 个):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {associatedFaults.map((fault) => (
                    <div
                      key={fault.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {fault.id}
                            </span>
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                                fault.severity === 'critical'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : fault.severity === 'high'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {fault.severity.toUpperCase()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlinkFault(fault.id)}
                            className="text-slate-400 hover:text-rose-500 text-xs cursor-pointer"
                            title="移除关联"
                          >
                            ✕
                          </button>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 mb-1">{fault.name}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          <strong>根因机制:</strong> {fault.root_cause}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          传播链: {fault.propagation_chain?.length || 0} 节点
                        </span>
                        <button
                          type="button"
                          onClick={() => openFaultEditor(fault.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <span>查看详情</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 卡片 4: YAML 定义预览与导出 (折叠式) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsYamlExpanded(!isYamlExpanded)}
            className="w-full px-6 py-4 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">YAML 配置结构标准代码</span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({isYamlExpanded ? '点击收起' : '点击展开查看'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isYamlExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {isYamlExpanded && (
            <div className="p-6 pt-2 border-t border-slate-200 bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Schema: v1.1 DiagnosGraph-Parameter-Spec
                </span>
                <button
                  type="button"
                  onClick={handleCopyYaml}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition-colors cursor-pointer"
                >
                  {copiedYaml ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制 YAML</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs font-mono text-emerald-300 p-4 bg-slate-950/80 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                {yamlContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
