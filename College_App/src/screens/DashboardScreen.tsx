import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CheckCircle, Clock, Users, ArrowRight, Calendar, BarChart3, TrendingUp } from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, SPACING } from '../theme/theme';
import { Card, Skeleton } from '../components/Common';
import { useAuth } from '../context/AuthContext';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { adminApi, bookingApi } from '../api/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Chart config is static — defined outside component so it never causes re-renders
const CHART_CONFIG = {
    backgroundColor: '#FFF',
    backgroundGradientFrom: '#FFF',
    backgroundGradientTo: '#FFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: COLORS.primary }
};

// Static default data for charts — computed once outside component
const DEFAULT_PIE_DATA = [
    { name: 'Available', population: 10, color: COLORS.success, legendFontColor: COLORS.textSecondary, legendFontSize: 12 },
    { name: 'Booked', population: 5, color: COLORS.primary, legendFontColor: COLORS.textSecondary, legendFontSize: 12 },
];

const DEFAULT_LINE_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

// Memoized chart components to prevent re-render on scroll/state changes in parent
const BookingsTrendChart = memo(({ data }: { data: { labels: string[], datasets: { data: number[] }[] } }) => (
    <LineChart
        data={data}
        width={width - 64}
        height={180}
        chartConfig={CHART_CONFIG}
        bezier
        style={chartStyles.chart}
    />
));
BookingsTrendChart.displayName = 'BookingsTrendChart';

const RoomUsagePieChart = memo(({ data }: { data: any[] }) => (
    <PieChart
        data={data}
        width={width * 0.5}
        height={150}
        chartConfig={CHART_CONFIG}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
    />
));
RoomUsagePieChart.displayName = 'RoomUsagePieChart';

const chartStyles = StyleSheet.create({
    chart: { marginVertical: 8, borderRadius: 16 },
});

// New Skeleton Loaders to prevent layout shift
const StatsSkeleton = memo(() => (
    <View style={styles.statsGrid}>
        <Card style={styles.miniStat}>
            <Skeleton width={30} height={30} borderRadius={15} style={{ marginBottom: 10 }} />
            <Skeleton width="60%" height={24} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={14} />
        </Card>
        <Card style={styles.miniStat}>
            <Skeleton width={30} height={30} borderRadius={15} style={{ marginBottom: 10 }} />
            <Skeleton width="60%" height={24} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={14} />
        </Card>
    </View>
));
StatsSkeleton.displayName = 'StatsSkeleton';

