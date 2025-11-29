// seedTickets.js (Corrected)

import mongoose from 'mongoose';
import Ticket from './models/Ticket.js';
import User from './models/User.js'; // Assuming you have a User model
import Society from './models/Society.js'; // Assuming you have a Society model
import dotenv from "dotenv";

dotenv.config();

// ⚠️ IMPORTANT: Apne MONGODB_URI ko .env file mein set karein.
const MONGODB_URI = process.env.MONGO_URI; 

// --- Dummy Object IDs (Used for consistent referencing) ---
const DUMMY_SOCIETY_ID = new mongoose.Types.ObjectId('656711b7d59b0f443b879a01');
const DUMMY_USER_ID_ADMIN = new mongoose.Types.ObjectId('656711b7d59b0f443b879a02');
const DUMMY_USER_ID_MEMBER = new mongoose.Types.ObjectId('656711b7d59b0f443b879a03'); 

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected for seeding.");

        // ------------------ 1. CLEANUP OLD DATA --------------------
        await Society.deleteMany({ _id: DUMMY_SOCIETY_ID });
        await User.deleteMany({ _id: { $in: [DUMMY_USER_ID_MEMBER, DUMMY_USER_ID_ADMIN] } });
        await Ticket.deleteMany({ societyId: DUMMY_SOCIETY_ID });
        console.log("🗑️ Existing test data cleared.");

        // ------------------ 2. DUMMY REFERENCES SETUP --------------------

        // Society
        await Society.create({
            _id: DUMMY_SOCIETY_ID,
            name: "Central Test Society",
            address: "123 Main St",
            city: "Metro City",
            members: [DUMMY_USER_ID_MEMBER, DUMMY_USER_ID_ADMIN],
            admins: [DUMMY_USER_ID_ADMIN],
        });

        // Users (Required for ticket population)
        await User.insertMany([
            {
                _id: DUMMY_USER_ID_ADMIN,
                name: "Staff Admin",
                email: "staff@test.com",
                role: "admin",
                society_id: DUMMY_SOCIETY_ID,
                // 💥 FIX: Added required password field
                password: "hashed_admin_password_placeholder", 
            },
            {
                _id: DUMMY_USER_ID_MEMBER,
                name: "Complaint Member",
                email: "member@test.com",
                role: "member",
                society_id: DUMMY_SOCIETY_ID,
                // 💥 FIX: Added required password field
                password: "hashed_member_password_placeholder", 
            }
        ]);
        console.log("👥 Users and Society created.");

        // ------------------ 3. TICKET DATA (FCFS SIMULATION) --------------------
        const ticketsData = [
            {
                subject: "Lift Malfunction (A-Wing)",
                description: "The elevator is stuck on the 5th floor. Needs urgent repair.",
                createdBy: DUMMY_USER_ID_MEMBER,
                societyId: DUMMY_SOCIETY_ID,
                status: 'Pending',
                createdAt: new Date(Date.now() - 5000000), 
            },
            {
                subject: "Parking Spot Security Camera Broken",
                description: "Camera near spot #15 is offline. Please check wiring.",
                createdBy: DUMMY_USER_ID_MEMBER,
                societyId: DUMMY_SOCIETY_ID,
                status: 'In Progress',
                assignedTo: DUMMY_USER_ID_ADMIN,
                createdAt: new Date(Date.now() - 3000000),
            },
            {
                subject: "New Tenant Registration Support",
                description: "I need help uploading documents for new tenant approval.",
                createdBy: DUMMY_USER_ID_MEMBER,
                societyId: DUMMY_SOCIETY_ID,
                status: 'Pending',
                createdAt: new Date(), 
            },
        ];

        await Ticket.insertMany(ticketsData);
        console.log(`\n🎉 Seed completed! ${ticketsData.length} tickets inserted.`);

    } catch (error) {
        console.error("❌ Seeding FAILED:", error);
        console.log("\n⚠️ CHECKPOINT: Double-check your MONGO_URI and ensure MongoDB is running.");
    } finally {
        await mongoose.connection.close();
    }
};

seedDatabase();