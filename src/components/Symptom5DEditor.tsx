import React, { useState } from 'react';
import {
  FeatureDimension,
  SingleFeatureOption,
  DIMENSIONS,
  ALL_5D_FEATURES,
  resolveSymptomSingleFeature,
  applySingleFeatureToSymptom,
  resolveSymptom5D,
  Symptom,
} from '../types';
import { Settings2, Check, Radio, Sparkles, X, Info } from 'lucide-react';

interface Symptom5DEditorProps {
  symptom: Partial<Symptom>;
  onChange: (updates: Partial<Symptom>) => void;
  compact?: boolean;
}

/**
 * 单一 5 维时序异常特征展示徽标
 * 每一个指标只能选择其中一个特征
 */
export const Symptom5DBadge: React.FC<{
  symptom: Partial<Symptom>;
  onClick?: () => void;
  showDetails?: boolean;
}> = ({ symptom, onClick, showDetails = true }) => {
  const selectedFeature = resolveSymptomSingleFeature(symptom);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-400 hover:shadow-xs bg-white' : 'cursor-default bg-slate-50'
      } border-slate-200`}
      title={`时序特征: [${selectedFeature.dimensionName}] ${selectedFeature.name} - ${selectedFeature.description} (点击修改)`}
    >
      {/* Dimension & Symbol Tag */}
      <span
        className={`px-1.5 py-0.5 rounded text-[11px] font-bold font-mono inline-flex items-center space-x-1 ${selectedFeature.badgeClass}`}
      >
        <span className="text-[12px]">{selectedFeature.symbol}</span>
        <span>{selectedFeature.dimensionShortName}</span>
      </span>

      {/* Feature Name */}
      <span className="text-xs font-semibold text-slate-800">
        {selectedFeature.name}
      </span>

      {showDetails && (
        <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-[140px]" title={selectedFeature.description}>
          · {selectedFeature.description}
        </span>
      )}

      {onClick && (
        <Settings2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 ml-0.5 transition shrink-0" />
      )}
    </button>
  );
};

/**
 * 5 维时序异常特征单选模态框
 * 明确规则：每一个指标只能选择其中 1 个特征
 */
export const Symptom5DModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  symptom: Partial<Symptom>;
  onSave: (updates: Partial<Symptom>) => void;
}> = ({ isOpen, onClose, symptom, onSave }) => {
  if (!isOpen) return null;

  const currentFeature = resolveSymptomSingleFeature(symptom);
  const [activeDimension, setActiveDimension] = useState<FeatureDimension>(currentFeature.dimension);
  const [selectedFeature, setSelectedFeature] = useState<SingleFeatureOption>(currentFeature);

  const dimensionList: FeatureDimension[] = ['trend', 'rate', 'severity', 'duration', 'volatility'];

  const handleSelectFeature = (feat: SingleFeatureOption) => {
    setSelectedFeature(feat);
  };

  const handleConfirm = () => {
    const updates = applySingleFeatureToSymptom(selectedFeature);
    onSave(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                时序 5 维判定体系 (单选模式)
              </span>
              <h3 className="text-base font-bold text-slate-900">
                异常指标时序特征选择
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                每个指标<strong>只能选择其中 1 个特征</strong>作为判定依据（趋势、速率、阈值、时程或波动）。
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dimension Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center space-x-2 overflow-x-auto">
          {dimensionList.map((dimKey) => {
            const meta = DIMENSIONS[dimKey];
            const isActive = activeDimension === dimKey;
            const hasSelected = selectedFeature.dimension === dimKey;

            return (
              <button
                key={dimKey}
                type="button"
                onClick={() => setActiveDimension(dimKey)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="font-mono">{meta.symbol}</span>
                <span>{meta.name}</span>
                {hasSelected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white ml-0.5" title="当前已选特征属于此维度" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dimension Description Bar */}
        <div className="px-6 py-2 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600 flex items-center justify-between">
          <span>{DIMENSIONS[activeDimension].description}</span>
          <span className="text-[11px] text-slate-400 font-mono">
            维度标识: {activeDimension}
          </span>
        </div>

        {/* Feature Cards Grid (Single Selection) */}
        <div className="p-6 overflow-y-auto max-h-[48vh] space-y-2.5">
          {ALL_5D_FEATURES.filter((f) => f.dimension === activeDimension).map((feature) => {
            const isSelected =
              selectedFeature.dimension === feature.dimension &&
              selectedFeature.code === feature.code;

            return (
              <div
                key={`${feature.dimension}-${feature.code}`}
                onClick={() => handleSelectFeature(feature)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold font-mono shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {feature.symbol}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">
                        {feature.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {feature.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-4">
                  {isSelected ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5 text-blue-700" />
                      <span>已选为特征</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 group-hover:text-slate-600">
                      选择此项
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-700 flex items-center space-x-2">
            <span className="text-slate-400">当前选定:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold inline-flex items-center space-x-1 ${selectedFeature.badgeClass}`}>
              <span className="font-mono">{selectedFeature.symbol}</span>
              <span>[{selectedFeature.dimensionShortName}] {selectedFeature.name}</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>确认选用此特征</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 行内时序 5 维单选特征编辑器
 * 每一个指标只能选择其中一个特征
 */
