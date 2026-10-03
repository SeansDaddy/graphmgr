import { FaultTreeDocument, FtaTestCase } from '../types/fta';
import {
  DeviceNode,
  MetricIndicator,
  AlarmType,
  ConfigParameter,
  EventSequencePattern,
  FaultPattern,
  RecoveryProcedure,
} from '../types';

export const RAW_BATTERY_CLUSTER_OVERHEAT_YAML = `apiVersion: diag.example.com/v1
kind: FaultTree

metadata:
  id: FT-ESS-CLUSTER-OVERHEAT
  name: 储能电池簇过热故障诊断
  version: 1.0.0
  domain: energy_storage
  asset_type: battery_cluster
  severity: critical
  language: zh-CN
  tags: [ess, battery, overheat, bms, cooling]

variables:
  - name: window_5m
    type: duration
    value: 5m
  - name: window_30m
    type: duration
    value: 30m
  - name: window_90d
    type: duration
    value: 90d

context:
  asset:
    id: \${asset.id}
    type: battery_cluster
    topology_ref: \${asset.topology_ref}
  clock:
    require_sync: true
    min_quality: degraded
    max_drift: 200ms
  topology:
    source: cmdb
    nodes:
      - id: STATION_A
        type: station
      - id: UNIT_1
        type: energy_storage_unit
        parent: STATION_A
      - id: CLUSTER_1
        type: battery_cluster
        parent: UNIT_1
      - id: MODULE_1
        type: battery_module
        parent: CLUSTER_1
      - id: MODULE_2
        type: battery_module
        parent: CLUSTER_1
      - id: MODULE_3
        type: battery_module
        parent: CLUSTER_1
      - id: COOLING_1
        type: cooling_system
        parent: CLUSTER_1
    relations:
      - from: MODULE_1
        to: CLUSTER_1
        type: child_of
      - from: MODULE_2
        to: CLUSTER_1
        type: child_of
      - from: MODULE_3
        to: CLUSTER_1
        type: child_of
      - from: COOLING_1
        to: CLUSTER_1
        type: child_of

observations:
  # === Metric ===
  - id: cell_temp_max
    type: metric
    name: 电芯最高温度
    selector:
      asset_id: \${asset.id}
      point_id: "BMS.CELL.TEMP.MAX"
      point_type: analog
      unit: "℃"
    query:
      range: \${window_30m}
      step: 10s
      aggregation: max
    quality:
      require: [valid, good]

  - id: cell_temp_rise_rate
    type: metric
    name: 电芯温升速率
    selector:
      asset_id: \${asset.id}
      point_id: "BMS.CELL.TEMP.RISE_RATE"
      point_type: derived
      unit: "℃/min"
    query:
      range: \${window_5m}
      aggregation: max

  - id: cluster_current
    type: metric
    name: 簇电流
    selector:
      asset_id: \${asset.id}
      point_id: "PCS.CLUSTER.CURRENT"
      point_type: analog
      unit: "A"
    query:
      range: \${window_30m}
      aggregation: avg

  - id: cooling_status
    type: metric
    name: 冷却系统运行状态
    selector:
      asset_id: COOLING_1
      point_id: "COOLING.STATUS"
      point_type: state
    query:
      range: \${window_5m}
      latest: true

  - id: coolant_flow
    type: metric
    name: 冷却液流量
    selector:
      asset_id: COOLING_1
      point_id: "COOLING.FLOW"
      point_type: analog
      unit: "L/min"
    query:
      range: \${window_30m}
      aggregation: avg

  - id: cell_voltage_diff
    type: metric
    name: 电芯压差
    selector:
      asset_id: \${asset.id}
      point_id: "BMS.CELL.VOLTAGE.DIFF"
      point_type: derived
      unit: "mV"
    query:
      range: \${window_30m}
      aggregation: max

  - id: module_temp_abnormal
    type: metric
    name: 模组温度异常标志
    selector:
      asset_id: \${asset.id}
      point_id: "BMS.MODULE.TEMP.ABNORMAL"
      point_type: state
    query:
      range: \${window_30m}
      per_child: true

  # === Alarm ===
  - id: temp_high_alarm
    type: alarm
    name: 电芯温度高告警
    selector:
      asset_id: \${asset.id}
      alarm_code: "BMS_CELL_TEMP_HIGH"
    query:
      status: active
      within: \${window_30m}

  - id: cooling_fault_alarm
    type: alarm
    name: 冷却系统故障告警
    selector:
      asset_id: COOLING_1
      alarm_code: "COOLING_FAULT"
    query:
      status: active
      within: \${window_30m}

  - id: overcurrent_alarm
    type: alarm
    name: 过流告警
    selector:
      asset_id: \${asset.id}
      alarm_code: "PCS_OVERCURRENT"
    query:
      status: active
      within: \${window_30m}

  # === Log / Event ===
  - id: bms_protection
    type: log
    name: BMS 保护动作
    selector:
      asset_id: \${asset.id}
      event_type: protection_action
      source: bms
    query:
      within: \${window_30m}
    fields: [event_id, action, cell_id, occurred_at, fault_id]

  - id: fire_alarm
    type: log
    name: 消防告警事件
    selector:
      asset_id: \${asset.id}
      event_type: fire_alarm
      source: fire_system
    query:
      within: \${window_30m}
    fields: [event_id, zone, occurred_at]

  # === Config ===
  - id: temp_threshold
    type: config
    name: 温度保护定值
    selector:
      asset_id: \${asset.id}
      config_type: bms_setting
      key: "cell_temp_trip_threshold"
    compare:
      actual_field: value
      expected_from: asset_model
      tolerance: 0.02
      changed_within: \${window_30m}

  - id: cooling_setting
    type: config
    name: 冷却参数
    selector:
      asset_id: COOLING_1
      config_type: cooling_setting
      key: "flow_threshold"
    compare:
      actual_field: value
      expected_from: asset_model
      tolerance: 0.05
      changed_within: \${window_30m}

  # === 录波 ===
  - id: cluster_waveform
    type: waveform
    name: 簇电流录波
    selector:
      asset_id: \${asset.id}
      record_type: fault_recording
      format: COMTRADE
      channels: ["CLUSTER_IA", "CLUSTER_IB", "CLUSTER_IC"]
    query:
      within: \${window_30m}
      triggered_by: bms_protection
    analyzers:
      - id: rms_current
        method: rms
        channel: CLUSTER_IA
        window: [0ms, 100ms]
      - id: thd_current
        method: fft
        channel: CLUSTER_IA
        harmonic: 3
        window: [0ms, 200ms]

shared_events:
  - id: SE_COOLING_FAIL
    type: basic
    name: 冷却系统失效
    condition:
      all:
        - observation: cooling_status
          operator: eq
          value: "OFF"
          for: 5m
        - observation: cooling_fault_alarm
          operator: active
          within: 30m

  - id: SE_TEMP_HIGH
    type: basic
    name: 电芯温度高
    condition:
      any:
        - observation: cell_temp_max
          operator: gt
          value: 55
          for: 5m
        - observation: temp_high_alarm
          operator: active
          within: 30m

fault_tree:
  root: TOP
  nodes:
    - id: TOP
      type: top_event
      name: 电池簇过热
      gate: OR
      children: [COOLING_CAUSE, OVERLOAD_CAUSE, INTERNAL_CAUSE, FIRE_RISK]
      output:
        conclusion: "电池簇过热故障"
        severity: critical
        confidence:
          method: weighted
          threshold: 0.6

    # === 冷却原因 ===
    - id: COOLING_CAUSE
      type: intermediate
      name: 冷却系统原因
      gate: AND
      children: [SE_COOLING_FAIL, SE_TEMP_HIGH, COOLING_SETTING_MISMATCH]
      weight: 0.9

    - id: COOLING_SETTING_MISMATCH
      type: basic
      name: 冷却参数与模型不一致
      condition:
        type: config_compare
        observation: cooling_setting
        operator: ne
        changed_within: 30m

    # === 过载原因 ===
    - id: OVERLOAD_CAUSE
      type: intermediate
      name: 过载原因
      gate: AND
      children: [OVERLOAD, SE_TEMP_HIGH, OVERLOAD_TIMELINE]
      weight: 0.75

    - id: OVERLOAD
      type: basic
      name: 簇电流过高
      condition:
        observation: cluster_current
        operator: gt
        value: 200
        for: 10m

    - id: OVERLOAD_TIMELINE
      type: timeline_ref
      timeline: TL_OVERLOAD
      accept_partial: true
      min_matched_steps: 2

    # === 内部故障原因 ===
    - id: INTERNAL_CAUSE
      type: intermediate
      name: 电池内部故障
      gate: AND
      children: [CELL_INCONSISTENCY, BMS_TRIP, WAVEFORM_FAULT, TEMP_THRESHOLD_MISMATCH]
      weight: 1.0

    - id: CELL_INCONSISTENCY
      type: basic
      name: 电芯一致性差
      condition:
        observation: cell_voltage_diff
        operator: gt
        value: 100
        unit: mV
        for: 5m

    - id: BMS_TRIP
      type: basic
      name: BMS 保护动作
      condition:
        observation: bms_protection
        operator: exists
        within: 30m
        filter:
          action: trip

    - id: WAVEFORM_FAULT
      type: basic
      name: 录波显示异常特征
      condition:
        any:
          - observation: cluster_waveform
            feature: rms_current
            operator: gt
            value: 250
          - observation: cluster_waveform
            feature: thd_current
            operator: gt
            value: 0.1

    - id: TEMP_THRESHOLD_MISMATCH
      type: basic
      name: 温度保护定值异常
      condition:
        type: config_compare
        observation: temp_threshold
        operator: ne
        changed_within: 30m

    # === 火灾风险 ===
    - id: FIRE_RISK
      type: intermediate
      name: 火灾风险
      gate: OR
      children: [FIRE_ALARM_EVENT, TEMP_EXTREME]

    - id: FIRE_ALARM_EVENT
      type: basic
      name: 消防告警
      condition:
        observation: fire_alarm
        operator: exists
        within: 30m

    - id: TEMP_EXTREME
      type: basic
      name: 温度极高
      condition:
        observation: cell_temp_max
        operator: gt
        value: 70
        for: 1m

    # === 拓扑聚合：多模组异常 → 簇异常 ===
    - id: CLUSTER_ABNORMAL_AGG
      type: aggregate
      name: 多模组温度异常
      scope:
        topology: parent
        group_by: parent_asset_id
        include_children: true
        min_children: 3
      condition:
        observation: module_temp_abnormal
        metric: cell_temp_max
        operator: abnormal
        window: 30m
        per_child: true
      aggregation:
        method: weighted_vote
        count_threshold: 3
        ratio_threshold: 0.6
        min_distinct_children: 2
        weights:
          by_severity: true
          by_asset_criticality: true
      on_insufficient:
        action: degrade_confidence
        penalty: 0.2

    # === 专家规则 ===
    - id: EXPERT_RULE_CONSISTENCY
      type: rule
      name: 多模组温升+压差大
      language: expr
      expression: |
        let temp_abnormal = metrics["cell_temp_rise_rate"] > 1.0;
        let volt_abnormal = metrics["cell_voltage_diff"] > 100;
        temp_abnormal && volt_abnormal
      inputs:
        - observation: cell_temp_rise_rate
        - observation: cell_voltage_diff
      confidence:
        base: 0.8
        max: 0.95

    - id: UNDEVELOPED_1
      type: undeveloped
      name: 待进一步分析
      note: "当前无数据支撑，暂不展开"

timeline:
  - id: TL_OVERLOAD
    description: 过载时间线
    correlation_key: fault_id
    clock_sync:
      required: false
      source: corrected_time
      max_drift: 200ms
      quality_min: degraded
    ordering:
      mode: tolerant
      time_source: corrected_time
      max_skew: 500ms
      allow_late_arrival: 30s
      buffer_window: 60s
    sequence:
      - event: overcurrent_alarm
        filter: { action: raise }
      - event: temp_high_alarm
        filter: { action: raise }
        relation: after
        within: 5m
        tolerance: 1s
      - event: bms_protection
        filter: { action: trip }
        relation: after
        within: 100ms
        tolerance: 200ms
    on_violation:
      action: degrade_confidence
      penalty: 0.2
    fallback:
      - mode: unordered
        require_all: true
        degrade_confidence: 0.3

analysis:
  qualitative:
    mcs: true
    mps: true
    max_order: 5
    output: mcs_list
  quantitative:
    method: frequency_approx
    source: historical_events
    window: \${window_90d}
    min_samples: 10

diagnosis:
  conclusions:
    - id: D_COOLING
      when: COOLING_CAUSE
      text: "冷却系统失效导致电池簇过热"
      severity: critical
      recommendations:
        - "立即检查冷却系统运行状态"
        - "检查冷却液流量和温度"
        - "必要时降低充放电功率"
        - "投入备用冷却"

    - id: D_OVERLOAD
      when: OVERLOAD_CAUSE
      text: "过载导致电池簇过热"
      severity: high
      recommendations:
        - "降低充放电功率"
        - "检查 PCS 输出"
        - "检查负荷曲线"

    - id: D_INTERNAL
      when: INTERNAL_CAUSE
      text: "电池内部故障导致过热"
      severity: critical
      recommendations:
        - "立即停机检查"
        - "检查电芯一致性和压差"
        - "分析 BMS 保护动作和录波"
        - "必要时更换异常模组"

    - id: D_FIRE
      when: FIRE_RISK
      text: "电池簇火灾风险"
      severity: critical
      recommendations:
        - "立即启动消防预案"
        - "断开簇开关"
        - "疏散人员"
        - "通知消防"

  evidence_report:
    include:
      - cell_temp_max
      - cell_temp_rise_rate
      - cluster_current
      - cooling_status
      - coolant_flow
      - cell_voltage_diff
      - temp_high_alarm
      - cooling_fault_alarm
      - overcurrent_alarm
      - bms_protection
      - fire_alarm
      - temp_threshold
      - cooling_setting
      - cluster_waveform
    timeline: true
    quality_report: true

  mcs_matched:
    - [SE_COOLING_FAIL, SE_TEMP_HIGH, COOLING_SETTING_MISMATCH]
    - [OVERLOAD, SE_TEMP_HIGH, OVERLOAD_TIMELINE]
    - [CELL_INCONSISTENCY, BMS_TRIP, WAVEFORM_FAULT, TEMP_THRESHOLD_MISMATCH]

tests:
  - name: 冷却系统失效导致过热
    given:
      observations:
        cooling_status: "OFF"
        cooling_fault_alarm: active
        cell_temp_max: 60
        temp_high_alarm: active
    expect:
      conclusions: [D_COOLING]

  - name: 过载导致过热
    given:
      observations:
        cluster_current: 220
        temp_high_alarm: active
        overcurrent_alarm: active
    expect:
      conclusions: [D_OVERLOAD]

  - name: 内部故障导致过热
    given:
      observations:
        cell_voltage_diff: 120
        bms_protection: { action: trip }
        cluster_waveform: { rms_current: 260 }
        temp_threshold: { mismatch: true }
    expect:
      conclusions: [D_INTERNAL]

  - name: 火灾风险
    given:
      observations:
        fire_alarm: { zone: A }
        cell_temp_max: 75
    expect:
      conclusions: [D_FIRE]`;

