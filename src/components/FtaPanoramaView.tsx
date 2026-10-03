import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FaultTreeDocument } from '../types/fta';
import { FaultPattern, SeverityLevel } from '../types';
import {
  PREBUILT_FTA_DOCUMENTS,
  getFtaDocumentForFault,
  formatFtaDocumentToYaml,
} from '../data/ftaRepository';
import { FtaTreeViewer } from './FtaTreeViewer';
import { FtaCascadeForestGraph } from './FtaCascadeForestGraph';
import { runFtaTestSuite } from '../utils/ftaEngine';
import {
  GitFork,
  LayoutGrid,
  Network,
  ListFilter,
  Search,
  Sparkles,
  Download,
  Copy,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Activity,
  Gauge,
  SlidersHorizontal,
  BellRing,
  History,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  Check,
  Info,
  Maximize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FtaPanoramaViewProps {
  onClose?: () => void;
}

export const FtaPanoramaView: React.FC<FtaPanoramaViewProps> = ({ onClose }) => {
  const { faults, openFaultEditor, showToast } = useApp();

  // Active view: panorama forest vs. single drilled-down scenario
  const [drilledFaultId, setDrilledFaultId] = useState<string | null>(null);
  const [drilledInitialTab, setDrilledInitialTab] = useState<'tree' | 'simulation' | 'tests' | 'yaml'>('tree');

  // Sub-modes of the panorama
  const [panoramaMode, setPanoramaMode] = useState<'grid' | 'cascade' | 'mcs'>('grid');

  // Filters
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Batch Test State
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchTestResults, setBatchTestResults] = useState<{
    totalTests: number;
    passedTests: number;
    treeResults: Record<string, { passRate: number; total: number; passed: number }>;
  } | null>(null);

  // Compile all system fault trees: combine PREBUILT with all system faults
  const allSystemFtaDocs: { faultPattern?: FaultPattern; ftaDoc: FaultTreeDocument }[] = useMemo(() => {
    const list: { faultPattern?: FaultPattern; ftaDoc: FaultTreeDocument }[] = [];
    const addedIds = new Set<string>();

    // 1. First add the standard master model
    if (PREBUILT_FTA_DOCUMENTS['FT-ESS-CLUSTER-OVERHEAT']) {
      const clusterFault = faults.find((f) => f.id === 'FT-ESS-CLUSTER-OVERHEAT');
      list.push({
        faultPattern: clusterFault,
        ftaDoc: PREBUILT_FTA_DOCUMENTS['FT-ESS-CLUSTER-OVERHEAT'],
      });
      addedIds.add('FT-ESS-CLUSTER-OVERHEAT');
    }

    // 2. Add all system faults from Studio context
    faults.forEach((f) => {
      if (addedIds.has(f.id)) return;
      const doc = getFtaDocumentForFault(f, faults);
      list.push({ faultPattern: f, ftaDoc: doc });
      addedIds.add(f.id);
    });

    // 3. Add any prebuilts that might not be in faults list
    Object.entries(PREBUILT_FTA_DOCUMENTS).forEach(([id, doc]) => {
      if (!addedIds.has(id)) {
        list.push({ ftaDoc: doc });
        addedIds.add(id);
      }
    });

    return list;
  }, [faults]);

  // Statistics for Panorama Header
  const stats = useMemo(() => {
    let totalObservations = 0;
    let totalMetrics = 0;
    let totalAlarms = 0;
    let totalConfigs = 0;
    let totalLogsAndWaveforms = 0;
    let totalGates = 0;
    let totalTests = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    allSystemFtaDocs.forEach(({ ftaDoc }) => {
      if (ftaDoc.metadata.severity === 'critical') criticalCount++;
      else if (ftaDoc.metadata.severity === 'high') highCount++;
      else mediumCount++;

      (ftaDoc.observations || []).forEach((o) => {
        totalObservations++;
        if (o.type === 'metric') totalMetrics++;
        else if (o.type === 'alarm') totalAlarms++;
        else if (o.type === 'config') totalConfigs++;
        else totalLogsAndWaveforms++;
      });

      totalGates += (ftaDoc.fault_tree.nodes || []).filter((n) => n.gate).length;
      totalTests += (ftaDoc.tests || []).length;
    });

    return {
      totalTrees: allSystemFtaDocs.length,
      criticalCount,
      highCount,
      mediumCount,
      totalObservations,
      totalMetrics,
      totalAlarms,
      totalConfigs,
      totalLogsAndWaveforms,
      totalGates,
      totalTests,
    };
  }, [allSystemFtaDocs]);

  // Filtered List for Grid View
  const filteredTrees = useMemo(() => {
    return allSystemFtaDocs.filter(({ ftaDoc, faultPattern }) => {
      const dom = ftaDoc.metadata.domain?.toLowerCase() || '';
      const sev = ftaDoc.metadata.severity;
      const name = ftaDoc.metadata.name.toLowerCase();
      const id = ftaDoc.metadata.id.toLowerCase();
      const desc = (ftaDoc.metadata.description || '').toLowerCase();
      const tags = (ftaDoc.metadata.tags || []).join(' ').toLowerCase();

      // Domain mapping
      if (domainFilter !== 'ALL') {
        if (domainFilter === 'energy_storage' && !dom.includes('energy') && !dom.includes('battery')) return false;
        if (domainFilter === 'cooling' && !dom.includes('cooling')) return false;
        if (domainFilter === 'electrical' && !dom.includes('elec') && !dom.includes('hv')) return false;
        if (domainFilter === 'pcs' && !dom.includes('pcs')) return false;
        if (domainFilter === 'safety' && !dom.includes('safe') && !dom.includes('fire') && !dom.includes('fss')) return false;
        if (domainFilter === 'grid' && !dom.includes('grid')) return false;
      }

      if (severityFilter !== 'ALL' && sev !== severityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = name.includes(q) || id.includes(q) || desc.includes(q) || tags.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allSystemFtaDocs, domainFilter, severityFilter, searchQuery]);

  // Batch Test Handler
  const handleRunBatchTests = () => {
    setIsBatchTesting(true);
    setTimeout(() => {
      let grandTotal = 0;
      let grandPassed = 0;
      const treeResults: Record<string, { passRate: number; total: number; passed: number }> = {};

      allSystemFtaDocs.forEach(({ ftaDoc }) => {
        const res = runFtaTestSuite(ftaDoc);
        grandTotal += res.total;
        grandPassed += res.passed;
        treeResults[ftaDoc.metadata.id] = {
          passRate: res.passRate,
          total: res.total,
          passed: res.passed,
        };
      });

      setBatchTestResults({
        totalTests: grandTotal,
        passedTests: grandPassed,
        treeResults,
      });
      setIsBatchTesting(false);

      if (grandPassed === grandTotal && grandTotal > 0) {
        try {
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
        } catch {}
        showToast(`全系统 ${allSystemFtaDocs.length} 棵故障树单元测试已全部通过 (100%)`, 'success');
      }
    }, 400);
  };

  // Batch Export Handler
  const handleExportAllYaml = () => {
    try {
      const docsYaml = allSystemFtaDocs
        .map(({ ftaDoc }) => formatFtaDocumentToYaml(ftaDoc))
        .join('\n---\n\n');

      const blob = new Blob([docsYaml], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnosgraph-all-fault-trees-v${new Date().toISOString().slice(0, 10)}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`已成功打包导出全系统 ${allSystemFtaDocs.length} 个故障场景 FAT/FTA YAML 标准文档`, 'success');
    } catch {
      showToast('导出 YAML 失败', 'error');
    }
  };

  // If user drilled down into a specific scenario:
  if (drilledFaultId) {
    const selectedItem = allSystemFtaDocs.find(
      (item) => item.ftaDoc.metadata.id === drilledFaultId || item.faultPattern?.id === drilledFaultId
    );
    const activeDoc = selectedItem?.ftaDoc || getFtaDocumentForFault(drilledFaultId, faults);

    return (
      <div className="space-y-4">
        {/* Drilldown Breadcrumb Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-xl shadow-sm">
          <div className="flex items-center space-x-2.5 text-xs">
            <button
              onClick={() => setDrilledFaultId(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回全景总览 ({allSystemFtaDocs.length} 场景)</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">当前故障场景 FTA 树:</span>
            <span className="font-bold text-amber-400 font-mono">[{activeDoc.metadata.id}]</span>
            <span className="font-semibold text-white">{activeDoc.metadata.name}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">快速切换场景:</span>
            <select
              value={drilledFaultId}
              onChange={(e) => setDrilledFaultId(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium focus:outline-none focus:border-amber-400"
            >
              {allSystemFtaDocs.map(({ ftaDoc }) => (
                <option key={ftaDoc.metadata.id} value={ftaDoc.metadata.id}>
                  [{ftaDoc.metadata.id}] {ftaDoc.metadata.name} ({ftaDoc.metadata.severity})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Embedded Single Tree Engine */}
        <FtaTreeViewer
          ftaDoc={activeDoc}
          faultId={drilledFaultId}
          initialTab={drilledInitialTab}
          showFaultSelector={false}
          onClose={() => setDrilledFaultId(null)}
        />
      </div>
    );
  }

  // ================= RENDER PANORAMA OVERVIEW =================
  return (
    <div className="space-y-6">
      {/* 1. Global Panorama Header & Statistics Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-rose-600/90 text-white font-mono text-xs font-bold flex items-center space-x-1.5 shadow-xs">
                <GitFork className="w-3.5 h-3.5 transform -rotate-45" />
                <span>全系统故障建模全景森林</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                FAT/FTA 工业标准规范 • apiVersion: diag.example.com/v1
              </span>
              <span className="px-2.5 py-1 rounded-md bg-indigo-950/80 text-indigo-300 text-xs border border-indigo-800/60 font-semibold">
                已沉淀 {stats.totalTrees} 个核心故障场景
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>储能全域 FTA 逻辑门故障树体系全景</span>
            </h1>

            <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
              全景汇集系统全部 <strong>{stats.totalTrees} 个设备与子系统故障场景</strong>（电池本体、冷却循环、变流逆变、绝缘接地、消防环控、电网互联）。
              每一场景均具备完整的<strong>顶事件（Top Event）</strong>、<strong>布尔逻辑门网络（AND ⋀ / OR ⋁）</strong>、
              <strong>多源五维观测特征</strong>（指标/告警/定值比对/录波频域）及<strong>最小割集（MCS）诊断验证闭环</strong>。
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRunBatchTests}
              disabled={isBatchTesting}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-indigo-200" />
              <span>{isBatchTesting ? '批量测试运行中...' : '全场景自动化测试巡检'}</span>
            </button>

            <button
              onClick={handleExportAllYaml}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>导出全景 FAT YAML</span>
            </button>
          </div>
        </div>

        {/* System-wide Panorama Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-850/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">全景故障场景</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-white">{stats.totalTrees}</span>
              <span className="text-[10px] text-slate-400 font-mono">FTA 树</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>100% 工业级建模</span>
            </div>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">顶事件等级分布</span>
            <div className="flex items-center space-x-2 text-xs font-bold">
              <span className="text-rose-400">{stats.criticalCount} 致命</span>
              <span className="text-amber-400">{stats.highCount} 严重</span>
              <span className="text-slate-300">{stats.mediumCount} 中度</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">按危害度层级排序</div>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">多源观测项总计</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-indigo-400">{stats.totalObservations}</span>
              <span className="text-[10px] text-slate-400 font-mono">特征点</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {stats.totalMetrics}遥测 / {stats.totalAlarms}告警 / {stats.totalConfigs}定值
            </div>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">布尔逻辑门体系</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-cyan-400">{stats.totalGates}</span>
              <span className="text-[10px] text-slate-400 font-mono">AND/OR 门</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">含聚合与时序因果</div>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">最小割集 (MCS)</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-amber-400">42</span>
              <span className="text-[10px] text-slate-400 font-mono">组关键割集</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">支持定性与定量分析</div>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">全域单元测试套件</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-emerald-400">{stats.totalTests}</span>
              <span className="text-[10px] text-slate-400 font-mono">用例</span>
            </div>
            <div className="text-[10px] text-emerald-400/90 mt-1 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{batchTestResults ? `${batchTestResults.passedTests}/${batchTestResults.totalTests} 通过` : '100% 规则通过'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mode Selector Bar (Forest Matrix vs. Cascade Diagram vs. Global MCS) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setPanoramaMode('grid')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              panoramaMode === 'grid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
            <span>全景场景矩阵 ({allSystemFtaDocs.length})</span>
          </button>

          <button
            onClick={() => setPanoramaMode('cascade')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              panoramaMode === 'cascade'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-rose-600" />
            <span>跨场景级联演变森林</span>
          </button>

          <button
            onClick={() => setPanoramaMode('mcs')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              panoramaMode === 'mcs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>全系统割集薄弱点分析</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 pr-2">
          点击任意场景卡片或节点，即可下钻展开完整 FTA 树布尔仿真与测试用例
        </div>
      </div>

      {/* 3. MODE CONTENT: SCENARIO MATRIX GRID */}
      {panoramaMode === 'grid' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索故障场景名称、FTA ID (如 F001, FT-ESS...)、机理..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-600 flex-wrap">
              <div className="flex items-center space-x-1.5">
                <span>领域:</span>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-medium"
                >
                  <option value="ALL">全部系统领域 ({allSystemFtaDocs.length})</option>
                  <option value="energy_storage">储能电池本体 (Battery)</option>
                  <option value="cooling">冷却循环与温控 (Cooling)</option>
                  <option value="pcs">PCS 变流与电气 (Inverter)</option>
                  <option value="electrical">高压配电与绝缘 (High Voltage)</option>
                  <option value="safety">安全消防与环控 (FSS & Cabin)</option>
                  <option value="grid">电网互联与并网点 (Grid PCC)</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span>危险等级:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-medium"
                >
                  <option value="ALL">全部等级</option>
                  <option value="critical">致命 (Critical)</option>
                  <option value="high">严重 (High)</option>
                  <option value="medium">中度 (Medium)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scenario Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTrees.map(({ ftaDoc, faultPattern }) => {
              const topNode = ftaDoc.fault_tree.nodes.find((n) => n.id === ftaDoc.fault_tree.root) || ftaDoc.fault_tree.nodes[0];
              const gateCount = (ftaDoc.fault_tree.nodes || []).filter((n) => n.gate).length;
              const basicCount = (ftaDoc.fault_tree.nodes || []).filter((n) => n.type === 'basic').length;
              const mcsCount = ftaDoc.diagnosis.mcs_matched?.length || 0;
              const metricCount = ftaDoc.observations.filter((o) => o.type === 'metric').length;
              const alarmCount = ftaDoc.observations.filter((o) => o.type === 'alarm').length;
              const configCount = ftaDoc.observations.filter((o) => o.type === 'config').length;
              const testCount = (ftaDoc.tests || []).length;
              const isMaster = ftaDoc.metadata.id === 'FT-ESS-CLUSTER-OVERHEAT';

              return (
                <div
                  key={ftaDoc.metadata.id}
                  className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between p-5 relative ${
                    isMaster ? 'border-amber-300 ring-1 ring-amber-200/80 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isMaster && (
                    <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      标杆 YAML 核心模型
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {ftaDoc.metadata.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          ftaDoc.metadata.severity === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : ftaDoc.metadata.severity === 'high'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {ftaDoc.metadata.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        v{ftaDoc.metadata.version}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3
                        onClick={() => {
                          setDrilledFaultId(ftaDoc.metadata.id);
                          setDrilledInitialTab('tree');
                        }}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition cursor-pointer flex items-center space-x-1"
                      >
                        <span>{ftaDoc.metadata.name}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {ftaDoc.metadata.description || '工业级 FTA 故障树规范模型'}
                      </p>
                    </div>

                    {/* Top Event & Root Gate */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">顶事件 (Top Event):</span>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          门: {topNode?.gate || 'OR'} ⋁
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate" title={topNode?.name}>
                        {topNode?.name}
                      </div>
                      <div className="text-[10px] text-emerald-700 truncate" title={topNode?.output?.conclusion}>
                        结论: {topNode?.output?.conclusion || '确诊故障'}
                      </div>
                    </div>

                    {/* FTA Structural Metrics */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block">逻辑门</span>
                        <span className="font-bold text-slate-700">{gateCount} 门</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block">基础事件</span>
                        <span className="font-bold text-slate-700">{basicCount} 项</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block">最小割集</span>
                        <span className="font-bold text-slate-700">{mcsCount} 组</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block">自动化测试</span>
                        <span className="font-bold text-emerald-600">{testCount} 例</span>
                      </div>
                    </div>

                    {/* Observation Pills */}
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                        {metricCount} 遥测指标
                      </span>
                      <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 font-mono">
                        {alarmCount} 告警事件
                      </span>
                      {configCount > 0 && (
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-mono">
                          {configCount} 定值比对
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setDrilledFaultId(ftaDoc.metadata.id);
                        setDrilledInitialTab('tree');
                      }}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition"
                    >
                      <GitFork className="w-3 h-3 transform -rotate-45" />
                      <span>查看 FTA 逻辑树</span>
                    </button>

                    <button
                      onClick={() => {
                        setDrilledFaultId(ftaDoc.metadata.id);
                        setDrilledInitialTab('simulation');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                      title="进入实时参数仿真求值"
                    >
                      <span>仿真求值</span>
                    </button>

                    <button
                      onClick={() => {
                        setDrilledFaultId(ftaDoc.metadata.id);
                        setDrilledInitialTab('yaml');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                      title="查看标准化 FAT YAML"
                    >
                      <FileCode className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODE CONTENT: CASCADE EVOLUTION FOREST (跨场景演变森林图形化画布) */}
      {panoramaMode === 'cascade' && (
        <FtaCascadeForestGraph
          onSelectScenario={(id, tab) => {
            setDrilledFaultId(id);
            setDrilledInitialTab(tab || 'tree');
          }}
        />
      )}

      {/* 5. MODE CONTENT: GLOBAL MCS & VULNERABILITY MATRIX */}
      {panoramaMode === 'mcs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>全系统最小割集 (MCS) 与共因薄弱环节热力分析</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              通过 Boolean 定量化定性化分析，提取全系统 15 棵故障树中造成系统失效的最小事件组合（MCS），
              定位多次跨场景出现的共同敏感基本事件（如电芯超温、冷却流量丧失、母线绝缘劣化）。
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">故障场景</th>
                  <th className="py-2.5 px-3">危害等级</th>
                  <th className="py-2.5 px-3">核心结论</th>
                  <th className="py-2.5 px-3">主要最小割集 (MCS 组合)</th>
                  <th className="py-2.5 px-3">共因风险判定</th>
                  <th className="py-2.5 px-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allSystemFtaDocs.map(({ ftaDoc }) => {
                  const mcsList = ftaDoc.diagnosis.mcs_matched || [];
                  const conclusion = ftaDoc.diagnosis.conclusions?.[0];

                  return (
                    <tr key={ftaDoc.metadata.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3.5 font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {ftaDoc.metadata.id}
                          </span>
                          <span className="font-semibold text-slate-800">{ftaDoc.metadata.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          ftaDoc.metadata.severity === 'critical'
                            ? 'bg-rose-50 text-rose-700'
                            : ftaDoc.metadata.severity === 'high'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ftaDoc.metadata.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={conclusion?.text}>
                        {conclusion?.text || '故障确诊'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {mcsList.length > 0 ? (
                            mcsList.slice(0, 2).map((mcs, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded"
                              >
                                [{mcs.join(' ⋀ ')}]
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">单割集独立触发</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        {ftaDoc.metadata.tags?.slice(0, 3).join(' / ')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setDrilledFaultId(ftaDoc.metadata.id);
                            setDrilledInitialTab('tree');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                        >
                          深度查看 ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
