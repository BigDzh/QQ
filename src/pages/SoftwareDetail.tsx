import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Tag, Settings, Clock, Upload, Download, Copy, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles, useIsCyberpunk, useIsAnime } from '../hooks/useThemeStyles';

export default function SoftwareDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const isCyberpunk = useIsCyberpunk();
  const isAnime = useIsAnime();

  const software = projects.flatMap(p => p.software).find(s => s.id === id);
  const project = projects.find(p => p.software.some(s => s.id === id));

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

  const getUpdateButtonStyles = () => {
    if (isCyberpunk) {
      return 'relative overflow-hidden bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:opacity-50 disabled:cursor-not-allowed';
    }
    if (isAnime) {
      return 'relative overflow-hidden bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-pink-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-pink-100 disabled:opacity-50 disabled:cursor-not-allowed';
    }
    return 'relative overflow-hidden bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 hover:bg-blue-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  };

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
            onClick={() => {
              if (software.fileUrl) {
                window.open(software.fileUrl, '_blank');
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
    </div>
  );
}
