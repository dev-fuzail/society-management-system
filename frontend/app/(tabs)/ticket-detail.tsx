import React, { useState, useEffect } from 'react';
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
    Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGetTicketById, apiUpdateTicketStatus } from '@/services/TicketService';
import { TicketResponse, TicketStatus, UpdateStatusData, UserData } from '@/services/types'; 
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetSocietyUsers } from '@/services/SocietyService';

const CustomTheme = {
    background: '#F5F5F5', 
    card: '#FFFFFF',       
    text: '#333333',       
    textMuted: '#757575',  
    tint: '#007AFF',       
    error: '#F44336',      
    success: '#4CAF50',    
    border: '#DDDDDD',
    actionBorder: '#D84315',
    selectedItem: '#E3F2FD' // New color for selected user
};
const theme = CustomTheme;

const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
        case 'Pending': return { color: '#FF9800', backgroundColor: '#FFF3E0', cardBorder: '#FF9800' };
        case 'In Progress': return { color: '#2196F3', backgroundColor: '#E3F2FD', cardBorder: '#2196F3' };
        case 'Resolved': return { color: '#4CAF50', backgroundColor: '#E8F5E9', cardBorder: '#4CAF50' };
        case 'Closed': return { color: '#9E9E9E', backgroundColor: '#FAFAFA', cardBorder: '#9E9E9E' };
        default: return { color: '#9E9E9E', backgroundColor: '#FAFAFA', cardBorder: '#9E9E9E' };
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

    // --- 1. Fetch Ticket Data ---
    const fetchTicket = async () => {
        if (!ticketId) {
            Alert.alert("Error", "No ticket ID provided.");
            router.back();
            return;
        }
        setLoading(true);
        try {
            const response = await apiGetTicketById(ticketId); 
            if (response.success && response.result) {
                setTicket(response.result);
                setNewStatus(response.result.status);
                
                // Initialize selected assignee if it exists
                if (response.result.assignedTo) {
                    setSelectedAssignee(response.result.assignedTo._id);
                }

                // If user is staff, fetch society members immediately so they are ready
                if (user?.role === 'admin' || user?.role === 'staff') {
                    fetchSocietyMembers(response.result.societyId);
                }

            } else {
                Alert.alert("Error", response.message || "Ticket not found.");
                router.back();
            }
        } catch (error) {
            Alert.alert("Error", "Failed to load ticket details.");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Fetch Society Members (New Logic) ---
    const fetchSocietyMembers = async (societyId: string) => {
        setLoadingMembers(true);
        try {
            const response = await apiGetSocietyUsers(societyId);
            if (response.success && response.result) {
                // Combine admins and members, remove duplicates based on ID
                const allUsers = [...response.result.admins, ...response.result.members];
                
                // Deduplicate logic (in case a user is in both lists)
                const uniqueUsers = Array.from(new Map(allUsers.map(item => [item._id || item.id, item])).values());
                
                setAssignableUsers(uniqueUsers);
            }
        } catch (error) {
            console.log("Error fetching members", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            setUser(userData);
            // Fetch ticket logic is called after we have user data to know permissions
        };
        init().then(() => fetchTicket());
    }, [ticketId]);


    // --- 3. Handle Update Submission ---
    const handleStatusUpdate = async () => {
        setIsUpdating(true);
        try {
            const updatePayload: UpdateStatusData = { 
                status: newStatus 
            };
            
            // Add assigned user to payload if selected
            if (selectedAssignee) {
                updatePayload.assignedTo = selectedAssignee;
            }

            const response = await apiUpdateTicketStatus(ticketId, updatePayload);
            
            if (response.success && response.result) {
                setTicket(response.result);
                Alert.alert("Success", "Ticket updated successfully!");
                setIsStatusModalVisible(false);
            } else {
                Alert.alert("Error", response.message || "Failed to update status.");
            }
        } catch (error) {
            Alert.alert("Error", "Server error during update.");
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!ticket) return null;

    const statusStyle = getStatusStyles(ticket.status);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* Header Card */}
            <View style={[styles.headerCard, { borderColor: statusStyle.cardBorder }]}>
                <Ionicons name="megaphone" size={30} color={statusStyle.cardBorder} style={{ marginRight: 15 }} />
                <View style={styles.headerContent}>
                    <Text style={[styles.ticketIdText, { color: theme.textMuted }]}>
                        TICKET #{ticket.createdAt.slice(-6)} 
                    </Text>
                    <Text style={[styles.subjectTitle, { color: theme.text }]}>
                        {ticket.subject}
                    </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.color }]}>{ticket.status}</Text>
                </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionCard}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={[styles.descriptionText, { color: theme.text }]}>{ticket.description}</Text>
            </View>

            {/* Details */}
            <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Ticket Details</Text>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Created By</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{ticket.createdBy?.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Assigned To</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{ticket.assignedTo?.name || 'Unassigned'}</Text>
                </View>
            </View>
            
            {/* Action Button (Staff Only) */}
            {isUserStaff && (
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.tint }]}
                    onPress={() => setIsStatusModalVisible(true)}
                    disabled={isUpdating}
                >
                    <Text style={styles.actionButtonText}>Update Status / Assign</Text>
                </TouchableOpacity>
            )}

            {/* --- UPDATE MODAL --- */}
            <Modal
                visible={isStatusModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsStatusModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsStatusModalVisible(false)}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]} onTouchStart={(e) => e.stopPropagation()}>
                        
                        <ScrollView contentContainerStyle={{flexGrow: 1}}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Update Ticket</Text>
                            
                            {/* 1. Status Selection */}
                            <Text style={styles.inputLabel}>Select Status</Text>
                            <View style={styles.statusPickerContainer}>
                                {STATUS_OPTIONS.map((status) => {
                                    const btnStyle = getStatusStyles(status);
                                    const isSelected = status === newStatus;
                                    return (
                                        <TouchableOpacity
                                            key={status}
                                            style={[
                                                styles.statusOption,
                                                { backgroundColor: isSelected ? btnStyle.backgroundColor : theme.background },
                                                isSelected && styles.selectedStatus,
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

                            {/* 2. Assign Member Selection (New UI) */}
                            <Text style={styles.inputLabel}>Assign Staff (Optional)</Text>
                            {loadingMembers ? (
                                <ActivityIndicator size="small" color={theme.tint} style={{margin: 20}}/>
                            ) : (
                                <View style={styles.userListContainer}>
                                    {/* Default Unassigned Option */}
                                    <TouchableOpacity 
                                        style={[
                                            styles.userOption, 
                                            !selectedAssignee && styles.selectedUserOption
                                        ]}
                                        onPress={() => setSelectedAssignee(undefined)}
                                    >
                                        <Ionicons name="person-outline" size={20} color={!selectedAssignee ? theme.tint : theme.textMuted} />
                                        <Text style={[styles.userOptionText, !selectedAssignee && {color: theme.tint, fontWeight:'bold'}]}>
                                            Unassigned
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Mapped Users */}
                                    {assignableUsers.map((u) => {
                                        // Handle ID mismatch (user._id vs user.id)
                                        const uId = u._id || u.id?.toString(); 
                                        const isSelected = selectedAssignee === uId;
                                        
                                        return (
                                            <TouchableOpacity 
                                                key={uId}
                                                style={[
                                                    styles.userOption,
                                                    isSelected && styles.selectedUserOption
                                                ]}
                                                onPress={() => setSelectedAssignee(uId)}
                                            >
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                                                </View>
                                                <View>
                                                    <Text style={[styles.userOptionText, isSelected && {color: theme.tint, fontWeight:'bold'}]}>
                                                        {u.name}
                                                    </Text>
                                                    <Text style={styles.userRoleText}>{u.role}</Text>
                                                </View>
                                                {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.tint} style={{marginLeft:'auto'}}/>}
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            )}

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: theme.success }]}
                                onPress={handleStatusUpdate}
                                disabled={isUpdating}
                            >
                                <Text style={styles.submitButtonText}>
                                    {isUpdating ? "Saving..." : "Save Changes"}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

// ----------------------------------------------------------------------
// ------------------------------- STYLES -------------------------------
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15 },
    center: { justifyContent: 'center', alignItems: 'center' },
    
    // Header
    headerCard: {
        backgroundColor: theme.card, padding: 15, borderRadius: 12, marginBottom: 20,
        flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, elevation: 3,
    },
    headerContent: { flex: 1, marginLeft: 10 },
    ticketIdText: { fontSize: 14, fontWeight: '500', marginBottom: 5 },
    subjectTitle: { fontSize: 20, fontWeight: 'bold' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, minWidth: 90, alignItems: 'center' },
    statusPillText: { fontSize: 14, fontWeight: 'bold' },

    // Sections
    descriptionCard: { backgroundColor: theme.card, padding: 20, borderRadius: 12, marginBottom: 20, elevation: 3 },
    descriptionText: { fontSize: 16, lineHeight: 24, marginTop: 5 },
    detailsSection: { backgroundColor: theme.card, padding: 20, borderRadius: 12, marginBottom: 20, elevation: 3 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    detailLabel: { fontSize: 16, fontWeight: '500', flex: 1 },
    detailValue: { fontSize: 16, fontWeight: '600', flex: 1.5, textAlign: 'right' },
    
    // Buttons
    actionButton: { padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 30 },
    actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', maxHeight: '80%', padding: 20, borderRadius: 15, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: theme.textMuted, marginBottom: 10, marginTop: 10 },

    statusPickerContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
    statusOption: { padding: 10, borderRadius: 8, flexBasis: '48%', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    selectedStatus: { borderWidth: 2, borderColor: theme.tint, shadowColor: theme.tint, shadowOpacity: 0.4 },
    statusOptionText: { fontWeight: '600' },

    // User List Styles (New)
    userListContainer: { maxHeight: 200, marginBottom: 20, borderWidth: 1, borderColor: theme.border, borderRadius: 8 },
    userOption: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    selectedUserOption: { backgroundColor: theme.selectedItem },
    userOptionText: { fontSize: 16, marginLeft: 10, color: theme.text },
    userRoleText: { fontSize: 12, color: theme.textMuted, marginLeft: 10 },
    avatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 14, fontWeight: 'bold', color: '#555' },

    submitButton: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});