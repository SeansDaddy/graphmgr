// DiagnosGraph Studio - Core Domain Types
// Strictly adhering to domain terminology: Metric Indicator, Fault, Symptom, Propagation Chain, SOP

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EntityStatus = 'draft' | 'published';

export type ReviewStatus = 'ready' | 'needs_review' | 'incomplete';

// Standard Device Type & Version Management (Not bound to specific physical stations)
export interface DeviceNode {
  id: string; // e.g. 'DEV-COOL-PUMP', 'DEV-PCS-1500V'
  name: string; // e.g. '冷却循环泵', '集中式PCS变流柜'
  category: string; // e.g. '冷却系统', '储能变流(PCS)', '电池与BMS', '变压器系统', '消防与环控', '高压电气'
  device_type: string; // e.g. 'pump', 'pipe', 'pcs', 'igbt', 'bms', 'battery', 'transformer', 'cabin', 'fss'
  version: string; // e.g. 'v1.0 (标准型)', 'v2.1 (高压1500V版)', 'Gen-3 智能温控版'
  parent_id: string | null; // hierarchy parent device type or subsystem
  description?: string;
  status: EntityStatus;
  updated_at: string;
  associated_fault_ids: string[];
  telemetry_metric_codes?: string[]; // Bound metric indicators from Indicator Library
  rating_specs?: string; // 硬件额定技术规格
  manufacturer_model?: string; // 型号规格
}

// 4.3 Indicator / Metric Library Definition
export interface MetricIndicator {
  id: string; // unique ID or snake_case code, e.g. 'coolant_flow', 'battery_temperature'
  code: string; // snake_case, unique e.g. 'coolant_flow', 'pump_current'
  name: string; // 中文名 e.g. '冷却液流量', '电池温度'
  unit: string; // e.g. 'L/min', '°C', '%', 'A', 'V', 'kW', 'kΩ', 'ppm', 'MPa'
  domain: string; // '储能' | 'PCS' | 'BMS' | '冷却' | '消防' | '电气' | '环境'
  applicable_device_types: string[]; // e.g. ['pump', 'pipe', 'battery', 'bms', 'pcs', 'transformer', 'cabin']
  device_types?: string[]; // compatibility alias
  description: string;
  normal_range?: string; // e.g. '50-200 L/min'
  normal_range_min?: number;
  normal_range_max?: number;
  normal_range_text?: string; // e.g. '50-200 L/min'
  typical_condition?: string; // 典型工况基线
  data_type?: string;
  sampling_interval?: string;
  associated_fault_ids?: string[];
  status: EntityStatus;
  updated_at: string;
  author?: string;
}

export type DeviceTypeCategory =
  | 'transformer'
  | 'cooling_pump'
  | 'battery'
  | 'bms'
  | 'pcs'
  | 'switchgear'
  | 'cabin'
  | 'pipe'
  | 'fss'
  | 'gas_relay'
  | 'other';

export const DEVICE_TYPE_OPTIONS: { value: DeviceTypeCategory; label: string }[] = [
  { value: 'transformer', label: '主变压器' },
  { value: 'cooling_pump', label: '冷却水泵/循环泵' },
  { value: 'battery', label: '储能电池簇/电芯' },
  { value: 'bms', label: 'BMS电池管理' },
  { value: 'pcs', label: '储能变流器 (PCS)' },
  { value: 'switchgear', label: '高低压开关柜/断路器' },
  { value: 'cabin', label: '集装箱舱体/环境' },
  { value: 'pipe', label: '液冷管路系统' },
  { value: 'fss', label: '消防灭火系统' },
  { value: 'gas_relay', label: '瓦斯保护继电器' },
  { value: 'other', label: '其它辅助设备' },
];

export type SymptomDirection = 'up' | 'down' | 'fluctuate' | 'jump' | 'abnormal' | 'abnormal_high' | 'abnormal_low';

export type SymptomType = 'indicator' | 'alarm' | 'parameter' | 'event_sequence';