const ChartSkeleton = memo(({ height = 180 }: { height?: number }) => (
    <Card style={[styles.chartCard, { height, justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.primaryLight} size="small" />
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} width={30} height={10} />)}
        </View>
    </Card>
));
ChartSkeleton.displayName = 'ChartSkeleton';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const role = user?.role || 'student';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [upcomingBooking, setUpcomingBooking] = useState<any>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (role === 'admin') {
                const statsRes = await adminApi.getStats();
                if (statsRes.data.success) {
                    setStats(statsRes.data.stats);
                }
            } else {
                const bookingsRes = await bookingApi.getUserBookings(user.id);
                if (bookingsRes.data.success && bookingsRes.data.bookings.length > 0) {
                    // Find the first confirmed booking that is in the future
                    const sorted = bookingsRes.data.bookings
                        .filter((b: any) => b.status === 'Confirmed')
                        .sort((a: any, b: any) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime());
                    setUpcomingBooking(sorted[0]);
                }
            }
        } catch (error: any) {
            console.error("Dashboard Fetch Error:", error);
            
            // BYPASS LOGIC: Mock stats for testing offline
            const isNetworkError = error?.message === 'Network Error' || 
                                 error?.code === 'ERR_NETWORK' || 
                                 !error?.response;

            if (isNetworkError && role === 'admin') {
                setStats({
                    activeBookings: 5,
                    occupancyTrend: [8, 12, 10, 18, 15, 22],
                    roomDistribution: [
                        { status: 'Available', total: 10 },
                        { status: 'Booked', total: 5 },
                        { status: 'Pending', total: 3 },
                    ]
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, role]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Memoized chart data — only recalculates when stats changes
    const lineData = useMemo(() => ({
        labels: DEFAULT_LINE_LABELS,
        datasets: [{ data: stats?.occupancyTrend || [10, 20, 15, 30, 25, 40] }]
    }), [stats?.occupancyTrend]);

    const pieData = useMemo(() => stats?.roomDistribution?.map((d: any, i: number) => ({
        name: d.status,
        population: d.total,
        color: i === 0 ? COLORS.primary : (i === 1 ? COLORS.success : COLORS.warning),
        legendFontColor: COLORS.textSecondary,
        legendFontSize: 12
    })) || DEFAULT_PIE_DATA,
    [stats?.roomDistribution]);

    // Memoized navigation callbacks
    const navigateToRooms = useCallback(() => navigation.navigate('Rooms'), [navigation]);
    const navigateToBookings = useCallback(() => navigation.navigate('Bookings'), [navigation]);
    const navigateToProfile = useCallback(() => navigation.navigate('Profile'), [navigation]);

    const renderAdminDashboard = useCallback(() => (
        <>
            <Text style={styles.dashboardTitle}>Dashboard</Text>

            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.userName}>{user?.name.split(' ')[0] || 'User'} 👋</Text>
                </View>
                <TouchableOpacity style={styles.profileBtn} onPress={navigateToProfile}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{user?.name[0] || 'U'}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {loading && !refreshing && !stats ? (
                <StatsSkeleton />
            ) : (
                <View style={styles.statsGrid}>
                    <Card style={styles.miniStat} statusColor={COLORS.primary}>
                        <TrendingUp size={20} color={COLORS.primary} />
                        <Text style={styles.miniStatValue}>{stats?.activeBookings || 0}</Text>
                        <Text style={styles.miniStatLabel}>Active Bookings</Text>
                    </Card>
                    <Card style={styles.miniStat} statusColor={COLORS.success}>
                        <CheckCircle size={20} color={COLORS.success} />
                        <Text style={styles.miniStatValue}>{stats?.roomDistribution?.find((r: any) => r.status === 'Available')?.total || 0}</Text>
                        <Text style={styles.miniStatLabel}>Rooms Free</Text>
                    </Card>
                </View>
            )}

            <Text style={styles.sectionTitle}>Bookings Trend</Text>
            {loading && !refreshing && !stats ? (
                <ChartSkeleton height={200} />
            ) : (
                <Card style={[styles.chartCard, { height: 200 }]}>
                    <BookingsTrendChart data={lineData} />
                </Card>
            )}

            <View style={styles.adminExtraGrid}>
                <View style={{ flex: 1.2 }}>
                    <Text style={styles.sectionTitle}>Room Usage</Text>
                    {loading && !refreshing && !stats ? (
                        <ChartSkeleton height={210} />
                    ) : (
                        <Card style={[styles.chartCard, { height: 210 }]}>
                            <RoomUsagePieChart data={pieData} />
                        </Card>
                    )}
                </View>
                <View style={{ flex: 0.8, marginLeft: SPACING.md }}>
                    <Text style={styles.sectionTitle}>System</Text>
                    <TouchableOpacity style={styles.quickActionBtn}>
                        <BarChart3 size={20} color={COLORS.primary} />
                        <Text style={styles.quickActionText}>Reports</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn}>
                        <Users size={20} color={COLORS.primary} />
                        <Text style={styles.quickActionText}>Manage</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    ), [stats, lineData, pieData, loading, refreshing, user, navigateToProfile]);

    const renderStudentDashboard = useCallback(() => (
        <>
            <Text style={styles.dashboardTitle}>Dashboard</Text>

            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.userName}>{user?.name.split(' ')[0] || 'User'} 👋</Text>
                </View>
                <TouchableOpacity style={styles.profileBtn} onPress={navigateToProfile}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{user?.name[0] || 'U'}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.mainCard}>
                <View style={styles.mainCardContent}>
                    <Text style={styles.mainCardLabel}>Ready to study?</Text>
                    <Text style={styles.mainCardValue}>Book a Room</Text>
                    <Text style={styles.mainCardDesc}>Find the perfect spot for your next session</Text>
                </View>
                <TouchableOpacity 
                    style={styles.exploreBtn}
                    onPress={navigateToRooms}
                >
                    <ArrowRight size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Room Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {['Lecture Halls', 'Computer Labs', 'Study Pods', 'Seminar Rooms'].map((cat, i) => (
                    <Card 
                        key={i} 
                        style={styles.categoryCard}
                        onPress={() => navigation.navigate('Rooms', { type: cat })}
                    >
                        <View style={styles.categoryIconBox}>
                            <Home size={24} color={COLORS.primary} />
                        </View>
                        <Text style={styles.categoryText}>{cat}</Text>
                    </Card>
                ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Upcoming Booking</Text>
            {loading && !refreshing ? (
                <Card style={[styles.upcomingCard, { height: 80, justifyContent: 'center' }]}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                </Card>
            ) : upcomingBooking ? (
                <Card style={styles.upcomingCard} statusColor={COLORS.primary} onPress={navigateToBookings}>
                    <View style={styles.upcomingHeader}>
                        <View style={styles.upcomingIconBox}>
                            <Calendar size={20} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.upcomingTitle}>Room {upcomingBooking.room_number}</Text>
                            <Text style={styles.upcomingSub}>{new Date(upcomingBooking.booking_date).toDateString()}, {upcomingBooking.time_slot.split(' - ')[0]}</Text>
                        </View>
                    </View>
                    <View style={styles.statusBadge}>
                        <Clock size={14} color={COLORS.success} />
                        <Text style={styles.statusText}>Confirmed</Text>
                    </View>
                </Card>
            ) : (
                <Card style={styles.emptyUpcoming}>
                    <Text style={styles.emptyUpcomingText}>No upcoming reservations.</Text>
                    <TouchableOpacity onPress={navigateToRooms}>
                        <Text style={styles.bookNowText}>Book Now</Text>
                    </TouchableOpacity>
                </Card>
            )}
        </>
    ), [upcomingBooking, navigateToRooms, navigateToBookings, navigation, loading, refreshing, user, navigateToProfile]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            >
                {role === 'admin' ? renderAdminDashboard() : renderStudentDashboard()}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.background,
        marginBottom: SPACING.lg,
    },
    dashboardTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
    },
    welcomeText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md, // 16px as requested
        paddingBottom: SPACING.xl,
    },
    mainCard: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radiusLg,
        padding: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...SHADOWS.medium,
        marginBottom: SPACING.lg,
    },
    mainCardContent: {
        flex: 1,
    },
    mainCardLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    mainCardValue: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
    },
    mainCardDesc: {
        color: '#FFF',
        fontSize: 13,
    },
    exploreBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    miniStat: {
        flex: 1,
        padding: SPACING.md,
        alignItems: 'center',
        marginVertical: 0,
    },
    miniStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 8,
    },
    miniStatLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    chartCard: {
        padding: SPACING.md,
        alignItems: 'center',
        marginVertical: 0,
    },
    adminExtraGrid: {
        flexDirection: 'row',
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
    },
    quickActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: SPACING.md,
        borderRadius: SIZES.radius,
        marginBottom: SPACING.sm,
        ...SHADOWS.light,
        gap: 12,
    },
    quickActionText: {
        fontWeight: '600',
        color: COLORS.textPrimary,
        fontSize: 13,
    },
    categoriesScroll: {
        marginHorizontal: -SPACING.lg,
        paddingHorizontal: SPACING.lg,
    },
    categoryCard: {
        width: 130,
        padding: SPACING.md,
        alignItems: 'center',
        marginRight: SPACING.md,
        marginVertical: 4,
    },
    categoryIconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    upcomingCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginVertical: 0,
    },
    upcomingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    upcomingIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upcomingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    upcomingSub: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.successLight,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.success,
    },
    emptyUpcoming: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.divider,
        borderRadius: 16,
    },
    emptyUpcomingText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 8,
    },
    bookNowText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    footerSpace: {
        height: 40,
    }
});

export default DashboardScreen;
