import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DeviceNode } from '../types';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Search,
  Layers,
  AlertOctagon,
  Code,
  Copy,
  PlusCircle,
  X,
  ExternalLink,
  Cpu,
  Gauge,
  Tag,
  Boxes,
  CheckCircle2,
} from 'lucide-react';
import * as yaml from 'js-yaml';

export const DeviceBOMTree: React.FC = () => {
  const {
    devices,
    faults,
    indicators,
    selectedDeviceId,
    setSelectedDeviceId,
    addDevice,
    updateDevice,
    deleteDevice,
    showToast,
    openFaultEditor,
    openIndicatorEditor,
  } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    '储能变流与电能变换系统': true,
    '电池储能与管理系统': true,
    '温控与流体循环系统': true,
    '消防与环境安全系统': true,
    '变配电与升压系统': true,
    '站级监控与通讯系统': true,
  });

  const [expandedDeviceIds, setExpandedDeviceIds] = useState<Record<string, boolean>>({
    'DEV-PCS-1500V': true,
    'DEV-BATTERY-RACK': true,
    'DEV-CABIN-40FT': true,
    'DEV-BMS-MASTER': true,
  });

  // Modals for picking faults/telemetry metrics
  const [showFaultPicker, setShowFaultPicker] = useState(false);
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [showYamlModal, setShowYamlModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form editing state
  const selectedDevice = useMemo(() => {
    return devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;
  }, [devices, selectedDeviceId]);

  const [formData, setFormData] = useState<Partial<DeviceNode>>({});

  // Sync formData when selected device changes
  React.useEffect(() => {
    if (selectedDevice) {
      setFormData({
        name: selectedDevice.name,
        category: selectedDevice.category || '储能变流与电能变换系统',
        device_type: selectedDevice.device_type,
        version: selectedDevice.version || '',
        parent_id: selectedDevice.parent_id || null,
        description: selectedDevice.description || '',
        rating_specs: selectedDevice.rating_specs || '',
        manufacturer_model: selectedDevice.manufacturer_model || '',
        associated_fault_ids: [...(selectedDevice.associated_fault_ids || [])],
        telemetry_metric_codes: [...(selectedDevice.telemetry_metric_codes || [])],
      });
    }
  }, [selectedDevice]);

  // Categories list
  const CATEGORIES = [
    '储能变流与电能变换系统',
    '电池储能与管理系统',
    '温控与流体循环系统',
    '消防与环境安全系统',
    '变配电与升压系统',
    '站级监控与通讯系统',
  ];

  const DEVICE_TYPES = [
    { value: 'pcs_converter', label: '储能变流器 PCS (pcs_converter)' },
    { value: 'igbt_module', label: 'IGBT 功率模块 (igbt_module)' },
    { value: 'ventilation_fan', label: '散热排风机 (ventilation_fan)' },
    { value: 'controller_board', label: '主控 DSP/FPGA 板 (controller_board)' },
    { value: 'battery_rack', label: '电池高压簇 (battery_rack)' },
    { value: 'battery_module', label: '电池模组 Pack (battery_module)' },
    { value: 'bms_master', label: '电池管理总控 BCU (bms_master)' },
    { value: 'hv_relay_box', label: '高压继电器箱 (hv_relay_box)' },
    { value: 'liquid_chiller', label: '液冷温控工业水机 (liquid_chiller)' },
    { value: 'cooling_pump', label: '冷却循环水泵 (cooling_pump)' },
    { value: 'cooling_pipe', label: '冷却管路/流量计 (cooling_pipe)' },
    { value: 'fss', label: '自动气体灭火系统 (fss)' },
    { value: 'fire_detector', label: '复合火灾探测器 (fire_detector)' },
    { value: 'power_transformer', label: '主变压器 (power_transformer)' },
    { value: 'gas_relay', label: '瓦斯继电器 (gas_relay)' },
    { value: 'insulation_monitor', label: '绝缘阻抗监测仪 (insulation_monitor)' },
    { value: 'ems_gateway', label: 'EMS 通讯网关 (ems_gateway)' },
    { value: 'generic_component', label: '通用电气部件 (generic_component)' },
  ];

  // Group devices by category
  const categorizedDevices = useMemo(() => {
    const map = new Map<string, DeviceNode[]>();
    CATEGORIES.forEach((cat) => map.set(cat, []));

    devices.forEach((d) => {
      const cat = d.category || '储能变流与电能变换系统';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(d);
    });

    return map;
  }, [devices]);

  // Children mapping for nested component tree
  const childrenMap = useMemo(() => {
    const map = new Map<string, DeviceNode[]>();
    devices.forEach((d) => {
      if (d.parent_id) {
        if (!map.has(d.parent_id)) map.set(d.parent_id, []);
        map.get(d.parent_id)!.push(d);
      }
    });
    return map;
  }, [devices]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleDeviceExpand = (devId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDeviceIds((prev) => ({ ...prev, [devId]: !prev[devId] }));
  };

  const handleSave = () => {
    if (!selectedDevice) return;
    if (!formData.name?.trim()) {
      showToast('设备名称不可为空', 'error');
      return;
    }
    updateDevice(selectedDevice.id, formData);
    showToast(`已更新设备型号配置: ${formData.name}`, 'success');
  };

  // State for new device modal
  const [newDevForm, setNewDevForm] = useState<Partial<DeviceNode>>({
    id: '',
    name: '',
    category: '储能变流与电能变换系统',
    device_type: 'pcs_converter',
    version: '标准版 v1.0',
    rating_specs: '',
    manufacturer_model: '',
    description: '',
    parent_id: null,
  });

  const handleCreateDevice = () => {
    if (!newDevForm.name?.trim()) {
      showToast('请填写设备类型名称', 'error');
      return;
    }
    const nextIdx = devices.length + 1;
    const newId = newDevForm.id || `DEV-${newDevForm.device_type?.toUpperCase() || 'EQUIP'}-${nextIdx}`;
    const createdId = addDevice({
      ...newDevForm,
      id: newId,
    });
    setShowCreateModal(false);
    setSelectedDeviceId(createdId);
    setNewDevForm({
      id: '',
      name: '',
      category: '储能变流与电能变换系统',
      device_type: 'pcs_converter',
      version: '标准版 v1.0',
      rating_specs: '',
      manufacturer_model: '',
      description: '',
      parent_id: null,
    });
  };

  // Render a single device node (and its subcomponents if parent)
  const renderDeviceItem = (device: DeviceNode, depth = 0) => {
    const children = childrenMap.get(device.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedDeviceIds[device.id];
    const isSelected = selectedDeviceId === device.id;

    // Filter matching
    const matchesSearch =
      !searchFilter ||
      device.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      device.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (device.version && device.version.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (device.manufacturer_model &&
        device.manufacturer_model.toLowerCase().includes(searchFilter.toLowerCase()));

    if (!matchesSearch && searchFilter) return null;

    return (
      <div key={device.id} className="select-none">
        <div
          onClick={() => setSelectedDeviceId(device.id)}
          className={`flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer transition text-xs group ${
            isSelected
              ? 'bg-slate-900 text-white font-medium shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          style={{ paddingLeft: `${Math.max(depth * 14 + 10, 10)}px` }}
        >
          <div className="flex items-center space-x-2 truncate mr-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleDeviceExpand(device.id, e)}
                className={`p-0.5 rounded ${
                  isSelected ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span
                className={`w-3.5 h-3.5 flex items-center justify-center font-mono text-[10px] ${
                  isSelected ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                •
              </span>
            )}
            <div className="truncate">
              <span className="font-semibold">{device.name}</span>
              {device.version && (
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {device.version}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {device.associated_fault_ids && device.associated_fault_ids.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isSelected
                    ? 'bg-amber-400 text-slate-900 font-semibold'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {device.associated_fault_ids.length} 故障
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 ml-4 pl-1 my-0.5 space-y-0.5">
            {children.map((child) => renderDeviceItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-slate-800" />
            <span>设备 BOM 型号与版本管理</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            按设备系统分类与规格版本管理电站设备资产，挂载时序指标与故障模式（不绑定具体物理电站）
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>新建设备类型/版本</span>
          </button>
          <button
            onClick={() => setShowYamlModal(true)}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition shadow-xs"
          >
            <Code className="w-3.5 h-3.5 text-slate-600" />
            <span>BOM YAML</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Left Categorized/Version Tree + Right Device Type Detail Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Categorized & Version Tree */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[780px] shadow-xs">
          {/* Search Bar */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="搜索设备类型、版本型号、编码..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>共 {devices.length} 个设备类型/部件版本</span>
              <button
                onClick={() => {
                  const allCat: Record<string, boolean> = {};
                  CATEGORIES.forEach((c) => (allCat[c] = true));
                  setExpandedCategories(allCat);
                  const allDev: Record<string, boolean> = {};
                  devices.forEach((d) => (allDev[d.id] = true));
                  setExpandedDeviceIds(allDev);
                }}
                className="text-slate-900 hover:underline font-semibold"
              >
                展开全部
              </button>
            </div>
          </div>

          {/* Tree Scroll Area: Categorized Groups */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 border-t border-slate-100 pt-2.5">
            {CATEGORIES.map((category) => {
              const catDevs = (categorizedDevices.get(category) || []).filter(
                (d) => !d.parent_id // Show root devices in category, child devices expand under them
              );
              const isCatExpanded = !!expandedCategories[category];

              if (catDevs.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-100/80 hover:bg-slate-100 text-slate-800 cursor-pointer font-bold text-xs select-none transition"
                  >
                    <div className="flex items-center space-x-1.5">
                      {isCatExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <span>{category}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white text-slate-600 font-mono border border-slate-200">
                      {categorizedDevices.get(category)?.length || 0}
                    </span>
                  </div>

                  {/* Category Device List */}
                  {isCatExpanded && (
                    <div className="space-y-0.5 pl-1.5 pt-0.5">
                      {catDevs.map((dev) => renderDeviceItem(dev, 0))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Device Detail Editor (without associated alarms) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 h-[780px] overflow-y-auto shadow-xs">
          {selectedDevice ? (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                      {selectedDevice.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{selectedDevice.name}</h3>
                    {selectedDevice.version && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-medium">
                        {selectedDevice.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    分类: <span className="font-semibold text-slate-700">{selectedDevice.category}</span> • 额定铭牌: <span className="font-mono text-slate-700">{selectedDevice.rating_specs || '未填写'}</span>
                  </p>
                </div>

                <button
                  onClick={() => deleteDevice(selectedDevice.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="删除此设备定义"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    设备类型名称
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
                    所属系统分类 (Category)
                  </label>
                  <select
                    value={formData.category || '储能变流与电能变换系统'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    规格版本 / 型号版本 (Version)
                  </label>
                  <input
                    type="text"
                    value={formData.version || ''}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="如: 全液冷集中式 1500V 2.5MW / 280Ah 磷酸铁锂高压簇"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    设备类型代码 (device_type)
                  </label>
                  <select
                    value={formData.device_type || 'generic_component'}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    上级主设备 (parent_id)
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parent_id: e.target.value ? e.target.value : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="">（独立顶级设备型号，如整机/舱体）</option>
                    {devices
                      .filter((d) => d.id !== selectedDevice.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.version ? `${d.version} - ` : ''}{d.id})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    厂商型号代码 / 订货型号
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer_model || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer_model: e.target.value })}
                    placeholder="如: PCS-2500K-L / LFP-1P16S-280AH"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    额定电气与物理规格 (rating_specs)
                  </label>
                  <input
                    type="text"
                    value={formData.rating_specs || ''}
                    onChange={(e) => setFormData({ ...formData, rating_specs: e.target.value })}
                    placeholder="如: 额定容量 2500kVA / 直流输入电压 DC 1000V-1500V / 流量 150L/min"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    设备型号描述与技术规范
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述该设备类型与版本的拓扑设计、关键元器件架构与安全防护..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Section: Associated Telemetry Indicators (from Indicator Library) */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-800">
                      采集时序指标 (Telemetry Metrics: {formData.telemetry_metric_codes?.length || 0})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMetricPicker(true)}
                    className="text-xs text-slate-900 hover:text-slate-700 font-medium flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>挂载指标</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(formData.telemetry_metric_codes || []).map((mCode) => {
                    const ind = indicators.find((item) => item.code === mCode || item.id === mCode);
                    return (
                      <div
                        key={mCode}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs"
                      >
                        <span className="font-semibold">{ind ? ind.name : mCode}</span>
                        <span className="text-[10px] font-mono text-slate-500">({mCode})</span>
                        {ind && (
                          <button
                            onClick={() => openIndicatorEditor(ind.id)}
                            className="p-0.5 text-slate-400 hover:text-slate-800"
                            title="前往指标库查看"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              telemetry_metric_codes: (
                                formData.telemetry_metric_codes || []
                              ).filter((c) => c !== mCode),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(!formData.telemetry_metric_codes ||
                    formData.telemetry_metric_codes.length === 0) && (
                    <span className="text-xs text-slate-400 italic">
                      暂未显式挂载指标（将默认继承设备类型支持的所有遥测指标）
                    </span>
                  )}
                </div>
              </div>

              {/* Section: Associated Faults */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <AlertOctagon className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-800">
                      关联故障模式 ({formData.associated_fault_ids?.length || 0})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowFaultPicker(true)}
                    className="text-xs text-slate-900 hover:text-slate-700 font-medium flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>关联故障</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(formData.associated_fault_ids || []).map((fid) => {
                    const f = faults.find((item) => item.id === fid);
                    return (
                      <div
                        key={fid}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs"
                      >
                        <span>{f ? f.name : fid}</span>
                        {f && (
                          <button
                            onClick={() => openFaultEditor(f.id)}
                            className="p-0.5 text-slate-400 hover:text-slate-800"
                            title="前往编辑故障"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              associated_fault_ids: (
                                formData.associated_fault_ids || []
                              ).filter((id) => id !== fid),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(!formData.associated_fault_ids ||
                    formData.associated_fault_ids.length === 0) && (
                    <span className="text-xs text-slate-400 italic">暂未关联故障模式</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    if (selectedDevice) {
                      setFormData({
                        name: selectedDevice.name,
                        category: selectedDevice.category,
                        device_type: selectedDevice.device_type,
                        version: selectedDevice.version,
                        parent_id: selectedDevice.parent_id,
                        description: selectedDevice.description,
                        rating_specs: selectedDevice.rating_specs,
                        manufacturer_model: selectedDevice.manufacturer_model,
                        associated_fault_ids: selectedDevice.associated_fault_ids,
                        telemetry_metric_codes: selectedDevice.telemetry_metric_codes,
                      });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                >
                  取消改动
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Save className="w-4 h-4" />
                  <span>保存设备配置</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Layers className="w-10 h-10 stroke-1 mb-2" />
              <p className="text-xs">请在左侧选择或新建设备类型/版本</p>
            </div>
          )}
        </div>
      </div>

      {/* Metric Picker Modal */}
      {showMetricPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-slate-800" />
                <span>选择设备支持的时序指标 (来自指标库)</span>
              </h3>
              <button
                onClick={() => setShowMetricPicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {indicators.map((ind) => {
                const isSelected = (formData.telemetry_metric_codes || []).includes(ind.code);
                return (
                  <div
                    key={ind.id}
                    onClick={() => {
                      const current = formData.telemetry_metric_codes || [];
                      const next = isSelected
                        ? current.filter((c) => c !== ind.code)
                        : [...current, ind.code];
                      setFormData({ ...formData, telemetry_metric_codes: next });
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs transition ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{ind.name}</div>
                      <div
                        className={`text-[10px] mt-0.5 font-mono ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {ind.code} • 域: {ind.domain} • 单位: {ind.unit}
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
                onClick={() => setShowMetricPicker(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
              >
                完成选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fault Picker Modal */}
      {showFaultPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">选择关联的储能故障模式</h3>
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
                      const current = formData.associated_fault_ids || [];
                      const next = isSelected
                        ? current.filter((id) => id !== f.id)
                        : [...current, f.id];
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
                      <div
                        className={`text-[10px] mt-0.5 font-mono ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {f.id} • 等级: {f.severity}
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
                onClick={() => setShowFaultPicker(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
              >
                完成选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Device Type Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-slate-800" />
                <span>新建设备类型 / 规格版本</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    设备名称 *
                  </label>
                  <input
                    type="text"
                    value={newDevForm.name || ''}
                    onChange={(e) => setNewDevForm({ ...newDevForm, name: e.target.value })}
                    placeholder="如: 集中式双向变流器 PCS"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    所属系统分类
                  </label>
                  <select
                    value={newDevForm.category || '储能变流与电能变换系统'}
                    onChange={(e) => setNewDevForm({ ...newDevForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    规格版本 / 型号版本
                  </label>
                  <input
                    type="text"
                    value={newDevForm.version || ''}
                    onChange={(e) => setNewDevForm({ ...newDevForm, version: e.target.value })}
                    placeholder="如: 1500V 2.5MW 集中式"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    设备类型 (device_type)
                  </label>
                  <select
                    value={newDevForm.device_type || 'pcs_converter'}
                    onChange={(e) => setNewDevForm({ ...newDevForm, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  额定电气规格 (rating_specs)
                </label>
                <input
                  type="text"
                  value={newDevForm.rating_specs || ''}
                  onChange={(e) => setNewDevForm({ ...newDevForm, rating_specs: e.target.value })}
                  placeholder="如: 2500kVA / 1500V DC / 690V AC"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  描述与说明
                </label>
                <textarea
                  rows={2}
                  value={newDevForm.description || ''}
                  onChange={(e) => setNewDevForm({ ...newDevForm, description: e.target.value })}
                  placeholder="技术规范描述..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2.5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
              >
                取消
              </button>
              <button
                onClick={handleCreateDevice}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Device YAML Modal */}
      {showYamlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Code className="w-4 h-4 text-slate-700" />
                <span>设备 BOM 结构 YAML 预览 (devices.yaml)</span>
              </h3>
              <button
                onClick={() => setShowYamlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
              {yaml.dump({ devices }, { indent: 2, noRefs: true })}
            </pre>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                按类别与版本标准化的设备资产 BOM 规范
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yaml.dump({ devices }, { indent: 2, noRefs: true }));
                  showToast('已复制 devices.yaml 至剪贴板', 'success');
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
