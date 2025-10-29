/**
 * Component UI Types
 * Types communs pour les composants React
 */

import { ReactNode, CSSProperties } from 'react';

/**
 * Props de base pour tous les composants
 */
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  id?: string;
  testId?: string;
  children?: ReactNode;
}

/**
 * Props pour composants avec état de chargement
 */
export interface LoadableProps {
  isLoading?: boolean;
  loadingText?: string;
  loadingComponent?: ReactNode;
}

/**
 * Props pour composants avec état d'erreur
 */
export interface ErrorProps {
  error?: string | Error;
  onRetry?: () => void;
  errorComponent?: ReactNode;
}

/**
 * Props pour composants avec état vide
 */
export interface EmptyStateProps {
  isEmpty?: boolean;
  emptyText?: string;
  emptyComponent?: ReactNode;
}

/**
 * Taille de composant
 */
export type ComponentSize = 'small' | 'medium' | 'large';

/**
 * Variante de composant
 */
export type ComponentVariant = 'primary' | 'secondary' | 'tertiary';

/**
 * Status de composant
 */
export type ComponentStatus = 'default' | 'success' | 'warning' | 'error' | 'info';

/**
 * Props pour composants avec callbacks
 */
export interface CallbackProps<T = any> {
  onChange?: (value: T) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
}

/**
 * Props pour composants de formulaire
 */
export interface FormComponentProps extends BaseComponentProps {
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
}

/**
 * Props pour boutons
 */
export interface ButtonProps extends BaseComponentProps, LoadableProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: ComponentVariant;
  size?: ComponentSize;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: () => void;
}

/**
 * Props pour modales
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  size?: ComponentSize;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
}

/**
 * Props pour toasts/notifications
 */
export interface ToastProps extends BaseComponentProps {
  type?: ComponentStatus;
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Props pour tooltips
 */
export interface TooltipProps extends BaseComponentProps {
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  trigger?: 'hover' | 'click' | 'focus';
}

/**
 * Props pour dropdowns
 */
export interface DropdownProps<T = any> extends FormComponentProps {
  options: DropdownOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

/**
 * Option de dropdown
 */
export interface DropdownOption<T = any> {
  key: string;
  text: string;
  value: T;
  disabled?: boolean;
  icon?: ReactNode;
}

/**
 * Props pour inputs
 */
export interface InputProps extends FormComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string | number;
  onChange?: (value: string) => void;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/**
 * Props pour textarea
 */
export interface TextAreaProps extends FormComponentProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  maxLength?: number;
  autoResize?: boolean;
}

/**
 * Props pour checkbox
 */
export interface CheckboxProps extends FormComponentProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

/**
 * Props pour cards
 */
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

/**
 * Props pour tabs
 */
export interface TabsProps extends BaseComponentProps {
  items: TabItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  variant?: 'line' | 'card';
}

/**
 * Item de tab
 */
export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * Props pour accordions
 */
export interface AccordionProps extends BaseComponentProps {
  items: AccordionItem[];
  activeKeys?: string[];
  onChange?: (keys: string[]) => void;
  multiple?: boolean;
}

/**
 * Item d'accordion
 */
export interface AccordionItem {
  key: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * Props pour pagination
 */
export interface PaginationProps extends BaseComponentProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange?: (page: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}
