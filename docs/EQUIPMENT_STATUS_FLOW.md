# Equipment Status Flow - Return Condition Feature

## Overview
This document explains how equipment status changes based on the return condition reported by employees and verified by admins.

## Status Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EQUIPMENT LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

1. AVAILABLE
   │
   ├─→ Employee requests equipment
   │
2. ISSUED (Released to Employee)
   │
   ├─→ Employee returns equipment with condition
   │
3. ISSUED (Awaiting Admin Verification)
   │
   ├─→ Admin verifies return
   │
   ├─────────────────┬─────────────────┬─────────────────┐
   │                 │                 │                 │
   v                 v                 v                 v
GOOD CONDITION   DAMAGED         HAS DEFECT          LOST
   │                 │                 │                 │
   v                 v                 v                 v
AVAILABLE        ISSUED           ISSUED           ISSUED
(Ready for      (Withheld for    (Withheld for    (Withheld)
new requests)    repair)          inspection)
```

## Detailed Status Changes

### Step 1: Employee Returns Equipment

**Action:** Employee clicks "Return" and selects condition

**Equipment Status:** `issued` (unchanged, awaiting verification)

**Transaction Status:** `released` → `returned`

**Why?** Equipment remains "issued" to prevent it from being requested again before admin verification.

### Step 2: Admin Verifies Return

**Action:** Admin reviews condition and clicks "Verify & Complete Return"

**Equipment Status Changes Based on Condition:**

#### ✓ Good Condition
```
Equipment Status: issued → available
Equipment Condition: (any) → good
Result: Equipment is ready for new requests
```

#### ⚠ Damaged
```
Equipment Status: issued → issued (remains withheld)
Equipment Condition: (any) → poor
Result: Equipment withheld for repair
```

#### ⚡ Has Defect
```
Equipment Status: issued → issued (remains withheld)
Equipment Condition: (any) → fair
Result: Equipment withheld for inspection
```

#### ❌ Lost
```
Equipment Status: issued → issued (remains withheld)
Equipment Condition: (any) → poor
Result: Equipment marked as lost
```

## Code Implementation

### In `returnTransaction()` Method

```php
// Equipment status remains 'issued' until admin verifies
DB::table('equipment')
    ->where('id', $transaction->equipment_id)
    ->update([
        'status' => 'issued', // Keep as issued until verified
        'updated_at' => now()
    ]);
```

### In `verifyReturn()` Method

```php
// Update equipment status based on return condition
$equipmentStatus = 'available';
$equipmentCondition = 'good';

$rc = $transaction->return_condition;
if ($rc === 'damaged') {
    $equipmentStatus = 'issued'; // remain withheld
    $equipmentCondition = 'poor';
} elseif ($rc === 'has_defect') {
    $equipmentStatus = 'issued'; // remain withheld
    $equipmentCondition = 'fair';
} elseif ($rc === 'lost') {
    $equipmentStatus = 'issued'; // remain withheld
    $equipmentCondition = 'poor';
} elseif ($rc === 'good_condition') {
    $equipmentStatus = 'available'; // ✓ Available for new requests
    $equipmentCondition = 'good';
}

DB::table('equipment')
    ->where('id', $transaction->equipment_id)
    ->update([
        'status' => $equipmentStatus,
        'condition' => $equipmentCondition,
        'updated_at' => now()
    ]);
```

## Equipment Status Values

### Available
- Equipment is ready to be requested
- Can appear in employee equipment request lists
- Condition: Usually "good"

### Issued
- Equipment is currently with an employee OR
- Equipment is returned but awaiting verification OR
- Equipment is withheld (damaged/defect/lost)
- Cannot be requested by other employees

## Equipment Condition Values

### Good
- Equipment is in excellent working condition
- No issues reported
- Ready for immediate use

### Fair
- Equipment has minor defects
- May need attention
- Functional but not perfect

### Poor
- Equipment is damaged or lost
- Requires repair or replacement
- Not suitable for use

## Benefits of This Flow

### 1. Prevents Double Booking
Equipment remains "issued" until admin verifies, preventing it from being requested while awaiting verification.

### 2. Accurate Inventory
Only equipment in good condition becomes available automatically.

### 3. Maintenance Tracking
Damaged or defective equipment is automatically withheld for repair.

### 4. Clear Status
Admins can easily see which equipment needs attention.

## Example Scenarios

### Scenario 1: Perfect Return
```
1. Employee returns laptop - Condition: Good
2. Equipment Status: issued (awaiting verification)
3. Admin verifies
4. Equipment Status: available ✓
5. Equipment Condition: good
6. Result: Laptop appears in available equipment list
```

### Scenario 2: Damaged Return
```
1. Employee returns mouse - Condition: Damaged
2. Equipment Status: issued (awaiting verification)
3. Admin verifies
4. Equipment Status: issued (withheld)
5. Equipment Condition: poor
6. Result: Mouse does NOT appear in available list
7. Admin sends to IT for repair
```

### Scenario 3: Minor Defect
```
1. Employee returns monitor - Condition: Has Defect
2. Equipment Status: issued (awaiting verification)
3. Admin verifies
4. Equipment Status: issued (withheld)
5. Equipment Condition: fair
6. Result: Monitor withheld for inspection
7. Admin checks cables and settings
```

## Summary

**Good Condition = Available** ✓
- Equipment status: `available`
- Equipment condition: `good`
- Appears in available equipment list
- Ready for new requests

**Any Other Condition = Withheld**
- Equipment status: `issued` (withheld)
- Equipment condition: `poor` or `fair`
- Does NOT appear in available list
- Requires admin action (repair/inspection)
