import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  PlusCircle,
  Search,
  Trash2,
  Edit3,
  Clock,
  Check,
  ExternalLink,
} from 'lucide-react';

export const SopList: React.FC = () => {
  const { sops, faults, addSop, deleteSop, openSopEditor, openFaultEditor, publishSop } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSops = useMemo(() => {
    return sops.filter((s) => {
      return (
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.procedures.some((p) => p.action.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [sops, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <span>处置 SOP 库 (Recovery Procedures)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            结构化应急处置作业指导书、分步验证手段及超时自动升级策略
          </p>
        </div>

        <button
          onClick={() => addSop()}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4 text-slate-300" />
          <span>新建处置 SOP</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索 SOP 方案名称、步骤动作关键字..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">共 {sops.length} 套处置方案</span>
      </div>

      {/* SOP Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSops.map((sop) => {
          const associatedFaultObjs = (sop.associated_fault_ids || [])
            .map((fid) => faults.find((f) => f.id === fid))
            .filter(Boolean);

          return (
            <div
              key={sop.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-6 flex flex-col justify-between shadow-xs group transition"
            >
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {sop.id}
                    </span>
                    <h3
                      onClick={() => openSopEditor(sop.id)}
                      className="text-sm font-bold text-slate-900 group-hover:text-slate-700 cursor-pointer transition line-clamp-1"
                    >
                      {sop.name}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      sop.status === 'draft'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {sop.status === 'draft' ? '草稿' : '已发布'}
                  </span>
                </div>

                {/* Steps summary */}
                <div className="space-y-2.5 mb-4">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>包含 {sop.procedures.length} 个标准步骤</span>
                    <span className="flex items-center space-x-1 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sop.escalation.timeout_minutes}分钟超时升级</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-700">
                    {sop.procedures.slice(0, 2).map((p) => (
                      <div key={p.id} className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {p.step_num}
                        </span>
                        <span className="line-clamp-1">{p.action}</span>
                      </div>
                    ))}
                    {sop.procedures.length > 2 && (
                      <span className="text-[11px] text-slate-400 italic block pl-6">
                        ... 还有 {sop.procedures.length - 2} 个后续验证步骤
                      </span>
                    )}
                  </div>
                </div>

                {/* Associated faults tag */}
                {associatedFaultObjs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {associatedFaultObjs.map((f) => (
                      <span
                        key={f!.id}
                        onClick={() => openFaultEditor(f!.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer hover:bg-slate-200 transition flex items-center space-x-1"
                      >
                        <span>{f!.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => openSopEditor(sop.id)}
                  className="flex items-center space-x-1 text-slate-900 hover:text-slate-600 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>编辑 SOP 序列</span>
                </button>

                <div className="flex items-center space-x-2">
                  {sop.status === 'draft' ? (
                    <button
                      onClick={() => publishSop(sop.id)}
                      className="text-[11px] px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition shadow-xs"
                    >
                      发布
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 flex items-center space-x-0.5 font-medium">
                      <Check className="w-3 h-3" />
                      <span>已同步</span>
                    </span>
                  )}
                  <button
                    onClick={() => deleteSop(sop.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                    title="删除此 SOP"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
