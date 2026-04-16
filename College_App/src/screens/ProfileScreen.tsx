import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, SPACING } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { CustomButton, Card } from '../components/Common';
import { User, Mail, Shield, ChevronRight, LogOut, Bell, Moon, BookOpen, Settings, HelpCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const ProfileScreen = () => {
    const { user, logout } = useAuth();
    const insets = useSafeAreaInsets();

    const handleLogout = () => {
        Toast.show({
            type: 'info',
            text1: 'Logged Out',
            text2: 'You have been successfully logged out.',
        });
        logout();
    };

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = COLORS.textPrimary }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: COLORS.background }]}>
                    <Icon size={20} color={color} />
                </View>
                <View>
                    <Text style={[styles.menuTitle, { color }]}>{title}</Text>
                    {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.name[0]}</Text>
                        </View>
                        <TouchableOpacity style={styles.editBadge}>
                            <Text style={styles.editBadgeText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    
                    <View style={styles.roleBadge}>
                        <Shield size={14} color={COLORS.primary} />
                        <Text style={styles.roleText}>{user?.role}</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <Card style={styles.menuCard}>
                        <MenuItem 
                            icon={User} 
                            title="Personal Information" 
                            subtitle="Manage your profile data"
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem 
                            icon={Bell} 
                            title="Notifications" 
                            subtitle="Alerts and reminders"
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem 
                            icon={Moon} 
                            title="Theme" 
                            subtitle="Switch to Light or Dark mode"
                        />
                    </Card>

                    <Text style={styles.sectionTitle}>Support</Text>
                    <Card style={styles.menuCard}>
                        <MenuItem 
                            icon={BookOpen} 
                            title="Privacy Policy"
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem 
                            icon={HelpCircle} 
                            title="Help Center"
                        />
                    </Card>

                    <CustomButton 
                        title="Logout" 
                        onPress={handleLogout} 
                        color={COLORS.error}
                        outline
                        style={styles.logoutBtn}
                    />
                    
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
                
                <View style={styles.footerSpace} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: '#FFF',
        alignItems: 'center',
        paddingVertical: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.light,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.inputBackground,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    editBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    content: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: 20,
        marginBottom: 12,
    },
    menuCard: {
        padding: 0,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    menuSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginHorizontal: 16,
    },
    logoutBtn: {
        marginTop: 40,
        borderColor: COLORS.error,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 20,
    },
    footerSpace: {
        height: 40,
    }
});

export default ProfileScreen;
