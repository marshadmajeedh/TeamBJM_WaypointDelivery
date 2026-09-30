# API Conventions & Security Standards

## Overview

The Waypoint API is a RESTful service adhering to predictable URL hierarchies and standardized JSON payloads.

- **Base URL:** `/api`
- **Protocol:** HTTP/1.1 or HTTP/2 over TLS (Production)
- **Content-Type:** `application/json`

---

## Response Formatting

All endpoints (except raw file downloads or streaming responses) return a consistent JSON wrapper.

### 1. Successful Response (`2xx`)

```json
{
  "success": true,
  "data": {
    "id": "f516a2ef-99bf-4819-bf9d-f6334a1910ef",
    "name": "Downtown Express Outlet"
  }
}
```

### 2. Error Response (`4xx` / `5xx`)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters provided.",
    "details": [
      {
        "field": "quantity",
        "issue": "Quantity must be greater than zero"
      }
    ]
  }
}
```

---

## Standard HTTP Status Codes

| Code | Meaning | Typical Use |
| :--- | :--- | :--- |
| **200 OK** | Success | Standard successful `GET` or `PUT` request. |
| **201 Created** | Created | Resource successfully created via `POST`. |
| **400 Bad Request** | Validation Failure | Zod schema validation errors or missing mandatory fields. |
| **401 Unauthorized** | Authentication Missing | Missing, expired, or malformed JWT token. |
| **403 Forbidden** | Role Not Permitted | Authenticated user lacks the necessary `UserRole`. |
| **404 Not Found** | Missing Resource | Requested entity UUID does not exist. |
| **409 Conflict** | State Conflict | Entity unique constraint collision or duplicate sync token. |
| **500 Internal Error** | Server Exception | Uncaught runtime server exception. |

---

## Security Baseline

1. **Password Security:** All user passwords must be hashed using `bcrypt` with minimum 10 salt rounds. Plaintext passwords must never be stored.
2. **Secret Management:** JWT secrets, database connection strings, and seed passwords must strictly originate from environment variables (`process.env`). Never commit secrets to Git.
3. **Strict Request Validation:** External inputs must be validated using `Zod` schemas before hitting application domain services.
4. **Parameterized / ORM Access:** Direct string interpolation in SQL queries is prohibited; use Prisma ORM parameterized queries exclusively.
5. **Server-Side Role Authorization:** Never rely on frontend role claims. Backend endpoints must independently verify role claims extracted from signed JWT tokens.
6. **Logging Hygiene:** Never log passwords, raw auth tokens, or PII into stdout or system logs.
