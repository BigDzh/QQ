import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Trash2, Folder, FolderOpen, File, ChevronRight, CheckCircle, Clock, Search, X, Filter, Plus, FolderPlus } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';

interface Review {
  id: string;
  title: string;
  content: string;
  status: '待评审' | '通过' | '不通过' | '需修改';
  createdAt: string;
  createdBy: string;
  reviewer?: string;
  reviewDate?: string;
  systemName?: string;
  categories: string[];
  files?: ReviewFile[];
  comments?: ReviewComment[];
}

interface ReviewFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  uploadedBy: string;
  category: string;
  dataUrl?: string;
}

interface ReviewComment {
  id: string;
  createdBy: string;
  content: string;
  createdAt: string;
}

interface ReviewManagerProps {
  projectId: string;
  reviews: Review[];
  categories: string[];
  canEdit: boolean;
  currentUser: { username: string; id: string } | null;
  onAddReview: (review: Partial<Review>) => void;
  onOpenAddReviewModal?: () => void;
  onUpdateReview: (reviewId: string, updates: Partial<Review>) => void;
  onAddCategory: (reviewId: string, category: string, parentPath?: string) => void;
  onDeleteReview: (reviewId: string) => void;
  onReviewAction: (reviewId: string, status: '通过' | '不通过' | '需修改') => void;
  onUploadFiles: (reviewId: string, files: FileList | null, category?: string) => void;
  onDeleteFile: (reviewId: string, fileId: string) => void;
  onDeleteCategory: (reviewId: string, category: string) => void;
  onDownloadFile: (reviewId: string, fileId: string) => void;
  onDownloadCategory: (reviewId: string, category: string) => void;
  onDownloadAll: (reviewId: string) => void;
}

