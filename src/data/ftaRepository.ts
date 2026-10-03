// DiagnosGraph Studio - Fault Tree Analysis (FTA) Standard Repository
// Conforming to apiVersion: diag.example.com/v1, kind: FaultTree
// Provides industrial-grade Fault Tree models for all system faults

import { FaultTreeDocument } from '../types/fta';
import { FaultPattern } from '../types';
import {
  BATTERY_CLUSTER_OVERHEAT_FTA_DOC,
  RAW_BATTERY_CLUSTER_OVERHEAT_YAML,
} from './batteryClusterOverheatFta';

// 1. FT-COOL-PUMP-FAILURE (F001: 冷却泵故障与循环动力中断诊断)
export const FTA_DOC_F001: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F001',
    name: '冷却泵故障与循环动力中断诊断',
    version: '1.0.0',
    domain: 'cooling',
    asset_type: 'cooling_pump',
    severity: 'high',
    language: 'zh-CN',
    tags: ['cooling', 'pump', 'hydraulic', 'overheat', 'flow_loss'],
    description: '涵盖水泵电气跳闸、机械轴承卡涩、管路严重堵塞与流量归零的工业级 FTA 故障树模型',
  },
  variables: [
    { name: 'window_2m', type: 'duration', value: '2m' },
    { name: 'window_5m', type: 'duration', value: '5m' },
    { name: 'window_30m', type: 'duration', value: '30m' },
  ],
  context: {
    asset: {
      id: '${asset.id}',
      type: 'cooling_pump',
      topology_ref: '${asset.topology_ref}',
    },
    clock: {
      require_sync: true,
      min_quality: 'good',
      max_drift: '100ms',
    },
    topology: {
      source: 'cmdb',
      nodes: [
        { id: 'COOLING_PUMP_01', type: 'cooling_pump' },
        { id: 'COOLING_PIPE_01', type: 'pipe', parent: 'COOLING_PUMP_01' },
        { id: 'BATTERY_RACK_01', type: 'battery_cluster', parent: 'COOLING_PIPE_01' },
        { id: 'TRANSFORMER_01', type: 'transformer', parent: 'COOLING_PIPE_01' },
      ],
      relations: [
        { from: 'COOLING_PUMP_01', to: 'COOLING_PIPE_01', type: 'supplies_fluid_to' },
        { from: 'COOLING_PIPE_01', to: 'BATTERY_RACK_01', type: 'cools' },
        { from: 'COOLING_PIPE_01', to: 'TRANSFORMER_01', type: 'cools' },
      ],
    },
  },
  observations: [
    {
      id: 'pump_current',
      type: 'metric',
      name: '冷却泵运行相电流',
      selector: {
        asset_id: 'COOLING_PUMP_01',
        point_id: 'TMS.PUMP.CURRENT',
        point_type: 'analog',
        unit: 'A',
      },
      query: { range: '${window_2m}', aggregation: 'avg' },
      quality: { require: ['valid', 'good'] },
    },
    {
      id: 'coolant_flow',
      type: 'metric',
      name: '主管路冷却液流量',
      selector: {
        asset_id: 'COOLING_PIPE_01',
        point_id: 'TMS.FLOW.MAIN',
        point_type: 'analog',
        unit: 'L/min',
      },
      query: { range: '${window_5m}', aggregation: 'avg' },
      quality: { require: ['valid', 'good'] },
    },
    {
      id: 'pump_outlet_pressure',
      type: 'metric',
      name: '水泵出口压力',
      selector: {
        asset_id: 'COOLING_PUMP_01',
        point_id: 'TMS.PUMP.PRESSURE.OUTLET',
        point_type: 'analog',
        unit: 'MPa',
      },
      query: { range: '${window_5m}', aggregation: 'avg' },
    },
    {
      id: 'cell_temp_max',
      type: 'metric',
      name: '电芯最高温度',
      selector: {
        asset_id: 'BATTERY_RACK_01',
        point_id: 'BMS.CELL.TEMP.MAX',
        point_type: 'analog',
        unit: '℃',
      },
      query: { range: '${window_30m}', aggregation: 'max' },
    },
    {
      id: 'pump_trip_alarm',
      type: 'alarm',
      name: '水泵断路器跳闸报警',
      selector: {
        asset_id: 'COOLING_PUMP_01',
        alarm_code: 'TMS_PUMP_TRIP',
      },
      query: { status: 'active', within: '${window_5m}' },
    },
    {
      id: 'flow_low_alarm',
      type: 'alarm',
      name: '冷却液流速过低报警',
      selector: {
        asset_id: 'COOLING_PIPE_01',
        alarm_code: 'TMS_FLOW_LOW',
      },
      query: { status: 'active', within: '${window_5m}' },
    },
    {
      id: 'temp_high_alarm',
      type: 'alarm',
      name: '电芯过温高限报警',
      selector: {
        asset_id: 'BATTERY_RACK_01',
        alarm_code: 'BMS_CELL_TEMP_HIGH',
      },
      query: { status: 'active', within: '${window_30m}' },
    },
    {
      id: 'pump_breaker_log',
      type: 'log',
      name: '断路器脱扣 SOE 记录',
      selector: {
        asset_id: 'COOLING_PUMP_01',
        event_type: 'breaker_trip',
        source: 'ups_cabinet',
      },
      query: { within: '${window_5m}' },
      fields: ['event_id', 'relay_id', 'trip_reason', 'occurred_at'],
    },
    {
      id: 'pump_flow_setting',
      type: 'config',
      name: '最低流速安全保护定值',
      selector: {
        asset_id: 'COOLING_PIPE_01',
        config_type: 'tms_setting',
        key: 'min_flow_threshold',
      },
      compare: {
        actual_field: 'value',
        expected_from: 'asset_model',
        tolerance: 0.05,
      },
    },
    {
      id: 'pump_vibration_waveform',
      type: 'waveform',
      name: '水泵轴承高频振动录波',
      selector: {
        asset_id: 'COOLING_PUMP_01',
        record_type: 'vibration_recording',
        format: 'COMTRADE',
        channels: ['PUMP_VIB_X', 'PUMP_VIB_Y', 'PUMP_VIB_Z'],
      },
      analyzers: [
        { id: 'vib_rms', method: 'rms', channel: 'PUMP_VIB_X' },
        { id: 'vib_fft', method: 'fft', channel: 'PUMP_VIB_X', harmonic: 2 },
      ],
    },
  ],
  shared_events: [
    {
      id: 'SE_FLOW_COLLAPSE',
      type: 'basic',
      name: '主管路流量归零中断',
      condition: {
        all: [
          { observation: 'coolant_flow', operator: 'lt', value: 30, for: '2m' },
          { observation: 'flow_low_alarm', operator: 'active', within: '5m' },
        ],
      },
    },
    {
      id: 'SE_THERMAL_ACCUMULATION',
      type: 'basic',
      name: '下游电芯热负荷剧烈积聚',
      condition: {
        any: [
          { observation: 'cell_temp_max', operator: 'gt', value: 45, for: '5m' },
          { observation: 'temp_high_alarm', operator: 'active', within: '15m' },
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
        name: '冷却系统动力中断导致电芯超温',
        gate: 'OR',
        children: ['ELECTRICAL_TRIP_CAUSE', 'MECHANICAL_SEIZE_CAUSE', 'PIPE_LEAK_CAUSE'],
        output: {
          conclusion: '冷却泵停运导致换热阻断故障',
          severity: 'high',
          confidence: { method: 'weighted', threshold: 0.7 },
        },
      },
      {
        id: 'ELECTRICAL_TRIP_CAUSE',
        type: 'intermediate',
        name: '供电回路失电或跳闸',
        gate: 'AND',
        children: ['PUMP_CURRENT_ZERO', 'PUMP_BREAKER_SOE', 'SE_FLOW_COLLAPSE', 'SE_THERMAL_ACCUMULATION'],
        weight: 0.95,
      },
      {
        id: 'PUMP_CURRENT_ZERO',
        type: 'basic',
        name: '电机相电流骤降归零',
        condition: {
          observation: 'pump_current',
          operator: 'lt',
          value: 0.5,
          for: '30s',
        },
      },
      {
        id: 'PUMP_BREAKER_SOE',
        type: 'basic',
        name: '断路器保护脱扣动作',
        condition: {
          observation: 'pump_breaker_log',
          operator: 'exists',
          within: '5m',
        },
      },
      {
        id: 'MECHANICAL_SEIZE_CAUSE',
        type: 'intermediate',
        name: '水泵机械转轴堵转卡死',
        gate: 'AND',
        children: ['PUMP_LOCKED_CURRENT', 'VIBRATION_ANOMALY', 'SE_FLOW_COLLAPSE'],
        weight: 0.88,
      },
      {
        id: 'PUMP_LOCKED_CURRENT',
        type: 'basic',
        name: '电机堵转超大过电流',
        condition: {
          observation: 'pump_current',
          operator: 'gt',
          value: 20,
          for: '10s',
        },
      },
      {
        id: 'VIBRATION_ANOMALY',
        type: 'basic',
        name: '轴承振动频谱谐波超标',
        condition: {
          observation: 'pump_vibration_waveform',
          feature: 'vib_rms',
          operator: 'gt',
          value: 4.5,
        },
      },
      {
        id: 'PIPE_LEAK_CAUSE',
        type: 'intermediate',
        name: '管网失压与破损泄漏',
        gate: 'AND',
        children: ['PRESSURE_COLLAPSE', 'SE_FLOW_COLLAPSE', 'FLOW_SETTING_MISMATCH'],
        weight: 0.75,
      },
      {
        id: 'PRESSURE_COLLAPSE',
        type: 'basic',
        name: '泵出口静压归零跌落',
        condition: {
          observation: 'pump_outlet_pressure',
          operator: 'lt',
          value: 0.05,
          for: '1m',
        },
      },
      {
        id: 'FLOW_SETTING_MISMATCH',
        type: 'basic',
        name: '流量保护定值参数校验偏差',
        condition: {
          type: 'config_compare',
          observation: 'pump_flow_setting',
          operator: 'ne',
        },
      },
    ],
  },
  timeline: [
    {
      id: 'TL_PUMP_STOP',
      description: '水泵停转因果时序：断路器跳闸 ➔ 流量归零 ➔ 电芯温升 ➔ 二级跳闸',
      sequence: [
        { event: 'pump_breaker_log', within: '5s' },
        { event: 'coolant_flow', relation: 'after', within: '30s' },
        { event: 'cell_temp_max', relation: 'after', within: '10m' },
      ],
      on_violation: { action: 'degrade_confidence', penalty: 0.15 },
    },
  ],
  analysis: {
    qualitative: { mcs: true, mps: true, max_order: 4, output: 'mcs_list' },
    quantitative: { method: 'frequency_approx', source: 'historical_events', window: '${window_30m}', min_samples: 5 },
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_PUMP_ELECTRICAL',
        when: 'ELECTRICAL_TRIP_CAUSE',
        text: '冷却泵断路器电气跳闸导致换热中断',
        severity: 'high',
        recommendations: [
          '立即检查配电柜 QF-03 开关及控制电源',
          '投入备用冷却循环泵（主备切换）',
          '若无备用泵，下发限功率 50% 运行指令',
          '实测电机绝缘电阻与接地阻抗',
        ],
      },
      {
        id: 'D_PUMP_MECHANICAL',
        when: 'MECHANICAL_SEIZE_CAUSE',
        text: '冷却泵转轴机械卡死或轴承损坏',
        severity: 'high',
        recommendations: [
          '切断水泵电源并锁定挂牌',
          '现场手动盘车检查转子阻力',
          '检查轴承润滑油质及密封端面渗漏',
        ],
      },
      {
        id: 'D_PIPE_LEAK',
        when: 'PIPE_LEAK_CAUSE',
        text: '闭式冷却管路严重失压或泄漏',
        severity: 'critical',
        recommendations: [
          '停运循环回路切断补水阀',
          '检查集装箱底板及快换接头有无渗液',
          '执行管路气密性打压试漏',
        ],
      },
    ],
    evidence_report: {
      include: ['pump_current', 'coolant_flow', 'pump_outlet_pressure', 'pump_trip_alarm', 'flow_low_alarm', 'cell_temp_max'],
      timeline: true,
      quality_report: true,
    },
    mcs_matched: [
      ['PUMP_CURRENT_ZERO', 'PUMP_BREAKER_SOE', 'SE_FLOW_COLLAPSE'],
      ['PUMP_LOCKED_CURRENT', 'VIBRATION_ANOMALY', 'SE_FLOW_COLLAPSE'],
      ['PRESSURE_COLLAPSE', 'SE_FLOW_COLLAPSE'],
    ],
  },
  tests: [
    {
      name: '断路器跳闸致泵停运',
      given: {
        observations: {
          pump_current: 0,
          coolant_flow: 10,
          pump_breaker_log: { trip_reason: 'overcurrent_trip' },
          flow_low_alarm: 'active',
          cell_temp_max: 48,
          temp_high_alarm: 'active',
        },
      },
      expect: {
        conclusions: ['D_PUMP_ELECTRICAL'],
      },
    },
    {
      name: '水泵机械堵转振动异常',
      given: {
        observations: {
          pump_current: 24,
          coolant_flow: 5,
          pump_vibration_waveform: { vib_rms: 6.2 },
          flow_low_alarm: 'active',
        },
      },
      expect: {
        conclusions: ['D_PUMP_MECHANICAL'],
      },
    },
  ],
};