export const BATTERY_CLUSTER_OVERHEAT_FTA_DOC: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'FT-ESS-CLUSTER-OVERHEAT',
    name: '储能电池簇过热故障诊断',
    version: '1.0.0',
    domain: 'energy_storage',
    asset_type: 'battery_cluster',
    severity: 'critical',
    language: 'zh-CN',
    tags: ['ess', 'battery', 'overheat', 'bms', 'cooling'],
    description: '涵盖冷却失效、过载、电池内部故障及火灾风险的全维度 FTA 故障树诊断模型',
  },
  variables: [
    { name: 'window_5m', type: 'duration', value: '5m' },
    { name: 'window_30m', type: 'duration', value: '30m' },
    { name: 'window_90d', type: 'duration', value: '90d' },
  ],
  context: {
    asset: {
      id: '${asset.id}',
      type: 'battery_cluster',
      topology_ref: '${asset.topology_ref}',
    },
    clock: {
      require_sync: true,
      min_quality: 'degraded',
      max_drift: '200ms',
    },
    topology: {
      source: 'cmdb',
      nodes: [
        { id: 'STATION_A', type: 'station' },
        { id: 'UNIT_1', type: 'energy_storage_unit', parent: 'STATION_A' },
        { id: 'CLUSTER_1', type: 'battery_cluster', parent: 'UNIT_1' },
        { id: 'MODULE_1', type: 'battery_module', parent: 'CLUSTER_1' },
        { id: 'MODULE_2', type: 'battery_module', parent: 'CLUSTER_1' },
        { id: 'MODULE_3', type: 'battery_module', parent: 'CLUSTER_1' },
        { id: 'COOLING_1', type: 'cooling_system', parent: 'CLUSTER_1' },
      ],
      relations: [
        { from: 'MODULE_1', to: 'CLUSTER_1', type: 'child_of' },
        { from: 'MODULE_2', to: 'CLUSTER_1', type: 'child_of' },
        { from: 'MODULE_3', to: 'CLUSTER_1', type: 'child_of' },
        { from: 'COOLING_1', to: 'CLUSTER_1', type: 'child_of' },
      ],
    },
  },
  observations: [
    {
      id: 'cell_temp_max',
      type: 'metric',
      name: '电芯最高温度',
      selector: {
        asset_id: '${asset.id}',
        point_id: 'BMS.CELL.TEMP.MAX',
        point_type: 'analog',
        unit: '℃',
      },
      query: { range: '${window_30m}', step: '10s', aggregation: 'max' },
      quality: { require: ['valid', 'good'] },
    },
    {
      id: 'cell_temp_rise_rate',
      type: 'metric',
      name: '电芯温升速率',
      selector: {
        asset_id: '${asset.id}',
        point_id: 'BMS.CELL.TEMP.RISE_RATE',
        point_type: 'derived',
        unit: '℃/min',
      },
      query: { range: '${window_5m}', aggregation: 'max' },
    },
    {
      id: 'cluster_current',
      type: 'metric',
      name: '簇电流',
      selector: {
        asset_id: '${asset.id}',
        point_id: 'PCS.CLUSTER.CURRENT',
        point_type: 'analog',
        unit: 'A',
      },
      query: { range: '${window_30m}', aggregation: 'avg' },
    },
    {
      id: 'cooling_status',
      type: 'metric',
      name: '冷却系统运行状态',
      selector: {
        asset_id: 'COOLING_1',
        point_id: 'COOLING.STATUS',
        point_type: 'state',
      },
      query: { range: '${window_5m}', latest: true },
    },
    {
      id: 'coolant_flow',
      type: 'metric',
      name: '冷却液流量',
      selector: {
        asset_id: 'COOLING_1',
        point_id: 'COOLING.FLOW',
        point_type: 'analog',
        unit: 'L/min',
      },
      query: { range: '${window_30m}', aggregation: 'avg' },
    },
    {
      id: 'cell_voltage_diff',
      type: 'metric',
      name: '电芯压差',
      selector: {
        asset_id: '${asset.id}',
        point_id: 'BMS.CELL.VOLTAGE.DIFF',
        point_type: 'derived',
        unit: 'mV',
      },
      query: { range: '${window_30m}', aggregation: 'max' },
    },
    {
      id: 'module_temp_abnormal',
      type: 'metric',
      name: '模组温度异常标志',
      selector: {
        asset_id: '${asset.id}',
        point_id: 'BMS.MODULE.TEMP.ABNORMAL',
        point_type: 'state',
      },
      query: { range: '${window_30m}', per_child: true },
    },
    {
      id: 'temp_high_alarm',
      type: 'alarm',
      name: '电芯温度高告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'BMS_CELL_TEMP_HIGH' },
      query: { status: 'active', within: '${window_30m}' },
    },
    {
      id: 'cooling_fault_alarm',
      type: 'alarm',
      name: '冷却系统故障告警',
      selector: { asset_id: 'COOLING_1', alarm_code: 'COOLING_FAULT' },
      query: { status: 'active', within: '${window_30m}' },
    },
    {
      id: 'overcurrent_alarm',
      type: 'alarm',
      name: '过流告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'PCS_OVERCURRENT' },
      query: { status: 'active', within: '${window_30m}' },
    },
    {
      id: 'bms_protection',
      type: 'log',
      name: 'BMS 保护动作',
      selector: {
        asset_id: '${asset.id}',
        event_type: 'protection_action',
        source: 'bms',
      },
      query: { within: '${window_30m}' },
      fields: ['event_id', 'action', 'cell_id', 'occurred_at', 'fault_id'],
    },
    {
      id: 'fire_alarm',
      type: 'log',
      name: '消防告警事件',
      selector: {
        asset_id: '${asset.id}',
        event_type: 'fire_alarm',
        source: 'fire_system',
      },
      query: { within: '${window_30m}' },
      fields: ['event_id', 'zone', 'occurred_at'],
    },
    {
      id: 'temp_threshold',
      type: 'config',
      name: '温度保护定值',
      selector: {
        asset_id: '${asset.id}',
        config_type: 'bms_setting',
        key: 'cell_temp_trip_threshold',
      },
      compare: {
        actual_field: 'value',
        expected_from: 'asset_model',
        tolerance: 0.02,
        changed_within: '${window_30m}',
      },
    },
    {
      id: 'cooling_setting',
      type: 'config',
      name: '冷却参数',
      selector: {
        asset_id: 'COOLING_1',
        config_type: 'cooling_setting',
        key: 'flow_threshold',
      },
      compare: {
        actual_field: 'value',
        expected_from: 'asset_model',
        tolerance: 0.05,
        changed_within: '${window_30m}',
      },
    },
    {
      id: 'cluster_waveform',
      type: 'waveform',
      name: '簇电流录波',
      selector: {
        asset_id: '${asset.id}',
        record_type: 'fault_recording',
        format: 'COMTRADE',
        channels: ['CLUSTER_IA', 'CLUSTER_IB', 'CLUSTER_IC'],
      },
      query: { within: '${window_30m}', triggered_by: 'bms_protection' },
      analyzers: [
        { id: 'rms_current', method: 'rms', channel: 'CLUSTER_IA', window: ['0ms', '100ms'] },
        { id: 'thd_current', method: 'fft', channel: 'CLUSTER_IA', harmonic: 3, window: ['0ms', '200ms'] },
      ],
    },
  ],
  shared_events: [
    {
      id: 'SE_COOLING_FAIL',
      type: 'basic',
      name: '冷却系统失效',
      condition: {
        all: [
          { observation: 'cooling_status', operator: 'eq', value: 'OFF', for: '5m' },
          { observation: 'cooling_fault_alarm', operator: 'active', within: '30m' },
        ],
      },
    },
    {
      id: 'SE_TEMP_HIGH',
      type: 'basic',
      name: '电芯温度高',
      condition: {
        any: [
          { observation: 'cell_temp_max', operator: 'gt', value: 55, for: '5m' },
          { observation: 'temp_high_alarm', operator: 'active', within: '30m' },
        ],
      },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '电池簇过热',
        gate: 'OR',
        children: ['COOLING_CAUSE', 'OVERLOAD_CAUSE', 'INTERNAL_CAUSE', 'FIRE_RISK'],
        output: {
          conclusion: '电池簇过热故障',
          severity: 'critical',
          confidence: { method: 'weighted', threshold: 0.6 },
        },
      },
      {
        id: 'COOLING_CAUSE',
        type: 'intermediate',
        name: '冷却系统原因',
        gate: 'AND',
        children: ['SE_COOLING_FAIL', 'SE_TEMP_HIGH', 'COOLING_SETTING_MISMATCH'],
        weight: 0.9,
      },
      {
        id: 'COOLING_SETTING_MISMATCH',
        type: 'basic',
        name: '冷却参数与模型不一致',
        condition: {
          type: 'config_compare',
          observation: 'cooling_setting',
          operator: 'ne',
          changed_within: '30m',
        },
      },
      {
        id: 'OVERLOAD_CAUSE',
        type: 'intermediate',
        name: '过载原因',
        gate: 'AND',
        children: ['OVERLOAD', 'SE_TEMP_HIGH', 'OVERLOAD_TIMELINE'],
        weight: 0.75,
      },
      {
        id: 'OVERLOAD',
        type: 'basic',
        name: '簇电流过高',
        condition: {
          observation: 'cluster_current',
          operator: 'gt',
          value: 200,
          for: '10m',
        },
      },
      {
        id: 'OVERLOAD_TIMELINE',
        type: 'timeline_ref',
        name: '过载时间序列判定',
        timeline: 'TL_OVERLOAD',
        accept_partial: true,
        min_matched_steps: 2,
      },
      {
        id: 'INTERNAL_CAUSE',
        type: 'intermediate',
        name: '电池内部故障',
        gate: 'AND',
        children: ['CELL_INCONSISTENCY', 'BMS_TRIP', 'WAVEFORM_FAULT', 'TEMP_THRESHOLD_MISMATCH'],
        weight: 1.0,
      },
      {
        id: 'CELL_INCONSISTENCY',
        type: 'basic',
        name: '电芯一致性差',
        condition: {
          observation: 'cell_voltage_diff',
          operator: 'gt',
          value: 100,
          unit: 'mV',
          for: '5m',
        },
      },
      {
        id: 'BMS_TRIP',
        type: 'basic',
        name: 'BMS 保护动作',
        condition: {
          observation: 'bms_protection',
          operator: 'exists',
          within: '30m',
          filter: { action: 'trip' },
        },
      },
      {
        id: 'WAVEFORM_FAULT',
        type: 'basic',
        name: '录波显示异常特征',
        condition: {
          any: [
            { observation: 'cluster_waveform', feature: 'rms_current', operator: 'gt', value: 250 },
            { observation: 'cluster_waveform', feature: 'thd_current', operator: 'gt', value: 0.1 },
          ],
        },
      },
      {
        id: 'TEMP_THRESHOLD_MISMATCH',
        type: 'basic',
        name: '温度保护定值异常',
        condition: {
          type: 'config_compare',
          observation: 'temp_threshold',
          operator: 'ne',
          changed_within: '30m',
        },
      },
      {
        id: 'FIRE_RISK',
        type: 'intermediate',
        name: '火灾风险',
        gate: 'OR',
        children: ['FIRE_ALARM_EVENT', 'TEMP_EXTREME'],
      },
      {
        id: 'FIRE_ALARM_EVENT',
        type: 'basic',
        name: '消防告警',
        condition: {
          observation: 'fire_alarm',
          operator: 'exists',
          within: '30m',
        },
      },
      {
        id: 'TEMP_EXTREME',
        type: 'basic',
        name: '温度极高',
        condition: {
          observation: 'cell_temp_max',
          operator: 'gt',
          value: 70,
          for: '1m',
        },
      },
      {
        id: 'CLUSTER_ABNORMAL_AGG',
        type: 'aggregate',
        name: '多模组温度异常',
        scope: {
          topology: 'parent',
          group_by: 'parent_asset_id',
          include_children: true,
          min_children: 3,
        },
        condition: {
          observation: 'module_temp_abnormal',
          operator: 'abnormal',
          within: '30m',
        },
        aggregation: {
          method: 'weighted_vote',
          count_threshold: 3,
          ratio_threshold: 0.6,
          min_distinct_children: 2,
          weights: { by_severity: true, by_asset_criticality: true },
        },
        on_insufficient: { action: 'degrade_confidence', penalty: 0.2 },
      },
      {
        id: 'EXPERT_RULE_CONSISTENCY',
        type: 'rule',
        name: '多模组温升+压差大',
        language: 'expr',
        expression: `let temp_abnormal = metrics["cell_temp_rise_rate"] > 1.0;\nlet volt_abnormal = metrics["cell_voltage_diff"] > 100;\ntemp_abnormal && volt_abnormal`,
        inputs: [{ observation: 'cell_temp_rise_rate' }, { observation: 'cell_voltage_diff' }],
        confidence: { base: 0.8, max: 0.95 },
      },
      {
        id: 'UNDEVELOPED_1',
        type: 'undeveloped',
        name: '待进一步分析',
        note: '当前无数据支撑，暂不展开',
      },
    ],
  },
  timeline: [
    {
      id: 'TL_OVERLOAD',
      description: '过载时间线',
      correlation_key: 'fault_id',
      clock_sync: {
        required: false,
        source: 'corrected_time',
        max_drift: '200ms',
        quality_min: 'degraded',
      },
      ordering: {
        mode: 'tolerant',
        time_source: 'corrected_time',
        max_skew: '500ms',
        allow_late_arrival: '30s',
        buffer_window: '60s',
      },
      sequence: [
        { event: 'overcurrent_alarm', filter: { action: 'raise' } },
        { event: 'temp_high_alarm', filter: { action: 'raise' }, relation: 'after', within: '5m', tolerance: '1s' },
        { event: 'bms_protection', filter: { action: 'trip' }, relation: 'after', within: '100ms', tolerance: '200ms' },
      ],
      on_violation: { action: 'degrade_confidence', penalty: 0.2 },
      fallback: [{ mode: 'unordered', require_all: true, degrade_confidence: 0.3 }],
    },
  ],
  analysis: {
    qualitative: { mcs: true, mps: true, max_order: 5, output: 'mcs_list' },
    quantitative: {
      method: 'frequency_approx',
      source: 'historical_events',
      window: '${window_90d}',
      min_samples: 10,
    },
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_COOLING',
        when: 'COOLING_CAUSE',
        text: '冷却系统失效导致电池簇过热',
        severity: 'critical',
        recommendations: [
          '立即检查冷却系统运行状态',
          '检查冷却液流量和温度',
          '必要时降低充放电功率',
          '投入备用冷却',
        ],
      },
      {
        id: 'D_OVERLOAD',
        when: 'OVERLOAD_CAUSE',
        text: '过载导致电池簇过热',
        severity: 'high',
        recommendations: ['降低充放电功率', '检查 PCS 输出', '检查负荷曲线'],
      },
      {
        id: 'D_INTERNAL',
        when: 'INTERNAL_CAUSE',
        text: '电池内部故障导致过热',
        severity: 'critical',
        recommendations: [
          '立即停机检查',
          '检查电芯一致性和压差',
          '分析 BMS 保护动作和录波',
          '必要时更换异常模组',
        ],
      },
      {
        id: 'D_FIRE',
        when: 'FIRE_RISK',
        text: '电池簇火灾风险',
        severity: 'critical',
        recommendations: ['立即启动消防预案', '断开簇开关', '疏散人员', '通知消防'],
      },
    ],
    evidence_report: {
      include: [
        'cell_temp_max',
        'cell_temp_rise_rate',
        'cluster_current',
        'cooling_status',
        'coolant_flow',
        'cell_voltage_diff',
        'temp_high_alarm',
        'cooling_fault_alarm',
        'overcurrent_alarm',
        'bms_protection',
        'fire_alarm',
        'temp_threshold',
        'cooling_setting',
        'cluster_waveform',
      ],
      timeline: true,
      quality_report: true,
    },
    mcs_matched: [
      ['SE_COOLING_FAIL', 'SE_TEMP_HIGH', 'COOLING_SETTING_MISMATCH'],
      ['OVERLOAD', 'SE_TEMP_HIGH', 'OVERLOAD_TIMELINE'],
      ['CELL_INCONSISTENCY', 'BMS_TRIP', 'WAVEFORM_FAULT', 'TEMP_THRESHOLD_MISMATCH'],
    ],
  },
  tests: [
    {
      name: '冷却系统失效导致过热',
      given: {
        observations: {
          cooling_status: 'OFF',
          cooling_fault_alarm: 'active',
          cell_temp_max: 60,
          temp_high_alarm: 'active',
        },
      },
      expect: { conclusions: ['D_COOLING'] },
    },
    {
      name: '过载导致过热',
      given: {
        observations: {
          cluster_current: 220,
          temp_high_alarm: 'active',
          overcurrent_alarm: 'active',
        },
      },
      expect: { conclusions: ['D_OVERLOAD'] },
    },
    {
      name: '内部故障导致过热',
      given: {
        observations: {
          cell_voltage_diff: 120,
          bms_protection: { action: 'trip' },
          cluster_waveform: { rms_current: 260 },
          temp_threshold: { mismatch: true },
        },
      },
      expect: { conclusions: ['D_INTERNAL'] },
    },
    {
      name: '火灾风险',
      given: {
        observations: {
          fire_alarm: { zone: 'A' },
          cell_temp_max: 75,
        },
      },
      expect: { conclusions: ['D_FIRE'] },
    },
  ],
};

