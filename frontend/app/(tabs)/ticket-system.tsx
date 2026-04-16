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
    Pressable,
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

const CustomTheme = {
    background: '#f8fafc',
    card: '#FFFFFF',
    text: '#1e293b',
    textMuted: '#64748b',
    tint: '#4f46e5',
    border: '#f1f5f9',
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

    const theme = CustomTheme;
    const isUserAdmin = user?.role === 'admin';

    // --- Fetch Data ---
    const fetchTickets = async (sId: string) => {
        try {
            const res = await apiGetTickets(sId);
            if (res.success && res.result) {
                setTickets(res.result);
            }
        } catch (error: any) {
            console.error("Ticket fetch error:", error);
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
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // --- Refresh on Focus ---
    useFocusEffect(
        useCallback(() => {
            if (societyId) fetchTickets(societyId);
        }, [societyId])
    );

    // --- Handle New Ticket Submission ---
    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) {
            Alert.alert("Validation", "Please fill in all fields.");
            return;
        }
        setIsSubmitting(true);
        try {
            const ticketData: TicketData = {
                subject: subject.trim(),
                description: description.trim(),
                createdBy: user.id,
                societyId: societyId!,
            };
            const res = await apiCreateTicket(ticketData);
            if (res.success) {
                Alert.alert("Success", "Complaint submitted!");
                setIsModalVisible(false);
                setSubject('');
                setDescription('');
                fetchTickets(societyId!);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderTicket = ({ item }: { item: TicketResponse }) => {
        const statusStyle = getStatusStyles(item.status);
        const ticketNumber = tickets.indexOf(item) + 1;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/ticket-detail?id=${item._id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.numberBadge}>
                        <Text style={styles.ticketNumber}>#{ticketNumber}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>{item.status}</Text>
                    </View>
                </View>

                <Text style={styles.cardTitle}>{item.subject}</Text>
                
                <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="person-outline" size={12} color={theme.textMuted} />
                        <Text style={styles.metaText}>{item.createdBy.name}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
                        <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>

                {isUserAdmin && (
                    <View style={styles.assignedBox}>
                        <Text style={styles.assignedLabel}>Assigned to:</Text>
                        <Text style={styles.assignedValue}>{item.assignedTo?.name || 'Unassigned'}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.listHeader}>
                <Text style={styles.title}>Complaints</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Ionicons name="add-circle" size={40} color={theme.tint} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={tickets}
                keyExtractor={(item) => item._id}
                renderItem={renderTicket}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="mail-unread-outline" size={60} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No active complaints.</Text>
                    </View>
                }
            />

            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                        <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Complaint</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={theme.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text style={styles.label}>Subject</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Summary of the issue"
                                    value={subject}
                                    onChangeText={setSubject}
                                />

                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Detailed description..."
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={5}
                                />

                                <TouchableOpacity
                                    style={styles.submitButton}
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
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1e293b',
    },
    addButton: {
        shadowColor: '#4f46e5',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    numberBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ticketNumber: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    cardMeta: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    assignedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 4,
    },
    assignedLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginRight: 6,
    },
    assignedValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1e293b',
    },
    formContent: {
        paddingBottom: 40,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        color: '#1e293b',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#4f46e5',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#4f46e5',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});