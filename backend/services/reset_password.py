import secrets
import smtplib
from email.mime.text import MIMEText
from firebase_admin import auth
import os
from dotenv import load_dotenv

load_dotenv()

# Store reset tokens in memory (use database in production)
reset_tokens = {}

# Step 1: Generate token and send email
def send_reset_email(email):
    user = auth.get_user_by_email(email)

    # Generate secure token
    token = secrets.token_urlsafe(32)
    reset_tokens[token] = user.uid

    # Link user will click
    reset_link = f"http://localhost:5173/reset-password?token={token}"

    # Send the email
    msg = MIMEText(f"Click to reset your password: {reset_link}")
    msg["Subject"] = "Reset your password"
    msg["From"] = os.getenv("MAIL_FROM")
    msg["To"] = email

    try:
        with smtplib.SMTP(os.getenv("MAIL_SERVER"), int(os.getenv("MAIL_PORT"))) as server:
            server.starttls()
            server.login(os.getenv("MAIL_USERNAME"), os.getenv("MAIL_PASSWORD"))
            server.send_message(msg)
        return True
    except Exception as e:
        print("Email send error:", e)
        return False

def reset_password(token, new_password):
    if token not in reset_tokens:
        return False
    uid = reset_tokens.pop(token)
    auth.update_user(uid, password=new_password)
    return True   
