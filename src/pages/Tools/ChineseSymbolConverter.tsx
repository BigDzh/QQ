import React, { useState, useMemo, useCallback } from 'react';
import { Copy, Download, Trash2, CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff, FileText } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { copyToClipboard } from '../../utils/md5';

interface ConversionRule {
  chinese: string;
  english: string;
  description: string;
}

const DEFAULT_RULES: ConversionRule[] = [
  { chinese: '，', english: ',', description: '逗号' },
  { chinese: '。', english: '.', description: '句号' },
  { chinese: '？', english: '?', description: '问号' },
  { chinese: '！', english: '!', description: '感叹号' },
  { chinese: '：', english: ':', description: '冒号' },
  { chinese: '；', english: ';', description: '分号' },
  { chinese: '\u201C', english: '"', description: '双引号左' },
  { chinese: '\u201D', english: '"', description: '双引号右' },
  { chinese: '\u2018', english: "'", description: '单引号左' },
  { chinese: '\u2019', english: "'", description: '单引号右' },
  { chinese: '（', english: '(', description: '左括号' },
  { chinese: '）', english: ')', description: '右括号' },
  { chinese: '【', english: '[', description: '左方括号' },
  { chinese: '】', english: ']', description: '右方括号' },
  { chinese: '《', english: '<', description: '书名号左' },
  { chinese: '》', english: '>', description: '书名号右' },
  { chinese: '、', english: ',', description: '顿号' },
  { chinese: '\u2014\u2014', english: '--', description: '破折号' },
  { chinese: '\u2026\u2026', english: '...', description: '省略号' },
];

interface PreserveRule {
  pattern: string;
  reason: string;
}

interface ConversionStats {
  totalReplacements: number;
  byType: Record<string, number>;
}

