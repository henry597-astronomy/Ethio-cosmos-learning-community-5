# Ethio-Cosmos Learning Community

A comprehensive astronomy learning platform focused on Ethiopian astronomical heritage and modern space science.

---

## 🚀 Architectural Refactor (April 2026)

This project has been refactored from a prototype shell into a real multi-user Supabase-backed application. Key improvements include:

-   **Persistent Backend:** All CMS content (topics, lessons), user progress, and bookmarks are now stored in Supabase instead of `localStorage`.
-   **User Profiles:** Automatic profile creation on signup with username support.
-   **Secure Routing:** Reusable `ProtectedRoute` for admin and user-only pages.
-   **Real-time Chat:** Fixed identity issues; chat now displays usernames.
-   **Graceful Asset Handling:** `SafeImage` component handles missing media without breaking the UI.

This refactoring effort specifically involved:

*   **Database Schema Design**: A comprehensive SQL schema was designed to store all CMS content (homepage, about, materials, topics, subtopics, lessons, quizzes, quiz questions) and user-related data (profiles, bookmarks, progress).
*   **Supabase Client Configuration**: The `src/supabase.ts` file was updated to ensure proper Supabase client initialization and to export necessary configurations.
*   **CMS Service Layer**: A new service module (`src/services/cms.ts`) was created to encapsulate all interactions with the Supabase database for CMS-related operations. This promotes a clean separation of concerns and reusability.
*   **Custom React Hooks**: Custom React hooks (`src/hooks/use-cms-data.ts`) were developed to provide an easy and efficient way for components to fetch and manage CMS data from Supabase, including loading states and error handling.
*   **Centralized CMS Context**: A `CmsContext` (`src/context/CmsContext.tsx`) was introduced to replace the old `DataContext`. This context makes all CMS data and related hooks globally available to components, simplifying data access throughout the application.
*   **Page and Component Rewrites**: All relevant pages and components (`HomePage.tsx`, `LearningPage.tsx`, `TopicDetailPage.tsx`, `LessonPage.tsx`, `AdminPage.tsx`, `TestsPage.tsx`, `AboutPage.tsx`, `MaterialsPage.tsx`) were rewritten to consume data from the new `CmsContext` and interact with Supabase services.
*   **Admin Page Enhancements**: The `AdminPage.tsx` was significantly updated to provide full CRUD (Create, Read, Update, Delete) functionality for all CMS content directly through Supabase, replacing the previous `localStorage`-based editing.
*   **Authentication and Authorization**: `AuthContext.tsx` was updated to fetch user roles from the `user_profiles` table in Supabase, ensuring proper admin authorization. The `ProtectedRoute.tsx` component now correctly utilizes this role information.
*   **Type Definitions**: The `src/types/index.ts` file was updated to reflect the new Supabase-backed data models.

---

## 🛠️ Setup Instructions

### 1. Supabase Backend Setup

1.  **Create a Supabase Project:** Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Run SQL Migrations:** Open the **SQL Editor** in your Supabase dashboard and execute the contents of `new_supabase_schema.sql`. This will create all tables, triggers, and RLS policies for the refactored CMS.
3.  **Storage Bucket:** Create a new storage bucket named `uploads` and set its privacy to **Public**.
4.  **Enable Google OAuth:**
    *   In your Supabase project, navigate to **Authentication > Providers**.
    *   Enable the **Google** provider.
    *   You will need to provide a **Google Client ID** and **Google Client Secret**. Follow the instructions on the Supabase dashboard to create these credentials in the Google Cloud Console.
    *   Add the **Redirect URI** provided by Supabase to your Google Cloud Console OAuth client configuration.
5.  **Admin Access:** The migration script automatically grants admin rights to the email `henokgirma648@gmail.com`. You can change this in the `handle_new_user` function in `new_supabase_schema.sql`.

### 2. Frontend Configuration

1.  **Environment Variables:** Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
3.  **Start Development Server:**
    ```bash
    pnpm dev
    ```

### 3. Deployment

This project is configured for deployment on Vercel. Ensure your environment variables are added to your Vercel project settings.

---

## 📖 Key Components

-   `src/supabase.ts`: Centralized Supabase client with strict env checking.
-   `src/services/cms.ts`: Encapsulates all Supabase CMS interactions.
-   `src/hooks/use-cms-data.ts`: Custom React hooks for fetching CMS data.
-   `src/context/CmsContext.tsx`: Provides CMS data to the application.
-   `src/components/ProtectedRoute.tsx`: Handles authentication and role-based access.
-   `src/components/SafeImage.tsx`: Graceful image loading and fallback.
-   `src/pages/ChatPage.tsx`: Real-time community chat.
-   `src/pages/LessonPage.tsx`: Interactive lessons with progress and bookmarking.
-   `src/pages/ProgressPage.tsx`: User learning dashboard.
-   `src/pages/BookmarksPage.tsx`: Saved materials.
-   `src/pages/AdminPage.tsx`: Comprehensive CMS management interface.

---

## ⚖️ License

MIT
