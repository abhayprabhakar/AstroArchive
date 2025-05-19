from flask import Flask, Blueprint, jsonify, request, current_app, send_file
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
    
    # Validate upload type (support for new frame types)
    valid_upload_types = [
        'main-image', 'lightFrames', 'darkFrames', 'flatFrames', 
        'biasFrames', 'darkFlats', 'documentation'
    ]
    
    upload_type = data.get('uploadType')
    if upload_type not in valid_upload_types:
        return jsonify({'error': f'Invalid upload type. Must be one of {valid_upload_types}'}), 400
    
    # Store upload information
    active_uploads[upload_id] = {
        'fileName': secure_filename(data.get('fileName')),
        'fileSize': data.get('fileSize'),
        'fileType': data.get('fileType'),
        'uploadType': upload_type, 
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
    
    # Extract metadata if this is an image file
    metadata = {}
    if upload_info['uploadType'] in ['main-image', 'lightFrames', 'darkFrames', 'flatFrames', 'biasFrames', 'darkFlats']:
        try:
            # You could use a library like Pillow or exifread to extract EXIF data here
            # This is a placeholder for where you'd extract image metadata
            metadata = extract_image_metadata(file_path)
        except Exception as e:
            print(f"Error extracting metadata: {str(e)}")
    
    # Clean up chunks
    try:
        for i in range(upload_info['totalChunks']):
            chunk_path = os.path.join(upload_info['chunkFolder'], f'chunk_{i}')
            if os.path.exists(chunk_path):
                os.remove(chunk_path)
        
        # Remove the chunk folder
        if os.path.exists(upload_info['chunkFolder']):
            os.rmdir(upload_info['chunkFolder'])
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")
    
    # Return file path relative to FINAL_UPLOAD_FOLDER
    relative_path = os.path.join(upload_info['uploadType'], filename)
    
    return jsonify({
        'status': 'complete',
        'filePath': relative_path,
        'fileType': upload_info['uploadType'],
        'fileId': upload_info['fileId'],
        'metadata': metadata
    })

def extract_image_metadata(file_path):
    """Extract metadata from an image file (placeholder function)"""
    # This would be implemented with a library like Pillow or exifread
    # For now, return an empty dict
    return {
        # Example metadata that could be extracted
        # 'exposure_time': '1/250',
        # 'iso': 100,
        # 'aperture': 5.6,
        # 'focal_length': 50,
        # 'capture_date_time': '2023-01-01T12:00:00'
    }


""" @api_bp.route('/chunk-upload/init', methods=['POST'])
@token_required
def init_chunked_upload(current_user):
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
    }) """

def create_image_record(user_id, image_details, file_path):
    """Create a new Image record"""
    new_image = Image(
        user_id=user_id,
        title=image_details.get('title'),
        description=image_details.get('description'),
        file_path=file_path,
        capture_date_time=datetime.fromisoformat(image_details.get('capture_date_time')) if image_details.get('capture_date_time') else None,
        exposure_time=image_details.get('exposure_time'),
        iso=image_details.get('iso'),
        aperture=image_details.get('aperture'),
        focal_length=image_details.get('focal_length'),
        focus_score=image_details.get('focus_score')
    )
    return new_image

def create_image_object_relations(images_id, object_id):
    """Create ImageObject relations for the image"""
    # Create relation
    try:
        image_object = ImageObject(
            image_id = images_id,
            object_id = '1'
        )
        return image_object
    except: 
        print("Bro something wrong in database model...")
        return None

def create_image_gear_relations(image_id, selected_gear):
    """Create ImageGear relations for the image"""
    for gear_id in selected_gear:
        image_gear = ImageGear(
            image_id=image_id,
            gear_id=gear_id
        )
        db.session.add(image_gear)

@api_bp.route('/finalize-upload', methods=['POST'])
@token_required
def finalize_upload(current_user):
    """Handle the final form submission with metadata and small files"""
    # Extract form data
    form_data = request.form
    files = request.files
    
    # For debugging
    print("Form data keys:", list(form_data.keys()))
    print("Files keys:", list(files.keys()))
    
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
    
    # Process uploaded files
    main_image_path = None
    image_files = {
        'lightFrames': [],
        'darkFrames': [],
        'flatFrames': [],
        'biasFrames': [],
        'darkFlats': []
    }
    
    # 1. Process main image
    if 'images.mainImage' in files:
        main_image = files['images.mainImage']
        main_image_path = handle_small_file(main_image, 'main-image')
        print(f"Processed main image: {main_image_path}")
    
    # 2. Process frame files - first check for direct file uploads
    for frame_type in image_files.keys():
        file_key = f'images.{frame_type}'
        
        # Handle multiple files
        for key in files.keys():
            if key.startswith(file_key):
                frame_file = files[key]
                frame_path = handle_small_file(frame_file, frame_type)
                if frame_path:
                    print(f"Direct upload for {frame_type}: {frame_path}")
                    image_files[frame_type].append(frame_path)
    
    # 3. Process file data from hidden JSON field (new approach)
    if 'images.fileData' in form_data:
        try:
            file_data = json.loads(form_data['images.fileData'])
            
            # Log what we received
            print(f"Received file data: {file_data}")
            
            # Look for file uploads that match the file data
            for frame_type, frames_data in file_data.items():
                if not isinstance(frames_data, list):
                    continue
                    
                for idx, frame_info in enumerate(frames_data):
                    frame_name = frame_info.get('name')
                    
                    # Look for file uploads that match this name
                    for key in files.keys():
                        if key.startswith(f'images.{frame_type}') and files[key].filename == frame_name:
                            frame_file = files[key]
                            frame_path = handle_small_file(frame_file, frame_type)
                            if frame_path and frame_path not in image_files[frame_type]:
                                print(f"Added {frame_type} from fileData: {frame_path}")
                                image_files[frame_type].append(frame_path)
                                break
                    
                    # Also check for hidden field references
                    hidden_field_key = f'images.{frame_type}[{idx}]'
                    if hidden_field_key in form_data:
                        frame_value = form_data[hidden_field_key]
                        # If this is a reference to a previously uploaded file, add it
                        if os.path.exists(frame_value) or frame_value.startswith(('http://', 'https://')):
                            if frame_value not in image_files[frame_type]:
                                print(f"Added {frame_type} from hidden field: {frame_value}")
                                image_files[frame_type].append(frame_value)
        except json.JSONDecodeError as e:
            print(f"Error parsing images.fileData: {str(e)}")
    
    # 4. Process chunked files (if any)
    chunked_files = {}
    for key in form_data:
        if key.startswith('chunkedFiles[') and key.endswith(']'):
            file_id = key[len('chunkedFiles['):-1]
            chunked_files[file_id] = form_data[key]
    
    # Process chunked files
    for file_id, file_path in chunked_files.items():
        file_type = determine_file_type(file_id)
        if file_type in image_files:
            print(f"Adding chunked file to {file_type}: {file_path}")
            image_files[file_type].append(file_path)
        elif file_id == 'mainImage' and not main_image_path:
            main_image_path = file_path
            print(f"Set main image from chunked file: {main_image_path}")
    
    # Log the final image files collection
    for frame_type, frames in image_files.items():
        print(f"{frame_type} count: {len(frames)}")
        if frames:
            print(f"Sample {frame_type}: {frames[0]}")
    
    try:
        # 1. Create the main image record
        new_image = create_image_record(current_user.user_id, image_details, main_image_path)
        db.session.add(new_image)
        db.session.flush()  # Flush to get the image_id
        image_id = new_image.image_id

        # 2. Create related records

        # 2.1 Handle celestial objects
        object_id = image_details.get('object_id')
        if object_id:
            image_object = create_image_object_relations(image_id, object_id)
            db.session.add(image_object) 

        # 2.2 Handle Gear
        if gear_details.get('selectedGear'):
            for gear_item in gear_details.get('selectedGear'):
                gear_id = gear_item.get('gear_id')
                if gear_id:
                    image_gear = ImageGear(
                        image_id=image_id,
                        gear_id=gear_id
                    )
                    db.session.add(image_gear)

        # 2.3 Handle Session 
        if session_details:
            create_or_link_session(image_id, current_user.user_id, session_details, location_details)

        # 3. Create frame tracking records
        create_frame_records(image_id, image_files)

        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Upload completed successfully',
            'image_id': image_id
        })
        
    except Exception as e:
        db.session.rollback() 
        print(f"Error in finalize upload: {str(e)}")  # Add better logging
        return jsonify({'error': str(e)}), 500