// 2. FT-PCS-IGBT-OVERHEAT (F002: PCS 功率模块过热与风道堵塞诊断)
export const FTA_DOC_F002: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F002',
    name: 'PCS 功率模块过热与散热受阻诊断',
    version: '1.0.0',
    domain: 'pcs',
    asset_type: 'pcs',
    severity: 'critical',
    language: 'zh-CN',
    tags: ['pcs', 'igbt', 'overheat', 'fan', 'derate'],
    description: '涵盖 IGBT 芯片结温飙升、散热风机停转、滤网积尘及大功率过载的 FTA 故障树诊断模型',
  },
  variables: [
    { name: 'window_2m', type: 'duration', value: '2m' },
    { name: 'window_10m', type: 'duration', value: '10m' },
  ],
  context: {
    asset: { id: '${asset.id}', type: 'pcs', topology_ref: '${asset.topology_ref}' },
    clock: { require_sync: true, min_quality: 'good', max_drift: '50ms' },
    topology: {
      source: 'cmdb',
      nodes: [
        { id: 'PCS_CABINET_01', type: 'pcs' },
        { id: 'IGBT_BRIDGE_01', type: 'igbt', parent: 'PCS_CABINET_01' },
        { id: 'COOLING_FAN_01', type: 'fan', parent: 'PCS_CABINET_01' },
      ],
    },
  },
  observations: [
    {
      id: 'igbt_temp',
      type: 'metric',
      name: 'IGBT 桥臂芯片结温',
      selector: { asset_id: 'IGBT_BRIDGE_01', point_id: 'PCS.IGBT.TEMP.JUNCTION', point_type: 'analog', unit: '℃' },
      query: { range: '${window_2m}', aggregation: 'max' },
    },
    {
      id: 'fan_speed',
      type: 'metric',
      name: 'PCS 散热离心风机转速',
      selector: { asset_id: 'COOLING_FAN_01', point_id: 'PCS.FAN.SPEED', point_type: 'analog', unit: 'RPM' },
      query: { range: '${window_2m}', aggregation: 'avg' },
    },
    {
      id: 'pcs_current',
      type: 'metric',
      name: 'PCS 交流侧有效值相电流',
      selector: { asset_id: 'PCS_CABINET_01', point_id: 'PCS.AC.CURRENT', point_type: 'analog', unit: 'A' },
      query: { range: '${window_10m}', aggregation: 'avg' },
    },
    {
      id: 'igbt_temp_high_alarm',
      type: 'alarm',
      name: 'IGBT 结温超限一阶预警',
      selector: { asset_id: 'IGBT_BRIDGE_01', alarm_code: 'PCS_IGBT_TEMP_HIGH' },
      query: { status: 'active', within: '${window_10m}' },
    },
    {
      id: 'pcs_trip_alarm',
      type: 'alarm',
      name: 'PCS 封锁脉冲停机故障告警',
      selector: { asset_id: 'PCS_CABINET_01', alarm_code: 'PCS_FAULT_TRIP' },
      query: { status: 'active', within: '${window_10m}' },
    },
    {
      id: 'pwm_waveform',
      type: 'waveform',
      name: 'IGBT 门极驱动 PWM 波形',
      selector: { asset_id: 'IGBT_BRIDGE_01', record_type: 'pwm_drive_recording', format: 'COMTRADE', channels: ['VGE_U', 'VGE_V', 'VGE_W'] },
      analyzers: [{ id: 'dead_time_error', method: 'rms', channel: 'VGE_U' }],
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: 'PCS 功率模块过热停机',
        gate: 'OR',
        children: ['FAN_FAILURE_CAUSE', 'EXTREME_OVERLOAD_CAUSE', 'GATE_DRIVE_CAUSE'],
        output: { conclusion: 'PCS 功率器件严重过热', severity: 'critical', confidence: { method: 'weighted', threshold: 0.75 } },
      },
      {
        id: 'FAN_FAILURE_CAUSE',
        type: 'intermediate',
        name: '散热风机停转或风道堵塞',
        gate: 'AND',
        children: ['FAN_SPEED_LOW', 'IGBT_TEMP_HIGH'],
        weight: 0.9,
      },
      {
        id: 'FAN_SPEED_LOW',
        type: 'basic',
        name: '离心风机转速骤跌',
        condition: { observation: 'fan_speed', operator: 'lt', value: 800, for: '1m' },
      },
      {
        id: 'IGBT_TEMP_HIGH',
        type: 'basic',
        name: 'IGBT 结温突破警戒线',
        condition: { observation: 'igbt_temp', operator: 'gt', value: 95, for: '30s' },
      },
      {
        id: 'EXTREME_OVERLOAD_CAUSE',
        type: 'intermediate',
        name: '高倍率连续满载电流过载',
        gate: 'AND',
        children: ['PCS_AC_OVERCURRENT', 'IGBT_TEMP_HIGH'],
        weight: 0.85,
      },
      {
        id: 'PCS_AC_OVERCURRENT',
        type: 'basic',
        name: '交流电流持续超额定 120%',
        condition: { observation: 'pcs_current', operator: 'gt', value: 1100, for: '5m' },
      },
      {
        id: 'GATE_DRIVE_CAUSE',
        type: 'intermediate',
        name: '门极驱动死区畸变直通发热',
        gate: 'AND',
        children: ['PWM_DEADTIME_FAULT', 'IGBT_TEMP_HIGH'],
        weight: 0.92,
      },
      {
        id: 'PWM_DEADTIME_FAULT',
        type: 'basic',
        name: 'PWM 门极死区波形异常',
        condition: { observation: 'pwm_waveform', feature: 'dead_time_error', operator: 'gt', value: 1.2 },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_FAN_FAILURE',
        when: 'FAN_FAILURE_CAUSE',
        text: 'PCS 风机故障或进风滤网积尘堵塞导致过热',
        severity: 'critical',
        recommendations: [
          '立即检查离心风机供电断路器及接触器',
          '清理并更换进风侧粗效过滤网',
          '限制变流器运行功率至 30% 额定',
        ],
      },
      {
        id: 'D_PCS_OVERLOAD',
        when: 'EXTREME_OVERLOAD_CAUSE',
        text: '大功率充放电持续超载导致热过载',
        severity: 'high',
        recommendations: [
          '下发 AGC/AVC 调度限额调节指令',
          '核查电网调度功率因数与无功出力',
        ],
      },
    ],
    evidence_report: { include: ['igbt_temp', 'fan_speed', 'pcs_current', 'igbt_temp_high_alarm'], timeline: true },
    mcs_matched: [['FAN_SPEED_LOW', 'IGBT_TEMP_HIGH'], ['PCS_AC_OVERCURRENT', 'IGBT_TEMP_HIGH']],
  },
  tests: [
    {
      name: '风机低转速引发结温过高',
      given: { observations: { fan_speed: 300, igbt_temp: 108, igbt_temp_high_alarm: 'active' } },
      expect: { conclusions: ['D_FAN_FAILURE'] },
    },
  ],
};

// 3. FT-CELL-VOLTAGE-IMBALANCE (F003: 电池模组单体压差异常与内阻不均诊断)
export const FTA_DOC_F003: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F003',
    name: '电池模组单体压差异常与内阻不均诊断',
    version: '1.0.0',
    domain: 'energy_storage',
    asset_type: 'battery_cluster',
    severity: 'medium',
    language: 'zh-CN',
    tags: ['battery', 'imbalance', 'voltage_diff', 'bms', 'capacity'],
    description: '涵盖电芯微短路、螺栓接触电阻增大与 BMS 采样回路漂移的 FTA 故障树模型',
  },
  variables: [{ name: 'window_30m', type: 'duration', value: '30m' }],
  observations: [
    {
      id: 'cell_voltage_diff',
      type: 'metric',
      name: '电芯最大端电压压差',
      selector: { asset_id: '${asset.id}', point_id: 'BMS.CELL.VOLTAGE.DIFF', point_type: 'derived', unit: 'mV' },
      query: { range: '${window_30m}', aggregation: 'max' },
    },
    {
      id: 'cell_soc_variance',
      type: 'metric',
      name: '模组内各电芯 SOC 极差',
      selector: { asset_id: '${asset.id}', point_id: 'BMS.CELL.SOC.VARIANCE', point_type: 'derived', unit: '%' },
      query: { range: '${window_30m}', aggregation: 'max' },
    },
    {
      id: 'imbalance_alarm',
      type: 'alarm',
      name: '单体压差越限报警',
      selector: { asset_id: '${asset.id}', alarm_code: 'BMS_VOLTAGE_DIFF_HIGH' },
      query: { status: 'active', within: '${window_30m}' },
    },
    {
      id: 'bms_balance_log',
      type: 'log',
      name: '被动均衡回路动作日志',
      selector: { asset_id: '${asset.id}', event_type: 'passive_balance_active', source: 'bms_slave' },
      query: { within: '${window_30m}' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '电池模组单体压差严重失衡',
        gate: 'OR',
        children: ['MICRO_SHORT_CAUSE', 'CONTACT_RESISTANCE_CAUSE'],
        output: { conclusion: '电芯一致性严重劣化', severity: 'medium', confidence: { method: 'weighted', threshold: 0.7 } },
      },
      {
        id: 'MICRO_SHORT_CAUSE',
        type: 'intermediate',
        name: '单体电芯自放电微短路',
        gate: 'AND',
        children: ['VOLTAGE_DIFF_EXCEED', 'SOC_VARIANCE_EXCEED'],
        weight: 0.9,
      },
      {
        id: 'VOLTAGE_DIFF_EXCEED',
        type: 'basic',
        name: '端电压差超出 80mV',
        condition: { observation: 'cell_voltage_diff', operator: 'gt', value: 80, for: '10m' },
      },
      {
        id: 'SOC_VARIANCE_EXCEED',
        type: 'basic',
        name: 'SOC 估计极差大于 6%',
        condition: { observation: 'cell_soc_variance', operator: 'gt', value: 6, for: '10m' },
      },
      {
        id: 'CONTACT_RESISTANCE_CAUSE',
        type: 'intermediate',
        name: '汇流铜排与极柱螺栓接触电阻增大',
        gate: 'AND',
        children: ['VOLTAGE_DIFF_EXCEED', 'IMBALANCE_ALARM_EVT'],
        weight: 0.82,
      },
      {
        id: 'IMBALANCE_ALARM_EVT',
        type: 'basic',
        name: 'BMS 触发压差越限报警',
        condition: { observation: 'imbalance_alarm', operator: 'active', within: '30m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_MICRO_SHORT',
        when: 'MICRO_SHORT_CAUSE',
        text: '单体电芯内部自放电偏大或轻微微短路',
        severity: 'medium',
        recommendations: [
          '静置 2 小时测量开路电压 (OCV) 变化曲线',
          '启动夜间深度被动均衡维护',
          '若压差持续扩大，标记电芯并在检修窗口更换 Pack',
        ],
      },
    ],
    evidence_report: { include: ['cell_voltage_diff', 'cell_soc_variance', 'imbalance_alarm'], timeline: true },
    mcs_matched: [['VOLTAGE_DIFF_EXCEED', 'SOC_VARIANCE_EXCEED']],
  },
  tests: [
    {
      name: '充放电末期压差超标',
      given: { observations: { cell_voltage_diff: 95, cell_soc_variance: 7.5, imbalance_alarm: 'active' } },
      expect: { conclusions: ['D_MICRO_SHORT'] },
    },
  ],
};

