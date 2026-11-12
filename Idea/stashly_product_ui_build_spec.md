# Stashly --- Product & UI Implementation Specification

**Build brief for Claude Code**\
**Document version:** 1.0\
**Product type:** Personal goal-based savings tracker\
**Primary platform:** Mobile-first (Android + iOS)\
**Working name:** Stashly\
**Tagline:** Save with intention. Buy with confidence.

------------------------------------------------------------------------

## 1. Product vision

Build **Stashly**, a polished, gesture-first personal savings app that
helps people save toward products or experiences they want to purchase.

A user creates a goal (for example, a phone, laptop, camera, bike,
holiday or any personal purchase), sets its target price, and records
the money they set aside over time. Stashly tracks progress, saving
behaviour, calendar activity and estimated completion dates.

Stashly is **not a bank, wallet, investment app or payment processor**.
It records savings that users have set aside elsewhere. It does not
hold, transfer or invest money.

### Core product promise

> Turn a purchase intention into a visible, motivating saving habit.

### Product principles

1.  **Fast daily action:** recording a contribution should take seconds.
2.  **Gesture-first, not gesture-only:** gestures add delight, but
    visible controls and accessible alternatives must always exist.
3.  **Clarity over decoration:** money, progress and next actions must
    be immediately understandable.
4.  **No guilt mechanics:** missed days are neutral; never shame users
    or imply they failed.
5.  **Honest analytics:** distinguish actual recorded savings from
    estimates and projections.
6.  **Offline-first:** core actions work without an internet connection.
7.  **Premium restraint:** motion and visual effects should be
    purposeful, not noisy.

------------------------------------------------------------------------

## 2. Product identity and visual direction

### Name

**Stashly** is the selected working name. Before public release, verify
trademark, app-store name and domain availability. Do not assume the
name is legally available.

### Tagline

**Save with intention. Buy with confidence.**

### Design concept

The app should feel like an elegant interactive savings instrument, not
a conventional finance dashboard.

The visual language combines: - Apple-like interaction clarity and
restraint. - A distinctive, contemporary visual identity. - Soft depth,
product imagery and fluid progress animations. - A calm, premium
editorial layout.

Avoid copying any specific company's interface. Use the references above
only as broad design inspiration.

### Visual tokens

Use a consistent design system. Suggested starting tokens:

**Light theme** - Background: warm off-white / very light neutral. -
Primary text: deep charcoal. - Secondary text: muted grey-green. -
Primary accent: forest green. - Success: restrained emerald. - Borders:
subtle warm grey. - Surfaces: white or slightly tinted neutral.

**Dark theme** - Background: deep charcoal with a green undertone. -
Primary text: warm white. - Secondary text: muted sage. - Primary
accent: soft mint / emerald. - Surfaces: slightly lighter
charcoal-green. - Borders: low-contrast green-grey.

Suggested palette (treat as initial tokens and tune during
implementation): - `light.background`: `#F6F7F3` - `light.surface`:
`#FFFFFF` - `light.text`: `#17221D` - `light.muted`: `#78847D` -
`light.primary`: `#167A58` - `light.primarySoft`: `#DDF2E8` -
`dark.background`: `#101A17` - `dark.surface`: `#192621` -
`dark.surfaceRaised`: `#22332B` - `dark.text`: `#F3F7F3` - `dark.muted`:
`#A8BDB2` - `dark.primary`: `#68D9A5` - `dark.primarySoft`: `#244B3C`

Typography: - Use a highly legible modern sans-serif. - Use tabular
numerals for currency and analytics. - Make important monetary amounts
large and calm, not shouty. - Maintain clear type hierarchy and
accessible contrast.

Shape and layout: - Rounded surfaces, but avoid putting every element in
a card. - Use generous spacing and a consistent spacing scale. - Avoid
excessive glassmorphism, gradients, shadows and nested cards. - Use
product imagery sparingly and consistently.

------------------------------------------------------------------------

## 3. Information architecture and navigation

### Main sections

