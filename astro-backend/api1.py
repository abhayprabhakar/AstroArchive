from flask import Blueprint, jsonify, request, current_app
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from functools import wraps
import jwt
from .models import User, ImageSession, ProcessingLog, FrameSummary, FrameSet, RawFrame, Image, CelestialObject, Gear, Location, Session

api_bp = Blueprint('api', __name__, url_prefix='/api')
db = SQLAlchemy()  # Assuming your db instance is available here

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Bearer token not found'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            print(f"Token decoding error: {e}")
            return jsonify({'message': 'Something went wrong with the token'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

def to_iso_timestamp(dt):
    return dt.isoformat() + 'Z'

# ---------------------------- Location API ----------------------------
@api_bp.route('/locations', methods=['GET'])
@token_required
def get_locations(current_user):
    try:
        locations = Location.query.all()
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
        location = Location.query.get_or_404(location_id)
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
        location = Location.query.get_or_404(location_id)
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
        location = Location.query.get_or_404(location_id)
        db.session.delete(location)
        db.session.commit()
        return jsonify({'message': 'Location deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- User API (Limited - for potential future use) ----------------------------
@api_bp.route('/users/<string:user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    if current_user.user_id != user_id:
        return jsonify({'message': 'Unauthorized to access this user'}), 403
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

# ---------------------------- Image API ----------------------------
@api_bp.route('/images', methods=['GET'])
@token_required
def get_images(current_user):
    try:
        images = Image.query.filter_by(user_id=current_user.user_id).all()
        data = [{
            'image_id': img.image_id,
            'title': img.title,
            'description': img.description,
            'file_path': img.file_path,
            'capture_date_time': to_iso_timestamp(img.capture_date_time) if img.capture_date_time else None,
            'exposure_time': img.exposure_time,
            'iso': img.iso,
            'aperture': img.aperture,
            'focal_length': img.focal_length,
            'focus_score': img.focus_score
        } for img in images]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/images/<string:image_id>', methods=['GET'])
@token_required
def get_image(current_user, image_id):
    try:
        image = Image.query.filter_by(image_id=image_id, user_id=current_user.user_id).first_or_404()
        data = {
            'image_id': image.image_id,
            'title': image.title,
            'description': image.description,
            'file_path': image.file_path,
            'capture_date_time': to_iso_timestamp(image.capture_date_time) if image.capture_date_time else None,
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
@token_required
def create_image(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_image = Image(
            user_id=current_user.user_id,
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
@token_required
def update_image(current_user, image_id):
    try:
        image = Image.query.filter_by(image_id=image_id, user_id=current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

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
@token_required
def delete_image(current_user, image_id):
    try:
        image = Image.query.filter_by(image_id=image_id, user_id=current_user.user_id).first_or_404()
        db.session.delete(image)
        db.session.commit()
        return jsonify({'message': 'Image deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- CelestialObject API ----------------------------
@api_bp.route('/celestial_objects', methods=['GET'])
@token_required
def get_celestial_objects(current_user):
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

@api_bp.route('/celestial_objects/<string:object_id>', methods=['GET'])
@token_required
def get_celestial_object(current_user, object_id):
    try:
        celestial_object = CelestialObject.query.get_or_404(object_id)
        data = {
            'object_id': celestial_object.object_id,
            'name': celestial_object.name,
            'object_type': celestial_object.object_type,
            'right_ascension': celestial_object.right_ascension,
            'declination': celestial_object.declination,
            'magnitude': celestial_object.magnitude,
            'description': celestial_object.description
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/celestial_objects', methods=['POST'])
@token_required
def create_celestial_object(current_user):
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
@token_required
def update_celestial_object(current_user, object_id):
    try:
        celestial_object = CelestialObject.query.get_or_404(object_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        celestial_object.name = data.get('name', celestial_object.name)
        celestial_object.object_type = data.get('object_type', celestial_object.object_type)
        celestial_object.right_ascension = data.get('right_ascension', celestial_object.right_ascension)
        celestial_object.declination = data.get('declination', celestial_object.declination)
        celestial_object.magnitude = data.get('magnitude', celestial_object.magnitude)
        celestial_object.description = data.get('description', celestial_object.description)

        db.session.commit()
        return jsonify({'message': 'CelestialObject updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/celestial_objects/<string:object_id>', methods=['DELETE'])
@token_required
def delete_celestial_object(current_user, object_id):
    try:
        celestial_object = CelestialObject.query.get_or_404(object_id)
        db.session.delete(celestial_object)
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
        gear = Gear.query.filter_by(user_id=current_user.user_id).all()
        data = [{
            'gear_id': g.gear_id,
            'gear_type': g.gear_type,
            'brand': g.brand,
            'model': g.model
        } for g in gear]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear/<string:gear_id>', methods=['GET'])
@token_required
def get_single_gear(current_user, gear_id):
    try:
        gear = Gear.query.filter_by(gear_id=gear_id, user_id=current_user.user_id).first_or_404()
        data = {
            'gear_id': gear.gear_id,
            'gear_type': gear.gear_type,
            'brand': gear.brand,
            'model': gear.model
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear', methods=['POST'])
@token_required
def create_new_gear(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        new_gear = Gear(
            user_id=current_user.user_id,
            gear_type=data.get('gear_type'),
            brand=data.get('brand'),
            model=data.get('model')
        )
        db.session.add(new_gear)
        db.session.commit()
        return jsonify({'message': 'Gear created successfully', 'gear_id': new_gear.gear_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear/<string:gear_id>', methods=['PUT'])
@token_required
def update_gear(current_user, gear_id):
    try:
        gear = Gear.query.filter_by(gear_id=gear_id, user_id=current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        gear.gear_type = data.get('gear_type', gear.gear_type)
        gear.brand = data.get('brand', gear.brand)
        gear.model = data.get('model', gear.model)

        db.session.commit()
        return jsonify({'message': 'Gear updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gear/<string:gear_id>', methods=['DELETE'])
@token_required
def delete_gear(current_user, gear_id):
    try:
        gear = Gear.query.filter_by(gear_id=gear_id, user_id=current_user.user_id).first_or_404()
        db.session.delete(gear)
        db.session.commit()
        return jsonify({'message': 'Gear deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- Session API ----------------------------
@api_bp.route('/sessions', methods=['GET'])
@token_required
def get_sessions(current_user):
    try:
        sessions = Session.query.filter_by(user_id=current_user.user_id).all()
        data = [{
            'session_id': s.session_id,
            'session_date': str(s.session_date),
            'weather_conditions': s.weather_conditions,
            'seeing_conditions': s.seeing_conditions,
            'moon_phase': s.moon_phase,
            'light_pollution_index': s.light_pollution_index,
            'location_id': s.location_id
        } for s in sessions]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['GET'])
@token_required
def get_session(current_user, session_id):
    try:
        session = Session.query.filter_by(session_id=session_id, user_id=current_user.user_id).first_or_404()
        data = {
            'session_id': session.session_id,
            'session_date': str(session.session_date),
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
            user_id=current_user.user_id,
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
        session = Session.query.filter_by(session_id=session_id, user_id=current_user.user_id).first_or_404()
        db.session.delete(session)
        db.session.commit()
        return jsonify({'message': 'Session deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- ProcessingLog API ----------------------------
@api_bp.route('/processing_logs', methods=['GET'])
@token_required
def get_processing_logs(current_user):
    try:
        processing_logs = ProcessingLog.query.join(Image).filter(Image.user_id == current_user.user_id).all()
        data = [{
            'log_id': log.log_id,
            'image_id': log.image_id,
            'step_description': log.step_description,
            'timestamp': to_iso_timestamp(log.timestamp),
            'software_used': log.software_used,
            'notes': log.notes
        } for log in processing_logs]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs/<string:log_id>', methods=['GET'])
@token_required
def get_processing_log(current_user, log_id):
    try:
        log = ProcessingLog.query.join(Image).filter(ProcessingLog.log_id == log_id, Image.user_id == current_user.user_id).first_or_404()
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
@token_required
def create_processing_log(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        image_id = data.get('image_id')
        image = Image.query.filter_by(image_id=image_id, user_id=current_user.user_id).first_or_404()

        new_log = ProcessingLog(
            image_id=image.image_id,
            step_description=data.get('step_description'),
            timestamp=datetime.utcnow(),
            software_used=data.get('software_used'),
            notes=data.get('notes')
        )
        db.session.add(new_log)
        db.session.commit()
        return jsonify({'message': 'Processing log created successfully', 'log_id': new_log.log_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs/<string:log_id>', methods=['PUT'])
@token_required
def update_processing_log(current_user, log_id):
    try:
        log = ProcessingLog.query.join(Image).filter(ProcessingLog.log_id == log_id, Image.user_id == current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        log.step_description = data.get('step_description', log.step_description)
        log.software_used = data.get('software_used', log.software_used)
        log.notes = data.get('notes', log.notes)

        db.session.commit()
        return jsonify({'message': 'Processing log updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/processing_logs/<string:log_id>', methods=['DELETE'])
@token_required
def delete_processing_log(current_user, log_id):
    try:
        log = ProcessingLog.query.join(Image).filter(ProcessingLog.log_id == log_id, Image.user_id == current_user.user_id).first_or_404()
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'Processing log deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- FrameSummary API ----------------------------
@api_bp.route('/frame_summaries', methods=['GET'])
@token_required
def get_frame_summaries(current_user):
    try:
        frame_summaries = FrameSummary.query.join(Image).filter(Image.user_id == current_user.user_id).all()
        data = [{
            'summary_id': summary.summary_id,
            'image_id': summary.image_id,
            'light_frame_count': summary.light_frame_count,
            'dark_frame_count': summary.dark_frame_count,
            'flat_frame_count': summary.flat_frame_count,
            'bias_frame_count': summary.bias_frame_count,
            'dark_flat_count': summary.dark_flat_count
        } for summary in frame_summaries]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries/<string:summary_id>', methods=['GET'])
@token_required
def get_frame_summary(current_user, summary_id):
    try:
        summary = FrameSummary.query.join(Image).filter(FrameSummary.summary_id == summary_id, Image.user_id == current_user.user_id).first_or_404()
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
@token_required
def create_frame_summary(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        image_id = data.get('image_id')
        image = Image.query.filter_by(image_id=image_id, user_id=current_user.user_id).first_or_404()

        new_summary = FrameSummary(
            image_id=image.image_id,
            light_frame_count=data.get('light_frame_count'),
            dark_frame_count=data.get('dark_frame_count'),
            flat_frame_count=data.get('flat_frame_count'),
            bias_frame_count=data.get('bias_frame_count'),
            dark_flat_count=data.get('dark_flat_count')
        )
        db.session.add(new_summary)
        db.session.commit()
        return jsonify({'message': 'Frame summary created successfully', 'summary_id': new_summary.summary_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries/<string:summary_id>', methods=['PUT'])
@token_required
def update_frame_summary(current_user, summary_id):
    try:
        summary = FrameSummary.query.join(Image).filter(FrameSummary.summary_id == summary_id, Image.user_id == current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        summary.light_frame_count = data.get('light_frame_count', summary.light_frame_count)
        summary.dark_frame_count = data.get('dark_frame_count', summary.dark_frame_count)
        summary.flat_frame_count = data.get('flat_frame_count', summary.flat_frame_count)
        summary.bias_frame_count = data..get('bias_frame_count', summary.bias_frame_count)
        summary.dark_flat_count = data.get('dark_flat_count', summary.dark_flat_count)

        db.session.commit()
        return jsonify({'message': 'Frame summary updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/frame_summaries/<string:summary_id>', methods=['DELETE'])
@token_required
def delete_frame_summary(current_user, summary_id):
    try:
        summary = FrameSummary.query.join(Image).filter(FrameSummary.summary_id == summary_id, Image.user_id == current_user.user_id).first_or_404()
        db.session.delete(summary)
        db.session.commit()
        return jsonify({'message': 'Frame summary deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- FrameSet API ----------------------------
@api_bp.route('/framesets', methods=['GET'])
@token_required
def get_framesets(current_user):
    try:
        framesets = FrameSet.query.join(Image).filter(Image.user_id == current_user.user_id).all()
        data = [{
            'frameset_id': frameset.frameset_id,
            'image_id': frameset.image_id,
            'created_at': to_iso_timestamp(frameset.created_at)
        } for frameset in framesets]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/framesets/<string:frameset_id>', methods=['GET'])
@token_required
def get_frameset(current_user, frameset_id):
    try:
        frameset = FrameSet.query.join(Image).filter(FrameSet.frameset_id == frameset_id, Image.user_id == current_user.user_id).first_or_404()
        data = {
            'frameset_id': frameset.frameset_id,
            'image_id': frameset.image_id,
            'created_at': to_iso_timestamp(frameset.created_at)
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/framesets', methods=['POST'])
@token_required
def create_frameset(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        image_id = data.get('image_id')
        image = Image.query.filter_by(image_id=image_id, user_id=current_user.user_id).first_or_404()

        new_frameset = FrameSet(
            image_id=image.image_id,
            created_at=datetime.utcnow()
        )
        db.session.add(new_frameset)
        db.session.commit()
        return jsonify({'message': 'Frameset created successfully', 'frameset_id': new_frameset.frameset_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/framesets/<string:frameset_id>', methods=['DELETE'])
@token_required
def delete_frameset(current_user, frameset_id):
    try:
        frameset = FrameSet.query.join(Image).filter(FrameSet.frameset_id == frameset_id, Image.user_id == current_user.user_id).first_or_404()
        db.session.delete(frameset)
        db.session.commit()
        return jsonify({'message': 'Frameset deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ---------------------------- RawFrame API ----------------------------
@api_bp.route('/raw_frames', methods=['GET'])
@token_required
def get_raw_frames(current_user):
    try:
        raw_frames = RawFrame.query.join(FrameSet).join(Image).filter(Image.user_id == current_user.user_id).all()
        data = [{
            'frame_id': frame.frame_id,
            'frameset_id': frame.frameset_id,
            'frame_type': frame.frame_type,
            'file_path': frame.file_path,
            'exposure_time': frame.exposure_time,
            'iso': frame.iso,
            'temperature': frame.temperature,
            'capture_time': to_iso_timestamp(frame.capture_time) if frame.capture_time else None
        } for frame in raw_frames]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames/<string:frame_id>', methods=['GET'])
@token_required
def get_raw_frame(current_user, frame_id):
    try:
        raw_frame = RawFrame.query.join(FrameSet).join(Image).filter(RawFrame.frame_id == frame_id, Image.user_id == current_user.user_id).first_or_404()
        data = {
            'frame_id': frame.frame_id,
            'frameset_id': frame.frameset_id,
            'frame_type': frame.frame_type,
            'file_path': frame.file_path,
            'exposure_time': frame.exposure_time,
            'iso': frame.iso,
            'temperature': frame.temperature,
            'capture_time': to_iso_timestamp(frame.capture_time) if frame.capture_time else None
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames', methods=['POST'])
@token_required
def create_raw_frame(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        frameset_id = data.get('frameset_id')
        frameset = FrameSet.query.join(Image).filter(FrameSet.frameset_id == frameset_id, Image.user_id == current_user.user_id).first_or_404()

        new_frame = RawFrame(
            frameset_id=frameset.frameset_id,
            frame_type=data.get('frame_type'),
            file_path=data.get('file_path'),
            exposure_time=data.get('exposure_time'),
            iso=data.get('iso'),
            temperature=data.get('temperature'),
            capture_time=datetime.fromisoformat(data.get('capture_time')) if data.get('capture_time') else None
        )
        db.session.add(new_frame)
        db.session.commit()
        return jsonify({'message': 'Raw frame created successfully', 'frame_id': new_frame.frame_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames/<string:frame_id>', methods=['PUT'])
@token_required
def update_raw_frame(current_user, frame_id):
    try:
        frame = RawFrame.query.join(FrameSet).join(Image).filter(RawFrame.frame_id == frame_id, Image.user_id == current_user.user_id).first_or_404()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        frame.frame_type = data.get('frame_type', frame.frame_type)
        frame.file_path = data.get('file_path', frame.file_path)
        frame.exposure_time = data.get('exposure_time', frame.exposure_time)
        frame.iso = data.get('iso', frame.iso)
        frame.temperature = data.get('temperature', frame.temperature)
        frame.capture_time = datetime.fromisoformat(data.get('capture_time')) if data.get('capture_time') else frame.capture_time

        db.session.commit()
        return jsonify({'message': 'Raw frame updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/raw_frames/<string:frame_id>', methods=['DELETE'])
@token_required
def delete_raw_frame(current_user, frame_id):
    try:
        frame = RawFrame.query.join(FrameSet).join(Image).filter(RawFrame.frame_id == frame_id, Image.user_id == current_user.user_id).first_or_404()
        db.session.delete(frame)
        db.session.commit()
        return jsonify({'message': 'Raw frame deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500