export interface Symptom {
  id: string;
  type?: SymptomType; // 'indicator' | 'alarm' | 'parameter' | 'event_sequence' (默认 'indicator')
  device_type?: DeviceTypeCategory | string; // e.g. 'cooling_pump' | 'battery' | 'pcs' | 'transformer'
  device_id?: string; // Optional specific device reference
  device_name?: string; // Optional human-readable device name

  // 1. 标准指标 (type === 'indicator')
  indicator_id?: string; // Reference to MetricIndicator.code or id (e.g. 'coolant_flow')
  metric_name: string; // e.g. '冷却液流量', '电池舱温度', '冷却泵运行电流'
  metric_code?: string; // snake_case code
  direction?: SymptomDirection; // 'up' (上升), 'down' (下降), 'fluctuate' (波动), 'jump' (突变)
  normal_range?: string; // e.g. '50-200 L/min', '15-35°C'
  unit?: string; // e.g. 'L/min', '°C', 'A'

  // 2. 系统告警 (type === 'alarm')
  alarm_id?: string; // e.g. 'ALM-01'
  alarm_code?: string; // e.g. 'ALM_PUMP_FLOW_LOW'
  alarm_name?: string; // e.g. '冷却泵主回路低流量告警'
  alarm_level?: SeverityLevel | string; // 'critical' | 'high' | 'medium' | 'low'
  trigger_condition?: string; // e.g. '连续低于 50 L/min 超过 3s'

  // 3. 配置参数异常 (type === 'parameter')
  parameter_id?: string; // e.g. 'pump_control_mode'
  parameter_code?: string; // e.g. 'pump_control_mode'
  parameter_name?: string; // e.g. '冷却泵控制模式'
  baseline_value?: string | number | boolean; // 出厂默认值 e.g. 'auto'
  abnormal_value?: string | number | boolean; // 异常/致错配置 e.g. 'manual'
  condition_operator?: string; // e.g. '== manual' 或 '!= auto'

  // 4. 事件序列与日志特征 (type === 'event_sequence')
  sequence_id?: string; // e.g. 'SEQ-TMS-PUMP-01'
  sequence_name?: string; // e.g. '冷却泵启停失步日志序列'
  log_source?: string; // 哪个日志: e.g. 'tms_system.log'
  time_window?: string; // 哪个时段: e.g. '[-5min, 0min]' 或 '0-5min'
  keywords?: string; // 关键字 / 正则: e.g. 'PUMP_FLOW_LOW|PRESSURE_COLLAPSE'
  stat_type?: 'count' | 'rate' | 'duration' | 'first_seen'; // 次数或者统计
  stat_condition?: string; // e.g. '出现次数 >= 3 次' 或 '持续时间 > 10s'

  deviation_desc?: string; // e.g. '低于下限 50 L/min'
  notes?: string;
}

// Alias for domain convenience
export type FaultSymptom = Symptom;

export interface PropagationStep {
  id: string;
  from: string; // node name or id
  to: string; // node name or id
  time_window: string; // e.g. '0-5min', '5-15min', '15-30min'
  description?: string;
  probability?: number; // e.g. 0.95

  // Causal relationship: A设备 a症状 导致 B设备 b症状
  from_device_type?: DeviceTypeCategory | string; // A设备类型 (e.g. 'cooling_pump', 'pipe', 'battery')
  from_device_name?: string; // A设备名称 (e.g. '主变冷却水泵')
  from_symptom_id?: string; // a症状ID (e.g. 'SYM-001')
  from_symptom_name?: string; // a症状描述/名称 (e.g. '冷却回路实际流量骤降 ↓')

  to_device_type?: DeviceTypeCategory | string; // B设备类型 (e.g. 'transformer', 'battery', 'pcs')
  to_device_name?: string; // B设备名称 (e.g. '储能主变压器')
  to_symptom_id?: string; // b症状ID (e.g. 'SYM-002')
  to_symptom_name?: string; // b症状描述/名称 (e.g. '主变顶层油温持续攀升 ↑')
}

export interface PropagationNodePos {
  id: string;
  label: string;
  type: 'fault' | 'symptom' | 'consequence' | 'intermediate';
  device_type?: DeviceTypeCategory | string;
  device_name?: string;
  symptom_id?: string;
  symptom_name?: string;
  metric_name?: string;
  direction?: SymptomDirection;
  x: number;
  y: number;
}