1.  **Home** --- overview, active goal, quick contribution entry.
2.  **Goals** --- create, browse and manage purchase goals.
3.  **Calendar** --- monthly calendar and interactive savings timeline.
4.  **Insights** --- analytics, trends and goal projections.
5.  **Settings/Profile** --- preferences, currency, backup and app
    settings.

### No conventional bottom navigation

Do not implement a standard five-item bottom tab bar.

Use a custom **Floating Navigation Compass**: - A compact floating
control, preferably near the top-right or another consistently
discoverable location. - Tapping it expands a radial menu with Home,
Goals, Calendar, Insights and Settings. - The currently selected
destination is visually highlighted. - Tapping outside closes the
menu. - The menu must not obscure key content. - Support screen-reader
labels and standard tap targets.

Also support horizontal swiping between the main content sections where
it is natural. Do not make swiping the only way to navigate. Provide
visible affordances and preserve predictable back navigation.

### Navigation behaviour

-   Home is the default landing screen.
-   A selected goal can be opened from Home, Goals, Calendar entries or
    Insights.
-   A contribution can be initiated from Home, a goal detail screen or a
    calendar date.
-   The contribution flow must retain the selected goal and date when
    opened from those contexts.
-   Back navigation should return to the exact previous context.
-   Avoid accidental navigation when the user is scrolling a chart,
    calendar or product carousel.

------------------------------------------------------------------------

## 4. Core screens and detailed UI requirements

## 4.1 Home --- personal savings overview

The home screen should communicate three things immediately: 1. How much
the user has recorded as saved. 2. Which goals are active. 3. How to
record a contribution now.

### Layout

**Header** - Greeting or concise contextual message. - Floating
Navigation Compass. - Optional profile/settings shortcut if it does not
compete with the compass.

**Total savings overview** - Prominent total recorded savings across
active goals. - Current month contribution total. - Optional small
comparison with the previous month, only when sufficient data exists. -
Clearly label totals so users understand what is being counted.

**Featured goal** - Show one featured or most relevant active goal. -
Product image or tasteful illustration. - Goal name, saved amount,
target amount and progress. - Remaining amount. - A clear action to open
goal details.

**Other goals** - Horizontal, swipeable product-object carousel. - Each
goal should have a distinct product image or fallback icon. - Avoid
cramming too many goals onto Home. - Include a clear "View all goals"
action.

**Quick contribution action** - A visually prominent action to open the
Savings Dial. - If there is only one active goal, preselect it. - If
there are multiple goals, ask the user to select a goal before
confirming the contribution.

**Recent activity** - Show a short list of recent contributions and
withdrawals. - Include date, goal, amount and transaction type. - Link
to full history.

### Home states

-   New user / no goals: welcoming empty state and "Create your first
    goal".
-   No contributions yet: show the goal target and invite the first
    contribution.
-   Offline: show a subtle offline indicator; do not block recording.
-   Sync pending: show a small pending-sync state without alarming the
    user.

------------------------------------------------------------------------

## 4.2 Goals --- product-focused goal collection

Goals should feel like a collection of things the user is working
toward, not rows in a spreadsheet.

### Goal creation

Fields: - Goal/product name (required). - Target amount (required;
greater than zero). - Product image (optional; upload, choose from
gallery, or use a fallback illustration). - Product URL (optional). -
Target purchase date (optional). - Category (optional: Electronics,
Travel, Vehicle, Home, Fashion, Education, Other). - Priority (optional:
Low, Medium, High). - Notes (optional). - Suggested daily or weekly
contribution (optional; can be calculated).

### Goal object cards

-   Use product imagery with a consistent crop and aspect ratio.
-   Give the image enough breathing room.
-   Show name, saved amount, target amount and progress.
-   Use a subtle progress ring or bar.
-   Horizontal swipe to move between goals.
-   Tapping opens Goal Details.
-   Avoid excessive 3D effects that make product images hard to
    recognize.

### Goal detail screen

Display: - Large product image. - Goal name and category. - Saved
amount. - Target amount. - Remaining amount. - Progress percentage. -
Target date if set. - Estimated completion date, with an "estimate"
label. - Contribution history for this goal. - Primary "Add savings"
action. - Edit goal action. - Archive or delete action with
confirmation.

