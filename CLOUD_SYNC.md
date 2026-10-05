# Cloud Sync (iPhone Safari + Android Chrome)

## How it works (v1)

- **Shared database:** a public GitHub Gist (`db.json`) owned by `aditya7191`.
- **Read (everyone):** the app fetches the gist over HTTPS (no login). Public roster and admin devices all see the same members/payments/settings.
- **Write (admin only):** after each change, the app PATCHes the gist via the GitHub API. That requires a **Personal Access Token with the `gist` scope**, pasted once in **Settings → Cloud Sync** on each admin phone.
- **Admin password** is **never** uploaded to the gist.
- Token is stored only in **localStorage** on that device — never in git, never in the cloud JSON.

Gist: https://gist.github.com/aditya7191/4e7214d56f96f251037fdaf8307f7697

Repo mirror (read fallback): `data/db.json` on `main`.

## One-time setup (admin write access)

1. Open: https://github.com/settings/tokens/new?scopes=gist&description=MR28%20Panchayat%20cloud%20sync
2. Note: **Classic** token → check **only** `gist` (do not enable `repo` unless you need it).
3. Generate, copy `ghp_…`.
4. In the app: **Admin login** → **Settings** → **Cloud Sync** → paste token → **Save — PAT**.
5. Tap **Push to cloud**. Status should show Synced.
6. Repeat steps 4–5 on any other admin device (iPhone / Android).

Public view needs **no token**.

## Security notes

- The gist is **public** (needed so phones can read without secrets). Member names/phones in the JSON are world-readable if someone has the gist URL (also embedded in the app).
- Prefer a **gist-only** classic PAT so a leaked token cannot push to your other repositories.
- Change the admin gate password from the default in Settings.
- **Never** paste `gh auth token` / oauth tokens with `repo` scope into the app.

## Upgrade path: Firebase Firestore

When you can create a Firebase project (console.firebase.google.com under your Google account):

1. Create project → Enable **Authentication** (Email/Password) → create user e.g. `admin@mr28.local` / your admin password.
2. Enable **Firestore**.
3. Security rules: public read on a `publicMembers` projection; full read/write only for authenticated admin.
4. Add Vite env:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

5. Swap `src/sync` to Firestore (same `pullCloud` / `pushCloud` surface in `useStore`).

Firebase was not configured on this box (no computerUse / Google login for console). Gist sync ships so devices work today after the PAT paste.

## Verify cross-device

1. Admin device A (with PAT): add a member → wait for ☁ Synced.
2. Device B (Safari/Chrome): open public view or admin → should list the same member after refresh / tab focus.
