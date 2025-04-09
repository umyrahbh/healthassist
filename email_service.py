import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def format_date(date_obj):
    """Format date for email display"""
    return date_obj.strftime("%A, %B %d, %Y")

def format_time(time_obj):
    """Format time for email display"""
    return time_obj.strftime("%I:%M %p")

def send_appointment_confirmation(user_email, user_name, appointment_date, appointment_time, checkup_name):
    """
    Send appointment confirmation email to user using Gmail
    
    Args:
        user_email: User's email address
        user_name: User's name
        appointment_date: Date of appointment (date object)
        appointment_time: Time of appointment (time object)
        checkup_name: Type of checkup
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Check if Gmail credentials exist
        gmail_email = os.environ.get('GMAIL_EMAIL')
        gmail_app_password = os.environ.get('GMAIL_APP_PASSWORD')
        
        if not gmail_email or not gmail_app_password:
            print("Gmail credentials are not set in environment variables")
            return False
        
        # Format date and time for display
        formatted_date = format_date(appointment_date)
        formatted_time = format_time(appointment_time)
        
        # Create email content
        html_content = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }}
                .header {{
                    background-color: #b71c1c;
                    color: white;
                    padding: 10px 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    padding: 20px;
                }}
                .appointment-details {{
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-left: 4px solid #b71c1c;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    padding-top: 20px;
                    font-size: 0.8em;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Appointment Confirmation</h1>
                </div>
                <div class="content">
                    <p>Dear {user_name},</p>
                    <p>Your appointment has been successfully scheduled at HealthAssist. Here are the details:</p>
                    
                    <div class="appointment-details">
                        <p><strong>Appointment Type:</strong> {checkup_name}</p>
                        <p><strong>Date:</strong> {formatted_date}</p>
                        <p><strong>Time:</strong> {formatted_time}</p>
                    </div>
                    
                    <p>Please arrive 15 minutes before your scheduled time. If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.</p>
                    
                    <p>Thank you for choosing HealthAssist for your healthcare needs.</p>
                    
                    <p>Best regards,<br>
                    HealthAssist Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated email, please do not reply to this message.</p>
                    <p>&copy; 2025 HealthAssist. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create email message
        message = MIMEMultipart("alternative")
        message["Subject"] = "HealthAssist: Your Appointment Confirmation"
        message["From"] = gmail_email
        message["To"] = user_email
        
        # Create HTML part
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Create SMTP session
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_email, gmail_app_password)
            server.send_message(message)
            
        print(f"Email sent to {user_email} via Gmail")
        return True
        
    except Exception as e:
        print(f"Error sending appointment confirmation email: {str(e)}")
        return False