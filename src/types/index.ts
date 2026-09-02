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

export type SymptomDirection = 'up' | 'down' | 'fluctuate' | 'jump' | 'abnormal' | 'abnormal_high' | 'abnormal_low';

export interface Symptom {
  id: string;
  indicator_id?: string; // Reference to MetricIndicator.code or id (e.g. 'coolant_flow')
  metric_name: string; // e.g. '冷却液流量', '电池舱温度', '冷却泵运行电流'
  metric_code?: string; // snake_case code
  direction: SymptomDirection; // 'up' (上升), 'down' (下降), 'fluctuate' (波动), 'jump' (突变)
  time_window: string; // e.g. '0-5min', '5-15min'
  normal_range: string; // e.g. '50-200 L/min', '15-35°C'
  unit?: string; // e.g. 'L/min', '°C', 'A'
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
}

export interface PropagationNodePos {
  id: string;
  label: string;
  type: 'fault' | 'symptom' | 'consequence' | 'intermediate';
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
    faults: FaultPattern[];
    procedures: RecoveryProcedure[];
    alarms: AlarmType[];
  };
}

export type FaultViewMode = 'list' | 'graph';

export type ActiveTab =
  | 'workbench'
  | 'devices'
  | 'indicators'
  | 'faults'
  | 'fault-editor'
  | 'procedures'
  | 'sop-editor'
  | 'alarms'
  | 'test-playground'
  | 'network'
  | 'version-manager';
