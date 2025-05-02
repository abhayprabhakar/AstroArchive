# --- In your main Flask app file (e.g., app.py or routes.py) ---

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy  # Assuming you have this initialized
from flask_cors import CORS  # For handling Cross-Origin requests from React
from werkzeug.security import check_password_hash  # To verify passwords
from flask import Blueprint
import jwt
from .models import *
from sqlalchemy import or_
from datetime import datetime, timedelta
from flask import current_app


bp = Blueprint('main', __name__)



# --- Mock User Model and db for standalone example ---
# Replace this with your actual imports: from .models import User, db
""" class User:
    @staticmethod
    def query():
        class Query:
            def filter_by(self, email):
                class FirstResult:
                    def first(inner_self):
                        if email == 'test@example.com':
                            user = User()
                            user.email = 'test@example.com'
                            user.password_hash = 'scrypt:32768:8:1$H9wEA12DtKUjA2YN$1408e516e253a1abee6b80225de6ded02f1ce708e1211bf5246cf91dc03fce01f93a731b2288b1449ca56c0c339550fa7ddd14211112f28fea64c45930cc3d40'
                            return user
                        return None
                return FirstResult()
        return Query() """



def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query().get(data['user_id'])
        except:
            return jsonify({'message': 'Token is invalid or expired'}), 401

        return f(current_user, *args, **kwargs)

    return decorated



@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter(or_(User.username == data['username'], User.email == data['email'])).first():
        return jsonify({'message': 'Username or email already exists'}), 400

    hashed_password = User.hash_password(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        password_hash=hashed_password,
        name=data['name'],
        location=data.get('location'),
        profile_image=data.get('profile_image')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201



@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()

    if user and check_password_hash(user.password_hash, data['password']):
        token = jwt.encode(
            {
                'user_id': user.user_id,
                'exp': datetime.utcnow() + timedelta(hours=2)
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        user.last_login = datetime.utcnow()
        db.session.commit()
        return jsonify({'token': token}), 200

    return jsonify({'message': 'Invalid credentials'}), 401

