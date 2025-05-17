from flask import Flask, Blueprint, jsonify, request, current_app
from app.models import * # Import from your models.py
from flask_cors import CORS
from functools import wraps
import jwt
from app.models import User  # Adjust based on your model

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check if the token is present in the 'Authorization' header
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]  # Extract token part
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            # Decode the JWT token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])  # Fetch user based on the user_id from the token
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        # Pass the current_user object to the route handler
        return f(current_user, *args, **kwargs)

    return decorated

def to_iso_timestamp(dt):
    return dt.isoformat() + 'Z'






api_bp = Blueprint('api', __name__)
CORS(api_bp)

# Define the celestial object types.  Make sure this matches the data in your database.
CELESTIAL_OBJECT_TYPES = ['Black Hole', 'Galaxy', 'Star', 'Planet', 'Nebula', 'Star Cluster']

from flask import jsonify
from datetime import datetime

api_bp = Blueprint('api', __name__, url_prefix='/api')  # Define your blueprint

# Helper function to convert datetime to ISO format
def to_iso_timestamp(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return None



# Import necessary modules
from flask import Flask, request, jsonify
import os
import uuid
import json
from werkzeug.utils import secure_filename

# Assuming your Flask app is already created as 'app'
# If not, create it with:
# app = Flask(__name__)

# Directory where chunks are temporarily stored
TEMP_UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads')
# Directory for final uploads
FINAL_UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Create directories if they don't exist
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FINAL_UPLOAD_FOLDER, exist_ok=True)

# Store information about active uploads
active_uploads = {}

@api_bp.route('/chunk-upload/init', methods=['POST'])
@token_required
def init_chunked_upload(current_user):
    """Initialize a new chunked upload"""
    data = request.json
    
    # Generate a unique upload ID
    upload_id = str(uuid.uuid4())
    
    # Create a folder for this upload's chunks
    upload_folder = os.path.join(TEMP_UPLOAD_FOLDER, upload_id)
    os.makedirs(upload_folder, exist_ok=True)
    
    # Store upload information
    active_uploads[upload_id] = {
        'fileName': secure_filename(data.get('fileName')),
        'fileSize': data.get('fileSize'),
        'fileType': data.get('fileType'),
        'uploadType': data.get('uploadType'),  # 'main-image', 'additional-image', 'documentation', etc.
        'fileId': data.get('fileId'),
        'totalChunks': data.get('totalChunks'),
        'receivedChunks': 0,
        'chunkFolder': upload_folder,
        'isComplete': False
    }
    
    return jsonify({
        'uploadId': upload_id,
        'status': 'initialized'
    })

@api_bp.route('/chunk-upload/chunk', methods=['POST'])
@token_required
def upload_chunk(current_user):
    """Handle an individual chunk upload"""
    upload_id = request.form.get('uploadId')
    chunk_index = int(request.form.get('chunkIndex'))
    
    # Check if the upload exists
    if upload_id not in active_uploads:
        return jsonify({'error': 'Invalid upload ID'}), 400
    
    upload_info = active_uploads[upload_id]
    
    # Get the chunk file
    if 'chunk' not in request.files:
        return jsonify({'error': 'No chunk in request'}), 400
    
    chunk = request.files['chunk']
    
    # Save the chunk to disk
    chunk_path = os.path.join(upload_info['chunkFolder'], f'chunk_{chunk_index}')
    chunk.save(chunk_path)
    
    # Update received chunks count
    upload_info['receivedChunks'] += 1
    
    return jsonify({
        'status': 'chunk_received',
        'chunkIndex': chunk_index,
        'receivedChunks': upload_info['receivedChunks'],
        'totalChunks': upload_info['totalChunks']
    })

