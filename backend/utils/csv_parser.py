# backend/utils/csv_parser.py
import csv

def parse_csv(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = [row for row in reader]
    return records
