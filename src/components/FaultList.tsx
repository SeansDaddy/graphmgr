import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SeverityLevel } from '../types';
import { GlobalNetworkGraph } from './GlobalNetworkGraph';
import {
  AlertOctagon,
  PlusCircle,
  Search,
  Trash2,
  Edit3,
  FlaskConical,
  Layers,
  Check,
  GitFork,
  LayoutGrid,
} from 'lucide-react';

export const FaultList: React.FC = () => {
  const {
    faults,
    devices,
    addFault,
    deleteFault,
    openFaultEditor,
    setSelectedFaultId,
    setActiveTab,
    publishFault,
    faultViewMode,
    setFaultViewMode,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredFaults = useMemo(() => {
    return faults.filter((f) => {
      const matchSearch =
        !searchTerm ||
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.root_cause.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [faults, searchTerm, severityFilter, statusFilter]);

  const SEVERITY_BADGES: Record<SeverityLevel, { label: string; badge: string }> = {
    critical: { label: '致命', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    high: { label: '严重', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    medium: { label: '中度', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    low: { label: '轻微', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
    info: { label: '提示', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Integrated View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <AlertOctagon className="w-5 h-5 text-slate-800" />
            <span>储能故障建模与图谱中心</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            沉淀储能电站专家故障机理、异常特征指标与全网传播图谱，支持单体建模与全局拓扑全景查看
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap sm:flex-nowrap">
          {/* Segmented View Switcher: List View vs. Global Network Graph View */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setFaultViewMode('list')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                faultViewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-slate-600" />
              <span>故障模式列表 ({faults.length})</span>
            </button>
            <button
              onClick={() => setFaultViewMode('graph')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                faultViewMode === 'graph'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-4 h-4 text-slate-600" />
              <span>传播网络图谱全景</span>
            </button>
          </div>

          <button
            onClick={() => addFault()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-slate-300" />
            <span>新建故障模式</span>
          </button>
        </div>
      </div>

      {/* Conditional View Mode */}
      {faultViewMode === 'graph' ? (
        /* Global Network Graph Mode (Embedded inside Fault Modeling) */
        <GlobalNetworkGraph embedded={true} />
      ) : (
        /* Standard Fault Cards & List Mode */
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索故障名称、编码、机理关键字..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <span>等级:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400"
                >
                  <option value="ALL">全部等级</option>
                  <option value="critical">致命 (Critical)</option>
                  <option value="high">严重 (High)</option>
                  <option value="medium">中度 (Medium)</option>
                  <option value="low">轻微 (Low)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span>状态:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400"
                >
                  <option value="ALL">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>
              </div>
            </div>
          </div>

          {/* Faults Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredFaults.map((f) => {
              const sevInfo = SEVERITY_BADGES[f.severity] || SEVERITY_BADGES.high;
              const affectedDevNames = (f.affected_devices || [])
                .map((did) => devices.find((d) => d.id === did)?.name || did)
                .slice(0, 2);

              return (
                <div
                  key={f.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 flex flex-col justify-between shadow-xs group transition"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {f.id}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${sevInfo.badge}`}>
                            {sevInfo.label}
                          </span>
                        </div>
                        <h3
                          onClick={() => openFaultEditor(f.id)}
                          className="text-sm font-bold text-slate-900 group-hover:text-slate-700 cursor-pointer transition line-clamp-1"
                        >
                          {f.name}
                        </h3>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          f.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {f.status === 'draft' ? '草稿' : '已入库'}
                      </span>
                    </div>

                    {/* Symptoms & Propagation preview */}
                    <div className="space-y-2.5 text-xs text-slate-600 mb-4">
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">
                          关联设备: {affectedDevNames.join(', ') || '未关联'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500 font-medium text-[11px]">
                          <span>特征指标 ({f.symptoms?.length || 0} 项)</span>
                          <span>传播演变 ({f.propagation_chain?.length || 0} 段)</span>
                        </div>
                        {f.symptoms?.[0] ? (
                          <div className="text-slate-700 truncate text-[11px] flex items-center space-x-1">
                            {f.symptoms[0].device_name && (
                              <span className="font-semibold text-slate-900">
                                [{f.symptoms[0].device_name}]
                              </span>
                            )}
                            <span className="truncate">{f.symptoms[0].metric_name}</span>
                            <span className="font-mono text-slate-500 shrink-0">
                              ({f.symptoms[0].direction === 'up' ? '↑' : f.symptoms[0].direction === 'down' ? '↓' : '~'})
                            </span>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px]">暂未配置特征</div>
                        )}

                        {f.propagation_chain?.[0] && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 truncate flex items-center space-x-1">
                            <span className="text-amber-700 font-medium">因果:</span>
                            <span className="truncate font-mono">
                              {f.propagation_chain[0].from_device_name || f.propagation_chain[0].from}
                              {' ➔ '}
                              {f.propagation_chain[0].to_device_name || f.propagation_chain[0].to}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => openFaultEditor(f.id)}
                        className="flex items-center space-x-1 text-slate-900 hover:text-slate-600 font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>编辑</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFaultId(f.id);
                          setActiveTab('test-playground');
                        }}
                        className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-medium"
                        title="在测试场仿真"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>测试</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {f.status === 'draft' ? (
                        <button
                          onClick={() => publishFault(f.id)}
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
                        onClick={() => deleteFault(f.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="删除故障"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFaults.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-xs">
              <AlertOctagon className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-1" />
              <h3 className="text-sm font-semibold text-slate-800">未找到符合条件的故障模式</h3>
              <p className="text-xs text-slate-500 mt-1">请尝试修改搜索词或重置筛选条件</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
