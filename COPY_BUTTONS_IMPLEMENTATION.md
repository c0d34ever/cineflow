# Copy Buttons Implementation

## ✅ Features Implemented

Copy buttons have been added throughout the application to allow users to quickly copy content to their clipboard.

### 1. Reusable CopyButton Component
**Location**: `components/CopyButton.tsx`

**Features**:
- Visual feedback: Shows checkmark icon when copied
- Fallback support: Works in older browsers using `document.execCommand`
- Customizable size: `sm`, `md`, `lg`
- Optional label: Can show "Copy" text or just icon
- Auto-reset: Returns to copy icon after 2 seconds

**Props**:
- `text`: The text content to copy
- `className`: Additional CSS classes
- `size`: Icon size (`sm` | `md` | `lg`)
- `showLabel`: Whether to show text label
- `label`: Custom label text

### 2. SceneCard Copy Buttons

#### Enhanced Prompt (Visual Direction)
- **Location**: Header of the Visual Direction section
- **Copies**: Full enhanced prompt text
- **Use Case**: Copy detailed scene descriptions for use in other tools

#### Dialogue
- **Location**: Dialogue section header
- **Copies**: Dialogue text only (without quotes)
- **Use Case**: Copy dialogue for scripts or subtitles

#### Context Summary (Flow Link)
- **Location**: Footer section, next to context text
- **Copies**: Context summary text
- **Use Case**: Copy context for continuity notes

#### Technical Details
- **Location**: Technical Details section header
- **Copies**: All technical specs formatted as:
  ```
  Scene ID: SEQ-001
  Lens & Angle: 35mm / Eye Level
  Camera Movement: Dolly Forward
  Zoom: None
  Transition: Cut
  Sound Design: Ambient
  Stunts: None
  ```
- **Use Case**: Copy all technical specifications for production notes

### 3. Comments Panel
- **Location**: Each comment card, next to pin/delete buttons
- **Copies**: Full comment content
- **Use Case**: Copy comments for reference or sharing

### 4. Scene Notes Panel
- **Location**: Each note card, next to resolve/delete buttons
- **Copies**: Full note content
- **Use Case**: Copy notes for documentation or sharing

### 5. Project Title (Header)
- **Location**: Studio header, next to project title
- **Copies**: Project title text
- **Use Case**: Copy project name for sharing or documentation

## 🎨 UI/UX Features

1. **Visual Feedback**:
   - Copy icon changes to green checkmark when copied
   - Smooth transition animations
   - Tooltip shows "Copied!" on hover after copy

2. **Consistent Design**:
   - Small, unobtrusive icons
   - Hover effects (amber color)
   - Positioned logically next to content

3. **Accessibility**:
   - Clear tooltips
   - Keyboard accessible
   - Screen reader friendly

## 🔧 Technical Implementation

### CopyButton Component
```typescript
<CopyButton 
  text="Content to copy"
  size="sm"
  className="optional-classes"
/>
```

### Clipboard API
- Uses modern `navigator.clipboard.writeText()` API
- Falls back to `document.execCommand('copy')` for older browsers
- Handles errors gracefully

### Integration Points
- All copy buttons stop event propagation to prevent unwanted clicks
- Copy buttons are disabled/hidden in batch mode where appropriate
- Copy buttons respect existing UI layouts

## 📝 Usage Examples

### Copy Scene Enhanced Prompt
1. Navigate to any scene card
2. Click the copy icon next to "Visual Direction"
3. Enhanced prompt is copied to clipboard
4. Paste anywhere you need it

### Copy Technical Details
1. Navigate to any scene card
2. Click the copy icon next to "Technical Details"
3. All technical specs are copied in formatted text
4. Use in production documents or spreadsheets

### Copy Comment
1. Open Comments panel
2. Click copy icon on any comment
3. Comment content is copied
4. Share or reference elsewhere

## 🚀 Future Enhancements

- Copy entire scene as formatted text
- Copy multiple scenes at once
- Copy project summary
- Copy episode details
- Export copied content in different formats
- Keyboard shortcuts for copy operations
- Copy with formatting (Markdown, HTML)

