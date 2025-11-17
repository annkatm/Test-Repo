# Edit Equipment Status and Condition

## Overview
You can now edit equipment status and condition directly from the Equipment page. This makes it easy to mark repaired equipment as available.

## How to Use

### Step 1: Navigate to Equipment Page
- Click on "Equipment" in the sidebar
- Find the equipment you want to edit

### Step 2: Expand Equipment Group
- Click on the equipment name to expand and see individual items
- You'll see a list with Serial Number, Status, Condition, etc.

### Step 3: Click Edit Button
- Click the blue pencil icon (Edit button) next to the equipment
- The Edit Equipment modal will open

### Step 4: Update Fields
The modal shows:
- **Serial Number** - Change if needed
- **Condition** - Select from:
  - Excellent (like new) → Status: Available
  - Good (working perfectly) → Status: Available
  - Fair (has minor issues) → Status: Issued (withheld)
  - Poor (needs repair) → Status: Issued (withheld)

**Note:** Status is automatically set based on condition:
- Good or Excellent = Available ✓
- Fair or Poor = Issued (withheld) ⚠

### Step 5: Save Changes
- Click "Save Changes"
- Equipment is updated immediately
- Success message appears

## Example: Marking Repaired Equipment as Available

### Before Repair:
```
Serial: MOU-015
Status: Issued (withheld)
Condition: Poor
```

### After Repair - Edit Equipment:
1. Click Edit button
2. Change Condition to: **Good**
3. Click "Save Changes"
4. Status automatically changes to **Available**

### Result:
```
Serial: MOU-015
Status: Available ✓
Condition: Good ✓
```

Equipment now appears in available list!

## Visual Guide

```
Equipment List:
┌─────────────────────────────────────────────────────────────┐
│ Serial    │ Status  │ Condition │ Date Added │ Actions      │
├─────────────────────────────────────────────────────────────┤
│ MOU-015   │ Issued  │ Poor      │ 2025-01-10 │ [Edit] [Del] │
└─────────────────────────────────────────────────────────────┘
                                                    ↓ Click Edit

Edit Equipment Modal:
┌─────────────────────────────────────────────────────────────┐
│ 🔧 Edit Equipment                                      ✕    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Logitech Mouse                                              │
│ Current Serial: MOU-015                                     │
│                                                             │
│ Serial Number                                               │
│ [MOU-015                                          ]         │
│                                                             │
│ Status                                                      │
│ [Available ▼]  ← Change from "Issued" to "Available"       │
│                                                             │
│ Condition                                                   │
│ [Good ▼]       ← Change from "Poor" to "Good"              │
│                                                             │
│                              [Cancel] [Save Changes]        │
└─────────────────────────────────────────────────────────────┘
```

## Status Options

### Available
- Equipment is ready to be requested
- Shows in available equipment list
- Can be assigned to employees

### Issued
- Equipment is with someone OR withheld
- Does NOT show in available list
- Use for damaged equipment awaiting repair

### Borrowed
- Equipment is borrowed by someone
- Temporary status
- Does NOT show in available list

## Condition Options

### Excellent
- Like new condition
- Perfect working order
- No wear or damage

### Good
- Working perfectly
- Normal wear
- No issues

### Fair
- Working but not perfect
- Minor issues
- May need attention

### Poor
- Damaged or not working properly
- Needs repair
- Should not be issued until fixed

## Quick Actions

### Make Damaged Equipment Available
1. Find equipment with Status: Issued, Condition: Poor
2. Click Edit
3. Change Status → Available
4. Change Condition → Good
5. Save

### Withhold Equipment for Repair
1. Find equipment that needs repair
2. Click Edit
3. Change Status → Issued
4. Change Condition → Poor or Fair
5. Save

### Mark as Excellent After Refurbishment
1. Find repaired equipment
2. Click Edit
3. Change Status → Available
4. Change Condition → Excellent
5. Save

## Tips

- **Always update both status and condition** for accuracy
- **Available + Good** = Ready for use
- **Issued + Poor** = Needs repair
- **Available + Poor** = Should be avoided (fix first!)
- Changes are immediate and logged

## Related Documentation
- [Equipment Status Flow](./EQUIPMENT_STATUS_FLOW.md)
- [Repair Workflow Guide](./REPAIR_WORKFLOW_GUIDE.md)
- [Repair Damaged Equipment](./REPAIR_DAMAGED_EQUIPMENT.md)
