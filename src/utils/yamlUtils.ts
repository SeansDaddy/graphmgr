import * as yaml from 'js-yaml';
import { DeviceNode, FaultPattern, RecoveryProcedure, AlarmType, MetricIndicator } from '../types';

/**
 * Generate YAML for a single fault pattern conforming to fault_patterns.yaml schema
 */
export function generateFaultYaml(fault: FaultPattern): string {
  const faultDoc = {
    id: fault.id,
    name: fault.name,
    severity: fault.severity,
    root_cause: fault.root_cause,
    affected_devices: fault.affected_devices || [],
    symptoms: (fault.symptoms || []).map((s) => ({
      metric_name: s.metric_name,
      direction: s.direction,
      time_window: s.time_window,
      normal_range: s.normal_range,
      unit: s.unit || '',
      notes: s.notes || undefined,
    })),
    propagation_chain: (fault.propagation_chain || []).map((p) => ({
      from: p.from,
      to: p.to,
      time_window: p.time_window,
      description: p.description || undefined,
      probability: p.probability ?? 0.9,
    })),
    associated_procedures: fault.associated_procedure_ids || [],
    metadata: {
      status: fault.status,
      review_status: fault.review_status,
      updated_at: fault.updated_at,
      author: fault.author || '储能专家',
      tags: fault.tags || [],
    },
  };

  return yaml.dump({ fault: faultDoc }, { indent: 2, lineWidth: 120, noRefs: true });
}

export const generateSingleFaultYaml = generateFaultYaml;

/**
 * Generate YAML for all faults bundle (fault_patterns.yaml)
 */
export function generateAllFaultsYaml(faults: FaultPattern[]): string {
  const faultList = faults.map((fault) => ({
    id: fault.id,
    name: fault.name,
    severity: fault.severity,
    root_cause: fault.root_cause,
    affected_devices: fault.affected_devices || [],
    symptoms: (fault.symptoms || []).map((s) => ({
      metric_name: s.metric_name,
      direction: s.direction,
      time_window: s.time_window,
      normal_range: s.normal_range,
      unit: s.unit || '',
      notes: s.notes || undefined,
    })),
    propagation_chain: (fault.propagation_chain || []).map((p) => ({
      from: p.from,
      to: p.to,
      time_window: p.time_window,
      description: p.description || undefined,
      probability: p.probability ?? 0.9,
    })),
    associated_procedures: fault.associated_procedure_ids || [],
    status: fault.status,
    updated_at: fault.updated_at,
  }));

  return yaml.dump({ faults: faultList }, { indent: 2, lineWidth: 120, noRefs: true });
}

export const generateFaultsYaml = generateAllFaultsYaml;

/**
 * Generate YAML for Device BOM (devices.yaml)
 */
export function generateDevicesYaml(devices: DeviceNode[]): string {
  const deviceList = devices.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category || '',
    device_type: d.device_type,
    version: d.version || 'v1.0',
    parent_id: d.parent_id,
    description: d.description || '',
    rating_specs: d.rating_specs || '',
    manufacturer_model: d.manufacturer_model || '',
    associated_faults: d.associated_fault_ids || [],
    telemetry_metric_codes: d.telemetry_metric_codes || [],
    status: d.status,
    updated_at: d.updated_at,
  }));

  return yaml.dump({ devices: deviceList }, { indent: 2, lineWidth: 120, noRefs: true });
}

/**
 * Generate YAML for Metric Indicators Library (indicators.yaml)
 */
export function generateIndicatorsYaml(indicators: MetricIndicator[]): string {
  const indicatorList = indicators.map((ind) => ({
    id: ind.id,
    code: ind.code,
    name: ind.name,
    unit: ind.unit,
    domain: ind.domain,
    applicable_device_types: ind.applicable_device_types || ind.device_types || [],
    description: ind.description || '',
    normal_range: ind.normal_range || ind.normal_range_text || '',
    typical_condition: ind.typical_condition || '',
    status: ind.status,
    updated_at: ind.updated_at,
  }));

  return yaml.dump({ indicators: indicatorList }, { indent: 2, lineWidth: 120, noRefs: true });
}

/**
 * Generate YAML for a single SOP / Recovery procedure
 */
