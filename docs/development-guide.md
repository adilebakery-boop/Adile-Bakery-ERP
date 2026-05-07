# Development Guide

This document outlines the development workflow, conventions, and best practices for the Adile Bakery ERP team.

---

## Table of Contents

- [Git Workflow](#git-workflow)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Naming Convention](#commit-naming-convention)
- [Folder Structure](#folder-structure)
- [API Response Standards](#api-response-standards)
- [Team Workflow Rules](#team-workflow-rules)
- [Pull Request Process](#pull-request-process)

---

## Git Workflow

We follow a trunk-based development workflow with feature branches:

```
main (production-ready)
    │
    ├── develop (integration branch)
    │       │
    │       ├── feature/feature-name
    │       ├── bugfix/bug-description
    │       └── hotfix/critical-fix
    │
    └── release/version-number
```

### Branch Strategy

1. **main** - Production-ready code, only updated via PR from develop
2. **develop** - Integration branch for features and fixes
3. **feature/*** - New features from develop
4. **bugfix/*** - Bug fixes from develop
5. **hotfix/*** - Critical production fixes from main

---

## Branch Naming Convention

Use the following format for branch names:

```
<type>/<ticket-id>-<short-description>
```

### Types

| Type | Use For |
|------|---------|
| `feature` | New features |
| `bugfix` | Bug fixes |
| `hotfix` | Critical production fixes |
| `refactor` | Code refactoring |
| `docs` | Documentation only |
| `test` | Adding or updating tests |

### Examples

```
feature/AUTH-001-login-page
bugfix/PROD-023-production-quantity-validation
hotfix/SEC-001-password-hash-vulnerability
refactor/USER-user-service-cleanup
docs/API-001-update-documentation
```

### Rules

- Use lowercase letters, numbers, and hyphens only
- Maximum 50 characters
- Include ticket ID if available
- Short description should be 2-4 words

---

## Commit Naming Convention

Follow conventional commits format:

```
<type>(<scope>): <description>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, semicolons) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies |

### Examples

```
feat(auth): add login endpoint with JWT
fix(products): validate price is positive number
docs(api): update endpoint documentation
refactor(users): simplify user service validation
test(production): add unit tests for production controller
chore(deps): update Prisma to v5.0
```

### Rules

- Use imperative mood (add, not added)
- Maximum 72 characters for subject
- Reference ticket numbers in body if applicable
- Explain "what" and "why", not "how"

---

## Folder Structure

```
Adile-Bakery-ERP/
├── docs/                    # Project documentation
│   ├── api.md              # API documentation
│   ├── api-response-standard.md
│   ├── development-guide.md
│   └── test-data.md
├── postman/                 # API testing collections
│   ├── Adile-Bakery-ERP.postman_collection.json
│   └── local.postman_environment.json
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── src/
│   ├── config/             # Configuration files
│   │   └── prisma.js
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
├── frontend/               # React frontend
└── package.json
```

### Backend Folders

| Folder | Purpose |
|--------|---------|
| `controllers/` | Handle incoming requests, return responses |
| `services/` | Business logic, data manipulation |
| `middleware/` | Authentication, validation, logging |
| `routes/` | URL routing definitions |
| `utils/` | Helper functions, constants |

---

## API Response Standards

All API endpoints MUST follow the standard response format defined in `docs/api-response-standard.md`.

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

### Key Rules

1. Always include `success` boolean field
2. Always include `message` string field
3. Use `data` for successful response payload
4. Use `errors` array for validation errors
5. Return appropriate HTTP status codes

---

## Team Workflow Rules

### Daily Workflow

1. **Start of day**
   - Pull latest changes from develop
   - Review your task board

2. **During development**
   - Write meaningful commits frequently
   - Test your changes locally
   - Keep branch updated with develop

3. **End of day**
   - Push your branch to remote
   - Update task status

### Code Quality Rules

1. **Never commit directly to main or develop**
2. **Always run tests before creating PR**
3. **Keep commits atomic and focused**
4. **Write meaningful commit messages**
5. **Review your own code before requesting review**

### Communication

1. **Use ticket IDs in commits and PRs**
2. **Update ticket status promptly**
3. **Block your PR if dependent on other PRs**
4. **Notify team of significant changes**

---

## Pull Request Process

### Creating a PR

1. **Before creating PR**
   - Ensure all tests pass
   - Run linting
   - Update documentation if needed
   - Rebase onto latest develop

2. **PR Title Format**
   ```
   [TYPE] Short description (#ticket)
   ```

3. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] New feature
   - [ ] Bug fix
   - [ ] Refactor
   - [ ] Documentation

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Tested locally
   - [ ] Tested in development environment

   ## Checklist
   - [ ] Follows coding conventions
   - [ ] No console.log statements
   - [ ] API responses follow standard format
   ```

### PR Review Process

1. **Author** - Creates PR, requests review
2. **Reviewer** - Reviews code, leaves comments
3. **Author** - Addresses feedback, makes changes
4. **Reviewer** - Approves or requests changes
5. **Merge** - Squash and merge to develop

### PR Merge Rules

- At least 1 approval required
- All checks must pass
- No unresolved comments
- Branch must be up-to-date with develop

### After Merge

1. Delete the feature branch locally and remotely
2. Update related tickets
3. Notify team of deployment

---

## API Development Standards

### Endpoint Design

1. Use RESTful conventions
2. Use proper HTTP methods
3. Use plural nouns for resources
4. Use proper status codes

### Request/Response

1. Validate all input
2. Use proper error messages
3. Follow response standard format
4. Include pagination for lists

### Security

1. Authenticate all protected endpoints
2. Validate user permissions
3. Sanitize all inputs
4. Never expose sensitive data

---

## Code Review Checklist

- [ ] Code follows project conventions
- [ ] No security vulnerabilities
- [ ] Error handling is proper
- [ ] Database queries are optimized
- [ ] API responses follow standard
- [ ] Tests are adequate
- [ ] Documentation is updated
- [ ] No debug code (console.log)

---

## Resources

- [API Documentation](./api.md)
- [API Response Standard](./api-response-standard.md)
- [Test Data](./test-data.md)
- [Postman Collection](../postman/Adile-Bakery-ERP.postman_collection.json)