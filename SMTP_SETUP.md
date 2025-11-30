# SMTP Email Service Setup for CineFlow

CineFlow includes a comprehensive SMTP email service for sending transactional emails including password resets, email verification, welcome emails, and more.

## 1. Database Migration

First, run the migration to create the email templates table:

```bash
cd server
npm run migrate
```

This will create:
- `email_templates` table for managing email templates
- `email_verified`, `email_verification_token`, and `email_verification_expires` columns in the `users` table
- Default email templates for password reset, email verification, welcome, and password changed notifications

## 2. Environment Variables

### Required:
- `ENCRYPTION_KEY` - **REQUIRED** - At least 32 characters long. Used to encrypt SMTP passwords in the database.
  ```bash
  # Generate a secure key:
  openssl rand -base64 32
  ```

### Optional (for initial seeding):
SMTP settings can be configured in two ways:
1. **Via Admin Dashboard** (Recommended) - Go to Admin Dashboard → Email Templates → Edit Settings
2. **Via Environment Variables** - Will be automatically seeded to database on first startup

If you want to seed from environment variables, update your `server/.env` file:

### For Gmail:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
SMTP_FROM=noreply@cineflow.com
SMTP_SERVICE=gmail
FRONTEND_URL=https://cineflow.youtilitybox.com
```

**Important for Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (16 characters) as `SMTP_PASSWORD`

### For SendGrid:

```dotenv
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@cineflow.com
FRONTEND_URL=https://cineflow.youtilitybox.com
```

### For Mailgun:

```dotenv
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=noreply@cineflow.com
FRONTEND_URL=https://cineflow.youtilitybox.com
```

### For AWS SES:

```dotenv
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@cineflow.com
FRONTEND_URL=https://cineflow.youtilitybox.com
```

## 3. Email Templates

The system includes default templates that can be customized:

### Available Templates:

1. **password_reset** - Sent when user requests password reset
   - Variables: `{{username}}`, `{{resetLink}}`

2. **email_verification** - Sent when user registers
   - Variables: `{{username}}`, `{{verificationLink}}`

3. **welcome** - Sent after successful registration
   - Variables: `{{username}}`, `{{appUrl}}`

4. **password_changed** - Sent when password is changed
   - Variables: `{{username}}`

### Customizing Templates:

Templates can be managed via the admin API:

- `GET /api/emails/templates` - List all templates (admin only)
- `GET /api/emails/templates/:key` - Get specific template (admin only)
- `PUT /api/emails/templates/:key` - Update template (admin only)
- `POST /api/emails/test` - Send test email (admin only)
- `POST /api/emails/verify` - Verify SMTP connection (admin only)

## 4. Email Functionality

### Automatic Emails:

1. **Registration:**
   - Email verification email sent automatically
   - Welcome email sent automatically

2. **Password Reset:**
   - Password reset email sent when user requests reset
   - Password changed notification sent after successful reset

3. **Password Change:**
   - Password changed notification sent when authenticated user changes password

### Email Verification:

- Users receive verification email on registration
- Verification link expires in 24 hours
- Users can resend verification email via `/api/auth/resend-verification`
- Email verification can be enforced for login (optional, see code comments)

## 5. Testing

### Test SMTP Connection:

```bash
curl -X POST http://localhost:5000/api/emails/verify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Send Test Email:

```bash
curl -X POST http://localhost:5000/api/emails/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "template_key": "welcome",
    "variables": {
      "username": "Test User",
      "appUrl": "http://localhost:5173"
    }
  }'
```

## 6. Development Mode

If SMTP is not configured, the system will:
- Log email content to console in development
- Continue to function (emails won't be sent)
- Show warnings about missing SMTP configuration

## 7. Security Notes

- Reset tokens are hashed before storage
- Tokens expire after specified time (1 hour for password reset, 24 hours for email verification)
- Always returns success message to prevent email enumeration
- Email verification is optional (can be enforced by uncommenting code in auth.ts)

## 8. Environment Variables Summary

```dotenv
# REQUIRED - For encrypting passwords in database
ENCRYPTION_KEY=your-encryption-key-minimum-32-characters-long

# OPTIONAL - For initial seeding (can also be set via Admin Dashboard)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@cineflow.com
SMTP_SERVICE=gmail  # For Gmail specifically
FRONTEND_URL=https://cineflow.youtilitybox.com  # For email links
```

**Note:** After initial setup, you can manage all SMTP settings via the Admin Dashboard without needing to update environment variables or restart the server.

## 9. Troubleshooting

### Emails not sending:
1. Check SMTP credentials are correct
2. Verify SMTP connection: `POST /api/emails/verify`
3. Check server logs for SMTP errors
4. For Gmail: Ensure App Password is used (not regular password)
5. Check firewall/network allows SMTP connections

### Templates not found:
1. Ensure migration 023 has been run
2. Check `email_templates` table exists and has data
3. Verify template keys match exactly (case-sensitive)

### Email links not working:
1. Verify `FRONTEND_URL` is set correctly
2. Check frontend routes exist for `/reset-password` and `/verify-email`
3. Ensure tokens are being passed correctly in URLs

