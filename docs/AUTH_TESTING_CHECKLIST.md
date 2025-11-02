# Authentication Testing Checklist

Use this matrix to verify **every critical authentication flow** across environments and roles.

| #   | Flow                                        | Role         | Local (`localhost`) | Preview (`*.vercel.app`) | Production |
| --- | ------------------------------------------- | ------------ | ------------------- | ------------------------ | ---------- |
| 1   | Email/Password **Signup**                   | Customer     | ☐                   | ☐                        | ☐          |
| 2   | Email/Password **Signup**                   | Driver       | ☐                   | ☐                        | ☐          |
| 3   | Email/Password **Signup**                   | Dispatcher   | ☐                   | ☐                        | ☐          |
| 4   | Email **Verification Link**                 | Any          | ☐                   | ☐                        | ☐          |
| 5   | Email/Password **Sign-in**                  | Customer     | ☐                   | ☐                        | ☐          |
| 6   | Email/Password **Sign-in**                  | Driver       | ☐                   | ☐                        | ☐          |
| 7   | Email/Password **Sign-in**                  | Dispatcher   | ☐                   | ☐                        | ☐          |
| 8   | **Google OAuth Signup**                     | Customer     | ☐                   | ☐                        | ☐          |
| 9   | **Google OAuth Signup**                     | Driver       | ☐                   | ☐                        | ☐          |
| 10  | **Google OAuth Signup**                     | Dispatcher   | ☐                   | ☐                        | ☐          |
| 11  | **Google OAuth Sign-in**                    | Any existing | ☐                   | ☐                        | ☐          |
| 12  | **Facebook OAuth Signup**                   | Any          | ☐                   | ☐                        | ☐          |
| 13  | **Magic-link Sign-in**                      | Customer     | ☐                   | ☐                        | ☐          |
| 14  | **Password Reset Request**                  | Any          | ☐                   | ☐                        | ☐          |
| 15  | **Password Reset Link**                     | Any          | ☐                   | ☐                        | ☐          |
| 16  | **Sign-out**                                | Any          | ☐                   | ☐                        | ☐          |
| 17  | **Middleware Access** `/driver`             | Driver       | ☐                   | ☐                        | ☐          |
| 18  | **Middleware Access** `/dispatcher`         | Dispatcher   | ☐                   | ☐                        | ☐          |
| 19  | **Middleware Access** `/customer/dashboard` | Customer     | ☐                   | ☐                        | ☐          |

**Instructions:**

1. Deploy branch → obtain preview URL.
2. Work row by row; mark ✅ when the scenario passes.
3. On failure record error & stack trace, attach console logs.
4. After all ✅ in Preview, merge to main & test Production.

---

For streamlined testing you can skip rows identical across roles once confidence is gained, but ensure at least one role per flow/environment is covered.
