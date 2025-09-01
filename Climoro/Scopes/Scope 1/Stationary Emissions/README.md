# Stationary Emissions - Company and Unit Management

## Overview
This implementation adds company and unit selection functionality to the Stationary Emissions scope, with role-based access control and data filtering.

## Features

### 1. Company and Unit Selection
- **Company Dropdown**: Select from available companies based on user role
- **Unit Dropdown**: Select from units belonging to the selected company
- **Auto-selection**: Non-admin users automatically get their assigned company/unit

### 2. Role-Based Access Control

#### Regular Users
- Can only see and create records for their assigned company and unit
- Company and unit fields are auto-filled and disabled
- Cannot change company or unit selection

#### Admin Users
- Can select any company from the dropdown
- Can select any unit from the selected company
- Can see all records across all companies
- Unit list updates based on company selection

#### System User
- Can select any company from the dropdown
- Can select any unit from the selected company
- Table records are filled with selected company/unit values in readonly mode
- Can see records filtered by selected company and unit

#### Super Admin (System Manager/Administrator)
- Can only access their own company
- Company is auto-selected and disabled
- Can select any unit within their company
- Can only see records from their company

### 3. Data Filtering
- Records are automatically filtered based on user role and company/unit selection
- Regular users see only their company/unit records
- Admin users see all records (no filtering)
- Super admin users see only their company records

## Implementation Details

### Frontend Changes
- Added company and unit selection dropdowns above the data table
- Updated table headers to include company and unit columns
- Added validation to ensure company/unit selection before data entry
- Real-time filtering of existing data based on selection

### Backend Changes
- Updated Stationary Emissions DocType to include company and unit fields
- Added role-based validation in Python class
- Implemented company/unit filtering in data queries
- Added helper functions for company and unit management

### Database Fields
- `company`: Link field to Company doctype (required)
- `unit`: Link field to Units doctype (required)

## Usage

### For Regular Users
1. Company and unit are automatically selected based on user profile
2. Fields are disabled and cannot be changed
3. User can immediately start adding emissions data

### For Admin Users
1. Select company from the dropdown
2. Select unit from the updated unit dropdown
3. Both selections are required before adding data
4. Can change selections to view different company/unit data

### For System Users
1. Select company from the dropdown
2. Select unit from the updated unit dropdown
3. Table records are automatically filled with selected company/unit values
4. Company and unit fields in data entry are readonly with selected values
5. Can change selections to view different company/unit data

### For Super Admin Users
1. Company is automatically selected and locked
2. Select unit from the available units in their company
3. Can only access their own company data

## Technical Notes

### JavaScript Functions
- `initializeCompanyUnitSelection()`: Sets up dropdowns based on user role
- `loadCompaniesForUser()`: Fetches available companies for current user
- `loadUnitsForCompany()`: Fetches units for selected company
- `validateCompanyUnitSelection()`: Ensures company/unit are selected before data entry
- `refreshExistingData()`: Reloads data with current company/unit filters

### Python Methods
- `validate_company_unit_permissions()`: Backend validation of company/unit access
- `set_company_unit_based_on_user()`: Auto-sets company/unit based on user role
- `get_user_company_filter()`: Returns company filter for list views
- `get_units_for_company()`: Returns units for a specific company
- `get_companies_for_user()`: Returns companies available for current user

## Security Features
- Role-based access control at both frontend and backend
- Company and unit validation before data creation
- Automatic filtering of data based on user permissions
- Prevention of unauthorized access to other companies/units

## Error Handling
- Validation messages for missing company/unit selection
- Graceful fallback for missing company/unit data
- User-friendly error messages for permission violations
- Automatic refresh of data when company/unit selection changes