### Goal lifecycle

Statuses: - `ACTIVE` - `COMPLETED` - `ARCHIVED`

When recorded savings reach or exceed the target: - Mark the goal as
completed. - Show a restrained celebratory animation. - Do not prevent
the user from recording an additional contribution unless product rules
explicitly require it. - Ask whether the user wants to archive the goal
or keep it visible. - If a later withdrawal takes the balance below the
target, update the goal status transparently.

### Editing target amount

Allow users to change the target amount. Preserve transaction history.
Recalculate progress and estimated completion date. Show a small
explanation that changing the target affects the displayed progress.

------------------------------------------------------------------------

## 4.3 Savings Dial --- signature contribution interaction

This is the app's most important interaction and should receive the most
design and engineering attention.

Do not use a conventional amount input as the primary experience. Build
a tactile, gesture-driven amount selector with a reliable numeric-entry
fallback.

### Visual composition

-   Deep forest-green or theme-appropriate focused surface.
-   Large monetary amount centered on screen.
-   A circular or semi-circular progress/dial visualization.
-   A visible gesture hint: "Swipe up to increase · Swipe down to
    decrease".
-   Increment controls.
-   Selected goal context.
-   Selected contribution date (default today).
-   A clear confirmation affordance.

### Interaction model

**Amount adjustment** - Vertical drag upward increases the amount. -
Vertical drag downward decreases the amount. - Horizontal drag changes
adjustment sensitivity. - Use discrete, understandable increments. -
Example increment levels: ₹10, ₹100 and ₹500. - Provide visible controls
such as `− ₹100`, `+ ₹100`, and `+ ₹500`. - Tapping the displayed amount
opens a numeric keypad for exact entry. - Never make the gesture the
only way to set the amount.

**Sensitivity** - Provide a clear indication of the current increment. -
A horizontal gesture may change the increment level, but do not let a
casual horizontal movement unexpectedly change the amount by a large
value. - Consider a dedicated increment selector as an accessible
alternative. - Clamp the amount at zero; negative contributions must use
the separate withdrawal flow.

**Confirmation** - The user swipes upward into a clearly visible "Save
contribution" confirmation zone, or taps a clear confirmation button. -
Do not save merely because the user started a gesture. - Show the
selected goal, amount and date before final confirmation. - After
successful local persistence, show a concise confirmation and an Undo
action. - If the save fails, preserve the entered amount and show a
recoverable error.

**Haptics and animation** - Light haptic tick at meaningful increment
boundaries. - A slightly stronger haptic on confirmation. - Smooth
amount transitions, but do not animate every digit so slowly that entry
feels laggy. - Animate the contribution visually flowing into the goal's
progress ring after confirmation. - Respect reduced-motion accessibility
settings. - Haptics must be optional and respect device settings.

### Contribution fields

-   Goal (required).
-   Amount (required; positive).
-   Date (defaults to today; may be changed).
-   Note (optional).
-   Created timestamp.
-   Source/context (optional internal metadata, e.g. Home, Goal Details,
    Calendar).

### Multiple entries per day

Allow multiple contributions to the same goal on the same day. Do not
force one daily total entry. The daily total is the sum of that day's
contributions minus withdrawals, where relevant.

### Editing and deleting

-   Users can edit a contribution.
-   Users can delete a contribution after a confirmation step.
-   Preserve audit metadata where practical.
-   Recalculate all dependent totals and analytics after changes.
-   Provide Undo immediately after an entry where feasible.

### Numeric validation

-   Amount must be greater than zero.
-   Respect selected currency precision (INR typically supports two
    decimal places, but UI can default to whole rupees).
-   Prevent malformed values, overflow and accidental duplicate
    submission.
-   Disable confirmation while saving is in progress.

------------------------------------------------------------------------

## 4.4 Calendar --- monthly view plus interactive savings timeline

The calendar should be a first-class feature, not a static date picker.

### Two presentation modes

Provide a switch between: 1. **Month grid** --- familiar monthly
calendar. 2. **Savings timeline** --- horizontal date sequence with
visual activity nodes.

