# How to Make Damaged Equipment Available Again

## Overview
When equipment is returned as damaged or with defects, it's automatically withheld from the available equipment list. After repair, you can mark it as repaired to make it available again.

## Methods to Make Equipment Available

### Method 1: Mark as Repaired (Recommended)

This is the proper workflow that logs the repair activity.

#### API Endpoint
```
POST /api/equipment/{id}/mark-as-repaired
```

#### Request Body
```json
{
  "condition": "good",
  "repair_notes": "Replaced faulty power button, tested and working"
}
```

#### Parameters
- **condition** (required): The condition after repair
  - `excellent` - Like new
  - `good` - Working perfectly
  - `fair` - Working but not perfect
- **repair_notes** (optional): Notes about the repair (max 1000 characters)

#### Response
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Logitech Mouse",
    "status": "available",
    "condition": "good",
    ...
  },
  "message": "Equipment marked as repaired and is now available"
}
```

### Method 2: Manual Update

Update the equipment status directly through the Equipment Management page.

#### Steps:
1. Go to Equipment Management
2. Find the damaged equipment
3. Click "Edit"
4. Change:
   - **Status** → `available`
   - **Condition** → `good` (or appropriate condition)
5. Add notes about the repair
6. Click "Save"

## Complete Workflow Example

### Scenario: Mouse with Broken Button

#### Step 1: Equipment Returned as Damaged
```
Employee: Mike Chen
Equipment: Logitech MX Master Mouse (SN: MOU-015)
Condition: Damaged
Notes: Left click button not working properly
Result: Equipment status = issued (withheld)
```

#### Step 2: Admin Verifies Return
```
Admin: IT Manager
Action: Verify Return
Result: Equipment remains withheld for repair
Activity Log: "Return verified - Condition: Damaged"
```

#### Step 3: Equipment Sent for Repair
```
Action: Send to IT department or external repair
Time: 2-3 days
```

#### Step 4: Mark as Repaired
```
POST /api/equipment/15/mark-as-repaired
{
  "condition": "good",
  "repair_notes": "Replaced faulty microswitch, tested 100 clicks successfully"
}

Result:
- Equipment status: issued → available
- Equipment condition: poor → good
- Activity Log: "Equipment Repaired"
- Equipment appears in available list
```

## Using the API

### Example with cURL
```bash
curl -X POST http://your-domain/api/equipment/15/mark-as-repaired \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "condition": "good",
    "repair_notes": "Replaced power button, tested and working"
  }'
```

### Example with JavaScript
```javascript
const markAsRepaired = async (equipmentId) => {
  try {
    const response = await fetch(`/api/equipment/${equipmentId}/mark-as-repaired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        condition: 'good',
        repair_notes: 'Replaced faulty component, tested and working'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Equipment marked as repaired:', data.data);
      alert('Equipment is now available!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Usage
markAsRepaired(15);
```

## Activity Log Entry

When equipment is marked as repaired, an activity log is created:

```
Action: Equipment Repaired
Description: Equipment repaired and made available: Logitech Mouse (SN: MOU-015) 
             - Condition: good | Notes: Replaced faulty power button
User: IT Manager
Date: November 14, 2025 at 3:00 PM
Changes:
  • Status: issued → available
  • Condition: poor → good
```

## Equipment Notes History

Repair notes are appended to the equipment's notes field:

```
Original Notes:
Purchased from TechStore on 2024-01-15

After Repair:
Purchased from TechStore on 2024-01-15

[Repaired on 2025-11-14] Replaced faulty power button, tested and working
```

## Quick Reference

### Equipment Status After Repair
| Return Condition | After Verification | After Repair |
|-----------------|-------------------|--------------|
| Damaged         | issued (withheld) | available ✓  |
| Has Defect      | issued (withheld) | available ✓  |
| Lost            | issued (withheld) | (manual)     |

### Condition Values
| Value     | Description | Use When |
|-----------|-------------|----------|
| excellent | Like new    | Major repair/refurbishment |
| good      | Working perfectly | Standard repair |
| fair      | Working but not perfect | Minor repair |

## Best Practices

### 1. Document Repairs
Always add repair notes explaining:
- What was wrong
- What was fixed
- Testing performed
- Parts replaced (if any)

### 2. Set Appropriate Condition
- **excellent** - Only if equipment is like new
- **good** - Most repairs should result in "good"
- **fair** - If repair was partial or equipment has minor issues

### 3. Test Before Marking Available
- Test the equipment thoroughly
- Verify the issue is resolved
- Ensure it's safe to use

### 4. Update Inventory Records
- Keep track of repair costs
- Update warranty information if applicable
- Note any parts replaced

## Troubleshooting

### Equipment Still Not Showing in Available List

**Check:**
1. Equipment status is `available`
2. Equipment condition is not `poor`
3. No active transactions for this equipment
4. Equipment is not assigned to an employee

**Solution:**
```sql
-- Check equipment status
SELECT id, name, serial_number, status, condition 
FROM equipment 
WHERE id = 15;

-- Verify no active transactions
SELECT * FROM transactions 
WHERE equipment_id = 15 
AND status IN ('released', 'returned');
```

### Cannot Mark as Repaired

**Possible Reasons:**
1. Equipment not found
2. Invalid condition value
3. Missing authentication
4. Equipment already available

**Check Response:**
```json
{
  "success": false,
  "message": "Error message here",
  "errors": { ... }
}
```

## Related Documentation
- [Equipment Status Flow](./EQUIPMENT_STATUS_FLOW.md)
- [Return Condition Feature](./RETURN_CONDITION_FEATURE.md)
- [Activity Logs](./RETURN_CONDITION_ACTIVITY_LOGS.md)
