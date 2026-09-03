import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DeviceConfigurationProfile, ConfigParameter } from '../types';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Download,
  Search,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Flame,
  Layers,
  Edit3,
  Check,
  Copy,
} from 'lucide-react';

export const StaticConfigManager: React.FC = () => {
  const {
    staticConfigs,
    selectedProfileId,
    setSelectedProfileId,
    parameters,
    updateDeviceConfig,
    resetProfileToBaseline,
    openParameterEditor,
    openFaultEditor,
    faults,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingParamCode, setEditingParamCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Selected Profile
  const activeProfile = useMemo(() => {
    return (
      staticConfigs.find((p) => p.id === selectedProfileId) ||
      staticConfigs[0]
    );
  }, [staticConfigs, selectedProfileId]);

  // Profiles filtered by search
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return staticConfigs;
    const q = searchQuery.toLowerCase().trim();
    return staticConfigs.filter(
      (p) =>
        p.device_name.toLowerCase().includes(q) ||
        p.device_id.toLowerCase().includes(q) ||
        p.profile_name.toLowerCase().includes(q)
    );
  }, [staticConfigs, searchQuery]);

  // Mismatch and drift statistics
  const stats = useMemo(() => {
    let synced = 0;
    let drift = 0;
    let critical = 0;
    staticConfigs.forEach((p) => {
      if (p.baseline_status === 'synced') synced++;
      else if (p.baseline_status === 'drift_detected') drift++;
      else critical++;
    });
    return { synced, drift, critical, total: staticConfigs.length };
  }, [staticConfigs]);

  // Parse active profile's configuration items with parameter metadata
  const configItems = useMemo(() => {
    if (!activeProfile) return [];
    return Object.entries(activeProfile.configs).map(([code, currentValue]) => {
      const paramDef = parameters.find((p) => p.code === code || p.id === code);
      const baselineValue = paramDef ? paramDef.default_value : undefined;
      const isMismatch = baselineValue !== undefined && baselineValue !== currentValue;

      // Associated faults
      const associatedFaultIds = paramDef?.associated_fault_ids || [];
      const associatedFaults = faults.filter((f) => associatedFaultIds.includes(f.id));

      return {
        code,
        name: paramDef ? paramDef.name : code,
        domain: paramDef ? paramDef.domain : '通用',
        param_type: paramDef ? paramDef.param_type : 'string',
        unit: paramDef?.unit,
        currentValue,
        baselineValue,
        isMismatch,
        range_min: paramDef?.range_min,
        range_max: paramDef?.range_max,
        enum_values: paramDef?.enum_values,
        associatedFaults,
        description: paramDef?.description,
      };
    });
  }, [activeProfile, parameters, faults]);

  // Handle inline edit
  const startEditing = (code: string, val: any) => {
    setEditingParamCode(code);
    setEditValue(String(val));
  };

  const handleSaveParamValue = (code: string) => {
    if (!activeProfile) return;
    const targetItem = configItems.find((i) => i.code === code);
    let finalVal: string | number | boolean = editValue;
    if (targetItem?.param_type === 'bool') {
      finalVal = editValue === 'true';
    } else if (targetItem?.param_type === 'int' || targetItem?.param_type === 'float') {
      finalVal = Number(editValue);
    }
    updateDeviceConfig(activeProfile.id, code, finalVal);
    setEditingParamCode(null);
  };

  const handleExportYaml = () => {
    if (!activeProfile) return;
    const yaml = `# 设备静态参数下发档案
profile_id: "${activeProfile.id}"
device_id: "${activeProfile.device_id}"
device_name: "${activeProfile.device_name}"
updated_at: "${activeProfile.updated_at}"
baseline_status: "${activeProfile.baseline_status}"
configurations:
${Object.entries(activeProfile.configs)
  .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
  .join('\n')}
`;
    navigator.clipboard.writeText(yaml);
    setCopiedYaml(true);
    showToast(`已复制 [${activeProfile.device_name}] 静态参数档案 YAML`, 'success');
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 z-10 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 font-semibold shadow-xs">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    设备静态配置与安全基线核对
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    配置管理
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  现场静态参数档案监控、参数漂移审计及误配置诱发故障的前置预警
                </p>
              </div>
            </div>
          </div>

          {/* 状态统计卡 */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>基线合规: {stats.synced} 台</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>参数漂移: {stats.drift} 台</span>
            </div>
            <div className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-1.5 font-medium">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>严重偏离: {stats.critical} 台</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主体两栏布局: 左侧设备配置档案选择，右侧详细静态参数核对表 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧设备档案列表 */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索设备或档案..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredProfiles.map((profile) => {
              const isSelected = profile.id === activeProfile?.id;
              return (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/60 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {profile.device_name}
                    </span>
                    {profile.baseline_status === 'synced' ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        合规
                      </span>
                    ) : profile.baseline_status === 'drift_detected' ? (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        漂移 ({profile.mismatches_count})
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        严重 ({profile.mismatches_count})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mb-1">
                    {profile.device_id}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[150px]">{profile.profile_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Object.keys(profile.configs).length} 项参数
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧选定设备详细参数核对面板 */}
        {activeProfile ? (
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
            {/* 选定设备头部卡片 */}
            <div className="p-6 pb-3">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {activeProfile.device_id}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeProfile.device_name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>档案说明: {activeProfile.profile_name}</span>
                    <span>·</span>
                    <span>最后同步时间: {activeProfile.updated_at}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetProfileToBaseline(activeProfile.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer shadow-xs"
                    title="一键将该设备所有参数恢复至参数库出厂默认基准"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>一键对齐出厂基线</span>
                  </button>

                  <button
                    onClick={handleExportYaml}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>导出配置 YAML</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 漂移警示提示条 (如果有漂移) */}
            {activeProfile.baseline_status !== 'synced' && (
              <div className="px-6 pb-2">
                <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-amber-900">
                      监测到该设备存在 {activeProfile.mismatches_count} 项参数漂移或非标准配置！
                    </div>
                    <div className="text-amber-800/90 mt-0.5 leading-relaxed">
                      现场静态配置与 DiagnosGraph
                      推荐的标准出厂安全基准存在差异，可能会削弱保护冗余或增大特定故障模式的发生概率。请查看下方受影响的高危故障并及时处置。
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 参数核对表格 */}
            <div className="px-6 pb-6 flex-1">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                        <th className="py-3 px-4 w-44">参数编码 (Code)</th>
                        <th className="py-3 px-4 min-w-[130px]">中文名称</th>
                        <th className="py-3 px-3 w-16 text-center">类型</th>
                        <th className="py-3 px-4 min-w-[140px]">现场当前值</th>
                        <th className="py-3 px-4 min-w-[140px]">标准安全基准值</th>
                        <th className="py-3 px-3 w-24 text-center">合规状态</th>
                        <th className="py-3 px-4 min-w-[180px]">潜在触发故障模式</th>
                        <th className="py-3 px-3 w-20 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {configItems.map((item) => {
                        const isEditing = editingParamCode === item.code;
                        return (
                          <tr
                            key={item.code}
                            className={`transition-colors ${
                              item.isMismatch ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            {/* 编码 */}
                            <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800">
                              <span
                                onClick={() => openParameterEditor(item.code)}
                                className="cursor-pointer hover:text-indigo-600 hover:underline"
                                title="点击前往参数库编辑标准定义"
                              >
                                {item.code}
                              </span>
                            </td>

                            {/* 名称 */}
                            <td className="py-3 px-4">
                              <div className="text-xs font-medium text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-400">{item.domain}</div>
                            </td>

                            {/* 类型 */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {item.param_type}
                              </span>
                            </td>

                            {/* 现场当前值 (支持就地快速修改) */}
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  {item.param_type === 'enum' && item.enum_values ? (
                                    <select
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="px-2 py-1 text-xs border border-indigo-500 rounded bg-white font-mono"
                                    >
                                      {item.enum_values.map((ev) => (
                                        <option key={ev.key} value={ev.key}>
                                          {ev.key}
                                        </option>
                                      ))}
                                    </select>
                                  ) : item.param_type === 'bool' ? (
                                    <select
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="px-2 py-1 text-xs border border-indigo-500 rounded bg-white font-mono"
                                    >
                                      <option value="true">true</option>
                                      <option value="false">false</option>
                                    </select>
                                  ) : (
                                    <input
                                      type={item.param_type === 'int' || item.param_type === 'float' ? 'number' : 'text'}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-24 px-2 py-1 text-xs border border-indigo-500 rounded bg-white font-mono"
                                    />
                                  )}
                                  <button
                                    onClick={() => handleSaveParamValue(item.code)}
                                    className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                                  >
                                    确认
                                  </button>
                                  <button
                                    onClick={() => setEditingParamCode(null)}
                                    className="px-1.5 py-1 text-slate-400 text-xs hover:text-slate-600"
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                      item.isMismatch
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {String(item.currentValue)}
                                  </span>
                                  {item.unit && (
                                    <span className="text-xs text-slate-500">{item.unit}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 标准安全基线 */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                                <span>{String(item.baselineValue ?? '未设定')}</span>
                                {item.unit && <span className="text-slate-400">{item.unit}</span>}
                              </div>
                            </td>

                            {/* 状态徽章 */}
                            <td className="py-3 px-3 text-center">
                              {item.isMismatch ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  漂移
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  合规
                                </span>
                              )}
                            </td>

                            {/* 潜在触发故障模式 (因果链映射) */}
                            <td className="py-3 px-4">
                              {item.associatedFaults.length > 0 ? (
                                <div className="flex items-center flex-wrap gap-1">
                                  {item.associatedFaults.map((f) => (
                                    <button
                                      key={f.id}
                                      onClick={() => openFaultEditor(f.id)}
                                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                        item.isMismatch
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                      title={`${f.name} - 根因: ${f.root_cause}`}
                                    >
                                      <span>{f.id}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">无直接关联</span>
                              )}
                            </td>

                            {/* 操作 */}
                            <td className="py-3 px-3 text-right">
                              {!isEditing && (
                                <button
                                  onClick={() => startEditing(item.code, item.currentValue)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                  title="调整此现场参数值"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            请选择左侧设备以核对配置基线
          </div>
        )}
      </div>
    </div>
  );
};
