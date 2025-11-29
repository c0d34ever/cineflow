/**
 * Keyboard Shortcuts System
 * Provides keyboard shortcuts for common actions
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
  description: string;
  action: () => void;
}

export class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getKeyString(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string): void {
    this.shortcuts.delete(key);
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Ctrl+S and Ctrl+K even in inputs
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 's' || event.key === 'k')
      ) {
        // Continue
      } else {
        return false;
      }
    }

    const key = this.getKeyStringFromEvent(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
      return true;
    }

    return false;
  }

  /**
   * Get all registered shortcuts for display
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get key string from shortcut config
   */
  private getKeyString(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.meta) parts.push('meta');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Get key string from keyboard event
   */
  private getKeyStringFromEvent(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.metaKey) parts.push('meta');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }
}

// Global instance
export const keyboardShortcuts = new KeyboardShortcutsManager();

// Initialize global keyboard listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    keyboardShortcuts.handleKeyDown(event);
  });
}

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], deps: any[] = []) {
  const React = require('react');
  const { useEffect } = React;

  useEffect(() => {
    shortcuts.forEach((shortcut) => {
      keyboardShortcuts.register(shortcut);
    });

    return () => {
      shortcuts.forEach((shortcut) => {
        const key = shortcut.key.toLowerCase();
        keyboardShortcuts.unregister(key);
      });
    };
  }, deps);
}

