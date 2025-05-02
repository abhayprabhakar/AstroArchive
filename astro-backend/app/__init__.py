from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config
from flask_cors import CORS  # Import the CORS extension
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView



db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    

    db.init_app(app)
    migrate.init_app(app, db)

    CORS(app)

    from .routes import bp
    app.register_blueprint(bp)
    from .models import User, CelestialObject, Gear, Location, Session, Image, ImageObject, ImageGear, ImageSession, ProcessingLog, FrameSummary, FrameSet, RawFrame
    # Register model views
    admin = Admin(app, name='Astrophotography Admin Panel', template_mode='bootstrap3')

    # Add views for each model
    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(CelestialObject, db.session))
    admin.add_view(ModelView(Gear, db.session))
    admin.add_view(ModelView(Location, db.session))
    admin.add_view(ModelView(Session, db.session))
    admin.add_view(ModelView(Image, db.session))
    admin.add_view(ModelView(ImageObject, db.session))
    admin.add_view(ModelView(ImageGear, db.session))
    admin.add_view(ModelView(ImageSession, db.session))
    admin.add_view(ModelView(ProcessingLog, db.session))
    admin.add_view(ModelView(FrameSummary, db.session))
    admin.add_view(ModelView(FrameSet, db.session))
    admin.add_view(ModelView(RawFrame, db.session))

    return app