### Month grid

-   Month title and previous/next month controls.
-   Each day is tappable.
-   Dates with contributions show a subtle visual indicator.
-   Contribution size can influence the indicator's intensity or size,
    but maintain accessible contrast.
-   Today is clearly identified.
-   Future dates are visually distinct.
-   Empty dates are neutral, not red or marked as failures.
-   Month summary: total saved, number of contribution days, number of
    entries and withdrawals if any.

### Timeline view

-   Dates appear as a horizontal or vertically scrollable sequence,
    depending on screen size.
-   Each date is a node.
-   Node size or intensity represents net contribution activity.
-   Empty dates remain visible.
-   Dragging across dates can preview daily totals.
-   Tapping a node opens the selected day's details.
-   Provide a clear selected-date state and a way to return to today.

### Date interactions

-   Tap a date: open a detail panel showing all contributions and
    withdrawals for that date.
-   Tap a transaction: open transaction detail and edit controls.
-   Add contribution from a date: open Savings Dial with that date
    preselected.
-   Long press: optionally add a personal note or reminder; do not
    overload the first release.
-   Month navigation: load the selected month and update summaries.
-   Today shortcut: return to the current date.

### Calendar data rules

-   Use the user's local timezone for day grouping.
-   Store timestamps in UTC and store the intended transaction date
    separately as a date-only value where appropriate.
-   Avoid off-by-one date errors when syncing across timezones.
-   A contribution recorded for a past date must remain associated with
    that date.
-   Do not treat an empty day as a missed obligation.

------------------------------------------------------------------------

## 4.5 Insights --- savings analytics

Insights should be visually rich but easy to understand. Charts must
answer useful questions, not merely decorate the screen.

### Summary metrics

-   Total recorded savings.
-   Savings this month.
-   Average contribution per active saving day.
-   Number of active saving days.
-   Largest contribution.
-   Current saving streak, if streaks are enabled.
-   Goal completion rate.

Always label the time range and explain how metrics are calculated.

### Charts

1.  **Daily / weekly / monthly trend**
    -   Switch between time ranges.
    -   Tap a data point to see the exact amount and date.
    -   Use sensible empty states when there is insufficient data.
2.  **Goal allocation**
    -   Show how recorded contributions are distributed across goals.
    -   Make the difference between contribution totals and current
        balances clear if withdrawals exist.
3.  **Contribution consistency**
    -   Show active contribution days over time.
    -   Do not label days without contributions as failures.
4.  **Goal progress**
    -   Compare saved amount against target amount for each goal.

### Metric definitions

Use consistent definitions: - **Contribution total:** sum of all
positive contribution transactions in the selected range. - **Withdrawal
total:** sum of all withdrawal transactions in the selected range,
displayed separately as a positive magnitude. - **Net savings change:**
contributions minus withdrawals. - **Current goal balance:** all
contributions minus all withdrawals associated with that goal. -
**Active saving day:** a local calendar date with at least one positive
contribution. - **Average per active day:** contribution total divided
by active saving days, not by all calendar days. - **Current streak:**
consecutive calendar days with at least one positive contribution, if
streaks are shown. Clearly state the rule and avoid guilt-inducing
language.

Do not mix lifetime totals, monthly totals and current balances in one
unlabeled figure.

------------------------------------------------------------------------

## 4.6 Smart goal predictions and savings simulator

Provide transparent estimates based on actual contribution history.

### Estimated completion date

Inputs: - Current goal balance. - Target amount. - Remaining amount. -
Average contribution rate over a chosen historical window.

Basic calculation:

`remainingAmount = max(targetAmount - currentBalance, 0)`

If the average daily net savings rate is positive:

`estimatedDays = ceil(remainingAmount / averageDailyNetSavings)`

`estimatedCompletionDate = today + estimatedDays`

Important: - Use a clearly defined historical window (for example, the
last 30 days). - Consider days with no contribution in the average if
the estimate is meant to represent calendar-day pace. - Alternatively,
show an active-saving-day estimate separately. - Do not produce a
confident date when there is insufficient history. - If the rate is zero
or negative, show "Not enough recent saving activity to estimate". -
Label all projections as estimates, not guarantees.

