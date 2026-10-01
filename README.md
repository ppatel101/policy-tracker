# Policy Tracker Mobile App

> A production-ready React Native + Expo + Supabase mobile application designed to securely manage insurance policies, premium payments, payment history, policy durations, and automated reminders with offline synchronization.

---

## 📱 Features

- **Authentication & Security**:
  - Email & password signup and login via Supabase Auth
  - Forgot password and password reset workflow
  - Persistent user sessions via `@react-native-async-storage/async-storage`
  - Strict PostgreSQL Row Level Security (RLS) ensuring users only ever access their own data
  - Zero exposure of service-role keys; anonymous public keys only
- **Policy Management**:
  - Add, edit, delete, and view insurance policies
  - Supports Life, Health, Vehicle, Term, Home, Travel, Child Education, and Pension plans
  - Dynamic remaining duration calculation (e.g., *"3 years 4 months remaining"* or *"Policy expired"*)
  - Automatic end date calculation from policy start date and duration in years
  - Fast client-side search across policy name, company, and policy number (case-insensitive)
  - Status filtering (*All*, *Active*, *Expired*, *Cancelled*) and multi-criteria sorting (*Next Due Date*, *Policy Name*, *Company*, *Premium*, *Recently Added*)
- **Premium Installment Schedules & Tracking**:
  - Automatic payment installment schedule generation based on frequency (*Monthly*, *Quarterly*, *Half-Yearly*, *Yearly*)
  - Bounds schedule to not exceed policy end date, preventing duplicate payments
  - Visual status badges: **Overdue** (red), **Due Today** (orange), **Due Soon** (amber, within 7 days), **Upcoming** (blue), **Paid** (emerald)
  - Quick **Mark as Paid** action with confirmation dialog, setting paid date, amount, and automatically recalculating the policy's next due date to the earliest unpaid installment
  - Chronological Payment History with status filtering
- **Financial Dashboard**:
  - Summary metrics: Total Policies, Active Policies, Upcoming Dues count, Total Premium Due, and Paid This Calendar Year
  - Indian numbering system currency formatting (`₹25,000`, `₹1,20,000`)
  - Sorted upcoming payments list with single-tap payment confirmation
- **Offline Mode & Synchronization**:
  - Local caching with AsyncStorage
  - Network status detection via `@react-native-community/netinfo`
  - Banner notification when device is offline: *"You are offline. Changes will sync when you're back online."*
  - Offline queue (`pending_sync_operations`) queues policy creation, updates, deletions, and payments
  - Automatic replay and two-way synchronization as soon as network returns
  - One-time migration system (`migrationService`) that seamlessly uploads any legacy local data to the authenticated Supabase account with client-generated UUID translation and local backup preservation
- **Local Push Notifications**:
  - Scheduled payment due reminders using `expo-notifications`
  - Configurable alerts (7 days before, 1 day before, and on the due date)
  - Automatic notification cancellation when a payment is marked paid or deleted

---

## 🛠 Tech Stack

- **Framework**: React Native 0.86 / Expo SDK 57
- **Language**: JavaScript (ES6+)
- **Backend / Database**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth (JWT & AsyncStorage persistence)
- **Local Storage**: `@react-native-async-storage/async-storage`
- **Navigation**: React Navigation 7 (Native Stack & Bottom Tabs)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Network Info**: `@react-native-community/netinfo`
- **Notifications**: `expo-notifications`
- **Testing**: Built-in test runner (`bun test` / `npm test`)

---

## 📂 Project Architecture

```
new-policy-tracker/
├── App.js                         # Root application entry point
├── app.json                       # Expo configuration & plugins
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment variable template
├── .env                           # Local environment config
├── supabase/
│   └── migrations/
│       └── 001_create_policy_tracker_tables.sql  # Complete database schema
├── __tests__/
│   └── policyTracker.test.js      # Unit tests (currency, dates, validation, models)
└── src/
    ├── components/                # Reusable UI components
    │   ├── Badge.js
    │   ├── Button.js
    │   ├── ConfirmDialog.js
    │   ├── EmptyState.js
    │   ├── Header.js
    │   ├── Input.js
    │   ├── LoadingSpinner.js
    │   ├── OfflineBanner.js
    │   ├── PaymentCard.js
    │   ├── PolicyCard.js
    │   └── StatCard.js
    ├── context/                   # Global React Contexts
    │   ├── AuthContext.js
    │   └── PolicyContext.js
    ├── hooks/                     # Custom React hooks
    │   ├── useAuth.js
    │   ├── useNetworkStatus.js
    │   ├── usePayments.js
    │   └── usePolicies.js
    ├── models/                    # Data models and mappers (camelCase <-> snake_case)
    │   ├── payment.js
    │   ├── policy.js
    │   └── user.js
    ├── navigation/                # React Navigation stacks & tabs
    │   ├── AppNavigator.js
    │   └── AuthNavigator.js
    ├── screens/
    │   ├── auth/                  # Authentication screens
    │   │   ├── ForgotPasswordScreen.js
    │   │   ├── LoginScreen.js
    │   │   ├── RegisterScreen.js
    │   │   └── ResetPasswordScreen.js
    │   ├── dashboard/             # Dashboard screen
    │   │   └── DashboardScreen.js
    │   ├── payments/              # Payment tracking screens
    │   │   ├── PaymentHistoryScreen.js
    │   │   └── PaymentsScreen.js
    │   ├── policies/              # Policy CRUD screens
    │   │   ├── AddPolicyScreen.js
    │   │   ├── EditPolicyScreen.js
    │   │   ├── PoliciesScreen.js
    │   │   └── PolicyDetailsScreen.js
    │   └── profile/               # User profile & settings
    │       ├── ProfileScreen.js
    │       └── SettingsScreen.js
    ├── services/                  # Business logic & Supabase APIs
    │   ├── authService.js
    │   ├── migrationService.js
    │   ├── notificationService.js
    │   ├── paymentService.js
    │   ├── policyService.js
    │   ├── supabase.js
    │   └── syncService.js
    ├── storage/                   # AsyncStorage interface
    │   └── localStorage.js
    ├── theme/                     # Colors, typography, spacing
    │   ├── colors.js
    │   ├── spacing.js
    │   └── typography.js
    └── utils/                     # Formatting, math, and date helpers
        ├── constants.js
        ├── currencyUtils.js
        ├── dateUtils.js
        ├── uuid.js
        └── validation.js
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20.19.4+ recommended) or Bun
- Expo CLI (`npm install -g expo-cli` or `npx expo`)
- A Supabase project account (free tier available at [supabase.com](https://supabase.com))

### 2. Installation
```bash
git clone <repo-url>
cd new-policy-tracker
npm install
```

### 3. Supabase Setup & Database Migration
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Navigate to the **SQL Editor** tab.
3. Open `supabase/migrations/001_create_policy_tracker_tables.sql` in this repo and paste the entire script into the SQL Editor.
4. Click **Run**.
5. Verify that the following tables exist with Row Level Security (RLS) enabled:
   - `profiles`
   - `policies`
   - `payments`

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials from **Project Settings -> API**:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Never use the `service_role` key inside the mobile app! Only the `anon` public key is safe.)*

### 5. Running Locally
Start the Expo development server:
```bash
# Start Metro bundler
npm start

