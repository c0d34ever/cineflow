# Fix App.tsx - Remove Leftover Code

There's leftover code from lines 3497-3563 in App.tsx that needs to be removed.

## Issue
Lines 3497-3563 contain leftover code from an async function that was incorrectly placed. This code should be deleted.

## Manual Fix Required
Delete lines 3497-3563 in App.tsx. The file should go from:

```typescript
      {/* Copy Scene Settings Modal */}
      {showCopySettingsModal && sourceSceneForCopy && (
        
        return (
          <QuickActionsMenu
            // ... lots of leftover code ...
          />
        );
      )}

      {/* Copy Scene Settings Modal */}
      {showCopySettingsModal && sourceSceneForCopy && (
        <CopySceneSettingsModal
```

To:

```typescript
      {/* Copy Scene Settings Modal */}
      {showCopySettingsModal && sourceSceneForCopy && (
        <CopySceneSettingsModal
```

The QuickActionsMenuWrapper component is already correctly implemented at line 3451, so the duplicate/leftover code at lines 3497-3563 should be removed.

