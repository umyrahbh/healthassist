"""
Flask-WTF form definitions for the HealthAssist application
"""
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SelectField, DateField, TextAreaField, \
    DecimalField, IntegerField, BooleanField, FileField, HiddenField
from wtforms.validators import DataRequired, Email, Length, Regexp, NumberRange, ValidationError, Optional
from datetime import date
import re
from validation import (
    USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH,
    NAME_MIN_LENGTH, NAME_MAX_LENGTH,
    PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH,
    PHONE_MIN_LENGTH, PHONE_MAX_LENGTH,
    BIO_MAX_LENGTH
)

# Custom validators
def validate_future_date(form, field):
    """Validate date is not in the past"""
    if field.data and field.data < date.today():
        raise ValidationError('Date cannot be in the past')

def validate_password_strength(form, field):
    """Validate password meets strength requirements"""
    password = field.data
    
    # Check for uppercase, lowercase, digit and special character
    has_uppercase = re.search(r"[A-Z]", password)
    has_lowercase = re.search(r"[a-z]", password)
    has_digit = re.search(r"\d", password)
    has_special = re.search(r"[@$!%*?&#]", password)
    
    if not (has_uppercase and has_lowercase and has_digit and has_special):
        raise ValidationError(
            'Password must include at least one uppercase letter, '
            'one lowercase letter, one number, and one special character.'
        )

# Form classes
class LoginForm(FlaskForm):
    """Login form"""
    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=USERNAME_MIN_LENGTH, max=USERNAME_MAX_LENGTH,
               message=f'Username must be between {USERNAME_MIN_LENGTH} and {USERNAME_MAX_LENGTH} characters')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required')
    ])

class UserRegistrationForm(FlaskForm):
    """User registration form"""
    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=USERNAME_MIN_LENGTH, max=USERNAME_MAX_LENGTH,
               message=f'Username must be between {USERNAME_MIN_LENGTH} and {USERNAME_MAX_LENGTH} characters'),
        Regexp(r'^[a-zA-Z0-9_]+$', message='Username can only contain letters, numbers, and underscores')
    ])
    
    user_name = StringField('Full Name', validators=[
        DataRequired(message='Full name is required'),
        Length(min=NAME_MIN_LENGTH, max=NAME_MAX_LENGTH,
               message=f'Name must be between {NAME_MIN_LENGTH} and {NAME_MAX_LENGTH} characters'),
        Regexp(r'^[a-zA-Z\s\-]+$', message='Name can only contain letters, spaces, and hyphens')
    ])
    
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Please enter a valid email address')
    ])
    
    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=PASSWORD_MIN_LENGTH, max=PASSWORD_MAX_LENGTH,
               message=f'Password must be between {PASSWORD_MIN_LENGTH} and {PASSWORD_MAX_LENGTH} characters'),
        validate_password_strength
    ])
    
    gender = SelectField('Gender', choices=[
        ('Male', 'Male'), 
        ('Female', 'Female')
    ], validators=[
        DataRequired(message='Gender is required')
    ])
    
    birthday = DateField('Date of Birth', validators=[
        DataRequired(message='Date of birth is required')
    ], format='%Y-%m-%d')
    
    phone_number = StringField('Phone Number', validators=[
        DataRequired(message='Phone number is required'),
        Regexp(r'^[\d\s\+\(\)\-]+$', message='Phone number must contain only digits, spaces, or symbols +()-.'),
        Length(min=PHONE_MIN_LENGTH, max=PHONE_MAX_LENGTH,
               message=f'Phone number must be between {PHONE_MIN_LENGTH} and {PHONE_MAX_LENGTH} characters')
    ])

class UserEditForm(FlaskForm):
    """User edit form"""
    user_name = StringField('Full Name', validators=[
        DataRequired(message='Full name is required'),
        Length(min=NAME_MIN_LENGTH, max=NAME_MAX_LENGTH,
               message=f'Name must be between {NAME_MIN_LENGTH} and {NAME_MAX_LENGTH} characters'),
        Regexp(r'^[a-zA-Z\s\-]+$', message='Name can only contain letters, spaces, and hyphens')
    ])
    
    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Please enter a valid email address')
    ])
    
    gender = SelectField('Gender', choices=[
        ('Male', 'Male'), 
        ('Female', 'Female')
    ], validators=[
        DataRequired(message='Gender is required')
    ])
    
    birthday = DateField('Date of Birth', validators=[
        DataRequired(message='Date of birth is required')
    ], format='%Y-%m-%d')
    
    phone_number = StringField('Phone Number', validators=[
        DataRequired(message='Phone number is required'),
        Regexp(r'^[\d\s\+\(\)\-]+$', message='Phone number must contain only digits, spaces, or symbols +()-.'),
        Length(min=PHONE_MIN_LENGTH, max=PHONE_MAX_LENGTH,
               message=f'Phone number must be between {PHONE_MIN_LENGTH} and {PHONE_MAX_LENGTH} characters')
    ])
    
    user_type = SelectField('User Type', choices=[
        ('Normal', 'Normal'), 
        ('Admin', 'Admin')
    ], validators=[
        DataRequired(message='User type is required')
    ])

