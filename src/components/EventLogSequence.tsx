import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SoeLogEvent, EventSequencePattern } from '../types';
import {
  History,
  Activity,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
  Cpu,
  Flame,
  Plus,
} from 'lucide-react';

export const EventLogSequence: React.FC = () => {
  const {
    soeLogs,
    addSoeLog,
    clearSoeLogs,
    resetSoeLogs,
    eventPatterns,
    openFaultEditor,
    openSopEditor,
    showToast,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'stream' | 'patterns'>('stream');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('全部');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedPatternId, setSelectedPatternId] = useState<string>(eventPatterns[0]?.id || 'PATTERN-F001');

  // Intelligent Pattern Matching Diagnostic Result
  const [diagnosticResult, setDiagnosticResult] = useState<{
    matchedPattern: EventSequencePattern;
    confidence: number;
    matchedEventsCount: number;
    rootCauseEvent: string;
    description: string;
  } | null>(null);

  // Filter SOE Logs
  const filteredLogs = useMemo(() => {
    return soeLogs.filter((log) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = log.event_code.toLowerCase().includes(q);
        const matchName = log.event_name.toLowerCase().includes(q);
        const matchDevice = log.device_name.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDevice && !matchDetails) return false;
      }
      if (selectedSource !== '全部' && log.source !== selectedSource) {
        return false;
      }
      if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) {
        return false;
      }
      return true;
    });
  }, [soeLogs, searchQuery, selectedSource, selectedSeverity]);

  // Run sequence pattern matching diagnostic algorithm
  const runSequenceDiagnostics = () => {
    if (soeLogs.length === 0) {
      showToast('当前日志列表为空，无法进行时序匹配', 'warning');
      return;
    }

    // Collect all event codes present in the log
    const presentCodes = new Set(soeLogs.map((l) => l.event_code));

    let bestPattern: EventSequencePattern | null = null;
    let maxMatchRatio = 0;
    let matchCount = 0;

    eventPatterns.forEach((pattern) => {
      const patternCodes = pattern.expected_events.map((e) => e.event_code);
      const matched = patternCodes.filter((c) => presentCodes.has(c)).length;
      const ratio = matched / patternCodes.length;
      if (ratio > maxMatchRatio) {
        maxMatchRatio = ratio;
        bestPattern = pattern;
        matchCount = matched;
      }
    });

    if (bestPattern && maxMatchRatio >= 0.5) {
      const confidence = Math.round(maxMatchRatio * 96);
      const targetPattern = bestPattern as EventSequencePattern;
      setDiagnosticResult({
        matchedPattern: targetPattern,
        confidence,
        matchedEventsCount: matchCount,
        rootCauseEvent: targetPattern.expected_events[0]?.event_code || 'UNKNOWN',
        description: `现场 SOE 序列与标准事故链 [${targetPattern.name}] 高度吻合 (${matchCount}/${targetPattern.expected_events.length} 步吻合)。首发诱发源判定为: ${targetPattern.expected_events[0]?.event_name}。`,
      });
      showToast(`诊断完成：高度匹配故障 [${targetPattern.fault_id}] (置信度 ${confidence}%)`, 'success');
    } else {
      setDiagnosticResult(null);
      showToast('未检测到典型的已知故障事件序列模式', 'info');
    }
  };

  // Simulate inject an event
  const handleSimulateInject = () => {
    const nextOffset = soeLogs.length > 0 ? (soeLogs[soeLogs.length - 1].relative_ms || 0) + 12000 : 0;
    addSoeLog({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }) + `.${Math.floor(Math.random() * 900 + 100)}`,
      relative_ms: nextOffset,
      device_id: 'DEV-PCS-1500V',
      device_name: 'PCS 变流器 #1',
      device_type: 'pcs',
      event_code: 'PCS_PROTECTIVE_DERATING',
      event_name: '变流器触发高温保护性降额',
      severity: 'medium',
      source: 'PCS',
      details: 'IGBT 模块结温接近预警阈值 95℃，系统自动降额运行至 60% 额定功率',
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            INFO
          </span>
        );
    }
  };

  const selectedPattern = useMemo(() => {
    return eventPatterns.find((p) => p.id === selectedPatternId) || eventPatterns[0];
  }, [eventPatterns, selectedPatternId]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 font-semibold shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    SOE 日志与事件时序序列诊断
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    事件序列模式匹配
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  高精度毫秒级 SOE 时序流捕获、首发诱发源追溯及事故链模式识别引擎
                </p>
              </div>
            </div>
          </div>

          {/* 选项卡切换与快捷操作 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
              <button
                onClick={() => setActiveSubTab('stream')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  activeSubTab === 'stream'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                现场 SOE 事件时序流 ({soeLogs.length})
              </button>
              <button
                onClick={() => setActiveSubTab('patterns')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  activeSubTab === 'patterns'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                标准事故事件序列库 ({eventPatterns.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 选项卡 1: 现场 SOE 事件时序流与智能诊断 */}
      {activeSubTab === 'stream' && (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* 控制条卡片 */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={runSequenceDiagnostics}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>执行时序模式匹配诊断</span>
              </button>

              <button
                onClick={handleSimulateInject}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>模拟注入事件</span>
              </button>

              <button
                onClick={resetSoeLogs}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重载标准事故样本</span>
              </button>

              <button
                onClick={clearSoeLogs}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空</span>
              </button>
            </div>

            {/* 过滤器 */}
            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索代码、事件名或设备..."
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs w-48 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
              >
                <option value="全部">全部数据源</option>
                <option value="TMS">TMS 冷却</option>
                <option value="BMS">BMS 电池</option>
                <option value="PCS">PCS 变流</option>
                <option value="EMS">EMS 能量</option>
                <option value="FSS">FSS 消防</option>
              </select>
            </div>
          </div>

          {/* 智能诊断结果面板 (如果已触发诊断) */}
          {diagnosticResult && (
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl text-white shadow-md border border-indigo-800 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      模式识别成功 · 置信度 {diagnosticResult.confidence}%
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      首发诱因事件: {diagnosticResult.rootCauseEvent}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">
                    匹配诊断故障模式: {diagnosticResult.matchedPattern.name} ({diagnosticResult.matchedPattern.fault_id})
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {diagnosticResult.description}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => openFaultEditor(diagnosticResult.matchedPattern.fault_id)}
                    className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>查看故障详情 ({diagnosticResult.matchedPattern.fault_id})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openSopEditor(`RP-${diagnosticResult.matchedPattern.fault_id}`)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>启动处置 SOP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SOE 事件时间线与列表 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                    <th className="py-3 px-4 w-28">时序相对偏差</th>
                    <th className="py-3 px-4 w-36">绝对时间戳</th>
                    <th className="py-3 px-3 w-20 text-center">来源</th>
                    <th className="py-3 px-4 w-48">事件编码 (Event Code)</th>
                    <th className="py-3 px-4 min-w-[180px]">事件名称</th>
                    <th className="py-3 px-4 min-w-[150px]">触发设备</th>
                    <th className="py-3 px-3 w-24 text-center">严重度</th>
                    <th className="py-3 px-4 min-w-[240px]">事件上下文与详细指标</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        当前无符合条件的 SOE 记录
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => {
                      const isFirst = index === 0;
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isFirst ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* 相对时间 */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                isFirst
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              T+{(log.relative_ms / 1000).toFixed(1)}s
                            </span>
                          </td>

                          {/* 绝对时间 */}
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {log.timestamp}
                          </td>

                          {/* 来源 */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {log.source}
                            </span>
                          </td>

                          {/* 事件编码 */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                            {log.event_code}
                          </td>

                          {/* 事件名称 */}
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {log.event_name}
                            {isFirst && (
                              <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-1 py-0.5 rounded font-bold">
                                疑似首发事件
                              </span>
                            )}
                          </td>

                          {/* 触发设备 */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800">{log.device_name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{log.device_id}</div>
                          </td>

                          {/* 严重度 */}
                          <td className="py-3.5 px-3 text-center">
                            {getSeverityBadge(log.severity)}
                          </td>

                          {/* 详细指标 */}
                          <td className="py-3.5 px-4 text-slate-600 leading-relaxed">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 选项卡 2: 标准事故事件序列库 (Fault Event Sequence Patterns) */}
      {activeSubTab === 'patterns' && (
        <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6">
          {/* 左侧故障模式选择列表 */}
          <div className="w-full md:w-80 bg-white rounded-xl border border-slate-200 shadow-xs p-4 shrink-0 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              预定义事故事件序列模版
            </h3>
            {eventPatterns.map((pattern) => {
              const isSelected = pattern.id === selectedPattern.id;
              return (
                <div
                  key={pattern.id}
                  onClick={() => setSelectedPatternId(pattern.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {pattern.fault_id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {pattern.expected_events.length} 步时序
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">{pattern.name}</div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {pattern.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧详细事件时序链展示 */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {selectedPattern.fault_id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{selectedPattern.name}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {selectedPattern.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openFaultEditor(selectedPattern.fault_id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  <span>查看故障模型</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => openSopEditor(`RP-${selectedPattern.fault_id}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  <span>跳转 SOP 处置</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 垂直时间步进链展示 */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700">
                标准事件推进时序步链 (Sequence of Events Chain):
              </h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {selectedPattern.expected_events.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    {/* 时间轴圆点 */}
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 group-hover:scale-110 transition-transform"></div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {evt.event_code}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{evt.event_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                            {evt.device_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            窗口: {evt.delay_window}
                          </span>
                          {getSeverityBadge(evt.severity)}
                          {evt.mandatory && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                              必现首发
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          <strong className="text-slate-700">判定设备层级:</strong> {evt.device_type} · 步骤序号 #{evt.seq}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
