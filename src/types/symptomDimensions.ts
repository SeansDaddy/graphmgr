// 5-Dimensional Temporal Anomaly Characterization for Energy Fault Modeling
// 能源领域故障建模 - 时序指标异常特征 5 维判定体系

// 维度 1：趋势方向 trend (指标值整体往哪走)
export type TrendDirection = 'UP' | 'DOWN' | 'FLAT' | 'REVERSAL_UP' | 'REVERSAL_DOWN';

// 维度 2：变化速率 rate (变化有多快——区分"渐变老化"和"突发故障")
export type ChangeRate = 'DRIFT' | 'GRADUAL' | 'RAPID' | 'STEP' | 'SPIKE';

// 维度 3：幅度与阈值关系 severity (偏离了多少——决定告警等级)
export type SeverityThreshold = 'IN_RANGE' | 'DEVIATION' | 'NEAR_LIMIT' | 'OVER_LIMIT' | 'OVER_DANGER';

// 维度 4：时间模式 duration (异常持续了多久、以什么节奏出现)
export type DurationPattern = 'INSTANT' | 'SHORT' | 'SUSTAINED' | 'INTERMITTENT' | 'PERIODIC' | 'PROGRESSIVE';

// 维度 5：波动特征 volatility (数据本身的"噪声"形态)
export type VolatilityPattern = 'STABLE' | 'JITTER' | 'OSCILLATION' | 'CHAOTIC' | 'DIVERGENT';

export interface DimensionItem<T extends string> {
  code: T;
  symbol: string;
  name: string;
  description: string;
  badgeClass?: string;
}

