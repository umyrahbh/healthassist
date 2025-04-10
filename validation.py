"""
Validation utilities for HealthAssist application
"""
import re
from datetime import datetime, date

# Constants for validation criteria
USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 12
NAME_MIN_LENGTH = 2
NAME_MAX_LENGTH = 50
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 64
PHONE_MIN_LENGTH = 8
PHONE_MAX_LENGTH = 15
BIO_MAX_LENGTH = 500
EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]"

# Error messages
ERROR_MESSAGES = {
    "required": "This field is required.",
    "username_length": f"Username must be between {USERNAME_MIN_LENGTH} and {USERNAME_MAX_LENGTH} characters.",
    "username_format": "Username can only contain letters, numbers, and underscores.",
    "name_length": f"Name must be between {NAME_MIN_LENGTH} and {NAME_MAX_LENGTH} characters.",
    "name_format": "Name can only contain letters, spaces, and hyphens.",
    "password_length": f"Password must be between {PASSWORD_MIN_LENGTH} and {PASSWORD_MAX_LENGTH} characters.",
    "password_strength": "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
    "email_format": "Please enter a valid email address.",
    "phone_format": "Phone number must contain only digits, spaces, or symbols +()-.",
    "phone_length": f"Phone number must be between {PHONE_MIN_LENGTH} and {PHONE_MAX_LENGTH} characters.",
    "future_date": "Date cannot be in the past.",
    "valid_price": "Price must be a positive number.",
    "bio_length": f"Bio cannot exceed {BIO_MAX_LENGTH} characters.",
    "invalid_date": "Please enter a valid date (YYYY-MM-DD).",
    "invalid_time": "Please enter a valid time (HH:MM:SS).",
}

def validate_required(value, field_name="Field"):
    """Validate that a field is not empty"""
    if not value or value.strip() == "":
        return False, ERROR_MESSAGES["required"]
    return True, ""

def validate_username(username):
    """Validate username format and length"""
    if not username:
        return False, ERROR_MESSAGES["required"]
    
    # Check length
    if len(username) < USERNAME_MIN_LENGTH or len(username) > USERNAME_MAX_LENGTH:
        return False, ERROR_MESSAGES["username_length"]
        
    # Check format (alphanumeric and underscore only)
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        return False, ERROR_MESSAGES["username_format"]
        
    return True, ""

def validate_name(name):
    """Validate name format and length"""
    if not name:
        return False, ERROR_MESSAGES["required"]
        
    # Check length
    if len(name) < NAME_MIN_LENGTH or len(name) > NAME_MAX_LENGTH:
        return False, ERROR_MESSAGES["name_length"]
        
    # Check format (letters, spaces, and hyphens only)
    if not re.match(r"^[a-zA-Z\s\-]+$", name):
        return False, ERROR_MESSAGES["name_format"]
        
    return True, ""

def validate_password(password):
    """Validate password strength and length"""
    if not password:
        return False, ERROR_MESSAGES["required"]
        
    # Check length
    if len(password) < PASSWORD_MIN_LENGTH or len(password) > PASSWORD_MAX_LENGTH:
        return False, ERROR_MESSAGES["password_length"]
        
    # Check strength
    # Requires at least one uppercase, one lowercase, one digit, and one special character
    if not (
        re.search(r"[A-Z]", password) and  # Has uppercase
        re.search(r"[a-z]", password) and  # Has lowercase
        re.search(r"\d", password) and     # Has digit
        re.search(r"[@$!%*?&#]", password)  # Has special char
    ):
        return False, ERROR_MESSAGES["password_strength"]
        
    return True, ""

def validate_email(email):
    """Validate email format"""
    if not email:
        return False, ERROR_MESSAGES["required"]
        
    if not re.match(EMAIL_REGEX, email):
        return False, ERROR_MESSAGES["email_format"]
        
    return True, ""

def validate_phone(phone):
    """Validate phone number"""
    if not phone:
        return False, ERROR_MESSAGES["required"]
        
    # Remove allowed formatting characters for length check
    cleaned_phone = re.sub(r"[\s\+\(\)\-]", "", str(phone))
    
    # Check length of digits
    if len(cleaned_phone) < PHONE_MIN_LENGTH or len(cleaned_phone) > PHONE_MAX_LENGTH:
        return False, ERROR_MESSAGES["phone_length"]
        
    # Check that it only contains digits after cleaning
    if not cleaned_phone.isdigit():
        return False, ERROR_MESSAGES["phone_format"]
        
    return True, ""

def validate_date(date_str):
    """Validate date string format"""
    if not date_str:
        return False, ERROR_MESSAGES["required"]
        
    try:
        # Attempt to parse the date
        datetime.strptime(date_str, "%Y-%m-%d")
        return True, ""
    except ValueError:
        return False, ERROR_MESSAGES["invalid_date"]

def validate_future_date(date_str):
    """Validate date is in the future"""
    valid, error = validate_date(date_str)
    if not valid:
        return valid, error
        
    try:
        # Ensure date is not in the past
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = date.today()
        
        if date_obj < today:
            return False, ERROR_MESSAGES["future_date"]
            
        return True, ""
    except ValueError:
        return False, ERROR_MESSAGES["invalid_date"]

def validate_time(time_str):
    """Validate time string format"""
    if not time_str:
        return False, ERROR_MESSAGES["required"]
        
    try:
        # Attempt to parse the time
        datetime.strptime(time_str, "%H:%M:%S")
        return True, ""
    except ValueError:
        return False, ERROR_MESSAGES["invalid_time"]

def validate_price(price):
    """Validate price is positive number"""
    if price is None:
        return False, ERROR_MESSAGES["required"]
        
    try:
        price_value = float(price)
        if price_value <= 0:
            return False, ERROR_MESSAGES["valid_price"]
        return True, ""
    except (ValueError, TypeError):
        return False, ERROR_MESSAGES["valid_price"]

def validate_bio(bio):
    """Validate specialist bio length"""
    if bio and len(bio) > BIO_MAX_LENGTH:
        return False, ERROR_MESSAGES["bio_length"]
    return True, ""