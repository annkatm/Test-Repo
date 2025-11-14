# Admin Guide: Verifying Equipment Returns

## Overview
When employees return equipment, they specify the condition of each item. As an admin, you can now see exactly what condition the employee reported before verifying and completing the return.

## Step-by-Step Process

### 1. Navigate to Verify Returns
- Go to **View Approved** page
- Click on the **Verify Returns** tab
- You'll see a list of employees who have returned equipment

### 2. View Return Details
- Click the **"View"** button next to an employee's name
- The **Verify Return Modal** will open

### 3. Review Employee Information
The modal displays:
- Employee name and avatar
- Position
- All items being returned

### 4. Check Item Conditions
For each returned item, you'll see:

#### Item Details
- **Equipment Name** (e.g., "ASUS Monitor")
- **Serial Number** (e.g., "EQ-002")
- **Specifications** (e.g., "24" IPS, 144Hz, 1080p HDMI/DP")

#### Condition Reported by Employee
The condition is displayed with a color-coded badge:

- **✓ Good Condition** (Green Badge)
  - Equipment is working perfectly
  - No issues reported
  - Will be marked as available after verification

- **⚠ Damaged** (Red Badge)
  - Equipment requires repair
  - Significant issues reported
  - Will be withheld for inspection/repair

- **⚡ Has Defect** (Yellow Badge)
  - Equipment has minor issues
  - May need attention
  - Will be withheld for inspection

- **Not Specified** (Gray Badge)
  - Legacy data without condition
  - Rare occurrence for old returns

#### Employee Notes
If the employee added any notes about the equipment condition, they will be displayed below the condition badge.

Example:
```
Notes: Screen has a small scratch on the bottom right corner, 
but display is working perfectly.
```

### 5. Add Verification Notes (Optional)
As an admin, you can add your own observations:
- Click in the "Admin Verification Notes" text area
- Add any comments about your inspection
- Maximum 500 characters

Example verification notes:
- "Inspected item - confirmed good condition"
- "Minor scratch noted, but functional"
- "Sent to IT for repair"

### 6. Complete the Return
- Review all items and their conditions
- Click **"Verify & Complete Return"**
- The system will:
  - Mark the transaction as completed
  - Update equipment status based on condition:
    - Good Condition → Available for new requests
    - Damaged → Marked as damaged, withheld
    - Has Defect → Marked with defects, withheld
  - Remove the item from your verify returns list
  - Send notifications (if configured)

### 7. Success Confirmation
You'll see a success message:
```
Return confirmed! [Employee Name] has returned [X] item(s).
All transactions completed.
Equipment is now available for new requests.
```

## Visual Example

```
┌─────────────────────────────────────────────────────────┐
│  Verify Return                                      ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👤 John Doe                                            │
│     Returning Equipment                                 │
│                                                         │
│  Items to Return                                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📦 ASUS                                           │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Serial: EQ-002                                    │ │
│  │ Specs: 24" IPS, 144Hz, 1080p HDMI/DP             │ │
│  │                                                   │ │
│  │ Condition Reported by Employee                    │ │
│  │ ✓ Good Condition                                  │ │
│  │   (Green badge)                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📦 ASUS                                           │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Serial: EQ-003                                    │ │
│  │ Specs: 24" IPS, 144Hz, 1080p HDMI/DP             │ │
│  │                                                   │ │
│  │ Condition Reported by Employee                    │ │
│  │ ⚠ Damaged                                         │ │
│  │   (Red badge)                                     │ │
│  │                                                   │ │
│  │ Notes: Power button is stuck                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Admin Verification Notes (Optional)                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Confirmed damage. Sent to IT for repair.         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                    [Close]  [Verify & Complete Return] │
└─────────────────────────────────────────────────────────┘
```

## Benefits

### For Admins
- **Clear visibility** into equipment condition before verification
- **Accountability** - employees report condition at return time
- **Better inventory management** - automatic status updates
- **Audit trail** - complete history of condition reports

### For the Organization
- **Reduced disputes** - clear record of condition at return
- **Faster processing** - admins can quickly assess returns
- **Maintenance planning** - easy identification of damaged items
- **Transparency** - both parties document equipment state

## Troubleshooting

### "Not Specified" appears for all items
- This may be legacy data from before the feature was implemented
- New returns will always have a condition specified
- You can still complete the verification

### Condition doesn't match actual state
- Add your observations in the verification notes
- The system records both employee and admin notes
- Consider discussing with the employee if there's a significant discrepancy

### Need to change the condition
- The employee-reported condition is read-only in the verification modal
- Add your actual findings in the verification notes
- The equipment status will be updated based on the reported condition
- You can manually adjust equipment status later if needed

## Related Documentation
- [Return Condition Feature](./RETURN_CONDITION_FEATURE.md) - Complete feature documentation
- [Return Condition Fix](./RETURN_CONDITION_FIX.md) - Technical implementation details
