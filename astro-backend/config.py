import os

class Config:
    SECRET_KEY = 'secretkey'  # change this in production
    SQLALCHEMY_DATABASE_URI = 'sqlite:///astro_catalog.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
