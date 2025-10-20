# Transaction System Documentation

## Overview
This document outlines the complete transaction management system with database connections, API endpoints, and React components.

## Database Structure

### Tables Modified/Created

#### 1. `requests` table (new columns added)
- `original_transaction_id` - References the transaction being exchanged
- `evidence_file` - Path to uploaded evidence file for exchange requests
- `appeal_reason` - Reason provided for appealing a denied request
- `appeal_date` - Timestamp when appeal was submitted

### Existing Tables Used
- `transactions` - Main transaction records
- `equipment` - Equipment being borrowed
- `employees` - Employee information
- `users` - User accounts

## API Endpoints

### Transaction Statistics
- **GET** `/api/transactions/stats`
  - Returns: `{ borrowed, available, overdue }`
  - Used for dashboard statistics

### Approved Transactions
- **GET** `/api/transactions/approved`
  - Returns: List of approved (released) transactions for current user
  - Includes equipment details

### Transaction History
- **GET** `/api/transactions/history`
  - Returns: List of returned transactions for current user
  - Used in history view

### Transaction Actions

#### Return Transaction
- **POST** `/api/transactions/{id}/return`
- Body: `{ return_condition, return_notes }`
- Updates transaction status to 'returned'
- Updates equipment status to 'available'

#### Exchange Request
- **POST** `/api/transactions/{id}/exchange`
- Body: `{ new_equipment_id, reason, evidence_file }`
- Creates a new exchange request
- Links to original transaction

#### Cancel Request
- **POST** `/api/transactions/{id}/cancel`
- Cancels a pending request
- Updates status to 'cancelled'

#### Appeal Denied Request
- **POST** `/api/transactions/{id}/appeal`
- Body: `{ appeal_reason }`
- Updates denied request status to 'appealed'
- Stores appeal reason and date

## React Components

### 1. EmployeeTransaction.jsx
Main transaction dashboard component
- Shows borrowed items statistics
- Displays on-process transactions
- Shows approved transactions
- History view with pagination and search
- Integrates all transaction functionality

### 2. OnProcessTransactions.jsx
Manages pending/processing transactions
- Displays pending requests in scrollable table
- Inspect panel for viewing request details
- Cancel request functionality
- Denied requests viewing and appeal

### 3. ApprovedTransactions.jsx
Manages approved/released transactions
- Shows approved transactions in scrollable table
- Return now functionality
- Exchange equipment functionality
- Browse available equipment
- Upload evidence for exchange

## Key Features Implemented

### 1. Scroll Functionality
All transaction tables have proper scrolling:
```jsx
<div className="overflow-y-auto h-[400px] sm:h-[500px] lg:h-[600px] bg-white">
  {/* Table content */}
</div>
```

### 2. Database Connections
All components now fetch data from the database through API endpoints:
- Real-time transaction statistics
- Dynamic transaction lists
- Proper filtering and sorting

### 3. Transaction Workflows

#### Borrow Flow:
1. Employee submits request → `pending` status
2. Admin approves → `approved` status  
3. Admin releases equipment → `released` status (transaction created)
4. Employee returns → `returned` status

#### Exchange Flow:
1. Employee requests exchange from approved transaction
2. Creates new request with `request_type='exchange'`
3. Links to original transaction via `original_transaction_id`
4. Admin reviews and processes

#### Appeal Flow:
1. Request gets denied
2. Employee views in "Denied Requests" section
3. Employee submits appeal with reason
4. Status changes to `appealed`
5. Admin reviews appeal

### 4. User Experience Improvements
- Loading states for all actions
- Error handling
- Confirmation modals
- Responsive design for mobile/tablet/desktop
- Smooth animations and transitions

## Controller Methods

### TransactionController.php

1. `stats()` - Get transaction statistics for employee
2. `approved()` - Get approved transactions for employee
3. `history()` - Get transaction history
4. `returnTransaction()` - Process equipment return
5. `exchange()` - Create exchange request
6. `cancel()` - Cancel pending request
7. `appeal()` - Submit appeal for denied request

## Usage Examples

### Fetching Statistics
```javascript
const response = await fetch('/api/transactions/stats');
const data = await response.json();
// Returns: { success: true, data: { borrowed: 5, available: 20, overdue: 1 } }
```

### Returning Equipment
```javascript
const response = await fetch(`/api/transactions/${transactionId}/return`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    return_condition: 'good_condition',
    return_notes: 'Equipment in perfect condition'
  })
});
```

### Exchanging Equipment
```javascript
const response = await fetch(`/api/transactions/${transactionId}/exchange`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    new_equipment_id: 123,
    reason: 'Current equipment is malfunctioning',
    evidence_file: 'path/to/evidence.jpg'
  })
});
```

## Security Notes

- All endpoints require authentication
- Employee can only access their own transactions
- Validation on all inputs
- Proper error handling
- SQL injection prevention through query builder

## Testing

To test the system:

1. Run migrations:
   ```bash
   php artisan migrate
   ```

2. Seed test data if needed:
   ```bash
   php artisan db:seed
   ```

3. Access the employee transaction page
4. Test each workflow (borrow, return, exchange, appeal)

## Future Enhancements

Potential improvements:
- File upload handling for evidence
- Email notifications for status changes
- Advanced search and filtering
- Export transaction history
- Analytics dashboard
- Mobile app integration

## Maintenance

Regular maintenance tasks:
- Monitor database size
- Archive old transactions
- Update equipment availability
- Review and process appeals
- Clean up cancelled requests

---

Last Updated: October 16, 2025
