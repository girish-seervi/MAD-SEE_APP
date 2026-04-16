import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import Toast from 'react-native-toast-message';

const App = () => {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar 
                    barStyle="dark-content" 
                    backgroundColor="transparent" 
                    translucent={true} 
                />
                <AppNavigator />
                <Toast />
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
