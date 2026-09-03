import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  DeviceNode,
  FaultPattern,
  RecoveryProcedure,
  AlarmType,
  MetricIndicator,
  VersionSnapshot,
  ActiveTab,
  EntityStatus,
  FaultViewMode,
  ConfigParameter,
  DeviceConfigurationProfile,
  EventSequencePattern,
  SoeLogEvent,
} from '../types';
import {
  INITIAL_DEVICES,
  INITIAL_FAULTS,
  INITIAL_SOPS,
  INITIAL_ALARMS,
  INITIAL_INDICATORS,
  INITIAL_VERSION_SNAPSHOTS,
  INITIAL_CONFIG_PARAMETERS,
  INITIAL_STATIC_CONFIG_PROFILES,
  INITIAL_EVENT_PATTERNS,
  SAMPLE_SOE_LOGS,
} from '../data/initialData';
import { parseUploadedYaml } from '../utils/yamlUtils';
import confetti from 'canvas-confetti';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  // State
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  devices: DeviceNode[];
  faults: FaultPattern[];
  sops: RecoveryProcedure[];
  alarms: AlarmType[];
  indicators: MetricIndicator[];
  parameters: ConfigParameter[];
  staticConfigs: DeviceConfigurationProfile[];
  soeLogs: SoeLogEvent[];
  eventPatterns: EventSequencePattern[];
  versionSnapshots: VersionSnapshot[];
  selectedFaultId: string | null;
  setSelectedFaultId: (id: string | null) => void;
  selectedSopId: string | null;
  setSelectedSopId: (id: string | null) => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  selectedIndicatorId: string | null;
  setSelectedIndicatorId: (id: string | null) => void;
  selectedParameterId: string | null;
  setSelectedParameterId: (id: string | null) => void;
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  selectedEventPatternId: string | null;
  setSelectedEventPatternId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

  // Computed
  draftCount: number;
  publishedCount: number;
  selectedFault: FaultPattern | null;
  selectedSop: RecoveryProcedure | null;
  selectedDevice: DeviceNode | null;
  selectedIndicator: MetricIndicator | null;
  selectedParameter: ConfigParameter | null;
  selectedProfile: DeviceConfigurationProfile | null;
  selectedEventPattern: EventSequencePattern | null;

  // Actions - Devices
  addDevice: (device: Partial<DeviceNode>) => string;
  updateDevice: (id: string, updates: Partial<DeviceNode>) => void;
  deleteDevice: (id: string) => void;

  // Actions - Faults
  addFault: (fault?: Partial<FaultPattern>) => string;
  updateFault: (id: string, updates: Partial<FaultPattern>) => void;
  deleteFault: (id: string) => void;
  saveFaultDraft: (id: string, updates: Partial<FaultPattern>) => void;
  publishFault: (id: string) => void;

  // Actions - SOPs
  addSop: (sop?: Partial<RecoveryProcedure>) => string;
  updateSop: (id: string, updates: Partial<RecoveryProcedure>) => void;
  deleteSop: (id: string) => void;
  saveSopDraft: (id: string, updates: Partial<RecoveryProcedure>) => void;
  publishSop: (id: string) => void;

  // Actions - Alarms
  addAlarm: (alarm: Partial<AlarmType>) => string;
  updateAlarm: (id: string, updates: Partial<AlarmType>) => void;
  deleteAlarm: (id: string) => void;

  // Actions - Indicators
  addIndicator: (indicator: Partial<MetricIndicator>) => string;
  updateIndicator: (id: string, updates: Partial<MetricIndicator>) => void;
  deleteIndicator: (id: string) => void;
  openIndicatorEditor: (indicatorId: string) => void;

  // Actions - 4.9 Config Parameters
  addParameter: (param: Partial<ConfigParameter>) => string;
  updateParameter: (id: string, updates: Partial<ConfigParameter>) => void;
  deleteParameter: (id: string) => void;
  publishParameter: (id: string) => void;
  openParameterEditor: (paramIdOrCode: string) => void;

  // Actions - Static Config Profiles
  updateDeviceConfig: (profileId: string, paramCode: string, value: string | number | boolean) => void;
  resetProfileToBaseline: (profileId: string) => void;
  addConfigProfile: (profile: DeviceConfigurationProfile) => void;

  // Actions - SOE Logs & Event Sequences
  addSoeLog: (event: Partial<SoeLogEvent>) => void;
  clearSoeLogs: () => void;
  resetSoeLogs: () => void;
  addEventPattern: (pattern: Partial<EventSequencePattern>) => string;
  updateEventPattern: (id: string, updates: Partial<EventSequencePattern>) => void;
  deleteEventPattern: (id: string) => void;
  syncEventPatternToFault: (patternId: string) => void;

  // Bulk / Version / Import
  publishAllDrafts: (releaseNote?: string) => void;
  rollbackVersion: (snapshotId: string) => void;
  importYamlContent: (yamlString: string) => { success: boolean; message: string };
  resetToFactoryData: () => void;
  openFaultEditor: (faultId: string) => void;
  openSopEditor: (sopId: string) => void;
  openDeviceInBom: (deviceId: string) => void;
  faultViewMode: FaultViewMode;
  setFaultViewMode: (mode: FaultViewMode) => void;
  openFaultsGraphView: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  DEVICES: 'diagnosgraph_devices_v1',
  FAULTS: 'diagnosgraph_faults_v1',
  SOPS: 'diagnosgraph_sops_v1',
  ALARMS: 'diagnosgraph_alarms_v1',
  INDICATORS: 'diagnosgraph_indicators_v1',
  PARAMETERS: 'diagnosgraph_parameters_v1',
  STATIC_CONFIGS: 'diagnosgraph_static_configs_v1',
  EVENT_PATTERNS: 'diagnosgraph_event_patterns_v1',
  VERSIONS: 'diagnosgraph_versions_v1',
};

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
};