// 维度 1 配置表
export const TREND_OPTIONS: DimensionItem<TrendDirection>[] = [
  { code: 'UP', symbol: '↗', name: '上升', description: '整体趋势向上', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  { code: 'DOWN', symbol: '↘', name: '下降', description: '整体趋势向下', badgeClass: 'text-blue-700 bg-blue-50 border-blue-200' },
  { code: 'FLAT', symbol: '→', name: '平稳', description: '无明显趋势', badgeClass: 'text-slate-700 bg-slate-50 border-slate-200' },
  { code: 'REVERSAL_UP', symbol: '↗↘', name: '先升后降', description: '出现拐点', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  { code: 'REVERSAL_DOWN', symbol: '↘↗', name: '先降后升', description: '出现拐点', badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
];

// 维度 2 配置表
export const RATE_OPTIONS: DimensionItem<ChangeRate>[] = [
  { code: 'DRIFT', symbol: '⌇', name: '缓慢漂移', description: '长时间微小累积，如传感器老化', badgeClass: 'text-slate-600 bg-slate-50 border-slate-200' },
  { code: 'GRADUAL', symbol: '⤴', name: '渐变', description: '可感知的稳步变化', badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { code: 'RAPID', symbol: '⤈', name: '快速变化', description: '短时间内显著变化', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  { code: 'STEP', symbol: '⫠', name: '阶跃/突变', description: '几乎瞬间跳变，如断线、开关切换', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  { code: 'SPIKE', symbol: '⚡', name: '脉冲尖峰', description: '极短时突刺后回落', badgeClass: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
];

// 维度 3 配置表
export const SEVERITY_OPTIONS: DimensionItem<SeverityThreshold>[] = [
  { code: 'IN_RANGE', symbol: '✅', name: '正常范围', description: '在控制限内', badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { code: 'DEVIATION', symbol: '⚠', name: '轻微偏移', description: '偏离基线但未越限', badgeClass: 'text-sky-700 bg-sky-50 border-sky-200' },
  { code: 'NEAR_LIMIT', symbol: '🔶', name: '逼近阈值', description: '接近但未突破上下限', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  { code: 'OVER_LIMIT', symbol: '🔴', name: '越限', description: '突破上/下限', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  { code: 'OVER_DANGER', symbol: '🚨', name: '越危险限', description: '突破二级极限（如有）', badgeClass: 'text-red-800 bg-red-100 border-red-300' },
];

// 维度 4 配置表
export const DURATION_OPTIONS: DimensionItem<DurationPattern>[] = [
  { code: 'INSTANT', symbol: '·', name: '瞬时', description: '单点或极短时（< 1个采样周期）', badgeClass: 'text-slate-600 bg-slate-50 border-slate-200' },
  { code: 'SHORT', symbol: '─', name: '短时', description: '持续数个采样周期', badgeClass: 'text-slate-700 bg-slate-50 border-slate-200' },
  { code: 'SUSTAINED', symbol: '━━', name: '持续', description: '长时间稳定异常', badgeClass: 'text-blue-700 bg-blue-50 border-blue-200' },
  { code: 'INTERMITTENT', symbol: '┅┅', name: '间歇', description: '断断续续出现', badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
  { code: 'PERIODIC', symbol: '∿∿', name: '周期性', description: '有规律地反复出现', badgeClass: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  { code: 'PROGRESSIVE', symbol: '━━▶', name: '渐进恶化', description: '每次出现比上次更严重', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
];

// 维度 5 配置表
export const VOLATILITY_OPTIONS: DimensionItem<VolatilityPattern>[] = [
  { code: 'STABLE', symbol: '──', name: '平稳', description: '波动在正常噪声范围内', badgeClass: 'text-slate-600 bg-slate-50 border-slate-200' },
  { code: 'JITTER', symbol: '～', name: '轻微抖动', description: '小幅高频波动', badgeClass: 'text-blue-600 bg-blue-50 border-blue-200' },
  { code: 'OSCILLATION', symbol: '≈≈', name: '大幅震荡', description: '有规律的宽幅振荡', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  { code: 'CHAOTIC', symbol: '≋≋', name: '无规则剧烈波动', description: '无规律的剧烈跳变', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  { code: 'DIVERGENT', symbol: '⟋⟍', name: '发散', description: '波动幅度越来越大', badgeClass: 'text-red-700 bg-red-50 border-red-200' },
];

// 5 维分类元数据
export type FeatureDimension = 'trend' | 'rate' | 'severity' | 'duration' | 'volatility';

export interface DimensionMeta {
  key: FeatureDimension;
  name: string;
  shortName: string;
  description: string;
  symbol: string;
  badgeClass: string;
}

export const DIMENSIONS: Record<FeatureDimension, DimensionMeta> = {
  trend: {
    key: 'trend',
    name: '维度 1：趋势方向 (trend)',
    shortName: '趋势',
    description: '指标值整体往哪走',
    symbol: '↗',
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  rate: {
    key: 'rate',
    name: '维度 2：变化速率 (rate)',
    shortName: '速率',
    description: '变化有多快——区分渐变老化和突发故障',
    symbol: '⫠',
    badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  severity: {
    key: 'severity',
    name: '维度 3：幅度与阈值关系 (severity)',
    shortName: '阈值',
    description: '偏离了多少——决定告警等级',
    symbol: '🔴',
    badgeClass: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  duration: {
    key: 'duration',
    name: '维度 4：持续时程 (duration)',
    shortName: '时程',
    description: '异常持续了多久、以什么节奏出现',
    symbol: '━━',
    badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  volatility: {
    key: 'volatility',
    name: '维度 5：波动形态 (volatility)',
    shortName: '波动',
    description: '数据本身的噪声形态与振荡特征',
    symbol: '≈≈',
    badgeClass: 'text-purple-700 bg-purple-50 border-purple-200',
  },
};

// 单一特征选项定义 (每个指标只能在 5 维中选择其中 1 个特征)
export interface SingleFeatureOption {
  dimension: FeatureDimension;
  dimensionName: string;
  dimensionShortName: string;
  code: string;
  name: string;
  symbol: string;
  description: string;
  badgeClass: string;
  fullLabel: string;
}

// 全量 5 维特征平面汇总 (共 26 个工程特征)
export const ALL_5D_FEATURES: SingleFeatureOption[] = [
  // 维度 1: 趋势方向
  ...TREND_OPTIONS.map((item) => ({
    dimension: 'trend' as FeatureDimension,
    dimensionName: DIMENSIONS.trend.name,
    dimensionShortName: DIMENSIONS.trend.shortName,
    code: item.code,
    name: item.name,
    symbol: item.symbol,
    description: item.description,
    badgeClass: item.badgeClass || 'text-blue-700 bg-blue-50 border-blue-200',
    fullLabel: `[趋势] ${item.symbol} ${item.name} (${item.description})`,
  })),
  // 维度 2: 变化速率
  ...RATE_OPTIONS.map((item) => ({
    dimension: 'rate' as FeatureDimension,
    dimensionName: DIMENSIONS.rate.name,
    dimensionShortName: DIMENSIONS.rate.shortName,
    code: item.code,
    name: item.name,
    symbol: item.symbol,
    description: item.description,
    badgeClass: item.badgeClass || 'text-amber-700 bg-amber-50 border-amber-200',
    fullLabel: `[速率] ${item.symbol} ${item.name} (${item.description})`,
  })),
  // 维度 3: 幅度与阈值
  ...SEVERITY_OPTIONS.map((item) => ({
    dimension: 'severity' as FeatureDimension,
    dimensionName: DIMENSIONS.severity.name,
    dimensionShortName: DIMENSIONS.severity.shortName,
    code: item.code,
    name: item.name,
    symbol: item.symbol,
    description: item.description,
    badgeClass: item.badgeClass || 'text-rose-700 bg-rose-50 border-rose-200',
    fullLabel: `[阈值] ${item.symbol} ${item.name} (${item.description})`,
  })),
  // 维度 4: 持续时程
  ...DURATION_OPTIONS.map((item) => ({
    dimension: 'duration' as FeatureDimension,
    dimensionName: DIMENSIONS.duration.name,
    dimensionShortName: DIMENSIONS.duration.shortName,
    code: item.code,
    name: item.name,
    symbol: item.symbol,
    description: item.description,
    badgeClass: item.badgeClass || 'text-indigo-700 bg-indigo-50 border-indigo-200',
    fullLabel: `[时程] ${item.symbol} ${item.name} (${item.description})`,
  })),
  // 维度 5: 波动形态
  ...VOLATILITY_OPTIONS.map((item) => ({
    dimension: 'volatility' as FeatureDimension,
    dimensionName: DIMENSIONS.volatility.name,
    dimensionShortName: DIMENSIONS.volatility.shortName,
    code: item.code,
    name: item.name,
    symbol: item.symbol,
    description: item.description,
    badgeClass: item.badgeClass || 'text-purple-700 bg-purple-50 border-purple-200',
    fullLabel: `[波动] ${item.symbol} ${item.name} (${item.description})`,
  })),
];

/**
 * 解析并获取指标所选的【单一】5维特征
 * 每一个指标只能选择其中一个特征
 */
export function resolveSymptomSingleFeature(symptom?: {
  selected_dimension?: FeatureDimension;
  selected_feature?: string;
  trend?: TrendDirection;
  rate?: ChangeRate;
  severity_relation?: SeverityThreshold;
  duration_pattern?: DurationPattern;
  volatility?: VolatilityPattern;
  direction?: string;
}): SingleFeatureOption {
  if (!symptom) return ALL_5D_FEATURES[0];

  // 1. 如果已明确记录了选定的维度和特征代号，直接匹配
  if (symptom.selected_dimension && symptom.selected_feature) {
    const match = ALL_5D_FEATURES.find(
      (f) => f.dimension === symptom.selected_dimension && f.code === symptom.selected_feature
    );
    if (match) return match;
  }

  // 2. 否则按优先级推导唯一的显著特征
  if (symptom.rate && (symptom.rate === 'STEP' || symptom.rate === 'SPIKE' || symptom.rate === 'DRIFT' || symptom.rate === 'RAPID')) {
    const match = ALL_5D_FEATURES.find((f) => f.dimension === 'rate' && f.code === symptom.rate);
    if (match) return match;
  }

  if (symptom.severity_relation && symptom.severity_relation !== 'IN_RANGE') {
    const match = ALL_5D_FEATURES.find((f) => f.dimension === 'severity' && f.code === symptom.severity_relation);
    if (match) return match;
  }

  if (symptom.volatility && symptom.volatility !== 'STABLE') {
    const match = ALL_5D_FEATURES.find((f) => f.dimension === 'volatility' && f.code === symptom.volatility);
    if (match) return match;
  }

  if (symptom.duration_pattern && symptom.duration_pattern !== 'SUSTAINED') {
    const match = ALL_5D_FEATURES.find((f) => f.dimension === 'duration' && f.code === symptom.duration_pattern);
    if (match) return match;
  }

  if (symptom.trend) {
    const match = ALL_5D_FEATURES.find((f) => f.dimension === 'trend' && f.code === symptom.trend);
    if (match) return match;
  }

  // 3. 从旧版 direction 推导
  if (symptom.direction) {
    const dir = symptom.direction.toLowerCase();
    if (dir === 'down' || dir === 'abnormal_low') {
      return ALL_5D_FEATURES.find((f) => f.dimension === 'trend' && f.code === 'DOWN') || ALL_5D_FEATURES[0];
    }
    if (dir === 'jump') {
      return ALL_5D_FEATURES.find((f) => f.dimension === 'rate' && f.code === 'STEP') || ALL_5D_FEATURES[0];
    }
    if (dir === 'fluctuate') {
      return ALL_5D_FEATURES.find((f) => f.dimension === 'volatility' && f.code === 'OSCILLATION') || ALL_5D_FEATURES[0];
    }
  }

  // 默认返回趋势上升
  return ALL_5D_FEATURES[0];
}

/**
 * 将用户选定的单一特征应用到 Symptom 对象中，保持旧字段自适应兼容
 */
export function applySingleFeatureToSymptom(
  feature: SingleFeatureOption
): {
  selected_dimension: FeatureDimension;
  selected_feature: string;
  trend?: TrendDirection;
  rate?: ChangeRate;
  severity_relation?: SeverityThreshold;
  duration_pattern?: DurationPattern;
  volatility?: VolatilityPattern;
  direction?: 'up' | 'down' | 'jump' | 'fluctuate';
} {
  const base: {
    selected_dimension: FeatureDimension;
    selected_feature: string;
    trend: TrendDirection;
    rate: ChangeRate;
    severity_relation: SeverityThreshold;
    duration_pattern: DurationPattern;
    volatility: VolatilityPattern;
    direction: 'up' | 'down' | 'jump' | 'fluctuate';
  } = {
    selected_dimension: feature.dimension,
    selected_feature: feature.code,
    trend: 'UP',
    rate: 'GRADUAL',
    severity_relation: 'OVER_LIMIT',
    duration_pattern: 'SUSTAINED',
    volatility: 'STABLE',
    direction: 'up',
  };

  if (feature.dimension === 'trend') {
    base.trend = feature.code as TrendDirection;
    base.direction = feature.code === 'DOWN' || feature.code === 'REVERSAL_DOWN' ? 'down' : 'up';
  } else if (feature.dimension === 'rate') {
    base.rate = feature.code as ChangeRate;
    base.direction = feature.code === 'STEP' || feature.code === 'SPIKE' ? 'jump' : 'up';
  } else if (feature.dimension === 'severity') {
    base.severity_relation = feature.code as SeverityThreshold;
    base.direction = 'up';
  } else if (feature.dimension === 'duration') {
    base.duration_pattern = feature.code as DurationPattern;
    base.direction = 'up';
  } else if (feature.dimension === 'volatility') {
    base.volatility = feature.code as VolatilityPattern;
    base.direction =
      feature.code === 'OSCILLATION' || feature.code === 'CHAOTIC' || feature.code === 'DIVERGENT'
        ? 'fluctuate'
        : 'up';
  }

  return base;
}

// 快捷组合预设 (Industrial Common Presets)
export interface Symptom5DPreset {
  id: string;
  name: string;
  description: string;
  trend: TrendDirection;
  rate: ChangeRate;
  severity: SeverityThreshold;
  duration: DurationPattern;
  volatility: VolatilityPattern;
}

export const SYMPTOM_5D_PRESETS: Symptom5DPreset[] = [
  {
    id: 'step_over_upper',
    name: '阶跃突变越上限',
    description: '瞬时跳变突破上限，如绝缘击穿、短路拉弧、快速跳闸',
    trend: 'UP',
    rate: 'STEP',
    severity: 'OVER_LIMIT',
    duration: 'SUSTAINED',
    volatility: 'STABLE',
  },
  {
    id: 'rapid_over_lower',
    name: '快速下降越下限',
    description: '短时间内急剧跌出工作下限，如泵停断流、压力崩溃、母线欠压',
    trend: 'DOWN',
    rate: 'RAPID',
    severity: 'OVER_LIMIT',
    duration: 'SUSTAINED',
    volatility: 'STABLE',
  },
  {
    id: 'gradual_temperature_rise',
    name: '稳步升温越限',
    description: '热量持续积累，温度可感知地上升并超过警戒限',
    trend: 'UP',
    rate: 'GRADUAL',
    severity: 'OVER_LIMIT',
    duration: 'SUSTAINED',
    volatility: 'STABLE',
  },
  {
    id: 'sensor_drift',
    name: '传感器微小慢漂',
    description: '长时间缓慢累积轻微偏离基线，如电极老化、零点漂移',
    trend: 'UP',
    rate: 'DRIFT',
    severity: 'DEVIATION',
    duration: 'SUSTAINED',
    volatility: 'STABLE',
  },
  {
    id: 'pulse_spike',
    name: '瞬态脉冲尖峰',
    description: '极短时剧烈冲击后回落，如雷击感应、接触器虚接电火花',
    trend: 'UP',
    rate: 'SPIKE',
    severity: 'OVER_LIMIT',
    duration: 'INSTANT',
    volatility: 'JITTER',
  },
  {
    id: 'periodic_oscillation',
    name: '周期性宽幅震荡',
    description: '控制失步或流体波动导致规律振荡，接近保护阈值',
    trend: 'FLAT',
    rate: 'RAPID',
    severity: 'NEAR_LIMIT',
    duration: 'PERIODIC',
    volatility: 'OSCILLATION',
  },
  {
    id: 'thermal_runaway_progression',
    name: '热失控渐进恶化',
    description: '单体温升加速失控，剧烈波动并突破二级危险极限',
    trend: 'UP',
    rate: 'RAPID',
    severity: 'OVER_DANGER',
    duration: 'PROGRESSIVE',
    volatility: 'CHAOTIC',
  },
];

/**
 * 将"越上限"和"越下限"通过 trend 维度自然区分，结合 severity 输出专业工业语义
 */
export function getSeverityContextLabel(severity: SeverityThreshold, trend: TrendDirection): string {
  switch (severity) {
    case 'OVER_LIMIT':
      if (trend === 'UP') return '越上限';
      if (trend === 'DOWN') return '越下限';
      if (trend === 'REVERSAL_UP') return '拐点越上限';
      if (trend === 'REVERSAL_DOWN') return '拐点越下限';
      return '突破限值';
    case 'OVER_DANGER':
      if (trend === 'UP') return '越危险上限 (二级)';
      if (trend === 'DOWN') return '越危险下限 (二级)';
      return '突破危险极值';
    case 'NEAR_LIMIT':
      if (trend === 'UP') return '逼近上限';
      if (trend === 'DOWN') return '逼近下限';
      return '逼近阈值';
    case 'DEVIATION':
      if (trend === 'UP') return '向上偏离基线';
      if (trend === 'DOWN') return '向下偏离基线';
      return '偏离基线';
    case 'IN_RANGE':
      return '正常受控';
    default:
      return '未知';
  }
}

/**
 * 获取某个 Symptom 的 5 维数据，自动对旧版 direction 进行兼容推导
 */
export function resolveSymptom5D(symptom?: {
  trend?: TrendDirection;
  rate?: ChangeRate;
  severity_relation?: SeverityThreshold;
  duration_pattern?: DurationPattern;
  volatility?: VolatilityPattern;
  direction?: string;
  selected_dimension?: FeatureDimension;
  selected_feature?: string;
}): {
  trend: TrendDirection;
  rate: ChangeRate;
  severity: SeverityThreshold;
  duration: DurationPattern;
  volatility: VolatilityPattern;
  trendObj: DimensionItem<TrendDirection>;
  rateObj: DimensionItem<ChangeRate>;
  severityObj: DimensionItem<SeverityThreshold>;
  durationObj: DimensionItem<DurationPattern>;
  volatilityObj: DimensionItem<VolatilityPattern>;
  contextualSeverity: string;
  summaryText: string;
  formulaCode: string;
  singleFeature: SingleFeatureOption;
} {
  const safeSymptom = symptom || {};
  // 如果已显式定义 trend，直接取其值；否则由 direction 兼容推导
  let trend: TrendDirection = safeSymptom.trend || 'UP';
  let rate: ChangeRate = safeSymptom.rate || 'GRADUAL';
  let severity: SeverityThreshold = safeSymptom.severity_relation || 'OVER_LIMIT';
  let duration: DurationPattern = safeSymptom.duration_pattern || 'SUSTAINED';
  let volatility: VolatilityPattern = safeSymptom.volatility || 'STABLE';

  if (!safeSymptom.trend && safeSymptom.direction) {
    const dir = safeSymptom.direction.toLowerCase();
    if (dir === 'down' || dir === 'abnormal_low') {
      trend = 'DOWN';
      rate = 'RAPID';
      severity = 'OVER_LIMIT';
      duration = 'SUSTAINED';
      volatility = 'STABLE';
    } else if (dir === 'jump') {
      trend = 'UP';
      rate = 'STEP';
      severity = 'OVER_LIMIT';
      duration = 'SUSTAINED';
      volatility = 'STABLE';
    } else if (dir === 'fluctuate') {
      trend = 'FLAT';
      rate = 'RAPID';
      severity = 'NEAR_LIMIT';
      duration = 'PERIODIC';
      volatility = 'OSCILLATION';
    } else if (dir === 'abnormal') {
      trend = 'UP';
      rate = 'STEP';
      severity = 'DEVIATION';
      duration = 'SUSTAINED';
      volatility = 'STABLE';
    } else {
      trend = 'UP';
      rate = 'GRADUAL';
      severity = 'OVER_LIMIT';
      duration = 'SUSTAINED';
      volatility = 'STABLE';
    }
  }

  const trendObj = TREND_OPTIONS.find((t) => t.code === trend) || TREND_OPTIONS[0];
  const rateObj = RATE_OPTIONS.find((r) => r.code === rate) || RATE_OPTIONS[1];
  const severityObj = SEVERITY_OPTIONS.find((s) => s.code === severity) || SEVERITY_OPTIONS[3];
  const durationObj = DURATION_OPTIONS.find((d) => d.code === duration) || DURATION_OPTIONS[2];
  const volatilityObj = VOLATILITY_OPTIONS.find((v) => v.code === volatility) || VOLATILITY_OPTIONS[0];

  const contextualSeverity = getSeverityContextLabel(severity, trend);
  const summaryText = `${trendObj.symbol} ${trendObj.name} · ${rateObj.symbol} ${rateObj.name} · ${severityObj.symbol} ${contextualSeverity} · ${durationObj.symbol} ${durationObj.name} · ${volatilityObj.symbol} ${volatilityObj.name}`;
  const formulaCode = `${trend}_${rate}_${severity}_${duration}_${volatility}`;
  const singleFeature = resolveSymptomSingleFeature(safeSymptom);

  return {
    trend,
    rate,
    severity,
    duration,
    volatility,
    trendObj,
    rateObj,
    severityObj,
    durationObj,
    volatilityObj,
    contextualSeverity,
    summaryText,
    formulaCode,
    singleFeature,
  };
}

/**
 * 根据 5 维数据推导回传兼容旧代码的 direction 字段
 */
export function deriveLegacyDirection(trend: TrendDirection, rate: ChangeRate, volatility: VolatilityPattern): 'up' | 'down' | 'jump' | 'fluctuate' {
  if (volatility === 'OSCILLATION' || volatility === 'CHAOTIC' || volatility === 'DIVERGENT') {
    return 'fluctuate';
  }
  if (rate === 'STEP' || rate === 'SPIKE') {
    return 'jump';
  }
  if (trend === 'DOWN' || trend === 'REVERSAL_DOWN') {
    return 'down';
  }
  return 'up';
}
