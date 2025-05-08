from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config
from flask_cors import CORS  # Import the CORS extension
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView



db = SQLAlchemy()
migrate = Migrate()


# Custom ModelView class that shows all columns, including primary and foreign keys
class EnhancedModelView(ModelView):
    column_display_pk = True  # Display primary key columns
    column_display_all_relations = True  # Show all relations
    column_list = None  # Will be set to all columns in the model during initialization
    
    def __init__(self, model, session, **kwargs):
        # Get all column names from the model
        self.column_list = [column.key for column in model.__table__.columns]
        super(EnhancedModelView, self).__init__(model, session, **kwargs)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    

    db.init_app(app)
    migrate.init_app(app, db)

    CORS(app)

    from .routes import bp
    app.register_blueprint(bp)
    from api import api_bp  # Import the api blueprint
    app.register_blueprint(api_bp, url_prefix='/api')
    from .models import User, CelestialObject, Gear, Location, Session, Image, ImageObject, ImageGear, ImageSession, ProcessingLog, FrameSummary, FrameSet, RawFrame
    # Register model views
    admin = Admin(app, name='Astrophotography Admin Panel', template_mode='bootstrap3')

    # Add enhanced views for each model that show all columns including PKs and FKs
    admin.add_view(EnhancedModelView(User, db.session))
    admin.add_view(EnhancedModelView(CelestialObject, db.session))
    admin.add_view(EnhancedModelView(Gear, db.session))
    admin.add_view(EnhancedModelView(Location, db.session))
    admin.add_view(EnhancedModelView(Session, db.session))
    admin.add_view(EnhancedModelView(Image, db.session))
    admin.add_view(EnhancedModelView(ImageObject, db.session))
    admin.add_view(EnhancedModelView(ImageGear, db.session))
    admin.add_view(EnhancedModelView(ImageSession, db.session))
    admin.add_view(EnhancedModelView(ProcessingLog, db.session))
    admin.add_view(EnhancedModelView(FrameSummary, db.session))
    admin.add_view(EnhancedModelView(FrameSet, db.session))
    admin.add_view(EnhancedModelView(RawFrame, db.session))

    return app