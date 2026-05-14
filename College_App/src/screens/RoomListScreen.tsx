import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, StatusBar, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, ChevronRight, X, SlidersHorizontal, ArrowUpDown, Users } from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, SPACING } from '../theme/theme';
import { Card, CustomButton, EmptyState, Skeleton } from '../components/Common';
import { Room } from '../theme/types';
import { roomApi } from '../api/api';
import Toast from 'react-native-toast-message';

// Static arrays moved outside component to avoid recreation on every render
const FILTER_OPTIONS = ['All', 'Available', 'Booked', 'Pending'] as const;
const TYPE_OPTIONS = ['All', 'Lecture Hall', 'Computer Lab', 'Seminar Room', 'Science Lab'];
const CAPACITY_OPTIONS = ['All', '0-20', '21-50', '50+'];
const SORT_OPTIONS = ['Name', 'Capacity'];

interface RoomItemProps {
    room: Room;
    onPress: () => void;
}

// Memoized RoomItem prevents re-render when other list items or parent state changes
const RoomItem: React.FC<RoomItemProps> = memo(({ room, onPress }) => {
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Available': return { bg: COLORS.successLight, text: COLORS.success };
            case 'Booked': return { bg: COLORS.errorLight, text: COLORS.error };
            case 'Pending': return { bg: COLORS.warningLight, text: COLORS.warning };
            default: return { bg: COLORS.inputBackground, text: COLORS.textSecondary };
        }
    };

    const statusStyle = getStatusStyle(room.status);

    return (
        <Card style={styles.roomCard} onPress={onPress}>
            <View style={styles.roomIcon}>
                <MapPin size={24} color={COLORS.primary} />
            </View>
            <View style={styles.roomDetails}>
                <View style={styles.roomRow}>
                    <Text style={styles.roomNumber}>{room.room_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{room.status}</Text>
                    </View>
                </View>
                <Text style={styles.roomType}>{room.type}</Text>
                <View style={styles.capacityRow}>
                    <Users size={16} color={COLORS.textSecondary} />
                    <Text style={styles.capacityText}>Capacity: {room.capacity} Persons • 2nd Floor</Text>
                </View>
            </View>
            <ChevronRight size={20} color={COLORS.textMuted} />
        </Card>
    );
});

RoomItem.displayName = 'RoomItem';

