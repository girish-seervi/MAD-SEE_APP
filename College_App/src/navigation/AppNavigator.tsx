import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChevronLeft, Home, Search, BookOpen, User } from 'lucide-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RoomListScreen from '../screens/RoomListScreen';
import RoomDetailsScreen from '../screens/RoomDetailsScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../theme/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator 
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Dashboard') return <Home size={size} color={color} />;
                    if (route.name === 'Rooms') return <Search size={size} color={color} />;
                    if (route.name === 'Bookings') return <BookOpen size={size} color={color} />;
                    if (route.name === 'Profile') return <User size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                headerStyle: {
                    backgroundColor: '#FFF',
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            })}
        >
            <Tab.Screen 
                name="Dashboard" 
                component={DashboardScreen} 
                options={{ headerShown: false }}
            />
            <Tab.Screen 
                name="Rooms" 
                component={RoomListScreen} 
                options={{ headerShown: false, title: 'Explore Rooms' }} 
            />
            <Tab.Screen 
                name="Bookings" 
                component={MyBookingsScreen} 
                options={{ headerShown: false }}
            />
            <Tab.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{ headerShown: false }}
            />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    const { isLoggedIn, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator 
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#FFF',
                        elevation: 0,
                        shadowOpacity: 0,
                        borderBottomWidth: 0,
                    },
                    headerTintColor: COLORS.textPrimary,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerBackImage: () => (
                        <ChevronLeft size={28} color={COLORS.textPrimary} style={{ marginLeft: 15 }} />
                    ),
                    headerBackButtonDisplayMode: 'minimal',
                }}
            >
                {!isLoggedIn ? (
                    <Stack.Screen 
                        name="Login" 
                        component={LoginScreen} 
                        options={{ headerShown: false }} 
                    />
                ) : (
                    <>
                        <Stack.Screen 
                            name="MainTabs" 
                            component={TabNavigator} 
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen 
                            name="RoomDetails" 
                            component={RoomDetailsScreen} 
                            options={{ title: 'Room Details' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
