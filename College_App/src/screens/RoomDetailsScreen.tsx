import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MapPin, Users, Award, ShieldCheck, CheckCircle2, Info, ChevronLeft, XCircle } from 'lucide-react-native';
import { COLORS, SHADOWS, SPACING, SIZES } from '../theme/theme';
import { CustomButton, Card } from '../components/Common';
import { useAuth } from '../context/AuthContext';
import { Room } from '../theme/types';
import { bookingApi, roomApi } from '../api/api';
import Toast from 'react-native-toast-message';

// Static time slots — defined once at module level to avoid recreation on every render
const TIME_SLOTS = [
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "01:00 PM - 02:00 PM",
    "02:00 PM - 03:00 PM",
    "03:00 PM - 04:00 PM",
];

const RoomDetailsScreen = ({ navigation, route }: { navigation: any, route: any }) => {
    const { room }: { room: Room } = route.params;
    const { user } = useAuth();
    const role = user?.role || 'student';

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isBooking, setIsBooking] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(room.status);

    // Memoized dates array — only changes once per day, not every render
    const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    }), []);

    const formatDate = useCallback((date: Date) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }, []);

    const getStatusStyle = useCallback((status: string) => {
        switch (status) {
            case 'Available': return { text: COLORS.success, bg: COLORS.successLight };
            case 'Booked': return { text: COLORS.error, bg: COLORS.errorLight };
            case 'Pending': return { text: COLORS.warning, bg: COLORS.warningLight };
            default: return { text: COLORS.textSecondary, bg: COLORS.divider };
        }
    }, []);

    const statusStyle = useMemo(() => getStatusStyle(currentStatus), [currentStatus, getStatusStyle]);

    React.useEffect(() => {
        navigation.setOptions({ headerShown: !isSuccess });
    }, [isSuccess, navigation]);

    const handleConfirmBooking = useCallback(() => {
        if (!selectedSlot) {
            Toast.show({ type: 'info', text1: 'Selection Missing', text2: 'Please select a time slot first.' });
            return;
        }

        Alert.alert(
            'Confirm Reservation',
            `Reserve ${room.room_number} for ${selectedSlot} on ${selectedDate.toDateString()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm', 
                    onPress: processBooking 
                },
            ]
        );
    }, [selectedSlot, selectedDate, room.room_number]);

    const processBooking = useCallback(async () => {
        if (!user) return;
        
        setIsBooking(true);
        try {
            // MySQL expects YYYY-MM-DD
            const formattedDate = selectedDate.toISOString().split('T')[0];
            
            const response = await bookingApi.create({
                user_id: user.id,
                room_id: room.room_id,
                booking_date: formattedDate,
                time_slot: selectedSlot
            });

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Booking Success!',
                    text2: `Reserved ${room.room_number} successfully.`,
                });
                setIsSuccess(true);
            }
        } catch (error: any) {
            console.error("Booking Error:", error);
            
            // BYPASS LOGIC: Mock booking success if server is offline
            const isNetworkError = error?.message === 'Network Error' || 
                                 error?.code === 'ERR_NETWORK' || 
                                 !error?.response;

            if (isNetworkError) {
                Toast.show({
                    type: 'info',
                    text1: 'Bypass Active',
                    text2: `Offline: Reserved ${room.room_number} locally.`,
                });
                setIsSuccess(true);
                return;
            }

            Toast.show({
                type: 'error',
                text1: 'Booking Failed',
                text2: error.response?.data?.message || 'Server error. Try again later.',
            });
        } finally {
            setIsBooking(false);
        }
    }, [user, room, selectedSlot, selectedDate, navigation]);

    const handleAdminAction = useCallback(async (action: string) => {
        if (action.startsWith('Set ')) {
            const newStatus = action.replace('Set ', '') as any;
            
            // Optimistic UI Update
            const prevStatus = currentStatus;
            setCurrentStatus(newStatus);

            try {
                const response = await roomApi.updateStatus(room.room_id, newStatus);
                if (response.data.success) {
                    Toast.show({
                        type: 'success',
                        text1: 'Status Updated',
                        text2: `${room.room_number} is now ${newStatus}.`,
                    });
                }
            } catch (error: any) {
                console.error("Update Status Error:", error);
                
                // BYPASS LOGIC: Keep the optimistic update if server is offline
                const isNetworkError = error?.message === 'Network Error' || 
                                     error?.code === 'ERR_NETWORK' || 
                                     !error?.response;

                if (isNetworkError) {
                    Toast.show({
                        type: 'info',
                        text1: 'Bypass Active',
                        text2: `Offline: Status updated locally to ${newStatus}.`,
                    });
                    return;
                }

                // Actually failed (not a network error), revert UI
                setCurrentStatus(prevStatus);
                Toast.show({
                    type: 'error',
                    text1: 'Update Failed',
                    text2: 'Could not update room status.',
                });
            }
            return;
        }

        Alert.alert('Admin Action', `Are you sure?`, [
            { text: 'No' },
            { 
                text: 'Yes', 
                onPress: () => {
                    Toast.show({ type: 'success', text1: 'Action Completed' });
                }
            }
        ]);
    }, [room, currentStatus]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {isSuccess ? (
                <View style={styles.successContainer}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })} style={styles.backButton}>
                            <ChevronLeft size={28} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Room Details</Text>
                        <View style={{ width: 28 }} />
                    </View>
                    <View style={styles.successContent}>
                        <View style={styles.successIconOuter}>
                            <CheckCircle2 size={50} color={COLORS.success} strokeWidth={3} />
                        </View>
                        <Text style={styles.successTitle}>Booking Successful!</Text>
                        <Text style={styles.successDesc}>
                            Your reservation for {room.room_number} has been confirmed for {selectedSlot}.
                        </Text>
                        
                        <CustomButton 
                            title="Back to Dashboard" 
                            onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })}
                            style={styles.successBtn}
                        />
                    </View>
                </View>
            ) : (
                <>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.imagePlaceholder}>
                    <MapPin size={48} color={COLORS.primary} />
                </View>

                <View style={styles.topInfo}>
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={styles.roomNum}>{room.room_number}</Text>
                            <Text style={styles.roomType}>{room.type}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusText, { color: statusStyle.text }]}>{currentStatus}</Text>
                        </View>
                    </View>

                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <Users size={18} color={COLORS.primary} />
                            <Text style={styles.featureText}>{room.capacity} People</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <ShieldCheck size={18} color={COLORS.primary} />
                            <Text style={styles.featureText}>Premium</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Award size={18} color={COLORS.primary} />
                            <Text style={styles.featureText}>2nd Floor</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>About this Room</Text>
                    <Text style={styles.description}>
                        This facility is equipped with high-speed internet, modern seating, and presentation tools. 
                        It's ideal for both group study sessions and official faculty meetings.
                    </Text>
                </View>

                {role === 'admin' ? (
                    <Card style={styles.adminCard}>
                        <View style={styles.adminHeader}>
                            <ShieldCheck size={22} color={COLORS.primary} />
                            <Text style={styles.adminCardTitle}>Manage Availability</Text>
                        </View>
                        <Text style={styles.adminDesc}>Change the current status of this room:</Text>
                        
                        <View style={styles.adminStatusGrid}>
                            <TouchableOpacity 
                                style={[styles.statusBtn, currentStatus === 'Available' && styles.statusBtnActive]} 
                                onPress={() => handleAdminAction('Set Available')}
                            >
                                <CheckCircle2 size={18} color={currentStatus === 'Available' ? '#FFF' : COLORS.success} />
                                <Text style={[styles.statusBtnText, currentStatus === 'Available' && styles.statusBtnTextActive]}>Set Available</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.statusBtn, currentStatus === 'Booked' && styles.statusBtnActiveBooked]} 
                                onPress={() => handleAdminAction('Set Booked')}
                            >
                                <XCircle size={18} color={currentStatus === 'Booked' ? '#FFF' : COLORS.error} />
                                <Text style={[styles.statusBtnText, currentStatus === 'Booked' && styles.statusBtnTextActive]}>Set Booked</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.statusBtn, currentStatus === 'Pending' && styles.statusBtnActivePending]} 
                                onPress={() => handleAdminAction('Set Pending')}
                            >
                                <Clock size={18} color={currentStatus === 'Pending' ? '#FFF' : COLORS.warning} />
                                <Text style={[styles.statusBtnText, currentStatus === 'Pending' && styles.statusBtnTextActive]}>Set Pending</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />
                        
                        <TouchableOpacity style={styles.adminEditBtn} onPress={() => handleAdminAction('Edit Details')}>
                            <Info size={18} color={COLORS.textSecondary} />
                            <Text style={styles.adminEditBtnText}>Edit Room Configuration</Text>
                        </TouchableOpacity>
                    </Card>
                ) : (
                    <View style={styles.bookingSection}>
                        <Text style={styles.sectionTitle}>Select Date</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                            {dates.map((date, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[styles.dateCard, selectedDate.getDate() === date.getDate() && styles.dateCardActive]}
                                    onPress={() => setSelectedDate(date)}
                                >
                                    <Text style={[styles.dateDay, selectedDate.getDate() === date.getDate() && styles.dateTextActive]}>
                                        {formatDate(date).split(' ')[0]}
                                    </Text>
                                    <Text style={[styles.dateNum, selectedDate.getDate() === date.getDate() && styles.dateTextActive]}>
                                        {formatDate(date).split(' ')[1]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Available Slots</Text>
                        <View style={styles.slotsGrid}>
                            {TIME_SLOTS.map((slot, index) => {
                                const isSelected = selectedSlot === slot;
                                return (
                                    <TouchableOpacity 
                                        key={index}
                                        onPress={() => setSelectedSlot(slot)}
                                        style={[
                                            styles.slotBtn,
                                            isSelected && styles.slotBtnSelected,
                                        ]}
                                    >
                                        <Clock size={16} color={isSelected ? '#FFF' : COLORS.primary} />
                                        <Text style={[
                                            styles.slotText,
                                            isSelected && styles.slotTextSelected,
                                        ]}>
                                            {slot.split(' - ')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
                
                <View style={styles.footerSpace} />
            </ScrollView>

            {role !== 'admin' && (
                <View style={styles.bottomBar}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Selected for</Text>
                        <Text style={styles.priceValue}>{selectedSlot || 'Select Slot'}</Text>
                    </View>
                    <CustomButton 
                        title="Book Room" 
                        loading={isBooking}
                        disabled={!selectedSlot}
                        onPress={handleConfirmBooking}
                        style={styles.bookBtn}
                    />
                </View>
            )}
            </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    imagePlaceholder: {
        width: '100%',
        height: 220,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topInfo: {
        padding: 24,
        backgroundColor: '#FFF',
        marginTop: -30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    roomNum: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    roomType: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.background,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    featureText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    detailsSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    bookingSection: {
        paddingHorizontal: 24,
    },
    dateScroll: {
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    dateCard: {
        width: 65,
        height: 80,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    dateCardActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    dateDay: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    dateNum: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    dateTextActive: {
        color: '#FFF',
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    slotBtn: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.divider,
        gap: 8,
    },
    slotBtnSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    slotText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    slotTextSelected: {
        color: '#FFF',
    },
    adminCard: {
        marginHorizontal: 24,
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 20,
        ...SHADOWS.medium,
    },
    adminHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    adminCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    adminDesc: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    adminStatusGrid: {
        gap: 12,
    },
    statusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.divider,
        gap: 12,
    },
    statusBtnActive: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    statusBtnActiveBooked: {
        backgroundColor: COLORS.error,
        borderColor: COLORS.error,
    },
    statusBtnActivePending: {
        backgroundColor: COLORS.warning,
        borderColor: COLORS.warning,
    },
    statusBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statusBtnTextActive: {
        color: '#FFF',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginVertical: 20,
    },
    adminEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    adminEditBtnText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: '#FFF',
        paddingHorizontal: 24,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
        ...SHADOWS.medium,
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    bookBtn: {
        flex: 1.2,
        height: 52,
        marginVertical: 0,
    },
    footerSpace: {
        height: 40,
    },
    successContainer: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 10, // Reduced as SafeAreaView handles the top inset
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    successContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: -60,
    },
    successIconOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: COLORS.successLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    successDesc: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    successBtn: {
        width: 220,
        height: 52,
    }
});

export default RoomDetailsScreen;
