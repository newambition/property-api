import os
import sys
import requests
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
import pgeocode

# Add project root to path to allow imports from other directories
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.config import settings
from db.base import Base # This imports PricePaid & EpcData models indirectly
from models.price_paid import PricePaid
from models.epc import EpcData


def load_epc_data(db_session, epc_csv_path='certificates.csv'):
    """Loads EPC data from the specified CSV into the database."""
    if not os.path.exists(epc_csv_path):
        print(f"EPC file not found at '{epc_csv_path}'. Skipping EPC data load.")
        return

    print("Starting EPC data processing...")
    
    # Define the columns we want to keep from the massive EPC csv
    epc_columns_to_keep = [
        'LMK_KEY', 'ADDRESS', 'POSTCODE', 'UPRN', 'LODGEMENT_DATE', 'CURRENT_ENERGY_RATING',
        'POTENTIAL_ENERGY_RATING', 'TOTAL_FLOOR_AREA', 'PROPERTY_TYPE', 'BUILT_FORM'
    ]
    
    chunk_size = 50000
    
    processed_lmk_keys = set(row[0] for row in db_session.query(EpcData.lmk_key).all())
    print(f"Found {len(processed_lmk_keys)} existing EPC records to skip.")

    for chunk in pd.read_csv(epc_csv_path, chunksize=chunk_size, usecols=epc_columns_to_keep, on_bad_lines='skip', low_memory=False):
        # Clean and prepare data
        chunk.rename(columns=lambda c: c.lower().replace('-', '_'), inplace=True)
        chunk = chunk[~chunk['lmk_key'].isin(processed_lmk_keys)]
        
        if chunk.empty:
            continue
            
        chunk['lodgement_date'] = pd.to_datetime(chunk['lodgement_date']).dt.date
        chunk['uprn'] = chunk['uprn'].astype(str).str.replace('.0', '', regex=False)
        chunk['total_floor_area'] = pd.to_numeric(chunk['total_floor_area'], errors='coerce')
        chunk['postcode'] = chunk['postcode'].str.replace(' ', '').str.upper()

        records_to_insert = chunk.to_dict(orient='records')

        if records_to_insert:
            try:
                db_session.bulk_insert_mappings(EpcData, records_to_insert)
                db_session.commit()
                print(f"  > Successfully inserted {len(records_to_insert)} EPC records.")
            except Exception as e:
                print(f"  > Error inserting EPC chunk: {e}")
                db_session.rollback()

    print("EPC data loading process complete.")


def load_price_paid_data(db_session):
    """Loads Price Paid data for the BCP area into the database."""
    DATA_URL = "http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-complete.csv"
    CSV_PATH = "pp-complete.csv"
    COLUMN_NAMES = [
        'transaction_id', 'price', 'date_of_transfer', 'postcode', 'property_type',
        'new_build_flag', 'tenure_type', 'paon', 'saon', 'street', 'locality',
        'town_city', 'district', 'county', 'ppd_category_type', 'record_status'
    ]

    if not os.path.exists(CSV_PATH):
        print(f"Downloading Price Paid data from {DATA_URL}...")
        with requests.get(DATA_URL, stream=True) as r:
            r.raise_for_status()
            with open(CSV_PATH, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192): f.write(chunk)
        print("Download complete.")
    else:
        print("Price Paid CSV file already exists. Skipping download.")
        
    print("Starting BCP Price Paid data processing...")
    geo = pgeocode.Nominatim('gb')
    chunk_size = 50000

    processed_transactions = set(row[0] for row in db_session.query(PricePaid.transaction_id).all())
    print(f"Found {len(processed_transactions)} existing Price Paid records to skip.")

    for chunk_num, chunk in enumerate(pd.read_csv(CSV_PATH, header=None, names=COLUMN_NAMES, chunksize=chunk_size, on_bad_lines='skip')):
        print(f"Processing Price Paid master file chunk {chunk_num + 1}...")
        
        chunk.dropna(subset=['postcode'], inplace=True)
        bcp_chunk = chunk[chunk['postcode'].str.startswith('BH', na=False)].copy()
        
        if bcp_chunk.empty: continue
        bcp_chunk = bcp_chunk[~bcp_chunk['transaction_id'].isin(processed_transactions)]
        if bcp_chunk.empty: continue
            
        print(f"  > Found {len(bcp_chunk)} BCP properties to process.")
        
        bcp_chunk['date_of_transfer'] = pd.to_datetime(bcp_chunk['date_of_transfer']).dt.date
        
        geo_data = geo.query_postcode(bcp_chunk['postcode'].tolist())
        bcp_chunk['latitude'] = geo_data['latitude'].values
        bcp_chunk['longitude'] = geo_data['longitude'].values
        bcp_chunk.dropna(subset=['latitude', 'longitude'], inplace=True)

        bcp_chunk['location'] = bcp_chunk.apply(
            lambda row: from_shape(Point(row['longitude'], row['latitude']), srid=4326), axis=1
        )
        
        records_to_insert = bcp_chunk[[
            'transaction_id', 'price', 'date_of_transfer', 'postcode', 'property_type',
            'new_build_flag', 'tenure_type', 'paon', 'saon', 'street', 'locality',
            'town_city', 'district', 'county', 'location'
        ]].to_dict(orient='records')
        
        if records_to_insert:
            try:
                db_session.bulk_insert_mappings(PricePaid, records_to_insert)
                db_session.commit()
                print(f"    >> Successfully inserted {len(records_to_insert)} records.")
            except Exception as e:
                print(f"    >> Error inserting Price Paid chunk: {e}")
                db_session.rollback()

    print("Price Paid data loading process complete.")


def main():
    """Main function to set up DB and load all data sources."""
    engine = create_engine(settings.DATABASE_URL)
    
    print("Enabling PostGIS extension if it doesn't exist...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("Creating all tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    print("Creating indexes...")
    with engine.connect() as conn:
        conn.execute(text('CREATE INDEX IF NOT EXISTS idx_price_paid_data_location ON price_paid_data USING gist(location);'))
        conn.execute(text('CREATE INDEX IF NOT EXISTS idx_price_paid_data_street ON price_paid_data (street);'))
        conn.commit()
    
    # Check if Price Paid data exists before trying to load it
    price_paid_count = db.query(PricePaid).count()
    if price_paid_count > 0:
        print(f"Price Paid data already exists ({price_paid_count} records found). Skipping Price Paid data load.")
    else:
        print("Price Paid data table is empty. Starting data load...")
        load_price_paid_data(db)

    # Load EPC data (this will also skip records that are already present)
    load_epc_data(db)
    
    db.close()

if __name__ == "__main__":
    main()