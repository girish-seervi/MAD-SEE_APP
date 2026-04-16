import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'student' | 'admin' | 'faculty';
}

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    loading: boolean;
    login: (userData: User) => Promise<void>;
    loginTemp: (userData: User) => void;   // In-memory only — does NOT persist to AsyncStorage
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session on mount
        const loadSession = async () => {
            try {
                const savedUser = await AsyncStorage.getItem('@user_session');
                if (savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    setIsLoggedIn(true);
                }
            } catch (err) {
                console.error("Failed to restore session", err);
            } finally {
                setLoading(false);
            }
        };

        loadSession();
    }, []);

    const login = async (userData: User) => {
        try {
            await AsyncStorage.setItem('@user_session', JSON.stringify(userData));
            setUser(userData);
            setIsLoggedIn(true);
        } catch (err) {
            console.error("Failed to save session", err);
            throw err;
        }
    };

    // Temporary / bypass login — sets state in memory but does NOT write to AsyncStorage.
    // On next app launch the user will be taken to the Login screen as expected.
    const loginTemp = (userData: User) => {
        setUser(userData);
        setIsLoggedIn(true);
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('@user_session');
            setUser(null);
            setIsLoggedIn(false);
        } catch (err) {
            console.error("Failed to clear session", err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoggedIn, loading, login, loginTemp, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
