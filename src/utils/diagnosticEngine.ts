import {
  DeviceNode,
  FaultPattern,
  RecoveryProcedure,
  AlarmType,
  DiagnosticSimulationInput,
  DiagnosticSimulationResult,
} from '../types';

/**
 * Builds device ancestor path from root down to target device
 */
export function getDeviceHierarchyPath(deviceId: string, devices: DeviceNode[]): DeviceNode[] {
  const map = new Map<string, DeviceNode>();
  devices.forEach((d) => map.set(d.id, d));

  const path: DeviceNode[] = [];
  let current = map.get(deviceId);
  while (current) {
    path.unshift(current);
    if (!current.parent_id) break;
    current = map.get(current.parent_id);
  }
  return path;
}

/**
 * Executes a simulated graph-based diagnostic reasoning on current modeled knowledge
 */
export function runDiagnosticSimulation(
  input: DiagnosticSimulationInput,
  devices: DeviceNode[],
  faults: FaultPattern[],
  sops: RecoveryProcedure[],
  alarms: AlarmType[]
): DiagnosticSimulationResult {
  const deviceMap = new Map(devices.map((d) => [d.id, d]));
  const targetDevice = deviceMap.get(input.source_device_id);
  const targetAlarm = alarms.find((a) => a.id === input.alarm_type_id);

  // Collect candidate devices in proximity (self, parent, children)
  const relatedDeviceIds = new Set<string>();
  if (targetDevice) {
    relatedDeviceIds.add(targetDevice.id);
    if (targetDevice.parent_id) relatedDeviceIds.add(targetDevice.parent_id);
    devices
      .filter((d) => d.parent_id === targetDevice.id)
      .forEach((d) => relatedDeviceIds.add(d.id));
    // If device is in BMS/PCS/Transformer chain, add siblings
    if (targetDevice.parent_id) {
      devices
        .filter((d) => d.parent_id === targetDevice.parent_id)
        .forEach((d) => relatedDeviceIds.add(d.id));
    }
  }

  // Score candidate faults
  interface ScoredFault {
    fault: FaultPattern;
    score: number;
    matchedSymptoms: Array<{
      metric_name: string;
      current_value: string;
      normal_range: string;
      matched: boolean;
    }>;
    matchedCount: number;
    totalCount: number;
    stage: string;
  }

  const scoredFaults: ScoredFault[] = faults.map((fault) => {
    let score = 0;

    // 1. Device match score
    const hasDirectDevice = (fault.affected_devices || []).some((id) =>
      relatedDeviceIds.has(id) || id === input.source_device_id
    );
    if (hasDirectDevice) score += 35;

    // 2. Alarm category score
    if (targetAlarm) {
      if (fault.name.includes('温') && targetAlarm.category.includes('温度')) score += 20;
      if (fault.name.includes('流') && targetAlarm.category.includes('流量')) score += 25;
      if (fault.name.includes('绝缘') && targetAlarm.category.includes('绝缘')) score += 30;
      if (fault.name.includes('热失控') && targetAlarm.category.includes('消防')) score += 35;
      if (fault.name.includes('通信') && targetAlarm.category.includes('通信')) score += 30;
      if (fault.name.includes('电弧') && targetAlarm.category.includes('电气')) score += 30;
    }

    // 3. Symptoms matching
    const matchedSymptoms: Array<{
      metric_name: string;
      current_value: string;
      normal_range: string;
      matched: boolean;
    }> = [];

    let matchCount = 0;
    const totalCount = Math.max(fault.symptoms?.length || 1, 1);

    (fault.symptoms || []).forEach((fs) => {
      const inputSym = input.accompanying_symptoms.find((s) =>
        s.metric_name.toLowerCase().includes(fs.metric_name.toLowerCase()) ||
        fs.metric_name.toLowerCase().includes(s.metric_name.toLowerCase())
      );

      if (inputSym && inputSym.is_abnormal) {
        matchCount++;
        matchedSymptoms.push({
          metric_name: fs.metric_name,
          current_value: inputSym.current_value,
          normal_range: fs.normal_range,
          matched: true,
        });
      } else {
        matchedSymptoms.push({
          metric_name: fs.metric_name,
          current_value: inputSym ? inputSym.current_value : '未输入/正常',
          normal_range: fs.normal_range,
          matched: false,
        });
      }
    });

    const symptomRatio = matchCount / totalCount;
    score += Math.round(symptomRatio * 45);

    // 4. Calculate current propagation stage
    let stage = '第 1 阶段（根因发生初期）';
    if (fault.propagation_chain && fault.propagation_chain.length > 0) {
      if (symptomRatio > 0.66) {
        const lastStep = fault.propagation_chain[fault.propagation_chain.length - 1];
        stage = `第 ${fault.propagation_chain.length} 阶段（${lastStep.to}）`;
      } else if (symptomRatio > 0.33 && fault.propagation_chain.length >= 2) {
        const midStep = fault.propagation_chain[1];
        stage = `第 2 阶段（${midStep.to || midStep.from}）`;
      } else {
        const firstStep = fault.propagation_chain[0];
        stage = `第 1 阶段（${firstStep.to || firstStep.from}）`;
      }
    }

    return {
      fault,
      score: Math.min(score, 99),
      matchedSymptoms,
      matchedCount: matchCount,
      totalCount,
      stage,
    };
  });

  // Sort descending by score
  scoredFaults.sort((a, b) => b.score - a.score);

  const topMatch = scoredFaults[0] || {
    fault: faults[0],
    score: 85,
    matchedSymptoms: [],
    matchedCount: 2,
    totalCount: 3,
    stage: '第 2 阶段（电池热量积累）',
  };

  // Build exploration path
  const hierarchyNodes = targetDevice
    ? getDeviceHierarchyPath(targetDevice.id, devices)
    : [];
  const hierarchyNames = hierarchyNodes.map((d) => d.name);

  // Add primary affected device name if not in path
  const primaryFaultDeviceId = topMatch.fault.affected_devices?.[0];
  const primaryFaultDevice = primaryFaultDeviceId ? deviceMap.get(primaryFaultDeviceId) : null;
  if (primaryFaultDevice && !hierarchyNames.includes(primaryFaultDevice.name)) {
    hierarchyNames.push(primaryFaultDevice.name);
  }

  const exploredPath = hierarchyNames.length > 0 ? hierarchyNames : ['储能电站 A', 'PCS 1', '主变压器', '冷却泵'];

  // Retrieve matching recovery procedures
  const matchedSopIds = topMatch.fault.associated_procedure_ids || [];
  const matchingSops = sops.filter((s) =>
    matchedSopIds.includes(s.id) || s.associated_fault_ids?.includes(topMatch.fault.id)
  );

  const recommendedProcedures =
    matchingSops.length > 0
      ? matchingSops[0].procedures
      : [
          {
            id: 'AUTO-1',
            step_num: 1,
            action: '立即核查现场告警设备指示灯及通信状态',
            verification: '确认现场供电与信号线缆无物理损坏',
            expected_outcome: '信号指示恢复正常',
          },
          {
            id: 'AUTO-2',
            step_num: 2,
            action: '执行系统安全降额或停机隔离',
            verification: '观察关键温度与电气参数是否恢复平稳',
            expected_outcome: '参数恢复在安全阈值内',
          },
        ];

  return {
    matched_fault_id: topMatch.fault.id,
    matched_fault_name: topMatch.fault.name,
    severity: topMatch.fault.severity,
    confidence: Math.max(topMatch.score, 65),
    propagation_stage: topMatch.stage,
    matched_symptoms_count: topMatch.matchedCount,
    total_symptoms_count: topMatch.totalCount,
    matched_symptoms_details: topMatch.matchedSymptoms,
    explored_path: exploredPath,
    recommended_procedures: recommendedProcedures,
    escalation_note: matchingSops[0]?.escalation?.target_role
      ? `若 ${matchingSops[0].escalation.timeout_minutes} 分钟内未恢复，将自动向【${matchingSops[0].escalation.target_role}】发起等级升级`
      : undefined,
    execution_timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
  };
}
