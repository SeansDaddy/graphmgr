import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EventSequencePattern, EventSequenceStep } from '../types';
import {
  History,
  FileText,
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ExternalLink,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Terminal,
  Play,
  Layers,
  ArrowRight,
  Clock,
  Tag,
  Share2,
} from 'lucide-react';

export const EventLogSequence: React.FC = () => {
  const {
    eventPatterns,
    selectedEventPatternId,
    setSelectedEventPatternId,
    addEventPattern,
    updateEventPattern,
    deleteEventPattern,
    syncEventPatternToFault,
    faults,
    openFaultEditor,
    showToast,
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaultFilter, setSelectedFaultFilter] = useState('all');
  const [selectedLogFilter, setSelectedLogFilter] = useState('all');

  // Currently Active Pattern
  const activePattern = useMemo(() => {
    return (
      eventPatterns.find((p) => p.id === selectedEventPatternId) ||
      eventPatterns[0] ||
      null
    );
  }, [eventPatterns, selectedEventPatternId]);

  // Form State for editing
  const [formData, setFormData] = useState<Partial<EventSequencePattern>>({});

  // When activePattern changes, populate formData
  useEffect(() => {
    if (activePattern) {
      setFormData({
        ...activePattern,
        steps: activePattern.steps ? [...activePattern.steps] : [],
      });
    }
  }, [activePattern?.id]);

  // Test / Sandbox state for testing rule execution against sample logs
  const [testLogText, setTestLogText] = useState<string>(
    `2026-09-02 10:14:02.124 [TMS] [WARN] Cooling pump #1 circuit detected power supply voltage fluctuation: 378V -> 362V\n2026-09-02 10:14:03.450 [TMS] [HIGH] TMS_PUMP_CURRENT_LOST: Primary circulating pump motor current dropped to 0.0A\n2026-09-02 10:14:04.980 [TMS] [CRITICAL] TMS_FLOW_UNDERFLOW: Closed-loop coolant flow dropped below threshold 42.5 L/min\n2026-09-02 10:14:45.000 [TMS] [HIGH] TMS_PUMP_PRESSURE_COLLAPSE: Differential pressure collapsed across heat exchanger inlet/outlet\n2026-09-02 10:17:10.500 [BMS] [WARN] BMS_CELL_TEMP_HIGH_WARN: Battery module #3 max cell temperature reached 42.8°C`
  );

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    matched: boolean;
    matchedCount: number;
    matchedLines: string[];
    summary: string;
  } | null>(null);

  // Filtered patterns
  const filteredPatterns = useMemo(() => {
    return eventPatterns.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = p.id.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchFault = (p.fault_name || '').toLowerCase().includes(q) || (p.fault_id || '').toLowerCase().includes(q);
        const matchSource = (p.log_source || '').toLowerCase().includes(q);
        const matchKeywords = (p.keywords || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchFault && !matchSource && !matchKeywords) {
          return false;
        }
      }
      if (selectedFaultFilter !== 'all' && p.fault_id !== selectedFaultFilter) {
        return false;
      }
      if (selectedLogFilter !== 'all' && p.log_source !== selectedLogFilter) {
        return false;
      }
      return true;
    });
  }, [eventPatterns, searchQuery, selectedFaultFilter, selectedLogFilter]);

  // Unique log sources across all patterns
  const allLogSources = useMemo(() => {
    return Array.from(new Set(eventPatterns.map((p) => p.log_source).filter(Boolean)));
  }, [eventPatterns]);

  // Unique fault IDs across all patterns
  const allFaultIds = useMemo(() => {
    return Array.from(new Set(eventPatterns.map((p) => p.fault_id).filter(Boolean)));
  }, [eventPatterns]);

  // Preset Log Sources for quick click
  const PRESET_LOG_SOURCES = [
    { label: 'tms_system.log (热管理)', value: 'tms_system.log' },
    { label: 'bms_comm.log (电池管理)', value: 'bms_comm.log' },
    { label: 'pcs_fault.log (变流器驱动)', value: 'pcs_fault.log' },
    { label: 'fss_alarm.log (消防安全)', value: 'fss_alarm.log' },
    { label: 'ems_master.log (能量调度)', value: 'ems_master.log' },
    { label: 'system_audit.log (系统审计)', value: 'system_audit.log' },
  ];

  // Preset Time Windows
  const PRESET_TIME_WINDOWS = [
    { label: '[-5min, 0min] (故障前5分)', value: '[-5min, 0min]' },
    { label: '[-10min, 0min] (故障前10分)', value: '[-10min, 0min]' },
    { label: '[0min, +3min] (故障后3分)', value: '[0min, +3min]' },
    { label: '[-1min, +1min] (前后1分)', value: '[-1min, +1min]' },
    { label: '全时段持续生效', value: '全时段持续' },
  ];

  // Handle Save Pattern
  const handleSavePattern = () => {
    if (!formData.id) return;
    updateEventPattern(formData.id, {
      ...formData,
      name: formData.name || '未命名事件序列规则',
      log_source: formData.log_source || 'tms_system.log',
      time_window: formData.time_window || '[-5min, 0min]',
      keywords: formData.keywords || '',
      stat_type: formData.stat_type || 'count',
      stat_operator: formData.stat_operator || '>=',
      stat_threshold: formData.stat_threshold !== undefined ? formData.stat_threshold : 2,
      stat_condition:
        formData.stat_condition ||
        `${formData.stat_type || 'count'} ${formData.stat_operator || '>='} ${formData.stat_threshold || 2} ${formData.stat_unit || '次'}`,
    });
  };

  // Handle Create New Pattern
  const handleCreateNew = () => {
    const defaultFault = faults[0];
    const newId = addEventPattern({
      fault_id: defaultFault ? defaultFault.id : 'F001',
      fault_name: defaultFault ? defaultFault.name : '冷却泵故障',
      name: `新建事件序列规则 ${eventPatterns.length + 1}`,
      log_source: 'tms_system.log',
      time_window: '[-5min, 0min]',
      keywords: 'TMS_PUMP_CURRENT_LOST|TMS_FLOW_UNDERFLOW',
      match_mode: 'regex',
      stat_type: 'count',
      stat_operator: '>=',
      stat_threshold: 2,
      stat_unit: '次',
      stat_condition: '出现次数 >= 2 次',
      description: '配置针对此故障模式在指定日志文件与时段窗口内的关键字出现次数或统计判定特征',
      steps: [
        {
          seq: 1,
          step_name: '首发诱发源日志信号',
          log_source: 'tms_system.log',
          time_window: '0.0s',
          keywords: 'TMS_PUMP_CURRENT_LOST',
          stat_condition: 'count >= 1',
          mandatory: true,
        },
      ],
    });
    setSelectedEventPatternId(newId);
  };

  // Handle Sync to Fault Symptom
  const handleSyncToFault = (patternId: string) => {
    syncEventPatternToFault(patternId);
  };

  // Handle testing rule execution in sandbox
  const handleRunSandboxTest = () => {
    if (!formData.keywords || !formData.keywords.trim()) {
      showToast('请先配置关键字或正则表达式', 'warning');
      return;
    }

    const lines = testLogText.split('\n').filter((l) => l.trim().length > 0);
    const kw = formData.keywords.trim();
    const mode = formData.match_mode || 'regex';

    let matchedLines: string[] = [];

    lines.forEach((line) => {
      let isHit = false;
      try {
        if (mode === 'regex') {
          const reg = new RegExp(kw, 'i');
          isHit = reg.test(line);
        } else if (mode === 'exact') {
          isHit = line.includes(kw);
        } else {
          // contains or multi keywords separated by | or space
          const subKeys = kw.split('|').map((s) => s.trim()).filter(Boolean);
          isHit = subKeys.some((k) => line.toLowerCase().includes(k.toLowerCase()));
        }
      } catch {
        isHit = line.toLowerCase().includes(kw.toLowerCase());
      }
      if (isHit) {
        matchedLines.push(line);
      }
    });

    const threshold = Number(formData.stat_threshold || 1);
    const op = formData.stat_operator || '>=';
    let isSatisfied = false;

    if (op === '>=') isSatisfied = matchedLines.length >= threshold;
    else if (op === '>') isSatisfied = matchedLines.length > threshold;
    else if (op === '==') isSatisfied = matchedLines.length === threshold;
    else if (op === '<=') isSatisfied = matchedLines.length <= threshold;
    else if (op === '<') isSatisfied = matchedLines.length < threshold;

    setTestResult({
      tested: true,
      matched: isSatisfied,
      matchedCount: matchedLines.length,
      matchedLines,
      summary: isSatisfied
        ? `✅ 验证通过！在日志中检索到 ${matchedLines.length} 次关键字匹配，满足条件 [${formData.stat_condition || `${op} ${threshold} 次`}]，成功触发该故障症状特征！`
        : `⚠️ 未满足条件：检索到 ${matchedLines.length} 次匹配，未达到设定判定阈值 [${formData.stat_condition || `${op} ${threshold} 次`}]。`,
    });

    showToast(
      isSatisfied ? `测试通过：命中 ${matchedLines.length} 次，症状触发！` : `测试未通过：仅命中 ${matchedLines.length} 次`,
      isSatisfied ? 'success' : 'info'
    );
  };

  // Load sample log for this log source
  const handleLoadSampleLog = () => {
    if ((formData.log_source || '').includes('pcs')) {
      setTestLogText(
        `2026-09-02 14:15:00.120 [PCS] [INFO] PCS grid synchronization OK, nominal voltage 690V\n2026-09-02 14:15:15.340 [PCS] [WARN] PCS_FAN_TACHO_LOW: Inverter cabinet blower tachometer feedback 480 RPM < 1200 RPM\n2026-09-02 14:15:45.600 [PCS] [HIGH] PCS_IGBT_JUNCTION_OVERTEMP: IGBT module Phase A temperature reached 106.5°C\n2026-09-02 14:16:10.200 [PCS] [HIGH] PCS_IGBT_JUNCTION_OVERTEMP: IGBT module Phase B temperature reached 108.2°C\n2026-09-02 14:16:30.800 [PCS] [HIGH] PCS_POWER_DERATE_CMD: Initiating thermal derate step 1 (power limit 50%)\n2026-09-02 14:17:00.000 [PCS] [CRITICAL] PCS_PWM_PULSE_BLOCK_TRIP: Hardware trip triggered, gating pulse locked`
      );
    } else if ((formData.log_source || '').includes('fss')) {
      setTestLogText(
        `2026-09-02 11:04:45.000 [BMS] [INFO] Battery cluster running in steady discharge mode 0.5C\n2026-09-02 11:05:00.220 [BMS] [WARN] BMS_CELL_VOLT_MICRO_DROP: Cell #48 open circuit voltage dropped 85mV\n2026-09-02 11:05:03.450 [FSS] [HIGH] FSS_CO_CONCENTRATION_SPIKE: Gas detector channel 2 CO reading 120 ppm > threshold 50 ppm\n2026-09-02 11:05:08.800 [FSS] [CRITICAL] FSS_VOC_ELECTROLYTE_DETECTED: Organic solvent spectral absorption confirmed thermal venting\n2026-09-02 11:05:15.000 [FSS] [CRITICAL] FSS_STAGE1_ALARM_INTERLOCK: Sounder strobe active, tripping DC circuit breaker`
      );
    } else {
      setTestLogText(
        `2026-09-02 10:14:02.124 [TMS] [WARN] Cooling pump #1 circuit detected power supply voltage fluctuation: 378V -> 362V\n2026-09-02 10:14:03.450 [TMS] [HIGH] TMS_PUMP_CURRENT_LOST: Primary circulating pump motor current dropped to 0.0A\n2026-09-02 10:14:04.980 [TMS] [CRITICAL] TMS_FLOW_UNDERFLOW: Closed-loop coolant flow dropped below threshold 42.5 L/min\n2026-09-02 10:14:45.000 [TMS] [HIGH] TMS_PUMP_PRESSURE_COLLAPSE: Differential pressure collapsed across heat exchanger inlet/outlet\n2026-09-02 10:17:10.500 [BMS] [WARN] BMS_CELL_TEMP_HIGH_WARN: Battery module #3 max cell temperature reached 42.8°C`
      );
    }
  };

  // Add a step in sequence chain
  const handleAddStep = () => {
    const currentSteps = formData.steps || [];
    const nextSeq = currentSteps.length + 1;
    const newStep: EventSequenceStep = {
      seq: nextSeq,
      step_name: `时序步骤 ${nextSeq}`,
      log_source: formData.log_source || 'tms_system.log',
      time_window: `${nextSeq * 30}s`,
      keywords: 'NEW_EVENT_CODE',
      stat_condition: 'count >= 1',
      mandatory: true,
    };
    setFormData({
      ...formData,
      steps: [...currentSteps, newStep],
    });
  };

  // Remove a step
  const handleRemoveStep = (index: number) => {
    const currentSteps = [...(formData.steps || [])];
    currentSteps.splice(index, 1);
    setFormData({
      ...formData,
      steps: currentSteps.map((s, idx) => ({ ...s, seq: idx + 1 })),
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* 顶部标题栏与工作台总览 */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  事件序列与日志规则库
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  故障症状特征录入配置
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                配置查询哪个日志、哪个时段、关键字/正则及出现次数或统计条件，结构化录入故障模式的事件序列异常特征
              </p>
            </div>
          </div>

          {/* 顶部快捷统计与操作 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="px-2 py-0.5 text-slate-600">
                已录入规则: <strong className="text-slate-900">{eventPatterns.length}</strong>
              </span>
              <span className="h-3 w-px bg-slate-300" />
              <span className="px-2 py-0.5 text-slate-600">
                覆盖故障: <strong className="text-slate-900">{allFaultIds.length}</strong> 种
              </span>
              <span className="h-3 w-px bg-slate-300" />
              <span className="px-2 py-0.5 text-slate-600">
                日志源: <strong className="text-slate-900">{allLogSources.length}</strong> 个
              </span>
            </div>

            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建事件序列规则</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主体两栏布局：左侧规则列表，右侧规则录入与深度配置器 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：事件序列规则列表 */}
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          {/* 筛选与搜索 */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索规则名、故障、日志或关键字..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <select
                value={selectedFaultFilter}
                onChange={(e) => setSelectedFaultFilter(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-slate-700 bg-white truncate"
              >
                <option value="all">全部关联故障 ({eventPatterns.length})</option>
                {faults.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.id}] {f.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedLogFilter}
                onChange={(e) => setSelectedLogFilter(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-slate-700 bg-white truncate"
              >
                <option value="all">全部日志源 ({allLogSources.length})</option>
                {allLogSources.map((log) => (
                  <option key={log} value={log}>
                    {log}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 规则卡片列表 */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredPatterns.map((pattern) => {
              const isSelected = pattern.id === activePattern?.id;
              return (
                <div
                  key={pattern.id}
                  onClick={() => setSelectedEventPatternId(pattern.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {pattern.id}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {pattern.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium mb-1.5">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span className="truncate">
                          关联故障: [{pattern.fault_id}] {pattern.fault_name}
                        </span>
                      </div>

                      {/* 核心配置 4 要素直观展示 */}
                      <div className="space-y-1 bg-white/70 p-2 rounded-lg border border-slate-200/60 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">日志:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                            {pattern.log_source}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">时段:</span>
                          <span className="text-slate-700">{pattern.time_window}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">关键字:</span>
                          <span className="text-emerald-700 font-bold truncate max-w-[160px]" title={pattern.keywords}>
                            {pattern.keywords}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">统计条件:</span>
                          <span className="text-purple-700 font-bold">{pattern.stat_condition || 'count >= 1'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 快捷操作底栏 */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400">
                      {pattern.steps?.length ? `${pattern.steps.length} 步时序` : '单步查询'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncToFault(pattern.id);
                        }}
                        className="px-2 py-0.5 rounded text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200 transition font-medium flex items-center gap-0.5"
                        title="将此日志规则作为症状特征挂载到故障建模"
                      >
                        <Share2 className="w-2.5 h-2.5" />
                        <span>挂载到故障</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定要删除事件序列规则 [${pattern.name}] 吗？`)) {
                            deleteEventPattern(pattern.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="删除规则"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPatterns.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>未找到匹配的事件序列规则</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：规则录入与深度配置器 */}
        {activePattern && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 顶部操作条 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 font-mono text-xs font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {formData.id}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{formData.name}</h2>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>目标关联故障:</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    [{formData.fault_id}] {formData.fault_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => formData.fault_id && openFaultEditor(formData.fault_id)}
                    className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-medium ml-1"
                  >
                    <span>在故障建模中查看</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => formData.id && handleSyncToFault(formData.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>同步至故障异常特征</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePattern}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Save className="w-4 h-4 text-slate-200" />
                  <span>保存规则配置</span>
                </button>
              </div>
            </div>

            {/* 核心配置表单 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* 卡片头部 */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">
                    故障症状特征录入与查询要素配置 (四要素)
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  配置用于故障模式识别的日志查询模式
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      规则编号 (Rule ID)
                    </label>
                    <input
                      type="text"
                      value={formData.id || ''}
                      disabled
                      className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      规则特征名称 (Name) *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="如: 冷却泵停转与热量积聚日志规则"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      目标关联故障模式 (Associated Fault) *
                    </label>
                    <select
                      value={formData.fault_id || 'F001'}
                      onChange={(e) => {
                        const target = faults.find((f) => f.id === e.target.value);
                        setFormData({
                          ...formData,
                          fault_id: e.target.value,
                          fault_name: target ? target.name : '未知故障',
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      {faults.map((f) => (
                        <option key={f.id} value={f.id}>
                          [{f.id}] {f.name} ({f.severity.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 规则机理说明 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    故障症状产生机理与说明 (Description)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="详细描述该日志时序特征是如何伴随故障发生的，以及为什么能作为判定依据..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 核心四要素配置网格 */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      查询执行四核心要素 (哪个日志 / 哪个时段 / 关键字 / 次数统计)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 1. 哪个日志 (log_source) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                            1
                          </span>
                          <span>哪个日志 (Log Source)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">log_source</span>
                      </div>

                      <input
                        type="text"
                        value={formData.log_source || ''}
                        onChange={(e) => setFormData({ ...formData, log_source: e.target.value })}
                        placeholder="如: tms_system.log"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />

                      {/* 预设快捷日志源 */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRESET_LOG_SOURCES.map((ps) => (
                          <button
                            key={ps.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, log_source: ps.value })}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              formData.log_source === ps.value
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {ps.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. 哪个时段 (time_window) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                            2
                          </span>
                          <span>哪个时段 (Time Window)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">time_window</span>
                      </div>

                      <input
                        type="text"
                        value={formData.time_window || ''}
                        onChange={(e) => setFormData({ ...formData, time_window: e.target.value })}
                        placeholder="如: [-5min, 0min] 或 0-5min"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />

                      {/* 预设快捷时段 */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRESET_TIME_WINDOWS.map((tw) => (
                          <button
                            key={tw.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, time_window: tw.value })}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              formData.time_window === tw.value
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {tw.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. 关键字 / 正则 (keywords) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                            3
                          </span>
                          <span>关键字 / 正则 (Keywords)</span>
                        </label>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-400">模式:</span>
                          <select
                            value={formData.match_mode || 'regex'}
                            onChange={(e) =>
                              setFormData({ ...formData, match_mode: e.target.value as any })
                            }
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700"
                          >
                            <option value="regex">正则表达式 (Regex)</option>
                            <option value="contains">文本包含 (Contains)</option>
                            <option value="exact">精确匹配 (Exact)</option>
                          </select>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={formData.keywords || ''}
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        placeholder="如: TMS_PUMP_CURRENT_LOST|TMS_FLOW_UNDERFLOW"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400">
                        支持多关键字使用管道符 <code>|</code> 分隔，例如 <code>PUMP_FAULT|PRESSURE_COLLAPSE</code>
                      </p>
                    </div>

                    {/* 4. 次数或者统计 (stat_type + stat_condition) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                            4
                          </span>
                          <span>出现次数或者统计判定 (Statistics Condition)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">stat_condition</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">统计方式</label>
                          <select
                            value={formData.stat_type || 'count'}
                            onChange={(e) => {
                              const st = e.target.value as any;
                              const unit = st === 'rate' ? '次/分' : st === 'duration' ? '秒' : '次';
                              const op = formData.stat_operator || '>=';
                              const th = formData.stat_threshold !== undefined ? formData.stat_threshold : 2;
                              setFormData({
                                ...formData,
                                stat_type: st,
                                stat_unit: unit,
                                stat_condition: `${st === 'count' ? '出现次数' : st === 'rate' ? '发生频次' : '持续时长'} ${op} ${th} ${unit}`,
                              });
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                          >
                            <option value="count">出现次数 (Count)</option>
                            <option value="rate">发生频次 (Rate/min)</option>
                            <option value="duration">持续时长 (Duration s)</option>
                            <option value="first_seen">首现时刻 (First Seen)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">运算符</label>
                          <select
                            value={formData.stat_operator || '>='}
                            onChange={(e) => {
                              const op = e.target.value as any;
                              const st = formData.stat_type || 'count';
                              const th = formData.stat_threshold !== undefined ? formData.stat_threshold : 2;
                              const unit = formData.stat_unit || '次';
                              setFormData({
                                ...formData,
                                stat_operator: op,
                                stat_condition: `${st === 'count' ? '出现次数' : st === 'rate' ? '发生频次' : '持续时长'} ${op} ${th} ${unit}`,
                              });
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-800"
                          >
                            <option value=">=">&gt;= (大于等于)</option>
                            <option value=">">&gt; (大于)</option>
                            <option value="==">== (等于)</option>
                            <option value="<=">&lt;= (小于等于)</option>
                            <option value="<">&lt; (小于)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">判定阈值</label>
                          <input
                            type="number"
                            value={formData.stat_threshold !== undefined ? formData.stat_threshold : 2}
                            onChange={(e) => {
                              const th = Number(e.target.value);
                              const st = formData.stat_type || 'count';
                              const op = formData.stat_operator || '>=';
                              const unit = formData.stat_unit || '次';
                              setFormData({
                                ...formData,
                                stat_threshold: th,
                                stat_condition: `${st === 'count' ? '出现次数' : st === 'rate' ? '发生频次' : '持续时长'} ${op} ${th} ${unit}`,
                              });
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-900"
                          />
                        </div>
                      </div>

                      {/* 汇总表达 */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400 text-[11px]">判定表达式:</span>
                        <input
                          type="text"
                          value={formData.stat_condition || ''}
                          onChange={(e) => setFormData({ ...formData, stat_condition: e.target.value })}
                          className="flex-1 ml-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-purple-700 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 高级扩展：多步骤时序链编排 (Optional Multi-Step Event Chain) */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">
                        多步骤有序时序序列拆解 (可选多阶段事件链)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="text-xs px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 rounded-md font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加时序阶段</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(formData.steps || []).map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold flex items-center justify-center text-[10px]">
                            {step.seq}
                          </span>
                          <input
                            type="text"
                            value={step.step_name}
                            onChange={(e) => {
                              const newSteps = [...(formData.steps || [])];
                              newSteps[idx].step_name = e.target.value;
                              setFormData({ ...formData, steps: newSteps });
                            }}
                            placeholder="步骤名称"
                            className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-semibold w-44"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                          <input
                            type="text"
                            value={step.log_source}
                            onChange={(e) => {
                              const newSteps = [...(formData.steps || [])];
                              newSteps[idx].log_source = e.target.value;
                              setFormData({ ...formData, steps: newSteps });
                            }}
                            placeholder="日志文件"
                            className="px-2 py-1 border border-slate-200 rounded text-xs font-mono text-slate-700"
                          />
                          <input
                            type="text"
                            value={step.time_window}
                            onChange={(e) => {
                              const newSteps = [...(formData.steps || [])];
                              newSteps[idx].time_window = e.target.value;
                              setFormData({ ...formData, steps: newSteps });
                            }}
                            placeholder="发生时段 如 1.5s"
                            className="px-2 py-1 border border-slate-200 rounded text-xs font-mono text-slate-700"
                          />
                          <input
                            type="text"
                            value={step.keywords}
                            onChange={(e) => {
                              const newSteps = [...(formData.steps || [])];
                              newSteps[idx].keywords = e.target.value;
                              setFormData({ ...formData, steps: newSteps });
                            }}
                            placeholder="关键字/正则"
                            className="px-2 py-1 border border-slate-200 rounded text-xs font-mono text-emerald-700 font-bold"
                          />
                          <input
                            type="text"
                            value={step.stat_condition}
                            onChange={(e) => {
                              const newSteps = [...(formData.steps || [])];
                              newSteps[idx].stat_condition = e.target.value;
                              setFormData({ ...formData, steps: newSteps });
                            }}
                            placeholder="判定 如: count >= 1"
                            className="px-2 py-1 border border-slate-200 rounded text-xs font-mono text-purple-700"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="删除该步骤"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {(!formData.steps || formData.steps.length === 0) && (
                      <p className="text-xs text-slate-400 py-2 text-center">
                        当前为单步事件查询模式，可点击右上角“添加时序阶段”定义链式序列
                      </p>
                    )}
                  </div>
                </div>

                {/* 规则验证与测试沙盒 */}
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        规则匹配验证沙盒 (Sandbox Verification)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        检验配置的日志关键字与次数统计能否准确捕捉故障
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadSampleLog}
                        className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
                      >
                        加载样本日志
                      </button>
                      <button
                        type="button"
                        onClick={handleRunSandboxTest}
                        className="px-3 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>执行规则验证查询</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    {/* 输入测试日志文本 */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        现场日志流数据输入 (Raw Log Input):
                      </label>
                      <textarea
                        rows={6}
                        value={testLogText}
                        onChange={(e) => setTestLogText(e.target.value)}
                        placeholder="粘贴现场日志行或点击上方'加载样本日志'..."
                        className="w-full p-2.5 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed"
                      />
                    </div>

                    {/* 验证输出判定面板 */}
                    <div className="flex flex-col justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">当前测试规则:</span>
                          <span className="font-mono text-emerald-300 font-bold">
                            {formData.keywords || '未填'} ({formData.stat_condition || '无条件'})
                          </span>
                        </div>

                        {testResult ? (
                          <div className="space-y-2 mt-2">
                            <div
                              className={`p-2.5 rounded text-xs font-medium border ${
                                testResult.matched
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
                              }`}
                            >
                              {testResult.summary}
                            </div>

                            {testResult.matchedLines.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block">
                                  命中日志行 ({testResult.matchedLines.length} 行):
                                </span>
                                <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800">
                                  {testResult.matchedLines.map((line, idx) => (
                                    <div key={idx} className="text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded">
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-slate-500 text-xs">
                            点击右上角“执行规则验证查询”测试当前录入配置
                          </div>
                        )}
                      </div>

                      <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-900 mt-2">
                        <span>日志查询执行器: Regex &amp; Count Evaluator v2.0</span>
                        <span className="text-emerald-500">就绪</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