def determine_file_type(file_id):
    """
    Determines the type of astronomical frame based on the file_id.
    
    Parameters:
        file_id (str): The identifier string for the file
        
    Returns:
        str or None: The frame type category ('lightFrames', 'darkFrames', 
                     'flatFrames', 'biasFrames', 'darkFlats') or None if undetermined
    
    Note:
        The function prioritizes certain patterns when multiple keywords are present.
        Order of priority: darkFlats > dark > flat > bias > light
    """
    if not isinstance(file_id, str):
        return None
        
    # Convert to lowercase for case-insensitive matching
    lowercase_id = file_id.lower()
    
    # Check for specialized combined frame types first
    if 'dark' in lowercase_id and 'flat' in lowercase_id:
        return 'darkFlats'
    
    # Then check for standard frame types
    if 'dark' in lowercase_id:
        return 'darkFrames'
    elif 'flat' in lowercase_id:
        return 'flatFrames'
    elif 'bias' in lowercase_id:
        return 'biasFrames'
    elif 'light' in lowercase_id:
        return 'lightFrames'
    
    # No recognized pattern
    return None

def create_frame_records(image_id, image_files):
    """Create FrameSet, FrameSummary, and RawFrame records"""
    # Create FrameSet
    new_frameset = FrameSet(
        image_id=image_id
    )
    db.session.add(new_frameset)
    db.session.flush()
    frameset_id = new_frameset.frameset_id
    
    # Track frame counts for summary
    frame_counts = {
        'lightFrames': 0,
        'darkFrames': 0,
        'flatFrames': 0, 
        'biasFrames': 0,
        'darkFlats': 0
    }
    
    # Create RawFrame records for each frame type
    for frame_type, frame_list in image_files.items():
        if frame_type in frame_counts:
            for frame_path in frame_list:
                # Skip empty paths
                if not frame_path:
                    continue

                # Check if frame_path is an object or string
                if isinstance(frame_path, dict):
                    # Extract the path from the object
                    if 'path' in frame_path:
                        frame_path = frame_path['path']
                    else:
                        continue  # Skip if no path found
                
                # Create RawFrame record
                type_mapping = {
                    'lightFrames': 'light',
                    'darkFrames': 'dark',
                    'flatFrames': 'flat',
                    'biasFrames': 'bias',
                    'darkFlats': 'dark_flat'
                }
                
                print(f"Creating RawFrame for {frame_type}: {frame_path}")
                
                raw_frame = RawFrame(
                    frameset_id=frameset_id,
                    frame_type=type_mapping[frame_type],
                    file_path=frame_path,
                    # Additional metadata could be extracted in a more sophisticated way
                    exposure_time=None,  # Default to None for now
                    iso=None,            # Default to None for now
                    temperature=None,    # Default to None for now
                    capture_time=datetime.utcnow()  # Default to now
                )
                db.session.add(raw_frame)
                
                # Increment count for this frame type
                frame_counts[frame_type] += 1
    
    # Create FrameSummary
    frame_summary = FrameSummary(
        image_id=image_id,
        light_frame_count=frame_counts['lightFrames'],
        dark_frame_count=frame_counts['darkFrames'],
        flat_frame_count=frame_counts['flatFrames'],
        bias_frame_count=frame_counts['biasFrames'],
        dark_flat_count=frame_counts['darkFlats']
    )
    db.session.add(frame_summary)
    
    # Log the frame counts
    print(f"FrameSummary counts: Light={frame_counts['lightFrames']}, Dark={frame_counts['darkFrames']}", f"Flat={frame_counts['flatFrames']}, Bias={frame_counts['biasFrames']}, DarkFlat={frame_counts['darkFlats']}")


