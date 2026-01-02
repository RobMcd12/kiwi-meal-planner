# Feature Plan: Responsive Tabs & Persistent Timers

## Overview
Two features to implement:
1. **Responsive Tabs** - Tabs that adapt to screen width with hamburger menu on mobile
2. **Persistent Timers** - Cooking timers that survive page navigation with global indicator

### User Preferences (Confirmed)
- Tab dropdowns: Show **Icon + Label + Badge** (full content)
- Timer access: **Global timer indicator** in header (clickable to reopen modal)
- Notifications: **Prompt with explanation** before requesting permission

---

## Feature 1: Responsive Tabs

### Requirements
- On **mobile**: ALL tab options in a hamburger/dropdown menu
- On **desktop**: Show visible tabs with "View More" dropdown if tabs overflow
- Apply to all components using tabs

### Files with Tabs (6 total)
| File | Tab Type | Tab Count |
|------|----------|-----------|
| `components/SettingsView.tsx` | Underline | 5 tabs |
| `components/FavoritesView.tsx` | Pill | 3 tabs |
| `components/AdminDashboard.tsx` | Pill | 7 tabs |
| `components/PantryManager.tsx` | Underline | 2 tabs |
| `components/RecipeUploadModal.tsx` | Button-group | 4 tabs |
| `components/admin/SubscriptionSettings.tsx` | Pill | 3 tabs |

### Implementation Approach

#### Create Reusable Component: `components/ResponsiveTabs.tsx`

```typescript
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;        // e.g., 'emerald', 'indigo', 'rose'
  badge?: number | string;
  hidden?: boolean;      // For conditional tabs
}

interface ResponsiveTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'underline' | 'pill' | 'button-group';
  visibleCount?: number; // Desktop: how many to show before "More"
}
```

#### Component Behavior
- **Mobile (< md breakpoint)**:
  - Show hamburger icon button with current tab label
  - Click opens dropdown with ALL tabs
  - Each tab shows icon + label
  - Close on selection or outside click

- **Desktop (>= md breakpoint)**:
  - Show first N tabs inline (N = visibleCount, default 4)
  - If more tabs exist, show "More" dropdown with remaining
  - Preserve existing styling per variant

#### CSS/Styling
- Use existing Tailwind patterns from each component
- `md:hidden` for mobile menu, `hidden md:flex` for desktop tabs
- Dropdown uses existing patterns (absolute positioning, shadow, rounded)

### Migration Steps

1. **Create** `components/ResponsiveTabs.tsx`
2. **Update** each file to use the new component:
   - Extract tab definitions into array
   - Replace inline tab buttons with `<ResponsiveTabs />`
   - Keep content rendering logic unchanged

### Files to Modify
- `components/ResponsiveTabs.tsx` (CREATE)
- `components/SettingsView.tsx` (lines 209-270)
- `components/FavoritesView.tsx` (tab section)
- `components/AdminDashboard.tsx` (tab section)
- `components/PantryManager.tsx` (tab section)
- `components/RecipeUploadModal.tsx` (lines 215-252)
- `components/admin/SubscriptionSettings.tsx` (tab section)

---

## Feature 2: Persistent Timers with Global Indicator

### Current State
- Timers are **in-memory only** (Map + setInterval)
- Lost when: modal closes, page navigates, browser closes
- Located in: `services/recipeChatService.ts` (TimerManager class)

### Requirements
- Timers persist across page navigation
- Timers persist across modal close/reopen
- **Global timer indicator** in app header showing active timers
- System notifications with **friendly permission prompt**
- Nice-to-have: Work when browser is closed (PWA)

### Implementation Approach

#### Part 1: Timer Storage Service

**Create** `services/timerStorageService.ts`:
```typescript
interface StoredTimer {
  id: string;
  name: string;
  recipeId?: string;       // Link to recipe for reopening
  recipeName?: string;     // Display name
  durationSeconds: number;
  startedAt: number;       // timestamp when timer started
  pausedAt?: number;       // timestamp when paused (if paused)
  isRunning: boolean;
}

// Functions:
- saveTimers(timers: StoredTimer[]): void
- loadTimers(): StoredTimer[]
- clearTimers(): void
- calculateRemainingTime(timer: StoredTimer): number
```

