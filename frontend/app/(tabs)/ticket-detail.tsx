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
    Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Assuming you have these services and types defined:
import { apiGetTicketById, apiUpdateTicketStatus } from '@/services/TicketService';
import { TicketResponse, TicketStatus, UpdateStatusData } from '@/services/types'; 
import { getAuthData } from '@/hooks/helperHooks'; // Use correct path

// --- Custom Theme (Consistent hardcoded theme) ---
const CustomTheme = {
    background: '#F5F5F5', // Light Gray background
    card: '#FFFFFF',       // White card background
    text: '#333333',       // Dark text
    textMuted: '#757575',  // Gray muted text
    tint: '#007AFF',       // Blue tint for primary actions
    error: '#F44336',      // Red
    success: '#4CAF50',    // Green
    border: '#DDDDDD',
    actionBorder: '#D84315' // Complaint border color
};
const theme = CustomTheme;

// --- Status Color Utility ---
const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
        case 'Pending':
            return { color: '#FF9800', backgroundColor: '#FFF3E0', cardBorder: '#FF9800' };
        case 'In Progress':
            return { color: '#2196F3', backgroundColor: '#E3F2FD', cardBorder: '#2196F3' };
        case 'Resolved':
            return { color: '#4CAF50', backgroundColor: '#E8F5E9', cardBorder: '#4CAF50' };
        case 'Closed':
            return { color: '#9E9E9E', backgroundColor: '#FAFAFA', cardBorder: '#9E9E9E' };
        default:
            return { color: '#9E9E9E', backgroundColor: '#FAFAFA', cardBorder: '#9E9E9E' };
    }
};

const STATUS_OPTIONS: TicketStatus[] = ['Pending', 'In Progress', 'Resolved', 'Closed'];

// ----------------------------------------------------------------------
// ------------------------- TICKET DETAIL SCREEN -----------------------
// ----------------------------------------------------------------------

export default function TicketDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const ticketId = params.id as string;

    const [ticket, setTicket] = useState<TicketResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
    const [newStatus, setNewStatus] = useState<TicketStatus>('Pending');
    const [isUpdating, setIsUpdating] = useState(false);

    const isUserStaff = user?.role === 'admin' || user?.role === 'staff';

    // --- Fetch Ticket Data ---
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

    // --- Initialization & Auth Check ---
    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            setUser(userData);
            fetchTicket();
        };
        init();
    }, [ticketId]);

    // --- Handle Status Update Submission ---
    const handleStatusUpdate = async () => {
        if (newStatus === ticket?.status && !ticket?.assignedTo) {
             Alert.alert("Info", "No significant changes made.");
             setIsStatusModalVisible(false);
             return;
        }

        setIsUpdating(true);
        try {
            const updatePayload: UpdateStatusData = { status: newStatus };
            
            // Auto-assign staff logic
            if (newStatus === 'In Progress' && !ticket?.assignedTo) {
                updatePayload.assignedTo = user.id; 
            }

            const response = await apiUpdateTicketStatus(ticketId, updatePayload);
            
            if (response.success && response.result) {
                setTicket(response.result);
                Alert.alert("Success", "Ticket updated!");
            } else {
                Alert.alert("Error", response.message || "Failed to update status.");
            }
        } catch (error) {
            Alert.alert("Error", "Server error during update.");
        } finally {
            setIsUpdating(false);
            setIsStatusModalVisible(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={{ color: theme.textMuted, marginTop: 10 }}>Loading complaint...</Text>
            </View>
        );
    }

    if (!ticket) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>Complaint data is unavailable.</Text>
            </View>
        );
    }

    const statusStyle = getStatusStyles(ticket.status);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* Header / Status Bar - Use Complaint Style */}
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
                    <Text style={[styles.statusPillText, { color: statusStyle.color }]}>
                        {ticket.status}
                    </Text>
                </View>
            </View>

            {/* --- Description --- */}
            <View style={styles.descriptionCard}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={[styles.descriptionText, { color: theme.text }]}>
                    {ticket.description}
                </Text>
            </View>

            {/* --- Main Details --- */}
            <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Ticket Details</Text>
                
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Created By</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{ticket.createdBy?.name || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Creation Date</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{new Date(ticket.createdAt).toLocaleString()}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Assigned To</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                        {ticket.assignedTo?.name || '—'}
                    </Text>
                </View>
                
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Contact Email</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                        {ticket.createdBy?.email}
                    </Text>
                </View>
            </View>
            
            {/* --- Action Button (Staff Only) --- */}
            {isUserStaff && (
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.tint }]}
                    onPress={() => setIsStatusModalVisible(true)}
                    disabled={isUpdating}
                >
                    <Text style={styles.actionButtonText}>
                        {isUpdating ? "Updating..." : "Update Status / Assign"}
                    </Text>
                </TouchableOpacity>
            )}

            {/* --- Status Update Modal (remains the same) --- */}
            <Modal
                visible={isStatusModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsStatusModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsStatusModalVisible(false)}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]} onTouchStart={(e) => e.stopPropagation()}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Change Ticket Status</Text>
                        
                        {/* Status Picker (Simulated with TouchableOpacity) */}
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

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: theme.success }]}
                            onPress={handleStatusUpdate}
                            disabled={isUpdating}
                        >
                            <Text style={styles.submitButtonText}>
                                {isUpdating ? "Saving..." : "Confirm Status"}
                            </Text>
                        </TouchableOpacity>
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
    container: {
        flex: 1,
        padding: 15,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    // --- Header/Status Card (Complaint Style) ---
    headerCard: {
        backgroundColor: theme.card,
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 5,
        // borderColor set dynamically
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    headerContent: {
        flex: 1,
        marginLeft: 10,
    },
    ticketIdText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 5,
    },
    subjectTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    statusPillText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    // --- Description Card ---
    descriptionCard: {
        backgroundColor: theme.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
        marginTop: 5,
    },
    // --- Details Section ---
    detailsSection: {
        backgroundColor: theme.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        paddingBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1.5,
        textAlign: 'right',
    },
    // --- Action Button ---
    actionButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 30,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // --- Modal Styles ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    statusPickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    statusOption: {
        padding: 10,
        borderRadius: 8,
        flexBasis: '48%', // Allows two options per row
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.border,
    },
    selectedStatus: {
        borderWidth: 2,
        borderColor: theme.tint,
        shadowColor: theme.tint,
        shadowOpacity: 0.4,
        shadowRadius: 3,
    },
    statusOptionText: {
        fontWeight: '600',
    },
    submitButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: theme.error,
        fontSize: 18,
        fontWeight: 'bold',
    },
});