### What-if simulator

Allow the user to test: - What if I save ₹X per day? - What if I save ₹X
per week? - What if I increase my current average by a chosen amount? -
What amount would I need to save to reach this goal by a selected date?

Update the estimate immediately when inputs change. Keep the assumptions
visible.

------------------------------------------------------------------------

## 4.7 Achievements and milestones

Use restrained, optional positive reinforcement.

Possible milestones: - First contribution. - First ₹1,000 saved. - 25%,
50%, 75% and 100% of a goal. - Seven active saving days. - First month
with contributions. - First goal completed.

Requirements: - Use subtle animation and haptic feedback. - Avoid
manipulative streak pressure, shame or loss aversion. - Let users
disable celebratory effects and reminders. - Do not imply that badges
have monetary value.

------------------------------------------------------------------------

## 4.8 Profile and settings

Include: - Preferred currency (default INR for initial India-focused
release). - Theme: System, Light, Dark. - Haptic feedback toggle. -
Reduced motion preference (also respect OS setting). - Reminder
preferences. - Data export. - Backup and restore. - Privacy policy and
terms links before public release. - Account and sign-out controls if
cloud accounts are enabled. - App version and support information.

Currency should be stored per user/profile. If multi-currency support is
introduced, do not silently convert historical transactions using
current exchange rates. Store the original currency and make conversion
behaviour explicit.

------------------------------------------------------------------------

## 5. Interaction and motion system

Motion should communicate state changes and provide feedback.

### Required motion

-   Floating compass expands and collapses smoothly.
-   Section transitions are subtle and directional.
-   Goal carousel has natural momentum and snap points.
-   Savings Dial amount responds directly to touch.
-   Progress ring animates after a successful contribution.
-   Calendar selection animates the detail panel.
-   Charts animate on first entry but remain responsive.
-   Completion state has a brief celebration.

### Gesture rules

-   Every gesture must have a visible or discoverable affordance.
-   Every essential gesture must have a tap or control alternative.
-   Gestures must not conflict with system back gestures, scroll views
    or screen readers.
-   Avoid hidden multi-finger gestures.
-   Use sensible touch thresholds and cancel behaviour.
-   Do not commit financial records during an unconfirmed gesture.

### Performance and accessibility

-   Target smooth 60 FPS interaction on supported devices.
-   Avoid heavy blur, continuous particle effects and unnecessary 3D
    rendering.
-   Respect system reduced-motion settings.
-   Support screen readers with meaningful labels and values.
-   Ensure interactive targets are comfortably tappable.
-   Maintain sufficient text and chart contrast.
-   Provide a numeric keypad alternative to the Savings Dial.
-   Test with large font settings.

------------------------------------------------------------------------

## 6. Data model and business logic

Use a transaction-ledger model. Do not store only a manually editable
`savedAmount` field as the source of truth.

### Entities

#### User / Profile

Suggested fields: - `id` - `displayName` - `email` (nullable if
local-only mode) - `currencyCode` (e.g. `INR`) - `themePreference` -
`hapticsEnabled` - `reducedMotionPreference` - `createdAt` - `updatedAt`

#### Goal

Suggested fields: - `id` - `userId` - `name` - `targetAmount` (decimal,
never floating-point for currency calculations) - `currencyCode` -
`imageUri` (nullable) - `productUrl` (nullable) - `category`
(nullable) - `priority` (nullable) - `targetDate` (nullable date) -
`notes` (nullable) - `status` (`ACTIVE`, `COMPLETED`, `ARCHIVED`) -
`createdAt` - `updatedAt` - `completedAt` (nullable)

#### Transaction

