import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Layers,
  AlertOctagon,
  FileText,
  BellRing,
  ArrowRight,
  X,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';

export const QuickSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    devices,
    faults,
    sops,
    alarms,
    indicators,
    parameters,
    openFaultEditor,
    openSopEditor,
    openDeviceInBom,
    openIndicatorEditor,
    openParameterEditor,
    setActiveTab,
  } = useApp();
  const [query, setQuery] = useState('');

  // Keyboard shortcut Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const matchedFaults = faults
      .filter((f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q))
      .slice(0, 4)
      .map((f) => ({
        type: 'fault' as const,
        id: f.id,
        title: f.name,
        subtitle: `故障模式 • 等级: ${f.severity}`,
        action: () => {
          openFaultEditor(f.id);
          onClose();
        },
      }));

    const matchedParameters = (parameters || [])
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.domain.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((p) => ({
        type: 'parameter' as const,
        id: p.code,
        title: p.name,
        subtitle: `配置参数库 • [${p.domain}] ${p.code} (${p.param_type})`,
        action: () => {
          openParameterEditor(p.id);
          onClose();
        },
      }));

    const matchedDevices = devices
      .filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
      .slice(0, 4)
      .map((d) => ({
        type: 'device' as const,
        id: d.id,
        title: d.name,
        subtitle: `设备 BOM • 类型: ${d.device_type}`,
        action: () => {
          openDeviceInBom(d.id);
          onClose();
        },
      }));

    const matchedSops = sops
      .filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({
        type: 'sop' as const,
        id: s.id,
        title: s.name,
        subtitle: `处置 SOP • ${s.procedures.length} 步骤`,
        action: () => {
          openSopEditor(s.id);
          onClose();
        },
      }));

    const matchedAlarms = alarms
      .filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
      .slice(0, 4)
      .map((a) => ({
        type: 'alarm' as const,
        id: a.id,
        title: a.name,
        subtitle: `告警规则 • ${a.code} (阈值: ${a.default_threshold})`,
        action: () => {
          setActiveTab('alarms');
          onClose();
        },
      }));

    const matchedIndicators = (indicators || [])
      .filter(
        (ind) =>
          ind.name.toLowerCase().includes(q) ||
          ind.code.toLowerCase().includes(q) ||
          ind.domain.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((ind) => ({
        type: 'indicator' as const,
        id: ind.id,
        title: ind.name,
        subtitle: `标准指标库 • [${ind.domain}] ${ind.code} (${ind.unit})`,
        action: () => {
          openIndicatorEditor(ind.id);
          onClose();
        },
      }));

    return [
      ...matchedFaults,
      ...matchedParameters,
      ...matchedIndicators,
      ...matchedDevices,
      ...matchedSops,
      ...matchedAlarms,
    ];
  }, [
    query,
    faults,
    parameters,
    devices,
    sops,
    alarms,
    indicators,
    openFaultEditor,
    openParameterEditor,
    openSopEditor,
    openDeviceInBom,
    openIndicatorEditor,
    setActiveTab,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-xl overflow-hidden text-slate-800">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="全局搜索设备、故障模式、SOP 处置或告警代码..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {searchResults.map((item, idx) => (
            <div
              key={idx}
              onClick={item.action}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition text-xs group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:text-slate-900 transition">
                  {item.type === 'fault' && <AlertOctagon className="w-4 h-4 text-amber-600" />}
                  {item.type === 'parameter' && <SlidersHorizontal className="w-4 h-4 text-indigo-600" />}
                  {item.type === 'indicator' && <Gauge className="w-4 h-4 text-sky-600" />}
                  {item.type === 'device' && <Layers className="w-4 h-4 text-slate-600" />}
                  {item.type === 'sop' && <FileText className="w-4 h-4 text-emerald-600" />}
                  {item.type === 'alarm' && <BellRing className="w-4 h-4 text-purple-600" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-slate-950 transition">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-slate-400 group-hover:text-slate-900">
                <span className="font-mono text-[10px]">{item.id}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}

          {query.trim() && searchResults.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              未找到与 "{query}" 匹配的图谱实体
            </div>
          )}

          {!query.trim() && (
            <div className="p-4 text-xs text-slate-500 space-y-2">
              <div className="font-semibold text-slate-700">快捷建议</div>
              <div className="flex flex-wrap gap-2">
                {['冷却泵', '主变压器', 'PCS', '绝缘', '热失控', 'SOP'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
