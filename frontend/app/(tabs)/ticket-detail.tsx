import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Modal,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGetTicketById, apiUpdateTicketStatus } from '@/services/TicketService';
import { TicketResponse, TicketStatus, UpdateStatusData, UserData } from '@/services/types'; 
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetSocietyUsers } from '@/services/SocietyService';

const CustomTheme = {
    background: '#f8fafc', 
    card: '#FFFFFF',       
    text: '#1e293b',       
    textMuted: '#64748b',  
    tint: '#4f46e5',       
    error: '#ef4444',      
    success: '#059669',    
    border: '#f1f5f9',
    actionBorder: '#4f46e5',
    selectedItem: '#eef2ff'
};
const theme = CustomTheme;

const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
        case 'Pending': return { color: '#d97706', backgroundColor: '#fef3c7', cardBorder: '#d97706' };
        case 'In Progress': return { color: '#2563eb', backgroundColor: '#dbeafe', cardBorder: '#2563eb' };
        case 'Resolved': return { color: '#059669', backgroundColor: '#dcfce7', cardBorder: '#059669' };
        case 'Closed': return { color: '#64748b', backgroundColor: '#f1f5f9', cardBorder: '#64748b' };
        default: return { color: '#64748b', backgroundColor: '#f1f5f9', cardBorder: '#64748b' };
    }
};

const STATUS_OPTIONS: TicketStatus[] = ['Pending', 'In Progress', 'Resolved', 'Closed'];