// 4. FT-DC-INSULATION-FAULT (F004: 直流绝缘阻抗下降诊断)
export const FTA_DOC_F004: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F004',
    name: '1500V 直流侧绝缘阻抗下降与接地故障诊断',
    version: '1.0.0',
    domain: 'electrical',
    asset_type: 'hv_box',
    severity: 'critical',
    language: 'zh-CN',
    tags: ['insulation', 'dc', 'ground_fault', 'safety', 'high_voltage'],
    description: '涵盖直流正负母线对地阻抗降低、凝露漏电及防雷器击穿的 FTA 故障树诊断模型',
  },
  observations: [
    {
      id: 'insulation_resistance',
      type: 'metric',
      name: '直流母线对地绝缘电阻',
      selector: { asset_id: '${asset.id}', point_id: 'BMS.INSULATION.RESISTANCE', point_type: 'analog', unit: 'kΩ' },
      query: { range: '5m', aggregation: 'min' },
    },
    {
      id: 'insulation_low_alarm',
      type: 'alarm',
      name: '直流母线绝缘低告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'BMS_INSULATION_LOW' },
      query: { status: 'active', within: '5m' },
    },
    {
      id: 'cabin_humidity',
      type: 'metric',
      name: '电池舱相对湿度',
      selector: { asset_id: 'DEV-CABIN-40FT', point_id: 'CABIN.HUMIDITY', point_type: 'analog', unit: '%RH' },
      query: { range: '30m', aggregation: 'avg' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '直流侧高压绝缘阻抗跌落至危险区',
        gate: 'OR',
        children: ['INSULATION_DEGRADE_CAUSE', 'CONDENSATION_LEAK_CAUSE'],
        output: { conclusion: '直流高压系统接地绝缘故障', severity: 'critical', confidence: { method: 'weighted', threshold: 0.8 } },
      },
      {
        id: 'INSULATION_DEGRADE_CAUSE',
        type: 'intermediate',
        name: '母线绝缘破损或电缆老化击穿',
        gate: 'AND',
        children: ['RESISTANCE_DROP', 'INSULATION_ALARM_EVT'],
        weight: 0.95,
      },
      {
        id: 'RESISTANCE_DROP',
        type: 'basic',
        name: '绝缘阻抗低于 100kΩ',
        condition: { observation: 'insulation_resistance', operator: 'lt', value: 100, for: '1m' },
      },
      {
        id: 'INSULATION_ALARM_EVT',
        type: 'basic',
        name: 'BMS 绝缘监测仪跳闸预警',
        condition: { observation: 'insulation_low_alarm', operator: 'active', within: '5m' },
      },
      {
        id: 'CONDENSATION_LEAK_CAUSE',
        type: 'intermediate',
        name: '舱内凝露导致爬电漏电',
        gate: 'AND',
        children: ['RESISTANCE_DROP', 'HIGH_HUMIDITY'],
        weight: 0.8,
      },
      {
        id: 'HIGH_HUMIDITY',
        type: 'basic',
        name: '相对湿度超过 85%',
        condition: { observation: 'cabin_humidity', operator: 'gt', value: 85, for: '15m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_INSULATION_LOW',
        when: 'INSULATION_DEGRADE_CAUSE',
        text: '直流侧电缆或高压箱内部绝缘破损接地',
        severity: 'critical',
        recommendations: [
          '立即断开直流簇级断路器，闭锁 PCS 启动',
          '使用 2500V 摇表对正负极母线分别摇测对地绝缘',
          '排查高压穿墙套管与连接器有无电弧烧蚀碳化',
        ],
      },
    ],
    evidence_report: { include: ['insulation_resistance', 'insulation_low_alarm'], timeline: true },
    mcs_matched: [['RESISTANCE_DROP', 'INSULATION_ALARM_EVT']],
  },
  tests: [
    {
      name: '绝缘电阻突降触发停机',
      given: { observations: { insulation_resistance: 45, insulation_low_alarm: 'active' } },
      expect: { conclusions: ['D_INSULATION_LOW'] },
    },
  ],
};

// 5. FT-BMS-COMM-LOSS (F005: BMS 通信总线丢包与 CAN 控制失步诊断)
export const FTA_DOC_F005: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F005',
    name: 'BMS 通信总线丢包与控制失步诊断',
    version: '1.0.0',
    domain: 'communication',
    asset_type: 'bms',
    severity: 'high',
    language: 'zh-CN',
    tags: ['bms', 'can_bus', 'packet_loss', 'comm_timeout', 'control'],
    description: '涵盖 CAN 总线丢包率过高、CRC 校验突增、通信心跳超时与从控离线的 FTA 故障树诊断模型',
  },
  variables: [
    { name: 'window_2m', type: 'duration', value: '2m' },
    { name: 'window_10m', type: 'duration', value: '10m' },
  ],
  observations: [
    {
      id: 'can_packet_loss',
      type: 'metric',
      name: 'CAN 报文通信丢包率',
      selector: { asset_id: '${asset.id}', point_id: 'BMS.CAN.PACKET_LOSS_RATE', point_type: 'derived', unit: '%' },
      query: { range: '${window_2m}', aggregation: 'avg' },
    },
    {
      id: 'can_crc_errors',
      type: 'metric',
      name: 'CAN 总线 CRC 校验错误率',
      selector: { asset_id: '${asset.id}', point_id: 'BMS.CAN.CRC_ERRORS', point_type: 'analog', unit: '次/min' },
      query: { range: '${window_2m}', aggregation: 'avg' },
    },
    {
      id: 'bms_comm_alarm',
      type: 'alarm',
      name: 'BMS 主从通信中断告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'BMS_COMM_TIMEOUT' },
      query: { status: 'active', within: '${window_10m}' },
    },
    {
      id: 'bms_comm_log',
      type: 'log',
      name: 'CAN 控制器总线关闭 (Bus-Off) 记录',
      selector: { asset_id: '${asset.id}', event_type: 'can_controller_busoff', source: 'bms_master' },
      query: { within: '${window_10m}' },
      fields: ['event_id', 'occurred_at', 'error_counter'],
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: 'BMS 通信总线阻断导致整簇失控',
        gate: 'OR',
        children: ['CAN_PHY_COLLAPSE_CAUSE', 'BMU_HEARTBEAT_LOSS_CAUSE'],
        output: { conclusion: 'BMS 总线通信异常降额保底', severity: 'high', confidence: { method: 'weighted', threshold: 0.8 } },
      },
      {
        id: 'CAN_PHY_COLLAPSE_CAUSE',
        type: 'intermediate',
        name: 'CAN 物理层抗干扰失效或阻抗失配',
        gate: 'AND',
        children: ['PACKET_LOSS_EXCEED', 'CRC_ERROR_BURST'],
        weight: 0.95,
      },
      {
        id: 'PACKET_LOSS_EXCEED',
        type: 'basic',
        name: '报文丢包率突破 5%',
        condition: { observation: 'can_packet_loss', operator: 'gt', value: 5, for: '1m' },
      },
      {
        id: 'CRC_ERROR_BURST',
        type: 'basic',
        name: 'CRC 错误激增 > 20次/min',
        condition: { observation: 'can_crc_errors', operator: 'gt', value: 20, for: '1m' },
      },
      {
        id: 'BMU_HEARTBEAT_LOSS_CAUSE',
        type: 'intermediate',
        name: '从控从板失电或总线掉线',
        gate: 'AND',
        children: ['COMM_ALARM_EVT', 'PACKET_LOSS_EXCEED'],
        weight: 0.9,
      },
      {
        id: 'COMM_ALARM_EVT',
        type: 'basic',
        name: '主控触发通信中断超时告警',
        condition: { observation: 'bms_comm_alarm', operator: 'active', within: '5m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_CAN_BUS_COLLAPSE',
        when: 'CAN_PHY_COLLAPSE_CAUSE',
        text: 'CAN 通信物理层受到电磁强干扰或终端电阻脱焊',
        severity: 'high',
        recommendations: [
          '测量 CANH-CANL 间端接电阻是否为标准 60Ω',
          '检查双绞屏蔽层单端接地良好性，避免高频电磁串扰',
          '将整簇充放电功率降额至 30% 保底运行',
        ],
      },
      {
        id: 'D_BMU_TIMEOUT',
        when: 'BMU_HEARTBEAT_LOSS_CAUSE',
        text: '电池从控板 (BMU) 心跳帧丢失导致监控中断',
        severity: 'high',
        recommendations: [
          '检查 BMU 供电保险丝与 DC/DC 隔离电源',
          '通过诊断上位机重启从控单元通讯栈',
        ],
      },
    ],
    evidence_report: { include: ['can_packet_loss', 'can_crc_errors', 'bms_comm_alarm'], timeline: true },
    mcs_matched: [['PACKET_LOSS_EXCEED', 'CRC_ERROR_BURST'], ['COMM_ALARM_EVT', 'PACKET_LOSS_EXCEED']],
  },
  tests: [
    {
      name: '通信丢包激增触发保护',
      given: { observations: { can_packet_loss: 8.5, can_crc_errors: 35, bms_comm_alarm: 'active' } },
      expect: { conclusions: ['D_CAN_BUS_COLLAPSE'] },
    },
  ],
};