#### Part 2: Global Timer Context

**Create** `contexts/TimerContext.tsx`:
```typescript
interface TimerContextType {
  activeTimers: CookingTimer[];
  addTimer: (timer) => void;
  removeTimer: (id) => void;
  pauseTimer: (id) => void;
  resumeTimer: (id) => void;
  hasActiveTimers: boolean;
  expiredTimers: CookingTimer[];
  dismissExpiredTimer: (id) => void;
}
```
- Wrap app in `<TimerProvider>`
- Manages all timers globally (not just in modal)
- Handles localStorage persistence
- Handles notification permission and display

#### Part 3: Global Timer Indicator

**Create** `components/GlobalTimerIndicator.tsx`:
- Floats in header or fixed position
- Shows count of active timers
- Click expands to show timer list
- Click timer opens recipe chat modal for that recipe
- Pulsing/animated when timer expires

**Modify** `App.tsx`:
- Add `<TimerProvider>` wrapper
- Add `<GlobalTimerIndicator />` in header area

#### Part 4: Notification Permission Flow

**Create** `components/NotificationPermissionPrompt.tsx`:
- Friendly modal explaining benefits
- "Your timers will alert you even when the app is in the background"
- "Enable Notifications" / "Maybe Later" buttons
- Show on first timer creation

#### Part 5: Update RecipeChatModal

**Modify** `components/RecipeChatModal.tsx`:
- Use `useTimer()` hook from context instead of local state
- Pass recipe info when creating timers
- Remove local TimerManager (moved to context)

**Modify** `services/recipeChatService.ts`:
- Keep TimerManager class but make it work with context
- Add notification display on timer complete

### Files to Create
| File | Purpose |
|------|---------|
| `services/timerStorageService.ts` | localStorage persistence |
| `contexts/TimerContext.tsx` | Global timer state management |
| `components/GlobalTimerIndicator.tsx` | Header timer display |
| `components/NotificationPermissionPrompt.tsx` | Permission UI |

### Files to Modify
| File | Changes |
|------|---------|
| `App.tsx` | Add TimerProvider, GlobalTimerIndicator |
| `components/RecipeChatModal.tsx` | Use TimerContext, pass recipe info |
| `services/recipeChatService.ts` | Notification support |

---

## Implementation Order

### Phase 1: Responsive Tabs (7 files)
1. Create `components/ResponsiveTabs.tsx` - reusable component
2. Update `components/SettingsView.tsx` - 5 tabs, most complex
3. Update `components/AdminDashboard.tsx` - 7 tabs
4. Update `components/FavoritesView.tsx` - 3 tabs + view toggle
5. Update `components/RecipeUploadModal.tsx` - 4 mode tabs
6. Update `components/PantryManager.tsx` - 2 tabs
7. Update `components/admin/SubscriptionSettings.tsx` - 3 tabs

### Phase 2: Persistent Timers (8 files)
1. Create `services/timerStorageService.ts` - persistence layer
2. Create `contexts/TimerContext.tsx` - global state
3. Create `components/GlobalTimerIndicator.tsx` - header indicator
4. Create `components/NotificationPermissionPrompt.tsx` - permission UI
5. Modify `App.tsx` - add providers and indicator
6. Modify `components/RecipeChatModal.tsx` - use context
7. Modify `services/recipeChatService.ts` - notification support
8. Test persistence across page navigation

---

## Summary

| Feature | New Files | Modified Files | Complexity |
|---------|-----------|----------------|------------|
| Responsive Tabs | 1 | 6 | Medium |
| Persistent Timers | 4 | 3 | Medium-High |
| **Total** | **5** | **9** | - |

### Key Decisions Made
- Dropdown shows full Icon + Label + Badge
- Global timer indicator in header (clickable)
- Notification permission with friendly explanation prompt