export function ReviewManager({
  reviews,
  categories,
  canEdit,
  currentUser,
  onAddReview,
  onOpenAddReviewModal,
  onUpdateReview,
  onAddCategory,
  onDeleteReview,
  onReviewAction,
  onUploadFiles,
  onDeleteFile,
  onDeleteCategory,
  onDownloadFile,
  onDownloadCategory,
  onDownloadAll,
}: ReviewManagerProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [expandedReviews, setExpandedReviews] = useState<string[]>([]);
  const [expandedReviewCategories, setExpandedReviewCategories] = useState<string[]>([]);
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<string>('');
  const [isDraggingReview, setIsDraggingReview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [navigatingReviewCategory, setNavigatingReviewCategory] = useState<{ reviewId: string; category: string } | null>(null);
  const [reviewNameFilter, setReviewNameFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedReviewNames, setSelectedReviewNames] = useState<string[]>([]);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<{ reviewId: string; parentPath: string } | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest('[data-folder-btn]')) {
        setSelectedFolderPath(null);
        setNewCategoryParent(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredReviews = reviews.filter(review => {
    const matchesName = review.title.toLowerCase().includes(reviewNameFilter.toLowerCase());
    const matchesSelected = selectedReviewNames.length === 0 || selectedReviewNames.includes(review.title);
    return matchesName && matchesSelected;
  });

  const buildCategoryTree = (categories: string[]): { name: string; path: string; level: number; children: string[] }[] => {
    const tree: { name: string; path: string; level: number; children: string[] }[] = [];
    const pathMap = new Map<string, { name: string; path: string; level: number; children: string[] }>();

    categories.forEach(cat => {
      const parts = cat.split('/');
      let currentPath = '';
      let currentLevel = 0;

      parts.forEach((part, index) => {
        currentPath = index === 0 ? part : `${currentPath}/${part}`;
        currentLevel = index;

        if (!pathMap.has(currentPath)) {
          const node = { name: part, path: currentPath, level: currentLevel, children: [] as string[] };
          pathMap.set(currentPath, node);

          if (index === 0) {
            tree.push(node);
          } else {
            const parentPath = parts.slice(0, index).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
              parent.children.push(currentPath);
            }
          }
        }
      });
    });

    return tree;
  };

  const renderCategoryTree = (
    tree: { name: string; path: string; level: number; children: string[] }[],
    reviewId: string,
    reviewFiles: ReviewFile[]
  ) => {
    return tree.map(node => {
      const nodeFiles = reviewFiles.filter(f => f.category === node.path);
      const isCatExpanded = expandedReviewCategories.includes(`${reviewId}-${node.path}`);
      const indentPx = node.level * 16;

      return (
        <div key={node.path}>
          <div
            className={`p-3 rounded border ${t.border} ${isDraggingReview === `${reviewId}-${node.path}` ? 'ring-2 ring-blue-400' : ''}`}
            style={{ marginLeft: `${indentPx}px` }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingReview(`${reviewId}-${node.path}`);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDraggingReview(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingReview(null);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                onUploadFiles(reviewId, files, node.path);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryExpand(reviewId, node.path);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCategoryExpand(reviewId, node.path);
                  }
                }}
                className={`flex items-center gap-2 text-sm font-medium rounded p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${t.text} hover:${t.hoverBg}`}
                aria-expanded={isCatExpanded}
                data-folder-btn={node.path}
              >
                {isCatExpanded ? <FolderOpen size={16} className={t.textMuted} /> : <Folder size={16} className={t.textMuted} />}
                {node.name}
                <span className={`text-xs ${t.textMuted}`}>({nodeFiles.length}个文件)</span>
              </button>
              <div className="flex gap-1">
                <label className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg} cursor-pointer`} title="上传到此处">
                  <Upload size={14} />
                  <input
                    type="file"
                    multiple
                    {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                    className="hidden"
                    onChange={(e) => onUploadFiles(reviewId, e.target.files, node.path)}
                  />
                </label>
                {nodeFiles.length > 0 && (
                  <button onClick={() => onDownloadCategory(reviewId, node.path)} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="下载此文件夹">
                    <Download size={14} />
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      const key = `${reviewId}-${node.path}`;
                      setNewCategoryParent({ reviewId, parentPath: node.path });
                      setNewCategoryInput('');
                      if (!expandedReviewCategories.includes(key)) {
                        setExpandedReviewCategories(prev => [...prev, key]);
                      }
                    }}
                    className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                    title="新增子文件夹"
                  >
                    <FolderPlus size={14} />
                  </button>
                )}
                <button onClick={() => setNavigatingReviewCategory({ reviewId, category: node.path })} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="进入文件夹">
                  <ChevronRight size={14} />
                </button>
                {canEdit && (
                  <button onClick={() => onDeleteCategory(reviewId, node.path)} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="删除此文件夹">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {newCategoryParent?.reviewId === reviewId && newCategoryParent?.parentPath === node.path && (
              <div className={`flex items-center gap-2 mt-2 p-2 border rounded transition-all duration-200 ${t.border}`}>
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') {
                      setNewCategoryParent(null);
                      setSelectedFolderPath(null);
                    }
                  }}
                  placeholder="输入子文件夹名称..."
                  className={`flex-1 px-2 py-1 text-sm border rounded ${t.border} ${t.text} ${t.card} focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  autoFocus
                />
                <button
                  onClick={() => handleAddCategory()}
                  className={`px-3 py-1 text-xs ${t.button} text-white rounded`}
                >
                  确定
                </button>
                <button
                  onClick={() => {
                    setNewCategoryParent(null);
                    setSelectedFolderPath(null);
                  }}
                  className={`px-3 py-1 text-xs border rounded ${t.border} ${t.textSecondary}`}
                >
                  取消
                </button>
              </div>
            )}

            {isCatExpanded && (
              <>
                {nodeFiles.length === 0 ? (
                  <p className={`text-xs ${t.textMuted} ml-6`}>暂无文件</p>
                ) : (
                  <div className="ml-6 space-y-1">
                    {nodeFiles.map(file => (
                      <div key={file.id} className={`flex items-center justify-between p-2 rounded ${t.hoverBg}`}>
                        <div className="flex items-center gap-2">
                          <File size={14} className={t.textMuted} />
                          <span className={`text-sm ${t.text}`}>{file.name}</span>
                          <span className={`text-xs ${t.textMuted}`}>{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => onDownloadFile(reviewId, file.id)} className={`p-1 rounded hover:${t.hoverBg}`} title="下载">
                            <Download size={14} className={t.textMuted} />
                          </button>
                          {canEdit && (
                            <button onClick={() => onDeleteFile(reviewId, file.id)} className={`p-1 rounded hover:${t.hoverBg}`} title="删除">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {node.children.length > 0 && (
                  <div className="mt-2">
                    {renderCategoryTree(
                      node.children.map(childPath => {
                        const parts = childPath.split('/');
                        const name = parts[parts.length - 1];
                        return { name, path: childPath, level: node.level + 1, children: [] as string[] };
                      }),
                      reviewId,
                      reviewFiles
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    });
  };

  const toggleReviewExpand = (reviewId: string) => {
    setExpandedReviews(prev =>
      prev.includes(reviewId) ? prev.filter(id => id !== reviewId) : [...prev, reviewId]
    );
  };

  const toggleCategoryExpand = (reviewId: string, category: string) => {
    const key = `${reviewId}-${category}`;
    setExpandedReviewCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddCategory = () => {
    if (newCategoryInput.trim() && newCategoryParent) {
      onAddCategory(newCategoryParent.reviewId, newCategoryInput.trim(), newCategoryParent.parentPath);
      setNewCategoryInput('');
      setNewCategoryParent(null);
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
        <Folder className={`mx-auto ${t.textMuted} mb-4`} size={48} />
        <p className={t.textMuted}>暂无评审</p>
      </div>
    );
  }

  if (filteredReviews.length === 0 && (reviewNameFilter || selectedReviewNames.length > 0)) {
    return (
      <div className="space-y-4">
        <div ref={filterDropdownRef} className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`relative flex items-center gap-1 px-3 py-2 text-sm border rounded-lg transition-all duration-200 flex-shrink-0 ${t.border} ${t.card} ${t.text} hover:${t.hoverBg} ${selectedReviewNames.length > 0 ? 'ring-2 ring-blue-400' : ''} ${showFilterDropdown ? 'ring-2 ring-blue-400' : ''}`}
            >
              <Filter size={16} />
              筛选
              {selectedReviewNames.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {selectedReviewNames.length}
                </span>
              )}
            </button>
            {showFilterDropdown && (
              <div className={`absolute z-10 mt-12 w-64 max-h-64 overflow-auto ${t.card} border ${t.border} rounded-lg shadow-lg transition-all duration-200 opacity-100 scale-100`}>
                <div className={`p-2 border-b ${t.border}`}>
                  <button
                    onClick={() => setSelectedReviewNames([])}
                    className={`text-xs ${t.textMuted} hover:${t.text} w-full text-left`}
                  >
                    清除选择
                  </button>
                </div>
                {reviews.map(review => (
                  <label
                    key={review.id}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:${t.hoverBg}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedReviewNames.includes(review.title)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReviewNames([...selectedReviewNames, review.title]);
                        } else {
                          setSelectedReviewNames(selectedReviewNames.filter(name => name !== review.title));
                        }
                      }}
                      className="rounded"
                    />
                    <span className={t.text}>{review.title}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input
                type="text"
                placeholder="筛选评审名称..."
                value={reviewNameFilter}
                onChange={(e) => setReviewNameFilter(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 text-sm border rounded-lg transition-all duration-200 ${t.border} ${t.text} ${t.card} focus:outline-none focus:ring-2 focus:ring-blue-400`}
              />
              {reviewNameFilter && (
                <button
                  onClick={() => setReviewNameFilter('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:${t.hoverBg}`}
                >
                  <X size={14} className={t.textMuted} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-sm ${t.textMuted} whitespace-nowrap`}>
              {filteredReviews.length}/{reviews.length} 个评审
            </span>
            {canEdit && (
              <button
                onClick={onOpenAddReviewModal || onAddReview}
                className={`flex items-center gap-1 px-3 py-2 text-sm ${t.button} rounded-lg text-white whitespace-nowrap transition-all duration-200 hover:brightness-110 active:brightness-95`}
              >
                <Plus size={16} />
                新建评审
              </button>
            )}
          </div>
        </div>
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <Search className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>未找到匹配的评审</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={filterDropdownRef} className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`relative flex items-center gap-1 px-3 py-2 text-sm border rounded-lg transition-all duration-200 flex-shrink-0 ${t.border} ${t.card} ${t.text} hover:${t.hoverBg} ${selectedReviewNames.length > 0 ? 'ring-2 ring-blue-400' : ''} ${showFilterDropdown ? 'ring-2 ring-blue-400' : ''}`}
          >
            <Filter size={16} />
            筛选
            {selectedReviewNames.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {selectedReviewNames.length}
              </span>
            )}
          </button>
          {showFilterDropdown && (
            <div className={`absolute z-10 mt-12 w-64 max-h-64 overflow-auto ${t.card} border ${t.border} rounded-lg shadow-lg transition-all duration-200 opacity-100 scale-100`}>
              <div className={`p-2 border-b ${t.border}`}>
                <button
                  onClick={() => setSelectedReviewNames([])}
                  className={`text-xs ${t.textMuted} hover:${t.text} w-full text-left`}
                >
                  清除选择
                </button>
              </div>
              {reviews.map(review => (
                <label
                  key={review.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:${t.hoverBg}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedReviewNames.includes(review.title)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedReviewNames([...selectedReviewNames, review.title]);
                      } else {
                        setSelectedReviewNames(selectedReviewNames.filter(name => name !== review.title));
                      }
                    }}
                    className="rounded"
                  />
                  <span className={t.text}>{review.title}</span>
                </label>
              ))}
            </div>
          )}
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              type="text"
              placeholder="筛选评审名称..."
              value={reviewNameFilter}
              onChange={(e) => setReviewNameFilter(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 text-sm border rounded-lg transition-all duration-200 ${t.border} ${t.text} ${t.card} focus:outline-none focus:ring-2 focus:ring-blue-400`}
            />
            {reviewNameFilter && (
              <button
                onClick={() => setReviewNameFilter('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:${t.hoverBg}`}
              >
                <X size={14} className={t.textMuted} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm ${t.textMuted} whitespace-nowrap`}>
            {filteredReviews.length}/{reviews.length} 个评审
          </span>
          {canEdit && (
            <button
              onClick={onOpenAddReviewModal || onAddReview}
              className={`flex items-center gap-1 px-3 py-2 text-sm ${t.button} rounded-lg text-white whitespace-nowrap transition-all duration-200 hover:brightness-110 active:brightness-95`}
            >
              <Plus size={16} />
              新建评审
            </button>
          )}
        </div>
      </div>

      {filteredReviews.map((review) => {
        const isExpanded = expandedReviews.includes(review.id);
        const reviewCategories = review.categories || categories || [];
        const reviewFiles = review.files || [];
        return (
          <div
            key={review.id}
            className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4 ${isDraggingReview === review.id ? 'ring-2 ring-blue-400' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingReview(review.id);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDraggingReview(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingReview(null);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                onUploadFiles(review.id, files);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => toggleReviewExpand(review.id)}
                    className={`p-1 rounded hover:${t.hoverBg}`}
                  >
                    {isExpanded ? <FolderOpen size={18} className={t.textMuted} /> : <Folder size={18} className={t.textMuted} />}
                  </button>
                  <button
                    onClick={() => toggleReviewExpand(review.id)}
                    className={`font-medium ${t.text} hover:underline text-left`}
                  >
                    {review.title}
                  </button>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    review.status === '通过' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    review.status === '不通过' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                    review.status === '需修改' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {review.status}
                  </span>
                </div>
                <p className={`text-sm ${t.textSecondary} mb-2`}>{review.content}</p>
                <div className={`text-xs ${t.textMuted}`}>
                  创建者: {review.createdBy} | 创建时间: {review.createdAt}
                  {review.reviewer && ` | 评审人: ${review.reviewer}`}
                  {review.reviewDate && ` | 评审时间: ${review.reviewDate}`}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {canEdit && (
                  <>
                    <label className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg} cursor-pointer`} title="上传">
                      <Upload size={16} />
                      <input
                        type="file"
                        multiple
                        {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                        className="hidden"
                        onChange={(e) => onUploadFiles(review.id, e.target.files)}
                      />
                    </label>
                    <button onClick={() => onDownloadAll(review.id)} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="下载">
                      <Download size={16} />
                    </button>
                    <button onClick={() => onDeleteReview(review.id)} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="删除">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                {canEdit && review.status === '待评审' && (
                  <>
                    <button onClick={() => onReviewAction(review.id, '通过')} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="通过">
                      <CheckCircle size={16} className="text-green-500" />
                    </button>
                    <button onClick={() => onReviewAction(review.id, '需修改')} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="需修改">
                      <Clock size={16} className="text-yellow-500" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className={`mt-4 pt-4 border-t ${t.border}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-medium ${t.text}`}>评审文件夹</h4>
                  <div className="flex gap-2">
                    {isUploading && <Clock size={16} className={`animate-spin ${t.textMuted}`} />}
                    <select
                      value={selectedCategoryForUpload}
                      onChange={(e) => setSelectedCategoryForUpload(e.target.value)}
                      className={`px-2 py-1 text-xs border rounded ${t.border} ${t.text} ${t.card}`}
                    >
                      <option value="">选择种类</option>
                      {reviewCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <label className={`flex items-center gap-1 px-3 py-1 text-xs ${t.button} text-white rounded cursor-pointer`}>
                      <Upload size={14} />
                      上传
                      <input
                        type="file"
                        multiple
                        {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                        className="hidden"
                        onChange={(e) => onUploadFiles(review.id, e.target.files)}
                      />
                    </label>
                    <button onClick={() => onDownloadAll(review.id)} className={`flex items-center gap-1 px-3 py-1 text-xs border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                      <Download size={14} />
                      下载
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => { setNewCategoryParent({ reviewId: review.id, parentPath: '' }); setNewCategoryInput(''); }}
                        className={`flex items-center gap-1 px-3 py-1 text-xs border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                      >
                        <FolderPlus size={14} />
                        新增文件夹
                      </button>
                    )}
                  </div>
                </div>

                {newCategoryParent?.reviewId === review.id && newCategoryParent?.parentPath === '' && (
                  <div className={`flex items-center gap-2 mb-3 p-2 border rounded ${t.border}`}>
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setNewCategoryParent(null); }}
                      placeholder="输入文件夹名称..."
                      className={`flex-1 px-2 py-1 text-sm border rounded ${t.border} ${t.text} ${t.card} focus:outline-none focus:ring-2 focus:ring-blue-400`}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddCategory()}
                      className={`px-3 py-1 text-xs ${t.button} text-white rounded`}
                    >
                      确定
                    </button>
                    <button
                      onClick={() => setNewCategoryParent(null)}
                      className={`px-3 py-1 text-xs border rounded ${t.border} ${t.textSecondary}`}
                    >
                      取消
                    </button>
                  </div>
                )}

                {reviewCategories.length === 0 ? (
                  <p className={`text-xs ${t.textMuted}`}>暂无种类文件夹</p>
                ) : (
                  <div className="space-y-3">
                    {renderCategoryTree(buildCategoryTree(reviewCategories), review.id, reviewFiles)}
                  </div>
                )}

                {isDraggingReview === review.id && (
                  <div className={`p-8 border-2 border-dashed rounded-lg text-center ${t.border}`}>
                    <Upload size={32} className={`mx-auto ${t.textMuted} mb-2`} />
                    <p className={`text-sm ${t.textMuted}`}>拖放文件或文件夹到此处上传</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ReviewManager;
