import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ShieldCheck, GraduationCap } from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, SPACING } from '../theme/theme';
import { CustomButton, CustomInput } from '../components/Common';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

interface LoginErrors {
    email?: string;
    password?: string;
}

const LoginScreen = () => {
    const { login, loginTemp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'student' | 'admin'>('student');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<LoginErrors>({});

    const validate = () => {
        let valid = true;
        let newErrors: LoginErrors = {};

        if (!email) {
            newErrors.email = 'Email is required';
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email';
            valid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required';
            valid = false;
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
            newErrors.password = 'Min 8 chars, with uppercase, lowercase, number & special char (@$!%*?&)';
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const response = await authApi.login({ email, password });
            
            if (response.data.success) {
                const userData = response.data.user;
                
                // Map backend roles to frontend if needed (backend returns 'student'/'admin'/'faculty')
                const userRole = userData.role.toLowerCase() as 'student' | 'admin' | 'faculty';
                
                // Security check: ensure user is logging in with correct role selected
                if (userRole !== role && !(userRole === 'faculty' && role === 'student')) {
                    Toast.show({
                        type: 'error',
                        text1: 'Role Mismatch',
                        text2: `This account is registered as ${userData.role}.`,
                    });
                    setLoading(false);
                    return;
                }

                await login({
                    ...userData,
                    role: userRole
                });

                Toast.show({
                    type: 'success',
                    text1: 'Login Successful',
                    text2: `Welcome back, ${userData.name}!`,
                });
            }
        } catch (error: any) {
            setLoading(false);
            console.error("Login Error:", error);
            
            // BYPASS LOGIC: Fallback for testing when backend is unreachable
            const isNetworkError = error?.message === 'Network Error' || 
                                 error?.code === 'ERR_NETWORK' || 
                                 !error?.response;

            if (isNetworkError) {
                console.log("Bypassing network error with mock data...");
                // Use loginTemp so this session is NOT saved to AsyncStorage.
                loginTemp({
                    id: 999,
                    name: email.split('@')[0],
                    email: email,
                    role: role
                });
                Toast.show({
                    type: 'info',
                    text1: 'Bypass Active',
                    text2: 'Logged in with offline test data.',
                });
                return;
            }

            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error.response?.data?.message || 'Network error. Please check your connection.',
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            {/* In a real app, this require would work if the file exists */}
                            <Image 
                                source={require('../assets/logo.png')} 
                                style={styles.logo} 
                                defaultSource={require('../assets/logo.png')}
                            />
                        </View>
                        <Text style={styles.title}>College Room App</Text>
                        <Text style={styles.subtitle}>Manage and book campus facilities effortlessly</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Sign In</Text>
                        
                        {/* Role Selector */}
                        <View style={styles.roleContainer}>
                            <TouchableOpacity 
                                style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
                                onPress={() => setRole('student')}
                                activeOpacity={0.8}
                            >
                                <GraduationCap size={18} color={role === 'student' ? COLORS.primary : COLORS.textSecondary} />
                                <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]}
                                onPress={() => setRole('admin')}
                                activeOpacity={0.8}
                            >
                                <ShieldCheck size={18} color={role === 'admin' ? COLORS.primary : COLORS.textSecondary} />
                                <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>Admin</Text>
                            </TouchableOpacity>
                        </View>

                        <CustomInput 
                            label="Email Address"
                            placeholder="example@rvu.edu.in"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (errors.email) setErrors({ ...errors, email: undefined });
                            }}
                            icon={Mail}
                            error={errors.email}
                        />

                        <CustomInput 
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (errors.password) setErrors({ ...errors, password: undefined });
                            }}
                            icon={Lock}
                            secureTextEntry={true}
                            error={errors.password}
                        />

                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <CustomButton 
                            title="Sign In"
                            onPress={handleLogin}
                            loading={loading}
                            style={styles.loginBtn}
                        />

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>New here? </Text>
                            <TouchableOpacity>
                                <Text style={styles.signUpText}>Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#FFF',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
    },
    logo: {
        width: 70,
        height: 70,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    formCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: SIZES.radiusLg,
        padding: SPACING.lg,
        ...SHADOWS.dark,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    roleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.inputBackground,
        borderRadius: SIZES.radius,
        marginBottom: SPACING.lg,
        padding: 4,
    },
    roleBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: SIZES.radius - 4,
        gap: 8,
    },
    roleBtnActive: {
        backgroundColor: '#FFF',
        ...SHADOWS.light,
    },
    roleText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    roleTextActive: {
        color: COLORS.primary,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: SPACING.lg,
    },
    forgotText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    loginBtn: {
        marginTop: SPACING.sm,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    signUpText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