// 6. FT-DC-CONTACTOR-WELD (F006: 直流接触器粘连故障诊断)
export const FTA_DOC_F006: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F006',
    name: '直流主接触器触点粘连与拒动诊断',
    version: '1.0.0',
    domain: 'electrical',
    asset_type: 'hv_box',
    severity: 'critical',
    language: 'zh-CN',
    tags: ['contactor', 'weld', 'dc_switch', 'safety', 'hv_box'],
    description: '涵盖直流高压接触器拉弧熔焊、辅助触点状态冲突及分闸指令拒动的 FTA 故障树诊断模型',
  },
  variables: [{ name: 'window_5m', type: 'duration', value: '5m' }],
  observations: [
    {
      id: 'contactor_aux_status',
      type: 'metric',
      name: '接触器辅助触点分合状态',
      selector: { asset_id: '${asset.id}', point_id: 'HV.CONTACTOR.AUX_STATE', point_type: 'state' },
      query: { range: '1m', latest: true },
    },
    {
      id: 'dc_bus_voltage',
      type: 'metric',
      name: '接触器负载侧母线残压',
      selector: { asset_id: '${asset.id}', point_id: 'HV.BUS.VOLTAGE.LOAD', point_type: 'analog', unit: 'V' },
      query: { range: '2m', aggregation: 'avg' },
    },
    {
      id: 'contactor_weld_alarm',
      type: 'alarm',
      name: '接触器分闸粘连严重告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'HV_CONTACTOR_WELD' },
      query: { status: 'active', within: '5m' },
    },
    {
      id: 'trip_cmd_log',
      type: 'log',
      name: 'BMS 下发断开接触器命令日志',
      selector: { asset_id: '${asset.id}', event_type: 'trip_cmd_issued', source: 'bms_master' },
      query: { within: '5m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '直流高压主接触器触点严重粘连',
        gate: 'OR',
        children: ['CONTACT_WELD_CAUSE', 'AUX_FEEDBACK_FAULT_CAUSE'],
        output: { conclusion: '直流接触器触点熔焊粘连', severity: 'critical', confidence: { method: 'weighted', threshold: 0.9 } },
      },
      {
        id: 'CONTACT_WELD_CAUSE',
        type: 'intermediate',
        name: '带载切断产生大电弧导致触点熔焊',
        gate: 'AND',
        children: ['TRIP_CMD_ACTIVE', 'VOLTAGE_REMAINS_HIGH', 'WELD_ALARM_ACTIVE'],
        weight: 0.98,
      },
      {
        id: 'TRIP_CMD_ACTIVE',
        type: 'basic',
        name: '分闸控制命令已下发',
        condition: { observation: 'trip_cmd_log', operator: 'exists', within: '5m' },
      },
      {
        id: 'VOLTAGE_REMAINS_HIGH',
        type: 'basic',
        name: '负载侧残压仍 > 200V (未泄放)',
        condition: { observation: 'dc_bus_voltage', operator: 'gt', value: 200, for: '10s' },
      },
      {
        id: 'WELD_ALARM_ACTIVE',
        type: 'basic',
        name: '粘连检测逻辑触发报警',
        condition: { observation: 'contactor_weld_alarm', operator: 'active', within: '5m' },
      },
      {
        id: 'AUX_FEEDBACK_FAULT_CAUSE',
        type: 'intermediate',
        name: '辅助触点卡滞与主触点状态不一致',
        gate: 'AND',
        children: ['WELD_ALARM_ACTIVE', 'TRIP_CMD_ACTIVE'],
        weight: 0.85,
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_CONTACTOR_WELD',
        when: 'CONTACT_WELD_CAUSE',
        text: '直流主接触器动静触点发生严重金属熔焊粘连',
        severity: 'critical',
        recommendations: [
          '立即联动分断上级直流断路器与交直流主断路器',
          '严禁就地带电拔插高压快插连接器',
          '放电完成后开箱更换主接触器总成',
        ],
      },
    ],
    evidence_report: { include: ['dc_bus_voltage', 'contactor_weld_alarm', 'trip_cmd_log'], timeline: true },
    mcs_matched: [['TRIP_CMD_ACTIVE', 'VOLTAGE_REMAINS_HIGH', 'WELD_ALARM_ACTIVE']],
  },
  tests: [
    {
      name: '分闸后仍有母线高压判定粘连',
      given: { observations: { dc_bus_voltage: 1250, trip_cmd_log: true, contactor_weld_alarm: 'active' } },
      expect: { conclusions: ['D_CONTACTOR_WELD'] },
    },
  ],
};

// 7. FT-TRANSFORMER-TEMP-RISE (F007: 变压器温升异常与轻瓦斯诊断)
export const FTA_DOC_F007: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F007',
    name: '储能升压主变温升异常与轻瓦斯诊断',
    version: '1.0.0',
    domain: 'transformer',
    asset_type: 'transformer',
    severity: 'high',
    language: 'zh-CN',
    tags: ['transformer', 'oil_temp', 'gas_relay', 'overheat'],
    description: '涵盖变压器绕组温升、风机失电停运及内部放电产气的 FTA 故障树诊断模型',
  },
  observations: [
    {
      id: 'oil_temperature',
      type: 'metric',
      name: '变压器顶层油温',
      selector: { asset_id: '${asset.id}', point_id: 'TRANSFORMER.TEMP.OIL', point_type: 'analog', unit: '℃' },
      query: { range: '15m', aggregation: 'max' },
    },
    {
      id: 'gas_relay_volume',
      type: 'metric',
      name: '瓦斯继电器集气量',
      selector: { asset_id: '${asset.id}', point_id: 'TRANSFORMER.GAS.VOLUME', point_type: 'analog', unit: 'mL' },
      query: { range: '15m', aggregation: 'max' },
    },
    {
      id: 'trans_temp_alarm',
      type: 'alarm',
      name: '变压器油温高报警',
      selector: { asset_id: '${asset.id}', alarm_code: 'TRANS_OIL_TEMP_HIGH' },
      query: { status: 'active', within: '15m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '储能主变压器超温与内部故障',
        gate: 'OR',
        children: ['COOLING_LOSS_CAUSE', 'GAS_DISCHARGE_CAUSE'],
        output: { conclusion: '主变压器温升或电气绝缘劣化', severity: 'high', confidence: { method: 'weighted', threshold: 0.75 } },
      },
      {
        id: 'COOLING_LOSS_CAUSE',
        type: 'intermediate',
        name: '冷却风机停机或油道堵塞',
        gate: 'AND',
        children: ['OIL_TEMP_HIGH', 'TEMP_ALARM_EVT'],
        weight: 0.9,
      },
      {
        id: 'OIL_TEMP_HIGH',
        type: 'basic',
        name: '油温突破 65℃ 警戒线',
        condition: { observation: 'oil_temperature', operator: 'gt', value: 65, for: '10m' },
      },
      {
        id: 'TEMP_ALARM_EVT',
        type: 'basic',
        name: '变压器温度保护动作',
        condition: { observation: 'trans_temp_alarm', operator: 'active', within: '15m' },
      },
      {
        id: 'GAS_DISCHARGE_CAUSE',
        type: 'intermediate',
        name: '铁芯或绕组过热导致变压器油裂解产气',
        gate: 'AND',
        children: ['GAS_VOLUME_EXCEED', 'OIL_TEMP_HIGH'],
        weight: 0.95,
      },
      {
        id: 'GAS_VOLUME_EXCEED',
        type: 'basic',
        name: '瓦斯集气量大于 150mL',
        condition: { observation: 'gas_relay_volume', operator: 'gt', value: 150, for: '5m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_TRANS_OVERTEMP',
        when: 'COOLING_LOSS_CAUSE',
        text: '主变冷却散热不足导致顶层油温超限',
        severity: 'high',
        recommendations: [
          '检查强迫风冷风机运行状态及风道',
          '核查充放电总负荷并进行降载限制',
        ],
      },
      {
        id: 'D_TRANS_GAS',
        when: 'GAS_DISCHARGE_CAUSE',
        text: '变压器内部局部放电产气 (轻瓦斯告警)',
        severity: 'critical',
        recommendations: [
          '现场取样瓦斯气体进行气相色谱分析 (DGA)',
          '检测油中溶解气体特征组分 (H2, CH4, C2H2)',
        ],
      },
    ],
    evidence_report: { include: ['oil_temperature', 'gas_relay_volume', 'trans_temp_alarm'], timeline: true },
    mcs_matched: [['OIL_TEMP_HIGH', 'TEMP_ALARM_EVT']],
  },
  tests: [
    {
      name: '变压器油温持续偏高',
      given: { observations: { oil_temperature: 72, trans_temp_alarm: 'active' } },
      expect: { conclusions: ['D_TRANS_OVERTEMP'] },
    },
  ],
};

// 6. FT-BATTERY-THERMAL-RUNAWAY (F008: 电池热失控微排气与火灾预警诊断)
export const FTA_DOC_F008: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F008',
    name: '电池热失控极早期微排气与火灾诊断',
    version: '1.0.0',
    domain: 'safety',
    asset_type: 'fss',
    severity: 'critical',
    language: 'zh-CN',
    tags: ['fire', 'thermal_runaway', 'co_gas', 'voc', 'fss'],
    description: '涵盖 CO 与 VOC 特征分解气体溢出、电芯急剧温升与消防联锁喷淋的极早期 FTA 诊断树',
  },
  observations: [
    {
      id: 'co_gas',
      type: 'metric',
      name: '一氧化碳 (CO) 气体浓度',
      selector: { asset_id: '${asset.id}', point_id: 'FSS.GAS.CO', point_type: 'analog', unit: 'ppm' },
      query: { range: '5m', aggregation: 'max' },
    },
    {
      id: 'voc_gas',
      type: 'metric',
      name: '挥发性有机物 (VOC) 气体浓度',
      selector: { asset_id: '${asset.id}', point_id: 'FSS.GAS.VOC', point_type: 'analog', unit: 'ppm' },
      query: { range: '5m', aggregation: 'max' },
    },
    {
      id: 'smoke_detector',
      type: 'metric',
      name: '感烟探测器报警开关量',
      selector: { asset_id: '${asset.id}', point_id: 'FSS.DETECTOR.SMOKE', point_type: 'state' },
      query: { range: '2m', latest: true },
    },
    {
      id: 'fire_alarm',
      type: 'alarm',
      name: '消防联动控制主机一级火警',
      selector: { asset_id: '${asset.id}', alarm_code: 'FSS_FIRE_ALARM' },
      query: { status: 'active', within: '5m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '电池舱热失控初期微排气与着火风险',
        gate: 'OR',
        children: ['GAS_BURST_CAUSE', 'SMOKE_FIRE_CAUSE'],
        output: { conclusion: '电芯热失控微排气火灾预警', severity: 'critical', confidence: { method: 'weighted', threshold: 0.85 } },
      },
      {
        id: 'GAS_BURST_CAUSE',
        type: 'intermediate',
        name: '电解液受热分解与防爆阀微排气',
        gate: 'AND',
        children: ['CO_EXCEED', 'VOC_EXCEED'],
        weight: 0.98,
      },
      {
        id: 'CO_EXCEED',
        type: 'basic',
        name: 'CO 浓度快速突破 20ppm',
        condition: { observation: 'co_gas', operator: 'gt', value: 20, for: '30s' },
      },
      {
        id: 'VOC_EXCEED',
        type: 'basic',
        name: 'VOC 浓度突破 10ppm',
        condition: { observation: 'voc_gas', operator: 'gt', value: 10, for: '30s' },
      },
      {
        id: 'SMOKE_FIRE_CAUSE',
        type: 'intermediate',
        name: '烟雾产生与消防传感器动作',
        gate: 'AND',
        children: ['SMOKE_ACTIVE', 'FIRE_ALARM_EVT'],
        weight: 0.99,
      },
      {
        id: 'SMOKE_ACTIVE',
        type: 'basic',
        name: '感烟探测器动作',
        condition: { observation: 'smoke_detector', operator: 'active', within: '2m' },
      },
      {
        id: 'FIRE_ALARM_EVT',
        type: 'basic',
        name: '消防主机红色火警',
        condition: { observation: 'fire_alarm', operator: 'active', within: '5m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_THERMAL_RUNAWAY',
        when: 'GAS_BURST_CAUSE',
        text: '电芯阀片已开启，检测到特征分解气体 (热失控极早期)',
        severity: 'critical',
        recommendations: [
          '立即切断整舱直流总断路器与交直流接触器',
          '启动舱内全氟己酮自动灭火系统第一级浸润预备',
          '关闭空调风门实施整舱气密闭锁',
          '疏散站区人员并拨打火警电话报告调度',
        ],
      },
    ],
    evidence_report: { include: ['co_gas', 'voc_gas', 'smoke_detector', 'fire_alarm'], timeline: true },
    mcs_matched: [['CO_EXCEED', 'VOC_EXCEED'], ['SMOKE_ACTIVE', 'FIRE_ALARM_EVT']],
  },
  tests: [
    {
      name: '双气体协同超标判定热失控微排气',
      given: { observations: { co_gas: 28, voc_gas: 15 } },
      expect: { conclusions: ['D_THERMAL_RUNAWAY'] },
    },
  ],
};

