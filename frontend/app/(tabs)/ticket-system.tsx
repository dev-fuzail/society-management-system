import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

// Import necessary services and types
import { apiGetTickets, apiCreateTicket } from "@/services/TicketService";
import { apiGetUserSocieties } from "@/services/SocietyService";
import { TicketResponse, TicketStatus, TicketData } from "@/services/types"; // Ensure these types are correctly defined
import { getAuthData } from "@/hooks/helperHooks"; // Corrected import path
// import { Colors } from "@/constants/theme"; // Removed theme import

// --- Status Color Utility ---
const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
        case 'Pending':
            return { color: '#FF9800', backgroundColor: '#FFF3E0', cardBorder: '#FF9800' }; // Orange
        case 'In Progress':
            return { color: '#2196F3', backgroundColor: '#E3F2FD', cardBorder: '#2196F3' }; // Blue
        case 'Resolved':
            return { color: '#4CAF50', backgroundColor: '#E8F5E9', cardBorder: '#4CAF50' }; // Green
        case 'Closed':
            return { color: '#9E9E9E', backgroundColor: '#FAFAFA', cardBorder: '#9E9E9E' }; // Grey
        default:
            return { color: '#9E9E9E', backgroundColor: '#FAFAFA', cardBorder: '#9E9E9E' };
    }
};

// --- Custom Theme Constants (Hardcoded for stability) ---
const CustomTheme = {
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#333333',
    textMuted: '#757575',
    tint: '#007AFF', // Blue tint for primary actions
    border: '#DDDDDD',
};


export default function TicketSystemScreen() {
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [societyId, setSocietyId] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Form State
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const theme = CustomTheme; // Using hardcoded theme for stability
    const isUserAdmin = user?.role === 'admin';

    // --- Fetch Data ---
    const fetchTickets = async (sId: string) => {
        try {
            // NOTE: We rely on the calling function (init or useFocusEffect) to set setLoading(true)
            // If we keep setLoading(true) here, it restarts the spinner mid-fetch. 
            const res = await apiGetTickets(sId);

            if (res.success && res.result) {
                setTickets(res.result);
            } else {
                Alert.alert("Error", res.message || "Failed to fetch tickets.");
            }
        } catch (error: any) {
            console.error("Ticket fetch error:", error);
            Alert.alert("Error", "Could not connect to ticket system.");
        }
    };

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const { userData } = await getAuthData();
                if (!userData) return;

                setUser(userData);

                const societyRes = await apiGetUserSocieties(userData.id);
                if (societyRes.result && societyRes.result[0]) {
                    const sId = societyRes.result[0]._id;
                    setSocietyId(sId);

                    await fetchTickets(sId);
                }
            } catch (e) {
                console.error("Init failed:", e);
            } finally {
                setLoading(false); // STOP LOADING HERE (Only once on initial mount/data setup)
            }
        };
        init();
    }, []);

    // --- Refresh on Focus ---
    useFocusEffect(
        useCallback(() => {
            // This hook handles subsequent refreshes when the screen becomes active
            if (societyId) {
                fetchTickets(societyId);
            }
        }, [societyId])
    );

    // --- Handle New Ticket Submission ---
    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) {
            Alert.alert("Validation", "Please fill in both the subject and description.");
            return;
        }
        if (!societyId || !user?.id) {
            Alert.alert("Error", "User or Society data missing. Cannot submit.");
            return;
        }

        setIsSubmitting(true);
        try {
            const ticketData: TicketData = {
                subject: subject.trim(),
                description: description.trim(),
                createdBy: user.id,
                societyId: societyId,
            };

            const res = await apiCreateTicket(ticketData);

            if (res.success && res.result) {
                Alert.alert("Success", "Your ticket has been submitted!");
                setIsModalVisible(false);
                setSubject('');
                setDescription('');
                fetchTickets(societyId); // Refresh list
            } else {
                Alert.alert("Error", res.message || "Failed to submit ticket.");
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred during submission.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Individual Ticket Item ---
    const renderTicket = ({ item }: { item: TicketResponse }) => {
        const statusStyle = getStatusStyles(item.status);
        const isAssigned = !!item.assignedTo;
        const ticketNumber = tickets.indexOf(item) + 1; // FCFS index

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderLeftColor: statusStyle.cardBorder }]}
                // 🛠️ FIX: Use correct query parameter string for navigation
                onPress={() => router.push(`/ticket-detail?id=${item._id}`)}
            >
                <View style={styles.cardHeader}>
                    <Text style={[styles.ticketNumber, { color: theme.text }]}>
                        {`#${ticketNumber}`} {/* 💥 FIX: Corrected JSX Syntax */}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {item.subject}
                </Text>

                <Text style={styles.cardDetailText}>
                    Created by: {item.createdBy.name}
                </Text>

                {isUserAdmin && (
                    <Text style={styles.cardDetailText}>
                        Assigned: {isAssigned ? item.assignedTo?.name : 'Unassigned'}
                    </Text>
                )}

                <Text style={[styles.cardFooterText, { color: theme.textMuted }]}>
                    Created: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={{ color: theme.textMuted, marginTop: 10 }}>Loading tickets...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            {/* Header with Add Button */}
            <View style={styles.listHeader}>
                <Text style={[styles.title, { color: theme.text }]}>Complaint System</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Ionicons name="add-circle" size={34} color={theme.tint} />
                </TouchableOpacity>
            </View>

            {/* FCFS Ticket List */}
            <FlatList
                data={tickets}
                keyExtractor={(item) => item._id}
                renderItem={renderTicket}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                        No active complaints found.
                    </Text>
                }
            />

            {/* Create Ticket Modal */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Submit New Complaint</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close-circle-outline" size={30} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.formContent}>

                            <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                placeholder="Short summary of the issue"
                                placeholderTextColor={theme.textMuted}
                                value={subject}
                                onChangeText={setSubject}
                                autoCapitalize="sentences"
                            />

                            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
                                placeholder="Detailed description of the problem"
                                placeholderTextColor={theme.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: theme.tint }]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Complaint</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    addButton: {
        padding: 5,
    },
    // --- Card Styles ---
    card: {
        padding: 15,
        borderRadius: 10,
        marginVertical: 8,
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        borderLeftWidth: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    ticketNumber: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 15,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
    cardDetailText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 2,
    },
    cardFooterText: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
    // --- Modal Styles ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    formContent: {
        paddingBottom: 50,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 10,
        marginBottom: 5,
    },
    input: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: 16,
        marginBottom: 10,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});