const RoomListScreen = ({ navigation, route }: { navigation: any, route: any }) => {
    const initialFilter = route.params?.filter || 'All';
    const initialType = route.params?.type || 'All';
    const insets = useSafeAreaInsets();
    
    const [rooms, setRooms] = useState<Room[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(initialFilter);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Advanced Filters
    const [selectedType, setSelectedType] = useState(initialType);
    const [selectedCapacity, setSelectedCapacity] = useState('All');
    const [sortBy, setSortBy] = useState('Name');

    const fetchRooms = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const response = await roomApi.getAll();
            if (response.data.success) {
                setRooms(response.data.rooms);
            }
        } catch (error: any) {
            console.warn("Fetch Rooms Error (offline fallback active):", error);
            
            // BYPASS LOGIC: Display mock rooms if server is unreachable
            const isNetworkError = error?.message === 'Network Error' || 
                                 error?.code === 'ERR_NETWORK' || 
                                 !error?.response;

            if (isNetworkError) {
                const mockRooms: Room[] = [
                    { room_id: 1, room_number: 'LH-101', type: 'Lecture Hall', capacity: 60, status: 'Available' },
                    { room_id: 2, room_number: 'LB-202', type: 'Computer Lab', capacity: 30, status: 'Available' },
                    { room_id: 3, room_number: 'SR-303', type: 'Seminar Room', capacity: 15, status: 'Booked' },
                    { room_id: 4, room_number: 'LH-102', type: 'Lecture Hall', capacity: 50, status: 'Pending' },
                ];
                setRooms(mockRooms);
                
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
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    useEffect(() => {
        if (route.params?.type) {
            let typeToSet = route.params.type;
            if (typeToSet === 'Lecture Halls') typeToSet = 'Lecture Hall';
            if (typeToSet === 'Computer Labs') typeToSet = 'Computer Lab';
            if (typeToSet === 'Seminar Rooms') typeToSet = 'Seminar Room';
            setSelectedType(typeToSet);
        }
        if (route.params?.filter) {
            setActiveFilter(route.params.filter);
        }
    }, [route.params]);

    // Memoized filtered rooms — only recalculates when rooms or filter state changes
    const filteredRooms = useMemo(() => rooms
        .filter(room => {
            const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 room.type.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = activeFilter === 'All' || room.status === activeFilter;
            const matchesType = selectedType === 'All' || room.type === selectedType;
            
            let matchesCapacity = true;
            if (selectedCapacity === '0-20') matchesCapacity = room.capacity <= 20;
            else if (selectedCapacity === '21-50') matchesCapacity = room.capacity > 20 && room.capacity <= 50;
            else if (selectedCapacity === '50+') matchesCapacity = room.capacity > 50;

            return matchesSearch && matchesStatus && matchesType && matchesCapacity;
        })
        .sort((a, b) => {
            if (sortBy === 'Capacity') return b.capacity - a.capacity;
            return a.room_number.localeCompare(b.room_number);
        }),
    [rooms, searchQuery, activeFilter, selectedType, selectedCapacity, sortBy]);

    const resetFilters = useCallback(() => {
        setActiveFilter('All');
        setSelectedType('All');
        setSelectedCapacity('All');
        setSortBy('Name');
    }, []);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchRooms(true);
    }, [fetchRooms]);

    const openFilterModal = useCallback(() => setShowFilterModal(true), []);
    const closeFilterModal = useCallback(() => setShowFilterModal(false), []);

    // Stable renderItem callback — avoids creating a new function on every render
    const renderItem = useCallback(({ item }: { item: Room }) => (
        <RoomItem 
            room={item} 
            onPress={() => navigation.navigate('RoomDetails', { room: item })} 
        />
    ), [navigation]);

    const keyExtractor = useCallback((item: Room) => item.room_id.toString(), []);

    const listEmptyComponent = useMemo(() => (
        loading ? null : (
            <EmptyState 
                icon={Search}
                title="No Rooms Found"
                subtitle="Try adjusting your filters or search query."
                actionTitle="Clear All Filters"
                onAction={resetFilters}
            />
        )
    ), [resetFilters, loading]);

    // Skeleton header — rendered inside FlatList to preserve layout structure during loading
    const listHeaderComponent = useMemo(() => (
        loading ? (
            <View style={styles.loadingContainer}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={styles.skeletonCard}>
                        <Skeleton width={50} height={50} borderRadius={15} />
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
                            <Skeleton width="40%" height={15} />
                        </View>
                    </View>
                ))}
            </View>
        ) : null
    ), [loading]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.navHeader}>
                <Text style={styles.navTitle}>Available Rooms</Text>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <Search size={20} color={COLORS.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search by room name..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>
                <TouchableOpacity 
                    style={styles.filterBtn}
                    onPress={openFilterModal}
                >
                    <SlidersHorizontal size={22} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {FILTER_OPTIONS.map(filter => (
                        <TouchableOpacity 
                            key={filter}
                            style={[styles.tab, activeFilter === filter && styles.tabActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.tabText, activeFilter === filter && styles.tabTextActive]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={loading ? [] : filteredRooms}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={listHeaderComponent}
                ListEmptyComponent={listEmptyComponent}
                // Performance tuning props
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
            />

            {/* Advanced Filters Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={closeFilterModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Rooms</Text>
                            <TouchableOpacity onPress={closeFilterModal}>
                                <X size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.filterLabel}>Room Type</Text>
                            <View style={styles.chipGrid}>
                                {TYPE_OPTIONS.map(type => (
                                    <TouchableOpacity 
                                        key={type}
                                        style={[styles.chip, selectedType === type && styles.chipActive]}
                                        onPress={() => setSelectedType(type)}
                                    >
                                        <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.filterLabel}>Capacity</Text>
                            <View style={styles.chipGrid}>
                                {CAPACITY_OPTIONS.map(cap => (
                                    <TouchableOpacity 
                                        key={cap}
                                        style={[styles.chip, selectedCapacity === cap && styles.chipActive]}
                                        onPress={() => setSelectedCapacity(cap)}
                                    >
                                        <Text style={[styles.chipText, selectedCapacity === cap && styles.chipTextActive]}>{cap}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.filterLabel}>Sort By</Text>
                            <View style={styles.chipGrid}>
                                {SORT_OPTIONS.map(sort => (
                                    <TouchableOpacity 
                                        key={sort}
                                        style={[styles.chip, sortBy === sort && styles.chipActive]}
                                        onPress={() => setSortBy(sort)}
                                    >
                                        <ArrowUpDown size={14} color={sortBy === sort ? '#FFF' : COLORS.textSecondary} style={{ marginRight: 6 }} />
                                        <Text style={[styles.chipText, sortBy === sort && styles.chipTextActive]}>{sort}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <CustomButton 
                                title="Reset" 
                                outline 
                                onPress={resetFilters} 
                                style={{ flex: 1, marginRight: 12 }} 
                            />
                            <CustomButton 
                                title="Apply Filters" 
                                onPress={closeFilterModal} 
                                style={{ flex: 2 }} 
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    navHeader: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 10,
        backgroundColor: '#FFF',
    },
    navTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    searchSection: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: '#FFF',
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: SIZES.radius,
        paddingHorizontal: 16,
        height: 52,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    filterBtn: {
        width: 52,
        height: 52,
        backgroundColor: COLORS.primaryLight,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    tabSection: {
        backgroundColor: '#FFF',
        paddingBottom: SPACING.md,
        ...SHADOWS.light,
    },
    tabScroll: {
        paddingHorizontal: SPACING.lg,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: COLORS.inputBackground,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    tabTextActive: {
        color: '#FFF',
    },
    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: 40,
    },
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginVertical: 6,
    },
    roomIcon: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomDetails: {
        flex: 1,
        marginLeft: 16,
    },
    roomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    roomNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    statusBadge: {
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
    },
    roomType: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    capacityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    capacityText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    loadingContainer: {
        padding: SPACING.lg,
    },
    skeletonCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    modalBody: {
        padding: 24,
        maxHeight: 500,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: COLORS.inputBackground,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#FFF',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
    }
});

export default RoomListScreen;
