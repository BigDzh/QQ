const VERSION = '2.19.1';
const BUILD_DATE = new Date().toISOString().split('T')[0];

const VERSION_HISTORY = [
  { version: 'v2.19.1', date: '2026-03-21', changes: '修复构建错误；优化模块编辑功能；完善数据迁移与回滚机制；系统资源监控优化' },
  { version: 'v2.19.0', date: '2026-03-19', changes: '系统管理Tab重构：Machine重命名为System；新增组件管理、设计管理、项目日志Tab；模块管理增加滑动开关、生成指令号、阶段、版本显示、复制删除功能' },
  { version: 'v2.18.0', date: '2026-03-17', changes: '模块组件显示增强：模块卡片显示阶段、版本；组件表格显示阶段、版本；组件编号名称可点击跳转详情' },
  { version: 'v2.17.0', date: '2026-03-17', changes: '软件管理优化：固化弹窗选择指令号、删除烧录功能' },
  { version: 'v2.16.0', date: '2026-03-17', changes: '软件管理重构：软件类型扩展、版本标签、适配种类显示' },
  { version: 'v2.15.0', date: '2026-03-17', changes: '版本管理：侧边栏版本信息按钮、版本历史弹窗' },
  { version: 'v2.14.0', date: '2026-03-17', changes: '固化功能优化：弹窗多选指令号、已固化指令号显示' },
  { version: 'v2.13.0', date: '2026-03-17', changes: '组件烧录软件管理：从软件管理选择添加、同步烧录功能' },
  { version: 'v2.12.0', date: '2026-03-17', changes: '软件管理增强：选择适配组件、新增指令号、烧录功能' },
  { version: 'v2.11.0', date: '2026-03-17', changes: '数据库管理增强：核心数据保存加载、项目数据概览显示' },
  { version: 'v2.10.0', date: '2026-03-17', changes: '数据库管理与项目管理关联：文档/软件上传时自动存储到IndexedDB' },
  { version: 'v2.9.0', date: '2026-03-17', changes: '软件管理增强：按指令号分类、选择指令号、固化功能' },
  { version: 'v2.8.0', date: '2026-03-17', changes: '上传进度条：文档/软件上传时顶部显示进度条' },
  { version: 'v2.7.0', date: '2026-03-17', changes: '软件管理增强：MD5自动计算、一键复制功能' },
  { version: 'v2.6.0', date: '2026-03-17', changes: '登录功能：登录页面、状态持久化、退出登录、侧边栏状态显示' },
  { version: 'v2.5.0', date: '2026-03-17', changes: '数据库管理：IndexedDB本地数据库、大文件存储、导入导出' },
  { version: 'v2.4.0', date: '2026-03-17', changes: 'Web应用打包：可直接浏览器运行' },
  { version: 'v2.3.0', date: '2026-03-17', changes: '设计文件重构：按模块显示、全部清除功能、模块/组件详情关联' },
  { version: 'v2.2.0', date: '2026-03-17', changes: '设计文件管理：自动生成、按模块分类、版本管理' },
  { version: 'v2.1.0', date: '2026-03-17', changes: '文档与软件管理增强：按阶段分类、进度条、下载/预览/发送功能、Excel导入' },
  { version: 'v2.0.0', date: '2026-03-16', changes: '桌面应用打包发布' },
  { version: 'v1.1.0', date: '2026-03-16', changes: '添加用户权限、审计日志、备份管理' },
  { version: 'v1.0.0', date: '2026-03-15', changes: '初始版本，基础功能' },
];

export function getVersion(): string {
  return VERSION;
}

export function getBuildDate(): string {
  return BUILD_DATE;
}

export function getVersionHistory() {
  return VERSION_HISTORY;
}

export function getVersionType(): string {
  const parts = VERSION.split('.');
  const minor = parts[1];
  if (minor === '0') return '大版本';
  if (minor.endsWith('0')) return '修复';
  return '小版本';
}

export function compareVersions(v1: string, v2: string): number {
  const p1 = v1.replace('v', '').split('.').map(Number);
  const p2 = v2.replace('v', '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

export function checkForUpdates(): boolean {
  return false;
}
