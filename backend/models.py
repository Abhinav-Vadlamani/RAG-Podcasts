from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    chats         = db.relationship('ChatModel', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class ChatModel(db.Model):
    __tablename__ = 'chats'
    id            = db.Column(db.String, primary_key=True)
    title         = db.Column(db.String(200), default='New Chat')
    podcast_title = db.Column(db.String(200), default='')
    feed_url      = db.Column(db.String(500), default='')
    messages        = db.Column(db.JSON, default=list)
    loaded_episodes = db.Column(db.JSON, default=list)
    created_at      = db.Column(db.DateTime, default=db.func.now())
    updated_at      = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
