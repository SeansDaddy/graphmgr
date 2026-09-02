import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  PlusCircle,
  FileCode,
  Layers,
  AlertOctagon,
  FileText,
  FlaskConical,
  ArrowRight,
} from 'lucide-react';

export const Workbench: React.FC<{
  onOpenImportModal: () => void;
}> = ({ onOpenImportModal }) => {
  const {
    devices,
    faults,
    sops,
    alarms,
    setActiveTab,
    addDevice,
    addFault,
    addSop,
    openFaultEditor,
    openFaultsGraphView,
  } = useApp();

  // Filter tasks
  const needsReviewFaults = faults.filter((f) => f.review_status === 'needs_review' || f.status === 'draft');
  const incompleteFaults = faults.filter((f) => f.review_status === 'incomplete' || (f.symptoms.length === 0));

  // Recent edits
  const recentFaults = [...faults].slice(0, 4);

  // Time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-slate-600 text-sm font-semibold tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>华东 1 号集中式储能电站 (100MW/200MWh) 知识库</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {getGreeting()}，张工
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              欢迎回到 DiagnosGraph 领域专家建模工作台。无需编写代码与 YAML，将储能机理与运维经验沉淀为高质量结构化资产。
            </p>
          </div>

          <div className="flex flex-wrap gap-3.5 items-center">
            <button
              onClick={() => addFault()}
              className="flex items-center space-x-2.5 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-xs whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5 text-slate-300" />
              <span>新建故障模式</span>
            </button>
            <button
              onClick={() => setActiveTab('test-playground')}
              className="flex items-center space-x-2.5 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-sm font-semibold transition shadow-xs whitespace-nowrap"
            >
              <FlaskConical className="w-5 h-5 text-slate-600" />
              <span>测试场验证</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: 我的待办 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-base">我的待办</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {needsReviewFaults.length + incompleteFaults.length} 项
              </span>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setActiveTab('faults')}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-800 font-medium">待专家审核/草稿</span>
                </div>
                <span className="text-sm font-bold text-amber-700">{needsReviewFaults.length} 条</span>
              </div>

              <div
                onClick={() => setActiveTab('faults')}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-sm text-slate-800 font-medium">待完善传播链与症状</span>
                </div>
                <span className="text-sm font-bold text-slate-700">{incompleteFaults.length} 条</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>草稿改动经测试后发布</span>
            <button
              onClick={() => setActiveTab('faults')}
              className="text-slate-900 hover:text-slate-700 font-semibold flex items-center space-x-1"
            >
              <span>查看全部</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: 最近编辑 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-base">最近编辑</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">实时保存</span>
            </div>

            <div className="space-y-2.5">
              {recentFaults.map((f) => (
                <div
                  key={f.id}
                  onClick={() => openFaultEditor(f.id)}
                  className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        f.severity === 'critical'
                          ? 'bg-rose-500'
                          : f.severity === 'high'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="text-sm text-slate-800 font-medium truncate">
                      {f.name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{f.id}</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        f.status === 'draft'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {f.status === 'draft' ? '草稿' : '已发布'}
                    </span>
                    <span className="text-xs text-slate-400">{f.updated_at.split(' ')[1] || '近期'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>支持 Ctrl+S 快捷键</span>
            <button
              onClick={() => setActiveTab('faults')}
              className="text-slate-900 hover:text-slate-700 font-semibold flex items-center space-x-1"
            >
              <span>故障总览</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 3: 知识库统计 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-base">知识库资产</h3>
              </div>
              <span className="text-xs text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">v1.0.4</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div
                onClick={() => setActiveTab('devices')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition text-left"
              >
                <div className="text-xs font-medium text-slate-500">设备 BOM</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{devices.length} <span className="text-xs font-normal text-slate-500">个</span></div>
              </div>

              <div
                onClick={() => setActiveTab('faults')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition text-left"
              >
                <div className="text-xs font-medium text-slate-500">故障模式</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{faults.length} <span className="text-xs font-normal text-slate-500">个</span></div>
              </div>

              <div
                onClick={() => setActiveTab('procedures')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition text-left"
              >
                <div className="text-xs font-medium text-slate-500">处置 SOP</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{sops.length} <span className="text-xs font-normal text-slate-500">套</span></div>
              </div>

              <div
                onClick={() => setActiveTab('alarms')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition text-left"
              >
                <div className="text-xs font-medium text-slate-500">告警映射</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{alarms.length} <span className="text-xs font-normal text-slate-500">类</span></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>覆盖度 96.5%</span>
            <button
              onClick={openFaultsGraphView}
              className="text-slate-900 hover:text-slate-700 font-semibold flex items-center space-x-1"
            >
              <span>图谱全景</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Start Actions Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">快速开始与建模流</h2>
          </div>
          <span className="text-sm text-slate-500 font-medium">遵循领域专家标准工作流</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          <button
            onClick={() => addDevice({ name: '新储能设备节点', parent_id: 'ESS-01' })}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 group transition text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center mb-3 transition shadow-xs group-hover:bg-slate-900 group-hover:text-white">
              <Layers className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">+ 新建设备</span>
            <span className="text-xs text-slate-500 mt-1">挂载 BOM 拓扑树</span>
          </button>

          <button
            onClick={() => addFault()}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 group transition text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center mb-3 transition shadow-xs group-hover:bg-slate-900 group-hover:text-white">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">+ 新建故障</span>
            <span className="text-xs text-slate-500 mt-1">症状与传播链定义</span>
          </button>

          <button
            onClick={() => addSop()}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 group transition text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center mb-3 transition shadow-xs group-hover:bg-slate-900 group-hover:text-white">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">+ 新建处置</span>
            <span className="text-xs text-slate-500 mt-1">SOP 步骤与升级</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 group transition text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center mb-3 transition shadow-xs group-hover:bg-slate-900 group-hover:text-white">
              <FileCode className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">+ 导入 YAML</span>
            <span className="text-xs text-slate-500 mt-1">反向解析存量资产</span>
          </button>
        </div>
      </div>

      {/* Three Iron Rules of DiagnosGraph Studio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start space-x-4">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
            1
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">所见即所得</h4>
            <p className="text-slate-600 mt-1 text-sm leading-relaxed">
              UI 字段直接对应 fault_patterns.yaml 字段，技术评审与诊断引擎完全对齐，支持反向导入解析。
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start space-x-4">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
            2
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">领域语言优先</h4>
            <p className="text-slate-600 mt-1 text-sm leading-relaxed">
              使用"故障"、"症状"、"传播链"、"SOP 步骤"，彻底禁用程序员术语"节点/边/属性"。
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start space-x-4">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
            3
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">草稿可发布</h4>
            <p className="text-slate-600 mt-1 text-sm leading-relaxed">
              专家所有修改先在本地草稿安全暂存，经测试场模拟验证符合预期后，一键发布至诊断引擎。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
