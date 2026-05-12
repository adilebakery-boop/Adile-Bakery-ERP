# Test Data Plan

This document provides sample test data for development, testing, and integration purposes.

---

## Table of Contents

- [Roles](#roles)
- [Users](#users)
- [Branches](#branches)
- [Products](#products)
- [Production Data](#production-data)
- [Remaining Data](#remaining-data)

---

## Roles

| ID | Name | Description |
|----|------|-------------|
| 1 | ADMIN | Full system access |
| 2 | MANAGER | Branch management, reports |
| 3 | BAKER | Production recording |
| 4 | CASHIER | Sales and inventory tracking |

### Seed Data

```javascript
const roles = [
  { id: 1, name: 'ADMIN' },
  { id: 2, name: 'MANAGER' },
  { id: 3, name: 'BAKER' },
  { id: 4, name: 'CASHIER' }
];
```

---

## Users

### Sample Users

| ID | Name | Username | Role | Branch | Password (hashed) |
|----|------|-----------|------|--------|-------------------|
| 1 | Ahmed Mohamed | admin | ADMIN | - | $2a$10$... |
| 2 | Sara Ali | sara.manager | MANAGER | Main Branch | $2a$10$... |
| 3 | Omar Hassan | omar.baker | BAKER | Main Branch | $2a$10$... |
| 4 | Fatma Ahmed | fatma.baker | BAKER | Branch 2 | $2a$10$... |
| 5 | Khalid Ibrahim | khalid.cashier | CASHIER | Main Branch | $2a$10$... |
| 6 | Nour Ahmed | nour.cashier | CASHIER | Branch 2 | $2a$10$... |
| 7 | Youssef Mohamed | youssef.manager | MANAGER | Branch 2 | $2a$10$... |

### Test Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| sara.manager | password123 | MANAGER |
| omar.baker | password123 | BAKER |
| fatma.baker | password123 | BAKER |
| khalid.cashier | password123 | CASHIER |

---

## Branches

### Sample Branches

| ID | Name | Description |
|----|------|-------------|
| 1 | Main Branch | Central bakery and HQ |
| 2 | Branch 2 | Downtown location |
| 3 | Branch 3 | Mall location |

### Seed Data

```javascript
const branches = [
  { id: 1, name: 'Main Branch' },
  { id: 2, name: 'Branch 2' },
  { id: 3, name: 'Branch 3' }
];
```

---

## Products

### Product Categories

| Category | Products |
|----------|----------|
| Bread | Arabic Bread, Baguette, Burger Buns, Hot Dog Buns |
| Pastries | Croissant, Danish, Pain au Chocolat, Muffin |
| Cakes | Birthday Cake, Cupcake, Cheesecake, Brownie |
| Sweets | Kunafa, Basbousa, Baklava, Ma'amoul |

### Sample Products

| ID | Name | Category | Price | Unit |
|----|------|----------|-------|------|
| 1 | Normal Bread | Bread | 15.00 | piece |
| 2 | Normal Mid Size Bread | Bread | 25.00 | piece |
| 3 | Normal Big Size Bread | Bread | 30.00 | piece |
| 4 | Difo Bread | Bread | 60.00 | piece |
| 5 | Aja Bread | Bread | 30.00 | piece |
| 6 | Gabse Bread | Bread | 20.00 | piece |
| 7 | Slice Bread | Bread | 70.00 | piece |
| 8 | Bread | Bread | 15.00 | piece |
| 9 | Bread | Bread | 15.00 | piece |

 10 | Cup Cake | Cream Cakes | 150.00 | piece |
| 11 | Torta Cake | Soft Cakes | 1000 | piece |
| 12 | Cake | Cream Cakes | 120.00 | piece |
| 13 | Cake | Cream Cakes | 130.00 | piece |
| 14 | Cake | Cream Cakes | 150.00 | piece |

| 15 | Termisu | Cream Cakes | 100.00 | piece |
| 16 | Istanbul | Soft Cakes | 150.00 | piece |
| 17 | English | Soft Cakes | 70.00 | piece |
| 18 | Big English | Soft Cakes | 550.00 | piece |

| 19 | Venus | Dry Cakes | 150.00 | piece |
| 20 | Zabib | Dry Cakes | 150.00 | piece |
| 21 | Cake | Dry Cakes | 150.00 | piece |

| 22 | Mushabak | Sweets | 5.00 | piece |
| 23 | Halawa | Sweets | 5.00 | piece |
| 24 | Ma'amoul | Sweets | 5.00 | piece |
| 25 | Baklava | Sweets | 100.00 | piece |
| 26 | Ma'amoul | Sweets | 5.00 | piece |

| 27 | Donut | Pastry | 70.00 | piece |
| 28 | Sambusa| Pastry | 25.00 | piece |
| 29 | Qoqora | Pastry | 30.00 | piece |
| 30 | Bobolino | Pastry | 60.00 | piece |

| 31 | Salxi Giricillin | Snack | 80.00 | piece |
| 32 | Giricillin | Snack | 60.00 | piece |
| 33 | Daabboo qollo | Snack | 40.00 | piece |
| 34 | Bobolino | Snack | 60.00 | piece |

| 35 | Milk | Drink | 90.00 | piece |
| 36 | Milk 1L | Drink | 250.00 | piece |
| 37 | Normal Yogurt | Drink | 120.00 | piece |
| 38 | Special Yogurt | Drink | 140.00 | piece |
| 39 | Water | Drink | 60.00 | piece |

| 40 | Normal Fetire | Fetire | 200.00 | piece |
| 41 | Special Fetire |  Fetire  | 250.00 | piece |
| 42 | Malaw |  Fetire  | 150.00 | piece |
### Seed Data

```javascript
const products = [
  { id: 1, name: 'Arabic Bread', category: 'Bread', price: 1.00, unitType: 'piece', isActive: true },
  { id: 2, name: 'Baguette', category: 'Bread', price: 3.00, unitType: 'piece', isActive: true },
  { id: 3, name: 'Burger Buns', category: 'Bread', price: 0.50, unitType: 'piece', isActive: true },
  { id: 4, name: 'Hot Dog Buns', category: 'Bread', price: 0.75, unitType: 'piece', isActive: true },
  { id: 5, name: 'Croissant', category: 'Pastries', price: 2.50, unitType: 'piece', isActive: true },
  { id: 6, name: 'Danish', category: 'Pastries', price: 3.00, unitType: 'piece', isActive: true },
  { id: 7, name: 'Pain au Chocolat', category: 'Pastries', price: 4.00, unitType: 'piece', isActive: true },
  { id: 8, name: 'Muffin', category: 'Pastries', price: 2.00, unitType: 'piece', isActive: true },
  { id: 9, name: 'Birthday Cake', category: 'Cakes', price: 50.00, unitType: 'piece', isActive: true },
  { id: 10, name: 'Cupcake', category: 'Cakes', price: 5.00, unitType: 'piece', isActive: true },
  { id: 11, name: 'Cheesecake', category: 'Cakes', price: 15.00, unitType: 'piece', isActive: true },
  { id: 12, name: 'Brownie', category: 'Cakes', price: 4.00, unitType: 'piece', isActive: true },
  { id: 13, name: 'Kunafa', category: 'Sweets', price: 10.00, unitType: 'piece', isActive: true },
  { id: 14, name: 'Basbousa', category: 'Sweets', price: 3.00, unitType: 'piece', isActive: true },
  { id: 15, name: 'Baklava', category: 'Sweets', price: 8.00, unitType: 'piece', isActive: true },
  { id: 16, name: 'Ma\'amoul', category: 'Sweets', price: 5.00, unitType: 'piece', isActive: true }
];
```

---

## Production Data

### Shift Enum

| Value | Description |
|-------|-------------|
| MORNING | 6:00 AM - 2:00 PM |
| AFTERNOON | 2:00 PM - 10:00 PM |
| EVENING | 10:00 PM - 6:00 AM |

### Sample Production Records

**Main Branch - May 7, 2026**

| ID | Product | Quantity | Shift | User |
|----|---------|-----------|-------|------|
| 1 | Arabic Bread | 200 | MORNING | Omar |
| 2 | Baguette | 50 | MORNING | Omar |
| 3 | Croissant | 80 | MORNING | Omar |
| 4 | Arabic Bread | 150 | AFTERNOON | Omar |
| 5 | Baguette | 40 | AFTERNOON | Omar |
| 6 | Croissant | 60 | EVENING | Omar |

**Branch 2 - May 7, 2026**

| ID | Product | Quantity | Shift | User |
|----|---------|-----------|-------|------|
| 7 | Arabic Bread | 180 | MORNING | Fatma |
| 8 | Burger Buns | 100 | MORNING | Fatma |
| 9 | Danish | 40 | MORNING | Fatma |
| 10 | Arabic Bread | 120 | AFTERNOON | Fatma |
| 11 | Baguette | 30 | EVENING | Fatma |

### Production Data Example (JSON)

```json
{
  "production": [
    { "productId": 1, "quantity": 200, "branchId": 1, "shift": "MORNING" },
    { "productId": 2, "quantity": 50, "branchId": 1, "shift": "MORNING" },
    { "productId": 5, "quantity": 80, "branchId": 1, "shift": "MORNING" },
    { "productId": 1, "quantity": 150, "branchId": 1, "shift": "AFTERNOON" },
    { "productId": 2, "quantity": 40, "branchId": 1, "shift": "AFTERNOON" },
    { "productId": 5, "quantity": 60, "branchId": 1, "shift": "EVENING" }
  ]
}
```

---

## Remaining Data

### Sample Remaining Records

**Main Branch - End of May 7, 2026**

| Product | Remaining Quantity |
|---------|-------------------|
| Arabic Bread | 25 |
| Baguette | 8 |
| Croissant | 12 |
| Danish | 5 |
| Muffin | 15 |

**Branch 2 - End of May 7, 2026**

| Product | Remaining Quantity |
|---------|-------------------|
| Arabic Bread | 18 |
| Burger Buns | 10 |
| Danish | 3 |
| Baguette | 5 |

### Remaining Data Example (JSON)

```json
{
  "remaining": [
    { "productId": 1, "quantity": 25, "branchId": 1, "date": "2026-05-07" },
    { "productId": 2, "quantity": 8, "branchId": 1, "date": "2026-05-07" },
    { "productId": 5, "quantity": 12, "branchId": 1, "date": "2026-05-07" },
    { "productId": 6, "quantity": 5, "branchId": 1, "date": "2026-05-07" },
    { "productId": 8, "quantity": 15, "branchId": 1, "date": "2026-05-07" },
    { "productId": 1, "quantity": 18, "branchId": 2, "date": "2026-05-07" },
    { "productId": 3, "quantity": 10, "branchId": 2, "date": "2026-05-07" },
    { "productId": 6, "quantity": 3, "branchId": 2, "date": "2026-05-07" },
    { "productId": 2, "quantity": 5, "branchId": 2, "date": "2026-05-07" }
  ]
}
```

---

## Test Scenarios

### Authentication Tests

| Scenario | Input | Expected |
|----------|-------|----------|
| Valid login | admin / admin123 | Success with token |
| Invalid password | admin / wrongpass | Error message |
| Invalid username | unknown / password | Error message |
| Empty credentials | (empty) | Validation error |

### Product Tests

| Scenario | Input | Expected |
|----------|-------|----------|
| Create product | Valid product data | Product created |
| Duplicate name | Existing product name | Error |
| Invalid price | Negative number | Validation error |
| Empty name | (empty) | Validation error |

### Production Tests

| Scenario | Input | Expected |
|----------|-------|----------|
| Create production | Valid production data | Record created |
| Invalid quantity | Zero or negative | Validation error |
| Invalid shift | Invalid shift value | Validation error |

### Reports Tests

| Scenario | Parameters | Expected |
|----------|------------|----------|
| Date range | startDate, endDate | Correct data |
| Branch filter | branchId | Filtered data |
| Invalid dates | endDate < startDate | Error |

---

## Integration Test Data

### Complete Test Flow

1. **Login as Admin**
   ```json
   { "username": "admin", "password": "admin123" }
   ```

2. **Create User**
   ```json
   {
     "name": "Test Baker",
     "username": "test.baker",
     "password": "test123",
     "roleId": 3,
     "branchId": 1
   }
   ```

3. **Create Product**
   ```json
   {
     "name": "Test Product",
     "category": "Bread",
     "price": 2.00,
     "unitType": "piece"
   }
   ```

4. **Record Production**
   ```json
   {
     "productId": 17,
     "quantity": 100,
     "branchId": 1,
     "shift": "MORNING"
   }
   ```

5. **Record Remaining**
   ```json
   {
     "productId": 17,
     "quantity": 10,
     "branchId": 1,
     "date": "2026-05-07"
   }
   ```

6. **Generate Reports**
   - Production summary
   - Remaining summary
   - Branch performance

---

## Notes

- All passwords in test data are hashed using bcrypt
- Use `bcrypt.hash('password', 10)` to generate password hashes
- Test data can be seeded using Prisma seed functionality
- Production and remaining quantities should be positive decimals
- Dates are stored in YYYY-MM-DD format