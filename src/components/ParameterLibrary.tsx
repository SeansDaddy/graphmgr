import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ConfigParameter, ParameterDataType } from '../types';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Cpu,
  Layers,
  Flame,
  Zap,
  Activity,
  ShieldCheck,
  Trash2,
  FileCode,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

const DOMAIN_OPTIONS = ['全部', '储能', 'PCS', 'BMS', '冷却', '消防', '环控', '电气'];
const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'enum', label: '枚举型 (enum)' },
  { value: 'int', label: '整型数值 (int)' },
  { value: 'float', label: '浮点数值 (float)' },
  { value: 'bool', label: '布尔开关 (bool)' },
  { value: 'string', label: '字符文本 (string)' },
];

export const ParameterLibrary: React.FC = () => {
  const {
    parameters,
    openParameterEditor,
    addParameter,
    deleteParameter,
    publishParameter,
    faults,
    openFaultEditor,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('全部');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDeviceType, setSelectedDeviceType] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New parameter modal form state
  const [newParamForm, setNewParamForm] = useState({
    code: '',
    name: '',
    domain: '冷却',
    device_type: 'pump',
    param_type: 'enum' as ParameterDataType,
    description: '',
    default_value: 'auto',
  });

  // Extract all distinct device types
  const allDeviceTypes = useMemo(() => {
    const set = new Set<string>();
    parameters.forEach((p) => {
      p.applicable_device_types.forEach((dt) => set.add(dt));
    });
    return Array.from(set).sort();
  }, [parameters]);

  // Filtered parameters
  const filteredParameters = useMemo(() => {
    return parameters.filter((param) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = param.code.toLowerCase().includes(q);
        const matchName = param.name.toLowerCase().includes(q);
        const matchDesc = param.description.toLowerCase().includes(q);
        const matchUnit = param.unit?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDesc && !matchUnit) return false;
      }
      // Domain
      if (selectedDomain !== '全部' && param.domain !== selectedDomain) {
        return false;
      }
      // Type
      if (selectedType !== 'all' && param.param_type !== selectedType) {
        return false;
      }
      // Device Type
      if (
        selectedDeviceType !== 'all' &&
        !param.applicable_device_types.includes(selectedDeviceType)
      ) {
        return false;
      }
      return true;
    });
  }, [parameters, searchQuery, selectedDomain, selectedType, selectedDeviceType]);

  // Statistics
  const stats = useMemo(() => {
    const enumCount = parameters.filter((p) => p.param_type === 'enum').length;
    const numericCount = parameters.filter(
      (p) => p.param_type === 'int' || p.param_type === 'float'
    ).length;
    const boolCount = parameters.filter((p) => p.param_type === 'bool').length;
    const publishedCount = parameters.filter((p) => p.status === 'published').length;
    const associatedFaultsCount = parameters.reduce(
      (acc, p) => acc + (p.associated_fault_ids?.length || 0),
      0
    );
    return {
      total: parameters.length,
      enumCount,
      numericCount,
      boolCount,
      publishedCount,
      associatedFaultsCount,
    };
  }, [parameters]);

  const handleCopyYaml = (param: ConfigParameter, e: React.MouseEvent) => {
    e.stopPropagation();
    const yaml = `# DiagnosGraph 配置参数定义
code: "${param.code}"
name: "${param.name}"
domain: "${param.domain}"
type: "${param.param_type}"
default_value: ${JSON.stringify(param.default_value)}
${param.unit ? `unit: "${param.unit}"\n` : ''}${
      param.range_min !== undefined ? `range_min: ${param.range_min}\n` : ''
    }${param.range_max !== undefined ? `range_max: ${param.range_max}\n` : ''}${
      param.enum_values
        ? `enum_values:\n` +
          param.enum_values.map((ev) => `  - key: "${ev.key}"\n    label: "${ev.label}"`).join('\n') +
          '\n'
        : ''
    }applicable_devices: [${param.applicable_device_types.map((d) => `"${d}"`).join(', ')}]
associated_faults: [${param.associated_fault_ids.map((f) => `"${f}"`).join(', ')}]
description: "${param.description.replace(/"/g, '\\"')}"
status: "${param.status}"
`;
    navigator.clipboard.writeText(yaml);
    setCopiedId(param.id);
    showToast(`已复制参数 [${param.code}] 的标准 YAML 配置`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateParam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParamForm.code.trim()) {
      showToast('请输入参数编码 (snake_case)', 'warning');
      return;
    }
    if (!newParamForm.name.trim()) {
      showToast('请输入参数中文名称', 'warning');
      return;
    }

    const createdId = addParameter({
      code: newParamForm.code,
      name: newParamForm.name,
      domain: newParamForm.domain,
      applicable_device_types: [newParamForm.device_type],
      param_type: newParamForm.param_type,
      description: newParamForm.description,
      default_value:
        newParamForm.param_type === 'bool'
          ? true
          : newParamForm.param_type === 'int'
          ? 0
          : newParamForm.param_type === 'float'
          ? 0.0
          : newParamForm.default_value,
      status: 'draft',
    });

    setIsCreateModalOpen(false);
    openParameterEditor(createdId);
  };

  const getTypeBadge = (type: ParameterDataType) => {
    switch (type) {
      case 'enum':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
            enum
          </span>
        );
      case 'int':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
            int
          </span>
        );
      case 'float':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
            float
          </span>
        );
      case 'bool':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            bool
          </span>
        );
      case 'string':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/80">
            string
          </span>
        );
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case '冷却':
        return <Activity className="w-3.5 h-3.5 text-sky-600 mr-1" />;
      case '储能':
        return <Zap className="w-3.5 h-3.5 text-amber-600 mr-1" />;
      case 'PCS':
        return <Cpu className="w-3.5 h-3.5 text-indigo-600 mr-1" />;
      case 'BMS':
        return <Layers className="w-3.5 h-3.5 text-emerald-600 mr-1" />;
      case '消防':
        return <Flame className="w-3.5 h-3.5 text-rose-600 mr-1" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-slate-500 mr-1" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* 顶部标题栏与快捷操作 */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 font-semibold shadow-xs">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    配置参数库 <span className="text-indigo-600">({parameters.length})</span>
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    v1.1 核心模块
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  储能系统设备静态参数建模、安全基线约束定义与故障反向因果追溯
                </p>
              </div>
            </div>
          </div>

          {/* 筛选与操作按键 */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>申请新参数</span>
            </button>
          </div>
        </div>

        {/* 快捷统计与域筛选条 */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 域过滤标签 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-sm">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap mr-1">筛选域:</span>
            {DOMAIN_OPTIONS.map((domain) => {
              const count =
                domain === '全部'
                  ? parameters.length
                  : parameters.filter((p) => p.domain === domain).length;
              const isSelected = selectedDomain === domain;
              return (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span>{domain}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 指标微统计 */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              枚举型: <strong className="text-slate-700">{stats.enumCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              数值型: <strong className="text-slate-700">{stats.numericCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              布尔型: <strong className="text-slate-700">{stats.boolCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              关联故障: <strong className="text-slate-700">{stats.associatedFaultsCount} 处</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 搜索与多维过滤条 */}
      <div className="px-6 py-3 bg-white/70 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索参数编码 (snake_case)、中文名、约束或描述..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300/80 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* 按类型过滤 */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">按类型:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 按设备类型过滤 */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">按设备类型:</span>
            <select
              value={selectedDeviceType}
              onChange={(e) => setSelectedDeviceType(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部设备</option>
              {allDeviceTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || selectedDomain !== '全部' || selectedType !== 'all' || selectedDeviceType !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDomain('全部');
                setSelectedType('all');
                setSelectedDeviceType('all');
              }}
              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium ml-1 cursor-pointer"
            >
              重置过滤
            </button>
          )}
        </div>
      </div>

      {/* 参数表格列表展示区 (严格依照 4.9.1 规范) */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 text-xs font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-52">编码 (Code)</th>
                  <th className="py-3 px-4 min-w-[160px]">名称 (Name)</th>
                  <th className="py-3 px-3 w-20 text-center">类型</th>
                  <th className="py-3 px-3 w-24">域</th>
                  <th className="py-3 px-4 min-w-[140px]">适用设备类型</th>
                  <th className="py-3 px-4 min-w-[180px]">默认值 / 取值约束</th>
                  <th className="py-3 px-3 w-28 text-center">反向故障关联</th>
                  <th className="py-3 px-3 w-20 text-center">状态</th>
                  <th className="py-3 px-4 w-28 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredParameters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">未找到符合条件的配置参数</p>
                      <p className="text-xs text-slate-400 mt-1">
                        请调整搜索关键词或重置筛选条件
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredParameters.map((param) => {
                    const associatedFaultCount = param.associated_fault_ids?.length || 0;
                    return (
                      <tr
                        key={param.id}
                        onClick={() => openParameterEditor(param.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        {/* 编码 */}
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {param.code}
                            </span>
                          </div>
                        </td>

                        {/* 名称 & 描述 */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{param.name}</div>
                          <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5" title={param.description}>
                            {param.description || '无补充描述'}
                          </div>
                        </td>

                        {/* 类型 */}
                        <td className="py-3.5 px-3 text-center">
                          {getTypeBadge(param.param_type)}
                        </td>

                        {/* 域 */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {getDomainIcon(param.domain)}
                            {param.domain}
                          </span>
                        </td>

                        {/* 适用设备 */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center flex-wrap gap-1">
                            {param.applicable_device_types.map((dt) => (
                              <span
                                key={dt}
                                className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200/60"
                              >
                                {dt}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 默认值与约束展示 */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono font-semibold text-slate-900 text-xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {String(param.default_value)}
                            </span>
                            {param.unit && (
                              <span className="text-xs font-medium text-slate-500">
                                {param.unit}
                              </span>
                            )}
                          </div>
                          {/* 约束详情 */}
                          {param.param_type === 'enum' && param.enum_values && (
                            <div className="text-[11px] text-slate-500 mt-1 truncate max-w-xs font-mono">
                              取值: {param.enum_values.map((v) => v.key).join(' / ')}
                            </div>
                          )}
                          {(param.param_type === 'int' || param.param_type === 'float') && (
                            <div className="text-[11px] text-slate-500 mt-1 font-mono">
                              范围: {param.range_min ?? '-∞'} ~ {param.range_max ?? '+∞'}{' '}
                              {param.unit}
                            </div>
                          )}
                        </td>

                        {/* 反向故障关联 */}
                        <td className="py-3.5 px-3 text-center">
                          {associatedFaultCount > 0 ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                openParameterEditor(param.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                              title={param.associated_fault_ids.join(', ')}
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>{associatedFaultCount} 个故障</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">无直接关联</span>
                          )}
                        </td>

                        {/* 状态 */}
                        <td className="py-3.5 px-3 text-center">
                          {param.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              已发布
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-amber-600" />
                              草稿
                            </span>
                          )}
                        </td>

                        {/* 操作栏 */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleCopyYaml(param, e)}
                              title="复制 YAML 定义"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                              {copiedId === param.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openParameterEditor(param.id);
                              }}
                              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                              title="编辑参数详情"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* 表格底部信息 */}
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <div>
              显示 {filteredParameters.length} / {parameters.length} 个配置参数
            </div>
            <div className="flex items-center gap-2">
              <span>注：点击行进入参数详情与反向故障因果建模编辑器</span>
            </div>
          </div>
        </div>
      </div>

      {/* 申请新参数弹窗 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">申请并注册新配置参数</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateParam} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  参数编码 (snake_case, 唯一标识) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newParamForm.code}
                  onChange={(e) =>
                    setNewParamForm({ ...newParamForm, code: e.target.value.toLowerCase().trim() })
                  }
                  placeholder="例如: pump_control_mode, max_diff_voltage"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  用于算法公式、静态配置下发与 YAML 对齐
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  中文标准名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newParamForm.name}
                  onChange={(e) => setNewParamForm({ ...newParamForm, name: e.target.value })}
                  placeholder="例如: 冷却泵控制模式"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    所属系统域
                  </label>
                  <select
                    value={newParamForm.domain}
                    onChange={(e) => setNewParamForm({ ...newParamForm, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {DOMAIN_OPTIONS.filter((d) => d !== '全部').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    参数数据类型
                  </label>
                  <select
                    value={newParamForm.param_type}
                    onChange={(e) =>
                      setNewParamForm({
                        ...newParamForm,
                        param_type: e.target.value as ParameterDataType,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="enum">enum (枚举分类)</option>
                    <option value="int">int (整数数值)</option>
                    <option value="float">float (浮点数值)</option>
                    <option value="bool">bool (布尔使能)</option>
                    <option value="string">string (字符串)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  主要适用设备类型
                </label>
                <select
                  value={newParamForm.device_type}
                  onChange={(e) =>
                    setNewParamForm({ ...newParamForm, device_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="pump">pump (循环冷却泵)</option>
                  <option value="pipe">pipe (液冷管路)</option>
                  <option value="battery">battery (储能电芯/电池簇)</option>
                  <option value="bms">bms (电池管理系统)</option>
                  <option value="pcs">pcs (变流器)</option>
                  <option value="transformer">transformer (主变压器)</option>
                  <option value="cabin">cabin (储能集装箱/舱体)</option>
                  <option value="fss">fss (消防灭火系统)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  业务说明与约束描述
                </label>
                <textarea
                  rows={2}
                  value={newParamForm.description}
                  onChange={(e) =>
                    setNewParamForm({ ...newParamForm, description: e.target.value })
                  }
                  placeholder="说明该参数的控制机理、标准设定点或异常越限影响..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs"
                >
                  确认创建并编辑详情
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