// 8. FT-COOLING-LEAKAGE (F009: 液冷管道微泄漏与压降异常诊断)
export const FTA_DOC_F009: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F009',
    name: '液冷系统管网微泄漏与压降异常诊断',
    version: '1.0.0',
    domain: 'cooling',
    asset_type: 'cooling_pipe',
    severity: 'high',
    language: 'zh-CN',
    tags: ['liquid_cooling', 'leakage', 'pipe', 'pressure_drop', 'expansion_tank'],
    description: '涵盖液冷回路进出口压差坍塌、膨胀水箱液位骤降及托盘光电漏液告警的 FTA 故障树诊断模型',
  },
  observations: [
    {
      id: 'loop_pressure_diff',
      type: 'metric',
      name: '液冷主管路进回水压差',
      selector: { asset_id: '${asset.id}', point_id: 'TMS.PIPE.PRESSURE.DIFF', point_type: 'analog', unit: 'kPa' },
      query: { range: '5m', aggregation: 'avg' },
    },
    {
      id: 'exp_tank_level',
      type: 'metric',
      name: '膨胀水箱储液位百分比',
      selector: { asset_id: '${asset.id}', point_id: 'TMS.TANK.LEVEL', point_type: 'analog', unit: '%' },
      query: { range: '10m', aggregation: 'min' },
    },
    {
      id: 'tray_leak_sensor',
      type: 'metric',
      name: '舱底接水盘光电漏液开关',
      selector: { asset_id: '${asset.id}', point_id: 'TMS.SENSOR.LEAK_STATE', point_type: 'state' },
      query: { range: '2m', latest: true },
    },
    {
      id: 'leak_alarm',
      type: 'alarm',
      name: '液冷微泄漏一级预警',
      selector: { asset_id: '${asset.id}', alarm_code: 'TMS_LEAK_ALARM' },
      query: { status: 'active', within: '5m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '液冷管路微泄漏导致失液失压',
        gate: 'OR',
        children: ['COUPLER_LEAK_CAUSE', 'PIPE_BURST_CAUSE'],
        output: { conclusion: '液冷回路泄漏与循环量不足', severity: 'high', confidence: { method: 'weighted', threshold: 0.82 } },
      },
      {
        id: 'COUPLER_LEAK_CAUSE',
        type: 'intermediate',
        name: '电池模组盲插快换接头渗漏',
        gate: 'AND',
        children: ['TANK_LEVEL_LOW', 'TRAY_LEAK_ACTIVE'],
        weight: 0.95,
      },
      {
        id: 'TANK_LEVEL_LOW',
        type: 'basic',
        name: '水箱液位跌落至 25% 以下',
        condition: { observation: 'exp_tank_level', operator: 'lt', value: 25, for: '2m' },
      },
      {
        id: 'TRAY_LEAK_ACTIVE',
        type: 'basic',
        name: '光电漏液探头检测到底部积液',
        condition: { observation: 'tray_leak_sensor', operator: 'active', within: '2m' },
      },
      {
        id: 'PIPE_BURST_CAUSE',
        type: 'intermediate',
        name: '主干管破损失压',
        gate: 'AND',
        children: ['PRESSURE_COLLAPSE', 'LEAK_ALARM_EVT'],
        weight: 0.9,
      },
      {
        id: 'PRESSURE_COLLAPSE',
        type: 'basic',
        name: '进回水压差跌破 40kPa',
        condition: { observation: 'loop_pressure_diff', operator: 'lt', value: 40, for: '1m' },
      },
      {
        id: 'LEAK_ALARM_EVT',
        type: 'basic',
        name: '触发系统微泄漏报警',
        condition: { observation: 'leak_alarm', operator: 'active', within: '5m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_PIPE_LEAK',
        when: 'COUPLER_LEAK_CAUSE',
        text: '电池模组快换接头密封失效渗漏，底部已积液',
        severity: 'high',
        recommendations: [
          '立即切断失压回路电磁阀，开启排空收集',
          '使用红外热像仪与荧光试剂定位具体渗漏模组',
          '排液更换快接头 O 型双密封圈',
        ],
      },
    ],
    evidence_report: { include: ['exp_tank_level', 'tray_leak_sensor', 'loop_pressure_diff'], timeline: true },
    mcs_matched: [['TANK_LEVEL_LOW', 'TRAY_LEAK_ACTIVE']],
  },
  tests: [
    {
      name: '水箱液位低且接水盘探头报警',
      given: { observations: { exp_tank_level: 18, tray_leak_sensor: true, leak_alarm: 'active' } },
      expect: { conclusions: ['D_PIPE_LEAK'] },
    },
  ],
};

// 9. FT-DC-ARC-FAULT (F010: 直流侧电弧故障诊断)
export const FTA_DOC_F010: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F010',
    name: '直流侧串并联拉弧故障 (DC Arc) 诊断',
    version: '1.0.0',
    domain: 'electrical',
    asset_type: 'battery_cluster',
    severity: 'critical',
    language: 'zh-CN',
    tags: ['dc_arc', 'arc_fault', 'safety', 'fire_risk', 'fiber_sensor'],
    description: '涵盖光纤环网弧光脉冲、高频白噪声谐波突增与母线电压瞬跌的超高速 FTA 故障树模型',
  },
  observations: [
    {
      id: 'arc_light_pulse',
      type: 'metric',
      name: '光纤探头弧光光强开关量',
      selector: { asset_id: '${asset.id}', point_id: 'ARC.FIBER.LIGHT_PULSE', point_type: 'state' },
      query: { range: '1m', latest: true },
    },
    {
      id: 'hf_noise_power',
      type: 'metric',
      name: '直流母线 40-100kHz 高频电流噪声',
      selector: { asset_id: '${asset.id}', point_id: 'ARC.CURRENT.HF_NOISE', point_type: 'analog', unit: 'dBm' },
      query: { range: '1m', aggregation: 'max' },
    },
    {
      id: 'arc_alarm',
      type: 'alarm',
      name: '直流电弧拉弧告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'DC_ARC_DETECTED' },
      query: { status: 'active', within: '2m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '直流母线发生持续性拉弧故障',
        gate: 'OR',
        children: ['SERIES_ARC_CAUSE', 'PARALLEL_ARC_CAUSE'],
        output: { conclusion: '直流侧恶性电弧放电', severity: 'critical', confidence: { method: 'weighted', threshold: 0.95 } },
      },
      {
        id: 'SERIES_ARC_CAUSE',
        type: 'intermediate',
        name: '接线端子接触虚接引发串联拉弧',
        gate: 'AND',
        children: ['ARC_LIGHT_TRIGGER', 'HF_NOISE_EXCEED'],
        weight: 0.99,
      },
      {
        id: 'ARC_LIGHT_TRIGGER',
        type: 'basic',
        name: '光纤传感器捕捉到瞬时强弧光脉冲',
        condition: { observation: 'arc_light_pulse', operator: 'active', within: '1m' },
      },
      {
        id: 'HF_NOISE_EXCEED',
        type: 'basic',
        name: '高频噪声功率突破 -15dBm',
        condition: { observation: 'hf_noise_power', operator: 'gt', value: -15, for: '50ms' },
      },
      {
        id: 'PARALLEL_ARC_CAUSE',
        type: 'intermediate',
        name: '母线正负极短路并联弧光',
        gate: 'AND',
        children: ['ARC_LIGHT_TRIGGER', 'ARC_ALARM_EVT'],
        weight: 0.99,
      },
      {
        id: 'ARC_ALARM_EVT',
        type: 'basic',
        name: '电弧检测仪硬接点跳闸保护',
        condition: { observation: 'arc_alarm', operator: 'active', within: '2m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_SERIES_ARC',
        when: 'SERIES_ARC_CAUSE',
        text: '直流汇流排铜排接触螺栓松动引发严重串联拉弧',
        severity: 'critical',
        recommendations: [
          '控制系统在 10ms 内触发快速直流分断装置 (CB)',
          '闭锁整舱高压回路，严禁重新合闸',
          '使用红外热成像仪与扭力扳手逐一校验紧固',
        ],
      },
    ],
    evidence_report: { include: ['arc_light_pulse', 'hf_noise_power', 'arc_alarm'], timeline: true },
    mcs_matched: [['ARC_LIGHT_TRIGGER', 'HF_NOISE_EXCEED']],
  },
  tests: [
    {
      name: '光脉冲与高频特征协同触发电弧关断',
      given: { observations: { arc_light_pulse: true, hf_noise_power: -8, arc_alarm: 'active' } },
      expect: { conclusions: ['D_SERIES_ARC'] },
    },
  ],
};

// 10. FT-GRID-VOLTAGE-SAG (F011: 电网侧电压跌落与低穿事件诊断)
export const FTA_DOC_F011: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F011',
    name: '电网侧严重电压跌落与低穿 (LVRT) 事件诊断',
    version: '1.0.0',
    domain: 'grid',
    asset_type: 'grid_pcc',
    severity: 'high',
    language: 'zh-CN',
    tags: ['grid', 'voltage_sag', 'lvrt', 'pcs', 'reactive_power'],
    description: '涵盖并网点电压标幺值突跌、无功电流注入响应及低电压穿越穿越状态判定的 FTA 故障树模型',
  },
  observations: [
    {
      id: 'grid_voltage_pu',
      type: 'metric',
      name: '并网点交流正序电压标幺值',
      selector: { asset_id: '${asset.id}', point_id: 'GRID.VOLTAGE.PU', point_type: 'analog', unit: 'p.u.' },
      query: { range: '1m', aggregation: 'min' },
    },
    {
      id: 'reactive_current_pu',
      type: 'metric',
      name: 'PCS 动态无功电流支撑量',
      selector: { asset_id: '${asset.id}', point_id: 'PCS.CURRENT.REACTIVE_PU', point_type: 'analog', unit: 'p.u.' },
      query: { range: '1m', aggregation: 'avg' },
    },
    {
      id: 'lvrt_event_log',
      type: 'log',
      name: '变流器 LVRT 低穿动作事件记录',
      selector: { asset_id: '${asset.id}', event_type: 'lvrt_triggered', source: 'pcs_dsp' },
      query: { within: '2m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '电网电压严重跌落触发低穿动作',
        gate: 'OR',
        children: ['SYMMETRIC_SAG_CAUSE'],
        output: { conclusion: '电网短路引起暂态低穿支撑', severity: 'high', confidence: { method: 'weighted', threshold: 0.88 } },
      },
      {
        id: 'SYMMETRIC_SAG_CAUSE',
        type: 'intermediate',
        name: '电网对称短路引发电压深度跌落',
        gate: 'AND',
        children: ['VOLTAGE_SAG_DEEP', 'LVRT_TRIGGER_RECORD'],
        weight: 0.96,
      },
      {
        id: 'VOLTAGE_SAG_DEEP',
        type: 'basic',
        name: '电压跌落至 0.2-0.8 p.u. 区间',
        condition: { observation: 'grid_voltage_pu', operator: 'lt', value: 0.8, for: '100ms' },
      },
      {
        id: 'LVRT_TRIGGER_RECORD',
        type: 'basic',
        name: 'PCS 进入低电压穿越工作模式',
        condition: { observation: 'lvrt_event_log', operator: 'exists', within: '2m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_LVRT_SUCCESS',
        when: 'SYMMETRIC_SAG_CAUSE',
        text: '电网发生短路故障，储能 PCS 成功进入动态无功穿越支撑',
        severity: 'high',
        recommendations: [
          '校验 PCS 注入动态无功电流响应时间 (< 20ms)',
          '核查故障清除后有功功率恢复斜率与电网调度要求一致',
        ],
      },
    ],
    evidence_report: { include: ['grid_voltage_pu', 'reactive_current_pu', 'lvrt_event_log'], timeline: true },
    mcs_matched: [['VOLTAGE_SAG_DEEP', 'LVRT_TRIGGER_RECORD']],
  },
  tests: [
    {
      name: '电压突跌触发 LVRT 动作',
      given: { observations: { grid_voltage_pu: 0.35, reactive_current_pu: 1.05, lvrt_event_log: true } },
      expect: { conclusions: ['D_LVRT_SUCCESS'] },
    },
  ],
};

