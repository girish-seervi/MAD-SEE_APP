import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import Toast from 'react-native-toast-message';
import { ThemeProvider } from './src/context/ThemeContext';

const App = () => {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <ThemeProvider>
                    <StatusBar 
  barStyle="light-content" 
  backgroundColor="#121212" 
  translucent={false}
/>
                    <AppNavigator />
                    <Toast />
                </ThemeProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
