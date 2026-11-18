# PACE Component Inventory

## Base UI Library (`src/components/ui/`)
| File | Exported Components | Purpose |
|------|---------------------|---------|
| `Button.jsx` | `Button`, `IconButton` | Primary (`--signal`), secondary, ghost, danger variants; `0px` radius |
| `Data.jsx` | `StatCard`, `Badge`, `ProgressBar`, `EmptyState`, `Skeleton` | Monospace metrics, status badges, progress bars, loading/empty states |
| `Feedback.jsx` | `Modal`, `Toast`, `Alert`, `ConfirmDialog` | Accessible dialogs, toast notifications, inline alerts |
| `Form.jsx` | `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `Field` | Form controls with validation & error states |
| `Icon.jsx` | `Icon` | Unified Lucide React icon wrapper |
| `Navigation.jsx` | `Sidebar`, `MobileNav`, `TopBar`, `Tabs` | Responsive navigation shell (desktop sidebar + mobile bottom nav) |
| `Social.jsx` | `Avatar`, `ReactionBar`, `ActivityItem`, `GroupCard` | Social & group accountability primitives |
| `index.js` | Barrel exports | Central export for `src/components/ui/*` |

## Feature Views & Modals (`src/components/`)
| Component | Path | Purpose |
|-----------|------|---------|
| `TodayView` | `src/components/TodayView.jsx` | Daily check-in dashboard, 1-tap & quantity check-ins, streak display |
| `HabitsView` | `src/components/HabitsView.jsx` | Habit list, pause/archive/restore, filtering |
| `HabitModal` | `src/components/HabitModal.jsx` | Create/edit habit with schedule, target, effective date |
| `ProgressView` | `src/components/ProgressView.jsx` | Calendar heatmap, streaks, completion rates |
| `GroupsView` | `src/components/GroupsView.jsx` | Accountability groups, shared habits, invites |
| `DiscoverView` | `src/components/DiscoverView.jsx` | Habit templates & preset catalog |
| `SettingsView` | `src/components/SettingsView.jsx` | Theme, notifications, backup/export/import, account security |
| `AuthModal` | `src/components/AuthModal.jsx` | Sign in, register, password recovery |
| `OnboardingStarter` | `src/components/OnboardingStarter.jsx` | First-run habit starter flow |
| `DailyEngagement` | `src/components/DailyEngagement.jsx` | Grace period, streak freeze, daily engagement prompts |
