-- HealthAssist Database Schema

-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    gender VARCHAR(6) NOT NULL,
    birthday DATE NOT NULL,
    phone_number BIGINT NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_type VARCHAR(6) NOT NULL DEFAULT 'Normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checkup Types Table
CREATE TABLE checkup_types (
    checkup_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    max_slots_per_time INTEGER NOT NULL DEFAULT 10,
    image_path VARCHAR(255),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    checkup_id INTEGER NOT NULL REFERENCES checkup_types(checkup_id),
    checkup_name VARCHAR(100) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
    price_paid NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for appointment slots
CREATE INDEX idx_appointment_slot ON appointments (appointment_date, appointment_time, checkup_id);

-- Specialists Table
CREATE TABLE specialists (
    specialist_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    bio TEXT,
    image_path VARCHAR(255),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health Facts Table
CREATE TABLE health_facts (
    fact_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO users (user_name, gender, birthday, phone_number, email, username, password, user_type)
VALUES ('Administrator', 'Other', '1990-01-01', 1234567890, 'admin@healthassist.com', 'admin', 
        -- Using Werkzeug's generate_password_hash for 'admin123'
        'pbkdf2:sha256:260000$2nyGGnhQmLjxRl0f$2fe65f8ba43bbfdd5df93cb4f5e1af3e33334af13b84e87f7a9e1672ff68c7e0', 
        'Admin');

-- Sample Checkup Types
INSERT INTO checkup_types (name, description, price, duration_minutes, max_slots_per_time)
VALUES 
    ('General Health Checkup', 'Comprehensive health assessments to monitor your overall well-being and catch potential issues early.', 150.00, 60, 10),
    ('Dental Checkup', 'Regular dental examinations and cleaning services to maintain optimal oral health.', 120.00, 45, 8),
    ('Eye Checkup', 'Vision assessments and eye health screenings conducted by experienced ophthalmologists.', 100.00, 30, 12),
    ('Pregnancy Consultation', 'Specialized care and advice for expectant mothers throughout their pregnancy journey.', 180.00, 60, 6),
    ('Heart Health Assessment', 'Detailed cardiovascular evaluations to assess heart function and identify potential risks.', 200.00, 90, 4);

-- Sample Specialists
INSERT INTO specialists (name, title, specialization, bio)
VALUES 
    ('Dr. Sarah Johnson', 'Senior Physician', 'General Medicine', 'Dr. Johnson has over 15 years of experience in general medicine and preventive healthcare.'),
    ('Dr. Michael Chen', 'Cardiologist', 'Heart Health', 'Specializing in cardiovascular health with a focus on preventive cardiology and heart disease management.'),
    ('Dr. Lisa Garcia', 'Ophthalmologist', 'Eye Care', 'Board-certified eye specialist with expertise in comprehensive eye examinations and treatment of various eye conditions.'),
    ('Dr. Robert Patel', 'Dentist', 'Dental Care', 'Experienced dentist providing comprehensive dental care including preventive, restorative, and cosmetic procedures.'),
    ('Dr. Emily Wong', 'Gynecologist', 'Women''s Health', 'Specializing in women''s reproductive health with particular expertise in prenatal and postnatal care.');

-- Sample Health Facts
INSERT INTO health_facts (title, content, category, is_featured, is_active)
VALUES 
    ('The Importance of Hydration', 'Drinking adequate water daily is essential for optimal bodily functions. Aim for at least 8 glasses of water per day to maintain proper hydration.', 'Nutrition', 1, 1),
    ('Benefits of Regular Exercise', 'Just 30 minutes of moderate physical activity daily can significantly reduce the risk of heart disease, improve mental health, and increase longevity.', 'Fitness', 1, 1),
    ('Sleep and Health', 'Adults should aim for 7-9 hours of quality sleep per night. Consistent sleep patterns help regulate metabolism, improve cognitive function, and strengthen immune response.', 'Wellness', 0, 1),
    ('Dental Health Tips', 'Brush teeth twice daily, floss regularly, and schedule dental checkups every six months to maintain optimal oral health and prevent cavities.', 'Dental', 0, 1),
    ('Eye Care Essentials', 'Rest your eyes every 20 minutes when using digital screens by looking at something 20 feet away for 20 seconds to reduce eye strain and prevent vision problems.', 'Vision', 0, 1);

-- Sample Appointments (for demonstration purposes)
-- Note: In a real system, these would be created through the application
INSERT INTO appointments (user_id, checkup_id, checkup_name, appointment_date, appointment_time, status, price_paid)
VALUES 
    (1, 1, 'General Health Checkup', '2025-04-15', '10:00:00', 'Confirmed', 150.00),
    (1, 3, 'Eye Checkup', '2025-04-20', '14:30:00', 'Confirmed', 100.00);