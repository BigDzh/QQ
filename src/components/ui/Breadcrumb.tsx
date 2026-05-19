import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  truncation?: 'start' | 'middle' | 'end';
  className?: string;
}

const defaultSeparator = (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function Breadcrumb({
  items,
  separator = defaultSeparator,
  maxItems,
  truncation = 'end',
  className = '',
}: BreadcrumbProps) {
  let displayItems = items;

  if (maxItems && items.length > maxItems) {
    const ellipsisItem: BreadcrumbItem = {
      label: '...',
      href: undefined,
    };

    switch (truncation) {
      case 'start':
        displayItems = [items[0], ellipsisItem, ...items.slice(-(maxItems - 2))];
        break;
      case 'middle':
        displayItems = [items[0], ellipsisItem, ...items.slice(-(maxItems - 2))];
        break;
      case 'end':
      default:
        displayItems = [...items.slice(0, maxItems - 2), ellipsisItem, items[items.length - 1]];
        break;
    }
  }

  return (
    <nav aria-label="breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isClickable = !isLast && (item.href || item.onClick);

          const content = (
            <span className="flex items-center gap-1">
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          );

          return (
            <React.Fragment key={index}>
              <li>
                {isClickable ? (
                  <a
                    href={item.href || '#'}
                    onClick={item.onClick}
                    className="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  >
                    {content}
                  </a>
                ) : (
                  <span
                    className={`text-sm ${
                      isLast
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {content}
                  </span>
                )}
              </li>
              {!isLast && (
                <li className="flex items-center">
                  <span className="mx-1">{separator}</span>
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
