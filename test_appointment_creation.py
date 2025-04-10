import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, CheckupType, Appointment, Base
from email_service import send_appointment_confirmation

# Connect to the database
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def test_appointment_creation_with_email():
    """
    Test creating an appointment and sending a confirmation email
    """
    try:
        # Get a user from the database (first admin user)
        user = session.query(User).filter(User.user_type == 'Admin').first()
        if not user:
            print("Error: No admin user found in the database.")
            return False
            
        # Get a checkup type from the database (first active one)
        checkup = session.query(CheckupType).filter(CheckupType.is_active == 1).first()
        if not checkup:
            print("Error: No active checkup types found in the database.")
            return False
            
        # Create appointment date (1 week from today)
        today = datetime.now().date()
        appointment_date = today + timedelta(days=7)
        
        # Create appointment time (10:30 AM)
        appointment_time = datetime.now().time().replace(hour=10, minute=30)
        
        print(f"\nCreating test appointment for user: {user.user_name} (ID: {user.user_id})")
        print(f"Email: {user.email}")
        print(f"Checkup: {checkup.name} (ID: {checkup.checkup_id})")
        print(f"Date: {appointment_date.strftime('%A, %B %d, %Y')}")
        print(f"Time: {appointment_time.strftime('%I:%M %p')}")
        
        # Create a new appointment
        new_appointment = Appointment(
            user_id=user.user_id,
            checkup_id=checkup.checkup_id,
            checkup_name=checkup.name,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status="Confirmed",
            price_paid=float(checkup.price)
        )
        
        # Add to database and commit
        session.add(new_appointment)
        session.commit()
        
        print(f"✅ Appointment created successfully: ID {new_appointment.appointment_id}")
        
        # Send confirmation email
        print("\nSending confirmation email...")
        email_result = send_appointment_confirmation(
            user_email=user.email,
            user_name=user.user_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            checkup_name=checkup.name
        )
        
        if email_result:
            print(f"✅ Confirmation email sent successfully to {user.email}")
            return True
        else:
            print(f"❌ Failed to send confirmation email to {user.email}")
            return False
            
    except Exception as e:
        print(f"Error in test appointment creation: {str(e)}")
        session.rollback()
        return False
    finally:
        session.close()

if __name__ == "__main__":
    test_appointment_creation_with_email()