# API Response Standard

This document defines the standard response format for all API endpoints in the Adile Bakery ERP system.

---

## Table of Contents

- [Overview](#overview)
- [Success Response](#success-response)
- [Error Response](#error-response)
- [Response Examples](#response-examples)
- [HTTP Status Codes](#http-status-codes)
- [Usage Guidelines](#usage-guidelines)

---

## Overview

All API responses MUST follow a consistent format to ensure:

- Predictable frontend integration
- Clear error handling
- Consistent error messages
- Easy debugging

---

## Success Response

### Structure

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Always `true` for successful responses |
| `message` | string | Yes | Human-readable success message |
| `data` | object/array | Yes | Response payload (can be empty object `{}`) |

### Examples

**Single Resource:**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": 1,
    "name": "Croissant",
    "price": 2.50
  }
}
```

**List with Pagination:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      { "id": 1, "name": "Croissant", "price": 2.50 },
      { "id": 2, "name": "Baguette", "price": 3.00 }
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

**Empty Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {}
}
```

---

## Error Response

### Structure

```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Always `false` for error responses |
| `message` | string | Yes | Human-readable error message |
| `errors` | array | Yes | Detailed validation errors (can be empty array `[]`) |

### Error Object Structure

Each error in the `errors` array should have:

```json
{
  "field": "fieldName",
  "message": "Validation error message"
}
```

### Examples

**Simple Error:**
```json
{
  "success": false,
  "message": "Invalid username or password",
  "errors": []
}
```

**Validation Errors:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

**Not Found Error:**
```json
{
  "success": false,
  "message": "Product not found",
  "errors": []
}
```

**Server Error:**
```json
{
  "success": false,
  "message": "An unexpected error occurred. Please try again later.",
  "errors": []
}
```

---

## Response Examples

### Authentication

**Login Success:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Ahmed Mohamed",
      "role": "ADMIN"
    }
  }
}
```

**Login Failure:**
```json
{
  "success": false,
  "message": "Invalid username or password",
  "errors": []
}
```

### Products

**Create Product Success:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 15,
    "name": "New Product",
    "price": 5.00
  }
}
```

**Create Product Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Product name is required"
    },
    {
      "field": "price",
      "message": "Price must be a positive number"
    }
  ]
}
```

### Production

**Create Production Record Success:**
```json
{
  "success": true,
  "message": "Production record created successfully",
  "data": {
    "id": 100,
    "productId": 1,
    "quantity": 50,
    "branchId": 1,
    "shift": "MORNING",
    "createdAt": "2026-05-07T08:00:00Z"
  }
}
```

---

## HTTP Status Codes

Use appropriate HTTP status codes along with response format:

| Status Code | Use For | Response Format |
|-------------|---------|-----------------|
| 200 | Successful GET, PUT, DELETE | Success format |
| 201 | Successful POST (created) | Success format |
| 400 | Validation errors | Error format with details |
| 401 | Authentication failed | Error format |
| 403 | Authorization failed | Error format |
| 404 | Resource not found | Error format |
| 409 | Duplicate resource | Error format |
| 500 | Server errors | Error format (generic message) |

---

## Usage Guidelines

### In Controllers

```javascript
// Success response
res.status(200).json({
  success: true,
  message: 'Products retrieved successfully',
  data: { products, pagination }
});

// Created response
res.status(201).json({
  success: true,
  message: 'Product created successfully',
  data: product
});

// Error response
res.status(400).json({
  success: false,
  message: 'Validation failed',
  errors: validationErrors
});

// Not found
res.status(404).json({
  success: false,
  message: 'Product not found',
  errors: []
});

// Server error
res.status(500).json({
  success: false,
  message: 'An unexpected error occurred',
  errors: []
});
```

### Error Handling Middleware

```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    errors: []
  });
};
```

### Frontend Handling

```javascript
try {
  const response = await api.get('/products');

  if (response.data.success) {
    const products = response.data.data.products;
    // Handle success
  } else {
    // Handle error - show message to user
    alert(response.data.message);
  }
} catch (error) {
  // Handle network/server errors
  alert('An error occurred. Please try again.');
}
```

---

## Key Principles

1. **Always include all three fields** - success, message, data/errors
2. **Use descriptive messages** - Clear and actionable
3. **Be consistent** - Same errors should return same format
4. **Include validation details** - Use errors array for field-specific issues
5. **Hide server details** - Don't expose internal errors to users

---

## Summary

| Response Type | Format |
|---------------|--------|
| Success | `{ success: true, message: "...", data: {} }` |
| Error | `{ success: false, message: "...", errors: [] }` |

For full API documentation, see [api.md](./api.md)