export default function ChineseSymbolConverter() {
  const { showToast } = useToast();
  const t = useThemeStyles();

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<'realtime' | 'batch'>('realtime');
  const [showPreview, setShowPreview] = useState(true);
  const [enabledRules, setEnabledRules] = useState<Set<string>>(new Set(DEFAULT_RULES.map(r => r.chinese)));
  const [preserveRules, setPreserveRules] = useState<PreserveRule[]>([
    { pattern: '\u2460', reason: '编号符号' },
    { pattern: '\u2461', reason: '编号符号' },
    { pattern: '\u2462', reason: '编号符号' },
  ]);
  const [newPreservePattern, setNewPreservePattern] = useState('');
  const [newPreserveReason, setNewPreserveReason] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertText = useCallback((text: string, rules: ConversionRule[], preserved: Set<string>): string => {
    if (!text.trim()) return '';

    try {
      const preserveMap = new Map<string, string>();
      let placeholderIndex = 0;

      rules.forEach(rule => {
        if (preserved.has(rule.chinese)) {
          const placeholder = `\x00PRESERVE_${placeholderIndex}_\x00`;
          preserveMap.set(placeholder, rule.chinese);
          text = text.replace(new RegExp(escapeRegExp(rule.chinese), 'g'), placeholder);
          placeholderIndex++;
        }
      });

      const conversionStats: ConversionStats = {
        totalReplacements: 0,
        byType: {}
      };

      rules.forEach(rule => {
        if (!preserved.has(rule.chinese)) {
          const regex = new RegExp(escapeRegExp(rule.chinese), 'g');
          const matches = text.match(regex);
          if (matches) {
            conversionStats.totalReplacements += matches.length;
            conversionStats.byType[rule.description] = matches.length;
            text = text.replace(regex, rule.english);
          }
        }
      });

      preserveMap.forEach((original, placeholder) => {
        text = text.replace(new RegExp(escapeRegExp(placeholder), 'g'), original);
      });

      setStats(conversionStats);
      setError(null);
      return text;
    } catch (e) {
      setError(`转换错误: ${e instanceof Error ? e.message : '未知错误'}`);
      return text;
    }
  }, []);

  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleRealtimeConvert = useCallback((text: string) => {
    const enabledRulesList = DEFAULT_RULES.filter(r => enabledRules.has(r.chinese));
    const preservedSet = new Set(preserveRules.map(r => r.pattern));
    const result = convertText(text, enabledRulesList, preservedSet);
    setOutputText(result);
  }, [enabledRules, preserveRules, convertText]);

  const handleBatchConvert = useCallback(() => {
    const enabledRulesList = DEFAULT_RULES.filter(r => enabledRules.has(r.chinese));
    const preservedSet = new Set(preserveRules.map(r => r.pattern));
    const result = convertText(inputText, enabledRulesList, preservedSet);
    setOutputText(result);
    showToast('批量转换完成', 'success');
  }, [inputText, enabledRules, preserveRules, convertText, showToast]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (mode === 'realtime') {
      handleRealtimeConvert(text);
    }
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    showToast('已复制到剪贴板', 'success');
  };

  const handleExport = (text: string, format: 'txt' | 'md') => {
    const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `符号转换结果_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出为${format === 'md' ? 'Markdown' : '文本'}文件`, 'success');
  };

  const toggleRule = (chinese: string) => {
    setEnabledRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chinese)) {
        newSet.delete(chinese);
      } else {
        newSet.add(chinese);
      }
      return newSet;
    });
  };

  const addPreserveRule = () => {
    if (!newPreservePattern.trim()) {
      showToast('请输入要保留的符号', 'error');
      return;
    }
    if (preserveRules.some(r => r.pattern === newPreservePattern)) {
      showToast('该符号已存在', 'error');
      return;
    }
    setPreserveRules(prev => [...prev, { pattern: newPreservePattern, reason: newPreserveReason || '用户添加' }]);
    setNewPreservePattern('');
    setNewPreserveReason('');
    showToast('已添加保留规则', 'success');
  };

  const removePreserveRule = (pattern: string) => {
    setPreserveRules(prev => prev.filter(r => r.pattern !== pattern));
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setStats(null);
    setError(null);
  };

  const handleSwap = () => {
    if (outputText) {
      setInputText(outputText);
      if (mode === 'realtime') {
        handleRealtimeConvert(outputText);
      }
    }
  };

  const diffSegments = useMemo(() => {
    if (!showPreview || !inputText || !outputText) return [];

    const segments: Array<{ text: string; changed: boolean }> = [];
    let i = 0, j = 0;
    const inputChars = inputText.split('');
    const outputChars = outputText.split('');

    while (i < inputChars.length || j < outputChars.length) {
      if (i >= inputChars.length) {
        segments.push({ text: outputChars[j], changed: true });
        j++;
      } else if (j >= outputChars.length) {
        segments.push({ text: inputChars[i], changed: true });
        i++;
      } else if (inputChars[i] === outputChars[j]) {
        segments.push({ text: inputChars[i], changed: false });
        i++;
        j++;
      } else {
        segments.push({ text: outputChars[j], changed: true });
        j++;
      }
    }

    return segments;
  }, [inputText, outputText, showPreview]);

  const uniqueChangedChars = useMemo(() => {
    const changed = new Set<string>();
    diffSegments.forEach(s => {
      if (s.changed) {
        changed.add(s.text);
      }
    });
    return Array.from(changed);
  }, [diffSegments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className={t.textSecondary} />
          <h3 className={`text-lg font-semibold ${t.text}`}>中文符号转英文符号</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`px-3 py-1.5 text-xs border rounded-lg ${t.border} ${t.text} hover:${t.hoverBg} flex items-center gap-1`}
        >
          <RefreshCw size={14} />
          {showSettings ? '收起设置' : '转换设置'}
        </button>
      </div>

      {showSettings && (
        <div className={`${t.emptyBg} rounded-lg p-4 border border-blue-500/20 space-y-4`}>
          <div>
            <div className={`text-sm font-medium mb-2 ${t.text}`}>转换规则</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_RULES.map((rule) => (
                <label
                  key={rule.chinese}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer transition-colors ${
                    enabledRules.has(rule.chinese)
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-500'
                      : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabledRules.has(rule.chinese)}
                    onChange={() => toggleRule(rule.chinese)}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                  />
                  <span className="text-sm">{rule.chinese} → {rule.english}</span>
                  <span className={`text-xs ${t.textMuted}`}>({rule.description})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className={`text-sm font-medium mb-2 ${t.text}`}>保留符号（不转换）</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {preserveRules.map((rule) => (
                <span
                  key={rule.pattern}
                  className={`px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 text-orange-500 text-sm flex items-center gap-1`}
                >
                  <span className="font-mono">{rule.pattern}</span>
                  <span className={`text-xs ${t.textMuted}`}>({rule.reason})</span>
                  <button
                    onClick={() => removePreserveRule(rule.pattern)}
                    className="ml-1 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <input
                  type="text"
                  value={newPreservePattern}
                  onChange={(e) => setNewPreservePattern(e.target.value)}
                  placeholder="符号"
                  className={`w-20 px-2 py-1.5 border rounded-lg ${t.input} text-sm`}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newPreserveReason}
                  onChange={(e) => setNewPreserveReason(e.target.value)}
                  placeholder="用途（可选）"
                  className={`w-32 px-2 py-1.5 border rounded-lg ${t.input} text-sm`}
                />
              </div>
              <button
                onClick={addPreserveRule}
                className={`px-3 py-1.5 text-sm border rounded-lg ${t.border} hover:${t.hoverBg}`}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'realtime'}
              onChange={() => setMode('realtime')}
              className="w-4 h-4"
            />
            <span className={`text-sm ${t.text}`}>实时转换</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'batch'}
              onChange={() => setMode('batch')}
              className="w-4 h-4"
            />
            <span className={`text-sm ${t.text}`}>批量转换</span>
          </label>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className={`text-sm ${t.textSecondary}`}>显示差异对比</span>
        </label>
      </div>

      {error && (
        <div className={`flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm`}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${t.textSecondary}`}>输入文本</label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className={`p-1.5 ${t.textMuted} hover:${t.accentText} rounded`}
                title="清空"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="请输入要转换的中文符号文本..."
            className={`w-full h-64 px-3 py-2 border rounded-lg resize-none ${t.input}`}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${t.textSecondary}`}>转换结果</label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSwap}
                disabled={!outputText}
                className={`p-1.5 ${t.textMuted} hover:${t.accentText} rounded disabled:opacity-50`}
                title="将结果移到输入"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => handleCopy(outputText)}
                disabled={!outputText}
                className={`p-1.5 ${t.textMuted} hover:${t.accentText} rounded disabled:opacity-50`}
                title="复制结果"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => handleExport(outputText, 'txt')}
                disabled={!outputText}
                className={`p-1.5 ${t.textMuted} hover:${t.accentText} rounded disabled:opacity-50`}
                title="导出为TXT"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
          <textarea
            value={outputText}
            readOnly
            placeholder="转换结果将显示在这里..."
            className={`w-full h-64 px-3 py-2 border rounded-lg resize-none ${t.input}`}
          />
        </div>
      </div>

      {mode === 'batch' && (
        <button
          onClick={handleBatchConvert}
          className={`px-4 py-2 ${t.button} text-white rounded-lg flex items-center gap-2`}
        >
          <RefreshCw size={16} />
          开始批量转换
        </button>
      )}

      {showPreview && inputText && outputText && (
        <div className={`${t.emptyBg} rounded-lg p-4 border border-green-500/20`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-green-500" />
              <span className={`text-sm font-medium ${t.text}`}>转换预览</span>
            </div>
            {stats && stats.totalReplacements > 0 && (
              <span className={`text-xs ${t.textMuted}`}>
                共替换 {stats.totalReplacements} 处符号
              </span>
            )}
          </div>

          <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-sm leading-relaxed overflow-auto max-h-48`}>
            {diffSegments.map((seg, idx) => (
              <span
                key={idx}
                className={seg.changed ? 'bg-yellow-200 dark:bg-yellow-500/30 text-yellow-700 dark:text-yellow-300 rounded px-0.5' : ''}
              >
                {seg.text}
              </span>
            ))}
          </div>

          {uniqueChangedChars.length > 0 && (
            <div className={`mt-3 flex items-center gap-2 flex-wrap`}>
              <span className={`text-xs ${t.textMuted}`}>已替换的符号:</span>
              {uniqueChangedChars.map((char, idx) => {
                const originalRule = DEFAULT_RULES.find(r => r.english === char);
                return (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-mono`}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {stats && stats.totalReplacements > 0 && (
        <div className={`${t.emptyBg} rounded-lg p-4 border border-blue-500/20`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-blue-500" />
            <span className={`text-sm font-medium ${t.text}`}>转换统计</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div
                key={type}
                className={`p-2 rounded border ${t.border} text-center`}
              >
                <div className={`text-lg font-semibold ${t.text}`}>{count}</div>
                <div className={`text-xs ${t.textMuted}`}>{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`text-xs ${t.textMuted} bg-blue-500/10 border border-blue-500/30 rounded-lg p-3`}>
        <div className="font-medium text-blue-500 mb-1">使用说明</div>
        <ul className="space-y-0.5 ml-2">
          <li>• <strong>实时转换</strong>：输入文本时自动转换，适合少量文本</li>
          <li>• <strong>批量转换</strong>：输入完成后点击按钮转换，适合大量文本</li>
          <li>• <strong>转换设置</strong>：可自定义要转换的符号和保留的符号</li>
          <li>• <strong>差异对比</strong>：高亮显示被替换的符号位置</li>
          <li>• <strong>符号保留</strong>：添加在特定格式中需要保留的中文符号</li>
        </ul>
      </div>
    </div>
  );
}