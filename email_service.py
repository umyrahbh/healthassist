import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def format_date(date_obj):
    """Format date for email display"""
    return date_obj.strftime("%A, %B %d, %Y")

def format_time(time_obj):
    """Format time for email display"""
    return time_obj.strftime("%I:%M %p")

def save_email_to_file(user_email, subject, content):
    """
    Save email content to a file as a fallback when SMTP fails
    
    Args:
        user_email: Recipient's email address
        subject: Email subject
        content: HTML content of the email
        
    Returns:
        bool: True if file was saved successfully, False otherwise
    """
    try:
        # Create emails directory if it doesn't exist
        os.makedirs('emails', exist_ok=True)
        
        # Generate filename based on email and timestamp
        filename = f"emails/email_{user_email.replace('@', '_at_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        # Create a simple wrapper for the HTML content
        wrapper = f"""
        <html>
        <head>
            <title>{subject}</title>
            <style>
                body {{ font-family: Arial, sans-serif; padding: 20px; }}
                .email-info {{ background-color: #f0f0f0; padding: 10px; margin-bottom: 20px; }}
            </style>
        </head>
        <body>
            <div class="email-info">
                <p><strong>To:</strong> {user_email}</p>
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p><strong>Note:</strong> This email was not sent due to SMTP issues. It is saved here for later sending.</p>
            </div>
            <div class="email-content">
                {content}
            </div>
        </body>
        </html>
        """
        
        # Write to file
        with open(filename, 'w') as f:
            f.write(wrapper)
            
        logger.info(f"Email saved to file: {filename}")
        print(f"Email to {user_email} saved to file: {filename}")
        return True
        
    except Exception as e:
        logger.error(f"Error saving email to file: {str(e)}")
        print(f"Error saving email to file: {str(e)}")
        return False

def send_appointment_confirmation(user_email, user_name, appointment_date, appointment_time, checkup_name):
    """
    Send appointment confirmation email to user using Gmail
    With fallback to saving email to file if SMTP fails
    
    Args:
        user_email: User's email address
        user_name: User's name
        appointment_date: Date of appointment (date object)
        appointment_time: Time of appointment (time object)
        checkup_name: Type of checkup
        
    Returns:
        bool: True if email was sent successfully (or saved to file), False otherwise
    """
    try:
        # Check if Gmail credentials exist
        gmail_email = os.environ.get('GMAIL_EMAIL')
        gmail_app_password = os.environ.get('GMAIL_APP_PASSWORD')
        
        # Log the email being used (without showing the password)
        print(f"Sending email using Gmail account: {gmail_email}")
        
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
        
        # Create SMTP session with enhanced error handling
        try:
            logger.info(f"Connecting to Gmail SMTP server...")
            print(f"Connecting to Gmail SMTP server...")
            
            # Create a secure SSL context
            context = ssl.create_default_context()
            
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                logger.info(f"Connected to SMTP server, attempting login with {gmail_email}")
                print(f"Connected to SMTP server, attempting login with {gmail_email}")
                
                # Attempt login
                server.login(gmail_email, gmail_app_password)
                logger.info(f"Login successful, sending message...")
                print(f"Login successful, sending message...")
                
                # Send the email
                server.send_message(message)
                logger.info(f"Email sent to {user_email} via Gmail successfully")
                print(f"Email sent to {user_email} via Gmail successfully")
            
            return True
            
        except smtplib.SMTPAuthenticationError as auth_error:
            logger.error(f"SMTP Authentication Error: {auth_error}")
            print(f"SMTP Authentication Error: {auth_error}")
            print(f"This typically means the username or password is incorrect.")
            print(f"Make sure your Gmail App Password is correct and 2FA is enabled on your account.")
            print(f"Falling back to saving email as file...")
            subject = "HealthAssist: Your Appointment Confirmation"
            return save_email_to_file(user_email, subject, html_content)
            
        except smtplib.SMTPRecipientsRefused as recipient_error:
            logger.error(f"SMTP Recipients Refused Error: {recipient_error}")
            print(f"SMTP Recipients Refused Error: {recipient_error}")
            print(f"This typically means the recipient email address is invalid.")
            print(f"Falling back to saving email as file...")
            subject = "HealthAssist: Your Appointment Confirmation"
            return save_email_to_file(user_email, subject, html_content)
            
        except ssl.SSLError as ssl_error:
            logger.error(f"SSL Error: {ssl_error}")
            print(f"SSL Error: {ssl_error}")
            print(f"This typically means there's an issue with the SSL/TLS connection.")
            print(f"Falling back to saving email as file...")
            subject = "HealthAssist: Your Appointment Confirmation"
            return save_email_to_file(user_email, subject, html_content)
            
        except smtplib.SMTPException as smtp_error:
            logger.error(f"SMTP Error: {smtp_error}")
            print(f"SMTP Error: {smtp_error}")
            print(f"Falling back to saving email as file...")
            subject = "HealthAssist: Your Appointment Confirmation"
            return save_email_to_file(user_email, subject, html_content)
            
        except TimeoutError as timeout_error:
            logger.error(f"Timeout Error: {timeout_error}")
            print(f"Timeout Error: {timeout_error}")
            print(f"Connection to the SMTP server timed out.")
            print(f"Falling back to saving email as file...")
            subject = "HealthAssist: Your Appointment Confirmation"
            return save_email_to_file(user_email, subject, html_content)
        
    except Exception as e:
        print(f"Error sending appointment confirmation email: {str(e)}")
        try:
            # Try to save as a file as a last resort
            print("Attempting to save email as file after exception...")
            subject = "HealthAssist: Your Appointment Confirmation"
            formatted_date = format_date(appointment_date)
            formatted_time = format_time(appointment_time)
            
            # Create simple HTML content in case the earlier content creation failed
            simple_html = f"""
            <html>
            <body>
                <h1>Appointment Confirmation</h1>
                <p>Dear {user_name},</p>
                <p>Your appointment has been successfully scheduled at HealthAssist.</p>
                <p><strong>Appointment Type:</strong> {checkup_name}</p>
                <p><strong>Date:</strong> {formatted_date}</p>
                <p><strong>Time:</strong> {formatted_time}</p>
                <p>Please arrive 15 minutes before your scheduled time.</p>
                <p>Thank you for choosing HealthAssist for your healthcare needs.</p>
            </body>
            </html>
            """
            
            return save_email_to_file(user_email, subject, simple_html)
        except:
            print("Failed even to save email as file.")
            return False