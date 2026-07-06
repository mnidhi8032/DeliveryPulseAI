# Carry Forward Previous Metric Inputs

## Overview
The "Carry Forward Previous Metric Inputs" feature automatically pre-populates data entry forms with values from the most recent completed reporting cycle, reducing repetitive manual data entry for Project Managers.

## Implementation

### Location
**File:** `frontend/src/pages/pm/QPMDataEntryPage.tsx`

### How It Works

1. **When a metric is selected**, the `loadMetricData()` function:
   - Computes the current reporting period based on frequency (Weekly, Monthly, Quarterly, etc.)
   - Fetches all previous measure entries for that metric
   - Checks if the current period already has data

2. **If the current period is empty**:
   - Groups all past entries by period (frequency_name), keeping only the most recent entry per measure per period
   - Identifies the most recently updated period (excluding the current one)
   - Pre-fills all input fields with values from that previous period
   - Shows a blue informational banner: "Previous reporting values loaded from [Period Name]"

3. **If the current period already has data**:
   - No carry-forward occurs (existing data takes precedence)
   - Form loads empty, allowing modification of existing entries

4. **PM workflow**:
   - Form opens with previous values already filled
   - PM reviews pre-filled values
   - PM updates only the fields that changed
   - PM submits (which saves to the NEW period, never overwrites history)

### Key Features

✅ **Project-isolated**: Values only carry forward within the same project  
✅ **Metric-isolated**: Each metric carries its own previous values  
✅ **Frequency-isolated**: Weekly → Weekly, Monthly → Monthly (never cross-frequency)  
✅ **Field-isolated**: Each input field (Delivered Size, Effort, Defects, etc.) remembers its own value  
✅ **Most recent only**: Always uses the latest completed submission, never drafts  
✅ **Non-destructive**: Previous periods remain untouched; new submission creates a NEW record  
✅ **Fully editable**: Pre-filled values behave exactly like normal inputs  

### UI Indicator

When previous values are loaded, a blue banner appears above the input fields:

```
✓ Previous reporting values loaded
Values carried forward from January 2026. Review and update any changed values before submitting.
```

### Example Flow

**Week 1 - Initial Entry:**
```
Metric: Productivity
Inputs:
  Delivered Size: 120
  Effort: 30
Submit → KPI computed and saved
```

**Week 2 - Automatic Carry Forward:**
```
PM opens Productivity metric
Form automatically displays:
  Delivered Size: 120  (pre-filled)
  Effort: 30           (pre-filled)
Banner: "Previous reporting values loaded from Week of 20 Jan 2025"

PM edits only what changed:
  Delivered Size: 140  (edited)
  Effort: 30           (unchanged)
Submit → New KPI record created for Week 2
```

**Week 3 - Uses Week 2 values:**
```
Form displays:
  Delivered Size: 140  (from Week 2)
  Effort: 30           (from Week 2)
```

### Technical Details

**Algorithm:**
1. Fetch all `KpiMeasureEntry` records for the selected metric via `getMeasureEntries(metric_id, frequency_name)`
2. Check if current period (`computed_period.frequency_name`) already has entries (case-insensitive match)
3. If current period is empty:
   - Group entries by `frequency_name` (lowercase key for grouping)
   - For each period, keep only the latest entry per measure (by `updated_at`)
   - Find the period with the most recent `updated_at` timestamp
   - Extract `actual_value` from each measure in that period
   - Pre-fill `measureValues` state with those values
   - Set `carriedForwardFrom` to the display name of that period
4. If current period has data, skip carry-forward entirely

**State Management:**
- `measureValues`: Record<string, string> — holds all input field values
- `carriedForwardFrom`: string | null — tracks the source period for the indicator banner

**Edge Cases Handled:**
- No previous data → form loads empty (normal behavior)
- Multiple measures → each field carries its own value independently
- Period name casing → grouping is case-insensitive, display preserves original casing
- Missing measures → only carries forward values that exist
- Failed API call → gracefully falls back to empty form

### Benefits

1. **Reduced PM workload**: No need to re-enter unchanged values every cycle
2. **Fewer data entry errors**: Copy-paste mistakes eliminated
3. **Faster submissions**: Review and update is faster than full re-entry
4. **Transparency**: Blue banner clearly shows that values were auto-filled
5. **Full control**: PM can still edit everything; nothing is locked or hidden

### Limitations

- Only carries forward from the **most recent completed period** (not the most recent for each measure independently)
- Does not carry forward across different frequencies (Monthly data won't pre-fill Weekly forms)
- Does not carry forward from other projects or metrics
- If the previous period is incomplete (some measures missing), only available measures are carried forward

### Testing Scenarios

1. **First-time entry** (no prior data):
   - ✅ Form should load empty
   - ✅ No blue banner should appear

2. **Second cycle entry** (previous cycle exists):
   - ✅ Form should pre-fill with previous values
   - ✅ Blue banner should show with the previous period name
   - ✅ PM can edit any field
   - ✅ Submit creates a NEW record (previous record unchanged)

3. **Third cycle entry** (two previous cycles exist):
   - ✅ Form should pre-fill with values from the SECOND cycle (most recent)
   - ✅ NOT from the first cycle

4. **Editing existing period** (current period already has data):
   - ✅ No carry-forward should occur
   - ✅ Form loads empty (allow modification flow)
   - ✅ Yellow "Modifying existing period" warning appears instead

5. **Multiple measures** (e.g., Delivered Size, Effort, Defects):
   - ✅ Each field should independently carry its own previous value
   - ✅ If previous period had 3 measures, all 3 should be pre-filled

6. **Different frequencies** (same metric, different frequency):
   - ✅ Monthly form should NOT carry forward Weekly data
   - ✅ Each frequency should only see its own prior submissions

### Maintenance Notes

- The carry-forward logic is entirely in `loadMetricData()` callback
- To disable carry-forward, remove the "CARRY FORWARD" block (lines ~155-214)
- To change the period selection logic (e.g., use second-most-recent instead), modify the `mostRecentTime` sorting
- The feature does NOT require any backend changes
- All data fetching uses existing `getMeasureEntries()` API

### Related Files

- `frontend/src/pages/pm/QPMDataEntryPage.tsx` — main implementation
- `frontend/src/services/qpmService.ts` — `getMeasureEntries()` API call
- `backend/app/api/v1/qpm.py` — backend endpoint (unchanged)
- `backend/app/services/qpm_service.py` — data retrieval logic (unchanged)
