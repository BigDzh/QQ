import type { Component } from '../../../types';

export type TabId = 'overview' | 'modules' | 'systems' | 'components' | 'reviews' | 'software' | 'documents' | 'design' | 'logs';

export interface ComponentStatusModalProps {
  show: boolean;
  onClose: () => void;
  component: Component;
  form: {
    status: string;
    reason: string;
  };
  onChange: (form: { status: string; reason: string }) => void;
  onSubmit: () => void;
}

export interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}
