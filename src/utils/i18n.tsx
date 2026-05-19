import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Internationalization (i18n) framework

type Locale = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
type TranslationKey = string;
type TranslationParams = Record<string, string | number>;

interface I18nConfig {
  defaultLocale: Locale;
  availableLocales: Locale[];
  fallbackLocale: Locale;
}

const DEFAULT_CONFIG: I18nConfig = {
  defaultLocale: 'zh-CN',
  availableLocales: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
  fallbackLocale: 'en-US',
};

// Translation storage
type Translations = Record<Locale, Record<string, string>>;

// Default translations
const defaultTranslations: Translations = {
  'zh-CN': {
    // Common
    'common.appName': 'QQ导出管理平台',
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.success': '操作成功',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.search': '搜索',
    'common.noData': '暂无数据',
    'common.refresh': '刷新',
    'common.close': '关闭',
    'common.back': '返回',
    'common.next': '下一步',
    'common.previous': '上一步',

    // Navigation
    'nav.dashboard': '仪表板',
    'nav.projects': '项目管理',
    'nav.modules': '模块管理',
    'nav.components': '组件管理',
    'nav.tasks': '任务管理',
    'nav.documents': '文档管理',
    'nav.settings': '系统设置',
    'nav.login': '登录',
    'nav.logout': '退出登录',

    // Project
    'project.title': '项目名称',
    'project.number': '项目编号',
    'project.create': '新建项目',
    'project.edit': '编辑项目',
    'project.delete': '删除项目',
    'project.list': '项目列表',
    'project.detail': '项目详情',
    'project.addModule': '添加模块',
    'project.addSystem': '添加系统',
    'project.addDocument': '添加文档',

    // Module
    'module.name': '模块名称',
    'module.number': '模块编号',
    'module.category': '模块种类',
    'module.create': '新建模块',
    'module.edit': '编辑模块',
    'module.delete': '删除模块',
    'module.addComponent': '添加组件',

    // Component
    'component.name': '组件名称',
    'component.number': '组件编号',
    'component.status': '状态',
    'component.create': '新建组件',
    'component.edit': '编辑组件',
    'component.delete': '删除组件',

    // Status
    'status.normal': '正常',
    'status.fault': '故障',
    'status.maintenance': '维修中',
    'status.testing': '测试中',
    'status.simulation': '仿真中',
    'status.production': '投产中',
    'status.borrowed': '借用中',
    'status.unproduced': '未投产',

    // Auth
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.login': '登录',
    'auth.logout': '退出',
    'auth.loginSuccess': '登录成功',
    'auth.loginFailed': '登录失败，请检查用户名和密码',
    'auth.sessionExpired': '会话已过期，请重新登录',

    // Validation
    'validation.required': '此字段为必填项',
    'validation.email': '请输入有效的邮箱地址',
    'validation.minLength': '至少需要{min}个字符',
    'validation.maxLength': '最多{max}个字符',
    'validation.pattern': '格式不正确',

    // Messages
    'message.saveSuccess': '保存成功',
    'message.deleteConfirm': '确定要删除吗？此操作不可撤销。',
    'message.deleteSuccess': '删除成功',
    'message.operationFailed': '操作失败，请重试',
    'message.networkError': '网络错误，请检查网络连接',
    'message.unauthorized': '未授权访问',
    'message.forbidden': '无权限执行此操作',
    'message.notFound': '资源不存在',

    // Accessibility
    'a11y.skipToContent': '跳转到主要内容',
    'a11y.openMenu': '打开菜单',
    'a11y.closeMenu': '关闭菜单',
    'a11y.expand': '展开',
    'a11y.collapse': '折叠',
    'a11y.select': '选择',
    'a11y.clear': '清除',
    'a11y.loading': '正在加载内容',
    'a11y.noResults': '没有搜索结果',

    // Date/Time
    'date.today': '今天',
    'date.yesterday': '昨天',
    'date.ago': '{time}前',
    'date.in': '{time}后',

    // File size
    'size.bytes': '{count} 字节',
    'size.kb': '{count} KB',
    'size.mb': '{count} MB',
    'size.gb': '{count} GB',
  },

  'en-US': {
    // Common
    'common.appName': 'QQ Export Manager',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Operation successful',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.noData': 'No data available',
    'common.refresh': 'Refresh',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.modules': 'Modules',
    'nav.components': 'Components',
    'nav.tasks': 'Tasks',
    'nav.documents': 'Documents',
    'nav.settings': 'Settings',
    'nav.login': 'Login',
    'nav.logout': 'Logout',

    // Project
    'project.title': 'Project Name',
    'project.number': 'Project Number',
    'project.create': 'Create Project',
    'project.edit': 'Edit Project',
    'project.delete': 'Delete Project',
    'project.list': 'Project List',
    'project.detail': 'Project Details',
    'project.addModule': 'Add Module',
    'project.addSystem': 'Add System',
    'project.addDocument': 'Add Document',

    // Module
    'module.name': 'Module Name',
    'module.number': 'Module Number',
    'module.category': 'Category',
    'module.create': 'Create Module',
    'module.edit': 'Edit Module',
    'module.delete': 'Delete Module',
    'module.addComponent': 'Add Component',

    // Component
    'component.name': 'Component Name',
    'component.number': 'Component Number',
    'component.status': 'Status',
    'component.create': 'Create Component',
    'component.edit': 'Edit Component',
    'component.delete': 'Delete Component',

    // Status
    'status.normal': 'Normal',
    'status.fault': 'Fault',
    'status.maintenance': 'Maintenance',
    'status.testing': 'Testing',
    'status.simulation': 'Simulation',
    'status.production': 'Production',
    'status.borrowed': 'Borrowed',
    'status.unproduced': 'Unproduced',

    // Auth
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.loginSuccess': 'Login successful',
    'auth.loginFailed': 'Login failed, please check your credentials',
    'auth.sessionExpired': 'Session expired, please login again',

    // Validation
    'validation.required': 'This field is required',
    'validation.email': 'Please enter a valid email address',
    'validation.minLength': 'Minimum {min} characters required',
    'validation.maxLength': 'Maximum {max} characters allowed',
    'validation.pattern': 'Invalid format',

    // Messages
    'message.saveSuccess': 'Saved successfully',
    'message.deleteConfirm': 'Are you sure you want to delete? This action cannot be undone.',
    'message.deleteSuccess': 'Deleted successfully',
    'message.operationFailed': 'Operation failed, please try again',
    'message.networkError': 'Network error, please check your connection',
    'message.unauthorized': 'Unauthorized access',
    'message.forbidden': 'You do not have permission for this operation',
    'message.notFound': 'Resource not found',

    // Accessibility
    'a11y.skipToContent': 'Skip to main content',
    'a11y.openMenu': 'Open menu',
    'a11y.closeMenu': 'Close menu',
    'a11y.expand': 'Expand',
    'a11y.collapse': 'Collapse',
    'a11y.select': 'Select',
    'a11y.clear': 'Clear',
    'a11y.loading': 'Loading content',
    'a11y.noResults': 'No results found',

    // Date/Time
    'date.today': 'Today',
    'date.yesterday': 'Yesterday',
    'date.ago': '{time} ago',
    'date.in': 'in {time}',

    // File size
    'size.bytes': '{count} bytes',
    'size.kb': '{count} KB',
    'size.mb': '{count} MB',
    'size.gb': '{count} GB',
  },

  'ja-JP': {}, // Japanese placeholder
  'ko-KR': {}, // Korean placeholder
};

