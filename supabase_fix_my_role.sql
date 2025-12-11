-- Replace 'YOUR_EMAIL_HERE' with your actual email address
UPDATE profiles
SET role = 'manager', verified = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'rushdan.ibnantiku@gmail.com'
);
