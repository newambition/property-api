import sqlalchemy
from db.base_class import Base

class EpcData(Base):
    """SQLAlchemy ORM model for the Energy Performance Certificate Data."""
    __tablename__ = "epc_data"
    
    lmk_key = sqlalchemy.Column(sqlalchemy.String, primary_key=True, index=True)
    address = sqlalchemy.Column(sqlalchemy.String)
    postcode = sqlalchemy.Column(sqlalchemy.String, index=True)
    uprn = sqlalchemy.Column(sqlalchemy.String, index=True, nullable=True)
    lodgement_date = sqlalchemy.Column(sqlalchemy.Date)
    current_energy_rating = sqlalchemy.Column(sqlalchemy.String)
    potential_energy_rating = sqlalchemy.Column(sqlalchemy.String)
    total_floor_area = sqlalchemy.Column(sqlalchemy.Float)
    property_type = sqlalchemy.Column(sqlalchemy.String)
    built_form = sqlalchemy.Column(sqlalchemy.String)