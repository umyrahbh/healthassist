import os
from email_service import send_appointment_confirmation
from datetime import datetime, timedelta

def test_email_send():
    # Get current date and time
    today = datetime.now().date()
    current_time = datetime.now().time()
    
    # Test email with your own email to verify it works
    test_email = input("Enter an email address to send a test confirmation: ")
    test_name = input("Enter a name for the test recipient: ")
    
    # Create test appointment details
    appointment_date = today + timedelta(days=7)  # 1 week from today
    appointment_time = current_time.replace(hour=10, minute=30)  # 10:30 AM
    checkup_name = "General Health Checkup"
    
    print(f"\nSending test email to {test_name} ({test_email})")
    print(f"Appointment: {checkup_name}")
    print(f"Date: {appointment_date.strftime('%A, %B %d, %Y')}")
    print(f"Time: {appointment_time.strftime('%I:%M %p')}")
    print("\nSending email...")
    
    # Send test email
    result = send_appointment_confirmation(
        user_email=test_email,
        user_name=test_name,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        checkup_name=checkup_name
    )
    
    if result:
        print("\n✅ Email test successful!")
        print("The email has been sent to the specified address.")
    else:
        print("\n❌ Email test failed!")
        print("Check the 'emails' directory for a saved copy of the email.")
        print("Make sure GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables are set correctly.")

if __name__ == "__main__":
    test_email_send()