from flask import Flask, render_template, request, jsonify, send_from_directory, g, abort, redirect, url_for, flash
import os
import json
import stripe
import uuid
from datetime import datetime, date, time, timedelta
from sqlalchemy import create_engine, func, text, and_
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base, User, Appointment, CheckupType, Specialist, HealthFact
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from email_service import send_appointment_confirmation

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
DOMAIN = os.environ.get('REPLIT_DEV_DOMAIN', '34.143.166.2:5000')

app = Flask(__name__)
app.secret_key = os.environ.get(
    "FLASK_SECRET_KEY") or "a_secure_secret_key_for_session"

# Database Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")

# Configure engine with connection pool settings for better stability and reconnection
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,  # Recycle connections after 5 minutes
    pool_pre_ping=True,  # Check connection validity before using
    pool_timeout=30,  # Wait up to 30s for a connection from the pool
    connect_args={
        "connect_timeout": 10,  # 10 seconds connection timeout
        "keepalives": 1,  # Enable TCP keepalives
        "keepalives_idle": 60,  # Idle time before sending keepalive
        "keepalives_interval": 10,  # Keepalive interval
        "keepalives_count": 5,  # Number of keepalives before giving up
    })

session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

# Ensure tables are created
Base.metadata.create_all(engine)

# Flask-Login configuration
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


@login_manager.user_loader
def load_user(user_id):
    try:
        session = Session()
        user = session.query(User).get(int(user_id))
        return user
    except Exception as e:
        print(f"Error loading user: {str(e)}")
        return None
    finally:
        session.close()


@app.teardown_appcontext
def cleanup(resp_or_exc):
    """Close the database session after each request."""
    Session.remove()


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return send_from_directory('.', 'login.html')

    if request.method == 'POST':
        session = Session()
        try:
            data = request.json
            username = data.get('username')
            password = data.get('password')

            if not username or not password:
                return jsonify({"error": "Missing username or password"}), 400

            # Find the user
            try:
                user = session.query(User).filter_by(username=username).first()
            except Exception as e:
                print(f"Database error when finding user: {str(e)}")
                return jsonify(
                    {"error":
                     "Database connection error. Please try again."}), 500

            # Check if user exists and password matches
            if user:
                password_matches = False
                try:
                    if user.password.startswith('$2'):  # Check if it's a bcrypt hash
                        app.logger.info("Using bcrypt verification")
                        password_matches = check_password_hash(user.password, password)
                    elif user.password.startswith('scrypt:'):  # Add this check for scrypt
                        app.logger.info("Using scrypt verification")
                        # You'll need to use the appropriate scrypt verification function
                        # This depends on what library you used to generate the hash
                        from werkzeug.security import check_password_hash
                        password_matches = check_password_hash(user.password, password)
                    else:
                        app.logger.info("Using plaintext comparison")
                        password_matches = (user.password == password)
                    app.logger.info(f"Password match: {password_matches}")
                except Exception as e:
                    app.logger.error(f"Password verification error: {str(e)}")
                    password_matches = (user.password == password)
                    app.logger.info(f"Fallback password match: {password_matches}")

                if password_matches:
                    login_user(user)

                    # Redirect based on user type
                    user_data = {
                        "user_id": user.user_id,
                        "user_name": user.user_name,
                        "user_type": user.user_type
                    }

                    if user.user_type == 'Admin':
                        return jsonify({
                            "redirect": "/admin/dashboard",
                            **user_data
                        }), 200
                    else:
                        return jsonify({"redirect": "/", **user_data}), 200

            return jsonify({"error": "Invalid username or password"}), 401
        except Exception as e:
            print(f"Login error: {str(e)}")
            return jsonify(
                {"error":
                 "An error occurred during login. Please try again."}), 500
        finally:
            session.close()


@app.route('/signup', methods=['GET'])
def signup_page():
    if current_user.is_authenticated:
        if current_user.user_type == 'Admin':
            return redirect('/admin/dashboard')
        else:
            return redirect('/')

    return send_from_directory('.', 'signup.html')