export default function TicketDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const ticketId = params.id as string;

    const [ticket, setTicket] = useState<TicketResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Status Modal State
    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
    const [newStatus, setNewStatus] = useState<TicketStatus>('Pending');
    const [isUpdating, setIsUpdating] = useState(false);

    // Assignment Logic State
    const [assignableUsers, setAssignableUsers] = useState<UserData[]>([]);
    const [selectedAssignee, setSelectedAssignee] = useState<string | undefined>(undefined);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const isUserStaff = user?.role === 'admin' || user?.role === 'staff';

    // --- 2. Fetch Society Members ---
    const fetchSocietyMembers = useCallback(async (societyId: string) => {
        setLoadingMembers(true);
        try {
            const response = await apiGetSocietyUsers(societyId);
            if (response.success && response.result) {
                const allUsers = [...response.result.admins, ...response.result.members];
                const uniqueUsers = Array.from(new Map(allUsers.map(item => [item._id || item.id, item])).values());
                setAssignableUsers(uniqueUsers);
            }
        } finally {
            setLoadingMembers(false);
        }
    }, []);

    // --- 1. Fetch Ticket Data ---
    const fetchTicket = useCallback(async () => {
        if (!ticketId) {
            router.back();
            return;
        }
        setLoading(true);
        try {
            const response = await apiGetTicketById(ticketId); 
            if (response.success && response.result) {
                setTicket(response.result);
                setNewStatus(response.result.status);
                
                if (response.result.assignedTo) {
                    setSelectedAssignee(response.result.assignedTo._id);
                }

                if (user?.role === 'admin' || user?.role === 'staff') {
                    fetchSocietyMembers(response.result.societyId);
                }

            } else {
                Alert.alert("Error", "Ticket not found.");
                router.back();
            }
        } finally {
            setLoading(false);
        }
    }, [ticketId, user, fetchSocietyMembers, router]);

    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            setUser(userData);
        };
        init().then(() => fetchTicket());
    }, [ticketId, fetchTicket]);


    // --- 3. Handle Update Submission ---
    const handleStatusUpdate = async () => {
        setIsUpdating(true);
        try {
            const updatePayload: UpdateStatusData = { status: newStatus };
            if (selectedAssignee) updatePayload.assignedTo = selectedAssignee;

            const response = await apiUpdateTicketStatus(ticketId, updatePayload);
            if (response.success && response.result) {
                setTicket(response.result);
                Alert.alert("Success", "Ticket updated!");
                setIsStatusModalVisible(false);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!ticket) return null;

    const statusStyle = getStatusStyles(ticket.status);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={theme.text} />
                <Text style={styles.backBtnText}>Back to List</Text>
            </TouchableOpacity>

            {/* Header Card */}
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <Text style={styles.ticketIdText}>TICKET #{ticket._id.slice(-6).toUpperCase()}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusPillText, { color: statusStyle.color }]}>{ticket.status}</Text>
                    </View>
                </View>
                <Text style={styles.subjectTitle}>{ticket.subject}</Text>
            </View>

            {/* Description */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Issue Description</Text>
                <Text style={styles.descriptionText}>{ticket.description}</Text>
            </View>

            {/* Details Grid */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Additional Details</Text>
                <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="person-outline" size={18} color={theme.tint} />
                    </View>
                    <View>
                        <Text style={styles.detailLabel}>Created By</Text>
                        <Text style={styles.detailValue}>{ticket.createdBy?.name || 'N/A'}</Text>
                    </View>
                </View>

                <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="briefcase-outline" size={18} color={theme.tint} />
                    </View>
                    <View>
                        <Text style={styles.detailLabel}>Assigned Staff</Text>
                        <Text style={styles.detailValue}>{ticket.assignedTo?.name || 'Unassigned'}</Text>
                    </View>
                </View>
            </View>
            
            {/* Action Button (Staff Only) */}
            {isUserStaff && (
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => setIsStatusModalVisible(true)}
                    disabled={isUpdating}
                >
                    <Ionicons name="options-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Update Ticket</Text>
                </TouchableOpacity>
            )}

            {/* Update Modal */}
            <Modal
                visible={isStatusModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsStatusModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setIsStatusModalVisible(false)} />
                        <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Update Ticket</Text>
                                <TouchableOpacity onPress={() => setIsStatusModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={theme.text} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text style={styles.inputLabel}>Set New Status</Text>
                                <View style={styles.statusPickerContainer}>
                                    {STATUS_OPTIONS.map((status) => {
                                        const btnStyle = getStatusStyles(status);
                                        const isSelected = status === newStatus;
                                        return (
                                            <TouchableOpacity
                                                key={status}
                                                style={[
                                                    styles.statusOption,
                                                    isSelected && { backgroundColor: btnStyle.backgroundColor, borderColor: btnStyle.color }
                                                ]}
                                                onPress={() => setNewStatus(status)}
                                            >
                                                <Text style={[styles.statusOptionText, { color: isSelected ? btnStyle.color : theme.textMuted }]}>
                                                    {status}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.inputLabel}>Reassign Staff (Optional)</Text>
                                {loadingMembers ? (
                                    <ActivityIndicator size="small" color={theme.tint} style={{margin: 20}}/>
                                ) : (
                                    <View style={styles.userListContainer}>
                                        <TouchableOpacity 
                                            style={[styles.userOption, !selectedAssignee && styles.selectedUserOption]}
                                            onPress={() => setSelectedAssignee(undefined)}
                                        >
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: '#f1f5f9' }]}>
                                                <Ionicons name="person-remove-outline" size={16} color="#64748b" />
                                            </View>
                                            <Text style={[styles.userOptionText, !selectedAssignee && { color: theme.tint, fontWeight: '700' }]}>Unassigned</Text>
                                        </TouchableOpacity>

                                        {assignableUsers.map((u) => {
                                            const uId = u._id || u.id?.toString(); 
                                            const isSelected = selectedAssignee === uId;
                                            return (
                                                <TouchableOpacity 
                                                    key={uId}
                                                    style={[styles.userOption, isSelected && styles.selectedUserOption]}
                                                    onPress={() => setSelectedAssignee(uId)}
                                                >
                                                    <View style={styles.avatarPlaceholder}>
                                                        <Text style={styles.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.userOptionText, isSelected && { color: theme.tint, fontWeight: '700' }]}>{u.name}</Text>
                                                        <Text style={styles.userRoleText}>{u.role}</Text>
                                                    </View>
                                                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.tint} />}
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={handleStatusUpdate}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { justifyContent: 'center', alignItems: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
    backBtnText: { fontSize: 15, fontWeight: '600', color: theme.text },
    
    headerCard: {
        backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20,
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
        borderWidth: 1, borderColor: '#f1f5f9'
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    ticketIdText: { fontSize: 13, fontWeight: '800', color: theme.textMuted, letterSpacing: 0.5 },
    subjectTitle: { fontSize: 22, fontWeight: '800', color: theme.text, lineHeight: 28 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusPillText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

    sectionCard: { 
        backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20,
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
        borderWidth: 1, borderColor: '#f1f5f9'
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 16 },
    descriptionText: { fontSize: 15, lineHeight: 24, color: '#475569' },
    
    detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 14 },
    detailIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '600', marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: '700', color: theme.text },
    
    actionButton: { 
        backgroundColor: theme.tint, padding: 18, borderRadius: 18, alignItems: 'center', 
        marginBottom: 40, flexDirection: 'row', justifyContent: 'center',
        shadowColor: theme.tint, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
    modalContainer: { 
        backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, 
        padding: 24, maxHeight: '90%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: theme.text },
    
    inputLabel: { fontSize: 14, fontWeight: '800', color: theme.textMuted, marginBottom: 12, marginTop: 8 },
    statusPickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    statusOption: { 
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, 
        backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#f1f5f9' 
    },
    statusOptionText: { fontSize: 14, fontWeight: '700' },

    userListContainer: { marginBottom: 24, gap: 8 },
    userOption: { 
        flexDirection: 'row', alignItems: 'center', padding: 12, 
        borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', gap: 12 
    },
    selectedUserOption: { backgroundColor: '#eef2ff', borderColor: theme.tint },
    userOptionText: { fontSize: 15, color: theme.text, fontWeight: '600' },
    userRoleText: { fontSize: 12, color: theme.textMuted, fontWeight: '500' },
    avatarPlaceholder: { 
        width: 38, height: 38, borderRadius: 12, backgroundColor: '#cbd5e1', 
        justifyContent: 'center', alignItems: 'center' 
    },
    avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    submitButton: { 
        backgroundColor: theme.success, padding: 18, borderRadius: 16, 
        alignItems: 'center', shadowColor: theme.success, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 
    },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});