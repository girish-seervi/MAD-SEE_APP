import axios from 'axios';

// Replace with your system's IP address for physical device testing
const BASE_URL = 'http://10.238.121.72:5000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 3000, // Fast fallback: drops to mock data in 3s if server is unreachable
});

export const authApi = {
    login: (credentials: any) => api.post('/auth/login', credentials),
};

export const roomApi = {
    getAll: () => api.get('/rooms'),
    updateStatus: (id: number, status: string) => api.put(`/rooms/${id}/status`, { status }),
};

export const bookingApi = {
    create: (data: any) => api.post('/bookings', data),
    getUserBookings: (userId: number) => api.get(`/bookings/user/${userId}`),
    cancel: (id: string) => api.put(`/bookings/${id}/cancel`),
};

export const adminApi = {
    getAllBookings: () => api.get('/admin/bookings'),
    getStats: () => api.get('/admin/stats'),
};

export default api;