export const Symptom5DInlineSelector: React.FC<Symptom5DEditorProps> = ({
  symptom,
  onChange,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const selectedFeature = resolveSymptomSingleFeature(symptom);

  // Current value string: `${selectedFeature.dimension}:${selectedFeature.code}`
  const currentValueKey = `${selectedFeature.dimension}:${selectedFeature.code}`;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const [dim, code] = val.split(':');
    const matched = ALL_5D_FEATURES.find((f) => f.dimension === dim && f.code === code);
    if (matched) {
      const updates = applySingleFeatureToSymptom(matched);
      onChange(updates);
    }
  };

  return (
    <div className="space-y-1">
      {/* 徽标与弹窗入口 */}
      <div className="flex items-center space-x-1.5">
        <Symptom5DBadge
          symptom={symptom}
          onClick={() => setModalOpen(true)}
          showDetails={false}
        />
      </div>

      {/* 单一单选下拉菜单 (5 维分组，每个指标单选 1 项) */}
      <select
        value={currentValueKey}
        onChange={handleSelectChange}
        className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
        title="选择指标时序判定特征 (5维单选)"
      >
        <optgroup label="维度 1：趋势方向 (Trend) - 指标值整体往哪走">
          {ALL_5D_FEATURES.filter((f) => f.dimension === 'trend').map((f) => (
            <option key={`trend:${f.code}`} value={`trend:${f.code}`}>
              {f.symbol} {f.name} ({f.description})
            </option>
          ))}
        </optgroup>

        <optgroup label="维度 2：变化速率 (Rate) - 区分渐变老化与突发故障">
          {ALL_5D_FEATURES.filter((f) => f.dimension === 'rate').map((f) => (
            <option key={`rate:${f.code}`} value={`rate:${f.code}`}>
              {f.symbol} {f.name} ({f.description})
            </option>
          ))}
        </optgroup>

        <optgroup label="维度 3：幅度与阈值 (Severity) - 偏离程度与越限等级">
          {ALL_5D_FEATURES.filter((f) => f.dimension === 'severity').map((f) => (
            <option key={`severity:${f.code}`} value={`severity:${f.code}`}>
              {f.symbol} {f.name} ({f.description})
            </option>
          ))}
        </optgroup>

        <optgroup label="维度 4：持续时程 (Duration) - 异常持续与节奏模式">
          {ALL_5D_FEATURES.filter((f) => f.dimension === 'duration').map((f) => (
            <option key={`duration:${f.code}`} value={`duration:${f.code}`}>
              {f.symbol} {f.name} ({f.description})
            </option>
          ))}
        </optgroup>

        <optgroup label="维度 5：波动形态 (Volatility) - 数据噪声与振荡特征">
          {ALL_5D_FEATURES.filter((f) => f.dimension === 'volatility').map((f) => (
            <option key={`volatility:${f.code}`} value={`volatility:${f.code}`}>
              {f.symbol} {f.name} ({f.description})
            </option>
          ))}
        </optgroup>
      </select>

      {/* 5 维单选配置弹窗 */}
      <Symptom5DModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        symptom={symptom}
        onSave={onChange}
      />
    </div>
  );
};
