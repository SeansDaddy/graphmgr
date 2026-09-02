import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Upload,
  FileCode,
  X,
  Sparkles,
} from 'lucide-react';

export const ImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { importYamlContent, showToast } = useApp();
  const [yamlText, setYamlText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setYamlText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setYamlText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = () => {
    if (!yamlText.trim()) {
      showToast('请输入或上传 YAML 内容', 'error');
      return;
    }

    setIsProcessing(true);
    const res = importYamlContent(yamlText);
    setIsProcessing(false);

    if (res.success) {
      onClose();
      setYamlText('');
    }
  };

  // Sample templates for testing reverse import
  const SAMPLE_FAULT_YAML = `fault_patterns:
  - id: F_IMP_99
    name: 储能直流侧熔断器熔断异常
    severity: high
    affected_devices:
      - D-PCS-01
      - D-BMS-01
    root_cause: |
      ### 诱因机理
      支路瞬间短路或浪涌过流，致使高压直流快熔动作
    symptoms:
      - metric_name: 支路直流电流
        direction: down
        time_window: 0-1min
        normal_range: 200-400A
      - metric_name: 直流侧母线电压
        direction: down
        time_window: 0-1min
        normal_range: 1200-1400V
    propagation_chain:
      - from: 储能直流侧熔断器熔断异常
        to: PCS直流侧欠压告警
        time_window: 0-1min
        probability: 0.98
      - from: PCS直流侧欠压告警
        to: PCS停机降额保护
        time_window: 1-3min
        probability: 0.95
    associated_procedures:
      - RP-F002`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl text-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">反向导入 DiagnosGraph YAML 资产</h3>
              <p className="text-xs text-slate-500">
                支持导入 fault_patterns.yaml、devices.yaml 或 recovery_procedures.yaml
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop File Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
            dragOver
              ? 'border-slate-800 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            id="yaml-file-input"
            accept=".yaml,.yml"
            onChange={handleFileInput}
            className="hidden"
          />
          <label htmlFor="yaml-file-input" className="cursor-pointer space-y-1 block">
            <FileCode className="w-8 h-8 text-slate-500 mx-auto stroke-1" />
            <div className="text-xs font-semibold text-slate-800">
              拖拽 .yaml / .yml 文件至此处，或 <span className="text-slate-900 underline font-bold">点击上传</span>
            </div>
            <div className="text-[11px] text-slate-400">
              导入后将自动解析并作为"草稿"放入工作台，安全无冲突
            </div>
          </label>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700">或直接粘贴 YAML 文本内容</label>
            <button
              onClick={() => setYamlText(SAMPLE_FAULT_YAML)}
              className="text-slate-900 hover:text-slate-700 flex items-center space-x-1 text-[11px] font-medium"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>填入示例故障 YAML</span>
            </button>
          </div>
          <textarea
            rows={7}
            value={yamlText}
            onChange={(e) => setYamlText(e.target.value)}
            placeholder="粘贴如:
fault_patterns:
  - id: F001
    name: 冷却泵卡死
    ..."
            className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-slate-400 leading-relaxed"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            自动匹配: devices | fault_patterns | recovery_procedures
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700"
            >
              取消
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition disabled:opacity-50"
            >
              {isProcessing ? '解析中...' : '确认导入为草稿'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