const sanitizeFault = (f: FaultPattern): FaultPattern => ({
  ...f,
  affected_devices: Array.from(new Set(f.affected_devices || [])),
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('workbench');
  const [faultViewMode, setFaultViewMode] = useState<FaultViewMode>('list');
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>('F001');
  const [selectedSopId, setSelectedSopId] = useState<string | null>('RP-F001');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>('DEV-CABIN-40FT');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>('coolant_flow');
  const [selectedParameterId, setSelectedParameterId] = useState<string | null>('pump_control_mode');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>('CFG-DEV-COOL-PUMP');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Core Data
  const [devices, setDevices] = useState<DeviceNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEVICES);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_DEVICES);
    } catch {
      return dedupeById(INITIAL_DEVICES);
    }
  });

  const [faults, setFaults] = useState<FaultPattern[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAULTS);
      const raw = saved ? JSON.parse(saved) : INITIAL_FAULTS;
      return dedupeById(raw).map(sanitizeFault);
    } catch {
      return dedupeById(INITIAL_FAULTS).map(sanitizeFault);
    }
  });

  const [sops, setSops] = useState<RecoveryProcedure[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOPS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_SOPS);
    } catch {
      return dedupeById(INITIAL_SOPS);
    }
  });

  const [alarms, setAlarms] = useState<AlarmType[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALARMS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_ALARMS);
    } catch {
      return dedupeById(INITIAL_ALARMS);
    }
  });

  const [indicators, setIndicators] = useState<MetricIndicator[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INDICATORS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_INDICATORS);
    } catch {
      return dedupeById(INITIAL_INDICATORS);
    }
  });

  const [parameters, setParameters] = useState<ConfigParameter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PARAMETERS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_CONFIG_PARAMETERS);
    } catch {
      return dedupeById(INITIAL_CONFIG_PARAMETERS);
    }
  });

  const [staticConfigs, setStaticConfigs] = useState<DeviceConfigurationProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATIC_CONFIGS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_STATIC_CONFIG_PROFILES);
    } catch {
      return dedupeById(INITIAL_STATIC_CONFIG_PROFILES);
    }
  });

  const [soeLogs, setSoeLogs] = useState<SoeLogEvent[]>(SAMPLE_SOE_LOGS);
  const [selectedEventPatternId, setSelectedEventPatternId] = useState<string | null>(null);
  const [eventPatterns, setEventPatterns] = useState<EventSequencePattern[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVENT_PATTERNS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_EVENT_PATTERNS);
    } catch {
      return dedupeById(INITIAL_EVENT_PATTERNS);
    }
  });

  const [versionSnapshots, setVersionSnapshots] = useState<VersionSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VERSIONS);
      return saved ? dedupeById(JSON.parse(saved)) : dedupeById(INITIAL_VERSION_SNAPSHOTS);
    } catch {
      return dedupeById(INITIAL_VERSION_SNAPSHOTS);
    }
  });

  // LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    } catch (e) {
      console.error(e);
    }
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAULTS, JSON.stringify(faults));
    } catch (e) {
      console.error(e);
    }
  }, [faults]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOPS, JSON.stringify(sops));
    } catch (e) {
      console.error(e);
    }
  }, [sops]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
    } catch (e) {
      console.error(e);
    }
  }, [alarms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(indicators));
    } catch (e) {
      console.error(e);
    }
  }, [indicators]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(parameters));
    } catch (e) {
      console.error(e);
    }
  }, [parameters]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATIC_CONFIGS, JSON.stringify(staticConfigs));
    } catch (e) {
      console.error(e);
    }
  }, [staticConfigs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(versionSnapshots));
    } catch (e) {
      console.error(e);
    }
  }, [versionSnapshots]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENT_PATTERNS, JSON.stringify(eventPatterns));
    } catch (e) {
      console.error(e);
    }
  }, [eventPatterns]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Computations
  const draftCount = useMemo(() => {
    const draftFaults = faults.filter((f) => f.status === 'draft').length;
    const draftSops = sops.filter((s) => s.status === 'draft').length;
    const draftDevs = devices.filter((d) => d.status === 'draft').length;
    return draftFaults + draftSops + draftDevs;
  }, [faults, sops, devices]);

  const publishedCount = useMemo(() => {
    return faults.filter((f) => f.status === 'published').length;
  }, [faults]);

  const selectedFault = useMemo(() => {
    return faults.find((f) => f.id === selectedFaultId) || faults[0] || null;
  }, [faults, selectedFaultId]);

  const selectedSop = useMemo(() => {
    return sops.find((s) => s.id === selectedSopId) || sops[0] || null;
  }, [sops, selectedSopId]);

  const selectedDevice = useMemo(() => {
    return devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;
  }, [devices, selectedDeviceId]);

  const selectedIndicator = useMemo(() => {
    return indicators.find((i) => i.id === selectedIndicatorId || i.code === selectedIndicatorId) || indicators[0] || null;
  }, [indicators, selectedIndicatorId]);

  const selectedParameter = useMemo(() => {
    if (!selectedParameterId) return parameters[0] || null;
    return parameters.find((p) => p.id === selectedParameterId || p.code === selectedParameterId) || parameters[0] || null;
  }, [parameters, selectedParameterId]);

  const selectedProfile = useMemo(() => {
    if (!selectedProfileId) return staticConfigs[0] || null;
    return staticConfigs.find((p) => p.id === selectedProfileId) || staticConfigs[0] || null;
  }, [staticConfigs, selectedProfileId]);

  const selectedEventPattern = useMemo(() => {
    if (!selectedEventPatternId) return eventPatterns[0] || null;
    return eventPatterns.find((p) => p.id === selectedEventPatternId) || eventPatterns[0] || null;
  }, [eventPatterns, selectedEventPatternId]);

  // Actions - Devices
  const addDevice = (partial: Partial<DeviceNode>): string => {
    const nextNum = devices.length + 1;
    const baseId = partial.id?.trim() || `DEV-CUST-${String(nextNum).padStart(3, '0')}`;
    let newId = baseId;
    let counter = 1;
    while (devices.some((d) => d.id === newId)) {
      newId = `${baseId}-${counter++}`;
    }
    const newDevice: DeviceNode = {
      id: newId,
      name: partial.name || `新设备类型 ${nextNum}`,
      category: partial.category || '储能变流与电能变换系统',
      device_type: partial.device_type || 'pcs',
      version: partial.version || 'v1.0 (标准型)',
      parent_id: partial.parent_id !== undefined ? partial.parent_id : null,
      description: partial.description || '',
      status: 'draft',
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      associated_fault_ids: partial.associated_fault_ids || [],
      telemetry_metric_codes: partial.telemetry_metric_codes || [],
      rating_specs: partial.rating_specs || '',
      manufacturer_model: partial.manufacturer_model || '',
    };
    setDevices((prev) => dedupeById([newDevice, ...prev]));
    setSelectedDeviceId(newId);
    showToast(`已创建设备类型草稿: ${newDevice.name}`, 'success');
    return newId;
  };

  const updateDevice = (id: string, updates: Partial<DeviceNode>) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...updates,
              updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : d
      )
    );
    showToast('设备信息已更新', 'success');
  };

  const deleteDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    showToast('已删除设备节点', 'info');
  };

  // Actions - Faults
  const addFault = (partial?: Partial<FaultPattern>): string => {
    const nextIdx = faults.length + 1;
    const newId = partial?.id || `F${String(nextIdx).padStart(3, '0')}`;
    const newFault: FaultPattern = {
      id: newId,
      name: partial?.name || `新储能故障模式 ${nextIdx}`,
      severity: partial?.severity || 'high',
      root_cause: partial?.root_cause || '### 故障原因概述\n请在此录入故障机理与诱发因素...',
      affected_devices: partial?.affected_devices || ['D001'],
      symptoms: partial?.symptoms || [
        {
          id: `SYM-${Date.now()}-1`,
          metric_name: '关键指标温度',
          direction: 'up',
          time_window: '0-5min',
          normal_range: '15-40°C',
          unit: '°C',
        },
      ],
      propagation_chain: partial?.propagation_chain || [
        {
          id: `PROP-${Date.now()}-1`,
          from: partial?.name || `故障 ${newId}`,
          to: '初期异常症状',
          time_window: '0-5min',
          probability: 0.95,
        },
      ],
      associated_procedure_ids: partial?.associated_procedure_ids || [],
      status: 'draft',
      review_status: 'incomplete',
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      author: '张工',
      tags: ['新建立', '待完善'],
    };

    setFaults((prev) => [newFault, ...prev]);
    setSelectedFaultId(newId);
    setActiveTab('fault-editor');
    showToast(`已新建故障草稿: ${newFault.name} (${newId})`, 'success');
    return newId;
  };

  const updateFault = (id: string, updates: Partial<FaultPattern>) => {
    setFaults((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              ...updates,
              updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : f
      )
    );
  };

  const deleteFault = (id: string) => {
    setFaults((prev) => prev.filter((f) => f.id !== id));
    showToast('已删除故障定义', 'info');
  };

  const saveFaultDraft = (id: string, updates: Partial<FaultPattern>) => {
    updateFault(id, { ...updates, status: 'draft' });
    showToast(`已保存草稿 [${id}]`, 'success');
  };

  const publishFault = (id: string) => {
    const target = faults.find((f) => f.id === id);
    if (!target) return;

    // Validate business rules
    if (!target.name.trim()) {
      showToast('发布失败：故障名称不可为空', 'error');
      return;
    }
    if (!target.affected_devices || target.affected_devices.length === 0) {
      showToast('发布失败：请至少关联 1 个受影响设备', 'error');
      return;
    }
    if (!target.symptoms || target.symptoms.length === 0) {
      showToast('发布失败：请至少定义 1 条症状指标', 'error');
      return;
    }

    updateFault(id, { status: 'published', review_status: 'ready' });
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
    showToast(`🎉 故障 [${target.id} ${target.name}] 已正式发布至 DiagnosGraph 诊断引擎！`, 'success');
  };

  // Actions - SOPs
  const addSop = (partial?: Partial<RecoveryProcedure>): string => {
    const nextIdx = sops.length + 1;
    const newId = partial?.id || `RP-F${String(nextIdx).padStart(3, '0')}`;
    const newSop: RecoveryProcedure = {
      id: newId,
      name: partial?.name || `新故障应急处置 SOP ${nextIdx}`,
      associated_fault_ids: partial?.associated_fault_ids || [],
      procedures: partial?.procedures || [
        {
          id: `STEP-${Date.now()}-1`,
          step_num: 1,
          action: '确认现场设备指示灯及通信状态',
          verification: '检查控制器面板及断路器分合闸状态',
          expected_outcome: '确认故障位置与影响范围',
          estimated_time: '3分钟',
        },
      ],
      escalation: partial?.escalation || {
        level: 'high',
        timeout_minutes: 30,
        target_role: '运维主管',
        auto_actions: ['向当班值班员推送紧急工单'],
        manual_actions: ['电话联系设备厂商技术支持工程师'],
      },
      status: 'draft',
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    setSops((prev) => [newSop, ...prev]);
    setSelectedSopId(newId);
    setActiveTab('sop-editor');
    showToast(`已新建处置 SOP 草稿: ${newSop.name}`, 'success');
    return newId;
  };

  const updateSop = (id: string, updates: Partial<RecoveryProcedure>) => {
    setSops((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...updates,
              updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : s
      )
    );
  };

  const deleteSop = (id: string) => {
    setSops((prev) => prev.filter((s) => s.id !== id));
    showToast('已删除处置方案', 'info');
  };

  const saveSopDraft = (id: string, updates: Partial<RecoveryProcedure>) => {
    updateSop(id, { ...updates, status: 'draft' });
    showToast(`已保存 SOP 草稿 [${id}]`, 'success');
  };

  const publishSop = (id: string) => {
    const target = sops.find((s) => s.id === id);
    if (!target) return;
    updateSop(id, { status: 'published' });
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
    showToast(`🎉 处置 SOP [${target.id} ${target.name}] 已正式发布！`, 'success');
  };

  // Actions - Alarms
  const addAlarm = (partial: Partial<AlarmType>): string => {
    const nextIdx = alarms.length + 1;
    const newId = partial.id || `ALM-${String(nextIdx).padStart(2, '0')}`;
    const newAlarm: AlarmType = {
      id: newId,
      code: partial.code || `ALM_CUSTOM_${nextIdx}`,
      name: partial.name || `新告警类型 ${nextIdx}`,
      category: partial.category || '综合告警',
      device_type: partial.device_type || 'generic_device',
      severity: partial.severity || 'high',
      default_threshold: partial.default_threshold || '50',
      unit: partial.unit || '',
      description: partial.description || '',
    };
    setAlarms((prev) => [...prev, newAlarm]);
    showToast(`已添加告警类型: ${newAlarm.name}`, 'success');
    return newId;
  };

  const updateAlarm = (id: string, updates: Partial<AlarmType>) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    showToast('告警类型配置已保存', 'success');
  };

  const deleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    showToast('已删除告警类型', 'info');
  };

  // Actions - Indicators
  const addIndicator = (partial: Partial<MetricIndicator>): string => {
    const nextIdx = indicators.length + 1;
    const newId = partial.id || partial.code || `ind_${Date.now()}`;
    const newIndicator: MetricIndicator = {
      id: newId,
      code: partial.code || `metric_code_${nextIdx}`,
      name: partial.name || `新时序指标 ${nextIdx}`,
      unit: partial.unit || '—',
      domain: partial.domain || '储能',
      applicable_device_types: partial.applicable_device_types || partial.device_types || ['pump'],
      device_types: partial.device_types || partial.applicable_device_types || ['pump'],
      description: partial.description || '',
      normal_range: partial.normal_range || '0-100',
      normal_range_text: partial.normal_range_text || partial.normal_range || '0-100',
      data_type: partial.data_type || 'float',
      sampling_interval: partial.sampling_interval || '1s',
      associated_fault_ids: partial.associated_fault_ids || [],
      status: 'draft',
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      author: partial.author || '系统专家',
    };
    setIndicators((prev) => [newIndicator, ...prev]);
    setSelectedIndicatorId(newId);
    showToast(`已新增标准指标: ${newIndicator.name} (${newIndicator.code})`, 'success');
    return newId;
  };

  const updateIndicator = (id: string, updates: Partial<MetricIndicator>) => {
    setIndicators((prev) => prev.map((ind) => (ind.id === id || ind.code === id ? { ...ind, ...updates } : ind)));
    showToast('指标配置已更新', 'success');
  };

  const deleteIndicator = (id: string) => {
    setIndicators((prev) => prev.filter((ind) => ind.id !== id && ind.code !== id));
    showToast('已删除指标定义', 'info');
  };

  const openIndicatorEditor = (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
    setActiveTab('indicators');
  };

  // Actions - 4.9 Config Parameters
  const addParameter = (partial: Partial<ConfigParameter>): string => {
    const rawCode = partial.code?.trim().toLowerCase().replace(/\s+/g, '_') || `param_${Date.now().toString(36)}`;
    let newCode = rawCode;
    let counter = 1;
    while (parameters.some((p) => p.code === newCode || p.id === newCode)) {
      newCode = `${rawCode}_${counter++}`;
    }

    const newParam: ConfigParameter = {
      id: newCode,
      code: newCode,
      name: partial.name || '新配置参数',
      domain: partial.domain || '储能',
      applicable_device_types: partial.applicable_device_types || ['pump'],
      description: partial.description || '',
      param_type: partial.param_type || 'enum',
      enum_values: partial.enum_values || [
        { key: 'auto', label: '自动模式', description: '系统默认自适应调节' },
        { key: 'manual', label: '手动模式', description: '就地手动设定' },
      ],
      range_min: partial.range_min,
      range_max: partial.range_max,
      unit: partial.unit || '',
      default_value: partial.default_value !== undefined ? partial.default_value : 'auto',
      associated_fault_ids: partial.associated_fault_ids || [],
      status: 'draft',
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      author: partial.author || '系统专家',
    };

    setParameters((prev) => [newParam, ...prev]);
    setSelectedParameterId(newCode);
    showToast(`已成功创建配置参数: ${newParam.name} (${newParam.code})`, 'success');
    return newCode;
  };

  const updateParameter = (id: string, updates: Partial<ConfigParameter>) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === id || p.code === id
          ? {
              ...p,
              ...updates,
              updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : p
      )
    );
    showToast('配置参数已保存', 'success');
  };

  const deleteParameter = (id: string) => {
    setParameters((prev) => prev.filter((p) => p.id !== id && p.code !== id));
    showToast('已删除配置参数', 'info');
  };

  const publishParameter = (id: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === id || p.code === id
          ? {
              ...p,
              status: 'published' as EntityStatus,
              updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : p
      )
    );
    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch {}
    showToast('配置参数已发布生效', 'success');
  };

  const openParameterEditor = (paramIdOrCode: string) => {
    setSelectedParameterId(paramIdOrCode);
    setActiveTab('parameter-editor');
  };

  // Actions - Static Config Profiles
  const updateDeviceConfig = (profileId: string, paramCode: string, value: string | number | boolean) => {
    setStaticConfigs((prev) =>
      prev.map((prof) => {
        if (prof.id !== profileId) return prof;
        const newConfigs = { ...prof.configs, [paramCode]: value };
        // Check mismatches against baseline
        let mismatches = 0;
        Object.entries(newConfigs).forEach(([k, v]) => {
          const baselineParam = parameters.find((p) => p.code === k || p.id === k);
          if (baselineParam && baselineParam.default_value !== undefined && baselineParam.default_value !== v) {
            mismatches++;
          }
        });
        const status = mismatches === 0 ? 'synced' : mismatches >= 2 ? 'critical_mismatch' : 'drift_detected';
        return {
          ...prof,
          configs: newConfigs,
          baseline_status: status,
          mismatches_count: mismatches,
          updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        };
      })
    );
    showToast(`已更新设备静态参数: ${paramCode} = ${value}`, 'success');
  };

  const resetProfileToBaseline = (profileId: string) => {
    setStaticConfigs((prev) =>
      prev.map((prof) => {
        if (prof.id !== profileId) return prof;
        const resetConfigs = { ...prof.configs };
        Object.keys(resetConfigs).forEach((k) => {
          const baselineParam = parameters.find((p) => p.code === k || p.id === k);
          if (baselineParam && baselineParam.default_value !== undefined) {
            resetConfigs[k] = baselineParam.default_value;
          }
        });
        return {
          ...prof,
          configs: resetConfigs,
          baseline_status: 'synced',
          mismatches_count: 0,
          updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        };
      })
    );
    showToast('已将设备配置一键重置对齐标准安全基线', 'success');
  };

  const addConfigProfile = (profile: DeviceConfigurationProfile) => {
    setStaticConfigs((prev) => [profile, ...prev]);
    setSelectedProfileId(profile.id);
    showToast(`已添加设备配置档案: ${profile.device_name}`, 'success');
  };

  // Actions - SOE Logs
  const addSoeLog = (event: Partial<SoeLogEvent>) => {
    const newEvent: SoeLogEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: event.timestamp || new Date().toLocaleString('zh-CN', { hour12: false }),
      relative_ms: event.relative_ms !== undefined ? event.relative_ms : 0,
      device_id: event.device_id || 'DEV-CABIN-40FT',
      device_name: event.device_name || '储能集装箱',
      device_type: event.device_type || 'cabin',
      event_code: event.event_code || 'EVENT_TRIGGERED',
      event_name: event.event_name || '未命名事件',
      severity: event.severity || 'high',
      source: event.source || 'BMS',
      details: event.details || '',
    };
    setSoeLogs((prev) => [newEvent, ...prev]);
    showToast(`收到新 SOE 事件: ${newEvent.event_name}`, 'info');
  };

  const clearSoeLogs = () => {
    setSoeLogs([]);
    showToast('已清空当前 SOE 事件列表', 'info');
  };

  const resetSoeLogs = () => {
    setSoeLogs(SAMPLE_SOE_LOGS);
    showToast('已重载标准事故 SOE 事件样本序列', 'success');
  };

  // Actions - Event Sequence Rules for Fault Symptom Entry
  const addEventPattern = (partial: Partial<EventSequencePattern>): string => {
    const nextIdx = eventPatterns.length + 1;
    const newId = partial.id || `SEQ-${partial.fault_id || 'F001'}-${String(nextIdx).padStart(2, '0')}`;
    const newPattern: EventSequencePattern = {
      id: newId,
      fault_id: partial.fault_id || 'F001',
      fault_name: partial.fault_name || '冷却泵故障',
      name: partial.name || `新日志事件序列规则 ${nextIdx}`,
      device_type: partial.device_type || 'cooling_pump',
      log_source: partial.log_source || 'tms_system.log',
      time_window: partial.time_window || '[-5min, 0min]',
      keywords: partial.keywords || 'PUMP_STATUS_ERR',
      match_mode: partial.match_mode || 'regex',
      stat_type: partial.stat_type || 'count',
      stat_operator: partial.stat_operator || '>=',
      stat_threshold: partial.stat_threshold !== undefined ? partial.stat_threshold : 2,
      stat_unit: partial.stat_unit || '次',
      stat_condition: partial.stat_condition || `${partial.stat_type || 'count'} >= 2 次`,
      description: partial.description || '用于故障症状特征录入的日志查询规则',
      steps: partial.steps || [],
      status: 'draft',
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      author: partial.author || '现场诊断专家',
    };
    setEventPatterns((prev) => [newPattern, ...prev]);
    setSelectedEventPatternId(newId);
    showToast(`已创建事件序列规则: ${newPattern.name}`, 'success');
    return newId;
  };

  const updateEventPattern = (id: string, updates: Partial<EventSequencePattern>) => {
    setEventPatterns((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : p
      )
    );
    showToast('事件序列规则已保存', 'success');
  };

  const deleteEventPattern = (id: string) => {
    setEventPatterns((prev) => prev.filter((p) => p.id !== id));
    showToast('已删除事件序列规则', 'info');
  };

  const syncEventPatternToFault = (patternId: string) => {
    const pattern = eventPatterns.find((p) => p.id === patternId);
    if (!pattern) return;
    const targetFault = faults.find((f) => f.id === pattern.fault_id);
    if (!targetFault) {
      showToast(`未找到关联的故障模式 [${pattern.fault_id}]`, 'warning');
      return;
    }
    const newSymptom: Symptom = {
      id: `SYM-SEQ-${pattern.id}`,
      type: 'event_sequence',
      device_type: pattern.device_type,
      device_name: pattern.fault_name,
      sequence_id: pattern.id,
      sequence_name: pattern.name,
      log_source: pattern.log_source,
      time_window: pattern.time_window,
      keywords: pattern.keywords,
      stat_type: pattern.stat_type,
      stat_condition: pattern.stat_condition || `${pattern.stat_type || 'count'} ${pattern.stat_operator || '>='} ${pattern.stat_threshold || 1} ${pattern.stat_unit || '次'}`,
      metric_name: `[日志] ${pattern.name}`,
      notes: `来自事件序列规则库: ${pattern.description || ''}`,
    };

    const existingIndex = (targetFault.symptoms || []).findIndex(
      (s) => s.sequence_id === pattern.id || s.id === `SYM-SEQ-${pattern.id}`
    );
    const updatedSymptoms = [...(targetFault.symptoms || [])];
    if (existingIndex >= 0) {
      updatedSymptoms[existingIndex] = { ...updatedSymptoms[existingIndex], ...newSymptom };
    } else {
      updatedSymptoms.push(newSymptom);
    }
    updateFault(targetFault.id, { symptoms: updatedSymptoms });
    showToast(`已成功将事件序列 [${pattern.id}] 关联同步至故障 [${targetFault.id} ${targetFault.name}] 的异常特征中`, 'success');
  };

  // Version / Bulk Publish
  const publishAllDrafts = (releaseNote = '全站知识库结构化资产统一发布') => {
    const newVersionTag = `v1.0.${versionSnapshots.length + 5}-release`;
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });

    // Mark all as published
    const updatedDevices = devices.map((d) => ({ ...d, status: 'published' as EntityStatus }));
    const updatedFaults = faults.map((f) => ({ ...f, status: 'published' as EntityStatus, review_status: 'ready' as const }));
    const updatedSops = sops.map((s) => ({ ...s, status: 'published' as EntityStatus }));

    setDevices(updatedDevices);
    setFaults(updatedFaults);
    setSops(updatedSops);

    const snapshot: VersionSnapshot = {
      id: `V-${Date.now()}`,
      version: newVersionTag,
      timestamp: nowStr,
      author: '张工 (储能运维专家)',
      message: releaseNote,
      stats: {
        devices: updatedDevices.length,
        faults: updatedFaults.length,
        procedures: updatedSops.length,
        alarms: alarms.length,
      },
      data: {
        devices: updatedDevices,
        faults: updatedFaults,
        procedures: updatedSops,
        alarms: alarms,
      },
    };

    setVersionSnapshots((prev) => [snapshot, ...prev]);

    try {
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(`🚀 已成功将所有草稿打包发布为正式版本 ${newVersionTag}！`, 'success');
  };

  const rollbackVersion = (snapshotId: string) => {
    const snapshot = versionSnapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      showToast('找不到指定版本快照', 'error');
      return;
    }

    setDevices(snapshot.data.devices || []);
    setFaults(snapshot.data.faults || []);
    setSops(snapshot.data.procedures || []);
    setAlarms(snapshot.data.alarms || []);

    showToast(`已成功回滚至历史版本: ${snapshot.version}`, 'info');
  };

  const importYamlContent = (yamlString: string): { success: boolean; message: string } => {
    const parsed = parseUploadedYaml(yamlString);
    if (parsed.error || !parsed.data) {
      showToast(parsed.error || 'YAML 格式解析错误', 'error');
      return { success: false, message: parsed.error || '解析失败' };
    }

    if (parsed.type === 'faults') {
      const importedFaults: FaultPattern[] = parsed.data.map((f: any, idx: number) => ({
        id: f.id || `F_IMP_${idx + 1}`,
        name: f.name || `导入故障 ${idx + 1}`,
        severity: f.severity || 'high',
        root_cause: f.root_cause || '',
        affected_devices: Array.from(new Set(f.affected_devices || [])),
        symptoms: f.symptoms || [],
        propagation_chain: f.propagation_chain || [],
        associated_procedure_ids: f.associated_procedures || f.associated_procedure_ids || [],
        status: 'draft',
        review_status: 'needs_review',
        updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        author: '导入资产',
      }));

      setFaults((prev) => dedupeById([...importedFaults, ...prev]).map(sanitizeFault));
      setSelectedFaultId(importedFaults[0].id);
      setActiveTab('fault-editor');
      showToast(`成功导入 ${importedFaults.length} 条故障定义（已转为草稿状态）`, 'success');
      return { success: true, message: `成功导入 ${importedFaults.length} 条故障` };
    }

    if (parsed.type === 'single_fault') {
      const f = parsed.data;
      const singleFault: FaultPattern = {
        id: f.id || `F_IMP_${Date.now()}`,
        name: f.name || '导入故障模式',
        severity: f.severity || 'high',
        root_cause: f.root_cause || '',
        affected_devices: Array.from(new Set(f.affected_devices || [])),
        symptoms: f.symptoms || [],
        propagation_chain: f.propagation_chain || [],
        associated_procedure_ids: f.associated_procedures || f.associated_procedure_ids || [],
        status: 'draft',
        review_status: 'needs_review',
        updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        author: 'YAML 导入',
      };
      setFaults((prev) => dedupeById([singleFault, ...prev]).map(sanitizeFault));
      setSelectedFaultId(singleFault.id);
      setActiveTab('fault-editor');
      showToast(`已导入单个故障模式 [${singleFault.id}]`, 'success');
      return { success: true, message: '导入成功' };
    }

    if (parsed.type === 'devices') {
      const importedDevices: DeviceNode[] = parsed.data.map((d: any, idx: number) => ({
        id: d.id || `D_IMP_${idx + 1}`,
        name: d.name || `导入设备 ${idx + 1}`,
        device_type: d.device_type || 'generic_component',
        parent_id: d.parent_id || null,
        description: d.description || '',
        status: 'draft',
        updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
        associated_fault_ids: d.associated_faults || [],
        associated_alarm_ids: d.associated_alarms || [],
        location: d.location || '',
        rating_specs: d.rating_specs || '',
      }));
      setDevices((prev) => dedupeById([...importedDevices, ...prev]));
      setActiveTab('devices');
      showToast(`成功导入 ${importedDevices.length} 个设备 BOM 节点`, 'success');
      return { success: true, message: `成功导入 ${importedDevices.length} 个设备` };
    }

    if (parsed.type === 'procedures') {
      const importedSops: RecoveryProcedure[] = parsed.data.map((p: any, idx: number) => ({
        id: p.id || `RP_IMP_${idx + 1}`,
        name: p.name || `导入 SOP 处置 ${idx + 1}`,
        associated_fault_ids: p.associated_faults || [],
        procedures: (p.procedures || []).map((step: any, sIdx: number) => ({
          id: `STEP-${Date.now()}-${sIdx}`,
          step_num: step.step || sIdx + 1,
          action: step.action || '',
          verification: step.verification || '',
          expected_outcome: step.expected_outcome || '',
          estimated_time: step.estimated_time,
          tool_required: step.tool_required,
        })),
        escalation: p.escalation || {
          level: 'high',
          timeout_minutes: 30,
          target_role: '运维主管',
          auto_actions: [],
          manual_actions: [],
        },
        status: 'draft',
        updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      }));
      setSops((prev) => dedupeById([...importedSops, ...prev]));
      setActiveTab('procedures');
      showToast(`成功导入 ${importedSops.length} 条 SOP 处置方案`, 'success');
      return { success: true, message: `成功导入 ${importedSops.length} 条 SOP` };
    }

    return { success: false, message: '未识别的数据类型' };
  };

  const resetToFactoryData = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.DEVICES);
      localStorage.removeItem(STORAGE_KEYS.FAULTS);
      localStorage.removeItem(STORAGE_KEYS.SOPS);
      localStorage.removeItem(STORAGE_KEYS.ALARMS);
      localStorage.removeItem(STORAGE_KEYS.INDICATORS);
      localStorage.removeItem(STORAGE_KEYS.PARAMETERS);
      localStorage.removeItem(STORAGE_KEYS.STATIC_CONFIGS);
      localStorage.removeItem(STORAGE_KEYS.VERSIONS);
    } catch {}
    setDevices(dedupeById(INITIAL_DEVICES));
    setFaults(dedupeById(INITIAL_FAULTS).map(sanitizeFault));
    setSops(dedupeById(INITIAL_SOPS));
    setAlarms(dedupeById(INITIAL_ALARMS));
    setIndicators(dedupeById(INITIAL_INDICATORS));
    setParameters(dedupeById(INITIAL_CONFIG_PARAMETERS));
    setStaticConfigs(dedupeById(INITIAL_STATIC_CONFIG_PROFILES));
    setSoeLogs(SAMPLE_SOE_LOGS);
    setEventPatterns(INITIAL_EVENT_PATTERNS);
    setVersionSnapshots(dedupeById(INITIAL_VERSION_SNAPSHOTS));
    setSelectedFaultId('F001');
    setSelectedSopId('RP-F001');
    setSelectedDeviceId('DEV-CABIN-40FT');
    setSelectedIndicatorId('coolant_flow');
    setSelectedParameterId('pump_control_mode');
    setSelectedProfileId('CFG-DEV-COOL-PUMP');
    showToast('已重置回标准储能示例知识库', 'info');
  };

  const openFaultEditor = (faultId: string) => {
    setSelectedFaultId(faultId);
    setActiveTab('fault-editor');
  };

  const openSopEditor = (sopId: string) => {
    setSelectedSopId(sopId);
    setActiveTab('sop-editor');
  };

  const openDeviceInBom = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setActiveTab('devices');
  };

  const openFaultsGraphView = () => {
    setFaultViewMode('graph');
    setActiveTab('faults');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        faultViewMode,
        setFaultViewMode,
        openFaultsGraphView,
        devices,
        faults,
        sops,
        alarms,
        indicators,
        parameters,
        staticConfigs,
        soeLogs,
        eventPatterns,
        versionSnapshots,
        selectedFaultId,
        setSelectedFaultId,
        selectedSopId,
        setSelectedSopId,
        selectedDeviceId,
        setSelectedDeviceId,
        selectedIndicatorId,
        setSelectedIndicatorId,
        selectedParameterId,
        setSelectedParameterId,
        selectedProfileId,
        setSelectedProfileId,
        selectedEventPatternId,
        setSelectedEventPatternId,
        searchQuery,
        setSearchQuery,
        toasts,
        showToast,
        removeToast,
        draftCount,
        publishedCount,
        selectedFault,
        selectedSop,
        selectedDevice,
        selectedIndicator,
        selectedParameter,
        selectedProfile,
        selectedEventPattern,
        addDevice,
        updateDevice,
        deleteDevice,
        addFault,
        updateFault,
        deleteFault,
        saveFaultDraft,
        publishFault,
        addSop,
        updateSop,
        deleteSop,
        saveSopDraft,
        publishSop,
        addAlarm,
        updateAlarm,
        deleteAlarm,
        addIndicator,
        updateIndicator,
        deleteIndicator,
        openIndicatorEditor,
        addParameter,
        updateParameter,
        deleteParameter,
        publishParameter,
        openParameterEditor,
        updateDeviceConfig,
        resetProfileToBaseline,
        addConfigProfile,
        addSoeLog,
        clearSoeLogs,
        resetSoeLogs,
        addEventPattern,
        updateEventPattern,
        deleteEventPattern,
        syncEventPatternToFault,
        publishAllDrafts,
        rollbackVersion,
        importYamlContent,
        resetToFactoryData,
        openFaultEditor,
        openSopEditor,
        openDeviceInBom,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
