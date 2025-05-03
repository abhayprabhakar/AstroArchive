import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
# Import from app.models
from app.models import db, CelestialObject  # Import your models
# Import from parent directory
from config import Config

# 1. Define the database connection string
#    -  Important:  Use the same database connection string as in your Flask app.
#    -  For example, if you're using SQLite:
#    -  engine = create_engine('sqlite:///your_database.db')
#    -  Or, if you're using PostgreSQL:
# engine = create_engine('postgresql://your_user:your_password@your_host/your_database') #Change this
# Use the connection string from the Config class
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)

# 2.  Create the database tables.
#     -  This is crucial.  It ensures that the tables defined in your models.py
#        are created in the database before you try to insert data.
#     -  If you're using Flask-SQLAlchemy, you might do this in your app.py.
#     -  But for this standalone script, we need to do it explicitly.
#     -  If your tables are already created, you can comment out this line.
#Base.metadata.create_all(engine)  # Removed Base, use db.metadata
db.metadata.create_all(engine) #changed to db.metadata

# 3. Create a database session.
Session = sessionmaker(bind=engine)
session = Session()

def populate_database():
    """
    Populates the celestial_object table with data from celestial_object.json.
    """
    # Load the data from the JSON file.
    # The json file is in a folder named jsons
    df = pd.read_json('jsons/celestial_object.json')

    # Iterate through the DataFrame rows and create CelestialObject instances.
    for index, row in df.iterrows():
        # Check if magnitude is NaN, and if so, set it to None
        magnitude = row['magnitude'] if pd.notna(row['magnitude']) else None
        celestial_object = CelestialObject(
            object_id=row['object_id'],
            name=row['name'],
            object_type=row['object_type'],
            right_ascension=row['right_ascension'],
            declination=row['declination'],
            magnitude=magnitude,
            description=row['description']
        )
        session.add(celestial_object)

    # Commit the changes to the database.
    session.commit()
    print("Data has been successfully added to the database.")

    # Example query: Retrieve and print all celestial objects.
    print("\nExample Query:")
    celestial_objects = session.query(CelestialObject).all()
    if celestial_objects:
        for obj in celestial_objects:
            print(f"{obj.name} ({obj.object_type}) - Magnitude: {obj.magnitude}")
    else:
        print("No celestial objects found in the database.")

    # Close the session.  Very important to do this!
    session.close()

if __name__ == "__main__":
    populate_database()