/**
 * 将完整的 FTA 标准文档实体反向映射注入到 Studio 知识库核心体系中
 */
export function convertFtaToStudioEntities(ftaDoc: FaultTreeDocument): {
  devices: DeviceNode[];
  indicators: MetricIndicator[];
  alarms: AlarmType[];
  parameters: ConfigParameter[];
  eventPatterns: EventSequencePattern[];
  fault: FaultPattern;
  sops: RecoveryProcedure[];
  testCases: FtaTestCase[];
} {
  // 1. Devices from topology
  const devices: DeviceNode[] = (ftaDoc.context?.topology?.nodes || []).map((n) => {
    let category = '电池与BMS';
    let devType = 'battery';
    if (n.type.includes('cooling')) {
      category = '冷却系统';
      devType = 'pump';
    } else if (n.type.includes('station') || n.type.includes('unit')) {
      category = '站级监控';
      devType = 'cabin';
    }

    return {
      id: n.id,
      name:
        n.id === 'STATION_A'
          ? '储能电站 A (STATION_A)'
          : n.id === 'UNIT_1'
          ? '储能单元 1 (UNIT_1)'
          : n.id === 'CLUSTER_1'
          ? '1500V 电池簇 (CLUSTER_1)'
          : n.id === 'COOLING_1'
          ? '液冷温控机组 (COOLING_1)'
          : `电池模组 (${n.id})`,
      category,
      device_type: devType,
      version: 'FTA 标准拓扑节点',
      parent_id: n.parent || null,
      status: 'published',
      updated_at: '2026-10-01 12:00',
      associated_fault_ids: [ftaDoc.metadata.id],
      description: `来自 FTA 拓扑 CMDB 节点，类型: ${n.type}`,
    };
  });

  // 2. Metrics / Indicators
  const indicators: MetricIndicator[] = ftaDoc.observations
    .filter((o) => o.type === 'metric')
    .map((o) => ({
      id: o.id,
      code: o.selector.point_id || o.id,
      name: o.name,
      unit: o.selector.unit || '',
      domain: o.id.includes('cooling') ? '冷却系统' : '储能本体',
      applicable_device_types: ['battery', 'bms', 'cooling_pump'],
      description: `FTA 遥测指标，点位ID: ${o.selector.point_id || o.id}，聚合方式: ${o.query?.aggregation || 'latest'}`,
      normal_range: o.id === 'cell_temp_max' ? '15-45 ℃' : o.id === 'cluster_current' ? '0-180 A' : o.id === 'cell_voltage_diff' ? '< 50 mV' : '正常工况',
      status: 'published',
      updated_at: '2026-10-01 12:00',
      associated_fault_ids: [ftaDoc.metadata.id],
    }));

  // 3. Alarms
  const alarms: AlarmType[] = ftaDoc.observations
    .filter((o) => o.type === 'alarm')
    .map((o) => ({
      id: o.id,
      code: o.selector.alarm_code || o.id,
      name: o.name,
      category: o.id.includes('cooling') ? '温控告警' : '电池告警',
      device_type: o.selector.asset_id === 'COOLING_1' ? 'cooling_pump' : 'battery',
      severity: o.id.includes('fire') ? 'critical' : 'high',
      default_threshold: '激活生效',
      unit: 'FLAG',
      description: `FTA 诊断标准告警项 (${o.selector.alarm_code || o.id})`,
    }));

  // 4. Config Parameters
  const parameters: ConfigParameter[] = ftaDoc.observations
    .filter((o) => o.type === 'config')
    .map((o) => ({
      id: o.id,
      code: o.selector.key || o.id,
      name: o.name,
      domain: o.selector.config_type?.includes('cooling') ? '冷却' : 'BMS',
      applicable_device_types: ['battery', 'cooling_pump'],
      description: `FTA 基线校验配置，键名: ${o.selector.key}，容差: ${((o.compare?.tolerance || 0) * 100)}%`,
      param_type: 'float',
      default_value: o.id === 'temp_threshold' ? 55 : 80,
      associated_fault_ids: [ftaDoc.metadata.id],
      status: 'published',
      updated_at: '2026-10-01 12:00',
    }));

  // 5. Event Logs / Sequences
  const eventPatterns: EventSequencePattern[] = ftaDoc.observations
    .filter((o) => o.type === 'log' || o.type === 'waveform')
    .map((o, idx) => ({
      id: `SEQ-${o.id}`,
      fault_id: ftaDoc.metadata.id,
      fault_name: ftaDoc.metadata.name,
      name: o.name,
      device_type: 'battery',
      log_source: o.selector.source ? `${o.selector.source}.log` : o.selector.format === 'COMTRADE' ? 'comtrade_recording.dat' : 'bms.log',
      time_window: o.query?.within || '30m',
      keywords: o.selector.event_type || o.selector.record_type || o.name,
      stat_type: 'count',
      stat_operator: '>=',
      stat_threshold: 1,
      stat_unit: '次',
      stat_condition: '触发保护或录波越限',
      description: `FTA 观测项: ${o.name}，包含分析器: ${o.analyzers?.map((a) => `${a.channel} ${a.method}`).join(', ') || '标准日志'}`,
    }));

  // 6. SOPs from Diagnosis Conclusions
  const sops: RecoveryProcedure[] = ftaDoc.diagnosis.conclusions.map((c) => ({
    id: `RP-${c.id}`,
    name: `${c.text} 处置预案`,
    associated_fault_ids: [ftaDoc.metadata.id],
    procedures: c.recommendations.map((rec, rIdx) => ({
      id: `STEP-${c.id}-${rIdx + 1}`,
      step_num: rIdx + 1,
      action: rec,
      verification: '确认就地设备与 SCADA 遥信参数恢复正常',
      expected_outcome: '隐患隔离，系统恢复受控安全运行',
      estimated_time: `${(rIdx + 1) * 5}分钟`,
      tool_required: rIdx === 0 ? '手持红外测温仪 / 绝缘手套' : '工控终端',
    })),
    escalation: {
      level: c.severity,
      timeout_minutes: c.severity === 'critical' ? 10 : 30,
      target_role: c.severity === 'critical' ? '电站安全值长 / 应急消防组' : '热控值班工程师',
      auto_actions: c.id === 'D_FIRE' ? ['联动触发喷淋灭火', '切断簇级主接触器'] : ['限制充放电功率至 50%'],
      manual_actions: ['实地排查异常点位', '记录录波与 SOE 日志并向调度报告'],
    },
    status: 'published',
    updated_at: '2026-10-01 12:00',
    safety_warnings: c.id === 'D_FIRE' ? ['注意高压直流电弧防护', '注意佩戴防毒面具防烟雾吸入'] : ['严禁在带载状态下断开高压快插'],
  }));

  // 7. FaultPattern with rich FTA structure
  const fault: FaultPattern = {
    id: ftaDoc.metadata.id,
    name: ftaDoc.metadata.name,
    severity: ftaDoc.metadata.severity,
    root_cause: `### 故障树体系架构\n本故障模式基于 **FTA 工业级故障树** (${ftaDoc.kind} v${ftaDoc.metadata.version}) 严格建模：\n\n- **顶事件 (Top Event)**: 电池簇过热\n- **四大根因分支 (AND/OR 门协同)**:\n  1. **冷却系统失效** (冷却水泵/状态关停 ⋀ 温度高告警 ⋀ 冷却参数不匹配)\n  2. **系统过载** (簇电流 > 200A ⋀ 持续超温 ⋀ 过载时间线严格时序)\n  3. **电池内部故障** (电芯压差超限 ⋀ BMS跳闸 ⋀ 录波特征超标 ⋀ 保护定值异常)\n  4. **火灾风险** (消防告警 ⋁ 温度超 70℃ 极端高温)\n- **最小割集 (MCS)**: 3组关键故障割集自动匹配与证据链闭环`,
    affected_devices: devices.map((d) => d.id),
    symptoms: [
      {
        id: 'SYM-FTA-01',
        type: 'indicator',
        device_type: 'battery',
        device_name: '1500V 电池簇 (CLUSTER_1)',
        metric_name: '电芯最高温度',
        indicator_id: 'cell_temp_max',
        metric_code: 'BMS.CELL.TEMP.MAX',
        trend: 'UP',
        rate: 'RAPID',
        severity_relation: 'OVER_DANGER',
        duration_pattern: 'SUSTAINED',
        volatility: 'STABLE',
        direction: 'up',
        time_window: '0-5min',
        normal_range: '15-45 ℃',
        unit: '℃',
        notes: '顶事件直接关键指标，越限 > 55℃ (一般过热) 或 > 70℃ (极端火险)',
      },
      {
        id: 'SYM-FTA-02',
        type: 'alarm',
        device_type: 'battery',
        device_name: '1500V 电池簇 (CLUSTER_1)',
        metric_name: '电芯温度高告警',
        alarm_id: 'temp_high_alarm',
        alarm_code: 'BMS_CELL_TEMP_HIGH',
        alarm_name: '电芯温度高告警',
        alarm_level: 'high',
        trigger_condition: '连续超出 55℃ 超过 30s',
        time_window: '30m内活跃',
      },
      {
        id: 'SYM-FTA-03',
        type: 'alarm',
        device_type: 'cooling_pump',
        device_name: '液冷温控机组 (COOLING_1)',
        metric_name: '冷却系统故障告警',
        alarm_id: 'cooling_fault_alarm',
        alarm_code: 'COOLING_FAULT',
        alarm_name: '冷却系统故障告警',
        alarm_level: 'critical',
        trigger_condition: '水泵停转或冷媒压力异常跌落',
        time_window: '30m内活跃',
      },
      {
        id: 'SYM-FTA-04',
        type: 'parameter',
        device_type: 'cooling_pump',
        device_name: '液冷温控机组 (COOLING_1)',
        metric_name: '冷却流量定值参数',
        parameter_id: 'cooling_setting',
        parameter_code: 'flow_threshold',
        parameter_name: '冷却参数',
        baseline_value: 80,
        abnormal_value: 50,
        condition_operator: '!=',
        time_window: '最近30m发生变更',
      },
      {
        id: 'SYM-FTA-05',
        type: 'event_sequence',
        device_type: 'battery',
        device_name: '1500V 电池簇 (CLUSTER_1)',
        metric_name: '过载因果时间序 (TL_OVERLOAD)',
        sequence_id: 'TL_OVERLOAD',
        sequence_name: '过载因果时序 (PCS过流 ➔ BMS超温 ➔ 保护跳闸)',
        log_source: 'bms_protection.log',
        time_window: '[-5min, 0min]',
        keywords: 'PCS_OVERCURRENT|BMS_CELL_TEMP_HIGH|TRIP',
        stat_type: 'count',
        stat_condition: '严格满足时钟偏斜容限的时序发生',
      },
      {
        id: 'SYM-FTA-06',
        type: 'event_sequence',
        device_type: 'battery',
        device_name: '1500V 电池簇 (CLUSTER_1)',
        metric_name: '簇电流录波特征 (cluster_waveform)',
        sequence_id: 'cluster_waveform',
        sequence_name: 'COMTRADE 录波异常 (RMS > 250A 或 3次谐波 THD > 0.1)',
        log_source: 'comtrade_recording.dat',
        time_window: '保护动作前后 100ms',
        keywords: 'COMTRADE_TRIGGER_RMS_EXCEED',
        stat_type: 'rate',
        stat_condition: '有效值电流突增 > 250A',
      },
    ],
    propagation_chain: [
      {
        id: 'PROP-FTA-01',
        from: '液冷温控机组 [水泵关停/低流量]',
        to: '1500V 电池簇 [电芯温度飙升]',
        from_device_type: 'cooling_pump',
        from_device_name: '液冷温控机组 (COOLING_1)',
        from_symptom_name: '冷却系统关停 (cooling_status == OFF)',
        to_device_type: 'battery',
        to_device_name: '1500V 电池簇 (CLUSTER_1)',
        to_symptom_name: '电芯最高温度 > 55℃',
        time_window: '0-5min',
        description: '液冷主回路循环动力缺失，换热器冷板传热中断，导致电芯堆积热负荷无法排出',
        probability: 0.95,
      },
      {
        id: 'PROP-FTA-02',
        from: '1500V 电池簇 [持续过载大电流]',
        to: '1500V 电池簇 [电芯温升加速与跳闸]',
        from_device_type: 'battery',
        from_device_name: '1500V 电池簇 (CLUSTER_1)',
        from_symptom_name: '簇电流 > 200A 持续超限',
        to_device_type: 'battery',
        to_device_name: '1500V 电池簇 (CLUSTER_1)',
        to_symptom_name: '触发过温告警并引发 BMS 脱扣',
        time_window: '5-15min',
        description: '高倍率充放电产生剧烈焦耳热，超过设计温升允许斜率，诱发二级过温联锁切除',
        probability: 0.92,
      },
      {
        id: 'PROP-FTA-03',
        from: '电池模组 [电芯压差扩大/内阻不均]',
        to: '1500V 电池簇 [局部热失控火灾风险]',
        from_device_type: 'battery',
        from_device_name: '电池模组 (MODULE_1~3)',
        from_symptom_name: '电芯压差 > 100mV 且录波畸变',
        to_device_type: 'fss',
        to_device_name: '消防系统与电芯极温',
        to_symptom_name: '电芯温度突破 70℃ 触发消防预警',
        time_window: '0-10min',
        description: '单体短路产生局部热点，热蔓延至相邻模组，若达到临界温度可能引发连锁热失控',
        probability: 0.88,
      },
    ],
    canvas_layout: [
      { id: 'node-root', label: '液冷温控机组 [水泵关停/低流量]', type: 'fault', device_type: 'cooling_pump', device_name: '液冷温控机组', symptom_name: '冷却水泵关停 (OFF)', x: 50, y: 120 },
      { id: 'node-2', label: '1500V 电池簇 [电芯温度飙升]', type: 'intermediate', device_type: 'battery', device_name: '1500V 电池簇', symptom_name: '电芯温度突破 55℃', x: 380, y: 80 },
      { id: 'node-3', label: '1500V 电池簇 [电芯温升加速与跳闸]', type: 'intermediate', device_type: 'battery', device_name: '1500V 电池簇', symptom_name: 'BMS 脱扣跳闸 (TRIP)', x: 380, y: 220 },
      { id: 'node-4', label: '1500V 电池簇 [局部热失控火灾风险]', type: 'consequence', device_type: 'battery', device_name: '全站安全与消防', symptom_name: '电池簇极端过热与火险 (D_FIRE)', x: 720, y: 150 },
    ],
    associated_procedure_ids: sops.map((s) => s.id),
    status: 'published',
    review_status: 'ready',
    updated_at: '2026-10-01 12:00',
    author: 'FTA 诊断系统架构师',
    tags: ftaDoc.metadata.tags || ['FTA', '储能', '电池过热'],
  };

  return {
    devices,
    indicators,
    alarms,
    parameters,
    eventPatterns,
    fault,
    sops,
    testCases: ftaDoc.tests || [],
  };
}