@api_bp.route('/chunk-upload/complete', methods=['POST'])
@token_required
def complete_chunked_upload(current_user):
    """Complete a chunked upload by combining all chunks"""
    data = request.json
    upload_id = data.get('uploadId')
    
    # Check if the upload exists
    if upload_id not in active_uploads:
        return jsonify({'error': 'Invalid upload ID'}), 400
    
    upload_info = active_uploads[upload_id]
    
    # Check if all chunks were received
    if upload_info['receivedChunks'] != upload_info['totalChunks']:
        return jsonify({
            'error': 'Not all chunks received',
            'receivedChunks': upload_info['receivedChunks'],
            'totalChunks': upload_info['totalChunks']
        }), 400
    
    # Create final destination folder based on upload type
    type_folder = os.path.join(FINAL_UPLOAD_FOLDER, upload_info['uploadType'])
    os.makedirs(type_folder, exist_ok=True)
    
    # Generate unique filename
    base_filename = upload_info['fileName']
    filename = f"{uuid.uuid4()}_{base_filename}"
    file_path = os.path.join(type_folder, filename)
    
    # Combine all chunks into final file
    with open(file_path, 'wb') as final_file:
        for i in range(upload_info['totalChunks']):
            chunk_path = os.path.join(upload_info['chunkFolder'], f'chunk_{i}')
            with open(chunk_path, 'rb') as chunk_file:
                final_file.write(chunk_file.read())
    
    # Update upload status
    upload_info['isComplete'] = True
    upload_info['finalPath'] = file_path
    
    # Return file path relative to FINAL_UPLOAD_FOLDER
    relative_path = os.path.join(upload_info['uploadType'], filename)
    
    return jsonify({
        'status': 'complete',
        'filePath': relative_path,
        'fileType': upload_info['uploadType'],
        'fileId': upload_info['fileId']
    })

@api_bp.route('/finalize-upload', methods=['POST'])
@token_required
def finalize_upload(current_user):
    """Handle the final form submission with metadata and small files"""
    # Extract form data
    form_data = request.form
    files = request.files
    
    # Get chunked file paths
    chunked_files = {}
    for key in form_data:
        if key.startswith('chunkedFiles[') and key.endswith(']'):
            file_id = key[len('chunkedFiles['):-1]
            chunked_files[file_id] = form_data[key]
    
    # Process metadata
    image_details = {}
    if 'imageDetails' in form_data:
        try:
            image_details = json.loads(form_data['imageDetails'])
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid image details format'}), 400
    
    location_details = {}
    if 'locationDetails' in form_data:
        try:
            location_details = json.loads(form_data['locationDetails'])
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid location details format'}), 400
    
    gear_details = {}
    if 'gearDetails.selectedGear' in form_data:
        try:
            gear_details = {
                'selectedGear': json.loads(form_data['gearDetails.selectedGear'])
            }
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid gear details format'}), 400
    
    session_details = {}
    if 'sessionDetails' in form_data:
        try:
            session_details = json.loads(form_data['sessionDetails'])
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid session details format'}), 400
    
    # Handle small files (not uploaded in chunks)
    small_files = {}
    
    # Main image
    main_image_path = None
    if 'images.mainImage' in files:
        main_image = files['images.mainImage']
        main_image_path = handle_small_file(main_image, 'main-image')
        small_files['mainImage'] = main_image_path
    
    # Additional images
    additional_images = []
    for key in files:
        if key.startswith('images.additionalImages[') and key.endswith(']'):
            additional_image = files[key]
            additional_image_path = handle_small_file(additional_image, 'additional-image')
            additional_images.append(additional_image_path)
    if additional_images:
        small_files['additionalImages'] = additional_images
    
    # Documentation files
    documentation_files = []
    for key in files:
        if key.startswith('documentation[') and key.endswith(']'):
            doc_file = files[key]
            doc_file_path = handle_small_file(doc_file, 'documentation')
            documentation_files.append(doc_file_path)
    if documentation_files:
        small_files['documentation'] = documentation_files
    
    # Combine all file paths (chunked and small)
    all_files = {
        'chunkedFiles': chunked_files,
        'smallFiles': small_files
    }
    
    # Create image entry in database using the existing Image API
    try:
        # Prepare image data from the collected information
        image_data = {
            'user_id': current_user.user_id,
            'title': image_details.get('title'),
            'description': image_details.get('description'),
            'file_path': main_image_path,  # Use the main image path
            'capture_date_time': image_details.get('capture_date_time'),
            'exposure_time': image_details.get('exposure_time'),
            'iso': image_details.get('iso'),
            'aperture': image_details.get('aperture'),
            'focal_length': image_details.get('focal_length'),
            'focus_score': image_details.get('focus_score')
        }
        
        """ # Option 1: Use the Image API directly by making an internal request
        # This approach maintains separation of concerns but adds overhead
        response = requests.post(
            url_for('api_bp.create_image', _external=True),
            json=image_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code != 201:
            return jsonify({'error': f'Failed to create image record: {response.json().get("error")}'}), response.status_code
            
        image_id = response.json().get('image_id') """
        
        # Option 2: Call the database function directly
        # This approach is more efficient but creates tighter coupling
        
        new_image = Image(
            user_id=image_data['user_id'],
            title=image_data['title'],
            description=image_data['description'],
            file_path=image_data['file_path'],
            capture_date_time=datetime.fromisoformat(image_data['capture_date_time']) if image_data['capture_date_time'] else None,
            exposure_time=image_data['exposure_time'],
            iso=image_data['iso'],
            aperture=image_data['aperture'],
            focal_length=image_data['focal_length'],
            focus_score=image_data['focus_score']
        )
        
        db.session.add(new_image)
        db.session.commit()
        image_id = new_image.image_id
        
        
        # Store additional information if needed
        # This could be in separate tables related to the image
        # (e.g., image_location, image_session, additional_image_files, etc.)
        
        # Return success response with the created image ID
        return jsonify({
            'status': 'success',
            'message': 'Upload completed successfully',
            'image_id': image_id
        })
        
    except Exception as e:
        # If using Option 2, add 
        db.session.rollback() 
        return jsonify({'error': str(e)}), 500