""" def handle_small_file(file, file_type):
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
    
    return None """

def create_or_link_session(image_id, user_id, session_details, location_details):
    """Create or link a session and create ImageSession relation"""
    # Handle location first
    location_id = None
    if location_details:
        # Check if location exists
        if location_details.get('location_id'):
            location_id = location_details['location_id']
        else:
            # Create new location
            new_location = Location(
                user_id=user_id,
                name=location_details.get('name'),
                latitude=location_details.get('latitude'),
                longitude=location_details.get('longitude'),
                bortle_class=location_details.get('bortle_class'),
                notes=location_details.get('notes')
            )
            db.session.add(new_location)
            db.session.flush()
            location_id = new_location.location_id
    
    # Handle session
    session_id = None
    if session_details.get('session_id'):
        session_id = session_details['session_id']
    else:
        # Create new session
        session_date = None
        if session_details.get('session_date'):
            try:
                session_date = datetime.fromisoformat(session_details['session_date']).date()
            except ValueError:
                pass
        
        new_session = Session(
            user_id=user_id,
            session_date=session_date,
            weather_conditions=session_details.get('weather_conditions'),
            seeing_conditions=session_details.get('seeing_conditions'),
            moon_phase=session_details.get('moon_phase'),
            light_pollution_index=session_details.get('light_pollution_index'),
            location_id=location_id
        )
        db.session.add(new_session)
        db.session.flush()
        session_id = new_session.session_id
    
    # Create image-session relation
    if session_id:
        image_session = ImageSession(
            image_id=image_id,
            session_id=session_id
        )
        db.session.add(image_session)