# Run on Android emulator / device
npm run android

# Run on iOS simulator (macOS required)
npm run ios

# Run web preview
npm run web
```

### 6. Running Tests
Run the automated test suite covering currency formatting, schedule generation, date calculations, remaining duration, models, and validation:
```bash
npm test
```

---

## 🗄 Database Schema & RLS

### `profiles` Table
- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `full_name TEXT`
- `email TEXT`
- `phone TEXT`
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- **RLS**: Scoped strictly to `auth.uid() = id`
- **Trigger**: Automatic row creation on `auth.users` insertion.

### `policies` Table
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `policy_name TEXT NOT NULL`
- `company_name TEXT NOT NULL`
- `policy_number TEXT`
- `policy_type TEXT DEFAULT 'Life Insurance'`
- `premium_amount NUMERIC NOT NULL CHECK (premium_amount > 0)`
- `payment_frequency TEXT CHECK (payment_frequency IN ('monthly', 'quarterly', 'half-yearly', 'yearly'))`
- `start_date DATE NOT NULL`
- `end_date DATE`
- `duration_years INTEGER DEFAULT 1 CHECK (duration_years > 0)`
- `next_due_date DATE NOT NULL`
- `status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'matured'))`
- `reminder_enabled BOOLEAN DEFAULT TRUE`
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- **Indexes**: `user_id`, `next_due_date`, `status`
- **RLS**: Scoped to `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.

### `payments` Table
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE`
- `installment_number INTEGER DEFAULT 1`
- `due_date DATE NOT NULL`
- `paid_date DATE`
- `amount NUMERIC NOT NULL`
- `paid_amount NUMERIC`
- `status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'due_today', 'overdue', 'paid'))`
- `note TEXT`
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- **Indexes**: `user_id`, `policy_id`, `due_date`, `status`
- **RLS**: Scoped to `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.

---

## 🔒 Security Best Practices

1. **Row Level Security (RLS)** is enforced on every table. Users cannot read, insert, update, or delete records belonging to any other user.
2. **Client Queries**: Frontend queries explicitly filter by `.eq('user_id', user.id)` in addition to RLS protection.
3. **No Passwords or Service Keys in Cache**: Passwords are never stored in AsyncStorage. Session tokens are securely handled by Supabase Auth client.
4. **Offline Sync Validation**: Client-generated operations carry user IDs verified on the database level before execution.

---

## 💡 Troubleshooting & Common Issues

### 1. `PGRST205` / `Could not find the table 'public.policies'`
- **Cause**: The Supabase database tables have not been created yet or schema cache is stale.
- **Solution**: Execute `supabase/migrations/001_create_policy_tracker_tables.sql` in your Supabase SQL editor. Refresh your project schema cache in Supabase Dashboard (**API Settings -> Schema Cache -> Reload**).

### 2. `Invalid login credentials`
- **Cause**: Email/password mismatch, or email confirmation is required by your Supabase Auth settings.
- **Solution**: In Supabase Dashboard -> **Authentication -> Providers -> Email**, ensure "Confirm email" is disabled for local testing or confirm the user's email address.

### 3. Notification permissions denied
- On iOS simulators or Android emulators without Google Play services, remote push is disabled, but local notifications will still register through Expo Notifications. On physical devices, allow notification permissions when prompted.

---

## 📦 Building for Production

### Android (APK / AAB)
```bash
# Configure EAS Build
npm install -g eas-cli
eas login
eas build:configure

# Build Android APK for testing
eas build -p android --profile preview
```

### iOS (IPA / TestFlight)
```bash
eas build -p ios --profile preview
```
