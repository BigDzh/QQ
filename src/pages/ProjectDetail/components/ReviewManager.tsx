import React, { useState } from 'react';
import { Upload, Download, Trash2, Folder, FolderOpen, File, ChevronRight, CheckCircle, Clock } from 'lucide-react';
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
  onUpdateReview: (reviewId: string, updates: Partial<Review>) => void;
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
  onUpdateReview,
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

  if (!reviews || reviews.length === 0) {
    return (
      <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
        <Folder className={`mx-auto ${t.textMuted} mb-4`} size={48} />
        <p className={t.textMuted}>暂无评审</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
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
                  </div>
                </div>

                {reviewCategories.length === 0 ? (
                  <p className={`text-xs ${t.textMuted}`}>暂无种类文件夹</p>
                ) : (
                  <div className="space-y-3">
                    {reviewCategories.map(category => {
                      const categoryFiles = reviewFiles.filter(f => f.category === category);
                      const isCatExpanded = expandedReviewCategories.includes(`${review.id}-${category}`);
                      return (
                        <div
                          key={category}
                          className={`p-3 rounded border ${t.border} ${isDraggingReview === `${review.id}-${category}` ? 'ring-2 ring-blue-400' : ''}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingReview(`${review.id}-${category}`);
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
                              onUploadFiles(review.id, files, category);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleCategoryExpand(review.id, category)}
                              className={`flex items-center gap-2 text-sm font-medium ${t.text} hover:${t.hoverBg} rounded p-1`}
                            >
                              {isCatExpanded ? <FolderOpen size={16} className={t.textMuted} /> : <Folder size={16} className={t.textMuted} />}
                              {category}
                              <span className={`text-xs ${t.textMuted}`}>({categoryFiles.length}个文件)</span>
                            </button>
                            <div className="flex gap-1">
                              <label className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg} cursor-pointer`} title="上传到此处">
                                <Upload size={14} />
                                <input
                                  type="file"
                                  multiple
                                  {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                                  className="hidden"
                                  onChange={(e) => onUploadFiles(review.id, e.target.files, category)}
                                />
                              </label>
                              {categoryFiles.length > 0 && (
                                <button onClick={() => onDownloadCategory(review.id, category)} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="下载此文件夹">
                                  <Download size={14} />
                                </button>
                              )}
                              <button onClick={() => setNavigatingReviewCategory({ reviewId: review.id, category })} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="进入文件夹">
                                <ChevronRight size={14} />
                              </button>
                              {canEdit && (
                                <button onClick={() => onDeleteCategory(review.id, category)} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`} title="删除此文件夹">
                                  <Trash2 size={14} className="text-red-400" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isCatExpanded && (
                            categoryFiles.length === 0 ? (
                              <p className={`text-xs ${t.textMuted} ml-6`}>暂无文件</p>
                            ) : (
                              <div className="ml-6 space-y-1">
                                {categoryFiles.map(file => (
                                  <div key={file.id} className={`flex items-center justify-between p-2 rounded ${t.hoverBg}`}>
                                    <div className="flex items-center gap-2">
                                      <File size={14} className={t.textMuted} />
                                      <span className={`text-sm ${t.text}`}>{file.name}</span>
                                      <span className={`text-xs ${t.textMuted}`}>{(file.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <button onClick={() => onDownloadFile(review.id, file.id)} className={`p-1 rounded hover:${t.hoverBg}`} title="下载">
                                        <Download size={14} className={t.textMuted} />
                                      </button>
                                      {canEdit && (
                                        <button onClick={() => onDeleteFile(review.id, file.id)} className={`p-1 rounded hover:${t.hoverBg}`} title="删除">
                                          <Trash2 size={14} className="text-red-400" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
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