// i18n context and provider
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem('i18n-locale');
    if (saved && DEFAULT_CONFIG.availableLocales.includes(saved as Locale)) {
      return saved as Locale;
    }
    return DEFAULT_CONFIG.defaultLocale;
  });

  const [translations] = useState<Translations>(defaultTranslations);

  useEffect(() => {
    localStorage.setItem('i18n-locale', locale);

    // Update HTML lang attribute
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (DEFAULT_CONFIG.availableLocales.includes(newLocale)) {
      setLocaleState(newLocale);
    }
  }, []);

  const t = useCallback((key: TranslationKey, params?: TranslationParams): string => {
    let translation = translations[locale]?.[key];

    if (!translation) {
      // Try fallback locale
      translation = translations[DEFAULT_CONFIG.fallbackLocale]?.[key];
    }

    if (!translation) {
      console.warn(`[i18n] Missing translation for key: ${key} in locale: ${locale}`);
      return key; // Return key as fallback
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      });
    }

    return translation;
  }, [locale, translations]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook for using i18n
export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}

// Hook for quick translation
export function useTranslation() {
  const { t, locale, setLocale } = useI18n();

  return { t, locale, setLocale };
}

// Utility functions outside React components
let currentLocale: Locale = DEFAULT_CONFIG.defaultLocale;

export function initI18n(locale?: Locale): void {
  if (locale && DEFAULT_CONFIG.availableLocales.includes(locale)) {
    currentLocale = locale;
  }
}

export function translate(key: TranslationKey, params?: TranslationParams): string {
  let translation = defaultTranslations[currentLocale]?.[key];

  if (!translation) {
    translation = defaultTranslations[DEFAULT_CONFIG.fallbackLocale]?.[key];
  }

  if (!translation) {
    return key;
  }

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, String(paramValue));
    });
  }

  return translation;
}

// Add custom translations
export function addTranslations(locale: Locale, newTranslations: Record<string, string>): void {
  if (defaultTranslations[locale]) {
    Object.assign(defaultTranslations[locale], newTranslations);
  } else {
    defaultTranslations[locale] = newTranslations;
  }
}

// Get all available locales
export function getAvailableLocales(): Locale[] {
  return [...DEFAULT_CONFIG.availableLocales];
}

// Format date according to locale
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  };

  try {
    return d.toLocaleDateString(currentLocale.replace('-', '-'), defaultOptions);
  } catch {
    return d.toLocaleDateString('en-US', defaultOptions);
  }
}

// Format number according to locale
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  try {
    return num.toLocaleString(currentLocale.replace('-', '-'), options);
  } catch {
    return num.toLocaleString('en-US', options);
  }
}
