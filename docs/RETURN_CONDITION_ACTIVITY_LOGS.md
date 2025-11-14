# Return Condition Activity Logs

## Overview
The equipment return and verification process now generates detailed activity logs that capture the condition reported by employees and verified by admins.

## Activity Log Entries

### 1. Equipment Returned (Employee Action)

**Trigger:** When an employee returns equipment

**Action:** `Equipment Returned`

**Description Format:**
```
Equipment returned by [Employee Name]: [Equipment Name] (SN: [Serial Number]) - Condition: [Condition]
```

**With Notes:**
```
Equipment returned by John Doe: ASUS Monitor (SN: EQ-002) - Condition: Good Condition | Notes: Screen is working perfectly
```

**Condition Values:**
- Good Condition
- Damaged
- Has Defect
- Lost

**Data Captured:**
- **Old Values:** `{ status: 'released' }`
- **New Values:** `{ status: 'returned', return_condition: 'good_condition' }`
- **User:** Employee who returned the equipment
- **Timestamp:** When the return was initiated
- **IP Address:** Employee's IP
- **User Agent:** Employee's browser/device

### 2. Return Verified (Admin Action)

**Trigger:** When an admin verifies and completes a return

**Action:** `Return Verified`

**Description Format:**
```
Return verified by [Admin Name]: [Equipment Name] (SN: [Serial Number]) from [Employee Name] - Condition: [Condition]
```

**With Admin and Employee Notes:**
```
Return verified by Admin User: ASUS Monitor (SN: EQ-002) from John Doe - Condition: Damaged | Admin Notes: Confirmed damage, sent for repair | Employee Notes: Power button is stuck
```

**Data Captured:**
- **Old Values:** `{ status: 'returned' }`
- **New Values:** `{ status: 'completed', verified_by: [Admin ID] }`
- **User:** Admin who verified the return
- **Timestamp:** When the verification was completed
- **IP Address:** Admin's IP
- **User Agent:** Admin's browser/device

## Example Activity Log Entries

### Example 1: Good Condition Return
```
Action: Equipment Returned
Description: Equipment returned by Sarah Johnson: Dell Laptop (SN: LAP-001) - Condition: Good Condition
User: Sarah Johnson (Employee)
Date: 2025-11-14 10:30:00
---
Action: Return Verified
Description: Return verified by Admin User: Dell Laptop (SN: LAP-001) from Sarah Johnson - Condition: Good Condition | Admin Notes: Inspected and confirmed in excellent condition
User: Admin User
Date: 2025-11-14 10:35:00
```

### Example 2: Damaged Equipment Return
```
Action: Equipment Returned
Description: Equipment returned by Mike Chen: Logitech Mouse (SN: MOU-015) - Condition: Damaged | Notes: Left click button not working properly
User: Mike Chen (Employee)
Date: 2025-11-14 11:15:00
---
Action: Return Verified
Description: Return verified by IT Manager: Logitech Mouse (SN: MOU-015) from Mike Chen - Condition: Damaged | Admin Notes: Confirmed defect, will replace | Employee Notes: Left click button not working properly
User: IT Manager
Date: 2025-11-14 11:20:00
```

### Example 3: Equipment with Defect
```
Action: Equipment Returned
Description: Equipment returned by Alex Rivera: HP Monitor (SN: MON-023) - Condition: Has Defect | Notes: Occasional screen flickering
User: Alex Rivera (Employee)
Date: 2025-11-14 14:00:00
---
Action: Return Verified
Description: Return verified by Admin User: HP Monitor (SN: MON-023) from Alex Rivera - Condition: Has Defect | Admin Notes: Tested and confirmed flickering issue, sent to IT for diagnosis | Employee Notes: Occasional screen flickering
User: Admin User
Date: 2025-11-14 14:10:00
```

## Viewing Activity Logs

### In the Admin Dashboard

1. Navigate to **Activity Logs** page
2. Filter by:
   - **Action:** "Equipment Returned" or "Return Verified"
   - **Date Range:** Select specific period
   - **User:** Filter by employee or admin
   - **Search:** Search for equipment name or serial number

### Log Details Include:
- **Action Type** - Equipment Returned / Return Verified
- **User** - Who performed the action
- **Description** - Full details including condition and notes
- **Timestamp** - When the action occurred
- **IP Address** - Where the action was performed from
- **Changes** - Old and new status values

## Benefits

### Accountability
- Complete audit trail of who returned what and in what condition
- Admin verification records with notes
- Timestamps for all actions

### Transparency
- Both employee and admin perspectives captured
- Notes from both parties preserved
- Clear record of equipment condition at each step

### Reporting
- Track equipment condition trends
- Identify frequently damaged items
- Monitor return processing times
- Analyze employee return patterns

### Compliance
- Detailed records for audits
- IP address and user agent tracking
- Immutable log entries
- Complete chain of custody

## Database Schema

Activity logs are stored in the `activity_logs` table:

```sql
- id (primary key)
- user_id (who performed the action)
- action (e.g., "Equipment Returned", "Return Verified")
- description (detailed description with condition)
- model_type (Transaction model)
- model_id (transaction ID)
- old_values (JSON - previous state)
- new_values (JSON - new state)
- ip_address (user's IP)
- user_agent (browser/device info)
- created_at (timestamp)
- updated_at (timestamp)
```

## API Endpoints

Activity logs can be retrieved via:

```
GET /api/activity-logs
```

**Query Parameters:**
- `action` - Filter by action type
- `user_id` - Filter by user
- `start_date` - Filter by date range
- `end_date` - Filter by date range
- `search` - Search in descriptions
- `per_page` - Pagination (default: 15)

**Example:**
```
GET /api/activity-logs?action=Equipment Returned&start_date=2025-11-01&end_date=2025-11-30
```

## Related Documentation
- [Return Condition Feature](./RETURN_CONDITION_FEATURE.md)
- [Admin Verify Return Guide](./ADMIN_VERIFY_RETURN_GUIDE.md)
- [Return Condition Fix](./RETURN_CONDITION_FIX.md)