export interface FaultPattern {
  id: string; // e.g. 'F001'
  name: string; // e.g. '冷却泵故障'
  severity: SeverityLevel;
  root_cause: string; // Markdown supported
  affected_devices: string[]; // device IDs
  symptoms: Symptom[];
  propagation_chain: PropagationStep[];
  canvas_layout?: PropagationNodePos[];
  propagation_layout?: Record<string, { x: number; y: number }>;
  associated_procedure_ids: string[]; // SOP IDs e.g. ['RP-F001']
  status: EntityStatus;
  review_status: ReviewStatus;
  updated_at: string;
  author?: string;
  tags?: string[];
}

export interface SOPStep {
  id: string;
  step_num: number;
  action: string; // 动作
  verification: string; // 验证方法
  expected_outcome: string; // 预期结果
  estimated_time?: string; // 预估用时
  tool_required?: string; // 工具
}

export type RecoveryStep = SOPStep;

export interface EscalationPolicy {
  level: SeverityLevel;
  timeout_minutes: number;
  target_role: string; // e.g. '运维主管', '站长', '厂家技术专家'
  auto_actions: string[]; // 自动执行动作
  manual_actions: string[]; // 人工执行动作
}

export interface RecoveryProcedure {
  id: string; // e.g. 'RP-F001'
  name: string; // e.g. '冷却泵故障应急处置'
  associated_fault_ids: string[]; // e.g. ['F001']
  procedures: SOPStep[];
  escalation: EscalationPolicy;
  status: EntityStatus;
  updated_at: string;
  safety_warnings?: string[];
}

export interface AlarmType {
  id: string;
  code: string;
  name: string;
  category: string;
  device_type: string;
  severity: SeverityLevel;
  default_threshold: string;
  unit: string;
  description: string;
}

export interface AccompanyingSymptomInput {
  metric_name: string;
  current_value: string;
  normal_range?: string;
  direction?: SymptomDirection;
  is_abnormal: boolean;
  unit?: string;
}

export interface DiagnosticSimulationInput {
  source_device_id: string;
  alarm_type_id: string;
  alarm_value: string | number;
  threshold: string | number;
  unit?: string;
  timestamp?: string;
  accompanying_symptoms: AccompanyingSymptomInput[];
}

export interface DiagnosticSimulationResult {
  matched_fault_id: string;
  matched_fault_name: string;
  severity: SeverityLevel;
  confidence: number; // 0-100%
  propagation_stage: string; // e.g. '第 2 阶段（电池热量积累）'
  matched_symptoms_count: number;
  total_symptoms_count: number;
  matched_symptoms_details: Array<{
    metric_name: string;
    current_value: string;
    normal_range: string;
    matched: boolean;
  }>;
  explored_path: string[]; // Device hierarchy navigation path e.g. ['BMS 1-1', 'PCS 1', '主变压器', '冷却泵']
  recommended_procedures: SOPStep[];
  escalation_note?: string;
  execution_timestamp: string;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  input: DiagnosticSimulationInput;
}

export interface VersionSnapshot {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  message: string;
  stats: {
    devices: number;
    indicators?: number;
    faults: number;
    procedures: number;
    alarms: number;
  };
  data: {
    devices: DeviceNode[];
    indicators?: MetricIndicator[];
    parameters?: ConfigParameter[];
    faults: FaultPattern[];
    procedures: RecoveryProcedure[];
    alarms: AlarmType[];
  };
}

export type FaultViewMode = 'list' | 'graph';

// 4.9 Config Parameter Library Types (v1.1 Core Module)
export type ParameterDataType = 'enum' | 'int' | 'float' | 'bool' | 'string';

export interface EnumOption {
  key: string; // e.g. 'auto'
  label: string; // e.g. '自动模式'
  description?: string;
}

export type ParameterEnumValue = EnumOption;