""" def create_frame_records(image_id, image_files):
    # Create FrameSet, FrameSummary, and RawFrame records
    # Create FrameSet
    new_frameset = FrameSet(
        image_id=image_id
    )
    db.session.add(new_frameset)
    db.session.flush()
    frameset_id = new_frameset.frameset_id
    
    # Track frame counts for summary
    frame_counts = {
        'lightFrames': 0,
        'darkFrames': 0,
        'flatFrames': 0, 
        'biasFrames': 0,
        'darkFlats': 0
    }
    
    # Create RawFrame records for each frame type
    for frame_type, frame_list in image_files.items():
        if frame_type in frame_counts and isinstance(frame_list, list):
            for frame in frame_list:
                # Create RawFrame record
                type_mapping = {
                    'lightFrames': 'light',
                    'darkFrames': 'dark',
                    'flatFrames': 'flat',
                    'biasFrames': 'bias',
                    'darkFlats': 'dark_flat'
                }
                
                # Skip if not a frame type
                if frame_type not in type_mapping:
                    continue
                
                raw_frame = RawFrame(
                    frameset_id=frameset_id,
                    frame_type=type_mapping[frame_type],
                    file_path=frame['path'],
                    # Additional metadata could be extracted from the filename or form data
                    exposure_time=None,  # Could be set from metadata
                    iso=None,            # Could be set from metadata
                    temperature=None,    # Could be set from metadata
                    capture_time=datetime.utcnow()  # Default to now, but could be set from metadata
                )
                db.session.add(raw_frame)
                
                # Increment count for this frame type
                frame_counts[frame_type] += 1
    
    # Create FrameSummary
    frame_summary = FrameSummary(
        image_id=image_id,
        light_frame_count=frame_counts['lightFrames'],
        dark_frame_count=frame_counts['darkFrames'],
        flat_frame_count=frame_counts['flatFrames'],
        bias_frame_count=frame_counts['biasFrames'],
        dark_flat_count=frame_counts['darkFlats']
    )
    db.session.add(frame_summary) """

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


