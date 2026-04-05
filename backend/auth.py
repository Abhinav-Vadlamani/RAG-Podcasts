from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth = Blueprint('auth', __name__)

@auth.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409

    user = User()
    user.username = data['username']
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'status': 'success'}), 201

@auth.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = create_access_token(identity=str(user.id))
    response = make_response(jsonify({'status': 'success', 'username': user.username}))
    response.set_cookie(
        'access_token', token,
        httponly=True,
        secure=False,    # set True in production (requires HTTPS)
        samesite='Lax',
        max_age=60 * 60 * 24
    )
    return response

@auth.route('/api/auth/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'status': 'success'}))
    response.delete_cookie('access_token')
    return response

@auth.route('/api/auth/me', methods=['GET'])
@jwt_required(locations=['cookies'])
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'id': user.id, 'username': user.username})
