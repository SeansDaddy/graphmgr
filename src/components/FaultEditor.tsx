import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FaultPattern,
  FaultSymptom,
  Symptom,
  SymptomType,
  SeverityLevel,
  DeviceTypeCategory,
  DEVICE_TYPE_OPTIONS,
  EventSequencePattern,
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
  BellRing,
  SlidersHorizontal,
  History,
  Sliders,
  Filter,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { generateSingleFaultYaml } from '../utils/yamlUtils';

// Helper to infer suitable default device type from indicator name or code
const inferDeviceTypeFromIndicator = (
  ind?: { code?: string; name?: string; domain?: string }
): { device_type: DeviceTypeCategory; device_name: string } => {
  if (!ind) return { device_type: 'other', device_name: '辅助监控设备' };
  const text = `${ind.code || ''} ${ind.name || ''} ${ind.domain || ''}`.toLowerCase();
  if (text.includes('flow') || text.includes('pump') || text.includes('泵')) {
    return { device_type: 'cooling_pump', device_name: '冷却水泵/循环机组' };
  }
  if (text.includes('gas') || text.includes('瓦斯')) {
    return { device_type: 'gas_relay', device_name: '瓦斯保护继电器' };
  }
  if (text.includes('temp') && text.includes('oil') || text.includes('transformer') || text.includes('变压器') || text.includes('油温')) {
    return { device_type: 'transformer', device_name: '储能主变压器' };
  }
  if (text.includes('cell') || text.includes('volt') || text.includes('soc') || text.includes('soh') || text.includes('diff') || text.includes('电池') || text.includes('电芯') || text.includes('压差')) {
    return { device_type: 'battery', device_name: '储能电池簇/电芯' };
  }
  if (text.includes('bms') || text.includes('can') || text.includes('insul') || text.includes('绝缘') || text.includes('母线')) {
    return { device_type: 'bms', device_name: 'BMS 电池管理系统' };
  }
  if (text.includes('pcs') || text.includes('igbt') || text.includes('inverter') || text.includes('变流器') || text.includes('无功')) {
    return { device_type: 'pcs', device_name: '集中式变流器 (PCS)' };
  }
  if (text.includes('switch') || text.includes('breaker') || text.includes('relay') || text.includes('接触器') || text.includes('开关柜') || text.includes('断路器') || text.includes('arc') || text.includes('电弧')) {
    return { device_type: 'switchgear', device_name: '高低压开关柜/断路器' };
  }
  if (text.includes('cabin') || text.includes('humidity') || text.includes('hvac') || text.includes('舱') || text.includes('湿度') || text.includes('空调')) {
    return { device_type: 'cabin', device_name: '集装箱舱体' };
  }
  if (text.includes('pipe') || text.includes('leak') || text.includes('press') || text.includes('管路') || text.includes('压力') || text.includes('渗漏')) {
    return { device_type: 'pipe', device_name: '液冷管路系统' };
  }
  if (text.includes('co') || text.includes('fire') || text.includes('fss') || text.includes('灭火') || text.includes('消防') || text.includes('热失控')) {
    return { device_type: 'fss', device_name: '全氟己酮灭火系统' };
  }
  return { device_type: 'other', device_name: '辅助监控设备' };
};

