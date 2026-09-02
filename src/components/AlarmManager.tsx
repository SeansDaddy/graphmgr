import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AlarmType, SeverityLevel } from '../types';
import {
  BellRing,
  PlusCircle,
  Search,
  Trash2,
  Edit3,
  X,
  Save,
} from 'lucide-react';

export const AlarmManager: React.FC = () => {
  const { alarms, addAlarm, updateAlarm, deleteAlarm, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal for editing/adding alarm
  const [editingAlarm, setEditingAlarm] = useState<Partial<AlarmType> | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(alarms.map((a) => a.category)));
  }, [alarms]);

  const filteredAlarms = useMemo(() => {
    return alarms.filter((a) => {
      const matchSearch =
        !searchTerm ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategory === 'ALL' || a.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [alarms, searchTerm, selectedCategory]);

  const handleSaveAlarm = () => {
    if (!editingAlarm?.name || !editingAlarm?.code) {
      showToast('请填写告警名称和告警编码', 'error');
      return;
    }

    if (editingAlarm.id && alarms.some((a) => a.id === editingAlarm.id)) {
      updateAlarm(editingAlarm.id, editingAlarm);
    } else {
      addAlarm(editingAlarm);
    }
    setEditingAlarm(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BellRing className="w-5 h-5 text-slate-800" />
            <span>告警接入与阈值映射 (Alarm Types)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            配置储能监控系统标准告警代码、传感器阈值基准及与设备、故障的映射关系
          </p>
        </div>

        <button
          onClick={() =>
            setEditingAlarm({
              code: `ALM_${Date.now().toString().slice(-4)}`,
              name: '新告警类型',
              category: '温度告警',
              severity: 'high',
              default_threshold: '60',
              unit: '°C',
              description: '',
            })
          }
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4 text-slate-300" />
          <span>新增告警类型</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索告警名称、标准代码 (ALM_)..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <span>分类筛选:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">全部分类</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alarms Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">标准告警代码</th>
                <th className="py-3.5 px-4">告警名称</th>
                <th className="py-3.5 px-4">告警类别</th>
                <th className="py-3.5 px-4">适用设备类型</th>
                <th className="py-3.5 px-4">默认触发阈值</th>
                <th className="py-3.5 px-4">严重等级</th>
                <th className="py-3.5 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlarms.map((alarm) => (
                <tr key={alarm.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-900 font-bold">{alarm.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{alarm.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                      {alarm.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {alarm.device_type}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold">
                    {alarm.default_threshold} {alarm.unit}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        alarm.severity === 'critical'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : alarm.severity === 'high'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {alarm.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setEditingAlarm(alarm)}
                        className="p-1 text-slate-500 hover:text-slate-900 transition"
                        title="编辑告警"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="删除告警"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Alarm Modal */}
      {editingAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAlarm.id ? '编辑告警类型' : '新建告警类型'}
              </h3>
              <button
                onClick={() => setEditingAlarm(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  告警标准代码 (code) *
                </label>
                <input
                  type="text"
                  value={editingAlarm.code || ''}
                  onChange={(e) => setEditingAlarm({ ...editingAlarm, code: e.target.value })}
                  placeholder="如: ALM_TRANS_OIL_OVERTEMP"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  告警名称 (name) *
                </label>
                <input
                  type="text"
                  value={editingAlarm.name || ''}
                  onChange={(e) => setEditingAlarm({ ...editingAlarm, name: e.target.value })}
                  placeholder="如: 变压器顶层油温过高告警"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">告警类别</label>
                  <input
                    type="text"
                    value={editingAlarm.category || ''}
                    onChange={(e) =>
                      setEditingAlarm({ ...editingAlarm, category: e.target.value })
                    }
                    placeholder="如: 温度告警"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">严重等级</label>
                  <select
                    value={editingAlarm.severity || 'high'}
                    onChange={(e) =>
                      setEditingAlarm({
                        ...editingAlarm,
                        severity: e.target.value as SeverityLevel,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="critical">致命 (Critical)</option>
                    <option value="high">严重 (High)</option>
                    <option value="medium">中度 (Medium)</option>
                    <option value="low">轻微 (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    默认触发阈值
                  </label>
                  <input
                    type="text"
                    value={editingAlarm.default_threshold || ''}
                    onChange={(e) =>
                      setEditingAlarm({ ...editingAlarm, default_threshold: e.target.value })
                    }
                    placeholder="如: 85"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">计量单位</label>
                  <input
                    type="text"
                    value={editingAlarm.unit || ''}
                    onChange={(e) => setEditingAlarm({ ...editingAlarm, unit: e.target.value })}
                    placeholder="如: °C / L/min / kΩ"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  告警规则与判定逻辑说明
                </label>
                <textarea
                  rows={2}
                  value={editingAlarm.description || ''}
                  onChange={(e) =>
                    setEditingAlarm({ ...editingAlarm, description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2.5">
              <button
                onClick={() => setEditingAlarm(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveAlarm}
                className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存配置</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
