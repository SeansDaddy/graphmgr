import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Archive,
  Rocket,
  RotateCcw,
  Download,
  Copy,
  Clock,
  FileCode,
} from 'lucide-react';
import {
  generateFaultsYaml,
  generateDevicesYaml,
  generateProceduresYaml,
  generateAlarmsYaml,
  generateFullSystemYamlBundle,
  downloadFile,
} from '../utils/yamlUtils';

export const VersionManager: React.FC = () => {
  const {
    versionSnapshots,
    devices,
    faults,
    sops,
    alarms,
    draftCount,
    publishAllDrafts,
    rollbackVersion,
    showToast,
  } = useApp();

  const [activeYamlTab, setActiveYamlTab] = useState<'faults' | 'devices' | 'procedures' | 'alarms'>('faults');
  const [releaseNote, setReleaseNote] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Generate current live YAML files
  const currentYamls = useMemo(() => {
    return {
      faults: generateFaultsYaml(faults),
      devices: generateDevicesYaml(devices),
      procedures: generateProceduresYaml(sops),
      alarms: generateAlarmsYaml(alarms),
    };
  }, [faults, devices, sops, alarms]);

  const handleCopyYaml = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    showToast(`已复制 ${name} 至剪贴板`, 'success');
  };

  const handleDownloadSingle = (content: string, filename: string) => {
    downloadFile(content, filename);
    showToast(`已开始下载 ${filename}`, 'success');
  };

  const handleDownloadAll = () => {
    const bundle = generateFullSystemYamlBundle(devices, faults, sops, alarms);
    downloadFile(bundle['fault_patterns.yaml'], 'fault_patterns.yaml');
    setTimeout(() => {
      downloadFile(bundle['devices.yaml'], 'devices.yaml');
    }, 200);
    setTimeout(() => {
      downloadFile(bundle['recovery_procedures.yaml'], 'recovery_procedures.yaml');
    }, 400);
    showToast('已打包下载全部 DiagnosGraph 结构化 YAML 资产', 'success');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Archive className="w-5 h-5 text-slate-700" />
            <span>版本管理与 DiagnosGraph 资产发布</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            遵循"草稿先验证、发布入引擎"原则，支持全量版本快照、历史安全回滚与标准 YAML 导出
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleDownloadAll}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>打包导出全部 YAML</span>
          </button>

          {draftCount > 0 && (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
            >
              <Rocket className="w-3.5 h-3.5 text-slate-300" />
              <span>发布版本 ({draftCount} 条草稿)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid: Left Snapshots History + Right YAML Asset Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Version Snapshots List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs h-[750px] flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4.5 h-4.5 text-slate-700" />
              <span>历史发布版本与快照记录</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">1-Click 无损回滚</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {versionSnapshots.map((snap, idx) => (
              <div
                key={snap.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 text-xs hover:border-slate-300 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-white border border-slate-200">
                      {snap.version}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        当前运行引擎版本
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px]">{snap.timestamp}</span>
                    <span className="text-slate-500">• {snap.author}</span>
                  </div>
                  <p className="text-slate-800 font-medium text-xs">{snap.message}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>设备: {snap.stats.devices}</span>
                    <span>故障: {snap.stats.faults}</span>
                    <span>SOP: {snap.stats.procedures}</span>
                    <span>告警: {snap.stats.alarms}</span>
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    onClick={() => rollbackVersion(snap.id)}
                    className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium transition shadow-xs self-start"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>回滚至此版本</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: YAML Asset Hub */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs h-[750px] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4.5 h-4.5 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                DiagnosGraph 运行时 YAML 文件结构中心
              </h3>
            </div>

            {/* Tab buttons */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveYamlTab('faults')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeYamlTab === 'faults'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                fault_patterns.yaml
              </button>
              <button
                onClick={() => setActiveYamlTab('devices')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeYamlTab === 'devices'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                devices.yaml
              </button>
              <button
                onClick={() => setActiveYamlTab('procedures')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeYamlTab === 'procedures'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                recovery_procedures.yaml
              </button>
              <button
                onClick={() => setActiveYamlTab('alarms')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeYamlTab === 'alarms'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                alarm_mappings.yaml
              </button>
            </div>
          </div>

          {/* Active Tab Content */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <span className="truncate mr-2 font-medium">
                {activeYamlTab === 'faults' && '包含全部储能故障模式、诱因机理、症状指标与传播链'}
                {activeYamlTab === 'devices' && '包含全站 5 级 BOM 设备拓扑树及关联关系'}
                {activeYamlTab === 'procedures' && '包含应急处置 SOP 作业指导书与自动升级规则'}
                {activeYamlTab === 'alarms' && '包含标准告警类型与触发阈值映射'}
              </span>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() =>
                    handleCopyYaml(
                      currentYamls[activeYamlTab],
                      `${activeYamlTab}.yaml`
                    )
                  }
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>复制 YAML</span>
                </button>
                <button
                  onClick={() =>
                    handleDownloadSingle(
                      currentYamls[activeYamlTab],
                      `${activeYamlTab}.yaml`
                    )
                  }
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>下载单文件</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto overflow-y-auto flex-1 leading-relaxed shadow-xs">
              {currentYamls[activeYamlTab]}
            </pre>
          </div>
        </div>
      </div>

      {/* Publish Version Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl text-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-900 mb-3">
              <Rocket className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-bold text-slate-900">正式发布全站建模资产？</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              当前共有 <span className="text-slate-900 font-bold">{draftCount}</span> 条未发布草稿。发布后将自动打上版本快照标签，并同步至 DiagnosGraph 诊断引擎生效。
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                版本发布说明 (Release Notes)
              </label>
              <input
                type="text"
                value={releaseNote}
                onChange={(e) => setReleaseNote(e.target.value)}
                placeholder="如: 新增主变冷却回路与PCS过热故障机理"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700"
              >
                取消
              </button>
              <button
                onClick={() => {
                  publishAllDrafts(releaseNote || '专家工作台发布更新');
                  setShowPublishModal(false);
                }}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs"
              >
                确认打包发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
