# Stashly

**Save with intention. Buy with confidence.**

A gesture-first, fully offline savings tracker built with bare React Native. You create goals for the things you want, record money as you set it aside, and Stashly shows your progress, calendar activity, insights and estimated completion dates.

Stashly is not a bank. It only records savings you hold elsewhere and never holds, moves or invests money.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Runtime | React Native 0.87 (bare, New Architecture, Hermes), JavaScript | Required by the spec |
| Ledger storage | **SQLite via `@op-engineering/op-sqlite`** | A JSI binding, the fastest SQLite for RN. Gives real transactions, `INSERT OR IGNORE` idempotency, indexes and migrations (`PRAGMA user_version`). |
| Preferences | **MMKV (`react-native-mmkv` v4, Nitro)** | Synchronous key-value storage for theme, currency and toggles |
| Animation | **Reanimated 4 + react-native-worklets** | Runs on the UI thread: compass, dial arc, progress rings, charts, sheets, layout transitions |
| Gestures | **react-native-gesture-handler 3** | Savings Dial drag, swipe-to-confirm, sheet drag-to-dismiss, timeline scrubbing |
| Icons | **lucide-react-native** (+ react-native-svg) | 2,000+ consistent, modern line icons; theme-aware via props |
| Navigation | React Navigation native-stack + `react-native-pager-view` | Native stack for detail screens; native pager for swiping between sections. There is no tab bar: the Floating Navigation Compass replaces it. |
| Haptics | react-native-haptic-feedback | Respects both the in-app toggle and the device's own settings |
| Files | react-native-image-picker, react-native-file-access, @react-native-documents/picker | Product photos, plus backup export and restore through the system file dialogs |

| Reminders | react-native-notify-kit (maintained Notifee fork) | Opt-in daily reminder, scheduled on-device with an inexact, doze-friendly alarm |
| Widgets | react-native-android-widget | Android home-screen widgets whose UI is written in JS (`src/widgets`) |

Release builds have **no internet access**. The only permissions are the ones the opt-in reminder needs: `POST_NOTIFICATIONS`, plus `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` and `VIBRATE` (to deliver it and keep it scheduled after a reboot). Network, exact-alarm and foreground-service permissions that libraries declare are stripped in `AndroidManifest.xml`. Only the debug manifest adds `INTERNET`, so Metro can serve the bundle.

## Run

```sh
npm install
npm start                # Metro
npm run android          # build and install on a device or emulator
npm test                 # unit tests: money, dates, ledger, insights, predictions, backup
```

For a faster local build on an emulator: `cd android && gradlew assembleDebug -PreactNativeArchitectures=x86_64`.

On iOS (needs macOS): `cd ios && bundle install && bundle exec pod install`, then `npm run ios`.

## Release (Android)

```sh
npm run verify           # lint + unit tests
npm run android:bundle   # → android/app/build/outputs/bundle/release/app-release.aab  (upload to Play)
npm run android:release  # → android/app/build/outputs/apk/release/app-*-release.apk  (per-ABI + universal)
```

- **Signing:** release builds are signed with `android/app/stashly-upload.keystore`. Its passwords are in `android/keystore.properties`. Both files are git-ignored. **Back them up somewhere safe** (for example a password manager); you can't publish updates without them. If `keystore.properties` is missing, the build falls back to the debug key, which is fine for local testing but can't be uploaded.
- **Play App Signing:** enrol when you create the app in Play Console. Google then holds the app-signing key, and this keystore is only your *upload* key.
- **Versioning:** bump `versionCode` (an integer that must always increase) and `versionName` in `android/app/build.gradle`, plus `version` in `package.json`, before each release.
- **Shrinking:** R8 code shrinking and resource shrinking are on. Keep rules for the native libraries live in `android/app/proguard-rules.pro`.
- **Permissions:** no internet. Notification permission is requested only when the user turns the daily reminder on (in onboarding or Settings).
- **Before publishing:** add a privacy policy URL (one sentence is enough: "all data stays on your device; nothing is collected") and confirm the "Stashly" name is available on Play.

## What's new in 1.2

- **Navigation fix:** compass jumps are verified and completed if the native pager drops one, so a section switch can no longer be lost.
- **Goal cards:** a deep-green glass card with product imagery, the name, "saved / target" and a bold glowing progress pill.
- **Welcome and onboarding:** a new animated welcome screen that explains the app, then five onboarding steps with swipe-driven animations: goal cards, a live dial, a filling calendar, name and currency, and the reminder.
- **Daily reminder:** opt-in, at a time you choose, set up in onboarding or in Settings → Reminders. Tapping it opens the Savings Dial. The messages are calm and never guilt-based.
- **Home-screen widgets (Android):** *Stashly · Savings* (4×2: total, this month, focus goal, Save) and *Stashly · Progress* (2×2 ring). Save deep-links to the dial (`stashly://save`), and the widgets refresh whenever your data changes.
- Planned for later: daily Google Drive backup, and mutual funds.

## Project layout

```
src/
  App.js                    providers + navigation container
  navigation/               RootNavigator (stack), MainScreen (pager), Compass (radial nav)
  theme/                    design tokens (light/dark/dial), ThemeProvider, reduced-motion
  components/               ui primitives, progress ring/bar, goal visuals, sheets, keypad,
                            calendar grid + date picker, charts, toast/undo, celebration
  features/
    home/ goals/ contributions/ calendar/ insights/ settings/ welcome/
  database/                 op-sqlite connection, migrations, repositories
  store/                    data store (single source of truth), MMKV preferences
  services/                 calculations, analytics, predictions, milestones, backup, images, haptics, reminders
  widgets/                  Android home-screen widgets (UI, data, headless task handler)
  utils/                    money (integer minor units), dates (date-only keys), ids
```

## Key decisions

- **Money is integer minor units** (paise, cents) everywhere. The code never uses floating point for money arithmetic. Parsing works on the string, so `0.29` becomes `29`, not `28.999…`.
- **Ledger model.** A goal's balance is always derived from its contributions minus its withdrawals; no editable "saved amount" exists. Goal status (`ACTIVE`/`COMPLETED`) is recomputed after every change. `ARCHIVED` is a user choice and stays until the user restores the goal.
- **Dates.** A transaction's date is a date-only `YYYY-MM-DD` value in the local calendar, and timestamps are UTC ISO strings. Date arithmetic goes through UTC, so DST and timezone changes can't shift an entry to another day.
- **Idempotent writes.** The Savings Dial creates one id per session, which acts as an idempotency key. Combined with `INSERT OR IGNORE` and an in-flight guard, rapid taps can't create duplicate entries.
- **Soft delete** keeps an audit trail and powers Undo.
- **Withdrawals can't make a balance negative.** This applies to new withdrawals, edits, deletions and undo.
- **Estimates are labelled as estimates.** They use calendar-day pace over the last 30 days. When there is too little data, the app says "Not enough recent saving activity to estimate".

## Clearing local data

Go to **Settings → Your data → Clear all local data**. You must type `DELETE` to confirm. This wipes the SQLite tables, the stored product images and all MMKV preferences, then returns to the welcome screen. To keep a copy first, use **Export backup**, which saves a JSON file (with images embedded) to a location you choose.

## Sample data

In debug builds only, **Settings → Developer → Load sample data** replaces your data with goals whose names end in "(sample)". Release builds don't include this option.
