/**
 * Prompt user for text input with validation
 */
export const promptText = (
  message: string,
  defaultValue?: string,
  validator?: (value: string) => boolean | string
): string | null => {
  const input = window.prompt(message, defaultValue);
  
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  
  if (!trimmed) {
    return null;
  }

  if (validator) {
    const validationResult = validator(trimmed);
    if (validationResult === false) {
      return null;
    }
    if (typeof validationResult === 'string') {
      alert(validationResult);
      return null;
    }
  }

  return trimmed;
};

/**
 * Prompt user for text input with a check that it's different from current value
 */
export const promptTextDifferent = (
  message: string,
  currentValue: string,
  defaultValue?: string
): string | null => {
  return promptText(message, defaultValue, (value) => {
    if (value === currentValue) {
      return 'New value must be different from current value';
    }
    return true;
  });
};

/**
 * Confirm an action with the user
 */
export const confirmAction = (message: string): boolean => {
  return window.confirm(message);
};

/**
 * Confirm a destructive action (delete, remove, etc.)
 */
export const confirmDestructiveAction = (
  action: string,
  itemName?: string
): boolean => {
  const message = itemName
    ? `Are you sure you want to ${action} "${itemName}"? This action cannot be undone.`
    : `Are you sure you want to ${action}? This action cannot be undone.`;
  return confirmAction(message);
};

/**
 * Confirm deletion of an item
 */
export const confirmDelete = (itemName: string): boolean => {
  return confirmDestructiveAction('delete', itemName);
};