@app.route('/api/signup', methods=['POST'])
def signup():
    # Import validation functions
    from validation import (validate_username, validate_name, validate_email, 
                         validate_phone, validate_password)

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Validate required fields
        required_fields = [
            'username', 'user_name', 'email', 'phone_number', 'gender',
            'birthday', 'password'
        ]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "error": f"{field.replace('_', ' ').title()} is required",
                    "field": field
                }), 400

        # Advanced validation of fields
        # Validate username
        is_valid, error_msg = validate_username(data.get('username'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "username"}), 400

        # Validate full name
        is_valid, error_msg = validate_name(data.get('user_name'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "user_name"}), 400

        # Validate email
        is_valid, error_msg = validate_email(data.get('email'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "email"}), 400

        # Validate phone
        is_valid, error_msg = validate_phone(data.get('phone_number'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "phone_number"}), 400

        # Validate password
        is_valid, error_msg = validate_password(data.get('password'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "password"}), 400

        # Validate password confirmation if provided
        if 'confirm_password' in data and data['password'] != data['confirm_password']:
            return jsonify({"error": "Passwords do not match", "field": "confirm_password"}), 400

        # Check if email or username already exists
        existing_email = session.query(User).filter(
            User.email == data.get('email')).first()
        if existing_email:
            return jsonify({"error": "Email already in use", "field": "email"}), 400

        existing_username = session.query(User).filter(
            User.username == data.get('username')).first()
        if existing_username:
            return jsonify({"error": "Username already in use", "field": "username"}), 400

        # Convert phone number to BigInteger
        try:
            phone_number = int(data.get('phone_number'))
        except ValueError:
            return jsonify({"error": "Invalid phone number format", "field": "phone_number"}), 400

        # Parse date
        try:
            birthday = datetime.strptime(data.get('birthday'),
                                         "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format for birthday", "field": "birthday"}), 400

        # Create new user
        new_user = User(
            user_name=data.get('user_name'),
            gender=data.get('gender'),
            birthday=birthday,
            phone_number=phone_number,
            email=data.get('email'),
            username=data.get('username'),
            password=generate_password_hash(
                data.get('password')),  # Hash the password for security
            user_type=data.get('user_type', 'Normal')  # Default to Normal user
        )

        session.add(new_user)
        session.commit()

        # Log successful registration
        print(f"User registered successfully: {new_user.username} (ID: {new_user.user_id})")

        return jsonify({
            'user_id': new_user.user_id,
            'user_name': new_user.user_name,
            'message': 'Registration successful'
        }), 201

    except Exception as e:
        session.rollback()
        print(f"Error in signup: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login')


@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    if not current_user.is_authenticated or current_user.user_type != 'Admin':
        return redirect('/login')
    return send_from_directory('.', 'dashboard.html')


@app.route('/admin/checkup-types')
@login_required
def admin_checkup_types():
    if not current_user.is_authenticated or current_user.user_type != 'Admin':
        return redirect('/login')
    return send_from_directory('.', 'checkup_types.html')


@app.route('/admin/specialists')
@login_required
def admin_specialists():
    if not current_user.is_authenticated or current_user.user_type != 'Admin':
        return redirect('/login')
    return send_from_directory('.', 'specialists.html')


@app.route('/admin/health-facts')
@login_required
def admin_health_facts():
    if not current_user.is_authenticated or current_user.user_type != 'Admin':
        return redirect('/login')
    return send_from_directory('.', 'health_facts.html')


@app.route('/admin/users')
@login_required
def admin_users():
    if not current_user.is_authenticated or current_user.user_type != 'Admin':
        return redirect('/login')
    return send_from_directory('.', 'users.html')


@app.route('/admin/appointments')
@login_required
def admin_appointments():
    if not current_user.is_authenticated or current_user.user_type != 'Admin':
        return redirect('/login')
    return send_from_directory('.', 'appointments.html')


@app.route('/user/home')
@login_required
def user_home():
    if not current_user.is_authenticated:
        return redirect('/login')
    return redirect('/')


@app.route('/user/specialist')
@login_required
def user_specialist():
    if not current_user.is_authenticated:
        return redirect('/login')
    return send_from_directory('.', 'user_specialist.html')


@app.route('/user/appointment')
@login_required
def user_appointment():
    if not current_user.is_authenticated:
        return redirect('/login')
    return send_from_directory('.', 'user_appointment.html')


@app.route('/user/pregnancy-calculator')
@login_required
def user_pregnancy_calculator():
    if not current_user.is_authenticated:
        return redirect('/login')
    return send_from_directory('.', 'user_pregnancy_calculator.html')


@app.route('/user/view-appointment')
@login_required
def user_view_appointment():
    if not current_user.is_authenticated:
        return redirect('/login')
    return send_from_directory('.', 'user_view_appointment.html')


@app.route('/payment')
@login_required
def payment_page():
    if not current_user.is_authenticated:
        return redirect('/login')
    return send_from_directory('.', 'payment.html')


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded files."""
    # Extract the directory part from the filename
    parts = filename.split('/')
    if len(parts) > 1:
        directory = os.path.join('uploads', os.path.dirname(filename))
        basename = os.path.basename(filename)
        return send_from_directory(directory, basename)
    else:
        return send_from_directory('uploads', filename)


@app.route('/<path:path>')
def serve_file(path):
    # Always allow static asset types regardless of their path
    if '/assets/' in path or path.startswith('assets/') or \
       '/css/' in path or path.startswith('css/') or \
       '/js/' in path or path.startswith('js/') or \
       '/uploads/' in path or path.startswith('uploads/'):
        # This is a static asset, serve it directly
        return send_from_directory('.', path)

    # Don't serve protected routes through the general handler
    if path.startswith('admin/') or path.startswith('user/'):
        return redirect('/login')

    # Standard path handling
    return send_from_directory('.', path)


# API Routes
@app.route('/api/users', methods=['GET'])
def get_users():
    session = Session()
    try:
        # Filter by user_type if specified
        user_type = request.args.get('user_type')

        query = session.query(User)
        if user_type:
            query = query.filter(User.user_type == user_type)

        users = query.all()
        return jsonify([{
            'user_id': user.user_id,
            'user_name': user.user_name,
            'gender': user.gender,
            'email': user.email,
            'username': user.username,
            'user_type': user.user_type
        } for user in users])
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        return jsonify(
            {"error":
             "Failed to retrieve users. Database connection error."}), 500
    finally:
        session.close()


@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = Session().query(User).get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        'user_id': user.user_id,
        'user_name': user.user_name,
        'gender': user.gender,
        'email': user.email,
        'username': user.username,
        'user_type': user.user_type
    })


@app.route('/api/users', methods=['POST'])
def create_user():
    # Import validation functions
    from validation import (validate_username, validate_name, validate_email, 
                         validate_password)

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Validate required fields
        required_fields = ['username', 'user_name', 'email', 'gender', 'password']
        for field in required_fields:
            if field not in data or not data.get(field):
                return jsonify({
                    "error": f"{field.replace('_', ' ').title()} is required",
                    "field": field
                }), 400

        # Validate username
        is_valid, error_msg = validate_username(data.get('username'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "username"}), 400

        # Validate full name
        is_valid, error_msg = validate_name(data.get('user_name'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "user_name"}), 400

        # Validate email
        is_valid, error_msg = validate_email(data.get('email'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "email"}), 400

        # Validate password
        is_valid, error_msg = validate_password(data.get('password'))
        if not is_valid:
            return jsonify({"error": error_msg, "field": "password"}), 400

        # Check if email or username already exists
        existing_email = session.query(User).filter(
            User.email == data.get('email')).first()
        if existing_email:
            return jsonify({"error": "Email already in use", "field": "email"}), 400

        existing_username = session.query(User).filter(
            User.username == data.get('username')).first()
        if existing_username:
            return jsonify({"error": "Username already in use", "field": "username"}), 400

        # Process phone number if provided, otherwise default
        phone_number = 1234567890  # Default placeholder
        if 'phone_number' in data and data.get('phone_number'):
            try:
                phone_number = int(data.get('phone_number'))
            except ValueError:
                return jsonify({"error": "Invalid phone number format", "field": "phone_number"}), 400

        # Process birthday if provided, otherwise default
        birthday = date.today()  # Default to today
        if 'birthday' in data and data.get('birthday'):
            try:
                birthday = datetime.strptime(data.get('birthday'), "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid date format for birthday", "field": "birthday"}), 400

        # Create new user
        new_user = User(
            user_name=data.get('user_name'),
            gender=data.get('gender'),
            birthday=birthday,
            phone_number=phone_number,
            email=data.get('email'),
            username=data.get('username'),
            password=generate_password_hash(data.get('password')),  # Hash the password
            user_type=data.get('user_type', 'Normal'))

        session.add(new_user)
        session.commit()

        # Log successful user creation
        print(f"User created successfully by admin: {new_user.username} (ID: {new_user.user_id})")

        return jsonify({
            'user_id': new_user.user_id,
            'user_name': new_user.user_name,
            'gender': new_user.gender,
            'email': new_user.email,
            'username': new_user.username,
            'user_type': new_user.user_type,
            'message': 'User created successfully'
        }), 201

    except Exception as e:
        session.rollback()
        print(f"Error in create_user: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    # Import validation functions
    from validation import (validate_username, validate_name, validate_email, 
                         validate_phone, validate_password)

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        user = session.query(User).get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Validate fields that are being updated

        # Validate username if being changed
        if 'username' in data and data['username']:
            is_valid, error_msg = validate_username(data['username'])
            if not is_valid:
                return jsonify({"error": error_msg, "field": "username"}), 400

            # Check if username is being changed and if it's already in use
            if data['username'] != user.username:
                existing_username = session.query(User).filter(
                    User.username == data['username']).first()
                if existing_username:
                    return jsonify({"error": "Username already in use", "field": "username"}), 400

        # Validate name if being changed
        if 'user_name' in data and data['user_name']:
            is_valid, error_msg = validate_name(data['user_name'])
            if not is_valid:
                return jsonify({"error": error_msg, "field": "user_name"}), 400

        # Validate email if being changed
        if 'email' in data and data['email']:
            is_valid, error_msg = validate_email(data['email'])
            if not is_valid:
                return jsonify({"error": error_msg, "field": "email"}), 400

            # Check if email is being changed and if it's already in use
            if data['email'] != user.email:
                existing_email = session.query(User).filter(
                    User.email == data['email']).first()
                if existing_email:
                    return jsonify({"error": "Email already in use", "field": "email"}), 400

        # Validate phone if being changed
        if 'phone_number' in data and data['phone_number']:
            is_valid, error_msg = validate_phone(data['phone_number'])
            if not is_valid:
                return jsonify({"error": error_msg, "field": "phone_number"}), 400

            # Parse phone number
            try:
                phone_number = int(data['phone_number'])
            except ValueError:
                return jsonify({"error": "Invalid phone number format", "field": "phone_number"}), 400

        # Validate password if being changed
        if 'password' in data and data['password']:
            is_valid, error_msg = validate_password(data['password'])
            if not is_valid:
                return jsonify({"error": error_msg, "field": "password"}), 400

            # Validate password confirmation if provided
            if 'confirm_password' in data and data['password'] != data['confirm_password']:
                return jsonify({"error": "Passwords do not match", "field": "confirm_password"}), 400

        # Update user fields
        if 'user_name' in data and data['user_name']:
            user.user_name = data['user_name']
        if 'gender' in data and data['gender']:
            user.gender = data['gender']
        if 'email' in data and data['email']:
            user.email = data['email']
        if 'username' in data and data['username']:
            user.username = data['username']
        if 'user_type' in data and data['user_type']:
            user.user_type = data['user_type']
        if 'password' in data and data['password']:
            user.password = generate_password_hash(data['password'])
        if 'phone_number' in data and data['phone_number']:
            user.phone_number = int(data['phone_number'])
        if 'birthday' in data and data['birthday']:
            try:
                user.birthday = datetime.strptime(data['birthday'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid date format for birthday", "field": "birthday"}), 400

        session.commit()

        # Log successful update
        print(f"User updated successfully: {user.username} (ID: {user.user_id})")

        return jsonify({
            'user_id': user.user_id,
            'user_name': user.user_name,
            'gender': user.gender,
            'email': user.email,
            'username': user.username,
            'user_type': user.user_type,
            'message': 'User updated successfully'
        })

    except Exception as e:
        session.rollback()
        print(f"Error in update_user: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    session = Session()

    try:
        user = session.query(User).get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        session.delete(user)
        session.commit()

        return jsonify({'message': 'User deleted successfully'})

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    session = Session()
    try:
        # Join with User and CheckupType tables to get more details
        appointments = session.query(
            Appointment, User.user_name,
            CheckupType.name, CheckupType.price).join(
                User, Appointment.user_id == User.user_id).join(
                    CheckupType,
                    Appointment.checkup_id == CheckupType.checkup_id).all()

        return jsonify([{
            'appointment_id':
            appt.Appointment.appointment_id,
            'user_id':
            appt.Appointment.user_id,
            'user_name':
            appt.user_name,
            'checkup_id':
            appt.Appointment.checkup_id,
            'checkup_name':
            appt.name,
            'appointment_date':
            appt.Appointment.appointment_date.isoformat(),
            'appointment_time':
            appt.Appointment.appointment_time.isoformat(),
            'price_paid':
            float(appt.Appointment.price_paid),
            'status':
            appt.Appointment.status,
            'created_at':
            appt.Appointment.created_at.isoformat()
            if appt.Appointment.created_at else None
        } for appt in appointments])
    except Exception as e:
        print(f"Error getting appointments: {str(e)}")
        return jsonify(
            {"error":
             f"Failed to retrieve appointments. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/appointments/<int:appointment_id>', methods=['GET'])
def get_appointment(appointment_id):
    session = Session()
    try:
        # Join with User and CheckupType to get more details
        result = session.query(
            Appointment, User.user_name,
            CheckupType.name, CheckupType.price).join(
                User, Appointment.user_id == User.user_id).join(
                    CheckupType,
                    Appointment.checkup_id == CheckupType.checkup_id).filter(
                        Appointment.appointment_id == appointment_id).first()

        if not result:
            return jsonify({"error": "Appointment not found"}), 404

        appointment, user_name, checkup_name, checkup_price = result

        return jsonify({
            'appointment_id':
            appointment.appointment_id,
            'user_id':
            appointment.user_id,
            'user_name':
            user_name,
            'checkup_id':
            appointment.checkup_id,
            'checkup_name':
            checkup_name,
            'appointment_date':
            appointment.appointment_date.isoformat(),
            'appointment_time':
            appointment.appointment_time.isoformat(),
            'status':
            appointment.status,
            'price_paid':
            float(appointment.price_paid),
            'created_at':
            appointment.created_at.isoformat()
            if appointment.created_at else None
        })
    except Exception as e:
        print(f"Error getting appointment: {str(e)}")
        return jsonify(
            {"error": f"Failed to retrieve appointment. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/appointments', methods=['POST'])
@login_required
def create_appointment():
    """
    This endpoint is now only to be used by admins to directly create appointments, bypassing payment.
    """
    # Only admin can create appointments directly
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Validate required fields
        required_fields = [
            'user_id', 'checkup_id', 'appointment_date', 'appointment_time'
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400

        # Parse date and time
        try:
            appointment_date = datetime.strptime(data['appointment_date'],
                                                 "%Y-%m-%d").date()
            appointment_time = datetime.strptime(data['appointment_time'],
                                                 "%H:%M:%S").time()
        except ValueError:
            return jsonify({"error": "Invalid date or time format"}), 400

        # Verify the user exists
        user = session.query(User).get(data['user_id'])
        if not user:
            return jsonify({"error": "User not found"}), 400

        # Verify the checkup exists
        checkup = session.query(CheckupType).get(data['checkup_id'])
        if not checkup:
            return jsonify({"error": "Checkup type not found"}), 400

        # Check if slot is available
        slot_count = session.query(func.count(
            Appointment.appointment_id)).filter(
                Appointment.appointment_date == appointment_date,
                Appointment.appointment_time == appointment_time,
                Appointment.checkup_id == data['checkup_id']).scalar()

        if slot_count >= checkup.max_slots_per_time:
            return jsonify({"error":
                            "This time slot is already fully booked"}), 400

        # Create new appointment
        new_appointment = Appointment(
            user_id=data['user_id'],
            checkup_id=data['checkup_id'],
            checkup_name=checkup.
            name,  # Add the checkup name from the checkup object
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status=data.get('status', 'Confirmed'),
            price_paid=data.get('price_paid', float(checkup.price)))

        session.add(new_appointment)
        session.commit()

        # Send confirmation email if requested
        if data.get('send_email', True):
            email_sent = send_appointment_confirmation(
                user_email=user.email,
                user_name=user.user_name,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                checkup_name=checkup.name)
            if email_sent:
                print(f"Confirmation email operation completed for {user.email}")
            else:
                print(f"Email operation failed completely for {user.email}")

        return jsonify({
            'appointment_id':
            new_appointment.appointment_id,
            'user_id':
            new_appointment.user_id,
            'user_name':
            user.user_name,
            'checkup_id':
            new_appointment.checkup_id,
            'checkup_name':
            checkup.name,
            'appointment_date':
            new_appointment.appointment_date.isoformat(),
            'appointment_time':
            new_appointment.appointment_time.isoformat(),
            'status':
            new_appointment.status,
            'price_paid':
            float(new_appointment.price_paid),
            'message': 'Appointment created successfully'
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
@login_required
def update_appointment(appointment_id):
    # Only admin or the appointment owner can update
    is_admin = current_user.user_type == 'Admin'

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        appointment = session.query(Appointment).get(appointment_id)
        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404

        # Check permission - only admin or appointment owner can update
        if not is_admin and appointment.user_id != current_user.user_id:
            return jsonify({
                "error":
                "You do not have permission to update this appointment"
            }), 403

        # Update appointment fields
        if 'user_id' in data and is_admin:  # Only admin can change user
            # Validate user exists
            user = session.query(User).get(data['user_id'])
            if not user:
                return jsonify({"error": "User not found"}), 400
            appointment.user_id = data['user_id']

        if 'checkup_id' in data and is_admin:  # Only admin can change checkup
            # Validate checkup exists
            checkup = session.query(CheckupType).get(data['checkup_id'])
            if not checkup:
                return jsonify({"error": "Checkup type not found"}), 400
            appointment.checkup_id = data['checkup_id']
            appointment.checkup_name = checkup.name  # Update the checkup name as well

        if 'appointment_date' in data:
            try:
                appointment_date = datetime.strptime(data['appointment_date'],
                                                     "%Y-%m-%d").date()

                # If changing date and not admin, check slot availability
                if appointment_date != appointment.appointment_date and not is_admin:
                    # Check if the new slot is available
                    time_str = appointment.appointment_time.strftime(
                        "%H:%M:%S"
                    ) if 'appointment_time' not in data else data[
                        'appointment_time']
                    time_obj = appointment.appointment_time if 'appointment_time' not in data else datetime.strptime(
                        time_str, "%H:%M:%S").time()

                    slot_count = session.query(
                        func.count(Appointment.appointment_id)).filter(
                            Appointment.appointment_date == appointment_date,
                            Appointment.appointment_time == time_obj,
                            Appointment.checkup_id == appointment.checkup_id,
                            Appointment.appointment_id
                            != appointment_id).scalar()

                    checkup = session.query(CheckupType).get(
                        appointment.checkup_id)
                    if slot_count >= checkup.max_slots_per_time:
                        return jsonify({
                            "error":
                            "The requested time slot is already fully booked"
                        }), 400

                appointment.appointment_date = appointment_date
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400

        if 'appointment_time' in data:
            try:
                appointment_time = datetime.strptime(data['appointment_time'],
                                                     "%H:%M:%S").time()

                # If changing time and not admin, check slot availability
                if appointment_time != appointment.appointment_time and not is_admin:
                    # Check if the new slot is available
                    date_str = appointment.appointment_date.isoformat(
                    ) if 'appointment_date' not in data else data[
                        'appointment_date']
                    date_obj = appointment.appointment_date if 'appointment_date' not in data else datetime.strptime(
                        date_str, "%Y-%m-%d").date()

                    slot_count = session.query(
                        func.count(Appointment.appointment_id)).filter(
                            Appointment.appointment_date == date_obj,
                            Appointment.appointment_time == appointment_time,
                            Appointment.checkup_id == appointment.checkup_id,
                            Appointment.appointment_id
                            != appointment_id).scalar()

                    checkup = session.query(CheckupType).get(
                        appointment.checkup_id)
                    if slot_count >= checkup.max_slots_per_time:
                        return jsonify({
                            "error":
                            "The requested time slot is already fully booked"
                        }), 400

                appointment.appointment_time = appointment_time
            except ValueError:
                return jsonify({"error": "Invalid time format"}), 400

        if 'status' in data and is_admin:  # Only admin can change status
            appointment.status = data['status']

        if 'price_paid' in data and is_admin:  # Only admin can change price
            appointment.price_paid = data['price_paid']

        session.commit()

        # Get updated appointment details
        checkup = session.query(CheckupType).get(appointment.checkup_id)
        user = session.query(User).get(appointment.user_id)

        return jsonify({
            'appointment_id':
            appointment.appointment_id,
            'user_id':
            appointment.user_id,
            'user_name':
            user.user_name,
            'checkup_id':
            appointment.checkup_id,
            'checkup_name':
            checkup.name,
            'appointment_date':
            appointment.appointment_date.isoformat(),
            'appointment_time':
            appointment.appointment_time.isoformat(),
            'status':
            appointment.status,
            'price_paid':
            float(appointment.price_paid),
            'message':
            'Appointment updated successfully'
        })

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/appointments/<int:appointment_id>', methods=['DELETE'])
@login_required
def delete_appointment(appointment_id):
    # Only admin or the appointment owner can delete
    is_admin = current_user.user_type == 'Admin'

    session = Session()

    try:
        appointment = session.query(Appointment).get(appointment_id)
        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404

        # Check permission - only admin or appointment owner can delete
        if not is_admin and appointment.user_id != current_user.user_id:
            return jsonify({
                "error":
                "You do not have permission to delete this appointment"
            }), 403

        session.delete(appointment)
        session.commit()

        return jsonify({'message': 'Appointment deleted successfully'})

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/users/<int:user_id>/appointments', methods=['GET'])
def get_user_appointments(user_id):
    # Check permission - only admin or the user themselves can see appointments
    is_admin = current_user.is_authenticated and current_user.user_type == 'Admin'
    is_owner = current_user.is_authenticated and current_user.user_id == user_id

    if not is_admin and not is_owner:
        return jsonify(
            {"error":
             "You do not have permission to view these appointments"}), 403

    session = Session()
    try:
        # Join with CheckupType to get more details
        appointments = session.query(
            Appointment, CheckupType.name, CheckupType.price).join(
                CheckupType,
                Appointment.checkup_id == CheckupType.checkup_id).filter(
                    Appointment.user_id == user_id).all()

        return jsonify([{
            'appointment_id':
            appt.Appointment.appointment_id,
            'user_id':
            appt.Appointment.user_id,
            'checkup_id':
            appt.Appointment.checkup_id,
            'checkup_name':
            appt.name,
            'appointment_date':
            appt.Appointment.appointment_date.isoformat(),
            'appointment_time':
            appt.Appointment.appointment_time.isoformat(),
            'status':
            appt.Appointment.status,
            'price_paid':
            float(appt.Appointment.price_paid),
            'created_at':
            appt.Appointment.created_at.isoformat()
            if appt.Appointment.created_at else None
        } for appt in appointments])
    except Exception as e:
        print(f"Error getting user appointments: {str(e)}")
        return jsonify({
            "error":
            f"Failed to retrieve user appointments. Error: {str(e)}"
        }), 500
    finally:
        session.close()


# Stripe payment endpoints
@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.json
    try:
        # Debug authentication
        print(
            f"User authenticated: {current_user.is_authenticated if hasattr(current_user, 'is_authenticated') else 'No current_user'}"
        )
        if hasattr(current_user, 'user_id'):
            print(f"User ID: {current_user.user_id}")

        # Check if user is logged in
        if not current_user.is_authenticated:
            print("User not authenticated for checkout session")
            return jsonify({'error': 'Authentication required'}), 401

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        # Get appointment data
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')
        checkup_id = data.get('checkup_id')

        # Validate data
        if not appointment_date or not appointment_time or not checkup_id:
            return jsonify({'error': 'Missing appointment information'}), 400

        session = Session()
        try:
            # Check if checkup exists
            checkup = session.query(CheckupType).get(int(checkup_id))
            if not checkup:
                return jsonify({'error': 'Invalid checkup type'}), 400

            # Check if slot is available
            slot_count = session.query(func.count(
                Appointment.appointment_id)).filter(
                    Appointment.appointment_date == datetime.strptime(
                        appointment_date, "%Y-%m-%d").date(),
                    Appointment.appointment_time == datetime.strptime(
                        appointment_time, "%H:%M:%S").time(),
                    Appointment.checkup_id == int(checkup_id)).scalar()

            if slot_count >= checkup.max_slots_per_time:
                return jsonify({
                    'error':
                    'This time slot is already fully booked. Please choose another time.'
                }), 400

            # Create a checkout session
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': 'myr',
                            'product_data': {
                                'name':
                                f'{checkup.name} Appointment',
                                'description':
                                f'Appointment on {appointment_date} at {appointment_time}',
                            },
                            'unit_amount': int(float(checkup.price) *
                                               100),  # Convert price to cents
                        },
                        'quantity': 1,
                    },
                ],
                mode='payment',
                success_url=
                f'http://{DOMAIN}/payment-success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'http://{DOMAIN}/user/appointment',
                metadata={
                    'user_id': current_user.user_id,
                    'appointment_date': appointment_date,
                    'appointment_time': appointment_time,
                    'checkup_id': checkup_id,
                    'price': str(checkup.price)
                })

            return jsonify({
                'id': checkout_session.id,
                'url': checkout_session.url
            })

        except Exception as inner_e:
            print(f"Error in database operations: {str(inner_e)}")
            return jsonify({'error': str(inner_e)}), 500
        finally:
            session.close()

    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/payment-success', methods=['GET'])
@login_required
def payment_success():
    session_id = request.args.get('session_id')
    if not session_id:
        return redirect('/user/appointment')

    try:
        # Retrieve the checkout session
        checkout_session = stripe.checkout.Session.retrieve(session_id)

        # Ensure payment was successful
        if checkout_session.payment_status != 'paid':
            return render_template('payment_error.html',
                                   error='Payment was not completed')

        # Get metadata
        metadata = checkout_session.metadata

        # Create appointment in database
        db_session = Session()
        try:
            # Print metadata for debugging
            print(f"Payment metadata: {metadata}")

            # Parse date and time
            appointment_date = datetime.strptime(metadata['appointment_date'],
                                                 "%Y-%m-%d").date()
            appointment_time = datetime.strptime(metadata['appointment_time'],
                                                 "%H:%M:%S").time()
            checkup_id = int(metadata['checkup_id'])
            price = float(metadata['price'])

            # Verify the checkup exists
            checkup = db_session.query(CheckupType).get(checkup_id)
            if not checkup:
                return render_template('payment_error.html',
                                       error='Invalid checkup type')

            # Check if slot is still available (possible race condition)
            slot_count = db_session.query(
                func.count(Appointment.appointment_id)).filter(
                    Appointment.appointment_date == appointment_date,
                    Appointment.appointment_time == appointment_time,
                    Appointment.checkup_id == checkup_id).scalar()

            if slot_count >= checkup.max_slots_per_time:
                return render_template(
                    'payment_error.html',
                    error=
                    'This time slot is now fully booked. Please contact support.'
                )

            # Create new appointment
            new_appointment = Appointment(
                user_id=int(metadata['user_id']),
                checkup_id=checkup_id,
                checkup_name=checkup.
                name,  # Add the checkup name from the checkup object
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                status='Confirmed',
                price_paid=price)

            db_session.add(new_appointment)
            db_session.commit()

            # Get the user information for email notification
            user = db_session.query(User).get(int(metadata['user_id']))

            if user:
                # Debug information about the user
                print(f"User authenticated: {current_user.is_authenticated}")
                print(f"User ID: {current_user.user_id}")
                print(f"Attempting to send email to: {user.email}")

                # Send confirmation email
                email_sent = send_appointment_confirmation(
                    user_email=user.email,
                    user_name=user.user_name,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    checkup_name=checkup.name)

                if email_sent:
                    print(
                        f"Confirmation email operation completed for {user.email}"
                    )
                    # Add a flash message for the user if implementation supports it
                    # flash("Appointment confirmation email has been sent to your email address", "success")
                else:
                    print(f"Email operation failed completely for {user.email}")
                    # flash("There was an issue sending your confirmation email. Please contact support.", "warning")

            # Redirect to view appointments page
            return redirect('/user/view-appointment')

        except Exception as e:
            db_session.rollback()
            print(f"Error saving appointment after payment: {str(e)}")
            return render_template('payment_error.html',
                                   error=f'Error saving appointment: {str(e)}')
        finally:
            db_session.close()

    except Exception as e:
        print(f"Error processing payment success: {str(e)}")
        return render_template('payment_error.html',
                               error=f'Error processing payment: {str(e)}')


@app.route('/payment-error.html')
def payment_error():
    error_message = request.args.get('error', 'An unknown error occurred')
    return render_template('payment_error.html', error=error_message)


# Checkup Types API endpoints
@app.route('/api/checkup-types', methods=['GET'])
def get_checkup_types():
    session = Session()
    try:
        checkups = session.query(CheckupType).all()
        return jsonify([{
            'checkup_id':
            checkup.checkup_id,
            'name':
            checkup.name,
            'description':
            checkup.description,
            'price':
            float(checkup.price),
            'duration_minutes':
            checkup.duration_minutes,
            'max_slots_per_time':
            checkup.max_slots_per_time,
            'image_path':
            checkup.image_path,
            'is_active':
            checkup.is_active,
            'created_at':
            checkup.created_at.isoformat() if checkup.created_at else None
        } for checkup in checkups])
    except Exception as e:
        print(f"Error getting checkup types: {str(e)}")
        return jsonify(
            {"error":
             f"Failed to retrieve checkup types. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/checkup-types/<int:checkup_id>', methods=['GET'])
def get_checkup_type(checkup_id):
    session = Session()
    try:
        checkup = session.query(CheckupType).get(checkup_id)
        if not checkup:
            return jsonify({"error": "Checkup type not found"}), 404

        return jsonify({
            'checkup_id': checkup.checkup_id,
            'name': checkup.name,
            'description': checkup.description,
            'price': float(checkup.price),
            'duration_minutes': checkup.duration_minutes,
            'max_slots_per_time': checkup.max_slots_per_time,
            'is_active': checkup.is_active,
            'image_path': checkup.image_path,
            'created_at': checkup.created_at.isoformat() if checkup.created_at else None
        })
    except Exception as e:
        print(f"Error getting checkup type: {str(e)}")
        return jsonify(
            {"error":
             f"Failed to retrieve checkup type. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/checkup-types', methods=['POST'])
@login_required
def create_checkup_type():
    # Only admin can create checkup types
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.form  # Changed to form data

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Validate required fields
        required_fields = ['name', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400

        # Check if checkup name already exists
        existing_checkup = session.query(CheckupType).filter(
            CheckupType.name == data.get('name')).first()
        if existing_checkup:
            return jsonify(
                {"error": "Checkup type with this name already exists"}), 400

        # Handle image upload if provided
        image_path = None
        print("Request files:", request.files)
        if 'image' in request.files:
            file = request.files['image']
            print(f"Image file received: {file.filename}")
            if file and file.filename:
                # Secure the filename and create a unique name
                filename = secure_filename(file.filename)
                ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                unique_filename = f"{uuid.uuid4().hex}.{ext}"

                # Define the directory and ensure it exists
                upload_dir = 'uploads/checkup_types'
                os.makedirs(upload_dir, exist_ok=True)

                # Create full file path (using forward slashes for web)
                file_path = f"{upload_dir}/{unique_filename}"

                # Save the file
                print(f"Saving file to: {file_path}")
                file.save(file_path)
                image_path = file_path
                print(f"Image path saved: {image_path}")
            else:
                print("File exists in request but has no filename")
        elif 'image_path' in data:
            image_path = data.get('image_path')
            print(f"Using existing image path: {image_path}")

        # Create new checkup type
        new_checkup = CheckupType(
            name=data.get('name'),
            description=data.get('description', ''),
            price=data.get('price'),
            duration_minutes=data.get('duration_minutes', 30),
            max_slots_per_time=data.get('max_slots_per_time', 10),
            image_path=image_path,
            is_active=data.get('is_active', 1))

        session.add(new_checkup)
        session.commit()

        return jsonify({
            'checkup_id': new_checkup.checkup_id,
            'name': new_checkup.name,
            'description': new_checkup.description,
            'price': float(new_checkup.price),
            'duration_minutes': new_checkup.duration_minutes,
            'max_slots_per_time': new_checkup.max_slots_per_time,
            'image_path': new_checkup.image_path,
            'is_active': new_checkup.is_active,
            'message': 'Checkup type created successfully'
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/checkup-types/<int:checkup_id>', methods=['PUT'])
@login_required
def update_checkup_type(checkup_id):
    # Only admin can update checkup types
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.form  # Changed to form data

    if not data and not request.files:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        checkup = session.query(CheckupType).get(checkup_id)
        if not checkup:
            return jsonify({"error": "Checkup type not found"}), 404

        # Check if name is being changed and if it already exists
        if 'name' in data and data['name'] != checkup.name:
            existing_checkup = session.query(CheckupType).filter(
                CheckupType.name == data['name']).first()
            if existing_checkup:
                return jsonify(
                    {"error":
                     "Checkup type with this name already exists"}), 400

        # Handle image upload if provided
        print("Update - Request files:", request.files)
        if 'image' in request.files:
            file = request.files['image']
            print(f"Update - Image file received: {file.filename}")
            if file and file.filename:
                # If there's an existing image, we could delete it here
                if checkup.image_path and os.path.exists(checkup.image_path):
                    try:
                        os.remove(checkup.image_path)
                    except Exception as e:
                        print(f"Error removing old image: {str(e)}")

                # Secure the filename and create a unique name
                filename = secure_filename(file.filename)
                ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                unique_filename = f"{uuid.uuid4().hex}.{ext}"

                # Define the directory and ensure it exists
                upload_dir = 'uploads/checkup_types'
                os.makedirs(upload_dir, exist_ok=True)

                # Create full file path (using forward slashes for web)
                file_path = f"{upload_dir}/{unique_filename}"

                # Save the file
                print(f"Update - Saving file to: {file_path}")
                file.save(file_path)
                checkup.image_path = file_path
                print(f"Update - Image path saved: {file_path}")
            else:
                print("Update - File exists in request but has no filename")
        elif 'image_path' in data:
            print(f"Update - Using existing image path: {data['image_path']}")
            checkup.image_path = data['image_path']

        # Update checkup fields
        if 'name' in data:
            checkup.name = data['name']
        if 'description' in data:
            checkup.description = data['description']
        if 'price' in data:
            checkup.price = data['price']
        if 'duration_minutes' in data:
            checkup.duration_minutes = data['duration_minutes']
        if 'max_slots_per_time' in data:
            checkup.max_slots_per_time = data['max_slots_per_time']
        if 'is_active' in data:
            checkup.is_active = data['is_active']

        session.commit()

        return jsonify({
            'checkup_id': checkup.checkup_id,
            'name': checkup.name,
            'description': checkup.description,
            'price': float(checkup.price),
            'duration_minutes': checkup.duration_minutes,
            'max_slots_per_time': checkup.max_slots_per_time,
            'image_path': checkup.image_path,
            'is_active': checkup.is_active,
            'message': 'Checkup type updated successfully'
        })

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/checkup-types/<int:checkup_id>', methods=['DELETE'])
@login_required
def delete_checkup_type(checkup_id):
    # Only admin can delete checkup types
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()

    try:
        checkup = session.query(CheckupType).get(checkup_id)
        if not checkup:
            return jsonify({"error": "Checkup type not found"}), 404

        # Check if this checkup type is used in appointments
        appointment_count = session.query(Appointment).filter(
            Appointment.checkup_id == checkup_id).count()
        if appointment_count > 0:
            return jsonify({
                "error": f"Cannot delete '{checkup.name}' because it is being used in {appointment_count} appointment(s). Please remove all associated appointments first.",
                "reason": "in_use",
                "count": appointment_count
            }), 400

        session.delete(checkup)
        session.commit()

        return jsonify({'message': 'Checkup type deleted successfully'})

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# Specialists API endpoints
@app.route('/api/specialists', methods=['GET'])
def get_specialists():
    session = Session()
    try:
        specialists = session.query(Specialist).all()
        return jsonify([{
            'specialist_id':
            specialist.specialist_id,
            'name':
            specialist.name,
            'title':
            specialist.title,
            'specialization':
            specialist.specialization,
            'bio':
            specialist.bio,
            'image_path':
            specialist.image_path,
            'is_active':
            specialist.is_active,
            'created_at':
            specialist.created_at.isoformat()
            if specialist.created_at else None
        } for specialist in specialists])
    except Exception as e:
        print(f"Error getting specialists: {str(e)}")
        return jsonify(
            {"error": f"Failed to retrieve specialists. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/specialists/<int:specialist_id>', methods=['GET'])
def get_specialist(specialist_id):
    session = Session()
    try:
        specialist = session.query(Specialist).get(specialist_id)
        if not specialist:
            return jsonify({"error": "Specialist not found"}), 404

        return jsonify({
            'specialist_id':
            specialist.specialist_id,
            'name':
            specialist.name,
            'title':
            specialist.title,
            'specialization':
            specialist.specialization,
            'bio':
            specialist.bio,
            'image_path':
            specialist.image_path,
            'is_active':
            specialist.is_active,
            'created_at':
            specialist.created_at.isoformat()
            if specialist.created_at else None
        })
    except Exception as e:
        print(f"Error getting specialist: {str(e)}")
        return jsonify(
            {"error": f"Failed to retrieve specialist. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/specialists', methods=['POST'])
@login_required
def create_specialist():
    # Only admin can create specialists
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.form  # Changed to form data

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Validate required fields
        required_fields = ['name', 'title', 'specialization']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400

        # Handle image upload if provided
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                # Secure the filename and create a unique name
                filename = secure_filename(file.filename)
                ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                unique_filename = f"{uuid.uuid4().hex}.{ext}"

                # Define the directory and ensure it exists
                upload_dir = 'uploads/specialists'
                os.makedirs(upload_dir, exist_ok=True)

                # Create full file path (using forward slashes for web)
                file_path = f"{upload_dir}/{unique_filename}"

                # Save the file
                file.save(file_path)
                image_path = file_path
        elif 'image_path' in data:
            image_path = data.get('image_path')

        # Create new specialist
        new_specialist = Specialist(name=data.get('name'),
                                    title=data.get('title'),
                                    specialization=data.get('specialization'),
                                    bio=data.get('bio', ''),
                                    image_path=image_path,
                                    is_active=int(data.get('is_active', 1)))

        session.add(new_specialist)
        session.commit()

        return jsonify({
            'specialist_id': new_specialist.specialist_id,
            'name': new_specialist.name,
            'title': new_specialist.title,
            'specialization': new_specialist.specialization,
            'bio': new_specialist.bio,
            'image_path': new_specialist.image_path,
            'is_active': new_specialist.is_active,
            'message': 'Specialist created successfully'
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/specialists/<int:specialist_id>', methods=['PUT'])
@login_required
def update_specialist(specialist_id):
    # Only admin can update specialists
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.form  # Changed to form data

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        specialist = session.query(Specialist).get(specialist_id)
        if not specialist:
            return jsonify({"error": "Specialist not found"}), 404

        # Handle image upload if provided
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                # If there's an existing image, we could delete it here
                if specialist.image_path and os.path.exists(
                        specialist.image_path):
                    try:
                        os.remove(specialist.image_path)
                    except Exception as e:
                        print(f"Error removing old image: {str(e)}")

                # Secure the filename and create a unique name
                filename = secure_filename(file.filename)
                ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                unique_filename = f"{uuid.uuid4().hex}.{ext}"

                # Define the directory and ensure it exists
                upload_dir = 'uploads/specialists'
                os.makedirs(upload_dir, exist_ok=True)

                # Create full file path (using forward slashes for web)
                file_path = f"{upload_dir}/{unique_filename}"

                # Save the file
                file.save(file_path)
                specialist.image_path = file_path
        elif 'image_path' in data:
            specialist.image_path = data['image_path']

        # Update specialist fields
        if 'name' in data:
            specialist.name = data['name']
        if 'title' in data:
            specialist.title = data['title']
        if 'specialization' in data:
            specialist.specialization = data['specialization']
        if 'bio' in data:
            specialist.bio = data['bio']
        if 'is_active' in data:
            specialist.is_active = int(data['is_active'])

        session.commit()

        return jsonify({
            'specialist_id': specialist.specialist_id,
            'name': specialist.name,
            'title': specialist.title,
            'specialization': specialist.specialization,
            'bio': specialist.bio,
            'image_path': specialist.image_path,
            'is_active': specialist.is_active,
            'message': 'Specialist updated successfully'
        })

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/specialists/<int:specialist_id>', methods=['DELETE'])
@login_required
def delete_specialist(specialist_id):
    # Only admin can delete specialists
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()

    try:
        specialist = session.query(Specialist).get(specialist_id)
        if not specialist:
            return jsonify({"error": "Specialist not found"}), 404

        session.delete(specialist)
        session.commit()

        return jsonify({'message': 'Specialist deleted successfully'})

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# Health Facts API endpoints
@app.route('/api/health-facts', methods=['GET'])
def get_health_facts():
    session = Session()
    try:
        health_facts = session.query(HealthFact).all()
        return jsonify([{
            'fact_id':
            fact.fact_id,
            'title':
            fact.title,
            'content':
            fact.content,
            'category':
            fact.category,
            'is_featured':
            fact.is_featured,
            'is_active':
            fact.is_active,
            'created_at':
            fact.created_at.isoformat() if fact.created_at else None
        } for fact in health_facts])
    except Exception as e:
        print(f"Error getting health facts: {str(e)}")
        return jsonify(
            {"error":
             f"Failed to retrieve health facts. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/health-facts/<int:fact_id>', methods=['GET'])
def get_health_fact(fact_id):
    session = Session()
    try:
        health_fact = session.query(HealthFact).get(fact_id)
        if not health_fact:
            return jsonify({"error": "Health fact not found"}), 404

        return jsonify({
            'fact_id':
            health_fact.fact_id,
            'title':
            health_fact.title,
            'content':
            health_fact.content,
            'category':
            health_fact.category,
            'is_featured':
            health_fact.is_featured,
            'is_active':
            health_fact.is_active,
            'created_at':
            health_fact.created_at.isoformat()
            if health_fact.created_at else None
        })
    except Exception as e:
        print(f"Error getting health fact: {str(e)}")
        return jsonify(
            {"error": f"Failed to retrieve health fact. Error: {str(e)}"}), 500
    finally:
        session.close()


@app.route('/api/health-facts', methods=['POST'])
@login_required
def create_health_fact():
    # Only admin can create health facts
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Validate required fields
        required_fields = ['title', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400

        # Create new health fact
        new_fact = HealthFact(title=data.get('title'),
                              content=data.get('content'),
                              category=data.get('category', ''),
                              is_featured=data.get('is_featured', 0),
                              is_active=data.get('is_active', 1))

        session.add(new_fact)
        session.commit()

        return jsonify({
            'fact_id': new_fact.fact_id,
            'title': new_fact.title,
            'content': new_fact.content,
            'category': new_fact.category,
            'is_featured': new_fact.is_featured,
            'is_active': new_fact.is_active,
            'message': 'Health fact created successfully'
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/health-facts/<int:fact_id>', methods=['PUT'])
@login_required
def update_health_fact(fact_id):
    # Only admin can update health facts
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        health_fact = session.query(HealthFact).get(fact_id)
        if not health_fact:
            return jsonify({"error": "Health fact not found"}), 404

        # Update health fact fields
        if 'title' in data:
            health_fact.title = data['title']
        if 'content' in data:
            health_fact.content = data['content']
        if 'category' in data:
            health_fact.category = data['category']
        if 'is_featured' in data:
            health_fact.is_featured = data['is_featured']
        if 'is_active' in data:
            health_fact.is_active = data['is_active']

        session.commit()

        return jsonify({
            'fact_id': health_fact.fact_id,
            'title': health_fact.title,
            'content': health_fact.content,
            'category': health_fact.category,
            'is_featured': health_fact.is_featured,
            'is_active': health_fact.is_active,
            'message': 'Health fact updated successfully'
        })

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/health-facts/<int:fact_id>', methods=['DELETE'])
@login_required
def delete_health_fact(fact_id):
    # Only admin can delete health facts
    if current_user.user_type != 'Admin':
        return jsonify({"error": "Unauthorized access"}), 403

    session = Session()

    try:
        health_fact = session.query(HealthFact).get(fact_id)
        if not health_fact:
            return jsonify({"error": "Health fact not found"}), 404

        session.delete(health_fact)
        session.commit()

        return jsonify({'message': 'Health fact deleted successfully'})

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# Slot availability endpoint
@app.route('/api/check-slot-availability', methods=['GET'])
def check_slot_availability():
    session = Session()
    try:
        # Get parameters
        date_str = request.args.get('date')
        time_str = request.args.get('time')
        checkup_id = request.args.get('checkup_id')

        if not date_str or not time_str or not checkup_id:
            return jsonify({"error": "Missing required parameters"}), 400

        # Parse date and time
        try:
            appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            appointment_time = datetime.strptime(time_str, "%H:%M:%S").time()
        except ValueError:
            return jsonify({"error": "Invalid date or time format"}), 400

        # Check if checkup type exists
        checkup = session.query(CheckupType).get(int(checkup_id))
        if not checkup:
            return jsonify({"error": "Invalid checkup type"}), 400

        # Count existing appointments for this slot
        slot_count = session.query(func.count(
            Appointment.appointment_id)).filter(
                Appointment.appointment_date == appointment_date,
                Appointment.appointment_time == appointment_time,
                Appointment.checkup_id == int(checkup_id)).scalar()

        # Check if the slot is available
        is_available = slot_count < checkup.max_slots_per_time
        slots_remaining = checkup.max_slots_per_time - slot_count

        return jsonify({
            'date': date_str,
            'time': time_str,
            'checkup_id': checkup_id,
            'checkup_name': checkup.name,
            'max_slots': checkup.max_slots_per_time,
            'booked_slots': slot_count,
            'slots_remaining': slots_remaining,
            'is_available': is_available
        })
    except Exception as e:
        print(f"Error checking slot availability: {str(e)}")
        return jsonify(
            {"error":
             f"Failed to check slot availability. Error: {str(e)}"}), 500
    finally:
        session.close()


# Initialize database with default checkup types if none exist
def initialize_default_data():
    session = Session()
    try:
        # Check if an admin user exists
        admin_user = session.query(User).filter(
            User.username == 'admin').first()

        if not admin_user:
            # Create admin user - using generate_password_hash for secure storage
            admin_user = User(user_name='Administrator',
                              gender='Other',
                              birthday=datetime.now().date(),
                              phone_number=1234567890,
                              email='admin@healthassist.com',
                              username='admin',
                              password=generate_password_hash('admin123'),
                              user_type='Admin')

            session.add(admin_user)
            session.commit()
            print("Admin user created successfully")

        # Check if any checkup types exist
        checkup_count = session.query(func.count(
            CheckupType.checkup_id)).scalar()
        if checkup_count == 0:
            # Create default checkup types
            default_checkups = [
                CheckupType(name='General Health Checkup',
                            description='Comprehensive health assessment',
                            price=99.00,
                            duration_minutes=30,
                            max_slots_per_time=10),
                CheckupType(name='Dental Checkup',
                            description='Dental examination and cleaning',
                            price=129.00,
                            duration_minutes=45,
                            max_slots_per_time=8),
                CheckupType(name='Eye Checkup',
                            description='Vision test and eye examination',
                            price=89.00,
                            duration_minutes=30,
                            max_slots_per_time=10),
                CheckupType(name='Postnatal Care',
                            description='Care for mothers after childbirth',
                            price=149.00,
                            duration_minutes=60,
                            max_slots_per_time=5),
                CheckupType(name='Prenatal Checkup',
                            description='Care during pregnancy',
                            price=149.00,
                            duration_minutes=45,
                            max_slots_per_time=8),
                CheckupType(name='Immunization',
                            description='Vaccines and immunizations',
                            price=69.00,
                            duration_minutes=15,
                            max_slots_per_time=15),
                CheckupType(name='X-Ray Diagnosis',
                            description='X-ray imaging and diagnosis',
                            price=199.00,
                            duration_minutes=30,
                            max_slots_per_time=6)
            ]

            for checkup in default_checkups:
                session.add(checkup)

            session.commit()
            print("Default checkup types created successfully")

        # Check if any specialists exist
        specialist_count = session.query(func.count(
            Specialist.specialist_id)).scalar()
        if specialist_count == 0:
            # Create default specialists
            default_specialists = [
                Specialist(
                    name='Dr. Sarah Johnson',
                    title='Chief Medical Officer',
                    specialization='General Medicine',
                    bio=
                    'Dr. Johnson has over 15 years of experience in general medicine.'
                ),
                Specialist(
                    name='Dr. Michael Chen',
                    title='Senior Dentist',
                    specialization='Dentistry',
                    bio=
                    'Dr. Chen specializes in cosmetic dentistry and oral health.'
                ),
                Specialist(
                    name='Dr. Emily Rodriguez',
                    title='Ophthalmologist',
                    specialization='Eye Care',
                    bio=
                    'Dr. Rodriguez is a leading expert in diagnosing and treating eye conditions.'
                ),
                Specialist(
                    name='Dr. David Kim',
                    title='OB/GYN Specialist',
                    specialization='Women\'s Health',
                    bio=
                    'Dr. Kim provides comprehensive care for women\'s health issues.'
                ),
                Specialist(
                    name='Dr. Lisa Patel',
                    title='Pediatrician',
                    specialization='Children\'s Health',
                    bio=
                    'Dr. Patel has dedicated her career to providing the best care for children.'
                )
            ]

            for specialist in default_specialists:
                session.add(specialist)

            session.commit()
            print("Default specialists created successfully")

        # Check if any health facts exist
        fact_count = session.query(func.count(HealthFact.fact_id)).scalar()
        if fact_count == 0:
            # Create default health facts
            default_facts = [
                HealthFact(
                    title='Stay Hydrated',
                    content=
                    'Drinking enough water is essential for your health. Aim for 8 glasses a day.',
                    category='General Health',
                    is_featured=1),
                HealthFact(
                    title='Exercise Regularly',
                    content=
                    'Regular physical activity improves cardiovascular health and mood.',
                    category='Fitness',
                    is_featured=1),
                HealthFact(
                    title='Dental Hygiene',
                    content=
                    'Brush your teeth twice a day and floss daily to prevent cavities.',
                    category='Dental Health',
                    is_featured=0),
                HealthFact(
                    title='Eye Health',
                    content=
                    'Take breaks when using digital devices to reduce eye strain.',
                    category='Eye Care',
                    is_featured=0),
                HealthFact(
                    title='Prenatal Vitamins',
                    content=
                    'Taking prenatal vitamins during pregnancy provides essential nutrients for your baby\'s development.',
                    category='Pregnancy',
                    is_featured=1)
            ]

            for fact in default_facts:
                session.add(fact)

            session.commit()
            print("Default health facts created successfully")
    except Exception as e:
        session.rollback()
        print(f"Error initializing default data: {str(e)}")
    finally:
        session.close()


# Call the initialization function
initialize_default_data()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)