# Authentication on Vercel Preview Deployments

This guide explains how to configure Supabase and environment variables so **all authentication flows** work in:

1. Local development (`localhost:3000`)
2. Vercel _preview_ deployments (`*.vercel.app`)
3. Production (`preferredsolutionstransport.com`)

---

## 1 Why This Is Needed

Vercel assigns a **unique URL** to every preview build, e.g.

```
https://preferredsolutionstransport-git-feature-xyz-abc123.vercel.app
```

Supabase **must** whitelist every redirect domain. Rather than manually adding each preview URL, Supabase accepts **wildcards**: `https://*.vercel.app/auth/callback`.

## 2 Supabase Configuration

1. Open **Supabase → Authentication → URL Configuration**
2. Set **Site URL** to your production domain:
   ```
   https://preferredsolutionstransport.com
   ```
3. Add these to **Redirect URLs** (each on its own line):
   ```
   http://localhost:3000/auth/callback
   https://*.vercel.app/auth/callback
   https://preferredsolutionstransport.com/auth/callback
   ```
4. In **Email Templates** use `{{ .SiteURL }}/auth/callback` – Supabase replaces `{{ .SiteURL }}` with the value from step 2.

## 3 Environment Variables

| Variable               | Environment     | Value                                                                        |
| ---------------------- | --------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Production      | `https://preferredsolutionstransport.com`                                    |
| `VERCEL_URL`           | _Auto_ (Vercel) | _No protocol_. e.g. `preferredsolutionstransport-git-main-abc123.vercel.app` |

`VERCEL_URL` is injected automatically – **do not set it manually**.

Local dev doesn’t need either var; the app falls back to `http://localhost:3000`.

## 4 How the Code Works

`lib/auth-helpers.ts` provides:

```ts
getBaseUrl(); // server-side
getAuthRedirectUrl('/auth/callback'); // client/server
```

Every auth flow now calls these helpers instead of `window.location.origin`, so redirect URLs are correct in any environment.

## 5 Testing Checklist

1. Push a branch → wait for Vercel preview URL.
2. Open preview → Sign up with Google as _Driver_.
3. Ensure you land on `/driver` dashboard.
4. Sign out → Sign back in (password or OAuth) as Customer & Dispatcher.
5. Verify role-based access (middleware) and protected routes.

If anything fails, check browser console – helper functions log environment info in **development**.

---

Happy testing! 🎉
