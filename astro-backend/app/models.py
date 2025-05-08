from . import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

# User table
class User(db.Model):

    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(100))
    profile_image = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    name = db.Column(db.String(64), nullable=False)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    
    images = db.relationship('Image', backref='user', lazy=True)
    sessions = db.relationship('Session', backref='user', lazy=True)
    gear = db.relationship('Gear', backref='user', lazy=True)

    # Query method to fetch user by email
    @staticmethod
    def query_by_email(email):
        return User.query.filter_by(email=email).first()

    # Password verification
    @staticmethod
    def verify_password(plain_password, hashed_password):
        return check_password_hash(hashed_password, plain_password)

    # Password hashing (used for registration)
    @staticmethod
    def hash_password(password):
        return generate_password_hash(password)

# Celestial Objects
class CelestialObject(db.Model):
    object_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    object_type = db.Column(db.String(50))
    right_ascension = db.Column(db.Float)
    declination = db.Column(db.Float)
    magnitude = db.Column(db.Float)
    description = db.Column(db.Text)

    images = db.relationship('ImageObject', back_populates='object')

# Gear
class Gear(db.Model):
    gear_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.user_id'))
    gear_type = db.Column(db.String(50))
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))

    images = db.relationship('ImageGear', back_populates='gear')

# Locations
class Location(db.Model):
    location_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.user_id'))
    name = db.Column(db.String(100))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    bortle_class = db.Column(db.Integer)
    notes = db.Column(db.Text)

    sessions = db.relationship('Session', backref='location', lazy=True)

# Observation Sessions
class Session(db.Model):
    session_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.user_id'))
    session_date = db.Column(db.Date)
    weather_conditions = db.Column(db.Text)
    seeing_conditions = db.Column(db.Text)
    moon_phase = db.Column(db.String(50))
    light_pollution_index = db.Column(db.Integer)
    location_id = db.Column(db.String(36), db.ForeignKey('location.location_id'))

    images = db.relationship('ImageSession', back_populates='session')

# Main Image table
class Image(db.Model):
    image_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.user_id'), nullable=False)
    title = db.Column(db.String(100))
    description = db.Column(db.Text)
    file_path = db.Column(db.Text)
    capture_date_time = db.Column(db.DateTime)
    exposure_time = db.Column(db.Float)
    iso = db.Column(db.Integer)
    aperture = db.Column(db.Float)
    focal_length = db.Column(db.Float)
    focus_score = db.Column(db.Float)

    objects = db.relationship('ImageObject', back_populates='image')
    gear_used = db.relationship('ImageGear', back_populates='image')
    sessions = db.relationship('ImageSession', back_populates='image')
    processing_logs = db.relationship('ProcessingLog', backref='image', lazy=True)
    frameset = db.relationship('FrameSet', backref='image', uselist=False)
    frame_summary = db.relationship('FrameSummary', backref='image', uselist=False)

# Image–Object (many-to-many)
class ImageObject(db.Model):
    image_id = db.Column(db.String(36), db.ForeignKey('image.image_id'), primary_key=True)
    object_id = db.Column(db.String(36), db.ForeignKey('celestial_object.object_id'), primary_key=True)

    image = db.relationship('Image', back_populates='objects')
    object = db.relationship('CelestialObject', back_populates='images')

# Image–Gear (many-to-many)
class ImageGear(db.Model):
    image_id = db.Column(db.String(36), db.ForeignKey('image.image_id'), primary_key=True)
    gear_id = db.Column(db.String(36), db.ForeignKey('gear.gear_id'), primary_key=True)

    image = db.relationship('Image', back_populates='gear_used')
    gear = db.relationship('Gear', back_populates='images')

# Image–Session (many-to-many)
class ImageSession(db.Model):
    image_id = db.Column(db.String(36), db.ForeignKey('image.image_id'), primary_key=True)
    session_id = db.Column(db.String(36), db.ForeignKey('session.session_id'), primary_key=True)

    image = db.relationship('Image', back_populates='sessions')
    session = db.relationship('Session', back_populates='images')

# Processing log
class ProcessingLog(db.Model):
    log_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    image_id = db.Column(db.String(36), db.ForeignKey('image.image_id'))
    step_description = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    software_used = db.Column(db.String(100))
    notes = db.Column(db.Text)

# Frame summary per image (optional)
class FrameSummary(db.Model):
    summary_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    image_id = db.Column(db.String(36), db.ForeignKey('image.image_id'), unique=True)
    light_frame_count = db.Column(db.Integer)
    dark_frame_count = db.Column(db.Integer)
    flat_frame_count = db.Column(db.Integer)
    bias_frame_count = db.Column(db.Integer)
    dark_flat_count = db.Column(db.Integer)

# Raw frame tracking
class FrameSet(db.Model):
    frameset_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    image_id = db.Column(db.String(36), db.ForeignKey('image.image_id'), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    raw_frames = db.relationship('RawFrame', backref='frameset', lazy=True)

class RawFrame(db.Model):
    frame_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    frameset_id = db.Column(db.String(36), db.ForeignKey('frame_set.frameset_id'))
    frame_type = db.Column(db.String(20))  # light, dark, flat, bias, dark_flat
    file_path = db.Column(db.Text)
    exposure_time = db.Column(db.Float)
    iso = db.Column(db.Integer)
    temperature = db.Column(db.Float)
    capture_time = db.Column(db.DateTime)