export interface ConfigParameter {
  id: string; // unique code, e.g. 'pump_control_mode'
  code: string; // snake_case, unique
  name: string; // 中文名 e.g. '冷却泵控制模式'
  domain: string; // '储能' | 'PCS' | 'BMS' | '冷却' | '消防' | '电气' | '环控'
  applicable_device_types: string[]; // e.g. ['pump', 'battery', 'pcs', 'bms']
  description: string;
  param_type: ParameterDataType;
  enum_values?: EnumOption[]; // For enum type
  range_min?: number; // For int / float type
  range_max?: number; // For int / float type
  unit?: string; // e.g. '%', '°C', 'kW', 'L/min'
  regex_pattern?: string; // For string type
  default_value: string | number | boolean;
  associated_fault_ids: string[]; // Reverse lookup: faults that use or are triggered by this param
  status: EntityStatus; // 'draft' | 'published'
  updated_at: string;
  author?: string;
}

// 静态配置实例与基线核对 (Static Configuration Audit)
export interface DeviceConfigurationProfile {
  id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  profile_name: string;
  updated_at: string;
  configs: Record<string, string | number | boolean>; // param_code -> current_value
  baseline_status: 'synced' | 'drift_detected' | 'critical_mismatch';
  mismatches_count?: number;
}

// 日志与事件序列 (Event Sequence & SOE Log Diagnostics)
export interface SoeLogEvent {
  id: string;
  timestamp: string; // e.g. '2026-09-02 10:14:02.124'
  relative_ms: number; // T + ms offset
  device_id: string;
  device_name: string;
  device_type: string;
  event_code: string;
  event_name: string;
  severity: SeverityLevel;
  source: 'BMS' | 'PCS' | 'TMS' | 'FSS' | 'HV' | 'EMS' | 'SCADA';
  details?: string;
}

// 日志与事件序列规则库 (Event Sequence & Log Query Symptom Rule)
export interface EventSequenceStep {
  seq: number;
  step_name: string;
  log_source: string; // 哪个日志
  time_window: string; // 哪个时段
  keywords: string; // 关键字
  stat_condition: string; // 次数或统计判定
  mandatory?: boolean;
}

export interface EventSequencePattern {
  id: string; // e.g. 'SEQ-TMS-PUMP-01'
  fault_id: string; // 关联故障 ID e.g. 'F001'
  fault_name: string; // 关联故障名称 e.g. '冷却泵故障'
  name: string; // 规则名称 e.g. '冷却泵失步停机与低流速日志特征'
  device_type?: string; // 关联设备类型 e.g. 'cooling_pump'
  
  // 核心查询四要素:
  log_source: string; // 1. 哪个日志 e.g. 'tms_system.log'
  time_window: string; // 2. 哪个时段 e.g. '[-5min, 0min]'
  keywords: string; // 3. 关键字 / 正则 e.g. 'PUMP_FLOW_LOW|PRESSURE_COLLAPSE'
  match_mode?: 'regex' | 'contains' | 'exact' | 'and' | 'or';
  
  stat_type?: 'count' | 'rate' | 'duration' | 'first_seen'; // 4. 次数或者统计
  stat_operator?: '>=' | '>' | '==' | '<=' | 'between';
  stat_threshold?: number | string; // e.g. 3
  stat_unit?: string; // e.g. '次', '次/分', '秒'
  stat_condition?: string; // 汇总条件文本 e.g. '出现次数 >= 3 次'

  description: string; // 规则判定机理与说明
  steps?: EventSequenceStep[]; // 多步骤有序时序链 (可选)

  // 兼容旧有时序步定义 (向后兼容)
  expected_events?: Array<{
    seq: number;
    delay_window: string;
    device_type: string;
    event_code: string;
    event_name: string;
    severity: SeverityLevel;
    mandatory: boolean;
  }>;

  status?: EntityStatus;
  updated_at?: string;
  author?: string;
}

export type ActiveTab =
  | 'workbench'
  | 'devices'
  | 'indicators'
  | 'parameters'
  | 'parameter-editor'
  | 'static-configs'
  | 'event-logs'
  | 'faults'
  | 'fault-editor'
  | 'procedures'
  | 'sop-editor'
  | 'alarms'
  | 'test-playground'
  | 'network'
  | 'version-manager';
