# Adile Bakery ERP - API Documentation

Base URL: `http://localhost:3000/api`

All API endpoints follow the standard response format defined in [api-response-standard.md](./api-response-standard.md)

---

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Products](#products)
- [Branches](#branches)
- [Production](#production)
- [Remaining](#remaining)
- [Reports](#reports)

---

## Authentication

### Login

Authenticate a user and receive an access token.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/auth/login` |

**Request Body:**
```json
{
  "username": "admin",
  "password": "securepassword123"
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Ahmed Mohamed",
      "username": "admin",
      "role": "ADMIN",
      "branchId": null
    }
  }
}
```

**Example Response (Error):**
```json
{
  "success": false,
  "message": "Invalid username or password",
  "errors": []
}
```

---

### Register

Register a new user in the system.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/auth/register` |

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "john.doe",
  "password": "password123",
  "roleId": 2,
  "branchId": 1
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 5,
    "name": "John Doe",
    "username": "john.doe",
    "roleId": 2
  }
}
```

---

### Logout

Invalidate the current user session.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/auth/logout` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {}
}
```

---

## Users

### Get All Users

Retrieve all users in the system.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/users` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20) |
| `roleId` | integer | Filter by role |
| `branchId` | integer | Filter by branch |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "Ahmed Mohamed",
        "username": "admin",
        "role": "ADMIN",
        "branchId": null,
        "createdAt": "2026-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### Get User by ID

Retrieve a specific user by ID.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/users/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "name": "Ahmed Mohamed",
    "username": "admin",
    "role": "ADMIN",
    "branchId": null,
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

**Example Response (Error):**
```json
{
  "success": false,
  "message": "User not found",
  "errors": []
}
```

---

### Create User

Create a new user in the system.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/users` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New User",
  "username": "new.user",
  "password": "password123",
  "roleId": 3,
  "branchId": 1
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 6,
    "name": "New User",
    "username": "new.user",
    "roleId": 3,
    "branchId": 1
  }
}
```

---

### Update User

Update an existing user.

| | |
|---|---|
| **Method** | PUT |
| **URL** | `/users/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "roleId": 2,
  "branchId": 2
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 6,
    "name": "Updated Name",
    "username": "new.user",
    "roleId": 2,
    "branchId": 2
  }
}
```

---

### Delete User

Delete a user from the system.

| | |
|---|---|
| **Method** | DELETE |
| **URL** | `/users/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {}
}
```

---

## Products

### Get All Products

Retrieve all products in the system.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/products` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `isActive` | boolean | Filter by active status |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Croissant",
        "category": "Pastries",
        "price": 2.50,
        "unitType": "piece",
        "isActive": true
      },
      {
        "id": 2,
        "name": "Arabic Bread",
        "category": "Bread",
        "price": 1.00,
        "unitType": "piece",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

---

### Get Product by ID

Retrieve a specific product by ID.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/products/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": 1,
    "name": "Croissant",
    "category": "Pastries",
    "price": 2.50,
    "unitType": "piece",
    "isActive": true
  }
}
```

---

### Create Product

Create a new product.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/products` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Baguette",
  "category": "Bread",
  "price": 3.00,
  "unitType": "piece",
  "isActive": true
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 26,
    "name": "Baguette",
    "category": "Bread",
    "price": 3.00,
    "unitType": "piece",
    "isActive": true
  }
}
```

---

### Update Product

Update an existing product.

| | |
|---|---|
| **Method** | PUT |
| **URL** | `/products/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Baguette (Updated)",
  "price": 3.50,
  "isActive": true
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 26,
    "name": "Baguette (Updated)",
    "category": "Bread",
    "price": 3.50,
    "unitType": "piece",
    "isActive": true
  }
}
```

---

### Delete Product

Delete a product (soft delete - sets isActive to false).

| | |
|---|---|
| **Method** | DELETE |
| **URL** | `/products/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {}
}
```

---

## Branches

### Get All Branches

