-- College Room Availability Management System Database Schema

CREATE DATABASE IF NOT EXISTS college_room_db;
USE college_room_db;

-- 1. User Table
CREATE TABLE IF NOT EXISTS User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Room Table
CREATE TABLE IF NOT EXISTS Room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL, -- e.g., Lab, Lecture Hall, Seminar Room
    capacity INT NOT NULL,
    status ENUM('Available', 'Booked', 'Pending') DEFAULT 'Available'
);

-- 3. Booking Table
CREATE TABLE IF NOT EXISTS Booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL, -- e.g., "09:00 AM - 10:00 AM"
    status ENUM('Confirmed', 'Cancelled', 'Pending') DEFAULT 'Confirmed',
    user_id INT,
    room_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES Room(room_id) ON DELETE CASCADE
);

-- Insert Sample Data
INSERT INTO User (name, email, password, role) VALUES 
('John Doe', 'john@example.com', 'password123', 'student'),
('Jane Smith', 'jane@example.com', 'password123', 'faculty');

INSERT INTO Room (room_number, type, capacity, status) VALUES 
('LH-101', 'Lecture Hall', 60, 'Available'),
('LB-202', 'Computer Lab', 30, 'Available'),
('SR-303', 'Seminar Room', 15, 'Booked'),
('LH-102', 'Lecture Hall', 50, 'Pending');
