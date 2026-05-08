export interface Room {
    room_id: number;
    room_number: string;
    type: string;
    capacity: number;
    status: 'Available' | 'Booked' | 'Pending';
}

export interface User {
    id: number; // For internal app compatibility, mapping user_id to id
    name: string;
    email: string;
    role: 'student' | 'faculty' | 'admin';
}

export interface Booking {
    booking_id: number;
    booking_date: string;
    time_slot: string;
    status: 'Confirmed' | 'Cancelled' | 'Pending';
    user_id: number;
    room_id: number;
}