export const FaultEditor: React.FC = () => {
  const {
    faults,
    devices,
    sops,
    indicators,
    alarms,
    parameters,
    eventPatterns,
    selectedFaultId,
    saveFaultDraft,
    publishFault,
    setActiveTab,
    showToast,
    openSopEditor,
    openIndicatorEditor,
    openParameterEditor,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'symptoms' | 'propagation' | 'sop'>(
    'basic'
  );
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [symptomFilterType, setSymptomFilterType] = useState<SymptomType | 'all'>('all');

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

  const handleAddSymptom = (type: SymptomType = 'indicator', preset?: Partial<FaultSymptom>) => {
    const nextIdx = (formData.symptoms?.length || 0) + 1;
    let newSymptom: FaultSymptom;

    if (type === 'alarm') {
      const defaultAlarm = alarms[0];
      newSymptom = {
        id: `SYM-ALM-${Date.now()}-${nextIdx}`,
        type: 'alarm',
        device_type: preset?.device_type || 'cabin',
        device_name: preset?.device_name || '安全监控与告警单元',
        metric_name: preset?.alarm_name || defaultAlarm?.name || `系统告警特征 ${nextIdx}`,
        alarm_id: preset?.alarm_id || defaultAlarm?.id || 'ALM_01',
        alarm_code: preset?.alarm_code || defaultAlarm?.code || 'ALM_PUMP_FLOW_LOW',
        alarm_name: preset?.alarm_name || defaultAlarm?.name || '冷却泵低流量告警',
        alarm_level: preset?.alarm_level || defaultAlarm?.level || 'high',
        trigger_condition: preset?.trigger_condition || '连续低于 50 L/min 超过 3s',
        time_window: preset?.time_window || '0-5min',
        notes: preset?.notes || '',
      };
    } else if (type === 'parameter') {
      const defaultParam = parameters[0];
      newSymptom = {
        id: `SYM-PAR-${Date.now()}-${nextIdx}`,
        type: 'parameter',
        device_type: preset?.device_type || 'cooling_pump',
        device_name: preset?.device_name || '热管理/循环泵机组',
        metric_name: preset?.parameter_name || defaultParam?.name || `配置参数偏离 ${nextIdx}`,
        parameter_id: preset?.parameter_id || defaultParam?.id || 'pump_control_mode',
        parameter_code: preset?.parameter_code || defaultParam?.code || 'pump_control_mode',
        parameter_name: preset?.parameter_name || defaultParam?.name || '冷却泵控制模式',
        baseline_value: preset?.baseline_value !== undefined ? preset.baseline_value : (defaultParam?.default_value ?? 'auto'),
        abnormal_value: preset?.abnormal_value !== undefined ? preset.abnormal_value : 'manual',
        condition_operator: preset?.condition_operator || '==',
        time_window: preset?.time_window || '持续生效(全时段)',
        notes: preset?.notes || '',
      };
    } else if (type === 'event_sequence') {
      const defaultPattern = eventPatterns[0];
      newSymptom = {
        id: `SYM-SEQ-${Date.now()}-${nextIdx}`,
        type: 'event_sequence',
        device_type: preset?.device_type || defaultPattern?.device_type || 'cooling_pump',
        device_name: preset?.device_name || defaultPattern?.fault_name || '冷却系统',
        metric_name: preset?.sequence_name || defaultPattern?.name || `日志时序特征 ${nextIdx}`,
        sequence_id: preset?.sequence_id || defaultPattern?.id || 'SEQ-F001-01',
        sequence_name: preset?.sequence_name || defaultPattern?.name || '冷却泵停转与热量积聚日志规则',
        log_source: preset?.log_source || defaultPattern?.log_source || 'tms_system.log',
        time_window: preset?.time_window || defaultPattern?.time_window || '[-5min, 0min]',
        keywords: preset?.keywords || defaultPattern?.keywords || 'TMS_PUMP_CURRENT_LOST',
        stat_type: preset?.stat_type || defaultPattern?.stat_type || 'count',
        stat_condition: preset?.stat_condition || defaultPattern?.stat_condition || '出现次数 >= 2 次',
        notes: preset?.notes || '',
      };
    } else {
      // indicator (default)
      const defaultInd = indicators[0];
      const inferred = inferDeviceTypeFromIndicator(
        preset?.metric_name ? { name: preset.metric_name, code: preset.metric_code } : defaultInd
      );
      newSymptom = {
        id: `SYM-IND-${Date.now()}-${nextIdx}`,
        type: 'indicator',
        device_type: preset?.device_type || inferred.device_type,
        device_name: preset?.device_name || inferred.device_name,
        indicator_id: preset?.indicator_id || defaultInd?.id || 'coolant_flow',
        metric_code: preset?.metric_code || defaultInd?.code || 'coolant_flow',
        metric_name: preset?.metric_name || defaultInd?.name || `监测参数指标 ${nextIdx}`,
        direction: preset?.direction || 'up',
        time_window: preset?.time_window || '0-5min',
        normal_range: preset?.normal_range || defaultInd?.normal_range || '20-40°C',
        unit: preset?.unit || defaultInd?.unit || '',
        notes: preset?.notes || '',
      };
    }

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

    const inferred = inferDeviceTypeFromIndicator(selectedInd);
    const existing = (formData.symptoms || []).find((s) => s.id === symptomId);

    handleUpdateSymptom(symptomId, {
      indicator_id: selectedInd.id,
      metric_code: selectedInd.code,
      metric_name: selectedInd.name,
      unit: selectedInd.unit,
      normal_range: selectedInd.normal_range || '',
      device_type: existing?.device_type || inferred.device_type,
      device_name: existing?.device_name || inferred.device_name,
    });
  };

  const handleSelectAlarmForSymptom = (symptomId: string, alarmIdOrCode: string) => {
    const selectedAlarm = alarms.find((a) => a.id === alarmIdOrCode || a.code === alarmIdOrCode);
    if (!selectedAlarm) return;
    handleUpdateSymptom(symptomId, {
      alarm_id: selectedAlarm.id,
      alarm_code: selectedAlarm.code,
      alarm_name: selectedAlarm.name,
      metric_name: selectedAlarm.name,
      alarm_level: selectedAlarm.level,
      trigger_condition: selectedAlarm.description || selectedAlarm.typical_threshold || '',
    });
  };

  const handleSelectParameterForSymptom = (symptomId: string, paramIdOrCode: string) => {
    const selectedParam = parameters.find((p) => p.id === paramIdOrCode || p.code === paramIdOrCode);
    if (!selectedParam) return;
    handleUpdateSymptom(symptomId, {
      parameter_id: selectedParam.id,
      parameter_code: selectedParam.code,
      parameter_name: selectedParam.name,
      metric_name: selectedParam.name,
      baseline_value: selectedParam.default_value,
      condition_operator: selectedParam.data_type === 'enum' || selectedParam.data_type === 'string' ? '==' : '!=',
      abnormal_value: selectedParam.data_type === 'enum' && selectedParam.enum_values?.length
        ? selectedParam.enum_values.find((v) => v !== selectedParam.default_value) || 'manual'
        : 'abnormal',
    });
  };

  const handleSelectEventPatternForSymptom = (symptomId: string, patternId: string) => {
    const selectedPattern = eventPatterns.find((ep) => ep.id === patternId);
    if (!selectedPattern) return;
    handleUpdateSymptom(symptomId, {
      sequence_id: selectedPattern.id,
      sequence_name: selectedPattern.name,
      metric_name: selectedPattern.name,
      log_source: selectedPattern.log_source,
      time_window: selectedPattern.time_window,
      keywords: selectedPattern.keywords,
      stat_type: selectedPattern.stat_type,
      stat_condition: selectedPattern.stat_condition,
      device_type: selectedPattern.device_type,
    });
  };

  const handleSwitchSymptomType = (symptomId: string, newType: SymptomType) => {
    const symptom = (formData.symptoms || []).find((s) => s.id === symptomId);
    if (!symptom || (symptom.type || 'indicator') === newType) return;
    if (newType === 'alarm') {
      const defaultAlarm = alarms[0];
      handleUpdateSymptom(symptomId, {
        type: 'alarm',
        alarm_id: defaultAlarm?.id || 'ALM_01',
        alarm_code: defaultAlarm?.code || 'ALM_PUMP_FLOW_LOW',
        alarm_name: defaultAlarm?.name || '冷却泵低流量告警',
        metric_name: defaultAlarm?.name || '冷却泵低流量告警',
        alarm_level: defaultAlarm?.level || 'high',
        trigger_condition: '连续低于 50 L/min 超过 3s',
      });
    } else if (newType === 'parameter') {
      const defaultParam = parameters[0];
      handleUpdateSymptom(symptomId, {
        type: 'parameter',
        parameter_id: defaultParam?.id || 'pump_control_mode',
        parameter_code: defaultParam?.code || 'pump_control_mode',
        parameter_name: defaultParam?.name || '冷却泵控制模式',
        metric_name: defaultParam?.name || '冷却泵控制模式',
        baseline_value: defaultParam?.default_value ?? 'auto',
        abnormal_value: 'manual',
        condition_operator: '==',
      });
    } else if (newType === 'event_sequence') {
      const defaultPattern = eventPatterns[0];
      handleUpdateSymptom(symptomId, {
        type: 'event_sequence',
        sequence_id: defaultPattern?.id || 'SEQ-F001-01',
        sequence_name: defaultPattern?.name || '冷却泵停转与热量积聚日志规则',
        metric_name: defaultPattern?.name || '冷却泵停转与热量积聚日志规则',
        log_source: defaultPattern?.log_source || 'tms_system.log',
        time_window: defaultPattern?.time_window || '[-5min, 0min]',
        keywords: defaultPattern?.keywords || 'TMS_PUMP_CURRENT_LOST',
        stat_type: defaultPattern?.stat_type || 'count',
        stat_condition: defaultPattern?.stat_condition || '出现次数 >= 2 次',
      });
    } else {
      const defaultInd = indicators[0];
      handleUpdateSymptom(symptomId, {
        type: 'indicator',
        indicator_id: defaultInd?.id || 'coolant_flow',
        metric_code: defaultInd?.code || 'coolant_flow',
        metric_name: defaultInd?.name || '冷却回路实际流量',
        direction: 'up',
        time_window: '0-5min',
        normal_range: defaultInd?.normal_range || '120-150 L/min',
        unit: defaultInd?.unit || 'L/min',
      });
    }
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

  // Symptom preset templates with rich device context
  const PRESET_SYMPTOMS: Array<Partial<FaultSymptom>> = [
    { device_type: 'transformer', device_name: '储能主变压器', metric_name: '主变压器顶层油温', direction: 'up', time_window: '0-15min', normal_range: '40-65°C', unit: '°C' },
    { device_type: 'cooling_pump', device_name: '主变冷却水泵', metric_name: '冷却回路实际流量', direction: 'down', time_window: '0-2min', normal_range: '120-150 L/min', unit: 'L/min' },
    { device_type: 'gas_relay', device_name: '瓦斯保护继电器', metric_name: '重轻瓦斯继电器动作信号', direction: 'fluctuate', time_window: '15-30min', normal_range: '正常复归(0)', unit: 'BOOL' },
    { device_type: 'bms', device_name: '高压箱绝缘监测仪', metric_name: '直流母线对地绝缘阻抗', direction: 'down', time_window: '0-5min', normal_range: '≥ 500 kΩ', unit: 'kΩ' },
    { device_type: 'battery', device_name: '储能电池簇/电芯', metric_name: '电芯最大压差 ΔV', direction: 'up', time_window: '0-10min', normal_range: '≤ 150 mV', unit: 'mV' },
    { device_type: 'pcs', device_name: '集中式变流器 (PCS)', metric_name: 'IGBT 桥臂工作温度', direction: 'up', time_window: '0-5min', normal_range: '35-75°C', unit: '°C' },
    { device_type: 'cabin', device_name: '储能集装箱舱体', metric_name: '一氧化碳 CO 气体浓度', direction: 'jump', time_window: '0-5min', normal_range: '≤ 10 ppm', unit: 'ppm' },
    { device_type: 'pipe', device_name: '闭式冷却管路', metric_name: '主回路管网工作压力', direction: 'down', time_window: '5-30min', normal_range: '0.25-0.45 MPa', unit: 'MPa' },
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
                {Array.from(new Set(formData.affected_devices || [])).map((devId, idx) => {
                  const dev = devices.find((d) => d.id === devId);
                  return (
                    <div
                      key={`${devId}-${idx}`}
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

        {/* Sub-Tab 2: Symptoms Configuration (Indicators, Alarms, Parameters, Event Sequences) */}
        {activeSubTab === 'symptoms' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-slate-700" />
                  <span>异常症状特征配置 (关联指标、告警、配置参数、事件序列)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  支持从统一指标库、系统告警库、配置参数库与事件序列/日志规则库结构化录入故障特征，精准配置日志时段、关键字与统计条件
                </p>
              </div>

              {/* 4 Add Buttons for each Symptom Type */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddSymptom('indicator')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium shadow-xs transition"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>+ 标准指标</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddSymptom('alarm')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium shadow-xs transition"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>+ 系统告警</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddSymptom('parameter')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-medium shadow-xs transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>+ 配置参数</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddSymptom('event_sequence')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium shadow-xs transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>+ 事件序列</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs by Symptom Type */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-500 mr-2 flex items-center space-x-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <span>按类型筛选:</span>
                </span>
                {[
                  { id: 'all', label: '全部特征', count: (formData.symptoms || []).length },
                  {
                    id: 'indicator',
                    label: '标准指标',
                    count: (formData.symptoms || []).filter((s) => !s.type || s.type === 'indicator').length,
                    color: 'text-blue-700',
                  },
                  {
                    id: 'alarm',
                    label: '系统告警',
                    count: (formData.symptoms || []).filter((s) => s.type === 'alarm').length,
                    color: 'text-rose-700',
                  },
                  {
                    id: 'parameter',
                    label: '配置参数',
                    count: (formData.symptoms || []).filter((s) => s.type === 'parameter').length,
                    color: 'text-purple-700',
                  },
                  {
                    id: 'event_sequence',
                    label: '事件序列',
                    count: (formData.symptoms || []).filter((s) => s.type === 'event_sequence').length,
                    color: 'text-emerald-700',
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSymptomFilterType(tab.id as any)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      symptomFilterType === tab.id
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-700">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-500">
                共关联 <span className="font-bold text-slate-800">{(formData.symptoms || []).length}</span> 项故障症状特征
              </div>
            </div>

            {/* Quick Mount Libraries Bar */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50/70 border border-slate-200 text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>从知识库快速关联挂载:</span>
              </div>

              {/* Indicators Quick Mount */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  指标库:
                </span>
                {indicators.slice(0, 5).map((ind) => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() =>
                      handleAddSymptom('indicator', {
                        indicator_id: ind.id,
                        metric_code: ind.code,
                        metric_name: ind.name,
                        unit: ind.unit,
                        normal_range: ind.normal_range || '',
                        direction: ind.code.includes('leak') || ind.code.includes('fire') ? 'abnormal_high' : 'up',
                      })
                    }
                    className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition flex items-center space-x-1"
                  >
                    <Gauge className="w-2.5 h-2.5 text-blue-500" />
                    <span>+ {ind.name}</span>
                  </button>
                ))}
              </div>

              {/* Alarms Quick Mount */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                  告警库:
                </span>
                {alarms.slice(0, 4).map((alm) => (
                  <button
                    key={alm.id}
                    type="button"
                    onClick={() =>
                      handleAddSymptom('alarm', {
                        alarm_id: alm.id,
                        alarm_code: alm.code,
                        alarm_name: alm.name,
                        alarm_level: alm.level,
                        trigger_condition: alm.description || alm.typical_threshold || '告警触发',
                      })
                    }
                    className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 hover:border-rose-300 transition flex items-center space-x-1"
                  >
                    <BellRing className="w-2.5 h-2.5 text-rose-500" />
                    <span>+ {alm.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">({alm.code})</span>
                  </button>
                ))}
              </div>

              {/* Parameters Quick Mount */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                  配置参数:
                </span>
                {parameters.slice(0, 4).map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() =>
                      handleAddSymptom('parameter', {
                        parameter_id: pm.id,
                        parameter_code: pm.code,
                        parameter_name: pm.name,
                        baseline_value: pm.default_value,
                        condition_operator: pm.data_type === 'enum' || pm.data_type === 'string' ? '==' : '!=',
                        abnormal_value: pm.data_type === 'enum' && pm.enum_values?.length ? pm.enum_values.find(v => v !== pm.default_value) || 'manual' : 'abnormal',
                      })
                    }
                    className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-purple-50 text-slate-700 border border-slate-200 hover:border-purple-300 transition flex items-center space-x-1"
                  >
                    <SlidersHorizontal className="w-2.5 h-2.5 text-purple-500" />
                    <span>+ {pm.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">({pm.code})</span>
                  </button>
                ))}
              </div>

              {/* Event Sequences Quick Mount */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  事件序列:
                </span>
                {eventPatterns.map((ep) => (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() =>
                      handleAddSymptom('event_sequence', {
                        sequence_id: ep.id,
                        sequence_name: ep.name,
                        log_source: ep.log_source,
                        time_window: ep.time_window,
                        keywords: ep.keywords,
                        stat_type: ep.stat_type,
                        stat_condition: ep.stat_condition,
                        device_type: ep.device_type,
                      })
                    }
                    className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 hover:border-emerald-300 transition flex items-center space-x-1"
                  >
                    <History className="w-2.5 h-2.5 text-emerald-500" />
                    <span>+ {ep.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">({ep.log_source})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center"># / 类型</th>
                    <th className="py-2.5 px-3 min-w-[170px]">所属设备类型 (Device)</th>
                    <th className="py-2.5 px-3 min-w-[280px]">关联对象与特征内容 (Associated Target)</th>
                    <th className="py-2.5 px-3 min-w-[150px]">变化方向 / 触发判定 (Condition)</th>
                    <th className="py-2.5 px-3 min-w-[120px]">时段窗口 (Time Window)</th>
                    <th className="py-2.5 px-3 min-w-[150px]">基准 / 参考范围 (Baseline)</th>
                    <th className="py-2.5 px-3 w-12 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(formData.symptoms || [])
                    .filter((symptom) => {
                      if (symptomFilterType === 'all') return true;
                      const sType = symptom.type || 'indicator';
                      return sType === symptomFilterType;
                    })
                    .map((symptom, sIdx) => {
                      const sType = symptom.type || 'indicator';
                      const matchedInd = indicators.find(
                        (i) =>
                          i.id === symptom.indicator_id ||
                          i.code === symptom.indicator_id ||
                          i.code === symptom.metric_code ||
                          i.name === symptom.metric_name
                      );
                      const matchedAlarm = alarms.find(
                        (a) => a.id === symptom.alarm_id || a.code === symptom.alarm_code
                      );
                      const matchedParam = parameters.find(
                        (p) => p.id === symptom.parameter_id || p.code === symptom.parameter_code
                      );
                      const matchedPattern = eventPatterns.find(
                        (ep) => ep.id === symptom.sequence_id
                      );

                      return (
                        <tr key={`${symptom.id}-${sIdx}`} className="hover:bg-slate-50/70 transition">
                          {/* # & Type badge */}
                          <td className="py-2.5 px-3 text-center align-top">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-slate-400 font-mono text-[11px]">{sIdx + 1}</span>
                              <select
                                value={sType}
                                onChange={(e) => handleSwitchSymptomType(symptom.id, e.target.value as SymptomType)}
                                className={`text-[10px] font-bold px-1 py-0.5 rounded border focus:outline-none cursor-pointer ${
                                  sType === 'indicator'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : sType === 'alarm'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : sType === 'parameter'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                <option value="indicator">指标</option>
                                <option value="alarm">告警</option>
                                <option value="parameter">参数</option>
                                <option value="event_sequence">序列</option>
                              </select>
                            </div>
                          </td>

                          {/* Device Type Column */}
                          <td className="py-2.5 px-3 align-top">
                            <div className="space-y-1">
                              <select
                                value={symptom.device_type || 'other'}
                                onChange={(e) => {
                                  const val = e.target.value as DeviceTypeCategory;
                                  const opt = DEVICE_TYPE_OPTIONS.find((o) => o.value === val);
                                  handleUpdateSymptom(symptom.id, {
                                    device_type: val,
                                    device_name: symptom.device_name || opt?.label || '',
                                  });
                                }}
                                className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                              >
                                {DEVICE_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={symptom.device_name || ''}
                                onChange={(e) =>
                                  handleUpdateSymptom(symptom.id, { device_name: e.target.value })
                                }
                                placeholder="具体设备名称(选填)"
                                className="w-full px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
                              />
                            </div>
                          </td>

                          {/* Associated Target & Content Details */}
                          <td className="py-2.5 px-3 align-top">
                            {/* 1. INDICATOR TYPE */}
                            {sType === 'indicator' && (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded">
                                    时序指标
                                  </span>
                                  <select
                                    value={matchedInd?.id || symptom.indicator_id || ''}
                                    onChange={(e) =>
                                      handleSelectIndicatorForSymptom(symptom.id, e.target.value)
                                    }
                                    className="flex-1 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                                  >
                                    <option value="">-- 从指标库选择 --</option>
                                    {indicators.map((ind, idx) => (
                                      <option key={`${ind.id}-${idx}`} value={ind.id}>
                                        [{ind.domain}] {ind.name} ({ind.code}) • {ind.unit}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                                  <span className="font-semibold text-slate-700">
                                    {symptom.metric_name}
                                    {symptom.metric_code && (
                                      <span className="font-mono text-slate-400 ml-1">
                                        ({symptom.metric_code})
                                      </span>
                                    )}
                                  </span>
                                  {matchedInd && (
                                    <button
                                      type="button"
                                      onClick={() => openIndicatorEditor(matchedInd.id)}
                                      className="text-blue-600 hover:underline flex items-center space-x-0.5"
                                      title="前往指标库查看此定义"
                                    >
                                      <span>指标库</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 2. ALARM TYPE */}
                            {sType === 'alarm' && (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded">
                                    系统告警
                                  </span>
                                  <select
                                    value={matchedAlarm?.id || symptom.alarm_id || ''}
                                    onChange={(e) =>
                                      handleSelectAlarmForSymptom(symptom.id, e.target.value)
                                    }
                                    className="flex-1 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                                  >
                                    <option value="">-- 从告警库选择 --</option>
                                    {alarms.map((alm) => (
                                      <option key={alm.id} value={alm.id}>
                                        [{alm.level.toUpperCase()}] {alm.name} ({alm.code})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-1 text-[11px]">
                                  <input
                                    type="text"
                                    value={symptom.alarm_code || ''}
                                    onChange={(e) =>
                                      handleUpdateSymptom(symptom.id, { alarm_code: e.target.value })
                                    }
                                    placeholder="告警编码 如: ALM_PUMP_LOW"
                                    className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-700"
                                  />
                                  <input
                                    type="text"
                                    value={symptom.trigger_condition || ''}
                                    onChange={(e) =>
                                      handleUpdateSymptom(symptom.id, { trigger_condition: e.target.value })
                                    }
                                    placeholder="触发条件 如: 流量<50L持续3s"
                                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                                  />
                                </div>
                              </div>
                            )}

                            {/* 3. CONFIG PARAMETER TYPE */}
                            {sType === 'parameter' && (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1 py-0.5 rounded">
                                    配置参数
                                  </span>
                                  <select
                                    value={matchedParam?.id || symptom.parameter_id || ''}
                                    onChange={(e) =>
                                      handleSelectParameterForSymptom(symptom.id, e.target.value)
                                    }
                                    className="flex-1 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                                  >
                                    <option value="">-- 从配置参数库选择 (43项) --</option>
                                    {parameters.map((pm) => (
                                      <option key={pm.id} value={pm.id}>
                                        [{pm.domain}] {pm.name} ({pm.code})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center space-x-1.5 text-[11px]">
                                  <span className="text-slate-500">异常偏离设定:</span>
                                  <select
                                    value={symptom.condition_operator || '=='}
                                    onChange={(e) =>
                                      handleUpdateSymptom(symptom.id, { condition_operator: e.target.value as any })
                                    }
                                    className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono"
                                  >
                                    <option value="==">等于 (==)</option>
                                    <option value="!=">不等于 (!=)</option>
                                    <option value="<">小于 (&lt;)</option>
                                    <option value=">">大于 (&gt;)</option>
                                    <option value="<=">小于等于 (&lt;=)</option>
                                    <option value=">=">大于等于 (&gt;=)</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={symptom.abnormal_value !== undefined ? String(symptom.abnormal_value) : ''}
                                    onChange={(e) =>
                                      handleUpdateSymptom(symptom.id, { abnormal_value: e.target.value })
                                    }
                                    placeholder="致错取值 如: manual"
                                    className="flex-1 px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-purple-700"
                                  />
                                  {matchedParam && (
                                    <button
                                      type="button"
                                      onClick={() => openParameterEditor(matchedParam.id)}
                                      className="text-purple-600 hover:underline flex items-center space-x-0.5 text-[10px]"
                                    >
                                      <span>详情</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 4. EVENT SEQUENCE TYPE */}
                            {sType === 'event_sequence' && (
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">
                                    事件序列
                                  </span>
                                  <select
                                    value={matchedPattern?.id || symptom.sequence_id || ''}
                                    onChange={(e) =>
                                      handleSelectEventPatternForSymptom(symptom.id, e.target.value)
                                    }
                                    className="flex-1 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400"
                                  >
                                    <option value="">-- 从事件序列规则库选择 --</option>
                                    {eventPatterns.map((ep) => (
                                      <option key={ep.id} value={ep.id}>
                                        [{ep.id}] {ep.name} ({ep.log_source})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('event-logs')}
                                    className="px-1.5 py-1 text-[10px] text-emerald-700 hover:underline flex items-center space-x-0.5 bg-emerald-50 rounded border border-emerald-200"
                                    title="前往事件序列规则库深度配置"
                                  >
                                    <span>规则库</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* 4 Core Query Elements inline */}
                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                  <div>
                                    <label className="block text-[10px] text-slate-400">哪个日志 (log_source):</label>
                                    <input
                                      type="text"
                                      value={symptom.log_source || ''}
                                      onChange={(e) =>
                                        handleUpdateSymptom(symptom.id, { log_source: e.target.value })
                                      }
                                      placeholder="如: tms_system.log"
                                      className="w-full px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-800 text-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-400">关键字 / 正则 (keywords):</label>
                                    <input
                                      type="text"
                                      value={symptom.keywords || ''}
                                      onChange={(e) =>
                                        handleUpdateSymptom(symptom.id, { keywords: e.target.value })
                                      }
                                      placeholder="如: TMS_PUMP_CURRENT_LOST"
                                      className="w-full px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-emerald-700 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Direction / Condition Column */}
                          <td className="py-2.5 px-3 align-top">
                            {sType === 'indicator' ? (
                              <select
                                value={symptom.direction || 'up'}
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
                            ) : sType === 'alarm' ? (
                              <select
                                value={symptom.alarm_level || 'high'}
                                onChange={(e) =>
                                  handleUpdateSymptom(symptom.id, {
                                    alarm_level: e.target.value as any,
                                  })
                                }
                                className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-slate-400"
                              >
                                <option value="critical">🔴 致命告警 (Critical)</option>
                                <option value="high">🟠 严重告警 (High)</option>
                                <option value="medium">🟡 中度告警 (Medium)</option>
                                <option value="low">🔵 提示告警 (Low)</option>
                              </select>
                            ) : sType === 'parameter' ? (
                              <div className="flex items-center space-x-1">
                                <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-xs">
                                  {symptom.condition_operator || '=='} {String(symptom.abnormal_value || '')}
                                </span>
                              </div>
                            ) : (
                              /* Event Sequence stat condition */
                              <div className="space-y-1">
                                <select
                                  value={symptom.stat_type || 'count'}
                                  onChange={(e) =>
                                    handleUpdateSymptom(symptom.id, {
                                      stat_type: e.target.value as any,
                                    })
                                  }
                                  className="w-full px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-800"
                                >
                                  <option value="count">出现次数 (Count)</option>
                                  <option value="rate">发生频次 (Rate/min)</option>
                                  <option value="duration">持续时长 (Duration s)</option>
                                  <option value="first_seen">首现时刻 (First Seen)</option>
                                </select>
                                <input
                                  type="text"
                                  value={symptom.stat_condition || ''}
                                  onChange={(e) =>
                                    handleUpdateSymptom(symptom.id, { stat_condition: e.target.value })
                                  }
                                  placeholder="如: >= 2 次"
                                  className="w-full px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-mono text-emerald-700"
                                />
                              </div>
                            )}
                          </td>

                          {/* Time Window Column */}
                          <td className="py-2.5 px-3 align-top">
                            <input
                              type="text"
                              value={symptom.time_window || ''}
                              onChange={(e) =>
                                handleUpdateSymptom(symptom.id, { time_window: e.target.value })
                              }
                              placeholder={
                                sType === 'event_sequence'
                                  ? '如: [-5min, 0min]'
                                  : sType === 'parameter'
                                  ? '如: 持续生效'
                                  : '如: 0-5min'
                              }
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                            />
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {sType === 'event_sequence' ? '相对故障时刻' : '特征发生时段'}
                            </div>
                          </td>

                          {/* Baseline / Normal Range Column */}
                          <td className="py-2.5 px-3 align-top">
                            {sType === 'indicator' && (
                              <input
                                type="text"
                                value={symptom.normal_range || ''}
                                onChange={(e) =>
                                  handleUpdateSymptom(symptom.id, { normal_range: e.target.value })
                                }
                                placeholder="如: 40-65°C"
                                className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                              />
                            )}

                            {sType === 'alarm' && (
                              <div className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                                正常状态: <span className="font-mono text-emerald-600 font-semibold">无告警复归 (0)</span>
                              </div>
                            )}

                            {sType === 'parameter' && (
                              <div className="space-y-0.5 text-xs text-slate-700">
                                <span className="text-[10px] text-slate-400 block">出厂/健康基准值:</span>
                                <input
                                  type="text"
                                  value={symptom.baseline_value !== undefined ? String(symptom.baseline_value) : ''}
                                  onChange={(e) =>
                                    handleUpdateSymptom(symptom.id, { baseline_value: e.target.value })
                                  }
                                  placeholder="出厂基准值"
                                  className="w-full px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs"
                                />
                              </div>
                            )}

                            {sType === 'event_sequence' && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5 font-mono">
                                <div>日志: {symptom.log_source || '未指定'}</div>
                                <div className="text-emerald-700 truncate" title={symptom.keywords}>
                                  匹配: {symptom.keywords || '无关键字'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="py-2.5 px-3 text-center align-top">
                            <button
                              onClick={() => handleDeleteSymptom(symptom.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="删除此特征项"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {(!formData.symptoms || formData.symptoms.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Activity className="w-8 h-8 text-slate-300" />
                          <span>暂无症状特征，请从上方 "+ 标准指标"、"+ 系统告警"、"+ 配置参数" 或 "+ 事件序列" 添加</span>
                        </div>
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
                建立明确的跨设备传导因果（A设备 a症状 ➔ B设备 b症状），定义传播时间窗口与传导机理
              </p>
            </div>

            <PropagationCanvas
              faultName={formData.name}
              symptoms={formData.symptoms || []}
              affectedDevices={formData.affected_devices || []}
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
              {sops.map((sop, idx) => {
                const isSelected = (formData.associated_procedure_ids || []).includes(sop.id);
                return (
                  <div
                    key={`${sop.id}-${idx}`}
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
              {devices.map((d, idx) => {
                const isSelected = (formData.affected_devices || []).includes(d.id);
                return (
                  <div
                    key={`${d.id}-${idx}`}
                    onClick={() => {
                      const cur = Array.from(new Set(formData.affected_devices || []));
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