Retrieve all branches in the system.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/branches` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Branches retrieved successfully",
  "data": {
    "branches": [
      {
        "id": 1,
        "name": "Main Branch"
      },
      {
        "id": 2,
        "name": "Branch 2"
      },
      {
        "id": 3,
        "name": "Branch 3"
      }
    ]
  }
}
```

---

### Get Branch by ID

Retrieve a specific branch by ID.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/branches/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Branch retrieved successfully",
  "data": {
    "id": 1,
    "name": "Main Branch"
  }
}
```

---

### Create Branch

Create a new branch.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/branches` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Branch"
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Branch created successfully",
  "data": {
    "id": 4,
    "name": "New Branch"
  }
}
```

---

### Update Branch

Update an existing branch.

| | |
|---|---|
| **Method** | PUT |
| **URL** | `/branches/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Branch Name"
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Branch updated successfully",
  "data": {
    "id": 4,
    "name": "Updated Branch Name"
  }
}
```

---

### Delete Branch

Delete a branch from the system.

| | |
|---|---|
| **Method** | DELETE |
| **URL** | `/branches/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Branch deleted successfully",
  "data": {}
}
```

---

## Production

### Get Production Records

Retrieve production records with optional filters.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/production` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `branchId` | integer | Filter by branch |
| `productId` | integer | Filter by product |
| `shift` | string | Filter by shift (MORNING, AFTERNOON, EVENING) |
| `startDate` | string | Filter by start date (YYYY-MM-DD) |
| `endDate` | string | Filter by end date (YYYY-MM-DD) |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Production records retrieved successfully",
  "data": {
    "records": [
      {
        "id": 1,
        "productId": 1,
        "productName": "Croissant",
        "quantity": 50.00,
        "branchId": 1,
        "branchName": "Main Branch",
        "shift": "MORNING",
        "userId": 1,
        "userName": "Ahmed Mohamed",
        "createdAt": "2026-05-07T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### Create Production Record

Create a new production record.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/production` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 75.00,
  "branchId": 1,
  "shift": "MORNING"
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Production record created successfully",
  "data": {
    "id": 101,
    "productId": 1,
    "quantity": 75.00,
    "branchId": 1,
    "shift": "MORNING",
    "userId": 1,
    "createdAt": "2026-05-07T09:30:00Z"
  }
}
```

---

### Update Production Record

Update an existing production record.

| | |
|---|---|
| **Method** | PUT |
| **URL** | `/production/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "quantity": 100.00,
  "shift": "AFTERNOON"
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Production record updated successfully",
  "data": {
    "id": 101,
    "productId": 1,
    "quantity": 100.00,
    "branchId": 1,
    "shift": "AFTERNOON",
    "userId": 1,
    "createdAt": "2026-05-07T09:30:00Z"
  }
}
```

---

### Delete Production Record

Delete a production record.

| | |
|---|---|
| **Method** | DELETE |
| **URL** | `/production/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Production record deleted successfully",
  "data": {}
}
```

---

## Remaining

### Get Remaining Records

Retrieve remaining inventory records.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/remaining` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `branchId` | integer | Filter by branch |
| `productId` | integer | Filter by product |
| `date` | string | Filter by specific date (YYYY-MM-DD) |
| `startDate` | string | Filter by start date |
| `endDate` | string | Filter by end date |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Remaining records retrieved successfully",
  "data": {
    "records": [
      {
        "id": 1,
        "productId": 1,
        "productName": "Croissant",
        "quantity": 10.00,
        "branchId": 1,
        "branchName": "Main Branch",
        "date": "2026-05-07",
        "userId": 1,
        "userName": "Ahmed Mohamed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

### Create Remaining Record

Record remaining inventory at end of day.

| | |
|---|---|
| **Method** | POST |
| **URL** | `/remaining` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 5.00,
  "branchId": 1,
  "date": "2026-05-07"
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Remaining record created successfully",
  "data": {
    "id": 51,
    "productId": 1,
    "quantity": 5.00,
    "branchId": 1,
    "date": "2026-05-07",
    "userId": 1
  }
}
```

---

### Update Remaining Record

Update an existing remaining record.

| | |
|---|---|
| **Method** | PUT |
| **URL** | `/remaining/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "quantity": 8.00
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Remaining record updated successfully",
  "data": {
    "id": 51,
    "productId": 1,
    "quantity": 8.00,
    "branchId": 1,
    "date": "2026-05-07",
    "userId": 1
  }
}
```

---

### Delete Remaining Record

Delete a remaining record.

| | |
|---|---|
| **Method** | DELETE |
| **URL** | `/remaining/:id` |

**Headers:**
```
Authorization: Bearer <token>
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Remaining record deleted successfully",
  "data": {}
}
```

---

## Reports

### Production Summary Report

Get production summary for a date range.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/reports/production-summary` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `branchId` | integer | Filter by branch |
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Production summary retrieved successfully",
  "data": {
    "period": {
      "startDate": "2026-05-01",
      "endDate": "2026-05-07"
    },
    "totalProduction": 1250.00,
    "byProduct": [
      {
        "productId": 1,
        "productName": "Croissant",
        "totalQuantity": 350.00
      },
      {
        "productId": 2,
        "productName": "Arabic Bread",
        "totalQuantity": 900.00
      }
    ],
    "byBranch": [
      {
        "branchId": 1,
        "branchName": "Main Branch",
        "totalQuantity": 500.00
      },
      {
        "branchId": 2,
        "branchName": "Branch 2",
        "totalQuantity": 750.00
      }
    ],
    "byShift": {
      "MORNING": 450.00,
      "AFTERNOON": 400.00,
      "EVENING": 400.00
    }
  }
}
```

---

### Remaining Summary Report

Get remaining inventory summary for a date range.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/reports/remaining-summary` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `branchId` | integer | Filter by branch |
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Remaining summary retrieved successfully",
  "data": {
    "period": {
      "startDate": "2026-05-01",
      "endDate": "2026-05-07"
    },
    "records": [
      {
        "date": "2026-05-07",
        "totalRemaining": 45.00,
        "byProduct": [
          {
            "productId": 1,
            "productName": "Croissant",
            "quantity": 10.00
          },
          {
            "productId": 2,
            "productName": "Arabic Bread",
            "quantity": 35.00
          }
        ]
      }
    ]
  }
}
```

---

### Branch Performance Report

Get performance metrics for branches.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/reports/branch-performance` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Branch performance retrieved successfully",
  "data": {
    "branches": [
      {
        "branchId": 1,
        "branchName": "Main Branch",
        "totalProduction": 500.00,
        "totalRemaining": 25.00,
        "utilizationRate": 95.00,
        "productCount": 10
      },
      {
        "branchId": 2,
        "branchName": "Branch 2",
        "totalProduction": 750.00,
        "totalRemaining": 50.00,
        "utilizationRate": 93.33,
        "productCount": 15
      }
    ]
  }
}
```

---

### Daily Report

Get daily summary report.

| | |
|---|---|
| **Method** | GET |
| **URL** | `/reports/daily` |

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Date (YYYY-MM-DD) - defaults to today |
| `branchId` | integer | Filter by branch |

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Daily report retrieved successfully",
  "data": {
    "date": "2026-05-07",
    "branchId": 1,
    "totalProduction": 250.00,
    "totalRemaining": 15.00,
    "productionByShift": {
      "MORNING": 100.00,
      "AFTERNOON": 100.00,
      "EVENING": 50.00
    },
    "topProducts": [
      {
        "productId": 1,
        "productName": "Croissant",
        "produced": 100.00,
        "remaining": 5.00
      },
      {
        "productId": 2,
        "productName": "Arabic Bread",
        "produced": 150.00,
        "remaining": 10.00
      }
    ]
  }
}
```

---

## Error Responses

All error responses follow the standard format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token is obtained from the `/auth/login` endpoint and typically expires after 24 hours.