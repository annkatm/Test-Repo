# Equipment Repair Workflow - Visual Guide

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  EQUIPMENT REPAIR WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. EQUIPMENT RETURNED AS DAMAGED
   ┌──────────────────────────────────────┐
   │ Employee: Mike Chen                  │
   │ Equipment: Logitech Mouse (MOU-015)  │
   │ Condition: ⚠ Damaged                 │
   │ Notes: Button not working            │
   └──────────────────────────────────────┘
                    ↓
   Equipment Status: issued (withheld)
   Equipment Condition: poor
                    ↓

2. ADMIN VERIFIES RETURN
   ┌──────────────────────────────────────┐
   │ Admin: IT Manager                    │
   │ Action: Verify Return                │
   │ Notes: Confirmed damage, send to IT  │
   └──────────────────────────────────────┘
                    ↓
   Equipment Status: issued (still withheld)
   Transaction Status: completed
                    ↓

3. REPAIR PROCESS
   ┌──────────────────────────────────────┐
   │ • Send to IT department              │
   │ • Diagnose issue                     │
   │ • Replace faulty component           │
   │ • Test equipment                     │
   │ • Document repair                    │
   └──────────────────────────────────────┘
                    ↓

4. MARK AS REPAIRED
   ┌──────────────────────────────────────┐
   │ POST /api/equipment/15/mark-as-repaired │
   │ {                                    │
   │   "condition": "good",               │
   │   "repair_notes": "Replaced button"  │
   │ }                                    │
   └──────────────────────────────────────┘
                    ↓
   Equipment Status: available ✓
   Equipment Condition: good
                    ↓

5. EQUIPMENT AVAILABLE FOR NEW REQUESTS
   ┌──────────────────────────────────────┐
   │ ✓ Appears in available equipment     │
   │ ✓ Can be requested by employees      │
   │ ✓ Repair logged in activity logs     │
   │ ✓ Repair notes added to equipment    │
   └──────────────────────────────────────┘
```

## Two Methods to Make Equipment Available

### Method 1: API Call (Recommended)

```javascript
// Mark equipment as repaired
POST /api/equipment/{id}/mark-as-repaired

// Request
{
  "condition": "good",
  "repair_notes": "Replaced faulty microswitch, tested successfully"
}

// Response
{
  "success": true,
  "message": "Equipment marked as repaired and is now available"
}
```

**Benefits:**
- ✓ Logs repair activity
- ✓ Adds repair notes to equipment history
- ✓ Automatic status update
- ✓ Audit trail

### Method 2: Manual Update

```
Equipment Management Page
    ↓
Find Equipment
    ↓
Click "Edit"
    ↓
Update Fields:
  • Status: available
  • Condition: good
  • Notes: Add repair info
    ↓
Click "Save"
```

**Benefits:**
- ✓ Simple and direct
- ✓ No API knowledge needed
- ✓ Visual interface

## Step-by-Step: Using the API

### Step 1: Get Equipment ID
```
Find the equipment in the system
Equipment ID: 15
Serial Number: MOU-015
```

### Step 2: Prepare Repair Information
```
Condition after repair: good
Repair notes: Replaced faulty microswitch, tested 100 clicks
```

### Step 3: Make API Call
```bash
curl -X POST http://your-domain/api/equipment/15/mark-as-repaired \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "good",
    "repair_notes": "Replaced faulty microswitch, tested 100 clicks"
  }'
```

### Step 4: Verify Success
```json
{
  "success": true,
  "data": {
    "id": 15,
    "status": "available",
    "condition": "good"
  }
}
```

### Step 5: Check Equipment List
```
Equipment now appears in:
- Available Equipment list
- Can be requested by employees
- Shows condition: good
```

## Condition Selection Guide

```
┌─────────────────────────────────────────────────────────────┐
│ CONDITION AFTER REPAIR                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ EXCELLENT                                                   │
│ • Equipment is like new                                     │
│ • Major refurbishment performed                             │
│ • All components replaced/upgraded                          │
│ • Example: Complete rebuild, new parts                      │
│                                                             │
│ GOOD (Most Common)                                          │
│ • Equipment working perfectly                               │
│ • Standard repair completed                                 │
│ • Issue fully resolved                                      │
│ • Example: Replaced button, fixed cable                     │
│                                                             │
│ FAIR                                                        │
│ • Equipment functional but not perfect                      │
│ • Minor issues remain                                       │
│ • Partial repair                                            │
│ • Example: Cosmetic damage remains                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Activity Log Timeline

```
Timeline for Equipment MOU-015:

Nov 14, 10:00 AM
📦 Equipment Returned
   Mike Chen returned Logitech Mouse - Condition: Damaged
   Notes: Left click button not working

Nov 14, 10:05 AM
✅ Return Verified
   IT Manager verified return - Condition: Damaged
   Admin Notes: Confirmed damage, send to IT

Nov 14, 3:00 PM
🔧 Equipment Repaired
   IT Manager marked equipment as repaired
   Condition: good
   Notes: Replaced faulty microswitch, tested 100 clicks
   Status: issued → available

Nov 15, 9:00 AM
📦 Equipment Requested
   Sarah Johnson requested Logitech Mouse
   Equipment back in circulation
```

## Quick Commands

### Check Equipment Status
```bash
GET /api/equipment/15
```

### Mark as Repaired
```bash
POST /api/equipment/15/mark-as-repaired
{
  "condition": "good",
  "repair_notes": "Your repair notes here"
}
```

### View Activity Logs
```bash
GET /api/activity-logs?search=MOU-015
```

## Common Scenarios

### Scenario 1: Simple Repair
```
Issue: Broken cable
Repair: Replace cable
Time: 1 hour
Condition: good
Notes: "Replaced USB cable, tested connectivity"
```

### Scenario 2: Component Replacement
```
Issue: Faulty button
Repair: Replace microswitch
Time: 2 hours
Condition: good
Notes: "Replaced left click microswitch, tested 100 clicks"
```

### Scenario 3: Major Refurbishment
```
Issue: Multiple problems
Repair: Complete overhaul
Time: 1 day
Condition: excellent
Notes: "Replaced all switches, cleaned, new cable, tested thoroughly"
```

## Checklist Before Marking as Repaired

- [ ] Issue identified and documented
- [ ] Repair completed
- [ ] Equipment tested thoroughly
- [ ] Repair notes prepared
- [ ] Appropriate condition selected
- [ ] Equipment cleaned (if needed)
- [ ] Ready for use

## Summary

**To make damaged equipment available:**

1. **Repair the equipment**
2. **Call the API:**
   ```
   POST /api/equipment/{id}/mark-as-repaired
   ```
3. **Provide:**
   - Condition (good/excellent/fair)
   - Repair notes
4. **Equipment becomes available** ✓

**Result:**
- Equipment status: available
- Appears in equipment list
- Can be requested
- Repair logged
- History updated
