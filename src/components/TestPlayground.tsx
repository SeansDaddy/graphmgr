import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  DiagnosticSimulationInput,
  DiagnosticSimulationResult,
  TestScenario,
} from '../types';
import { TEST_SCENARIOS } from '../data/initialData';
import { runDiagnosticSimulation } from '../utils/diagnosticEngine';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  Layers,
  FileText,
  ArrowRight,
  GitBranch,
  Clock,
  ChevronRight,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TestPlayground: React.FC = () => {
  const { devices, faults, sops, alarms, openFaultEditor, showToast } = useApp();

  // Test scenarios
  const [scenarios] = useState<TestScenario[]>(TEST_SCENARIOS as any);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('SCENARIO-01');

  // Diagnostic Input form state
  const [inputState, setInputState] = useState<DiagnosticSimulationInput>({
    alarm_type_id: 'ALM-01',
    source_device_id: 'D-COOL-PUMP-01',
    alarm_value: '38.5',
    threshold: '35.0',
    accompanying_symptoms: [
      {
        metric_name: '冷却液流量',
        current_value: '22 L/min',
        direction: 'down',
        is_abnormal: true,
      },
      {
        metric_name: '电池舱温度',
        current_value: '38.5 °C',
        direction: 'up',
        is_abnormal: true,
      },
      {
        metric_name: '冷却泵运行电流',
        current_value: '0.1 A',
        direction: 'down',
        is_abnormal: true,
      },
    ],
  });

  // Diagnostic Result
  const [result, setResult] = useState<DiagnosticSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load preset scenario
  const handleLoadScenario = (sc: any) => {
    setActiveScenarioId(sc.id);
    setInputState({
      alarm_type_id: sc.input?.alarm_type_id || 'ALM-01',
      source_device_id: sc.input?.source_device_id || 'D-COOL-PUMP-01',
      alarm_value: String(sc.input?.alarm_value || 88.5),
      threshold: String(sc.input?.threshold || 85.0),
      accompanying_symptoms: JSON.parse(JSON.stringify(sc.input?.accompanying_symptoms || [])),
    });
    setResult(null);
    showToast(`已加载典型测试场景: ${sc.name}`, 'info');
  };

  // Run simulation
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setResult(null);

    setTimeout(() => {
      const res = runDiagnosticSimulation(inputState, devices, faults, sops, alarms);
      setResult(res);
      setIsSimulating(false);

      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      showToast(`诊断引擎完成推理：命中【${res.matched_fault_name}】(置信度: ${res.confidence}%)`, 'success');
    }, 300);
  };

  // Run on first mount for instant experience
  useEffect(() => {
    const res = runDiagnosticSimulation(inputState, devices, faults, sops, alarms);
    setResult(res);
  }, []);

  const handleUpdateSymptom = (idx: number, updates: Partial<any>) => {
    const next = [...inputState.accompanying_symptoms];
    next[idx] = { ...next[idx], ...updates };
    setInputState({ ...inputState, accompanying_symptoms: next });
  };

  const handleAddCustomSymptom = () => {
    setInputState({
      ...inputState,
      accompanying_symptoms: [
        ...inputState.accompanying_symptoms,
        {
          metric_name: '新伴随特征指标',
          current_value: '52.0°C',
          direction: 'up',
          is_abnormal: true,
        },
      ],
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
              专家闭环验证
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FlaskConical className="w-5 h-5 text-slate-700" />
              <span>诊断测试场 (运行时诊断仿真)</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            发布前注入模拟告警与实时监测信号，检验图谱搜索、故障置信度与 SOP 推荐准确性
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : 'fill-current'}`} />
          <span>{isSimulating ? '推理计算中...' : '开始模拟诊断'}</span>
        </button>
      </div>

      {/* Preset Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {scenarios.map((sc: any) => {
          const isSelected = activeScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => handleLoadScenario(sc)}
              className={`p-4 rounded-xl border cursor-pointer transition text-xs flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {sc.id}
                  </span>
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>预设用例</span>
                </div>
                <h4 className={`font-bold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>{sc.name}</h4>
                <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{sc.description}</p>
              </div>

              <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[10px] ${isSelected ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-500'}`}>
                <span>源设备: {sc.input?.source_device_id}</span>
                <span className={`font-medium flex items-center space-x-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  <span>加载</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Left Input Simulator + Right Diagnostic Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Simulation Input Setup */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-slate-700" />
              <span>1. 触发告警与现场监测参数输入</span>
            </h3>
            <span className="text-[11px] text-slate-400">可自定义修改</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">触发告警类型</label>
              <select
                value={inputState.alarm_type_id}
                onChange={(e) => setInputState({ ...inputState, alarm_type_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              >
                {alarms.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">告警发生源设备</label>
              <select
                value={inputState.source_device_id}
                onChange={(e) => setInputState({ ...inputState, source_device_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">当前实测数值</label>
                <input
                  type="text"
                  value={inputState.alarm_value}
                  onChange={(e) => setInputState({ ...inputState, alarm_value: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">标准触发阈值</label>
                <input
                  type="text"
                  value={inputState.threshold}
                  onChange={(e) => setInputState({ ...inputState, threshold: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {/* Accompanying Symptoms */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-slate-700">
                  伴随症状指标 ({inputState.accompanying_symptoms.length})
                </label>
                <button
                  onClick={handleAddCustomSymptom}
                  className="text-xs text-slate-900 hover:text-slate-700 font-medium"
                >
                  + 添加伴随指标
                </button>
              </div>

              <div className="space-y-2">
                {inputState.accompanying_symptoms.map((sym, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={sym.metric_name}
                        onChange={(e) => handleUpdateSymptom(idx, { metric_name: e.target.value })}
                        className="bg-transparent font-medium text-slate-900 focus:outline-none text-xs flex-1 mr-2"
                      />
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sym.is_abnormal}
                          onChange={(e) =>
                            handleUpdateSymptom(idx, { is_abnormal: e.target.checked })
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span
                          className={`text-[11px] font-semibold ${
                            sym.is_abnormal ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {sym.is_abnormal ? '异常状态' : '正常范围'}
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={sym.current_value}
                        onChange={(e) => handleUpdateSymptom(idx, { current_value: e.target.value })}
                        placeholder="实测值"
                        className="flex-1 px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                      />
                      <select
                        value={sym.direction || 'up'}
                        onChange={(e) =>
                          handleUpdateSymptom(idx, { direction: e.target.value as any })
                        }
                        className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                      >
                        <option value="up">↑ 持续上升</option>
                        <option value="down">↓ 骤降</option>
                        <option value="fluctuate">~ 波动</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Output / Reasoning Report */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xs">
          {result ? (
            <div className="space-y-5">
              {/* Report Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      诊断成功
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      耗时: 12ms • 推理时间: {result.execution_timestamp}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1.5 flex items-center space-x-2">
                    <span>命中故障:</span>
                    <span>{result.matched_fault_name}</span>
                    <span className="text-xs font-mono text-slate-400">({result.matched_fault_id})</span>
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {result.confidence}%
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">综合置信度</div>
                </div>
              </div>

              {/* 2 Key Metric Blocks: Current Stage + Symptom Match */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-slate-600" />
                    <span>当前故障演变阶段</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {result.propagation_stage}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>症状特征吻合度</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {result.matched_symptoms_count} / {result.total_symptoms_count} 条指标完全匹配
                  </div>
                </div>
              </div>

              {/* Graph Path Exploration */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-700" />
                  <span>图谱拓扑推理回溯路径 (Exploration Path)</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  {result.explored_path.map((nodeName, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 font-medium shadow-xs">
                        {nodeName}
                      </span>
                      {idx < result.explored_path.length - 1 && (
                        <span className="text-slate-400 font-mono">──▶</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Matched Symptoms Breakdown Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">特征指标匹配明细</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">指标名称</th>
                        <th className="py-2.5 px-3">当前模拟值</th>
                        <th className="py-2.5 px-3">知识库正常范围</th>
                        <th className="py-2.5 px-3 text-center">判定</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {result.matched_symptoms_details.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 font-semibold text-slate-800">{s.metric_name}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{s.current_value}</td>
                          <td className="py-2 px-3 text-slate-500">{s.normal_range}</td>
                          <td className="py-2 px-3 text-center">
                            {s.matched ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                吻合
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px]">
                                未激发
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommended SOP Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    <span>引擎推荐应急处置 SOP 步骤</span>
                  </div>
                  {result.escalation_note && (
                    <span className="text-[11px] text-amber-700 flex items-center space-x-1 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{result.escalation_note}</span>
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  {result.recommended_procedures.map((p) => (
                    <div key={p.id} className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        {p.step_num}
                      </span>
                      <div className="space-y-0.5">
                        <div className="text-slate-900 font-semibold">{p.action}</div>
                        <div className="text-[11px] text-slate-500">
                          验证: {p.verification} → 预期: {p.expected_outcome}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FlaskConical className="w-10 h-10 stroke-1 mb-2 text-slate-300 animate-pulse" />
              <p className="text-xs">点击上方"开始模拟诊断"执行知识库推理</p>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              验证通过后，可前往"版本发布与 YAML"发布正式资产
            </span>
            {result && (
              <button
                onClick={() => openFaultEditor(result.matched_fault_id)}
                className="text-slate-900 hover:text-slate-700 flex items-center space-x-1 font-semibold"
              >
                <span>前往调整本故障建模</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