// 11. FT-CABIN-ENV-FAIL (F012: 舱内环境温湿度失控与凝露风险诊断)
export const FTA_DOC_F012: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F012',
    name: '储能舱内环境温湿度失控与凝露风险诊断',
    version: '1.0.0',
    domain: 'hvac',
    asset_type: 'cabin',
    severity: 'medium',
    language: 'zh-CN',
    tags: ['cabin', 'humidity', 'condensation', 'dew_point', 'hvac'],
    description: '涵盖集装箱环境温湿度失控、露点温度逼近及冷凝结露电气短路预警的 FTA 故障树模型',
  },
  observations: [
    {
      id: 'cabin_temp',
      type: 'metric',
      name: '电池舱内部环境温度',
      selector: { asset_id: '${asset.id}', point_id: 'CABIN.ENV.TEMP', point_type: 'analog', unit: '℃' },
      query: { range: '15m', aggregation: 'avg' },
    },
    {
      id: 'cabin_humidity',
      type: 'metric',
      name: '电池舱相对湿度',
      selector: { asset_id: '${asset.id}', point_id: 'CABIN.ENV.HUMIDITY', point_type: 'analog', unit: '%RH' },
      query: { range: '15m', aggregation: 'avg' },
    },
    {
      id: 'dew_point_margin',
      type: 'metric',
      name: '露点温差裕度 (环境温度 - 露点)',
      selector: { asset_id: '${asset.id}', point_id: 'CABIN.ENV.DEW_MARGIN', point_type: 'analog', unit: '℃' },
      query: { range: '10m', aggregation: 'min' },
    },
    {
      id: 'condense_alarm',
      type: 'alarm',
      name: '舱内凝露高风险预警',
      selector: { asset_id: '${asset.id}', alarm_code: 'CABIN_CONDENSATION_RISK' },
      query: { status: 'active', within: '10m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '舱内环境湿度逼近结露临界点',
        gate: 'OR',
        children: ['CONDENSATION_CRITICAL_CAUSE'],
        output: { conclusion: '电池舱结露造成爬电短路隐患', severity: 'medium', confidence: { method: 'weighted', threshold: 0.85 } },
      },
      {
        id: 'CONDENSATION_CRITICAL_CAUSE',
        type: 'intermediate',
        name: '空调除湿失效且环境露点温差不足 3℃',
        gate: 'AND',
        children: ['HIGH_HUMIDITY_EXCEED', 'DEW_MARGIN_COLLAPSE'],
        weight: 0.94,
      },
      {
        id: 'HIGH_HUMIDITY_EXCEED',
        type: 'basic',
        name: '舱内相对湿度持续高于 85%',
        condition: { observation: 'cabin_humidity', operator: 'gt', value: 85, for: '15m' },
      },
      {
        id: 'DEW_MARGIN_COLLAPSE',
        type: 'basic',
        name: '露点裕度低于 2.5℃ (极易结露)',
        condition: { observation: 'dew_point_margin', operator: 'lt', value: 2.5, for: '5m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_CONDENSATION_RISK',
        when: 'CONDENSATION_CRITICAL_CAUSE',
        text: '舱内高湿环境达到露点临界状态，金属构件与母排面临凝露短路',
        severity: 'medium',
        recommendations: [
          '强制启动备用工业空调的强力除湿模式',
          '启动舱内正压加热防结露风幕',
          '检查集装箱门密封胶条及进风百叶窗关闭状态',
        ],
      },
    ],
    evidence_report: { include: ['cabin_humidity', 'dew_point_margin', 'condense_alarm'], timeline: true },
    mcs_matched: [['HIGH_HUMIDITY_EXCEED', 'DEW_MARGIN_COLLAPSE']],
  },
  tests: [
    {
      name: '湿度超标且露点温差过小判定凝露风险',
      given: { observations: { cabin_humidity: 91, dew_point_margin: 1.8, condense_alarm: 'active' } },
      expect: { conclusions: ['D_CONDENSATION_RISK'] },
    },
  ],
};

// 12. FT-COOLING-PARAM-DRIFT (F015: 冷却系统参数漂移诊断)
export const FTA_DOC_F015: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F015',
    name: '温控冷却系统参数漂移与定值失真诊断',
    version: '1.0.0',
    domain: 'cooling',
    asset_type: 'cooling_system',
    severity: 'medium',
    language: 'zh-CN',
    tags: ['cooling', 'parameter_drift', 'calibration', 'pid', 'baseline'],
    description: '涵盖出水设定温度被非法篡改、PID调节震荡及与资产模型基线不匹配的 FTA 故障树模型',
  },
  observations: [
    {
      id: 'target_water_temp',
      type: 'config',
      name: '冷水机组目标出水设定温度',
      selector: { asset_id: '${asset.id}', config_type: 'tms_setting', key: 'target_outlet_temp' },
      compare: { actual_field: 'value', expected_from: 'asset_model', tolerance: 0.05 },
    },
    {
      id: 'flow_rate_setting',
      type: 'config',
      name: '冷却水泵基础运行流量定值',
      selector: { asset_id: '${asset.id}', config_type: 'tms_setting', key: 'base_flow_setting' },
      compare: { actual_field: 'value', expected_from: 'asset_model', tolerance: 0.1 },
    },
    {
      id: 'temp_tracking_err',
      type: 'metric',
      name: '出水温度稳态跟踪误差',
      selector: { asset_id: '${asset.id}', point_id: 'TMS.TEMP.TRACKING_ERROR', point_type: 'analog', unit: '℃' },
      query: { range: '15m', aggregation: 'avg' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '温控控制参数漂移导致散热不良',
        gate: 'OR',
        children: ['PARAM_MISMATCH_CAUSE'],
        output: { conclusion: '冷却控制参数非标漂移', severity: 'medium', confidence: { method: 'weighted', threshold: 0.8 } },
      },
      {
        id: 'PARAM_MISMATCH_CAUSE',
        type: 'intermediate',
        name: '出水目标定值严重背离黄金基线',
        gate: 'AND',
        children: ['TARGET_TEMP_MISMATCH', 'TRACKING_ERROR_HIGH'],
        weight: 0.9,
      },
      {
        id: 'TARGET_TEMP_MISMATCH',
        type: 'basic',
        name: '设定温度与资产模型偏差 > 5%',
        condition: { type: 'config_compare', observation: 'target_water_temp', operator: 'ne' },
      },
      {
        id: 'TRACKING_ERROR_HIGH',
        type: 'basic',
        name: '温控稳态跟踪误差超 3.5℃',
        condition: { observation: 'temp_tracking_err', operator: 'gt', value: 3.5, for: '10m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_PARAM_DRIFT',
        when: 'PARAM_MISMATCH_CAUSE',
        text: '冷却系统定值被人为修改或控制器 EEPROM 掉电参数复位异常',
        severity: 'medium',
        recommendations: [
          '一键下发系统标定库黄金基线定值',
          '校验热控上位机参数写权限并锁定',
        ],
      },
    ],
    evidence_report: { include: ['target_water_temp', 'temp_tracking_err'], timeline: true },
    mcs_matched: [['TARGET_TEMP_MISMATCH', 'TRACKING_ERROR_HIGH']],
  },
  tests: [
    {
      name: '参数不一致且稳态误差过大判定漂移',
      given: { observations: { target_water_temp: { mismatch: true }, temp_tracking_err: 4.2 } },
      expect: { conclusions: ['D_PARAM_DRIFT'] },
    },
  ],
};

// 13. FT-COOLING-PUMP-CTRL-FAIL (F021: 冷却泵控制失效诊断)
export const FTA_DOC_F021: FaultTreeDocument = {
  apiVersion: 'diag.example.com/v1',
  kind: 'FaultTree',
  metadata: {
    id: 'F021',
    name: '变频冷却泵控制失效与调速失步诊断',
    version: '1.0.0',
    domain: 'cooling',
    asset_type: 'cooling_pump',
    severity: 'high',
    language: 'zh-CN',
    tags: ['cooling_pump', 'vfd', 'control_failure', 'speed_mismatch'],
    description: '涵盖变频水泵通讯指令下发后转速无响应、变频器报错报警与水流停滞的 FTA 故障树诊断模型',
  },
  observations: [
    {
      id: 'pump_cmd_speed',
      type: 'metric',
      name: 'PLC 调速指令设定转速',
      selector: { asset_id: '${asset.id}', point_id: 'TMS.PUMP.SPEED_CMD', point_type: 'analog', unit: 'RPM' },
      query: { range: '2m', aggregation: 'avg' },
    },
    {
      id: 'pump_fb_speed',
      type: 'metric',
      name: '变频水泵编码器实际反馈转速',
      selector: { asset_id: '${asset.id}', point_id: 'TMS.PUMP.SPEED_FB', point_type: 'analog', unit: 'RPM' },
      query: { range: '2m', aggregation: 'avg' },
    },
    {
      id: 'pump_ctrl_alarm',
      type: 'alarm',
      name: '水泵调速失步故障告警',
      selector: { asset_id: '${asset.id}', alarm_code: 'TMS_PUMP_CTRL_FAIL' },
      query: { status: 'active', within: '5m' },
    },
  ],
  fault_tree: {
    root: 'TOP',
    nodes: [
      {
        id: 'TOP',
        type: 'top_event',
        name: '循环水泵变频调速控制失步拒动',
        gate: 'OR',
        children: ['SPEED_FB_LOST_CAUSE'],
        output: { conclusion: '水泵变频驱动失效', severity: 'high', confidence: { method: 'weighted', threshold: 0.88 } },
      },
      {
        id: 'SPEED_FB_LOST_CAUSE',
        type: 'intermediate',
        name: '转速指令有效但反馈转速归零 (失动)',
        gate: 'AND',
        children: ['CMD_HIGH_FB_ZERO', 'CTRL_ALARM_EVT'],
        weight: 0.96,
      },
      {
        id: 'CMD_HIGH_FB_ZERO',
        type: 'basic',
        name: '设定转速 > 1000RPM 而实际反馈 < 100RPM',
        condition: { observation: 'pump_fb_speed', operator: 'lt', value: 100, for: '30s' },
      },
      {
        id: 'CTRL_ALARM_EVT',
        type: 'basic',
        name: '水泵调速失步报警动作',
        condition: { observation: 'pump_ctrl_alarm', operator: 'active', within: '5m' },
      },
    ],
  },
  diagnosis: {
    conclusions: [
      {
        id: 'D_PUMP_CTRL_LOST',
        when: 'SPEED_FB_LOST_CAUSE',
        text: '冷却泵变频器通讯断开或驱动输出级严重故障',
        severity: 'high',
        recommendations: [
          '就地查看变频器操作面板错误代码 (如 E.OC / E.SC)',
          '切换至手动旁路工频运行档位维持降温',
          '检查 PLC 模拟量 4-20mA 调速信号回路',
        ],
      },
    ],
    evidence_report: { include: ['pump_cmd_speed', 'pump_fb_speed', 'pump_ctrl_alarm'], timeline: true },
    mcs_matched: [['CMD_HIGH_FB_ZERO', 'CTRL_ALARM_EVT']],
  },
  tests: [
    {
      name: '转速反馈严重低于指令判定失控',
      given: { observations: { pump_cmd_speed: 1800, pump_fb_speed: 0, pump_ctrl_alarm: 'active' } },
      expect: { conclusions: ['D_PUMP_CTRL_LOST'] },
    },
  ],
};

// 预置 FTA 文档字典
export const PREBUILT_FTA_DOCUMENTS: Record<string, FaultTreeDocument> = {
  'FT-ESS-CLUSTER-OVERHEAT': BATTERY_CLUSTER_OVERHEAT_FTA_DOC,
  'F001': FTA_DOC_F001,
  'F002': FTA_DOC_F002,
  'F003': FTA_DOC_F003,
  'F004': FTA_DOC_F004,
  'F005': FTA_DOC_F005,
  'F006': FTA_DOC_F006,
  'F007': FTA_DOC_F007,
  'F008': FTA_DOC_F008,
  'F009': FTA_DOC_F009,
  'F010': FTA_DOC_F010,
  'F011': FTA_DOC_F011,
  'F012': FTA_DOC_F012,
  'F015': FTA_DOC_F015,
  'F021': FTA_DOC_F021,
};

/**
 * 核心引擎：根据 FaultPattern 中定义的异常症状特征智能合成标准化 FaultTreeDocument
 * 自动根据症状的 5D 时序特征、告警状态、定值配置及所属设备，构建逻辑门树与观测项
 */
