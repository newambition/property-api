import sqlalchemy
from geoalchemy2 import Geometry
from db.base_class import Base

class PricePaid(Base):
    """SQLAlchemy ORM model for the HM Land Registry Price Paid Data."""
    __tablename__ = "price_paid_data"
    transaction_id = sqlalchemy.Column(sqlalchemy.String, primary_key=True, index=True)
    price = sqlalchemy.Column(sqlalchemy.Integer)
    date_of_transfer = sqlalchemy.Column(sqlalchemy.Date)
    postcode = sqlalchemy.Column(sqlalchemy.String, index=True)
    property_type = sqlalchemy.Column(sqlalchemy.String)
    new_build_flag = sqlalchemy.Column(sqlalchemy.String)
    tenure_type = sqlalchemy.Column(sqlalchemy.String)
    paon = sqlalchemy.Column(sqlalchemy.String)
    saon = sqlalchemy.Column(sqlalchemy.String)
    street = sqlalchemy.Column(sqlalchemy.String, index=True)
    locality = sqlalchemy.Column(sqlalchemy.String)
    town_city = sqlalchemy.Column(sqlalchemy.String)
    district = sqlalchemy.Column(sqlalchemy.String)
    county = sqlalchemy.Column(sqlalchemy.String)
    location = sqlalchemy.Column(Geometry(geometry_type='POINT', srid=4326), index=True)
