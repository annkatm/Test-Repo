<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        /* Email-safe styles, aligned to login page aesthetics */
        body {
            margin: 0;
            padding: 0;
            background: #f4f6fb; /* light gray similar to app bg */
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .wrapper {
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            padding: 24px 16px 40px;
            font-family: "Inter", Arial, Helvetica, sans-serif;
            line-height: 1.55;
            color: #1b2b41; /* dark slate used in UI */
        }
        .header {
            text-align: center;
            padding: 28px 20px 10px;
        }
        .brand-title {
            margin: 8px 0 0 0;
            color: #0f2d57;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.4px;
        }
        .hero {
            height: 84px;
            border-radius: 18px;
            margin: 0 0 16px 0;
            /* abstract diagonal motif similar to login */
            background: 
                linear-gradient(135deg, rgba(31, 61, 115, 0.12) 0%, rgba(31, 61, 115, 0.12) 40%, rgba(255,255,255,0) 40%),
                linear-gradient(315deg, rgba(65, 131, 196, 0.12) 0%, rgba(65, 131, 196, 0.12) 36%, rgba(255,255,255,0) 36%),
                linear-gradient(180deg, #f0f4ff, #f6f9ff);
            border: 1px solid #e6ecf5;
        }
        .card {
            background: #ffffff;
            border-radius: 18px;
            padding: 28px 28px 20px;
            box-shadow: 0 10px 24px rgba(8, 29, 66, 0.08);
            border: 1px solid #e6ecf5;
        }
        h2.title {
            margin: 0 0 10px 0;
            font-size: 20px;
            color: #0f2d57;
            font-weight: 800;
        }
        .lead {
            margin: 0 0 16px 0;
            color: #42566b;
        }
        .cta {
            text-align: center;
            margin: 22px 0 6px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background: #1E3A8A; /* exact navy to match login */
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 28px;
            font-weight: 700;
            letter-spacing: 0.3px;
            box-shadow: 0 6px 14px rgba(31, 61, 115, 0.35);
        }
        .note {
            margin: 18px 0 0 0;
            font-size: 13px;
            color: #6b7d90;
        }
        .warning {
            background: #fff9e6;
            border: 1px solid #ffe3a1;
            color: #6b5600;
            padding: 16px;
            border-radius: 12px;
            margin: 18px 0;
        }
        .footer {
            text-align: center;
            margin-top: 18px;
            color: #7a8da6;
            font-size: 12px;
        }
        .muted-link {
            color: #1f57c3;
            word-break: break-all;
        }
        @media (prefers-color-scheme: dark) {
            body { background: #0e1420; }
            .wrapper { color: #dbe7ff; }
            .card { background: #121a2a; border-color: #1f2b44; box-shadow: none; }
            .lead { color: #b6c6de; }
            .footer { color: #9bb0cc; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="hero"></div>
        <div class="header">
            <img src="\images\Frame_89-removebg-preview.png" alt="iREPLY Logo" style="height: 72px; width: auto;">
            <div class="brand-title" style="color:#1E3A8A">iREPLY</div>
        </div>

        <div class="card">
            <h2 class="title">Reset Your Password</h2>
            <p class="lead">Hello,</p>
            <p class="lead">You requested to reset your password for your iREPLY account. Click the button below to create a new password.</p>

            <div class="cta">
                <a href="{{ $url }}" class="button">RESET PASSWORD</a>
            </div>

            <div class="warning">
                <strong>Security Notice</strong>
                <ul style="margin: 8px 0 0 18px; padding: 0;">
                    <li>This link will expire in 1 hour.</li>
                    <li>If you didn't request this, please ignore this email.</li>
                    <li>For security reasons, don't share this link with anyone.</li>
                </ul>
            </div>

            <p class="note">If the button doesn't work, copy and paste this link into your browser:</p>
            <p class="muted-link">{{ $url }}</p>

            <p class="lead" style="margin-top: 22px;">Best regards,<br>The iREPLY Team</p>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} iREPLY. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
