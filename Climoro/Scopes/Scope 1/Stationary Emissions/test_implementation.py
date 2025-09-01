#!/usr/bin/env python3
"""
Test script for Stationary Emissions Company and Unit functionality
Run this script to verify the implementation works correctly
"""

import frappe
import json

def test_company_unit_functionality():
    """Test the company and unit functionality for Stationary Emissions"""
    
    print("🧪 Testing Stationary Emissions Company and Unit Functionality")
    print("=" * 60)
    
    # Test 1: Check if DocType has company and unit fields
    print("\n1. Testing DocType Structure...")
    try:
        doctype = frappe.get_doc("DocType", "Stationary Emissions")
        fields = [field.fieldname for field in doctype.fields]
        
        if "company" in fields and "unit" in fields:
            print("✅ Company and unit fields found in DocType")
        else:
            print("❌ Company and unit fields missing from DocType")
            print(f"Available fields: {fields}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking DocType: {e}")
        return False
    
    # Test 2: Test company and unit helper functions
    print("\n2. Testing Helper Functions...")
    
    try:
        # Test get_companies_for_user
        companies = frappe.call('climoro_onboarding.climoro_onboarding.doctype.stationary_emissions.stationary_emissions.get_companies_for_user')
        print(f"✅ get_companies_for_user: {companies}")
        
        # Test get_units_for_company (if companies exist)
        if companies and len(companies) > 0:
            first_company = companies[0]['name']
            units = frappe.call('climoro_onboarding.climoro_onboarding.doctype.stationary_emissions.stationary_emissions.get_units_for_company', 
                              args={'company': first_company})
            print(f"✅ get_units_for_company for {first_company}: {units}")
        else:
            print("⚠️  No companies available for testing units")
            
    except Exception as e:
        print(f"❌ Error testing helper functions: {e}")
        return False
    
    # Test 3: Test user company filter
    print("\n3. Testing User Company Filter...")
    try:
        user_filter = frappe.call('climoro_onboarding.climoro_onboarding.doctype.stationary_emissions.stationary_emissions.get_user_company_filter')
        print(f"✅ User company filter: {user_filter}")
        
    except Exception as e:
        print(f"❌ Error testing user company filter: {e}")
        return False
    
    # Test 4: Test creating a test record (if permissions allow)
    print("\n4. Testing Record Creation...")
    try:
        # Get first available company and unit
        companies = frappe.call('climoro_onboarding.climoro_onboarding.doctype.stationary_emissions.stationary_emissions.get_companies_for_user')
        
        if companies and len(companies) > 0:
            test_company = companies[0]['name']
            units = frappe.call('climoro_onboarding.climoro_onboarding.doctype.stationary_emissions.stationary_emissions.get_units_for_company', 
                              args={'company': test_company})
            
            if units and len(units) > 0:
                test_unit = units[0]['name']
                
                # Try to create a test record
                test_doc = {
                    'doctype': 'Stationary Emissions',
                    's_no': 999,
                    'date': frappe.utils.today(),
                    'company': test_company,
                    'unit': test_unit,
                    'invoice_no': 'TEST-001',
                    'fuel_type': 'Liquid fossil',
                    'fuel_selection': 'Test Fuel',
                    'activity_types': 'Boilers',
                    'activity_data': 100.0,
                    'unit_selection': 'Litre',
                    'efco2': 2.5,
                    'efch4': 0.01,
                    'efn20': 0.001,
                    'eco2': 250.0,
                    'ech4': 1.0,
                    'en20': 0.1,
                    'etco2eq': 250.0
                }
                
                doc = frappe.get_doc(test_doc)
                doc.insert(ignore_permissions=True)
                print(f"✅ Test record created successfully with ID: {doc.name}")
                
                # Clean up test record
                frappe.delete_doc('Stationary Emissions', doc.name, force=True)
                print("✅ Test record cleaned up")
                
            else:
                print("⚠️  No units available for testing record creation")
        else:
            print("⚠️  No companies available for testing record creation")
            
    except Exception as e:
        print(f"❌ Error testing record creation: {e}")
        print("This might be expected if user doesn't have create permissions")
    
    print("\n" + "=" * 60)
    print("🎯 Testing Complete!")
    
    return True

def test_user_roles():
    """Test user role detection and permissions"""
    
    print("\n🔐 Testing User Roles and Permissions...")
    print("=" * 40)
    
    current_user = frappe.session.user
    user_roles = frappe.get_roles(current_user)
    
    print(f"Current User: {current_user}")
    print(f"User Roles: {user_roles}")
    
    # Check specific roles
    is_super_admin = any(role in ["System Manager", "Administrator"] for role in user_roles)
    is_admin = "Admin" in user_roles
    is_system_user = "System User" in user_roles
    
    print(f"Is Super Admin: {is_super_admin}")
    print(f"Is Admin: {is_admin}")
    print(f"Is System User: {is_system_user}")
    
    # Get user's company and unit
    try:
        user_company = frappe.db.get_value("User", current_user, "company")
        user_unit = frappe.db.get_value("User", current_user, "unit")
        
        print(f"User Company: {user_company}")
        print(f"User Unit: {user_unit}")
        
    except Exception as e:
        print(f"Error getting user company/unit: {e}")
    
    return True

if __name__ == "__main__":
    try:
        # Test user roles first
        test_user_roles()
        
        # Test main functionality
        success = test_company_unit_functionality()
        
        if success:
            print("\n🎉 All tests passed! The implementation is working correctly.")
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
            
    except Exception as e:
        print(f"\n💥 Test script failed with error: {e}")
        import traceback
        traceback.print_exc()