class ChangePasswordForm(FlaskForm):
    """Password change form"""
    current_password = PasswordField('Current Password', validators=[
        DataRequired(message='Current password is required')
    ])
    
    new_password = PasswordField('New Password', validators=[
        DataRequired(message='New password is required'),
        Length(min=PASSWORD_MIN_LENGTH, max=PASSWORD_MAX_LENGTH,
               message=f'Password must be between {PASSWORD_MIN_LENGTH} and {PASSWORD_MAX_LENGTH} characters'),
        validate_password_strength
    ])
    
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your new password')
    ])
    
    def validate_confirm_password(form, field):
        if field.data != form.new_password.data:
            raise ValidationError('Passwords do not match')

class SpecialistForm(FlaskForm):
    """Specialist form for create/edit"""
    name = StringField('Name', validators=[
        DataRequired(message='Name is required'),
        Length(min=NAME_MIN_LENGTH, max=NAME_MAX_LENGTH,
               message=f'Name must be between {NAME_MIN_LENGTH} and {NAME_MAX_LENGTH} characters'),
        Regexp(r'^[a-zA-Z\s\-\.]+$', message='Name can only contain letters, spaces, hyphens, and periods')
    ])
    
    title = StringField('Title', validators=[
        DataRequired(message='Title is required'),
        Length(max=100, message='Title cannot exceed 100 characters')
    ])
    
    specialization = StringField('Specialization', validators=[
        DataRequired(message='Specialization is required'),
        Length(max=100, message='Specialization cannot exceed 100 characters')
    ])
    
    bio = TextAreaField('Bio', validators=[
        Optional(),
        Length(max=BIO_MAX_LENGTH, message=f'Bio cannot exceed {BIO_MAX_LENGTH} characters')
    ])
    
    image = FileField('Profile Image')
    
    is_active = BooleanField('Active', default=True)

class CheckupTypeForm(FlaskForm):
    """Checkup type form for create/edit"""
    name = StringField('Name', validators=[
        DataRequired(message='Name is required'),
        Length(max=100, message='Name cannot exceed 100 characters')
    ])
    
    description = TextAreaField('Description', validators=[
        Optional(),
        Length(max=500, message='Description cannot exceed 500 characters')
    ])
    
    price = DecimalField('Price (RM)', validators=[
        DataRequired(message='Price is required'),
        NumberRange(min=0, message='Price must be a positive number')
    ])
    
    duration_minutes = IntegerField('Duration (minutes)', validators=[
        DataRequired(message='Duration is required'),
        NumberRange(min=5, max=240, message='Duration must be between 5 and 240 minutes')
    ], default=30)
    
    max_slots_per_time = IntegerField('Max Slots Per Time', validators=[
        DataRequired(message='Maximum slots is required'),
        NumberRange(min=1, max=50, message='Maximum slots must be between 1 and 50')
    ], default=10)
    
    image = FileField('Service Image')
    
    is_active = BooleanField('Active', default=True)

class HealthFactForm(FlaskForm):
    """Health fact form for create/edit"""
    title = StringField('Title', validators=[
        DataRequired(message='Title is required'),
        Length(max=100, message='Title cannot exceed 100 characters')
    ])
    
    content = TextAreaField('Content', validators=[
        DataRequired(message='Content is required'),
        Length(max=2000, message='Content cannot exceed 2000 characters')
    ])
    
    category = StringField('Category', validators=[
        Optional(),
        Length(max=50, message='Category cannot exceed 50 characters')
    ])
    
    is_featured = BooleanField('Featured', default=False)
    
    is_active = BooleanField('Active', default=True)

class AppointmentForm(FlaskForm):
    """Appointment form for create/edit"""
    user_id = HiddenField('User ID')
    
    checkup_id = SelectField('Checkup Type', validators=[
        DataRequired(message='Checkup type is required')
    ], coerce=int)
    
    appointment_date = DateField('Date', validators=[
        DataRequired(message='Date is required'),
        validate_future_date
    ], format='%Y-%m-%d')
    
    appointment_time = StringField('Time', validators=[
        DataRequired(message='Time is required'),
        Regexp(r'^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$', 
               message='Time must be in 24-hour format (HH:MM:SS)')
    ])
    
    status = SelectField('Status', choices=[
        ('Pending', 'Pending'),
        ('Confirmed', 'Confirmed'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled')
    ], validators=[
        DataRequired(message='Status is required')
    ], default='Confirmed')