@api_bp.route('/images/<string:image_id>', methods=['GET'])
def get_image_detail(image_id):
    try:
        # Get the main image data
        image = Image.query.get_or_404(image_id)
        
        # Get user data
        user_data = None
        if image.user:
            user_data = {
                'user_id': image.user.user_id,
                'username': image.user.username,
                'name': image.user.name,
                'profile_image': image.user.profile_image
            }
        
        # Get celestial objects
        objects_data = []
        for img_obj in image.objects:
            obj = img_obj.object
            objects_data.append({
                'object': {
                    'object_id': obj.object_id,
                    'name': obj.name,
                    'object_type': obj.object_type,
                    'magnitude': obj.magnitude,
                    'right_ascension': obj.right_ascension,
                    'declination': obj.declination
                }
            })
        
        # Get gear used
        gear_data = []
        for img_gear in image.gear_used:
            gear = img_gear.gear
            gear_data.append({
                'gear': {
                    'gear_id': gear.gear_id,
                    'gear_type': gear.gear_type,
                    'brand': gear.brand,
                    'model': gear.model
                }
            })
        
        # Get sessions
        sessions_data = []
        for img_session in image.sessions:
            session = img_session.session
            location_data = None
            if session.location:
                location_data = {
                    'location_id': session.location.location_id,
                    'name': session.location.name,
                    'latitude': session.location.latitude,
                    'longitude': session.location.longitude,
                    'bortle_class': session.location.bortle_class
                }
            
            sessions_data.append({
                'session': {
                    'session_id': session.session_id,
                    'session_date': session.session_date.isoformat() if session.session_date else None,
                    'weather_conditions': session.weather_conditions,
                    'seeing_conditions': session.seeing_conditions,
                    'moon_phase': session.moon_phase,
                    'light_pollution_index': session.light_pollution_index,
                    'location': location_data
                }
            })
        
        # Get processing logs
        logs_data = []
        for log in image.processing_logs:
            logs_data.append({
                'log_id': log.log_id,
                'step_description': log.step_description,
                'timestamp': to_iso_timestamp(log.timestamp),
                'software_used': log.software_used,
                'notes': log.notes
            })
        
        # Get frame summary
        frame_summary_data = None
        if image.frame_summary:
            frame_summary_data = {
                'summary_id': image.frame_summary.summary_id,
                'light_frame_count': image.frame_summary.light_frame_count,
                'dark_frame_count': image.frame_summary.dark_frame_count,
                'flat_frame_count': image.frame_summary.flat_frame_count,
                'bias_frame_count': image.frame_summary.bias_frame_count,
                'dark_flat_count': image.frame_summary.dark_flat_count
            }
        
        # Get raw frames
        frameset_data = None
        if image.frameset:
            raw_frames = []
            for frame in image.frameset.raw_frames:
                raw_frames.append({
                    'frame_id': frame.frame_id,
                    'frame_type': frame.frame_type,
                    'file_path': frame.file_path,
                    'exposure_time': frame.exposure_time,
                    'iso': frame.iso,
                    'temperature': frame.temperature,
                    'capture_time': to_iso_timestamp(frame.capture_time)
                })
            
            frameset_data = {
                'frameset_id': image.frameset.frameset_id,
                'created_at': to_iso_timestamp(image.frameset.created_at),
                'raw_frames': raw_frames
            }
        
        # Compile the complete response
        data = {
            'image_id': image.image_id,
            'title': image.title,
            'description': image.description,
            'file_path': image.file_path,
            'capture_date_time': to_iso_timestamp(image.capture_date_time),
            'exposure_time': image.exposure_time,
            'iso': image.iso,
            'aperture': image.aperture,
            'focal_length': image.focal_length,
            'focus_score': image.focus_score,
            'user': user_data,
            'objects': objects_data,
            'gear_used': gear_data,
            'sessions': sessions_data,
            'processing_logs': logs_data,
            'frame_summary': frame_summary_data,
            'frameset': frameset_data
        }
        
        return jsonify(data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_image_path(image_id):
  """
  Retrieves the file path of an image from the database based on its ID.
 

  Args:
  image_id (str): The unique ID of the image.
 

  Returns:
  str: The file path of the image, or None if the image ID is not found.
  """
  image = Image.query.get(image_id)
  if image:
   return 'uploads/'+image.file_path
  return None
 

@api_bp.route('/image/<image_id>', methods=['GET'])
def get_image_by_id(image_id):
  """
  API endpoint to retrieve and send an image file based on its ID.
 

  Args:
  image_id (str): The ID of the image to retrieve.
 
  Returns:
  Response: The image file if found, or a JSON error message with a 404 status code if not found.
  """
  image_path = get_image_path(image_id)
 

  if image_path:
  # Determine the correct MIME type based on the file extension.
   try:
    # Ensure the path is absolute
    full_image_path = os.path.abspath(image_path)
    #Mimetype detection
    mime_type =  'image/jpeg' #default
    if full_image_path.lower().endswith(('.png', '.PNG')):
        mime_type = 'image/png'
    elif full_image_path.lower().endswith(('.gif', '.GIF')):
        mime_type = 'image/gif'
    elif full_image_path.lower().endswith(('.jpg', '.JPG', '.jpeg', '.JPEG')):
        mime_type = 'image/jpeg'
    return send_file(full_image_path, mimetype=mime_type)
   except Exception as e:
    return jsonify({'error': f'Error sending image: {str(e)}'}), 500
  else:
   return jsonify({'error': 'Image not found'}), 404

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


@api_bp.route('/recent-uploads', methods=['GET'])
@token_required
def get_recent_uploads(current_user):
     """
     Returns the 10 most recent image uploads with user, title, description,
     user's name, and associated celestial objects, ordered by upload date.
     """
     recent_images = Image.query.filter_by(user_id=current_user.user_id) \
         .order_by(Image.capture_date_time.desc()) \
         .limit(10) \
         .all()
 

     output = []
     for image in recent_images:
         celestial_objects = []
         for img_obj in image.objects:
             celestial_objects.append({
                 'object_id': img_obj.object.object_id,
                 'name': img_obj.object.name,
                 'object_type': img_obj.object.object_type
             })
 

         output.append({
             'image_id': image.image_id,
             'title': image.title,
             'description': image.description,
             'file_path': image.file_path,
             'upload_date': image.capture_date_time.isoformat() if image.capture_date_time else None,
             'user': {
                 'user_id': image.user.user_id,
                 'name': image.user.name,
                 'username': image.user.username
             },
             'celestial_objects': celestial_objects
         })
 

     return jsonify(recent_uploads=output)