export function generateSingleProcedureYaml(sop: RecoveryProcedure): string {
  const sopDoc = {
    id: sop.id,
    name: sop.name,
    associated_faults: sop.associated_fault_ids || [],
    procedures: (sop.procedures || []).map((p) => ({
      step: p.step_num,
      action: p.action,
      verification: p.verification,
      expected_outcome: p.expected_outcome,
      estimated_time: p.estimated_time || undefined,
      tool_required: p.tool_required || undefined,
    })),
    escalation: {
      level: sop.escalation?.level || 'high',
      timeout_minutes: sop.escalation?.timeout_minutes || 30,
      target_role: sop.escalation?.target_role || '运维主管',
      auto_actions: sop.escalation?.auto_actions || [],
      manual_actions: sop.escalation?.manual_actions || [],
    },
    safety_warnings: sop.safety_warnings || [],
    status: sop.status,
    updated_at: sop.updated_at,
  };

  return yaml.dump({ recovery_procedure: sopDoc }, { indent: 2, lineWidth: 120, noRefs: true });
}

/**
 * Generate YAML for SOP / Recovery procedures (recovery_procedures.yaml)
 */
export function generateSopsYaml(sops: RecoveryProcedure[]): string {
  const sopList = sops.map((sop) => ({
    id: sop.id,
    name: sop.name,
    associated_faults: sop.associated_fault_ids || [],
    procedures: (sop.procedures || []).map((p) => ({
      step: p.step_num,
      action: p.action,
      verification: p.verification,
      expected_outcome: p.expected_outcome,
      estimated_time: p.estimated_time || undefined,
      tool_required: p.tool_required || undefined,
    })),
    escalation: {
      level: sop.escalation?.level || 'high',
      timeout_minutes: sop.escalation?.timeout_minutes || 30,
      target_role: sop.escalation?.target_role || '运维主管',
      auto_actions: sop.escalation?.auto_actions || [],
      manual_actions: sop.escalation?.manual_actions || [],
    },
    safety_warnings: sop.safety_warnings || [],
    status: sop.status,
    updated_at: sop.updated_at,
  }));

  return yaml.dump({ recovery_procedures: sopList }, { indent: 2, lineWidth: 120, noRefs: true });
}

export const generateProceduresYaml = generateSopsYaml;

/**
 * Generate YAML for Alarms
 */
export function generateAlarmsYaml(alarms: AlarmType[]): string {
  return yaml.dump({ alarms }, { indent: 2, noRefs: true });
}

/**
 * Generate full project diagnostic archive bundle
 */
export function generateFullSystemYamlBundle(
  devices: DeviceNode[],
  faults: FaultPattern[],
  sops: RecoveryProcedure[],
  alarms: AlarmType[]
): {
  'fault_patterns.yaml': string;
  'devices.yaml': string;
  'recovery_procedures.yaml': string;
  'alarms.yaml': string;
} {
  return {
    'fault_patterns.yaml': generateAllFaultsYaml(faults),
    'devices.yaml': generateDevicesYaml(devices),
    'recovery_procedures.yaml': generateSopsYaml(sops),
    'alarms.yaml': generateAlarmsYaml(alarms),
  };
}

/**
 * Parse uploaded YAML string back into structured assets
 */
export function parseUploadedYaml(rawYaml: string): {
  type: 'faults' | 'devices' | 'procedures' | 'single_fault' | 'unknown';
  data: any;
  error?: string;
} {
  try {
    const parsed = yaml.load(rawYaml) as any;
    if (!parsed || typeof parsed !== 'object') {
      return { type: 'unknown', data: null, error: 'YAML 内容为空或非对象结构' };
    }

    if (parsed.faults && Array.isArray(parsed.faults)) {
      return { type: 'faults', data: parsed.faults };
    }

    if (parsed.fault && typeof parsed.fault === 'object') {
      return { type: 'single_fault', data: parsed.fault };
    }

    if (parsed.devices && Array.isArray(parsed.devices)) {
      return { type: 'devices', data: parsed.devices };
    }

    if (parsed.recovery_procedures && Array.isArray(parsed.recovery_procedures)) {
      return { type: 'procedures', data: parsed.recovery_procedures };
    }

    // Direct object heuristics
    if (parsed.id && (parsed.root_cause !== undefined || parsed.symptoms !== undefined)) {
      return { type: 'single_fault', data: parsed };
    }

    return { type: 'unknown', data: parsed, error: '未能识别出 DiagnosGraph 标准 YAML 结构 (期望包含 faults, devices, 或 recovery_procedures 节点)' };
  } catch (err: any) {
    return { type: 'unknown', data: null, error: `YAML 解析失败: ${err.message || String(err)}` };
  }
}

/**
 * Trigger browser file download
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/yaml;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