def handle_small_file(file, file_type):
    """Process and save a small file upload"""
    if file and file.filename:
        # Create directory if it doesn't exist
        type_folder = os.path.join(FINAL_UPLOAD_FOLDER, file_type)
        os.makedirs(type_folder, exist_ok=True)
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(type_folder, unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Return relative path
        return os.path.join(file_type, unique_filename)
    
    return None

@api_bp.route('/user_id', methods=['GET'])
@token_required
def protected_route(current_user):
    # Access the user_id from the current_user object
    return jsonify({'user_id': current_user.user_id}), 200

# ---------------------------- User API ----------------------------
@api_bp.route('/users', methods=['GET'])
def get_users():
    try:
        users = User.query.all()
        data = [{
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'location': user.location,
            'profile_image': user.profile_image,
            'created_at': to_iso_timestamp(user.created_at),
            'name': user.name,
            'last_login': to_iso_timestamp(user.last_login)
        } for user in users]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        data = {
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'location': user.location,
            'profile_image': user.profile_image,
            'created_at': to_iso_timestamp(user.created_at),
            'name': user.name,
            'last_login': to_iso_timestamp(user.last_login)
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        #  **IMPORTANT:** You should *never* store the plain-text password.  Hash it!
        hashed_password = User.hash_password(data.get('password'))

        new_user = User(
            username=data.get('username'),
            email=data.get('email'),
            password_hash=hashed_password,
            location=data.get('location'),
            profile_image=data.get('profile_image'),
            name=data.get('name')
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({'message': 'User created successfully', 'user_id': new_user.user_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user.username = data.get('username', user.username)
        user.email = data.get('email', user.email)
        user.location = data.get('location', user.location)
        user.profile_image = data.get('profile_image', user.profile_image)
        user.name = data.get('name', user.name)
        #  **IMPORTANT:** If you allow password updates, hash the new password!
        if 'password' in data:
            user.password_hash = User.hash_password(data['password'])

        db.session.commit()

        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- CelestialObject API ----------------------------
@api_bp.route('/celestial_objects', methods=['GET'])
def get_celestial_objects():
    try:
        objects = CelestialObject.query.all()
        data = [{
            'object_id': obj.object_id,
            'name': obj.name,
            'object_type': obj.object_type,
            'right_ascension': obj.right_ascension,
            'declination': obj.declination,
            'magnitude': obj.magnitude,
            'description': obj.description
        } for obj in objects]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/celestial_objects/<string:object_id>', methods=['GET'])
def get_celestial_object(object_id):
    try:
        obj = CelestialObject.query.get_or_404(object_id)
        data = {
            'object_id': obj.object_id,
            'name': obj.name,
            'object_type': obj.object_type,
            'right_ascension': obj.right_ascension,
            'declination': obj.declination,
            'magnitude': obj.magnitude,
            'description': obj.description
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/celestial_objects', methods=['POST'])
def create_celestial_object():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_object = CelestialObject(
            name=data.get('name'),
            object_type=data.get('object_type'),
            right_ascension=data.get('right_ascension'),
            declination=data.get('declination'),
            magnitude=data.get('magnitude'),
            description=data.get('description')
        )

        db.session.add(new_object)
        db.session.commit()

        return jsonify({'message': 'CelestialObject created successfully', 'object_id': new_object.object_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/celestial_objects/<string:object_id>', methods=['PUT'])
def update_celestial_object(object_id):
    try:
        obj = CelestialObject.query.get_or_404(object_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        obj.name = data.get('name', obj.name)
        obj.object_type = data.get('object_type', obj.object_type)
        obj.right_ascension = data.get('right_ascension', obj.right_ascension)
        obj.declination = data.get('declination', obj.declination)
        obj.magnitude = data.get('magnitude', obj.magnitude)
        obj.description = data.get('description', obj.description)

        db.session.commit()

        return jsonify({'message': 'CelestialObject updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/celestial_objects/<string:object_id>', methods=['DELETE'])
def delete_celestial_object(object_id):
    try:
        obj = CelestialObject.query.get_or_404(object_id)
        db.session.delete(obj)
        db.session.commit()
        return jsonify({'message': 'CelestialObject deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- Gear API ----------------------------
@api_bp.route('/gear', methods=['GET'])
@token_required
def get_gear(current_user):
    try:
        # Fetch gear associated with the current user
        gear_items = Gear.query.filter_by(user_id=current_user.user_id).all()
        data = [{
            'gear_id': item.gear_id,
            'gear_type': item.gear_type,
            'brand': item.brand,
            'model': item.model
        } for item in gear_items]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear/<string:gear_id>', methods=['GET'])
@token_required
def get_gear_item(current_user, gear_id):
    try:
        # Fetch the gear item only if it belongs to the current user
        item = Gear.query.filter_by(gear_id=gear_id, user_id=current_user.user_id).first_or_404()
        data = {
            'gear_id': item.gear_id,
            'gear_type': item.gear_type,
            'brand': item.brand,
            'model': item.model
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear', methods=['POST'])
@token_required
def create_gear_item(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_item = Gear(
            user_id=current_user.user_id,  # Associate the gear with the current user
            gear_type=data.get('gear_type'),
            brand=data.get('brand'),
            model=data.get('model')
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'message': 'Gear created successfully', 'gear_id': new_item.gear_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear/<string:gear_id>', methods=['PUT'])
@token_required
def update_gear_item(current_user, gear_id):
    try:
        # Fetch the gear item and ensure it belongs to the current user
        item = Gear.query.filter_by(gear_id=gear_id, user_id=current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        item.gear_type = data.get('gear_type', item.gear_type)
        item.brand = data.get('brand', item.brand)
        item.model = data.get('model', item.model)

        db.session.commit()
        return jsonify({'message': 'Gear updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear/<string:gear_id>', methods=['DELETE'])
@token_required
def delete_gear_item(current_user, gear_id):
    try:
        # Fetch the gear item and ensure it belongs to the current user before deleting
        item = Gear.query.filter_by(gear_id=gear_id, user_id=current_user.user_id).first_or_404()
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Gear deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- Location API ----------------------------
@api_bp.route('/locations', methods=['GET'])
@token_required
def get_locations(current_user):
    try:
        # Fetch locations associated with the current user
        locations = Location.query.filter_by(user_id=current_user.user_id).all()
        data = [{
            'location_id': loc.location_id,
            'name': loc.name,
            'latitude': loc.latitude,
            'longitude': loc.longitude,
            'bortle_class': loc.bortle_class,
            'notes': loc.notes
        } for loc in locations]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/locations/<string:location_id>', methods=['GET'])
@token_required
def get_location(current_user, location_id):
    try:
        # Fetch the location only if it belongs to the current user
        location = Location.query.filter_by(location_id=location_id, user_id=current_user.user_id).first_or_404()
        data = {
            'location_id': location.location_id,
            'name': location.name,
            'latitude': location.latitude,
            'longitude': location.longitude,
            'bortle_class': location.bortle_class,
            'notes': location.notes
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/locations', methods=['POST'])
@token_required
def create_location(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_location = Location(
            user_id=current_user.user_id,  # Associate the location with the current user
            name=data.get('name'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            bortle_class=data.get('bortle_class'),
            notes=data.get('notes')
        )
        db.session.add(new_location)
        db.session.commit()
        return jsonify({'message': 'Location created successfully', 'location_id': new_location.location_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/locations/<string:location_id>', methods=['PUT'])
@token_required
def update_location(current_user, location_id):
    try:
        # Fetch the location and ensure it belongs to the current user
        location = Location.query.filter_by(location_id=location_id, user_id=current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        location.name = data.get('name', location.name)
        location.latitude = data.get('latitude', location.latitude)
        location.longitude = data.get('longitude', location.longitude)
        location.bortle_class = data.get('bortle_class', location.bortle_class)
        location.notes = data.get('notes', location.notes)
        db.session.commit()
        return jsonify({'message': 'Location updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/locations/<string:location_id>', methods=['DELETE'])
@token_required
def delete_location(current_user, location_id):
    try:
        # Fetch the location and ensure it belongs to the current user before deleting
        location = Location.query.filter_by(location_id=location_id, user_id=current_user.user_id).first_or_404()
        db.session.delete(location)
        db.session.commit()
        return jsonify({'message': 'Location deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ---------------------------- Session API ----------------------------
@api_bp.route('/sessions', methods=['GET'])
@token_required
def get_sessions(current_user):
    try:
        # Fetch sessions associated with the current user
        sessions = Session.query.filter_by(user_id=current_user.user_id).all()
        data = [{
            'session_id': session.session_id,
            'session_date': session.session_date.isoformat() if session.session_date else None,
            'weather_conditions': session.weather_conditions,
            'seeing_conditions': session.seeing_conditions,
            'moon_phase': session.moon_phase,
            'light_pollution_index': session.light_pollution_index,
            'location_id': session.location_id
        } for session in sessions]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['GET'])
@token_required
def get_session(current_user, session_id):
    try:
        # Fetch the session only if it belongs to the current user
        session = Session.query.filter_by(session_id=session_id, user_id=current_user.user_id).first_or_404()
        data = {
            'session_id': session.session_id,
            'session_date': session.session_date.isoformat() if session.session_date else None,
            'weather_conditions': session.weather_conditions,
            'seeing_conditions': session.seeing_conditions,
            'moon_phase': session.moon_phase,
            'light_pollution_index': session.light_pollution_index,
            'location_id': session.location_id
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions', methods=['POST'])
@token_required
def create_session(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_session = Session(
            user_id=current_user.user_id,  # Associate the session with the current user
            session_date=datetime.strptime(data.get('session_date'), '%Y-%m-%d').date() if data.get('session_date') else None,
            weather_conditions=data.get('weather_conditions'),
            seeing_conditions=data.get('seeing_conditions'),
            moon_phase=data.get('moon_phase'),
            light_pollution_index=data.get('light_pollution_index'),
            location_id=data.get('location_id')
        )
        db.session.add(new_session)
        db.session.commit()
        return jsonify({'message': 'Session created successfully', 'session_id': new_session.session_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['PUT'])
@token_required
def update_session(current_user, session_id):
    try:
        # Fetch the session and ensure it belongs to the current user
        session = Session.query.filter_by(session_id=session_id, user_id=current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        session.session_date = datetime.strptime(data.get('session_date'), '%Y-%m-%d').date() if data.get('session_date') else session.session_date
        session.weather_conditions = data.get('weather_conditions', session.weather_conditions)
        session.seeing_conditions = data.get('seeing_conditions', session.seeing_conditions)
        session.moon_phase = data.get('moon_phase', session.moon_phase)
        session.light_pollution_index = data.get('light_pollution_index', session.light_pollution_index)
        session.location_id = data.get('location_id', session.location_id)

        db.session.commit()
        return jsonify({'message': 'Session updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['DELETE'])
@token_required
def delete_session(current_user, session_id):
    try:
        # Fetch the session and ensure it belongs to the current user before deleting
        session = Session.query.filter_by(session_id=session_id, user_id=current_user.user_id).first_or_404()
        db.session.delete(session)
        db.session.commit()
        return jsonify({'message': 'Session deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- Image API ----------------------------
@api_bp.route('/images', methods=['GET'])
def get_images():
    try:
        images = Image.query.all()
        data = [{
            'image_id': image.image_id,
            'user_id': image.user_id,
            'title': image.title,
            'description': image.description,
            'file_path': image.file_path,
            'capture_date_time': to_iso_timestamp(image.capture_date_time),
            'exposure_time': image.exposure_time,
            'iso': image.iso,
            'aperture': image.aperture,
            'focal_length': image.focal_length,
            'focus_score': image.focus_score
        } for image in images]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/images/<string:image_id>', methods=['GET'])
def get_image(image_id):
    try:
        image = Image.query.get_or_404(image_id)
        data = {
            'image_id': image.image_id,
            'user_id': image.user_id,
            'title': image.title,
            'description': image.description,
            'file_path': image.file_path,
            'capture_date_time': to_iso_timestamp(image.capture_date_time),
            'exposure_time': image.exposure_time,
            'iso': image.iso,
            'aperture': image.aperture,
            'focal_length': image.focal_length,
            'focus_score': image.focus_score
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/images', methods=['POST'])
def create_image():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_image = Image(
            user_id=data.get('user_id'),
            title=data.get('title'),
            description=data.get('description'),
            file_path=data.get('file_path'),
            capture_date_time=datetime.fromisoformat(data.get('capture_date_time')) if data.get('capture_date_time') else None,
            exposure_time=data.get('exposure_time'),
            iso=data.get('iso'),
            aperture=data.get('aperture'),
            focal_length=data.get('focal_length'),
            focus_score=data.get('focus_score')
        )

        db.session.add(new_image)
        db.session.commit()

        return jsonify({'message': 'Image created successfully', 'image_id': new_image.image_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/images/<string:image_id>', methods=['PUT'])
def update_image(image_id):
    try:
        image = Image.query.get_or_404(image_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        image.user_id = data.get('user_id', image.user_id)
        image.title = data.get('title', image.title)
        image.description = data.get('description', image.description)
        image.file_path = data.get('file_path', image.file_path)
        image.capture_date_time = datetime.fromisoformat(data.get('capture_date_time')) if data.get('capture_date_time') else image.capture_date_time
        image.exposure_time = data.get('exposure_time', image.exposure_time)
        image.iso = data.get('iso', image.iso)
        image.aperture = data.get('aperture', image.aperture)
        image.focal_length = data.get('focal_length', image.focal_length)
        image.focus_score = data.get('focus_score', image.focus_score)

        db.session.commit()

        return jsonify({'message': 'Image updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/images/<string:image_id>', methods=['DELETE'])
def delete_image(image_id):
    try:
        image = Image.query.get_or_404(image_id)
        db.session.delete(image)
        db.session.commit()
        return jsonify({'message': 'Image deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- ImageObject API ----------------------------
@api_bp.route('/image_objects', methods=['GET'])
def get_image_objects():
    try:
        image_objects = ImageObject.query.all()
        data = [{
            'image_id': obj.image_id,
            'object_id': obj.object_id
        } for obj in image_objects]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_objects/<string:image_id>/<string:object_id>', methods=['GET'])
def get_image_object(image_id, object_id):
    try:
        image_object = ImageObject.query.filter_by(image_id=image_id, object_id=object_id).first_or_404()
        data = {
            'image_id': image_object.image_id,
            'object_id': image_object.object_id
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_objects', methods=['POST'])
def create_image_object():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_image_object = ImageObject(
            image_id=data.get('image_id'),
            object_id=data.get('object_id')
        )

        db.session.add(new_image_object)
        db.session.commit()

        return jsonify({'message': 'ImageObject created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_objects/<string:image_id>/<string:object_id>', methods=['DELETE'])
def delete_image_object(image_id, object_id):
    try:
        image_object = ImageObject.query.filter_by(image_id=image_id, object_id=object_id).first_or_404()
        db.session.delete(image_object)
        db.session.commit()
        return jsonify({'message': 'ImageObject deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- ImageGear API ----------------------------
@api_bp.route('/image_gear', methods=['GET'])
def get_image_gear():
    try:
        image_gear_items = ImageGear.query.all()
        data = [{
            'image_id': item.image_id,
            'gear_id': item.gear_id
        } for item in image_gear_items]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_gear/<string:image_id>/<string:gear_id>', methods=['GET'])
def get_image_gear_item(image_id, gear_id):
    try:
        image_gear_item = ImageGear.query.filter_by(image_id=image_id, gear_id=gear_id).first_or_404()
        data = {
            'image_id': image_gear_item.image_id,
            'gear_id': image_gear_item.gear_id
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_gear', methods=['POST'])
def create_image_gear_item():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_image_gear_item = ImageGear(
            image_id=data.get('image_id'),
            gear_id=data.get('gear_id')
        )

        db.session.add(new_image_gear_item)
        db.session.commit()

        return jsonify({'message': 'ImageGear created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_gear/<string:image_id>/<string:gear_id>', methods=['DELETE'])
def delete_image_gear_item(image_id, gear_id):
    try:
        image_gear_item = ImageGear.query.filter_by(image_id=image_id, gear_id=gear_id).first_or_404()
        db.session.delete(image_gear_item)
        db.session.commit()
        return jsonify({'message': 'ImageGear deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- ImageSession API ----------------------------
@api_bp.route('/image_sessions', methods=['GET'])
def get_image_sessions():
    try:
        image_sessions = ImageSession.query.all()
        data = [{
            'image_id': item.image_id,
            'session_id': item.session_id
        } for item in image_sessions]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_sessions/<string:image_id>/<string:session_id>', methods=['GET'])
def get_image_session_item(image_id, session_id):
    try:
        image_session_item = ImageSession.query.filter_by(image_id=image_id, session_id=session_id).first_or_404()
        data = {
            'image_id': image_session_item.image_id,
            'session_id': image_session.session_id
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_sessions', methods=['POST'])
def create_image_session_item():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_image_session_item = ImageSession(
            image_id=data.get('image_id'),
            session_id=data.get('session_id')
        )

        db.session.add(new_image_session_item)
        db.session.commit()

        return jsonify({'message': 'ImageSession created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image_sessions/<string:image_id>/<string:session_id>', methods=['DELETE'])
def delete_image_session_item(image_id, session_id):
    try:
        image_session_item = ImageSession.query.filter_by(image_id=image_id, session_id=session_id).first_or_404()
        db.session.delete(image_session_item)
        db.session.commit()
        return jsonify({'message': 'ImageSession deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- ProcessingLog API ----------------------------
@api_bp.route('/processing_logs', methods=['GET'])
def get_processing_logs():
    try:
        logs = ProcessingLog.query.all()
        data = [{
            'log_id': log.log_id,
            'image_id': log.image_id,
            'step_description': log.step_description,
            'timestamp': to_iso_timestamp(log.timestamp),
            'software_used': log.software_used,
            'notes': log.notes
        } for log in logs]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs/<string:log_id>', methods=['GET'])
def get_processing_log(log_id):
    try:
        log = ProcessingLog.query.get_or_404(log_id)
        data = {
            'log_id': log.log_id,
            'image_id': log.image_id,
            'step_description': log.step_description,
            'timestamp': to_iso_timestamp(log.timestamp),
            'software_used': log.software_used,
            'notes': log.notes
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs', methods=['POST'])
def create_processing_log():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_log = ProcessingLog(
            image_id=data.get('image_id'),
            step_description=data.get('step_description'),
            software_used=data.get('software_used'),
            notes=data.get('notes')
        )
        db.session.add(new_log)
        db.session.commit()

        return jsonify({'message': 'ProcessingLog created successfully', 'log_id': new_log.log_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs/<string:log_id>', methods=['PUT'])
def update_processing_log(log_id):
    try:
        log = ProcessingLog.query.get_or_404(log_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        log.image_id = data.get('image_id', log.image_id)
        log.step_description = data.get('step_description', log.step_description)
        log.software_used = data.get('software_used', log.software_used)
        log.notes = data.get('notes', log.notes)

        db.session.commit()

        return jsonify({'message': 'ProcessingLog updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs/<string:log_id>', methods=['DELETE'])
def delete_processing_log(log_id):
    try:
        log = ProcessingLog.query.get_or_404(log_id)
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'ProcessingLog deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- FrameSummary API ----------------------------
@api_bp.route('/frame_summaries', methods=['GET'])
def get_frame_summaries():
    try:
        summaries = FrameSummary.query.all()
        data = [{
            'summary_id': summary.summary_id,
            'image_id': summary.image_id,
            'light_frame_count': summary.light_frame_count,
            'dark_frame_count': summary.dark_frame_count,
            'flat_frame_count': summary.flat_frame_count,
            'bias_frame_count': summary.bias_frame_count,
            'dark_flat_count': summary.dark_flat_count
        } for summary in summaries]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries/<string:summary_id>', methods=['GET'])
def get_frame_summary(summary_id):
    try:
        summary = FrameSummary.query.get_or_404(summary_id)
        data = {
            'summary_id': summary.summary_id,
            'image_id': summary.image_id,
            'light_frame_count': summary.light_frame_count,
            'dark_frame_count': summary.dark_frame_count,
            'flat_frame_count': summary.flat_frame_count,
            'bias_frame_count': summary.bias_frame_count,
            'dark_flat_count': summary.dark_flat_count
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries', methods=['POST'])
def create_frame_summary():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_summary = FrameSummary(
            image_id=data.get('image_id'),
            light_frame_count=data.get('light_frame_count'),
            dark_frame_count=data.get('dark_frame_count'),
            flat_frame_count=data.get('flat_frame_count'),
            bias_frame_count=data.get('bias_frame_count'),
            dark_flat_count=data.get('dark_flat_count')
        )

        db.session.add(new_summary)
        db.session.commit()

        return jsonify({'message': 'FrameSummary created successfully', 'summary_id': new_summary.summary_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries/<string:summary_id>', methods=['PUT'])
def update_frame_summary(summary_id):
    try:
        summary = FrameSummary.query.get_or_404(summary_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        summary.image_id = data.get('image_id', summary.image_id)
        summary.light_frame_count = data.get('light_frame_count', summary.light_frame_count)
        summary.dark_frame_count = data.get('dark_frame_count', summary.dark_frame_count)
        summary.flat_frame_count = data.get('flat_frame_count', summary.flat_frame_count)
        summary.bias_frame_count = data.get('bias_frame_count', summary.bias_frame_count)
        summary.dark_flat_count = data.get('dark_flat_count', summary.dark_flat_count)

        db.session.commit()

        return jsonify({'message': 'FrameSummary updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries/<string:summary_id>', methods=['DELETE'])
def delete_frame_summary(summary_id):
    try:
        summary = FrameSummary.query.get_or_404(summary_id)
        db.session.delete(summary)
        db.session.commit()
        return jsonify({'message': 'FrameSummary deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- FrameSet API ----------------------------
@api_bp.route('/frame_sets', methods=['GET'])
def get_frame_sets():
    try:
        frame_sets = FrameSet.query.all()
        data = [{
            'frameset_id': frame_set.frameset_id,
            'image_id': frame_set.image_id,
            'created_at': to_iso_timestamp(frame_set.created_at)
        } for frame_set in frame_sets]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_sets/<string:frameset_id>', methods=['GET'])
def get_frame_set(frameset_id):
    try:
        frame_set = FrameSet.query.get_or_404(frameset_id)
        data = {
            'frameset_id': frame_set.frameset_id,
            'image_id': frame_set.image_id,
            'created_at': to_iso_timestamp(frame_set.created_at)
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_sets', methods=['POST'])
def create_frame_set():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_frame_set = FrameSet(
            image_id=data.get('image_id')
        )

        db.session.add(new_frame_set)
        db.session.commit()

        return jsonify({'message': 'FrameSet created successfully', 'frameset_id': new_frame_set.frameset_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_sets/<string:frameset_id>', methods=['PUT'])
def update_frame_set(frameset_id):
    try:
        frame_set = FrameSet.query.get_or_404(frameset_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        frame_set.image_id = data.get('image_id', frame_set.image_id)

        db.session.commit()

        return jsonify({'message': 'FrameSet updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_sets/<string:frameset_id>', methods=['DELETE'])
def delete_frame_set(frameset_id):
    try:
        frame_set = FrameSet.query.get_or_404(frameset_id)
        db.session.delete(frame_set)
        db.session.commit()
        return jsonify({'message': 'FrameSet deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- RawFrame API ----------------------------
@api_bp.route('/raw_frames', methods=['GET'])
def get_raw_frames():
    try:
        raw_frames = RawFrame.query.all()
        data = [{
            'frame_id': frame.frame_id,
            'frameset_id': frame.frameset_id,
            'frame_type': frame.frame_type,
            'file_path': frame.file_path,
            'exposure_time': frame.exposure_time,
            'iso': frame.iso,
            'temperature': frame.temperature,
            'capture_time': to_iso_timestamp(frame.capture_time)
        } for frame in raw_frames]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames/<string:frame_id>', methods=['GET'])
def get_raw_frame(frame_id):
    try:
        frame = RawFrame.query.get_or_404(frame_id)
        data = {
            'frame_id': frame.frame_id,
            'frameset_id': frame.frameset_id,
            'frame_type': frame.frame_type,
            'file_path': frame.file_path,
            'exposure_time': frame.exposure_time,
            'iso': frame.iso,
            'temperature': frame.temperature,
            'capture_time': to_iso_timestamp(frame.capture_time)
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames', methods=['POST'])
def create_raw_frame():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_raw_frame = RawFrame(
            frameset_id=data.get('frameset_id'),
            frame_type=data.get('frame_type'),
            file_path=data.get('file_path'),
            exposure_time=data.get('exposure_time'),
            iso=data.get('iso'),
            temperature=data.get('temperature'),
            capture_time=datetime.fromisoformat(data.get('capture_time')) if data.get('capture_time') else None
        )

        db.session.add(new_raw_frame)
        db.session.commit()

        return jsonify({'message': 'RawFrame created successfully', 'frame_id': new_raw_frame.frame_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames/<string:frame_id>', methods=['PUT'])
def update_raw_frame(frame_id):
    try:
        frame = RawFrame.query.get_or_404(frame_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        frame.frameset_id = data.get('frameset_id', frame.frameset_id)
        frame.frame_type = data.get('frame_type', frame.frame_type)
        frame.file_path = data.get('file_path', frame.file_path)
        frame.exposure_time = data.get('exposure_time', frame.exposure_time)
        frame.iso = data.get('iso', frame.iso)
        frame.temperature = data.get('temperature', frame.temperature)
        frame.capture_time = datetime.fromisoformat(data.get('capture_time')) if data.get('capture_time') else frame.capture_time

        db.session.commit()

        return jsonify({'message': 'RawFrame updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames/<string:frame_id>', methods=['DELETE'])
def delete_raw_frame(frame_id):
    try:
        frame = RawFrame.query.get_or_404(frame_id)
        db.session.delete(frame)
        db.session.commit()
        return jsonify({'message': 'RawFrame deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500




        
@api_bp.route('/celestial-objects', methods=['GET'])
def get_celestial_objectss():
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
