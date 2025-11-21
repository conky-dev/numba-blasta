#!/usr/bin/env python3
"""
Generate 20k dummy contacts for testing
Creates a CSV file that can be imported into the SMS system
"""

import csv
import random
from faker import Faker

# Initialize Faker
fake = Faker()

# Configuration
NUM_CONTACTS = 20000
OUTPUT_FILE = 'dummy_contacts_20k.csv'

# Sample categories to randomly assign
CATEGORIES = [
    'Beast Picks',
    'Picksy',
    'Hot Leads',
    'Cold Leads',
    'VIP',
    'Newsletter',
    'Prospects',
    'Customers',
    'Trial Users',
    'Premium Members'
]

def generate_phone():
    """Generate a random US phone number in E.164 format"""
    area_code = random.randint(200, 999)
    exchange = random.randint(200, 999)
    number = random.randint(1000, 9999)
    return f"+1{area_code}{exchange}{number}"

def generate_contact():
    """Generate a single contact with random data"""
    return {
        'first_name': fake.first_name(),
        'last_name': fake.last_name(),
        'phone': generate_phone(),
        'email': fake.email(),
        'category': random.choice(CATEGORIES)  # Single category per contact
    }

def main():
    print(f"Generating {NUM_CONTACTS:,} dummy contacts...")
    
    contacts = []
    
    # Generate contacts
    for i in range(NUM_CONTACTS):
        if (i + 1) % 1000 == 0:
            print(f"Generated {i + 1:,} contacts...")
        contacts.append(generate_contact())
    
    # Write to CSV
    print(f"\nWriting to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['first_name', 'last_name', 'phone', 'email', 'category']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(contacts)
    
    print(f"✅ Successfully generated {NUM_CONTACTS:,} contacts!")
    print(f"📄 File saved as: {OUTPUT_FILE}")
    print(f"\nCategory distribution:")
    
    # Show distribution
    category_counts = {}
    for contact in contacts:
        cat = contact['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count:,} ({count/NUM_CONTACTS*100:.1f}%)")

if __name__ == '__main__':
    main()

