export const otpTemplate = (otp: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        p {
            color: #555;
            line-height: 1.6;
        }
        .otp-code {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            text-align: center;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
            margin: 20px 0;
            letter-spacing: 3px;
        }
        .footer {
            margin-top: 20px;
            font-size: 0.9em;
            color: #777;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
    <p>Please verify your email address using the OTP code below:</p>
    <div class="otp-code">${otp}</div>
        <p>This code will expire in 10 minutes.</p>
        <div class="footer">
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
`;
};