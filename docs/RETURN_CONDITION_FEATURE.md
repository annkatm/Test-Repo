# Equipment Return Condition Feature

## Overview
This feature allows employees to specify the condition of equipment when returning it, and enables admins to review and verify the reported condition.

## How It Works

### For Employees

1. **Initiating a Return**
   - Navigate to your borrowed equipment
   - Click the "Return" button on an item
   - The Return Condition Modal will appear

2. **Specifying Condition**
   - For each item being returned, select one of the following conditions:
     - **Good Condition** ✓ - Equipment is working perfectly
     - **Damaged** ⚠ - Equipment requires repair
     - **Has Defect** ⚡ - Equipment has minor issues
   
3. **Adding Notes** (Optional)
   - Add any additional comments about the equipment condition
   - Maximum 500 characters

4. **Confirming Return**
   - Review all selected conditions
   - Click "Confirm Return" to submit

### For Admins

1. **Viewing Returns**
   - Navigate to the Approved Transactions or View Requests page
   - Returns awaiting verification will be marked with "returned" status

2. **Verifying Returns**
   - Click "Verify Return" on a returned transaction
   - The Verify Return Modal will display:
     - Employee information
     - All returned items with their serial numbers and specifications
     - **Condition reported by employee** (color-coded):
       - Green: Good Condition
       - Red: Damaged
       - Yellow: Has Defect
     - Any notes provided by the employee

3. **Adding Verification Notes** (Optional)
   - Add admin observations or verification notes
   - Maximum 500 characters

4. **Completing Verification**
   - Click "Verify & Complete Return"
   - Equipment status will be updated based on the reported condition:
     - **Good Condition** → Equipment becomes available for new requests
     - **Damaged** → Equipment marked as damaged, withheld for repair
     - **Has Defect** → Equipment marked with defects, withheld for inspection

## Database Schema

### Transactions Table
- `return_condition` - ENUM('good_condition', 'damaged', 'has_defect', 'lost')
- `return_notes` - TEXT (employee's notes)
- `return_date` - DATE
- `verification_notes` - TEXT (admin's notes)
- `verified_by` - Foreign key to users table
- `verified_at` - TIMESTAMP

## API Endpoints

### Return Transaction (Employee)
```
POST /api/transactions/{id}/return
Body: {
  "return_condition": "good_condition|damaged|has_defect|lost",
  "return_notes": "Optional notes"
}
```

### Verify Return (Admin)
```
POST /api/transactions/{id}/verify-return
Body: {
  "verification_notes": "Optional admin notes"
}
```

## Components

### ReturnConditionModal.jsx
- Used by employees to specify equipment condition when returning
- Displays all items being returned
- Allows condition selection per item
- Supports additional notes

### VerifyReturnModal.jsx
- Used by admins to verify returned equipment
- Shows employee-reported conditions (read-only)
- Displays employee notes
- Allows admin to add verification notes
- Completes the return process

## Benefits

1. **Accountability** - Clear record of equipment condition at return time
2. **Transparency** - Both employees and admins can see condition reports
3. **Inventory Management** - Automatic equipment status updates based on condition
4. **Audit Trail** - Complete history of equipment condition changes
5. **Maintenance Planning** - Easy identification of damaged equipment needing repair

## Migration

Run the following command to update your database:
```bash
php artisan migrate
```

This will update the `return_condition` enum to include the new values.
