# 📤 CSV Contact Import Feature

## Overview

Added CSV import functionality to the Contacts page, allowing users to bulk upload contacts from a CSV file.

## ✅ What Was Implemented

### Backend (API)

**New Endpoint:** `POST /api/contacts/import`
- Accepts CSV file uploads via `multipart/form-data`
- Validates CSV format and phone numbers (E.164 format: `+1234567890`)
- Smart duplicate handling:
  - **Update** existing contacts (matched by phone number)
  - **Create** new contacts if phone doesn't exist
  - **Skip** invalid rows with detailed error messages
- Returns detailed import results:
  - Total rows processed
  - Created count
  - Updated count
  - Skipped count
  - Array of error messages for debugging

**CSV Parser:** Uses `papaparse` library
- Header normalization (converts to snake_case)
- Supports both `first_name`/`last_name` and `firstName`/`lastName` headers
- Skips empty lines automatically

### Frontend Integration

**Contacts Page Updates:**
1. **Import CSV Button** (green button with upload icon)
2. **Hidden file input** (triggered on button click)
3. **Loading state** ("Importing..." text while processing)
4. **Result modal** showing:
   - Created, updated, and skipped counts
   - First 5 errors (if any)
   - Success/info type based on results
5. **Auto-refresh** contacts list after import

**API Client:**
- Added `api.contacts.import(file: File)` method
- Handles `FormData` and authentication
- Returns structured results

## 📋 CSV Format

### Required Column
- `phone` - E.164 format (e.g., `+11234567890`)

### Optional Columns
- `first_name` or `firstName`
- `last_name` or `lastName`
- `email`

### Example CSV

```csv
first_name,last_name,phone,email
Tech,Toad,+11234567001,tech.toad1@example.com
John,Doe,+15555551234,john@example.com
Jane,Smith,+15555554321,jane@example.com
```

## 🧪 Test Data

**Location:** `/test-data/contacts-500.csv`

**Contents:**
- 500 dummy contact records
- All contacts named "Tech Toad"
- Sequential phone numbers: `+11234567001` to `+11234567500`
- Sequential emails: `tech.toad1@example.com` to `tech.toad500@example.com`

## 🚀 How to Use

### 1. Prepare Your CSV File

Create a CSV file with the required format:

```csv
first_name,last_name,phone,email
Alice,Johnson,+15551234567,alice@example.com
Bob,Williams,+15559876543,bob@example.com
```

**OR use the test data:**

```bash
# Test data is ready at:
/Users/lucas/Documents/GitHub/numba-blasta/test-data/contacts-500.csv
```

### 2. Import via UI

1. Navigate to **Contacts** page
2. Click **"Import CSV"** button (green, top right)
3. Select your CSV file
4. Wait for import to complete
5. Review the results modal:
   - ✅ Success: All contacts imported
   - ℹ️ Info: Some contacts skipped (check error details)
   - ❌ Error: Import failed completely

### 3. Verify Import

- Contacts list will automatically refresh
- Use **search** to find specific imported contacts
- Click **"Load More"** to see all 500 contacts (20 per page)

## 📊 Import Rules

### Duplicate Handling

**Duplicate Detection:** Contacts are matched by `phone` + `org_id`

**When duplicate found:**
- **Updates** existing contact with new data
- **Preserves** existing data if CSV field is empty
- **Counts** as "updated" in results

**When no duplicate:**
- **Creates** new contact
- **Counts** as "created" in results

### Validation

**Phone Number:**
- Must match regex: `^\+?[1-9]\d{1,14}$`
- Examples:
  - ✅ `+15551234567`
  - ✅ `15551234567`
  - ❌ `555-123-4567` (contains dashes)
  - ❌ `(555) 123-4567` (contains spaces/parens)

**Row Skipping:**
- Missing phone number
- Invalid phone format
- Database errors (logged in results)

## 🔧 Technical Details

### Files Created/Modified

**New Files:**
- `/app/api/contacts/import/route.ts` - Import API endpoint
- `/test-data/contacts-500.csv` - Test data (500 records)

**Modified Files:**
- `/app/(dashboard)/contacts/page.tsx` - Added import UI
- `/lib/api-client.ts` - Added `import()` method

### Dependencies Added

```bash
npm install papaparse @types/papaparse
```

### Performance

**Batch Processing:**
- Processes contacts sequentially (one at a time)
- Each contact is a separate database query
- **500 contacts ≈ 5-10 seconds** (depending on DB latency)

**Future Optimization:**
- Could use bulk `INSERT ... ON CONFLICT` for faster imports
- Current approach provides better error handling per row

## 🐛 Error Handling

### Common Errors

1. **"Unauthorized"**
   - User not logged in
   - Invalid JWT token
   - User not associated with organization

2. **"Invalid file type"**
   - File doesn't end with `.csv`
   - Solution: Save file as CSV format

3. **"CSV file is empty"**
   - No data rows after header
   - Solution: Ensure CSV has at least one data row

4. **"Row X: Missing phone number"**
   - Phone field is empty
   - Solution: Fill in phone numbers for all rows

5. **"Row X: Invalid phone format"**
   - Phone doesn't match E.164 format
   - Solution: Use format like `+15551234567`

### Debugging

Check the import results modal for:
- Row number of failed imports
- Specific error message per row
- Total skipped count

## 🎉 Summary

The CSV import feature is **fully functional** and ready to use! You can now:

✅ Import up to 500+ contacts at once  
✅ Update existing contacts automatically  
✅ See detailed import results  
✅ Handle errors gracefully  
✅ Test with provided dummy data  

**Try it now:** Upload `/test-data/contacts-500.csv` to import 500 "Tech Toad" contacts! 🐸