export function synthesizeFtaFromSymptoms(
  fault: FaultPattern,
  groupingMode: 'by_device' | 'by_type' = 'by_device'
): FaultTreeDocument {
  const faultId = fault.id;
  const ftaId = faultId.startsWith('FT-') ? faultId : `FT-${faultId}`;

  const observations: any[] = [];
  const basicNodes: any[] = [];
  const intermediateNodes: any[] = [];
  const mcsSets: string[][] = [];

  const symptoms = fault.symptoms || [];

  // 辅助解析正常范围中的数值阈值
  const parseRangeThreshold = (rangeStr?: string, isUp: boolean = true, defaultVal: number = 50): number => {
    if (!rangeStr) return defaultVal;
    const nums = rangeStr.match(/[-+]?\d*\.?\d+/g);
    if (!nums || nums.length === 0) return defaultVal;
    const parsedNums = nums.map(Number).filter((n) => !isNaN(n));
    if (parsedNums.length === 1) return parsedNums[0];
    if (parsedNums.length >= 2) {
      return isUp ? Math.max(...parsedNums) : Math.min(...parsedNums);
    }
    return defaultVal;
  };

  // 1. 将所有症状特征转化为基本事件 (Basic Event) 和观测项 (Observation)
  symptoms.forEach((sym, idx) => {
    const safeId = (sym.id || `SYM_${idx + 1}`).replace(/[^a-zA-Z0-9_]/g, '_');
    const obsId =
      sym.metric_code ||
      sym.alarm_code ||
      sym.parameter_code ||
      sym.indicator_id ||
      `obs_${safeId.toLowerCase()}`;
    const sType = sym.type || 'indicator';
    const devLabel = sym.device_name ? `[${sym.device_name}] ` : '';

    if (sType === 'alarm') {
      observations.push({
        id: obsId,
        type: 'alarm',
        name: `${devLabel}${sym.alarm_name || sym.metric_name || '告警事件'}`,
        selector: {
          asset_id: '${asset.id}',
          alarm_code: sym.alarm_code || obsId.toUpperCase(),
        },
        query: { status: 'active', within: sym.time_window || '30m' },
      });

      const nodeId = `BE_${safeId}`;
      basicNodes.push({
        id: nodeId,
        type: 'basic',
        name: `${devLabel}${sym.alarm_name || sym.metric_name || '系统告警'} 触发`,
        condition: {
          observation: obsId,
          operator: 'active',
          within: sym.time_window || '30m',
        },
      });
    } else if (sType === 'parameter') {
      observations.push({
        id: obsId,
        type: 'config',
        name: `${devLabel}${sym.parameter_name || sym.metric_name || '配置基线定值'}`,
        selector: {
          asset_id: '${asset.id}',
          config_type: 'device_setting',
          key: sym.parameter_code || obsId,
        },
        compare: {
          actual_field: 'value',
          expected_from: 'asset_model',
          tolerance: 0.05,
        },
      });

      const nodeId = `BE_${safeId}`;
      basicNodes.push({
        id: nodeId,
        type: 'basic',
        name: `${devLabel}${sym.parameter_name || sym.metric_name || '控制定值'} 异常偏离`,
        condition: {
          type: 'config_compare',
          observation: obsId,
          operator: sym.condition_operator || 'ne',
        },
      });
    } else if (sType === 'event_sequence') {
      observations.push({
        id: obsId,
        type: 'log',
        name: `${devLabel}${sym.sequence_name || sym.metric_name || '时序日志模式'}`,
        selector: {
          asset_id: '${asset.id}',
          event_type: sym.keywords || 'event_action',
          source: sym.log_source || 'system.log',
        },
        query: { within: sym.time_window || '30m' },
      });

      const nodeId = `BE_${safeId}`;
      basicNodes.push({
        id: nodeId,
        type: 'basic',
        name: `${devLabel}${sym.sequence_name || sym.metric_name || '时序规则'} 序列命中`,
        condition: {
          observation: obsId,
          operator: 'exists',
          within: sym.time_window || '30m',
        },
      });
    } else {
      // 默认: 5 维连续指标测点
      const isUp =
        sym.trend === 'UP' ||
        sym.trend === 'REVERSAL_UP' ||
        sym.direction === 'up' ||
        sym.direction === 'abnormal_high';
      const isDown =
        sym.trend === 'DOWN' ||
        sym.trend === 'REVERSAL_DOWN' ||
        sym.direction === 'down' ||
        sym.direction === 'abnormal_low';

      const operator = isDown ? 'lt' : isUp ? 'gt' : 'ne';
      const thresholdVal = parseRangeThreshold(sym.normal_range, isUp, isUp ? 65 : 25);

      observations.push({
        id: obsId,
        type: 'metric',
        name: `${devLabel}${sym.metric_name || '连续监测指标'}`,
        selector: {
          asset_id: '${asset.id}',
          point_id: sym.metric_code || obsId,
          point_type: 'analog',
          unit: sym.unit || undefined,
        },
        query: { range: sym.time_window || '15m', aggregation: 'avg' },
        quality: { require: ['valid', 'good'] },
      });

      const nodeId = `BE_${safeId}`;
      const trendLabel = sym.trend || sym.direction || (isDown ? '跌落' : '越限');
      basicNodes.push({
        id: nodeId,
        type: 'basic',
        name: `${devLabel}${sym.metric_name || '监测指标'} 异常偏离 (${trendLabel})`,
        condition: {
          observation: obsId,
          operator,
          value: thresholdVal,
          for: sym.duration_pattern === 'SUSTAINED' ? '30s' : '3s',
          within: sym.time_window || '5m',
        },
      });
    }
  });

  // 如果没有基本事件，提供可靠健康兜底
  if (basicNodes.length === 0) {
    observations.push({
      id: 'system_health_indicator',
      type: 'metric',
      name: `${fault.name} 运行健康评分`,
      selector: { asset_id: '${asset.id}', point_id: 'HEALTH.SCORE', point_type: 'analog' },
      query: { range: '5m', aggregation: 'avg' },
    });
    basicNodes.push({
      id: 'BE_HEALTH_DROP',
      type: 'basic',
      name: '系统健康度指标跌落预警线',
      condition: { observation: 'system_health_indicator', operator: 'lt', value: 60, for: '2m' },
    });
  }

  // 2. 依据异常特征构建中间逻辑门 (Intermediate Logic Gates)
  if (groupingMode === 'by_device' && symptoms.length > 1) {
    // 按关联设备/组件归类分组
    const groups: Record<string, string[]> = {};
    symptoms.forEach((sym, idx) => {
      const groupKey = sym.device_name || sym.device_type || '核心关联回路';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(basicNodes[idx]?.id);
    });

    const groupKeys = Object.keys(groups);
    groupKeys.forEach((key, gIdx) => {
      const childIds = groups[key].filter(Boolean);
      if (childIds.length === 0) return;
      const gateId = `GATE_BRANCH_${gIdx + 1}_${key.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      intermediateNodes.push({
        id: gateId,
        type: 'intermediate',
        name: `【${key}】特征演变分支`,
        gate: childIds.length > 1 ? 'AND' : 'OR',
        children: childIds,
        weight: 0.9,
      });
      mcsSets.push(childIds);
    });
  } else {
    // 默认或按类型两级分支构建
    const half = Math.ceil(basicNodes.length / 2);
    const branch1Children = basicNodes.slice(0, half).map((n) => n.id);
    const branch2Children = basicNodes.slice(half).map((n) => n.id);

    intermediateNodes.push({
      id: 'CAUSE_BRANCH_1',
      type: 'intermediate',
      name: `${fault.name} 动力与流体物理诱发分支`,
      gate: branch1Children.length > 1 ? 'AND' : 'OR',
      children: branch1Children.length > 0 ? branch1Children : [basicNodes[0].id],
      weight: 0.9,
    });
    mcsSets.push(branch1Children.length > 0 ? branch1Children : [basicNodes[0].id]);

    if (branch2Children.length > 0) {
      intermediateNodes.push({
        id: 'CAUSE_BRANCH_2',
        type: 'intermediate',
        name: `${fault.name} 电气与告警保护判定分支`,
        gate: 'OR',
        children: branch2Children,
        weight: 0.85,
      });
      mcsSets.push(branch2Children);
    }
  }

  // 3. 构建顶事件 (Root Top Event)
  const topNode: any = {
    id: 'TOP',
    type: 'top_event',
    name: `${fault.name} (确诊顶事件)`,
    gate: 'OR',
    children: intermediateNodes.map((n) => n.id),
    output: {
      conclusion: `${fault.name} 确诊成立`,
      severity: fault.severity || 'high',
      confidence: { method: 'weighted', threshold: 0.8 },
    },
  };

  // 4. 诊断结论映射
  const conclusions = intermediateNodes.map((inter) => ({
    id: `D_${inter.id}`,
    when: inter.id,
    text: `经 FTA 逻辑门演绎，${inter.name} 成立，导致【${fault.name}】发生`,
    severity: fault.severity || 'high',
    recommendations: (fault.associated_procedure_ids || []).length > 0
      ? [
          `立即调用关联应急处置方案 [${fault.associated_procedure_ids.join(', ')}]`,
          '检查现场异常测点传感器接线与控制执行机构',
          '按规程对关键回路进行带电校验与旁路隔离',
        ]
      : [
          '就地排查关联部件硬件状态与控制板卡日志',
          '复核指标采样值是否超出现行健康基线',
          '执行预防性巡检与消缺处置',
        ],
  }));

  // 5. 自动化测试用例 (Automated Test Cases)
  const healthyObservations: Record<string, any> = {};
  const triggeredObservations: Record<string, any> = {};

  observations.forEach((obs) => {
    if (obs.type === 'metric') {
      healthyObservations[obs.id] = 30;
      triggeredObservations[obs.id] = 95;
    } else if (obs.type === 'alarm') {
      healthyObservations[obs.id] = 'inactive';
      triggeredObservations[obs.id] = 'active';
    } else if (obs.type === 'config') {
      healthyObservations[obs.id] = { mismatch: false };
      triggeredObservations[obs.id] = { mismatch: true };
    } else {
      healthyObservations[obs.id] = false;
      triggeredObservations[obs.id] = true;
    }
  });

  const testCases = [
    {
      name: '工况用例 1: 全特征正常健康基线 (无触发)',
      given: { observations: healthyObservations },
      expect: { conclusions: [] },
    },
    {
      name: `工况用例 2: 典型异常特征全触发命中 (${fault.name})`,
      given: { observations: triggeredObservations },
      expect: { conclusions: conclusions.map((c) => c.id) },
    },
  ];

  return {
    apiVersion: 'diag.example.com/v1',
    kind: 'FaultTree',
    metadata: {
      id: ftaId,
      name: `${fault.name}故障树`,
      version: '1.0.0',
      domain: 'energy_storage',
      asset_type: (fault.affected_devices && fault.affected_devices[0]) || 'general_asset',
      severity: fault.severity || 'high',
      language: 'zh-CN',
      tags: fault.tags || ['FTA', '工业故障树', fault.name],
      description: fault.root_cause
        ? fault.root_cause.replace(/#+/g, '').slice(0, 120)
        : `${fault.name} 基于异常症状特征构建的 FTA 逻辑门演绎树`,
    },
    variables: [
      { name: 'window_5m', type: 'duration', value: '5m' },
      { name: 'window_30m', type: 'duration', value: '30m' },
    ],
    context: {
      asset: { id: '${asset.id}', type: 'general_asset' },
      clock: { require_sync: true, min_quality: 'good', max_drift: '100ms' },
      topology: {
        source: 'cmdb',
        nodes: (fault.affected_devices || ['DEV_MAIN']).map((dId) => ({ id: dId, type: 'device' })),
      },
    },
    observations,
    fault_tree: {
      root: 'TOP',
      nodes: [topNode, ...intermediateNodes, ...basicNodes],
    },
    analysis: {
      qualitative: { mcs: true, mps: true, max_order: 4, output: 'mcs_list' },
      quantitative: { method: 'frequency_approx', source: 'historical_events', window: '30m', min_samples: 5 },
    },
    diagnosis: {
      conclusions,
      evidence_report: { include: observations.map((o) => o.id), timeline: true, quality_report: true },
      mcs_matched: mcsSets,
    },
    tests: testCases,
  };
}

/**
 * 核心引擎：根据任意 FaultPattern 获取或自动生成标准化 FaultTreeDocument
 * 确保系统内任意故障模式（包括存量与新建）均符合 apiVersion: diag.example.com/v1, kind: FaultTree
 */
export function generateFtaDocumentFromFault(
  fault: FaultPattern,
  forceRegenerate: boolean = false
): FaultTreeDocument {
  // 1. 若不需要强制由异常特征重构，且有专属预置 FTA 文档，直接返回预置
  if (!forceRegenerate && PREBUILT_FTA_DOCUMENTS[fault.id]) {
    return PREBUILT_FTA_DOCUMENTS[fault.id];
  }

  // 2. 否则从 FaultPattern 的异常症状特征智能合成标准 FTA 故障树模型
  return synthesizeFtaFromSymptoms(fault);
}

/**
 * 将 FaultTreeDocument 序列化为规范的 FTA YAML 字符串
 */
export function formatFtaDocumentToYaml(ftaDoc: FaultTreeDocument): string {
  const lines: string[] = [
    'apiVersion: diag.example.com/v1',
    'kind: FaultTree',
    '',
    'metadata:',
    `  id: ${ftaDoc.metadata.id}`,
    `  name: ${ftaDoc.metadata.name}`,
    `  version: ${ftaDoc.metadata.version}`,
    `  domain: ${ftaDoc.metadata.domain}`,
    `  asset_type: ${ftaDoc.metadata.asset_type}`,
    `  severity: ${ftaDoc.metadata.severity}`,
    `  language: ${ftaDoc.metadata.language || 'zh-CN'}`,
    `  tags: [${(ftaDoc.metadata.tags || []).join(', ')}]`,
    '',
    'variables:',
    ...(ftaDoc.variables || [
      { name: 'window_5m', type: 'duration', value: '5m' },
      { name: 'window_30m', type: 'duration', value: '30m' },
    ]).map((v) => `  - name: ${v.name}\n    type: ${v.type}\n    value: ${v.value}`),
    '',
    'context:',
    '  asset:',
    `    id: ${ftaDoc.context?.asset?.id || '${asset.id}'}`,
    `    type: ${ftaDoc.context?.asset?.type || ftaDoc.metadata.asset_type}`,
    '  clock:',
    `    require_sync: ${ftaDoc.context?.clock?.require_sync ?? true}`,
    `    min_quality: ${ftaDoc.context?.clock?.min_quality || 'good'}`,
    `    max_drift: ${ftaDoc.context?.clock?.max_drift || '200ms'}`,
    '  topology:',
    `    source: ${ftaDoc.context?.topology?.source || 'cmdb'}`,
    '    nodes:',
    ...(ftaDoc.context?.topology?.nodes || [{ id: 'NODE_01', type: 'device' }]).map(
      (n) => `      - id: ${n.id}\n        type: ${n.type}${n.parent ? `\n        parent: ${n.parent}` : ''}`
    ),
    '',
    'observations:',
  ];

  // 按 Metric, Alarm, Log, Config, Waveform 组织格式化
  const metrics = ftaDoc.observations.filter((o) => o.type === 'metric');
  const alarms = ftaDoc.observations.filter((o) => o.type === 'alarm');
  const logs = ftaDoc.observations.filter((o) => o.type === 'log');
  const configs = ftaDoc.observations.filter((o) => o.type === 'config');
  const waveforms = ftaDoc.observations.filter((o) => o.type === 'waveform');

  if (metrics.length > 0) {
    lines.push('  # === Metric ===');
    metrics.forEach((m) => {
      lines.push(`  - id: ${m.id}`);
      lines.push('    type: metric');
      lines.push(`    name: ${m.name}`);
      lines.push('    selector:');
      lines.push(`      asset_id: ${m.selector.asset_id || '${asset.id}'}`);
      lines.push(`      point_id: "${m.selector.point_id || m.id}"`);
      lines.push(`      point_type: ${m.selector.point_type || 'analog'}`);
      if (m.selector.unit) lines.push(`      unit: "${m.selector.unit}"`);
      lines.push('    query:');
      lines.push(`      range: ${m.query?.range || '${window_30m}'}`);
      if (m.query?.aggregation) lines.push(`      aggregation: ${m.query.aggregation}`);
      lines.push('    quality:');
      lines.push('      require: [valid, good]');
      lines.push('');
    });
  }

  if (alarms.length > 0) {
    lines.push('  # === Alarm ===');
    alarms.forEach((a) => {
      lines.push(`  - id: ${a.id}`);
      lines.push('    type: alarm');
      lines.push(`    name: ${a.name}`);
      lines.push('    selector:');
      lines.push(`      asset_id: ${a.selector.asset_id || '${asset.id}'}`);
      lines.push(`      alarm_code: "${a.selector.alarm_code || a.id}"`);
      lines.push('    query:');
      lines.push('      status: active');
      lines.push(`      within: ${a.query?.within || '${window_30m}'}`);
      lines.push('');
    });
  }

  if (logs.length > 0) {
    lines.push('  # === Log / Event ===');
    logs.forEach((l) => {
      lines.push(`  - id: ${l.id}`);
      lines.push('    type: log');
      lines.push(`    name: ${l.name}`);
      lines.push('    selector:');
      lines.push(`      asset_id: ${l.selector.asset_id || '${asset.id}'}`);
      lines.push(`      event_type: ${l.selector.event_type || 'action'}`);
      lines.push(`      source: ${l.selector.source || 'system'}`);
      lines.push('    query:');
      lines.push(`      within: ${l.query?.within || '${window_30m}'}`);
      lines.push('    fields: [event_id, occurred_at]');
      lines.push('');
    });
  }

  if (configs.length > 0) {
    lines.push('  # === Config ===');
    configs.forEach((c) => {
      lines.push(`  - id: ${c.id}`);
      lines.push('    type: config');
      lines.push(`    name: ${c.name}`);
      lines.push('    selector:');
      lines.push(`      asset_id: ${c.selector.asset_id || '${asset.id}'}`);
      lines.push(`      config_type: ${c.selector.config_type || 'setting'}`);
      lines.push(`      key: "${c.selector.key || c.id}"`);
      lines.push('    compare:');
      lines.push('      actual_field: value');
      lines.push('      expected_from: asset_model');
      lines.push('      tolerance: 0.05');
      lines.push('');
    });
  }

  if (waveforms.length > 0) {
    lines.push('  # === 录波 ===');
    waveforms.forEach((w) => {
      lines.push(`  - id: ${w.id}`);
      lines.push('    type: waveform');
      lines.push(`    name: ${w.name}`);
      lines.push('    selector:');
      lines.push(`      asset_id: ${w.selector.asset_id || '${asset.id}'}`);
      lines.push(`      record_type: ${w.selector.record_type || 'fault_recording'}`);
      lines.push(`      format: ${w.selector.format || 'COMTRADE'}`);
      lines.push(`      channels: [${(w.selector.channels || ['CH1', 'CH2']).map((ch) => `"${ch}"`).join(', ')}]`);
      lines.push('');
    });
  }

  // Fault Tree
  lines.push('fault_tree:');
  lines.push(`  root: ${ftaDoc.fault_tree.root}`);
  lines.push('  nodes:');

  ftaDoc.fault_tree.nodes.forEach((n) => {
    lines.push(`    - id: ${n.id}`);
    lines.push(`      type: ${n.type}`);
    lines.push(`      name: ${n.name}`);
    if (n.gate) lines.push(`      gate: ${n.gate}`);
    if (n.children && n.children.length > 0) {
      lines.push(`      children: [${n.children.join(', ')}]`);
    }
    if (n.weight !== undefined) lines.push(`      weight: ${n.weight}`);
    if (n.output) {
      lines.push('      output:');
      lines.push(`        conclusion: "${n.output.conclusion}"`);
      lines.push(`        severity: ${n.output.severity}`);
      lines.push('        confidence:');
      lines.push(`          method: ${n.output.confidence.method}`);
      lines.push(`          threshold: ${n.output.confidence.threshold}`);
    }
    if (n.condition) {
      lines.push('      condition:');
      if (n.condition.type) lines.push(`        type: ${n.condition.type}`);
      if (n.condition.observation) lines.push(`        observation: ${n.condition.observation}`);
      if (n.condition.feature) lines.push(`        feature: ${n.condition.feature}`);
      if (n.condition.operator) lines.push(`        operator: ${n.condition.operator}`);
      if (n.condition.value !== undefined) lines.push(`        value: ${n.condition.value}`);
      if (n.condition.for) lines.push(`        for: ${n.condition.for}`);
      if (n.condition.within) lines.push(`        within: ${n.condition.within}`);
    }
    lines.push('');
  });

  // Analysis
  lines.push('analysis:');
  lines.push('  qualitative:');
  lines.push('    mcs: true');
  lines.push('    mps: true');
  lines.push('    max_order: 4');
  lines.push('    output: mcs_list');
  lines.push('  quantitative:');
  lines.push('    method: frequency_approx');
  lines.push('    source: historical_events');
  lines.push('    window: ${window_30m}');
  lines.push('    min_samples: 5');
  lines.push('');

  // Diagnosis
  lines.push('diagnosis:');
  lines.push('  conclusions:');
  ftaDoc.diagnosis.conclusions.forEach((c) => {
    lines.push(`    - id: ${c.id}`);
    lines.push(`      when: ${c.when}`);
    lines.push(`      text: "${c.text}"`);
    lines.push(`      severity: ${c.severity}`);
    lines.push('      recommendations:');
    (c.recommendations || []).forEach((r) => {
      lines.push(`        - "${r}"`);
    });
    lines.push('');
  });

  if (ftaDoc.diagnosis.evidence_report) {
    lines.push('  evidence_report:');
    lines.push('    include:');
    (ftaDoc.diagnosis.evidence_report.include || []).forEach((inc) => {
      lines.push(`      - ${inc}`);
    });
    lines.push('    timeline: true');
    lines.push('    quality_report: true');
    lines.push('');
  }

  if (ftaDoc.diagnosis.mcs_matched && ftaDoc.diagnosis.mcs_matched.length > 0) {
    lines.push('  mcs_matched:');
    ftaDoc.diagnosis.mcs_matched.forEach((mcs) => {
      lines.push(`    - [${mcs.join(', ')}]`);
    });
    lines.push('');
  }

  // Tests
  if (ftaDoc.tests && ftaDoc.tests.length > 0) {
    lines.push('tests:');
    ftaDoc.tests.forEach((t) => {
      lines.push(`  - name: ${t.name}`);
      lines.push('    given:');
      lines.push('      observations:');
      Object.entries(t.given.observations).forEach(([k, v]) => {
        if (typeof v === 'object') {
          lines.push(`        ${k}: ${JSON.stringify(v)}`);
        } else {
          lines.push(`        ${k}: ${v}`);
        }
      });
      lines.push('    expect:');
      lines.push(`      conclusions: [${t.expect.conclusions.join(', ')}]`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * 统一获取故障对应的 FTA 标准文档（支持系统预置或动态生成）
 */
export function getFtaDocumentForFault(
  faultOrId: string | FaultPattern,
  allFaults?: FaultPattern[]
): FaultTreeDocument {
  if (typeof faultOrId === 'string') {
    const matched = allFaults?.find((f) => f.id === faultOrId);
    if (matched?.fta_document) {
      return matched.fta_document;
    }
    if (PREBUILT_FTA_DOCUMENTS[faultOrId]) {
      return PREBUILT_FTA_DOCUMENTS[faultOrId];
    }
    if (matched) {
      return generateFtaDocumentFromFault(matched);
    }
    return PREBUILT_FTA_DOCUMENTS['FT-ESS-CLUSTER-OVERHEAT'];
  }
  if (faultOrId.fta_document) {
    return faultOrId.fta_document;
  }
  return PREBUILT_FTA_DOCUMENTS[faultOrId.id] || generateFtaDocumentFromFault(faultOrId);
}
