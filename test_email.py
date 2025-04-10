import os
from email_service import send_appointment_confirmation
from datetime import datetime, timedelta

def test_email_with_different_dates():
    # Test different dates and times for appointments
    today = datetime.now().date()
    current_time = datetime.now().time()
    
    # Create some test appointments
    test_appointments = [
        {
            "name": "John Doe",
            "email": "test1@example.com",
            "date": today + timedelta(days=7),
            "time": current_time,
            "checkup": "General Health Checkup"
        },
        {
            "name": "Alice Smith",
            "email": "test2@example.com",
            "date": today + timedelta(days=14),
            "time": current_time.replace(hour=10, minute=30),
            "checkup": "Pregnancy Consultation"
        },
        {
            "name": "Bob Johnson",
            "email": "test3@example.com",
            "date": today + timedelta(days=21),
            "time": current_time.replace(hour=14, minute=0),
            "checkup": "Pediatric Checkup"
        }
    ]
    
    # Send test emails
    print("Sending test emails...")
    for appointment in test_appointments:
        result = send_appointment_confirmation(
            user_email=appointment["email"],
            user_name=appointment["name"],
            appointment_date=appointment["date"],
            appointment_time=appointment["time"],
            checkup_name=appointment["checkup"]
        )
        
        print(f"Email to {appointment['name']} ({appointment['email']}): {'Success' if result else 'Failed'}")
    
    print("Test completed. Check the 'emails' directory for saved email files.")

if __name__ == "__main__":
    test_email_with_different_dates()