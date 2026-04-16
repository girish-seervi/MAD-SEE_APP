import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react-native';
import { COLORS, SHADOWS, SPACING } from '../theme/theme';
import { Card, EmptyState, Skeleton } from '../components/Common';
import { useAuth } from '../context/AuthContext';
import { bookingApi, adminApi } from '../api/api';
import Toast from 'react-native-toast-message';

// Static arrays outside component to prevent recreation on every render
const FILTER_OPTIONS = ['All', 'Confirmed', 'Cancelled', 'Pending'] as const;

interface Booking {
    booking_id: number;
    room_number: string;
    room_type: string;
    booking_date: string;
    time_slot: string;
    status: 'Confirmed' | 'Cancelled' | 'Pending';
    user_name?: string;
}

type BookingStatus = Booking['status'];

interface BookingCardProps {
    item: Booking;
    role: string;
    onCancel: (id: number) => void;
}

// Separate memoized component prevents re-rendering all cards when one is cancelled
const BookingCard: React.FC<BookingCardProps> = memo(({ item, role, onCancel }) => {
    const getStatusUI = (status: BookingStatus) => {
        switch (status) {
            case 'Confirmed': return { color: COLORS.success, bg: COLORS.successLight, icon: CheckCircle2 };
            case 'Cancelled': return { color: COLORS.error, bg: COLORS.errorLight, icon: Trash2 };
            case 'Pending': return { color: COLORS.warning, bg: COLORS.warningLight, icon: Clock };
            default: return { color: COLORS.textSecondary, bg: COLORS.divider, icon: AlertCircle };
        }
    };

    const { color, bg, icon: StatusIcon } = getStatusUI(item.status);

    return (
        <Card style={styles.bookingCard}>
            <View style={styles.cardHeader}>
                <View style={styles.roomInfo}>
                    <View style={styles.iconBox}>
                        <MapPin size={20} color={COLORS.primary} />
                    </View>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.roomNum}>{item.room_number}</Text>
                            {role === 'admin' && (
                                <Text style={styles.userName}>• {item.user_name}</Text>
                            )}
                        </View>
                        <Text style={styles.roomType}>{item.room_type || 'Facility'}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                    <StatusIcon size={12} color={color} />
                    <Text style={[styles.statusText, { color }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={styles.dateTimeRow}>
                    <Calendar size={14} color={COLORS.textSecondary} />
                    <Text style={styles.footerText}>{new Date(item.booking_date).toDateString()}</Text>
                    <View style={styles.dot} />
                    <Clock size={14} color={COLORS.textSecondary} />
                    <Text style={styles.footerText}>{item.time_slot.split(' - ')[0]}</Text>
                </View>
                
                {item.status === 'Confirmed' && (
                    <TouchableOpacity 
                        style={styles.cancelBtn}
                        onPress={() => onCancel(item.booking_id)}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );
});

BookingCard.displayName = 'BookingCard';

const MyBookingsScreen = () => {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const role = user?.role || 'student';
    const [activeTab, setActiveTab] = useState('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const fetchBookings = useCallback(async (isRefresh = false) => {
        if (!user) return;
        if (!isRefresh) setLoading(true);
        
        try {
            const response = role === 'admin' 
                ? await adminApi.getAllBookings() 
                : await bookingApi.getUserBookings(user.id);
            
            if (response.data.success) {
                setBookings(response.data.bookings);
            }
        } catch (error: any) {
            console.error("Fetch Bookings Error:", error);
            
            // BYPASS LOGIC: Display mock bookings if server is unreachable
            const isNetworkError = error?.message === 'Network Error' || 
                                 error?.code === 'ERR_NETWORK' || 
                                 !error?.response;

            if (isNetworkError) {
                const mockBookings: Booking[] = [
                    { booking_id: 101, room_number: 'LH-101', room_type: 'Lecture Hall', booking_date: '2026-04-15', time_slot: '09:00 AM - 10:00 AM', status: 'Confirmed' },
                    { booking_id: 102, room_number: 'SR-303', room_type: 'Seminar Room', booking_date: '2026-04-12', time_slot: '11:00 AM - 12:00 PM', status: 'Pending', user_name: 'John Doe' },
                ];
                setBookings(mockBookings);
                
                Toast.show({
                    type: 'info',
                    text1: 'Bypass Active',
                    text2: 'Displaying offline test data.',
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, role]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBookings(true);
    }, [fetchBookings]);

    // Memoized filtered bookings — only re-calculates when bookings or activeTab changes
    const filteredBookings = useMemo(() => 
        bookings.filter(b => activeTab === 'All' || b.status === activeTab),
    [bookings, activeTab]);

    const handleCancel = useCallback(async (id: number) => {
        try {
            const response = await bookingApi.cancel(id.toString());
            if (response.data.success) {
                setBookings(prev => prev.map(b => b.booking_id === id ? { ...b, status: 'Cancelled' as BookingStatus } : b));
                Toast.show({
                    type: 'success',
                    text1: 'Booking Cancelled',
                    text2: 'Reservation updated successfully.',
                });
            }
        } catch (error: any) {
            console.error("Cancellation Error:", error);

            // BYPASS LOGIC: Optimistic cancel if server is offline
            const isNetworkError = error?.message === 'Network Error' || 
                                 error?.code === 'ERR_NETWORK' || 
                                 !error?.response;

            if (isNetworkError) {
                setBookings(prev => prev.map(b => b.booking_id === id ? { ...b, status: 'Cancelled' as BookingStatus } : b));
                Toast.show({
                    type: 'info',
                    text1: 'Bypass Active',
                    text2: 'Booking cancelled offline.',
                });
                return;
            }

            Toast.show({
                type: 'error',
                text1: 'Cancellation Failed',
                text2: error?.response?.data?.message || 'Please try again later.',
            });
        }
    }, []);

    const keyExtractor = useCallback((item: Booking) => item.booking_id.toString(), []);

    // Stable renderItem — won't recreate on every render
    const renderItem = useCallback(({ item }: { item: Booking }) => (
        <BookingCard item={item} role={role} onCancel={handleCancel} />
    ), [role, handleCancel]);

    // Stable skeleton header — shown inside FlatList while loading to prevent layout shift
    const listHeaderComponent = useMemo(() => (
        loading ? (
            <View style={styles.loadingContainer}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={styles.skeletonCard}>
                        <Skeleton width="100%" height={120} borderRadius={16} />
                    </View>
                ))}
            </View>
        ) : null
    ), [loading]);

    const listEmptyComponent = useMemo(() => (
        loading ? null : (
            <EmptyState 
                icon={AlertCircle}
                title="No Bookings Found"
                subtitle={`There are no ${activeTab !== 'All' ? activeTab.toLowerCase() : ''} bookings record.`}
            />
        )
    ), [activeTab, loading]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.title}>{role === 'admin' ? 'All System Bookings' : 'My Bookings'}</Text>
            </View>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTER_OPTIONS.map(option => (
                        <TouchableOpacity 
                            key={option}
                            style={[styles.filterTab, activeTab === option && styles.filterTabActive]}
                            onPress={() => setActiveTab(option)}
                        >
                            <Text style={[styles.filterText, activeTab === option && styles.filterTextActive]}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={loading ? [] : filteredBookings}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                }
                ListHeaderComponent={listHeaderComponent}
                ListEmptyComponent={listEmptyComponent}
                // Performance tuning props
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        backgroundColor: '#FFF',
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    filterSection: {
        backgroundColor: '#FFF',
        paddingVertical: 16,
        ...SHADOWS.light,
    },
    filterScroll: {
        paddingHorizontal: 24,
    },
    filterTab: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: COLORS.inputBackground,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    filterTextActive: {
        color: '#FFF',
    },
    listContent: {
        padding: 24,
        paddingBottom: 40,
    },
    bookingCard: {
        padding: 16,
        marginVertical: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    roomInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomNum: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    roomType: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginVertical: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.textMuted,
        marginHorizontal: 2,
    },
    cancelBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: COLORS.errorLight,
    },
    cancelText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.error,
    },
    loadingContainer: {
        padding: 24,
    },
    skeletonCard: {
        marginBottom: 16,
    }
});

export default MyBookingsScreen;
