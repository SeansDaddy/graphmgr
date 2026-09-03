import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import {
  Activity,
  Layers,
  AlertOctagon,
  FileText,
  BellRing,
  FlaskConical,
  GitFork,
  Archive,
  Upload,
  Download,
  Rocket,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Gauge,
  SlidersHorizontal,
  Sliders,
  History,
} from 'lucide-react';
import { generateFullSystemYamlBundle, downloadFile } from '../utils/yamlUtils';

export const Header: React.FC<{
  onOpenImportModal: () => void;
  onOpenQuickSearch: () => void;
}> = ({ onOpenImportModal, onOpenQuickSearch }) => {
  const {
    activeTab,
    setActiveTab,
    draftCount,
    publishAllDrafts,
    devices,
    faults,
    sops,
    alarms,
    indicators,
    parameters,
    soeLogs,
    showToast,
    resetToFactoryData,
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; isHot?: boolean }> = [
    { id: 'workbench', label: '工作台', icon: Activity },
    { id: 'devices', label: '设备 BOM', icon: Layers, badge: devices.length },
    { id: 'indicators', label: '指标库', icon: Gauge, badge: indicators.length },
    { id: 'parameters', label: '配置参数库', icon: SlidersHorizontal, badge: parameters.length },
    { id: 'static-configs', label: '静态配置', icon: Sliders },
    { id: 'event-logs', label: '事件序列', icon: History, badge: soeLogs.length },
    { id: 'faults', label: '故障建模', icon: AlertOctagon, badge: faults.length },
    { id: 'procedures', label: '处置 SOP', icon: FileText, badge: sops.length },
    { id: 'alarms', label: '告警接入', icon: BellRing, badge: alarms.length },
    { id: 'test-playground', label: '测试场', icon: FlaskConical, isHot: true },
    { id: 'version-manager', label: '版本与 YAML', icon: Archive },
  ];

  const handleExportAll = () => {
    setIsExporting(true);
    try {
      const bundle = generateFullSystemYamlBundle(devices, faults, sops, alarms);
      downloadFile(bundle['fault_patterns.yaml'], 'fault_patterns.yaml');
      setTimeout(() => {
        downloadFile(bundle['devices.yaml'], 'devices.yaml');
      }, 200);
      setTimeout(() => {
        downloadFile(bundle['recovery_procedures.yaml'], 'recovery_procedures.yaml');
      }, 400);
      showToast('已打包导出所有 DiagnosGraph YAML 配置文件', 'success');
    } catch {
      showToast('导出 YAML 失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-xs">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => setActiveTab('workbench')}
              className="flex items-center space-x-3 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition">
                <GitFork className="w-5 h-5 transform -rotate-45" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                    DiagnosGraph
                  </span>
                  <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                    Studio
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block whitespace-nowrap">
                  储能领域专家建模工作台
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Nav Tabs with whitespace-nowrap and large icons */}
          <nav className="hidden xl:flex items-center space-x-1.5 flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'faults' && activeTab === 'fault-editor') ||
                (item.id === 'procedures' && activeTab === 'sop-editor') ||
                (item.id === 'parameters' && activeTab === 'parameter-editor');

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-0.5 text-xs px-2 py-0.5 rounded-full font-mono font-semibold whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & Status */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
            {/* Search Trigger */}
            <button
              onClick={onOpenQuickSearch}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium transition shadow-xs whitespace-nowrap"
              title="全局搜索 (Ctrl+K)"
            >
              <Search className="w-4.5 h-4.5 text-slate-500 flex-shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">搜索</span>
              <kbd className="hidden md:inline text-xs bg-white px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 font-mono">⌘K</kbd>
            </button>

            {/* Import Button */}
            <button
              onClick={onOpenImportModal}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium transition shadow-xs whitespace-nowrap"
              title="导入已有的 YAML 知识文件"
            >
              <Upload className="w-4.5 h-4.5 text-slate-600 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">导入</span>
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium transition shadow-xs whitespace-nowrap"
              title="导出全套结构化 YAML 资产"
            >
              <Download className="w-4.5 h-4.5 text-slate-600 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">导出</span>
            </button>

            {/* Drafts vs Publish Action */}
            {draftCount > 0 ? (
              <button
                onClick={() => publishAllDrafts('一键统一发布全站建模草稿')}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs transition whitespace-nowrap"
                title="所有改动先入草稿，点击正式发布到 DiagnosGraph 诊断引擎"
              >
                <Rocket className="w-4.5 h-4.5 text-amber-300 flex-shrink-0" />
                <span className="whitespace-nowrap">发布草稿 ({draftCount})</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold whitespace-nowrap">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                <span className="whitespace-nowrap">已同步</span>
              </div>
            )}

            {/* Reset Factory */}
            <button
              onClick={() => setShowConfirmReset(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="重置为储能电站示例知识库"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Medium/Mobile Nav Horizontal Scroll Bar */}
        <div className="flex xl:hidden overflow-x-auto py-2.5 space-x-1.5 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'faults' && activeTab === 'fault-editor') ||
              (item.id === 'procedures' && activeTab === 'sop-editor') ||
              (item.id === 'parameters' && activeTab === 'parameter-editor');

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-0.5 text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                      isActive
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-xl text-slate-800">
            <div className="flex items-center space-x-3 text-slate-900 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">确认重置知识库示例数据？</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              此操作将恢复包含 24 个设备 BOM 节点、17 个储能故障模式、17 个应急处置 SOP 与 8 类告警的标准示例知识库，您当前未导出的临时草稿将被替换。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition"
              >
                取消
              </button>
              <button
                onClick={() => {
                  resetToFactoryData();
                  setShowConfirmReset(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white shadow-xs transition"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