Suggested fields: - `id` - `userId` - `goalId` - `type` (`CONTRIBUTION`,
`WITHDRAWAL`, optionally `ADJUSTMENT`) - `amount` (positive decimal
magnitude) - `currencyCode` - `transactionDate` (date-only value
representing the user's intended local savings date) - `note`
(nullable) - `createdAt` - `updatedAt` - `deletedAt` (nullable, if soft
deletion is used) - `source` (nullable UI origin)

Rules: - Store amount as a decimal-safe value (PostgreSQL `NUMERIC`, or
integer minor units where appropriate). - Never use binary
floating-point for money arithmetic. - A contribution increases goal
balance. - A withdrawal decreases goal balance. - Do not allow a
withdrawal that makes the balance negative unless the product explicitly
supports a negative balance; default behaviour should prevent it. - Goal
balance is derived from transactions, not independently edited. - If a
transaction is edited or removed, recalculate derived balances and
analytics.

#### Optional Goal Note / Reminder

Only add these if required by the implemented feature. Avoid creating
unused tables in the first release.

### Core calculations

For a goal:

`goalBalance = sum(CONTRIBUTION amounts) - sum(WITHDRAWAL amounts)`

`remainingAmount = max(targetAmount - goalBalance, 0)`

`progressPercentage = min(goalBalance / targetAmount, 1) * 100`

Keep the raw balance available even if it exceeds the target. The UI may
cap the progress ring at 100% while showing the actual balance.

For a date:

`dailyNetSavings = dailyContributions - dailyWithdrawals`

For all goals:

`totalRecordedBalance = sum(active goal balances)`

Define whether archived goals are included in lifetime totals and make
that choice consistent across Home and Insights. Recommended: - Home
active savings total: active goals only. - Lifetime history: include
archived goals, clearly labelled. - Completed goals remain visible in
history.

### Data integrity

-   Use database transactions for multi-step writes.
-   Prevent duplicate submissions from rapid repeated taps.
-   Use stable transaction IDs and idempotency keys for sync.
-   Keep timestamps and date-only values distinct.
-   Validate all amounts and ownership at both client and server.
-   A user must never access another user's goals or transactions.

------------------------------------------------------------------------

## 7. Recommended technology stack

Use this stack unless the existing project environment imposes a strong
reason to change it.

### Mobile

-   React Native.
-   JavaScript (not TypeScript, unless the project has already adopted
    TypeScript).
-   React Navigation or an equivalent navigation foundation, customized
    to support the Floating Navigation Compass.
-   SQLite for durable local data.
-   MMKV for lightweight preferences and session metadata.
-   Reanimated and Gesture Handler for gesture-driven interactions.
-   A maintained haptics library compatible with the chosen React Native
    version.
-   A maintained charting library appropriate for React Native.

Do not implement the Savings Dial with a web view. It should be a
native-feeling touch interaction.

### Backend

-   Node.js.
-   Express.
-   PostgreSQL.
-   REST API for the first release.
-   Authentication and authorization if cloud sync is enabled.

### Architecture

Use a local-first architecture: 1. User records a contribution. 2.
Validate locally. 3. Persist it in SQLite immediately. 4. Update local
derived totals and UI. 5. Add a sync operation to an outbox. 6. Sync
when connectivity is available. 7. Server validates ownership and
idempotency. 8. Resolve successful sync and retain recoverable errors.

The app must not require a network round-trip before showing a locally
recorded contribution.

### Suggested project structure

Adapt to the existing repository rather than blindly creating duplicate
architecture.

``` text
src/
  app/
    navigation/
    providers/
    theme/
  components/
    navigation-compass/
    amount-dial/
    progress-ring/
    goal-object-card/
    calendar/
    charts/
    feedback/
  features/
    home/
    goals/
    contributions/
    calendar/
    insights/
    simulator/
    settings/
  database/
    migrations/
    repositories/
    schema/
  services/
    api/
    sync/
    analytics/
    predictions/
  hooks/
  utils/
  assets/
```

Keep business logic out of presentation components. Use
repositories/services for data access and calculations.

------------------------------------------------------------------------

## 8. Offline-first sync and backup

### Offline requirements

The following must work offline: - Create, edit, archive and view
goals. - Record, edit and delete contributions. - Record withdrawals. -
Browse calendar history. - View core analytics based on local records. -
Calculate goal progress and local projections.

### Sync requirements

-   Maintain a local outbox of pending operations.
-   Use idempotency keys.
-   Retry transient failures with backoff.
-   Show pending, synced and failed states unobtrusively.
-   Do not discard local data when sync fails.
-   Handle edits made on multiple devices deterministically.
-   For conflicts, preserve transaction integrity and avoid silently
    overwriting user records.

### Backup

-   Provide an explicit backup/restore mechanism.
-   If cloud sync is enabled, explain what data is uploaded.
-   If local-only mode is supported, provide a user-controlled export.
-   Do not claim that data is backed up until the backup operation has
    succeeded.

------------------------------------------------------------------------

## 9. Notifications and reminders

Optional reminders: - User-selected daily reminder. - Weekly savings
summary. - Goal progress milestone. - Target date approaching.

Rules: - Notifications are opt-in. - Allow quiet hours. - Do not send
guilt-based messages such as "You failed to save today". - Avoid
excessive notifications. - Do not imply that a reminder means a
contribution has been recorded.

------------------------------------------------------------------------

## 10. Security and privacy

-   Use secure token storage if authentication is implemented.
-   Enforce user ownership on every server endpoint.
-   Validate all input on the server.
-   Use HTTPS in production.
-   Do not store payment card or bank credentials; this app does not
    need them.
-   Make data export and account deletion behaviour explicit.
-   Avoid collecting unnecessary personal information.
-   Protect uploaded product images and validate file type and size.
-   Do not expose private image URLs or user records publicly.

------------------------------------------------------------------------

## 11. API outline (if cloud sync is enabled)

Suggested REST endpoints:

``` text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /goals
POST   /goals
GET    /goals/:goalId
PATCH  /goals/:goalId
DELETE /goals/:goalId

GET    /goals/:goalId/transactions
POST   /transactions
PATCH  /transactions/:transactionId
DELETE /transactions/:transactionId

GET    /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
GET    /insights/summary
GET    /insights/trends
GET    /sync/changes?cursor=...
POST   /sync/batch
```

API requirements: - Authenticate and authorize all user-specific
routes. - Validate goal ownership before creating a transaction. - Use
decimal-safe amount representations. - Use idempotency keys for
transaction creation and sync. - Return stable error codes and
actionable validation messages. - Paginate transaction history. - Do not
trust client-calculated balances as authoritative server data.

------------------------------------------------------------------------

## 12. V1 scope --- build a complete, polished first release

V1 should be a coherent product, not a throwaway prototype. Implement
the complete core experience with a restrained scope.

### Must ship in V1

-   Home dashboard.
-   Goal creation, editing, archiving and completion.
-   Product image support and fallback visuals.
-   Savings Dial with gesture and numeric-entry modes.
-   Multiple contributions per day.
-   Withdrawal recording.
-   Contribution history and editing/deletion.
-   Interactive calendar month view.
-   Savings timeline view.
-   Insights with core charts and clear metric definitions.
-   Goal completion estimates.
-   What-if savings simulator.
-   Floating Navigation Compass.
-   Horizontal section navigation where appropriate.
-   Light and dark themes.
-   Local persistence and offline operation.
-   Undo/recovery for contribution entry.
-   Accessible tap alternatives for gestures.
-   Empty, loading, error, offline and sync-pending states.

### Defer unless implementation is straightforward

-   Social sharing.
-   Community features.
-   Bank account integration.
-   Payment collection or transfers.
-   Investment products.
-   AI financial advice.
-   Complex gamification.
-   Multi-currency conversion.
-   Collaborative/shared goals.

Do not expand the scope before the core savings experience is reliable.

------------------------------------------------------------------------

## 13. Acceptance criteria

The implementation is not complete until all of the following work:

### Goals

-   User can create a goal with a valid target amount.
-   User can edit target and goal metadata.
-   User can archive and restore or view archived goals according to
    product rules.
-   Goal progress is derived from transaction history.
-   Completion state updates correctly when contributions or withdrawals
    change.

### Savings entry

-   User can increase and decrease the amount using gestures.
-   User can set an exact amount using a numeric keypad.
-   User can select the intended goal and date.
-   User must explicitly confirm before a transaction is created.
-   Rapid repeated taps do not create duplicate transactions.
-   Undo works immediately after a successful entry.
-   Multiple contributions on one date are supported.
-   Failed saves preserve the user's input.

### Calendar

-   Month navigation works across months and years.
-   Date selection displays the correct transactions.
-   Historical-date entry is supported.
-   Timeline and month grid show consistent data.
-   Timezone changes do not shift a transaction to the wrong date.

### Analytics

-   All metrics match transaction data.
-   Withdrawals are accounted for correctly.
-   Empty and insufficient-data states are honest.
-   Tapping chart points shows accurate details.
-   Projections are labelled as estimates.

### Navigation and accessibility

-   No conventional bottom tab bar is used.
-   Floating Navigation Compass works on all main screens.
-   All sections remain reachable without gestures.
-   Screen reader labels and accessible controls are present.
-   Reduced-motion settings are respected.
-   Navigation gestures do not interfere with scrolling or system
    gestures.

### Offline and sync

-   Core records can be created offline.
-   App restart does not lose local records.
-   Sync retries do not create duplicates.
-   Sync failures do not delete local records.
-   User data is isolated correctly on the backend.

------------------------------------------------------------------------

## 14. Implementation instructions for Claude Code

Before writing code:

1.  Inspect the existing repository, package versions, navigation,
    database and current conventions.
2.  Identify what can be reused and what needs to be created.
3.  Do not replace working infrastructure without a concrete technical
    reason.
4.  Produce a concise implementation plan and list any assumptions.
5.  Define the design tokens and reusable component contracts first.
6.  Implement the core data model and transaction calculations before
    building analytics.
7.  Build the Savings Dial as a reusable, independently testable
    interaction.
8.  Build the Floating Navigation Compass and verify that all
    destinations remain discoverable.
9.  Implement the calendar using the same transaction repository as Home
    and Insights.
10. Add offline persistence and sync only after local transaction
    correctness is established.
11. Write tests for money calculations, date handling, goal completion,
    withdrawals, idempotency and sync.
12. Test on real Android hardware and, where possible, iOS hardware.

### Required implementation discipline

-   Do not create fake or hardcoded analytics in the production UI.
-   Do not use mock data as if it were a real user's savings.
-   Seed sample data only in development/demo mode and label it clearly.
-   Do not use floating-point arithmetic for money.
-   Do not let gesture-only controls block accessibility.
-   Do not add animations that make common actions slower.
-   Do not silently change the selected goal or contribution date.
-   Do not claim cloud backup or sync is working until tested end to
    end.
-   Keep components modular and business logic testable.
-   Use the repository's actual installed library versions; verify
    compatibility before adding dependencies.

### Suggested delivery milestones

**Milestone 1 --- Foundation** - App shell, design tokens, theme
system. - Navigation Compass. - Local database and migrations. - Goal
and transaction repositories.

**Milestone 2 --- Core savings** - Home. - Goal collection and detail. -
Savings Dial. - Numeric entry, confirmation and undo. - Transaction
history.

**Milestone 3 --- Calendar and insights** - Month calendar. - Timeline
mode. - Daily detail panel. - Analytics and goal projections.

**Milestone 4 --- Quality and release readiness** - Offline behaviour. -
Sync and backup if configured. - Accessibility and motion settings. -
Error/empty states. - Automated tests and device testing. - Performance
and visual polish.

------------------------------------------------------------------------

## 15. Final product direction

Build **Stashly** as a premium, gesture-first savings companion.

Its signature should be: - The Floating Navigation Compass instead of a
standard bottom bar. - The Savings Dial instead of a plain amount
field. - Product-object goal browsing instead of generic list cards. -
An interactive savings timeline alongside a familiar calendar. - Fluid,
meaningful progress animations. - Clear analytics and honest
projections.

The app must still be effortless for everyday use. The goal is not to
make every screen unusual; it is to make the key actions memorable while
keeping the product understandable, fast, accessible and dependable.

**The Savings Dial is the hero interaction. The Floating Navigation
Compass is the navigation identity. The goal objects and calendar make
progress tangible.**

Build the complete V1 around those ideas.
