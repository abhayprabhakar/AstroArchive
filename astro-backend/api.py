from flask import Blueprint, jsonify
from app.models import CelestialObject  # Import from your models.py
from flask_cors import CORS

api_bp = Blueprint('api', __name__)
CORS(api_bp)

# Define the celestial object types.  Make sure this matches the data in your database.
CELESTIAL_OBJECT_TYPES = ['Black Hole', 'Galaxy', 'Star', 'Planet', 'Nebula', 'Star Cluster']


@api_bp.route('/celestial-objects', methods=['GET'])
def get_celestial_objects():
    """
    API endpoint to retrieve all celestial object data from the database.
    """
    try:
        celestial_objects = CelestialObject.query.all()
        data = [{
            'object_id': obj.object_id,
            'name': obj.name,
            'object_type': obj.object_type,
            'right_ascension': obj.right_ascension,
            'declination': obj.declination,
            'magnitude': obj.magnitude,
            'description': obj.description
        } for obj in celestial_objects]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# Add routes for each celestial object type
for object_type in CELESTIAL_OBJECT_TYPES:
    @api_bp.route(f'/celestial-objects/{object_type.lower().replace(" ", "_")}', methods=['GET'])
    def get_celestial_objects_by_type(object_type=object_type): # added object_type parameter
        """
        API endpoint to retrieve celestial objects of a specific type.
        """
        try:
            celestial_objects = CelestialObject.query.filter_by(object_type=object_type).all()
            data = [{
                'object_id': obj.object_id,
                'name': obj.name,
                'object_type': obj.object_type,
                'right_ascension': obj.right_ascension,
                'declination': obj.declination,
                'magnitude': obj.magnitude,
                'description': obj.description
            } for obj in celestial_objects]
            return jsonify(data)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    #Dynamically set the function name.
    get_celestial_objects_by_type.__name__ = f'get_{object_type.lower().replace(" ", "_")}'
