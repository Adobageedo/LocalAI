/**
 * Performance Utilities
 * Tools and helpers for optimizing application performance
 * @module utils/performance
 */

import { useEffect, useRef, useState } from 'react';
import { logger } from '../services';

/**
 * Debounce function
 * Delays execution until after wait milliseconds have elapsed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Throttle function
 * Ensures function is only called once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * React hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Performance monitoring - measure component render time
 */
export function measurePerformance(componentName: string): () => void {
  if (process.env.NODE_ENV === 'production') return () => {};

  const start = performance.now();

  return () => {
    const end = performance.now();
    const duration = end - start;

    if (duration > 16) {
      // Longer than 1 frame at 60fps
      logger.warn(`Slow render detected in ${componentName}`, 'Performance', { duration: `${duration.toFixed(2)}ms` });
    }
  };
}

/**
 * React hook to measure component performance
 */
export function usePerformanceMeasure(componentName: string): void {
  useEffect(() => {
    const cleanup = measurePerformance(componentName);
    return cleanup;
  });
}

/**
 * Lazy load images with Intersection Observer
 */
export function useLazyLoad(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref, isVisible };
}

/**
 * Memoization helper for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    return result;
  }) as T;
}

/**
 * Check if code splitting is supported
 */
export function isCodeSplittingSupported(): boolean {
  try {
    return typeof Promise !== 'undefined' && typeof Symbol !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn().catch((error) => {
    logger.error('Failed to preload component', 'Performance', error);
  });
}

/**
 * Get Web Vitals metrics
 */
export function reportWebVitals(onPerfEntry?: (metric: any) => void): void {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
}

/**
 * Log Web Vitals to analytics
 */
export function logWebVitals(): void {
  reportWebVitals((metric) => {
    logger.info(`Web Vital: ${metric.name}`, 'Performance', {
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
    });

    // Send to analytics service
    // Example: analytics.track('web_vital', { ...metric });
  });
}

