import { useState, useMemo } from 'react';
import { X, Search, Filter, Layers, Box, Cpu, ChevronRight, Check } from 'lucide-react';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface FilterAreaProps {
  projects: Array<{
    id: string;
    name: string;
    systems: Array<{
      id: string;
      systemName: string;
    }>;
    modules: Array<{
      id: string;
      systemId?: string;
      moduleName: string;
      status: string;
      components: Array<{
        id: string;
        componentName: string;
        status: string;
      }>;
    }>;
  }>;
  onFilterChange: (filters: {
    systemId: string | null;
    moduleId: string | null;
    componentId: string | null;
  }) => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, icon, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-top-layer)] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[var(--z-modal)] bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function FilterArea({ projects, onFilterChange }: FilterAreaProps) {
  const t = useThemeStyles();
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);

  const [systemSearch, setSystemSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');

  const allSystems = useMemo(() => {
    const systems: Array<{ id: string; systemName: string; projectName: string }> = [];
    projects.forEach(project => {
      project.systems.forEach(system => {
        if (!systems.some(s => s.id === system.id)) {
          systems.push({
            id: system.id,
            systemName: system.systemName,
            projectName: project.name,
          });
        }
      });
    });
    return systems;
  }, [projects]);

  const filteredSystems = useMemo(() => {
    if (!systemSearch) return allSystems;
    return allSystems.filter(s =>
      s.systemName.toLowerCase().includes(systemSearch.toLowerCase()) ||
      s.projectName.toLowerCase().includes(systemSearch.toLowerCase())
    );
  }, [allSystems, systemSearch]);

  const moduleOptions = useMemo(() => {
    if (!selectedSystem) return [];
    const project = projects.find(p =>
      p.systems.some(s => s.id === selectedSystem)
    );
    if (!project) return [];
    return project.modules
      .filter(m => m.status === '正常')
      .map(m => ({
        id: m.id,
        moduleName: m.moduleName,
      }));
  }, [projects, selectedSystem]);

  const filteredModules = useMemo(() => {
    if (!moduleSearch) return moduleOptions;
    return moduleOptions.filter(m =>
      m.moduleName.toLowerCase().includes(moduleSearch.toLowerCase())
    );
  }, [moduleOptions, moduleSearch]);

  const componentOptions = useMemo(() => {
    if (!selectedModule) return [];
    const project = projects.find(p =>
      p.modules.some(m => m.id === selectedModule)
    );
    if (!project) return [];
    const module = project.modules.find(m => m.id === selectedModule);
    if (!module) return [];
    return module.components
      .filter(c => c.status === '正常')
      .map(c => ({
        id: c.id,
        componentName: c.componentName,
      }));
  }, [projects, selectedModule]);

  const filteredComponents = useMemo(() => {
    if (!componentSearch) return componentOptions;
    return componentOptions.filter(c =>
      c.componentName.toLowerCase().includes(componentSearch.toLowerCase())
    );
  }, [componentOptions, componentSearch]);

  const getSystemLabel = () => {
    if (!selectedSystem) return '请选择系统';
    const system = allSystems.find(s => s.id === selectedSystem);
    return system ? `${system.systemName} (${system.projectName})` : '请选择系统';
  };

  const getModuleLabel = () => {
    if (!selectedModule) return '请选择模块';
    const module = moduleOptions.find(m => m.id === selectedModule);
    return module ? module.moduleName : '请选择模块';
  };

  const getComponentLabel = () => {
    if (!selectedComponent) return '请选择组件';
    const component = componentOptions.find(c => c.id === selectedComponent);
    return component ? component.componentName : '请选择组件';
  };

  const handleSystemSelect = (systemId: string) => {
    setSelectedSystem(systemId);
    setSelectedModule(null);
    setSelectedComponent(null);
    setSystemSearch('');
    setShowSystemModal(false);
    onFilterChange({ systemId, moduleId: null, componentId: null });
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedComponent(null);
    setModuleSearch('');
    setShowModuleModal(false);
    onFilterChange({ systemId: selectedSystem, moduleId, componentId: null });
  };

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponent(componentId);
    setComponentSearch('');
    setShowComponentModal(false);
    onFilterChange({ systemId: selectedSystem, moduleId: selectedModule, componentId });
  };

  const handleClearSystem = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSystem(null);
    setSelectedModule(null);
    setSelectedComponent(null);
    onFilterChange({ systemId: null, moduleId: null, componentId: null });
  };

  const handleClearModule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedModule(null);
    setSelectedComponent(null);
    onFilterChange({ systemId: selectedSystem, moduleId: null, componentId: null });
  };

  const handleClearComponent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedComponent(null);
    onFilterChange({ systemId: selectedSystem, moduleId: selectedModule, componentId: null });
  };

  const activeFiltersCount = [
    selectedSystem,
    selectedModule,
    selectedComponent
  ].filter(Boolean).length;

  const renderSearchInput = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string
  ) => (
    <div className="relative mb-3">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  const renderList = <T extends { id: string }>(
    items: T[],
    selectedId: string | null,
    onSelect: (id: string) => void,
    renderItem: (item: T) => React.ReactNode
  ) => (
    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
      {items.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">未找到匹配项</div>
      ) : (
        items.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              selectedId === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            } ${item.id !== items[items.length - 1].id ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}
          >
            {renderItem(item)}
            {selectedId === item.id && (
              <Check size={18} className="text-blue-500" />
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border} mb-6`}>
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className={t.textSecondary} />
        <span className={`font-medium ${t.text}`}>筛选条件</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-xs rounded-full">
            {activeFiltersCount} 个条件
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
            <Layers size={14} className="inline mr-1" />
            系统名称
          </label>
          <button
            onClick={() => setShowSystemModal(true)}
            className={`w-full min-h-[42px] px-3 py-2 border rounded-lg text-left flex items-center justify-between ${t.input} hover:border-blue-500 transition-colors`}
          >
            <span className={`text-sm truncate ${selectedSystem ? t.text : t.textMuted}`}>
              {getSystemLabel()}
            </span>
            {selectedSystem ? (
              <button
                onClick={handleClearSystem}
                className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${t.textMuted}`}
              >
                <X size={14} />
              </button>
            ) : (
              <ChevronRight size={16} className={t.textMuted} />
            )}
          </button>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
            <Box size={14} className="inline mr-1" />
            模块名称
          </label>
          <button
            onClick={() => !selectedSystem ? null : setShowModuleModal(true)}
            disabled={!selectedSystem}
            className={`w-full min-h-[42px] px-3 py-2 border rounded-lg text-left flex items-center justify-between ${t.input} ${!selectedSystem ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 transition-colors cursor-pointer'}`}
          >
            <span className={`text-sm truncate ${selectedModule ? t.text : t.textMuted}`}>
              {selectedSystem ? getModuleLabel() : '请先选择系统'}
            </span>
            {selectedModule ? (
              <button
                onClick={handleClearModule}
                className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${t.textMuted}`}
              >
                <X size={14} />
              </button>
            ) : selectedSystem ? (
              <ChevronRight size={16} className={t.textMuted} />
            ) : null}
          </button>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
            <Cpu size={14} className="inline mr-1" />
            组件名称
          </label>
          <button
            onClick={() => !selectedModule ? null : setShowComponentModal(true)}
            disabled={!selectedModule}
            className={`w-full min-h-[42px] px-3 py-2 border rounded-lg text-left flex items-center justify-between ${t.input} ${!selectedModule ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 transition-colors cursor-pointer'}`}
          >
            <span className={`text-sm truncate ${selectedComponent ? t.text : t.textMuted}`}>
              {selectedModule ? getComponentLabel() : '请先选择模块'}
            </span>
            {selectedComponent ? (
              <button
                onClick={handleClearComponent}
                className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${t.textMuted}`}
              >
                <X size={14} />
              </button>
            ) : selectedModule ? (
              <ChevronRight size={16} className={t.textMuted} />
            ) : null}
          </button>
        </div>
      </div>

      <Modal
        isOpen={showSystemModal}
        onClose={() => setShowSystemModal(false)}
        title="选择系统"
        icon={<Layers size={20} className="text-blue-500" />}
      >
        {renderSearchInput(systemSearch, setSystemSearch, '搜索系统名称...')}
        {renderList(
          filteredSystems,
          selectedSystem,
          handleSystemSelect,
          (system) => (
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">{system.systemName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{system.projectName}</div>
            </div>
          )
        )}
      </Modal>

      <Modal
        isOpen={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        title="选择模块"
        icon={<Box size={20} className="text-emerald-500" />}
      >
        {selectedSystem && (
          <div className="mb-3 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
            系统: {allSystems.find(s => s.id === selectedSystem)?.systemName}
          </div>
        )}
        {renderSearchInput(moduleSearch, setModuleSearch, '搜索模块名称...')}
        {renderList(
          filteredModules,
          selectedModule,
          handleModuleSelect,
          (module) => (
            <span className="font-medium text-gray-900 dark:text-white text-sm">{module.moduleName}</span>
          )
        )}
      </Modal>

      <Modal
        isOpen={showComponentModal}
        onClose={() => setShowComponentModal(false)}
        title="选择组件"
        icon={<Cpu size={20} className="text-purple-500" />}
      >
        {selectedModule && (
          <div className="mb-3 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
            模块: {moduleOptions.find(m => m.id === selectedModule)?.moduleName}
          </div>
        )}
        {renderSearchInput(componentSearch, setComponentSearch, '搜索组件名称...')}
        {renderList(
          filteredComponents,
          selectedComponent,
          handleComponentSelect,
          (component) => (
            <span className="font-medium text-gray-900 dark:text-white text-sm">{component.componentName}</span>
          )
        )}
      </Modal>

      {activeFiltersCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${t.textMuted}`}>当前筛选:</span>
            {selectedSystem && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-500">
                系统: {allSystems.find(s => s.id === selectedSystem)?.systemName}
                <button onClick={handleClearSystem} className="hover:text-blue-300">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedModule && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-500">
                模块: {moduleOptions.find(m => m.id === selectedModule)?.moduleName}
                <button onClick={handleClearModule} className="hover:text-emerald-300">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedComponent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-500">
                组件: {componentOptions.find(c => c.id === selectedComponent)?.componentName}
                <button onClick={handleClearComponent} className="hover:text-purple-300">
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedSystem(null);
                setSelectedModule(null);
                setSelectedComponent(null);
                onFilterChange({ systemId: null, moduleId: null, componentId: null });
              }}
              className={`text-xs ${t.accentText} hover:underline ml-2`}
            >
              清除全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
}