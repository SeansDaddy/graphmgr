import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MetricIndicator } from '../types';
import {
  Gauge,
  Search,
  Plus,
  Trash2,
  Save,
  AlertOctagon,
  ExternalLink,
  Layers,
  Filter,
  Code,
  Copy,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Tag,
  Info,
} from 'lucide-react';
import * as yaml from 'js-yaml';

export const IndicatorLibrary: React.FC = () => {
  const {
    indicators,
    faults,
    devices,
    selectedIndicatorId,
    setSelectedIndicatorId,
    addIndicator,
    updateIndicator,
    deleteIndicator,
    openFaultEditor,
    openDeviceInBom,
    showToast,
  } = useApp();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showYamlModal, setShowYamlModal] = useState(false);

  // Domains available
  const domains = [
    { id: 'all', label: '全部域' },
    { id: '储能本体', label: '储能本体' },
    { id: '电池BMS', label: '电池BMS' },
    { id: 'PCS/电气', label: 'PCS/电气' },
    { id: '冷却系统', label: '冷却系统' },
    { id: '消防安全', label: '消防安全' },
    { id: '变压器系统', label: '变压器系统' },
    { id: '站级监控', label: '站级监控' },
  ];

  // Selected indicator
  const selectedIndicator = useMemo(() => {
    return (
      indicators.find((i) => i.id === selectedIndicatorId || i.code === selectedIndicatorId) ||
      indicators[0] ||
      null
    );
  }, [indicators, selectedIndicatorId]);

  // Form data for editing selected indicator
  const [formData, setFormData] = useState<Partial<MetricIndicator>>({});

  React.useEffect(() => {
    if (selectedIndicator) {
      setFormData({
        code: selectedIndicator.code,
        name: selectedIndicator.name,
        unit: selectedIndicator.unit,
        domain: selectedIndicator.domain,
        device_types: [...(selectedIndicator.device_types || [])],
        description: selectedIndicator.description || '',
        normal_range: selectedIndicator.normal_range || '',
        data_type: selectedIndicator.data_type || 'float',
        sampling_interval: selectedIndicator.sampling_interval || '1s',
      });
    }
  }, [selectedIndicator]);

  // New indicator form state
  const [newIndForm, setNewIndForm] = useState<Partial<MetricIndicator>>({
    code: '',
    name: '',
    unit: '°C',
    domain: '储能本体',
    device_types: ['battery_rack'],
    description: '',
    normal_range: '15-40',
    data_type: 'float',
    sampling_interval: '1s',
  });

  // Filtered indicators list
  const filteredIndicators = useMemo(() => {
    return indicators.filter((ind) => {
      // Domain filter
      if (selectedDomain !== 'all' && ind.domain !== selectedDomain) {
        return false;
      }
      // Device Type filter
      if (
        selectedDeviceType !== 'all' &&
        !ind.device_types?.includes(selectedDeviceType)
      ) {
        return false;
      }
      // Search filter
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchCode = ind.code.toLowerCase().includes(q);
        const matchName = ind.name.toLowerCase().includes(q);
        const matchDesc = ind.description?.toLowerCase().includes(q) || false;
        const matchDomain = ind.domain.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDesc && !matchDomain) {
          return false;
        }
      }
      return true;
    });
  }, [indicators, selectedDomain, selectedDeviceType, searchKeyword]);

  // Reverse lookup: Find faults that reference this indicator
  const associatedFaults = useMemo(() => {
    if (!selectedIndicator) return [];
    return faults.filter((f) => {
      return (f.symptoms || []).some(
        (s) =>
          s.indicator_id === selectedIndicator.id ||
          s.indicator_id === selectedIndicator.code ||
          s.metric_code === selectedIndicator.code ||
          s.metric_name === selectedIndicator.name
      );
    });
  }, [faults, selectedIndicator]);

  // Reverse lookup: Find devices that support this indicator
  const supportingDevices = useMemo(() => {
    if (!selectedIndicator) return [];
    return devices.filter((d) => {
      const matchType = (selectedIndicator.device_types || []).includes(d.device_type);
      const matchExplicit = (d.telemetry_metric_codes || []).includes(selectedIndicator.code);
      return matchType || matchExplicit;
    });
  }, [devices, selectedIndicator]);

  const handleSaveIndicator = () => {
    if (!selectedIndicator) return;
    if (!formData.name?.trim() || !formData.code?.trim()) {
      showToast('指标名称与编码不可为空', 'error');
      return;
    }
    updateIndicator(selectedIndicator.id, formData);
    showToast(`已保存指标: ${formData.name}`, 'success');
  };

  const handleCreateNewIndicator = () => {
    if (!newIndForm.name?.trim() || !newIndForm.code?.trim()) {
      showToast('请填写指标名称与唯一标识编码', 'error');
      return;
    }
    const createdId = addIndicator(newIndForm);
    setShowAddModal(false);
    setSelectedIndicatorId(createdId);
    setNewIndForm({
      code: '',
      name: '',
      unit: '°C',
      domain: '储能本体',
      device_types: ['battery_rack'],
      description: '',
      normal_range: '15-40',
      data_type: 'float',
      sampling_interval: '1s',
    });
  };

  const ALL_DEVICE_TYPES = [
    { value: 'battery_rack', label: '电池高压簇 (battery_rack)' },
    { value: 'battery_module', label: '电池模组 Pack (battery_module)' },
    { value: 'bms_master', label: 'BMS 主控 BCU (bms_master)' },
    { value: 'pcs_converter', label: '储能变流器 PCS (pcs_converter)' },
    { value: 'igbt_module', label: 'IGBT 模块 (igbt_module)' },
    { value: 'liquid_chiller', label: '液冷温控水机 (liquid_chiller)' },
    { value: 'cooling_pump', label: '冷却循环泵 (cooling_pump)' },
    { value: 'cooling_pipe', label: '冷却管路 (cooling_pipe)' },
    { value: 'power_transformer', label: '主变压器 (power_transformer)' },
    { value: 'gas_relay', label: '瓦斯继电器 (gas_relay)' },
    { value: 'fss', label: '气体灭火系统 (fss)' },
    { value: 'fire_detector', label: '烟感探测器 (fire_detector)' },
    { value: 'hv_relay_box', label: '高压继电器箱 (hv_relay_box)' },
    { value: 'insulation_monitor', label: '绝缘监测仪 (insulation_monitor)' },
    { value: 'ems_gateway', label: 'EMS 网关 (ems_gateway)' },
    { value: 'generic_device', label: '通用设备 (generic_device)' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-slate-800" />
            <span>时序指标库管理 (Telemetry Indicators)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            定义全站遥测指标的统一命名、物理量纲、基准范围与适用设备，杜绝同名异义与语义冲突
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 申请新指标</span>
          </button>
          <button
            onClick={() => setShowYamlModal(true)}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition shadow-xs"
          >
            <Code className="w-3.5 h-3.5 text-slate-600" />
            <span>指标 YAML</span>
          </button>
        </div>
      </div>

      {/* Quick Domain Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {domains.map((dom) => {
          const count =
            dom.id === 'all'
              ? indicators.length
              : indicators.filter((i) => i.domain === dom.id).length;
          const isSelected = selectedDomain === dom.id;
          return (
            <button
              key={dom.id}
              onClick={() => setSelectedDomain(dom.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{dom.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split View: Left Indicator List Table + Right Indicator Detail / Reverse Lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Indicator List */}
        <div className="lg:col-span-6 xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[780px] shadow-xs">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索指标编码、名称、描述..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedDeviceType}
                onChange={(e) => setSelectedDeviceType(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              >
                <option value="all">所有设备类型</option>
                {ALL_DEVICE_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1 py-1 font-medium border-b border-slate-100 mb-2">
            <span>找到 {filteredIndicators.length} 个标准指标</span>
            <span className="text-[11px] text-slate-400">点击行查看详情与反向故障关联</span>
          </div>

          {/* Indicator Table */}
          <div className="flex-1 overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-2.5">指标编码</th>
                  <th className="py-2 px-2.5">指标名称</th>
                  <th className="py-2 px-2.5">单位</th>
                  <th className="py-2 px-2.5">域</th>
                  <th className="py-2 px-2.5">基准范围</th>
                  <th className="py-2 px-2.5 text-right">关联故障</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredIndicators.map((ind) => {
                  const isSelected =
                    selectedIndicator?.id === ind.id || selectedIndicator?.code === ind.code;
                  // Count faults referencing this indicator
                  const faultCount = faults.filter((f) =>
                    (f.symptoms || []).some(
                      (s) =>
                        s.indicator_id === ind.id ||
                        s.indicator_id === ind.code ||
                        s.metric_code === ind.code ||
                        s.metric_name === ind.name
                    )
                  ).length;

                  return (
                    <tr
                      key={ind.id}
                      onClick={() => setSelectedIndicatorId(ind.id)}
                      className={`cursor-pointer transition group ${
                        isSelected
                          ? 'bg-slate-900 text-white font-medium shadow-xs'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-slate-800 text-slate-200 font-semibold'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ind.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                        {ind.name}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-500 whitespace-nowrap">
                        <span className={isSelected ? 'text-slate-200' : 'text-slate-600'}>
                          {ind.unit || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isSelected
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {ind.domain}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap">
                        <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                          {ind.normal_range || '未定义'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {faultCount > 0 ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              isSelected
                                ? 'bg-amber-400 text-slate-900'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {faultCount} 个故障
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] ${
                              isSelected ? 'text-slate-400' : 'text-slate-300'
                            }`}
                          >
                            0
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredIndicators.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Gauge className="w-8 h-8 stroke-1 mb-2" />
                <p className="text-xs">无匹配的时序指标</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Indicator Detail & Reverse Fault Mapping */}
        <div className="lg:col-span-6 xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 h-[780px] overflow-y-auto shadow-xs">
          {selectedIndicator ? (
            <div className="space-y-6">
              {/* Top Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-semibold">
                      {selectedIndicator.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{selectedIndicator.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    所属域: <span className="font-semibold text-slate-700">{selectedIndicator.domain}</span> • 单位: <span className="font-mono font-semibold text-slate-700">{selectedIndicator.unit}</span>
                  </p>
                </div>

                <button
                  onClick={() => deleteIndicator(selectedIndicator.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="删除此指标定义"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    指标名称
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    唯一编码 (metric_code)
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    物理量纲 / 单位
                  </label>
                  <input
                    type="text"
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="如: °C, L/min, V, A, kΩ, ppm"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    所属领域 (Domain)
                  </label>
                  <select
                    value={formData.domain || '储能本体'}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="储能本体">储能本体</option>
                    <option value="电池BMS">电池BMS</option>
                    <option value="PCS/电气">PCS/电气</option>
                    <option value="冷却系统">冷却系统</option>
                    <option value="消防安全">消防安全</option>
                    <option value="变压器系统">变压器系统</option>
                    <option value="站级监控">站级监控</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    基准正常区间 (normal_range)
                  </label>
                  <input
                    type="text"
                    value={formData.normal_range || ''}
                    onChange={(e) => setFormData({ ...formData, normal_range: e.target.value })}
                    placeholder="如: 15-40, 50-200, >1000"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    采样周期 / 频率
                  </label>
                  <select
                    value={formData.sampling_interval || '1s'}
                    onChange={(e) => setFormData({ ...formData, sampling_interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  >
                    <option value="100ms">100ms (高频毫秒)</option>
                    <option value="500ms">500ms (半秒级)</option>
                    <option value="1s">1s (标准秒级)</option>
                    <option value="5s">5s (常规巡检)</option>
                    <option value="1min">1min (分钟级)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    适用设备类型 (多选)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
                    {ALL_DEVICE_TYPES.map((dt) => {
                      const isChecked = (formData.device_types || []).includes(dt.value);
                      return (
                        <label
                          key={dt.value}
                          className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const curr = formData.device_types || [];
                              const updated = e.target.checked
                                ? [...curr, dt.value]
                                : curr.filter((v) => v !== dt.value);
                              setFormData({ ...formData, device_types: updated });
                            }}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="truncate">{dt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    指标语义与物理释义
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述该遥测指标的物理测量方式、传感器布设点与异常预警机理..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveIndicator}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存指标定义</span>
                </button>
              </div>

              {/* Reverse Lookup Section: Associated Fault Patterns */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <AlertOctagon className="w-4 h-4 text-slate-800" />
                    <h4 className="text-xs font-bold text-slate-900">
                      引用此指标的故障模式 ({associatedFaults.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Symptom 特征匹配与反向追溯
                  </span>
                </div>

                {associatedFaults.length > 0 ? (
                  <div className="space-y-2.5">
                    {associatedFaults.map((f) => {
                      // Find matched symptom
                      const matchedSymptom = (f.symptoms || []).find(
                        (s) =>
                          s.indicator_id === selectedIndicator.id ||
                          s.indicator_id === selectedIndicator.code ||
                          s.metric_code === selectedIndicator.code ||
                          s.metric_name === selectedIndicator.name
                      );

                      return (
                        <div
                          key={f.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {f.name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {f.id}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                    f.severity === 'critical'
                                      ? 'bg-rose-100 text-rose-800'
                                      : f.severity === 'high'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {f.severity}
                                </span>
                              </div>

                              {matchedSymptom && (
                                <div className="mt-2 flex items-center space-x-3 text-[11px] text-slate-600">
                                  <span className="flex items-center space-x-1 font-medium">
                                    {matchedSymptom.direction === 'up' ? (
                                      <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                                    ) : matchedSymptom.direction === 'down' ? (
                                      <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
                                    ) : (
                                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                    <span>
                                      异常方向:{' '}
                                      {matchedSymptom.direction === 'up'
                                        ? '异常偏高 / 上升'
                                        : matchedSymptom.direction === 'down'
                                        ? '异常偏低 / 骤降'
                                        : '剧烈波动'}
                                    </span>
                                  </span>

                                  <span>•</span>
                                  <span>时间窗: {matchedSymptom.time_window || '0-5min'}</span>
                                  <span>•</span>
                                  <span className="font-mono">
                                    范围: {matchedSymptom.normal_range || selectedIndicator.normal_range}
                                  </span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => openFaultEditor(f.id)}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium shadow-xs transition"
                            >
                              <span>查看故障</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    当前尚无故障模式直接引用该指标，可在故障建模的 Symptom 中直接下拉关联
                  </div>
                )}
              </div>

              {/* Supporting Devices Section */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-slate-800" />
                    <h4 className="text-xs font-bold text-slate-900">
                      支持采集此指标的设备 BOM ({supportingDevices.length})
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {supportingDevices.slice(0, 10).map((d, idx) => (
                    <button
                      key={`${d.id}-${idx}`}
                      onClick={() => openDeviceInBom(d.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition flex items-center space-x-1"
                    >
                      <span>{d.name}</span>
                      <span className="text-slate-400 text-[9px] font-mono">({d.id})</span>
                    </button>
                  ))}
                  {supportingDevices.length > 10 && (
                    <span className="text-xs text-slate-400 self-center">
                      +{supportingDevices.length - 10} 更多设备
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Gauge className="w-10 h-10 stroke-1 mb-2" />
              <p className="text-xs">请在左侧选择或申请新指标</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Indicator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-slate-800" />
                <span>申请 / 录入新时序指标</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    指标名称 *
                  </label>
                  <input
                    type="text"
                    value={newIndForm.name || ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      // Simple auto snake_case pinyin/transliteration hint if code is empty
                      setNewIndForm({ ...newIndForm, name });
                    }}
                    placeholder="如: 冷却液电导率"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    唯一编码 (metric_code) *
                  </label>
                  <input
                    type="text"
                    value={newIndForm.code || ''}
                    onChange={(e) => setNewIndForm({ ...newIndForm, code: e.target.value })}
                    placeholder="如: coolant_conductivity"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    物理单位
                  </label>
                  <input
                    type="text"
                    value={newIndForm.unit || ''}
                    onChange={(e) => setNewIndForm({ ...newIndForm, unit: e.target.value })}
                    placeholder="如: μS/cm, °C, L/min"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    所属领域 (Domain)
                  </label>
                  <select
                    value={newIndForm.domain || '储能本体'}
                    onChange={(e) => setNewIndForm({ ...newIndForm, domain: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="储能本体">储能本体</option>
                    <option value="电池BMS">电池BMS</option>
                    <option value="PCS/电气">PCS/电气</option>
                    <option value="冷却系统">冷却系统</option>
                    <option value="消防安全">消防安全</option>
                    <option value="变压器系统">变压器系统</option>
                    <option value="站级监控">站级监控</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    基准正常区间
                  </label>
                  <input
                    type="text"
                    value={newIndForm.normal_range || ''}
                    onChange={(e) => setNewIndForm({ ...newIndForm, normal_range: e.target.value })}
                    placeholder="如: 0.1-5.0"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    采样周期
                  </label>
                  <select
                    value={newIndForm.sampling_interval || '1s'}
                    onChange={(e) => setNewIndForm({ ...newIndForm, sampling_interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  >
                    <option value="100ms">100ms</option>
                    <option value="500ms">500ms</option>
                    <option value="1s">1s</option>
                    <option value="5s">5s</option>
                    <option value="1min">1min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  指标说明与定义
                </label>
                <textarea
                  rows={2}
                  value={newIndForm.description || ''}
                  onChange={(e) => setNewIndForm({ ...newIndForm, description: e.target.value })}
                  placeholder="该指标的测量含义及用于诊断什么故障..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2.5">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
              >
                取消
              </button>
              <button
                onClick={handleCreateNewIndicator}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
              >
                确认创建指标
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YAML Preview Modal */}
      {showYamlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Code className="w-4 h-4 text-slate-700" />
                <span>时序指标库 YAML (indicators.yaml)</span>
              </h3>
              <button
                onClick={() => setShowYamlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
              {yaml.dump({ indicators }, { indent: 2, noRefs: true })}
            </pre>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                包含 {indicators.length} 个标准指标定义，供故障诊断引擎进行特征量纲标准化
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yaml.dump({ indicators }, { indent: 2, noRefs: true }));
                  showToast('已复制 indicators.yaml 至剪贴板', 'success');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制全部</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
