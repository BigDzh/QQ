import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import type { System } from '../../types';

interface FilteredSystem {
  id: string;
  systemNumber?: string;
  systemName?: string;
  matchType?: 'exact' | 'fuzzy';
}

interface SystemSearchSelectProps {
  systems: System[];
  currentSystemId: string;
  onSelect: (systemId: string, systemNumber: string, systemName: string) => void;
  onClearSelection: () => void;
}

export function SystemSearchSelect({ systems, currentSystemId, onSelect, onClearSelection }: SystemSearchSelectProps) {
  const [systemSearchQuery, setSystemSearchQuery] = useState('');
  const [showSystemDropdown, setShowSystemDropdown] = useState(false);
  const [hasUserClearedSystemSearch, setHasUserClearedSystemSearch] = useState(false);
  const systemInputRef = useRef<HTMLInputElement>(null);
  const systemDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (systemDropdownRef.current && !systemDropdownRef.current.contains(event.target as Node)) {
        setShowSystemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSystems = useMemo((): FilteredSystem[] => {
    if (!systemSearchQuery.trim()) {
      return systems.map(s => ({ ...s, matchType: undefined as undefined }));
    }

    const query = systemSearchQuery.toLowerCase().trim();

    return systems
      .map((s: System) => {
        const nameLower = (s.systemName || '').toLowerCase();
        const numberLower = (s.systemNumber || '').toLowerCase();

        const nameExactMatch = nameLower === query || nameLower.startsWith(query);
        const numberExactMatch = numberLower === query || numberLower.startsWith(query);
        const nameFuzzyMatch = nameLower.includes(query);
        const numberFuzzyMatch = numberLower.includes(query);

        if (nameExactMatch || numberExactMatch) {
          return { ...s, matchType: 'exact' as const };
        } else if (nameFuzzyMatch || numberFuzzyMatch) {
          return { ...s, matchType: 'fuzzy' as const };
        }
        return null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null) as FilteredSystem[];
  }, [systems, systemSearchQuery]);

  const currentSystem = useMemo(() => {
    return systems.find((s: System) => s.id === currentSystemId);
  }, [systems, currentSystemId]);

  const handleSystemSelect = (systemId: string) => {
    const sys = systems.find((s: System) => s.id === systemId);
    onSelect(systemId, sys?.systemNumber || '', sys?.systemName || '');
    setSystemSearchQuery('');
    setShowSystemDropdown(false);
  };

  const handleClearSearch = () => {
    setSystemSearchQuery('');
    setHasUserClearedSystemSearch(true);
    setShowSystemDropdown(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>
        <input
          ref={systemInputRef}
          type="text"
          value={currentSystem && !systemSearchQuery && !hasUserClearedSystemSearch ? '' : systemSearchQuery}
          onChange={(e) => {
            setSystemSearchQuery(e.target.value);
            setHasUserClearedSystemSearch(false);
            setShowSystemDropdown(true);
          }}
          onFocus={(e) => {
            if (!systemSearchQuery && currentSystem) {
              e.target.select();
            }
            setShowSystemDropdown(true);
          }}
          className="w-full pl-9 pr-8 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 transition-all"
          placeholder={currentSystem ? `${currentSystem.systemName} - ${currentSystem.systemNumber}` : "搜索系统名称或编号..."}
        />
        {systemSearchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>
      {showSystemDropdown && (
        <div
          ref={systemDropdownRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto"
        >
          {filteredSystems.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-500 text-center">
              <div className="mb-1">未找到匹配的系统</div>
              <div className="text-xs text-gray-400">尝试输入不同的关键词搜索</div>
            </div>
          ) : (
            <>
              <div
                onClick={() => onClearSelection()}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!currentSystemId ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${!currentSystemId ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                    {!currentSystemId && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-gray-900 dark:text-gray-100">无关联系统</span>
                </div>
              </div>
              {systemSearchQuery.trim() && (
                <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  找到 {filteredSystems.length} 个匹配的系统
                </div>
              )}
              {filteredSystems.map((sys: FilteredSystem) => (
                <div
                  key={sys.id}
                  onClick={() => handleSystemSelect(sys.id)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${currentSystemId === sys.id ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${currentSystemId === sys.id ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                        {currentSystemId === sys.id && <Check size={12} className="text-white" />}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {highlightText(sys.systemName || '', systemSearchQuery)}
                      </div>
                    </div>
                    {sys.matchType === 'exact' && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">精确</span>
                    )}
                    {sys.matchType === 'fuzzy' && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">模糊</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-6">
                    编号: {highlightText(sys.systemNumber || '', systemSearchQuery)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
