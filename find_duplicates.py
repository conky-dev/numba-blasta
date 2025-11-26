#!/usr/bin/env python3
"""
Find and count duplicate phone numbers in numbas.txt
"""

from collections import Counter

# Read the file
with open('numbas.txt', 'r') as f:
    numbers = [line.strip() for line in f if line.strip()]

# Count occurrences
counter = Counter(numbers)

# Find duplicates (numbers that appear more than once)
duplicates = {num: count for num, count in counter.items() if count > 1}

if duplicates:
    print(f"Found {len(duplicates)} duplicate number(s):\n")
    
    # Sort by count (most duplicates first)
    sorted_duplicates = sorted(duplicates.items(), key=lambda x: x[1], reverse=True)
    
    for number, count in sorted_duplicates:
        print(f"{number}: {count} times")
    
    print(f"\nTotal duplicate entries: {sum(count - 1 for count in duplicates.values())}")
else:
    print("No duplicates found!")

print(f"\nTotal numbers in file: {len(numbers)}")
print(f"Unique numbers: {len(counter)}")

