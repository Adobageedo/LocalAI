/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 * @module components/common/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Stack, MessageBar, MessageBarType, PrimaryButton, Text } from '@fluentui/react';
import { logger } from '../../services';
import { theme } from '../../styles';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary to catch and handle React errors
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    logger.error('React Error Boundary caught an error', 'ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Stack
          horizontalAlign="center"
          verticalAlign="center"
          styles={{
            root: {
              height: '100vh',
              padding: theme.spacing.xl,
              backgroundColor: theme.colors.backgroundAlt,
            },
          }}
          tokens={{ childrenGap: theme.spacing.md }}
        >
          <Text variant="xxLarge" styles={{ root: { color: theme.colors.error } }}>
            ⚠️ Oops! Something went wrong
          </Text>

          <MessageBar messageBarType={MessageBarType.error} isMultiline>
            <Text variant="mediumPlus" block>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            {this.state.errorInfo && (
              <details style={{ marginTop: 10, cursor: 'pointer' }}>
                <summary>Technical Details</summary>
                <pre
                  style={{
                    marginTop: 10,
                    padding: 10,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 4,
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </MessageBar>

          <Stack horizontal tokens={{ childrenGap: theme.spacing.sm }}>
            <PrimaryButton text="Try Again" onClick={this.handleReset} />
            <PrimaryButton
              text="Reload Page"
              onClick={() => window.location.reload()}
              styles={{ root: { backgroundColor: theme.colors.backgroundAlt } }}
            />
          </Stack>

          <Text variant="small" styles={{ root: { color: theme.colors.textSecondary, marginTop: theme.spacing.lg } }}>
            If the problem persists, please contact support.
          </Text>
        </Stack>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
