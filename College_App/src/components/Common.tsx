import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, TextInput, ActivityIndicator, ViewStyle, TextStyle, DimensionValue, StyleProp } from 'react-native';
import { COLORS, SIZES, SHADOWS, SPACING } from '../theme/theme';
import { LucideIcon } from 'lucide-react-native';

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    color?: string;
    outline?: boolean;
    disabled?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = memo(({ 
    title, 
    onPress, 
    loading, 
    style, 
    textStyle,
    color = COLORS.primary, 
    outline = false,
    disabled = false
}) => (
    <TouchableOpacity 
        style={[
            styles.button, 
            { backgroundColor: outline ? 'transparent' : color }, 
            outline && { borderWidth: 1, borderColor: color },
            (disabled || loading) && { opacity: 0.6 },
            style
        ]} 
        onPress={onPress} 
        disabled={loading || disabled}
        activeOpacity={0.7}
    >
        {loading ? (
            <ActivityIndicator color={outline ? color : "#FFF"} />
        ) : (
            <Text style={[
                styles.buttonText, 
                { color: outline ? color : '#FFF' },
                textStyle
            ]}>
                {title}
            </Text>
        )}
    </TouchableOpacity>
));

CustomButton.displayName = 'CustomButton';

interface CustomInputProps {
    label?: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    icon?: LucideIcon;
    error?: string;
}

export const CustomInput: React.FC<CustomInputProps> = memo(({ label, value, onChangeText, placeholder, secureTextEntry, icon: Icon, error }) => (
    <View style={styles.inputContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.inputWrapper, error && styles.errorBorder]}>
            {Icon && <Icon size={20} color={COLORS.textSecondary} style={styles.icon} />}
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
            />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
));

CustomInput.displayName = 'CustomInput';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    statusColor?: string;
    onPress?: () => void;
}

export const Card: React.FC<CardProps> = memo(({ children, style, statusColor, onPress }) => {
    const Component = onPress ? TouchableOpacity : View;
    return (
        <Component 
            onPress={onPress}
            activeOpacity={0.9}
            style={[
                styles.card, 
                SHADOWS.light, 
                style, 
                statusColor && { borderLeftWidth: 4, borderLeftColor: statusColor }
            ]}
        >
            {children}
        </Component>
    );
});

Card.displayName = 'Card';

export const Skeleton: React.FC<{ width: DimensionValue, height: DimensionValue, borderRadius?: number, style?: StyleProp<ViewStyle> }> = memo(({ width, height, borderRadius = 4, style }) => (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]} />
));

Skeleton.displayName = 'Skeleton';

export const EmptyState: React.FC<{ icon?: LucideIcon, title: string, subtitle?: string, actionTitle?: string, onAction?: () => void }> = memo(({ icon: Icon, title, subtitle, actionTitle, onAction }) => (
    <View style={styles.emptyContainer}>
        {Icon && <Icon size={60} color={COLORS.textMuted} style={styles.emptyIcon} />}
        <Text style={styles.emptyTitle}>{title}</Text>
        {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
        {actionTitle && onAction && (
            <CustomButton 
                title={actionTitle} 
                onPress={onAction} 
                outline 
                style={styles.emptyAction} 
            />
        )}
    </View>
));

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        height: 54,
    },
    buttonText: {
        color: '#FFF',
        fontSize: SIZES.fontMd,
        fontWeight: 'bold',
    },
    inputContainer: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: SIZES.fontSm,
        color: COLORS.textPrimary,
        marginBottom: 6,
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: SIZES.radius,
        paddingHorizontal: 16,
        height: 56,
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: SIZES.fontMd,
    },
    errorBorder: {
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    card: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: SIZES.radius,
        padding: SPACING.md,
        marginVertical: 8,
    },
    skeleton: {
        backgroundColor: COLORS.inputBackground,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    emptyAction: {
        minWidth: 150,
    },
});
