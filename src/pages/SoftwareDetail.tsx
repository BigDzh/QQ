import { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Tag, Settings, Clock, Upload, Download, Copy, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles, useIsCyberpunk, useIsAnime } from '../hooks/useThemeStyles';
import type { Component } from '../types';
import { logger } from '../utils/logger';

export default function SoftwareDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const isCyberpunk = useIsCyberpunk();
  const isAnime = useIsAnime();

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const software = projects.flatMap(p => p.software).find(s => s.id === id);
  const project = projects.find(p => p.software.some(s => s.id === id));

  const allProjectComponents = useMemo(() => {
    if (!software || !project) return [];

    const adaptedIds = new Set(software.adaptedComponentIds || []);
    const adaptedNames = (software.adaptedComponents || [])
      .map(a => a?.name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

    console.log('[DEBUG Sync] adaptedIds:', [...adaptedIds]);
    console.log('[DEBUG Sync] adaptedNames:', adaptedNames);
    console.log('[DEBUG Sync] project.modules count:', project.modules?.length || 0);
    if (project.modules?.length > 0) {
      const allComps = project.modules.flatMap(m => m.components || []);
      console.log('[DEBUG Sync] project all components:', allComps.map(c => ({ id: c.id, name: c.componentName })));
    }

    if (adaptedNames.length === 0 && adaptedIds.size === 0) {
      console.log('[DEBUG Sync] early return: no adapted data');
      return [];
    }

    const targetNames = new Set<string>();

    project.modules?.forEach(mod => {
      (mod.components || []).forEach(comp => {
        if (adaptedIds.has(comp.id)) {
          targetNames.add(comp.componentName);
        }
      });
    });

    adaptedNames.forEach(name => {
      if (name) targetNames.add(name);
    });

    console.log('[DEBUG Sync] targetNames:', [...targetNames]);

    if (targetNames.size === 0) {
      console.log('[DEBUG Sync] early return: no target names');
      return [];
    }

    const components: (Component & { moduleName: string; isOriginalAdapted: boolean })[] = [];

    project.modules?.forEach(mod => {
      (mod.components || []).forEach(comp => {
        if (targetNames.has(comp.componentName)) {
          const isOriginalAdapted = adaptedIds.has(comp.id);
          components.push({ ...comp, moduleName: mod.moduleName, isOriginalAdapted });
        }
      });
    });

    console.log('[DEBUG Sync] final components:', components.map(c => ({ id: c.id, name: c.componentName, module: c.moduleName })));
    return components;
  }, [software, project]);

  const totalMatchCount = allProjectComponents.length;
  const originalAdaptedCount = allProjectComponents.filter(c => c.isOriginalAdapted).length;

  if (!software || !project) {
    return (
      <div className={`text-center py-12`}>
        <p className={t.textMuted}>软件不存在</p>
        <Link to={`/projects/${project?.id}`} className={`${t.accentText} hover:underline mt-2 inline-block`}>
          返回项目
        </Link>
      </div>
    );
  }

  const handleStatusToggle = () => {
    const newStatus = software.status === '已完成' ? '未完成' : '已完成';
    updateProject(project.id, {
      software: project.software.map(s =>
        s.id === software.id
          ? { ...s, status: newStatus, completionDate: newStatus === '已完成' ? new Date().toISOString() : undefined }
          : s
      ),
    });
    showToast(`状态已变更为${newStatus}`, 'success');
  };

  const handleCopyMd5 = () => {
    if (software.md5) {
      navigator.clipboard.writeText(software.md5);
      showToast('MD5已复制到剪贴板', 'success');
    }
  };

  const handleVersionUpdate = () => {
    const currentVersion = software.version;
    const versionParts = currentVersion.split('.');
    const patchVersion = parseInt(versionParts[versionParts.length - 1], 10) + 1;
    versionParts[versionParts.length - 1] = patchVersion.toString();
    const newVersion = versionParts.join('.');

    updateProject(project.id, {
      software: project.software.map(s =>
        s.id === software.id
          ? { ...s, version: newVersion }
          : s
      ),
    });
    showToast(`软件版本已更新: ${currentVersion} → ${newVersion}`, 'success');
  };

  const handleOpenSyncModal = useCallback(() => {
    const defaultSelected = allProjectComponents.filter(c => c.isOriginalAdapted).map(c => c.id);
    setSelectedComponentIds(defaultSelected);
    setShowSyncModal(true);
  }, [allProjectComponents]);

  const handleToggleComponent = useCallback((componentId: string) => {
    setSelectedComponentIds(prev => {
      if (prev.includes(componentId)) {
        return prev.filter(id => id !== componentId);
      } else {
        return [...prev, componentId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = allProjectComponents.map(c => c.id);
    if (selectedComponentIds.length === allIds.length && allIds.length > 0) {
      setSelectedComponentIds([]);
    } else {
      setSelectedComponentIds(allIds);
    }
  }, [selectedComponentIds, allProjectComponents]);

  const handleSync = useCallback(async () => {
    if (!software || selectedComponentIds.length === 0) return;

    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const selectedComponents = allProjectComponents.filter(c => selectedComponentIds.includes(c.id));
      const syncedComponentNames = selectedComponents.map(c => c.componentName).join('、');

      updateProject(project.id, {
        software: project.software.map(s =>
          s.id === software.id
            ? {
                ...s,
                lastSyncAt: new Date().toISOString(),
                lastSyncComponentIds: selectedComponentIds,
                lastSyncComponentNames: selectedComponents.map(c => ({ id: c.id, name: c.componentName })),
              }
            : s
        ),
      });

      showToast(`已成功同步到 ${selectedComponentIds.length} 个组件：${syncedComponentNames}`, 'success');
      setShowSyncModal(false);
      setSelectedComponentIds([]);
    } catch {
      showToast('同步失败，请重试', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [software, selectedComponentIds, allProjectComponents, project, updateProject, showToast]);

  const getUpdateButtonStyles = () => {
    if (isCyberpunk) {
      return 'relative overflow-hidden bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:opacity-50 disabled:cursor-not-allowed';
    }
    if (isAnime) {
      return 'relative overflow-hidden bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-pink-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-pink-100 disabled:opacity-50 disabled:cursor-not-allowed';
    }
    return 'relative overflow-hidden bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 hover:bg-blue-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  };

  const componentsByModule = useMemo(() => {
    const groups: Record<string, typeof allProjectComponents> = {};
    allProjectComponents.forEach(comp => {
      if (!groups[comp.moduleName]) {
        groups[comp.moduleName] = [];
      }
      groups[comp.moduleName].push(comp);
    });
    return groups;
  }, [allProjectComponents]);

  const allComponentIds = allProjectComponents.map(c => c.id);
  const isAllSelected = selectedComponentIds.length === allComponentIds.length && allComponentIds.length > 0;
  const isIndeterminate = selectedComponentIds.length > 0 && selectedComponentIds.length < allComponentIds.length;

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>{software.name}</h1>
            <p className={t.textMuted}>版本: {software.version}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSyncModal}
              disabled={totalMatchCount === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-lg cursor-pointer ${
                totalMatchCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={totalMatchCount === 0 ? '该软件暂无适配组件，无法同步' : `同步到 ${totalMatchCount} 个同名组件（原始适配 ${originalAdaptedCount} 个）`}
            >
              <RefreshCw size={16} />
              同步
            </button>
            <button
              onClick={handleVersionUpdate}
              className={getUpdateButtonStyles()}
              aria-label="更新软件版本"
              title="点击更新软件版本号"
            >
              <span className="relative z-10 flex items-center gap-2">
                <RefreshCw size={18} className="transition-transform duration-300 group-hover:rotate-180" />
                软件版本更新
              </span>
            </button>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              software.status === '已完成' ? t.success : t.badge
            }`}>
              {software.status}
            </span>
            <button
              onClick={handleStatusToggle}
              className={`px-3 py-1 border rounded-lg ${t.border} hover:${t.hoverBg}`}
            >
              更改状态
            </button>
          </div>
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm p-4 mb-6 border ${t.border}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Tag className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>阶段</div>
              <div className={`font-medium ${t.text}`}>{software.stage}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Settings className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>生产指令号</div>
              <div className={`font-medium ${t.text}`}>{software.productionOrderNumber || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>上传日期</div>
              <div className={`font-medium ${t.text}`}>{software.uploadDate || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>完成日期</div>
              <div className={`font-medium ${t.text}`}>{software.completionDate ? new Date(software.completionDate).toLocaleDateString() : '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {software.md5 && (
        <div className={`${t.card} rounded-lg shadow-sm p-4 mb-6 border ${t.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${t.textMuted} mb-1`}>MD5</div>
              <div className={`font-mono text-sm ${t.text}`}>{software.md5}</div>
            </div>
            <button
              onClick={handleCopyMd5}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${t.border} hover:${t.hoverBg}`}
            >
              <Copy size={16} />
              复制
            </button>
          </div>
        </div>
      )}

      {software.adaptedComponents && software.adaptedComponents.length > 0 && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 mb-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4`}>适配组件</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {software.adaptedComponents.map(comp => (
              <Link
                key={comp.id}
                to={`/components/${comp.id}`}
                className={`flex items-center gap-2 p-3 border rounded-lg ${t.border} hover:${t.hoverBg}`}
              >
                <Package size={16} className={t.textMuted} />
                <span className={`text-sm ${t.text}`}>{comp.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${t.text}`}>软件文件</h3>
          <button
            onClick={async () => {
              if (software.fileUrl) {
                window.open(software.fileUrl, '_blank');
              } else if (software.dbId) {
                try {
                  const { getFileBlob } = await import('../services/database');
                  const blob = await getFileBlob(software.dbId);
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } else {
                    showToast('文件不存在', 'error');
                  }
                } catch {
                  showToast('文件读取失败', 'error');
                }
              } else {
                showToast('暂无可下载文件', 'info');
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${t.border} hover:${t.hoverBg}`}
          >
            <Download size={16} />
            下载
          </button>
        </div>
        {software.fileName ? (
          <div className={`flex items-center gap-3 p-4 border rounded-lg ${t.border}`}>
            <Package className={t.textMuted} size={24} />
            <div className="flex-1">
              <div className={`font-medium ${t.text}`}>{software.fileName}</div>
              {software.fileSize && (
                <div className={`text-sm ${t.textMuted}`}>
                  {(software.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`text-center py-8 border border-dashed rounded-lg ${t.border}`}>
            <Upload className={`mx-auto ${t.textMuted} mb-2`} size={32} />
            <p className={`text-sm ${t.textMuted}`}>暂未上传文件</p>
          </div>
        )}
      </div>

      {showSyncModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => !isSyncing && setShowSyncModal(false)}>
          <div className={`${t.modalBg} rounded-xl p-6 w-full max-w-2xl border ${t.modalBorder} max-h-[85vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${t.text}`}>同步软件到组件</h2>
              <button
                onClick={() => !isSyncing && setShowSyncModal(false)}
                disabled={isSyncing}
                className={`p-2 rounded-lg hover:${t.hoverBg} ${t.textSecondary} disabled:opacity-50 transition-opacity`}
              >
                <X size={20} />
              </button>
            </div>

            <div className={`mb-5 p-4 rounded-lg border ${t.border} ${t.card}`}>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Package size={18} className={t.textMuted} />
                  <div>
                    <div className={`text-xs ${t.textMuted}`}>目标软件</div>
                    <div className={`font-semibold ${t.text}`}>{software.name}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div>
                  <div className={`text-xs ${t.textMuted}`}>版本</div>
                  <div className={`font-medium ${t.text}`}>{software.version}</div>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div>
                  <div className={`text-xs ${t.textMuted}`}>同名组件总数</div>
                  <div className={`font-medium ${t.accentText}`}>{totalMatchCount} 个</div>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div>
                  <div className={`text-xs ${t.textMuted}`}>原始适配</div>
                  <div className={`font-medium text-emerald-600`}>{originalAdaptedCount} 个</div>
                </div>
              </div>
            </div>

            {totalMatchCount === 0 ? (
              <div className={`text-center py-12 rounded-lg ${t.hoverBg}`}>
                <RefreshCw size={48} className="mx-auto opacity-30 mb-4" />
                <p className={`text-base font-medium mb-2 ${t.text}`}>该软件尚未配置适配组件</p>
                <p className={`text-sm ${t.textMuted}`}>请先编辑软件信息，添加需要适配的组件后再进行同步操作</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                      onChange={handleSelectAll}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className={`text-sm font-semibold ${t.text} group-hover:${t.accentText} transition-colors`}>
                      全选 / 取消全选
                    </span>
                  </label>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    selectedComponentIds.length > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : `${t.emptyBg} ${t.textMuted}`
                  }`}>
                    <Check size={14} className={selectedComponentIds.length > 0 ? 'text-emerald-600' : ''} />
                    已选择 <span className="font-bold">{selectedComponentIds.length}</span> / {allComponentIds.length} 个组件
                  </div>
                </div>

                <div className={`border rounded-xl ${t.border} max-h-80 overflow-y-auto`}>
                  {Object.entries(componentsByModule).map(([moduleName, moduleComponents]) => (
                    <div key={moduleName} className={`border-b last:border-b-0 ${t.border}`}>
                      <div className={`px-4 py-2.5 text-sm font-semibold border-b ${t.border} bg-gray-50 dark:bg-gray-800/80 ${t.textSecondary} flex items-center gap-2`}>
                        <Package size={14} />
                        {moduleName}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.emptyBg} ${t.textMuted}`}>
                          {moduleComponents.length} 个
                        </span>
                      </div>
                      <div className="p-1.5">
                        {moduleComponents.map(comp => {
                          const isSelected = selectedComponentIds.includes(comp.id);
                          return (
                            <label
                              key={comp.id}
                              className={`flex items-center gap-3 py-2.5 px-3 mx-0.5 rounded-lg cursor-pointer transition-all duration-150 ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-900/25 ring-1 ring-emerald-300 dark:ring-emerald-700'
                                  : comp.isOriginalAdapted
                                    ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleComponent(comp.id)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-800 dark:text-emerald-100' : t.text}`}>
                                  {comp.componentName}
                                </div>
                                <div className={`text-xs truncate flex items-center gap-3 ${isSelected ? 'text-emerald-600/70 dark:text-emerald-400/70' : t.textMuted}`}>
                                  <span className="flex items-center gap-1">
                                    <Tag size={11} />
                                    编号：<span className="font-mono">{comp.componentNumber}</span>
                                  </span>
                                  {comp.productionOrderNumber && (
                                    <span className="flex items-center gap-1">
                                      指令号：<span className="font-mono">{comp.productionOrderNumber}</span>
                                    </span>
                                  )}
                                  {comp.isOriginalAdapted && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                      原始适配
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <Check size={16} className="text-emerald-500 flex-shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-5 mt-5 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(false)}
                    disabled={isSyncing}
                    className={`flex-1 py-2.5 border rounded-xl ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-medium`}
                  >
                    <X size={17} />
                    取消
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing || selectedComponentIds.length === 0}
                    className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      isSyncing || selectedComponentIds.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 cursor-pointer'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        同步中...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={17} />
                        确认同步 ({selectedComponentIds.length})
                      </>
                    )}
                  </button>
                </div>

                {selectedComponentIds.length > 0 && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs ${t.emptyBg} ${t.textMuted}`}>
                    💡 即将把「{software.name} v{software.version}」同步到 {selectedComponentIds.length} 个选中的组件
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
