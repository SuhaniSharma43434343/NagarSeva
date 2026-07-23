import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Card, StatusBadge } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { RouteAssignment } from '../../types';
import { SurveyorStackParamList } from '../../navigation/SurveyorNavigator';
import api from '../../services/api';

type NavigationProp = NativeStackNavigationProp<SurveyorStackParamList, 'Dashboard'>;
type FilterTab = 'all' | 'pending' | 'active' | 'completed';

export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavigationProp>();
    const { user, logout } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<RouteAssignment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadAssignments();
    }, []);

    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    async function loadAssignments() {
        if (!user?.id) {
            setError('User not found');
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const response = await api.getAssignments(user.id);
            if (response.success && response.assignments) {
                setAssignments(response.assignments);
            } else {
                setError(response.message || 'Failed to load assignments');
            }
        } catch (err) {
            console.error('Failed to load assignments:', err);
            setError('Network error. Pull to refresh.');
        } finally {
            setLoading(false);
        }
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAssignments();
        setRefreshing(false);
    }, [user?.id]);

    const filteredAssignments = assignments.filter(a => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return a.status === 'PENDING';
        if (activeTab === 'active') return a.status === 'IN_PROGRESS';
        if (activeTab === 'completed') return a.status === 'COMPLETED';
        return true;
    });

    const stats = {
        pending: assignments.filter(a => a.status === 'PENDING').length,
        active: assignments.filter(a => a.status === 'IN_PROGRESS').length,
        completed: assignments.filter(a => a.status === 'COMPLETED').length,
    };

    function renderAssignment({ item, index }: { item: RouteAssignment, index: number }) {
        return (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + index * 10, 0] }) }] }}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('AssignmentDetail', { assignment: item })}
                    activeOpacity={0.7}
                >
                    <View style={styles.assignmentCard}>
                        <View style={styles.assignmentHeader}>
                            <View style={styles.routeIconContainer}>
                                <Text style={styles.routeIcon}>📍</Text>
                            </View>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                                <Text style={styles.routeName} numberOfLines={1}>{item.route?.name}</Text>
                                <Text style={styles.routeWard}>{item.route?.ward?.name}</Text>
                            </View>
                            <StatusBadge status={item.status} />
                        </View>
                        
                        <View style={styles.assignmentDetails}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Distance</Text>
                                <Text style={styles.detailValue}>{item.route?.distance} km</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Assigned</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(item.assignedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
                <View style={[styles.headerBg, { paddingTop: insets.top }]} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
            <View style={[styles.headerBg, { paddingTop: insets.top, height: 260 }]} />

            <View style={[styles.headerContent, { paddingTop: insets.top + spacing.md }]}>
                <View style={styles.userSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'S'}</Text>
                    </View>
                    <View>
                        <Text style={styles.greeting}>Good morning,</Text>
                        <Text style={styles.userName}>{user?.name || 'Surveyor'}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIconBg, { backgroundColor: colors.pendingBg }]}>
                        <Text style={styles.statIcon}>⏳</Text>
                    </View>
                    <Text style={styles.statNumber}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIconBg, { backgroundColor: colors.activeBg }]}>
                        <Text style={styles.statIcon}>🚀</Text>
                    </View>
                    <Text style={styles.statNumber}>{stats.active}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statIconBg, { backgroundColor: colors.completedBg }]}>
                        <Text style={styles.statIcon}>✅</Text>
                    </View>
                    <Text style={styles.statNumber}>{stats.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
            </View>

            <View style={styles.tabsContainer}>
                {(['all', 'pending', 'active', 'completed'] as FilterTab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <FlatList
                data={filteredAssignments}
                keyExtractor={item => item.id}
                renderItem={renderAssignment}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <Text style={styles.emptyIcon}>📭</Text>
                        </View>
                        <Text style={styles.emptyText}>No assignments found</Text>
                        <Text style={styles.emptySubtext}>You're all caught up for now!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerBg: {
        backgroundColor: colors.primary,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
        ...shadows.md,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        ...shadows.sm,
    },
    avatarText: {
        ...typography.heading3,
        color: colors.primary,
    },
    greeting: {
        ...typography.small,
        color: colors.primaryLight,
        fontWeight: '600',
    },
    userName: {
        ...typography.heading2,
        color: colors.textInverse,
    },
    logoutButton: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
    },
    logoutText: {
        ...typography.small,
        color: colors.textInverse,
        fontWeight: '700',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.sm,
        gap: spacing.md,
    },
    statCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    statIcon: {
        fontSize: 20,
    },
    statNumber: {
        ...typography.heading2,
        color: colors.textPrimary,
    },
    statLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    tab: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeTab: {
        backgroundColor: colors.primaryDark,
        borderColor: colors.primaryDark,
    },
    tabText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.textInverse,
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    assignmentCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    assignmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    routeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    routeIcon: {
        fontSize: 24,
    },
    routeName: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    routeWard: {
        ...typography.small,
        color: colors.textSecondary,
    },
    assignmentDetails: {
        flexDirection: 'row',
        gap: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: spacing.md,
    },
    detailItem: {},
    detailLabel: {
        ...typography.small,
        color: colors.textMuted,
        marginBottom: 2,
    },
    detailValue: {
        ...typography.caption,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    emptyIcon: {
        fontSize: 36,
    },
    emptyText: {
        ...typography.heading3,
        color: colors.textPrimary,
    },
    emptySubtext: {
        ...typography.body,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        backgroundColor: colors.danger + '15',
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    errorText: {
        ...typography.caption,
        color: colors.danger,
        textAlign: 'center',
    },
});
