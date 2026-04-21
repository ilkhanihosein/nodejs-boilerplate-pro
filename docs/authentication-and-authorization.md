# Authentication and authorization

How the sample **auth** and **users** modules use **JWT access tokens**, **refresh sessions** in MongoDB, and **role-based** route guards. This is **reference behavior** for the boilerplate—you can replace it with sessions, OAuth, or another model in your product.

---

## Token model

| Token       | Secret                   | Lifetime (env)                         | Storage / enforcement                                                                  |
| ----------- | ------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| **Access**  | **`JWT_ACCESS_SECRET`**  | **`JWT_ACCESS_TTL`** (default **15m**) | Stateless **JWT**; **`Authorization: Bearer <token>`**                                 |
| **Refresh** | **`JWT_REFRESH_SECRET`** | **`JWT_REFRESH_TTL`** (default **7d**) | Opaque JWT carrying **`sid`**; **hashed** value stored in **`refresh_token_sessions`** |

Access and refresh tokens use the same **`issuer`** (**`iss`**) and **`audience`** (**`aud`**) for signing and **`jwt.verify`**. Configure with **`JWT_ISSUER`** and **`JWT_AUDIENCE`** in **`env`** (defaults remain **`e-commerce-api`** / **`e-commerce-client`** for backward compatibility). Changing either **invalidates existing tokens** until clients request new ones with matching expectations.

**Rotation:** issuing a new pair after **refresh** can revoke the previous session when **`previousSessionId`** is supplied (see **`auth.service`**).

---

## Code layout (JWT)

Verification and signing are intentionally flat—no strategy or dispatcher layer.

| File                                   | Responsibility                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/modules/auth/jwt.utils.ts`**    | **`jwt.sign`** / **`jwt.verify`** with **`env.jwtIssuer`** / **`env.jwtAudience`**, then **Zod** on the decoded object using **`accessJwtPayloadSchema`** and **`refreshJwtPayloadSchema`** from **`auth.schemas.ts`**. Maps **`jwt`** / **Zod** failures to **`AppError`** (401), with separate messages for bad payload vs bad or expired cryptography (access vs refresh each have their own strings). |
| **`src/modules/auth/auth.service.ts`** | Re-exports **`signAccessToken`**, **`signRefreshToken`**, **`verifyAccessToken`**, and **`verifyRefreshToken`** from **`jwt.utils`** so callers use one module; owns **register**, **login**, **refresh**, **logout**, and **refresh session** persistence.                                                                                                                                               |

**Call convention:** feature code and **`requireAuth`** should import token helpers from **`auth.service`**, not from **`jwt.utils`**, unless you are editing JWT behavior itself.

---

## HTTP routes (under **`API_V1_PREFIX`**, default **`/api/v1`**)

Mounted as **`/auth`** in **`src/api/v1/routes.ts`**:

| Method / path           | Auth | Description                                          |
| ----------------------- | ---- | ---------------------------------------------------- |
| **`POST .../register`** | No   | Create user; returns tokens (same shape as login).   |
| **`POST .../login`**    | No   | Returns **`accessToken`**, **`refreshToken`**, user. |
| **`POST .../refresh`**  | No   | Body: **`refreshToken`** → new pair + rotation.      |
| **`POST .../logout`**   | No   | Body: **`refreshToken`** → revoke session.           |
| **`GET .../me`**        | Yes  | **`requireAuth`** → **`{ user: req.authUser }`**.    |

**Users (admin sample):** **`src/modules/users/users.routes.ts`** applies **`requireAuth`** then **`requireRole("admin")`** on all routes in that router.

---

## Middleware

- **`requireAuth`** — reads **`Authorization: Bearer`**, calls **`verifyAccessToken`** from **`auth.service`**, sets **`req.authUser`** (`id`, `email`, **`role`**).
- **`requireRole(...roles)`** — after **`requireAuth`**, returns **403** if **`req.authUser.role`** is not in the list.

Passwords are hashed with **bcrypt** before save (**`auth.service`** / user registration).

---

## Replacing or extending

- Swap **JWT** for cookies, external IdP, or API keys: keep **`env`** and middleware patterns; remove or gut **`src/modules/auth/`** as needed.
- Add roles or permissions: extend the user model and **`requireRole`**, or introduce a permission map checked in services.

---

## Related documents

| Topic          | Document                                                           |
| -------------- | ------------------------------------------------------------------ |
| Env / TTLs     | [env-configuration.md](./env-configuration.md)                     |
| Validation     | [validation.md](./validation.md) (login/register/refresh bodies)   |
| HTTP hardening | [security-and-http-hardening.md](./security-and-http-hardening.md) |
| Tests          | [testing.md](./testing.md)                                         |
