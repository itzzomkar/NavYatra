// Accessibility utilities for the KMRL Train Induction System
// This file provides utilities for making the application more accessible

import React, { useEffect, useRef } from 'react';

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private container: HTMLDivElement | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    this.container.style.position = 'absolute';
    this.container.style.left = '-10000px';
    this.container.style.width = '1px';
    this.container.style.height = '1px';
    this.container.style.overflow = 'hidden';
    document.body.appendChild(this.container);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.container) {
      this.createContainer();
    }

    if (this.container) {
      this.container.setAttribute('aria-live', priority);
      this.container.textContent = message;
    }
  }

  announceWithDelay(message: string, delay: number = 100, priority: 'polite' | 'assertive' = 'polite') {
    setTimeout(() => {
      this.announce(message, priority);
    }, delay);
  }
}

// Singleton instance
export const screenReader = new ScreenReaderAnnouncer();

// Focus management utilities
export const focusUtils = {
  // Set focus to element with error handling
  setFocus: (element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      try {
        element.focus();
      } catch (error) {
        console.warn('Failed to set focus:', error);
      }
    }
  },

  // Set focus by selector
  setFocusBySelector: (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    focusUtils.setFocus(element);
  },

  // Trap focus within container
  trapFocus: (container: HTMLElement, firstFocusableElement?: HTMLElement, lastFocusableElement?: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = firstFocusableElement || (focusableElements[0] as HTMLElement);
    const lastElement = lastFocusableElement || (focusableElements[focusableElements.length - 1] as HTMLElement);

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            focusUtils.setFocus(lastElement);
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            focusUtils.setFocus(firstElement);
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};

// Keyboard navigation utilities
export const keyboardUtils = {
  // Check if key is navigation key
  isNavigationKey: (key: string): boolean => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
  },

  // Check if key is action key
  isActionKey: (key: string): boolean => {
    return ['Enter', ' ', 'Space'].includes(key);
  },

  // Check if key is escape key
  isEscapeKey: (key: string): boolean => {
    return key === 'Escape';
  },

  // Handle arrow key navigation in list
  handleListNavigation: (
    event: KeyboardEvent,
    items: NodeListOf<Element> | Element[],
    currentIndex: number,
    onIndexChange: (index: number) => void
  ) => {
    const itemArray = Array.from(items);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, itemArray.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = itemArray.length - 1;
        break;
      default:
        return;
    }

    onIndexChange(newIndex);
    focusUtils.setFocus(itemArray[newIndex] as HTMLElement);
  }
};

// Color contrast utilities
export const colorUtils = {
  // Calculate relative luminance
  getRelativeLuminance: (color: string): number => {
    const rgb = colorUtils.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  // Convert hex to RGB
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // Calculate contrast ratio
  getContrastRatio: (color1: string, color2: string): number => {
    const lum1 = colorUtils.getRelativeLuminance(color1);
    const lum2 = colorUtils.getRelativeLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG standards
  meetsContrastStandard: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = colorUtils.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  }
};

// React hooks for accessibility
export const useAccessibleFocus = (autoFocus: boolean = false) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      focusUtils.setFocus(ref.current);
    }
  }, [autoFocus]);

  return ref;
};

export const useScreenReaderAnnouncement = (message: string, deps: any[] = []) => {
  useEffect(() => {
    if (message) {
      screenReader.announceWithDelay(message);
    }
  }, deps);
};

export const useKeyboardNavigation = (
  keys: string[],
  handler: (event: KeyboardEvent) => void,
  element?: HTMLElement | null
) => {
  useEffect(() => {
    const targetElement = element || document;
    
    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keys.includes(keyboardEvent.key)) {
        handler(keyboardEvent);
      }
    };

    targetElement.addEventListener('keydown', handleKeyDown);
    
    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [keys, handler, element]);
};

export const useFocusTrap = (containerRef: React.RefObject<HTMLElement>, active: boolean) => {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const cleanup = focusUtils.trapFocus(containerRef.current);
    
    return cleanup;
  }, [active, containerRef]);
};

