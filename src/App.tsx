/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { Workbench } from './components/Workbench';
import { DeviceBOMTree } from './components/DeviceBOMTree';
import { IndicatorLibrary } from './components/IndicatorLibrary';
import { FaultList } from './components/FaultList';
import { FaultEditor } from './components/FaultEditor';
import { SopList } from './components/SopList';
import { SopEditor } from './components/SopEditor';
import { AlarmManager } from './components/AlarmManager';
import { TestPlayground } from './components/TestPlayground';
import { GlobalNetworkGraph } from './components/GlobalNetworkGraph';
import { VersionManager } from './components/VersionManager';
import { ImportModal } from './components/ImportModal';
import { QuickSearchModal } from './components/QuickSearchModal';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top App Header */}
      <Header
        onOpenImportModal={() => setIsImportOpen(true)}
        onOpenQuickSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Container with fluid responsive width */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-8">
        {activeTab === 'workbench' && (
          <Workbench onOpenImportModal={() => setIsImportOpen(true)} />
        )}

        {activeTab === 'devices' && <DeviceBOMTree />}

        {activeTab === 'indicators' && <IndicatorLibrary />}

        {activeTab === 'faults' && <FaultList />}

        {activeTab === 'fault-editor' && <FaultEditor />}

        {activeTab === 'procedures' && <SopList />}

        {activeTab === 'sop-editor' && <SopEditor />}

        {activeTab === 'alarms' && <AlarmManager />}

        {activeTab === 'test-playground' && <TestPlayground />}

        {activeTab === 'network' && <FaultList />}

        {activeTab === 'version-manager' && <VersionManager />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500 mt-12 shadow-xs">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-800">DiagnosGraph Studio</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">储能领域专家知识建模与资产沉淀工作台</span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-slate-500">
            <span>所见即所得 YAML</span>
            <span className="text-slate-300">•</span>
            <span>领域语言优先</span>
            <span className="text-slate-300">•</span>
            <span>草稿经测试发布</span>
          </div>
        </div>
      </footer>

      {/* Global Modals & Notifications */}
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <QuickSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
