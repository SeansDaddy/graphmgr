// DiagnosGraph Studio - Fault Tree Analysis (FTA) Standard Types
// Conforming to apiVersion: diag.example.com/v1, kind: FaultTree

import { SeverityLevel } from './index';

export type FtaLogicGate = 'AND' | 'OR' | 'VOTE' | 'PRIORITY_AND' | 'XOR';

export type FtaNodeType =
  | 'top_event'
  | 'intermediate'
  | 'basic'
  | 'aggregate'
  | 'rule'
  | 'timeline_ref'
  | 'undeveloped';

export type FtaObservationType = 'metric' | 'alarm' | 'log' | 'config' | 'waveform';

export interface FtaMetadata {
  id: string;
  name: string;
  version: string;
  domain: string;
  asset_type: string;
  severity: SeverityLevel;
  language?: string;
  tags?: string[];
  description?: string;
}

export interface FtaVariable {
  name: string;
  type: 'duration' | 'number' | 'string' | 'boolean';
  value: string | number | boolean;
}

export interface FtaTopologyNode {
  id: string;
  type: string;
  parent?: string;
}

export interface FtaTopologyRelation {
  from: string;
  to: string;
  type: string;
}

export interface FtaWaveformAnalyzer {
  id: string;
  method: 'rms' | 'fft' | 'peak' | 'thd' | 'envelope';
  channel: string;
  harmonic?: number;
  window?: [string, string];
}

export interface FtaObservation {
  id: string;
  type: FtaObservationType;
  name: string;
  selector: {
    asset_id?: string;
    point_id?: string;
    point_type?: string;
    alarm_code?: string;
    event_type?: string;
    source?: string;
    config_type?: string;
    key?: string;
    unit?: string;
    record_type?: string;
    format?: string;
    channels?: string[];
  };
  query?: {
    range?: string;
    step?: string;
    aggregation?: string;
    latest?: boolean;
    per_child?: boolean;
    status?: string;
    within?: string;
    triggered_by?: string;
  };
  quality?: {
    require?: string[];
  };
  fields?: string[];
  compare?: {
    actual_field?: string;
    expected_from?: string;
    tolerance?: number;
    changed_within?: string;
  };
  analyzers?: FtaWaveformAnalyzer[];
}

export interface FtaConditionClause {
  observation?: string;
  operator?: string; // eq, ne, gt, gte, lt, lte, active, exists, abnormal
  value?: string | number | boolean;
  unit?: string;
  for?: string;
  within?: string;
  filter?: Record<string, any>;
  feature?: string; // for waveform analyzers
  type?: string;
  changed_within?: string;
}

export interface FtaSharedEvent {
  id: string;
  type: 'basic' | 'intermediate';
  name: string;
  condition: {
    all?: FtaConditionClause[];
    any?: FtaConditionClause[];
  } & FtaConditionClause;
}

export interface FtaSopBinding {
  sop_id?: string;
  sop_name?: string;
  step_id?: string;
  step_num?: number;
  action?: string;
  phase?: 'phase1_trigger' | 'phase2_gate' | 'phase3_top' | 'phase4_mitigation';
  phase_name?: string;
  expected_outcome?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface FtaTreeNode {
  id: string;
  type: FtaNodeType;
  name: string;
  gate?: FtaLogicGate;
  children?: string[]; // Child node IDs or shared event IDs
  weight?: number;
  condition?: {
    all?: FtaConditionClause[];
    any?: FtaConditionClause[];
  } & FtaConditionClause;
  sop_binding?: FtaSopBinding;
  output?: {
    conclusion: string;
    severity: SeverityLevel;
    confidence: {
      method: string;
      threshold: number;
    };
  };
  scope?: {
    topology?: string;
    group_by?: string;
    include_children?: boolean;
    min_children?: number;
  };
  aggregation?: {
    method?: string;
    count_threshold?: number;
    ratio_threshold?: number;
    min_distinct_children?: number;
    weights?: {
      by_severity?: boolean;
      by_asset_criticality?: boolean;
    };
  };
  on_insufficient?: {
    action: string;
    penalty: number;
  };
  timeline?: string;
  accept_partial?: boolean;
  min_matched_steps?: number;
  language?: string;
  expression?: string;
  inputs?: Array<{ observation: string }>;
  confidence?: {
    base: number;
    max: number;
  };
  note?: string;
}

export interface FtaTimelineStep {
  event: string;
  filter?: Record<string, any>;
  relation?: 'after' | 'before' | 'parallel';
  within?: string;
  tolerance?: string;
}

export interface FtaTimeline {
  id: string;
  description: string;
  correlation_key?: string;
  clock_sync?: {
    required?: boolean;
    source?: string;
    max_drift?: string;
    quality_min?: string;
  };
  ordering?: {
    mode?: string;
    time_source?: string;
    max_skew?: string;
    allow_late_arrival?: string;
    buffer_window?: string;
  };
  sequence: FtaTimelineStep[];
  on_violation?: {
    action: string;
    penalty: number;
  };
  fallback?: Array<{
    mode: string;
    require_all: boolean;
    degrade_confidence: number;
  }>;
}

export interface FtaDiagnosisConclusion {
  id: string;
  when: string; // Node ID that triggers this
  text: string;
  severity: SeverityLevel;
  recommendations: string[];
}

export interface FtaAnalysis {
  qualitative?: {
    mcs?: boolean;
    mps?: boolean;
    max_order?: number;
    output?: string;
  };
  quantitative?: {
    method?: string;
    source?: string;
    window?: string;
    min_samples?: number;
  };
}

export interface FtaDiagnosis {
  conclusions: FtaDiagnosisConclusion[];
  evidence_report?: {
    include?: string[];
    timeline?: boolean;
    quality_report?: boolean;
  };
  mcs_matched?: string[][];
}

export interface FtaTestCase {
  name: string;
  given: {
    observations: Record<string, any>;
  };
  expect: {
    conclusions: string[];
  };
}

export interface FaultTreeDocument {
  apiVersion: string;
  kind: 'FaultTree';
  metadata: FtaMetadata;
  variables?: FtaVariable[];
  context?: {
    asset?: {
      id?: string;
      type?: string;
      topology_ref?: string;
    };
    clock?: {
      require_sync?: boolean;
      min_quality?: string;
      max_drift?: string;
    };
    topology?: {
      source?: string;
      nodes: FtaTopologyNode[];
      relations?: FtaTopologyRelation[];
    };
  };
  observations: FtaObservation[];
  shared_events?: FtaSharedEvent[];
  fault_tree: {
    root: string;
    nodes: FtaTreeNode[];
  };
  timeline?: FtaTimeline[];
  analysis?: FtaAnalysis;
  diagnosis: FtaDiagnosis;
  tests?: FtaTestCase[];
}