// ARIA utilities
export const ariaUtils = {
  // Generate unique ID for ARIA relationships
  generateId: (prefix: string = 'aria'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Set ARIA attributes
  setAttributes: (element: HTMLElement, attributes: Record<string, string | boolean | number>) => {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key.startsWith('aria-') || key === 'role') {
        element.setAttribute(key, String(value));
      }
    });
  },

  // Remove ARIA attributes
  removeAttributes: (element: HTMLElement, attributes: string[]) => {
    attributes.forEach(attr => {
      if (attr.startsWith('aria-') || attr === 'role') {
        element.removeAttribute(attr);
      }
    });
  },

  // Announce loading state
  announceLoading: (isLoading: boolean, message?: string) => {
    const defaultMessage = isLoading ? 'Loading...' : 'Loading complete';
    screenReader.announce(message || defaultMessage);
  },

  // Announce form errors
  announceFormErrors: (errors: string[]) => {
    if (errors.length > 0) {
      const message = `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`;
      screenReader.announce(message, 'assertive');
    }
  },

  // Announce data changes
  announceDataChange: (action: string, item: string, count?: number) => {
    let message = `${action} ${item}`;
    if (count !== undefined) {
      message += `. ${count} item${count !== 1 ? 's' : ''} total`;
    }
    screenReader.announce(message);
  }
};

// Error boundary for accessibility
export class AccessibilityErrorBoundary extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessibilityError';
  }
}

// Accessibility testing utilities (for development)
export const a11yTesting = {
  // Check for missing alt text
  checkMissingAltText: (): HTMLImageElement[] => {
    const images = document.querySelectorAll('img');
    return Array.from(images).filter(img => !img.alt && !img.getAttribute('aria-label'));
  },

  // Check for missing form labels
  checkMissingFormLabels: (): HTMLInputElement[] => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).filter(input => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledby = input.getAttribute('aria-labelledby');
      return !hasLabel && !hasAriaLabel && !hasAriaLabelledby;
    }) as HTMLInputElement[];
  },

  // Check for missing headings structure
  checkHeadingStructure: (): { level: number; text: string; element: HTMLElement }[] => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings).map(heading => ({
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent || '',
      element: heading as HTMLElement
    }));
  },

  // Check color contrast issues
  checkColorContrast: (): { element: HTMLElement; foreground: string; background: string; ratio: number }[] => {
    const issues: { element: HTMLElement; foreground: string; background: string; ratio: number }[] = [];
    
    // This is a simplified version - in practice, you'd want a more comprehensive contrast checker
    const textElements = document.querySelectorAll('p, span, a, button, input, label, h1, h2, h3, h4, h5, h6');
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Only check if we have both colors (simplified check)
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        try {
          const ratio = colorUtils.getContrastRatio(color, backgroundColor);
          if (ratio < 4.5) {
            issues.push({
              element: element as HTMLElement,
              foreground: color,
              background: backgroundColor,
              ratio
            });
          }
        } catch (error) {
          // Skip if color parsing fails
        }
      }
    });
    
    return issues;
  },

  // Generate accessibility report
  generateReport: () => {
    const missingAltText = a11yTesting.checkMissingAltText();
    const missingLabels = a11yTesting.checkMissingFormLabels();
    const headingStructure = a11yTesting.checkHeadingStructure();
    const contrastIssues = a11yTesting.checkColorContrast();

    return {
      missingAltText: {
        count: missingAltText.length,
        elements: missingAltText
      },
      missingLabels: {
        count: missingLabels.length,
        elements: missingLabels
      },
      headingStructure: {
        headings: headingStructure,
        issues: headingStructure.filter((h, i, arr) => {
          if (i === 0) return h.level !== 1;
          return h.level > arr[i - 1].level + 1;
        })
      },
      contrastIssues: {
        count: contrastIssues.length,
        issues: contrastIssues
      }
    };
  }
};

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
};

// Export all utilities as a single object for easy importing
export default {
  screenReader,
  focusUtils,
  keyboardUtils,
  colorUtils,
  ariaUtils,
  a11yTesting,
  useAccessibleFocus,
  useScreenReaderAnnouncement,
  useKeyboardNavigation,
  useFocusTrap,
  useHighContrastMode,
  useReducedMotion
};