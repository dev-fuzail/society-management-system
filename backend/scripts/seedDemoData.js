/**
 * Demo Data Seed Script
 * Creates two demo accounts + realistic data for society 692454690915d25877305bcd
 *
 * Run: node --experimental-vm-modules backend/scripts/seedDemoData.js
 *   OR: cd backend && node scripts/seedDemoData.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Models ────────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  phone: String, role: String,
  society_id: mongoose.Schema.Types.ObjectId,
  apartment_id: mongoose.Schema.Types.ObjectId,
  fcm_tokens: { type: Array, default: [] },
  notification_preferences: {
    announcements: { type: Boolean, default: true },
    elections: { type: Boolean, default: true },
    maintenance_reminders: { type: Boolean, default: true },
    visitor_notifications: { type: Boolean, default: true },
    payment_notifications: { type: Boolean, default: true },
    general_society_updates: { type: Boolean, default: true },
  },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

const apartmentSchema = new mongoose.Schema({
  apartment_name: String, floor: Number,
  owned_by: mongoose.Schema.Types.ObjectId,
  society_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  status: { type: String, default: "verified" },
}, { timestamps: { createdAt: "created_at" } });

const invoiceSchema = new mongoose.Schema({
  society_id: mongoose.Schema.Types.ObjectId,
  apartment_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: Number, currency: { type: String, default: "PKR" },
  type: { type: String, default: "maintenance" },
  period_key: String, month: String,
  due_date: Date, status: { type: String, default: "pending" },
  generated_at: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: "created_at" },
});
invoiceSchema.index(
  { society_id: 1, apartment_id: 1, period_key: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "maintenance" } }
);

const announcementSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  user_id: mongoose.Schema.Types.ObjectId,
  title: String, message: String,
  category: { type: String, default: "general" },
  is_important: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at" } });

const societySchema = new mongoose.Schema({
  name: String, address: String, city: String,
  contact_email: String, total_apartments: Number,
  members: [mongoose.Schema.Types.ObjectId],
  admins: [mongoose.Schema.Types.ObjectId],
  status: { type: String, default: "active" },
  maintenance_config: mongoose.Schema.Types.Mixed,
  pricing_modules: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Apartment = mongoose.model("Apartment", apartmentSchema);
const Invoice = mongoose.model("Invoice", invoiceSchema);
const Announcement = mongoose.model("Announcement", announcementSchema);
const Society = mongoose.model("Society", societySchema);

// ── Config ────────────────────────────────────────────────────────────────────

const SOCIETY_ID = new mongoose.Types.ObjectId("692454690915d25877305bcd");
const HASH_ROUNDS = 10;

const DEMO_ADMIN = {
  name: "Ali Raza",
  email: "admin.demo@livingsync.app",
  password: "Demo@1234",
  phone: "0300-1234567",
  role: "admin",
};

const DEMO_RESIDENT = {
  name: "Sara Khan",
  email: "resident.demo@livingsync.app",
  password: "Demo@1234",
  phone: "0321-9876543",
  role: "resident",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (date) =>
  date.toLocaleString("en-US", { month: "long", year: "numeric" });

const dueDate = (year, month) => new Date(year, month, 5); // 5th of next month

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  // 1. Upsert demo users
  const adminHash = await bcrypt.hash(DEMO_ADMIN.password, HASH_ROUNDS);
  const residentHash = await bcrypt.hash(DEMO_RESIDENT.password, HASH_ROUNDS);

  let adminUser = await User.findOneAndUpdate(
    { email: DEMO_ADMIN.email },
    { ...DEMO_ADMIN, password: adminHash, society_id: SOCIETY_ID },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let residentUser = await User.findOneAndUpdate(
    { email: DEMO_RESIDENT.email },
    { ...DEMO_RESIDENT, password: residentHash, society_id: SOCIETY_ID },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin   : ${adminUser.email}  (${adminUser._id})`);
  console.log(`Resident: ${residentUser.email}  (${residentUser._id})\n`);

  // 2. Upsert apartments
  let adminApt = await Apartment.findOneAndUpdate(
    { apartment_name: "A-101", society_id: SOCIETY_ID },
    { apartment_name: "A-101", floor: 1, society_id: SOCIETY_ID, owned_by: adminUser._id, status: "verified" },
    { upsert: true, new: true }
  );

  let residentApt = await Apartment.findOneAndUpdate(
    { apartment_name: "B-205", society_id: SOCIETY_ID },
    { apartment_name: "B-205", floor: 2, society_id: SOCIETY_ID, owned_by: residentUser._id, status: "verified" },
    { upsert: true, new: true }
  );

  console.log(`Apt admin   : ${adminApt.apartment_name}  (${adminApt._id})`);
  console.log(`Apt resident: ${residentApt.apartment_name}  (${residentApt._id})\n`);

  // Link apartment back to users
  await User.updateOne({ _id: adminUser._id }, { apartment_id: adminApt._id });
  await User.updateOne({ _id: residentUser._id }, { apartment_id: residentApt._id });

  // 3. Update society — add demo users to members/admins, update config
  await Society.updateOne(
    { _id: SOCIETY_ID },
    {
      $addToSet: {
        members: { $each: [adminUser._id, residentUser._id] },
        admins: adminUser._id,
      },
      $set: {
        "pricing_modules.maintenance": {
          enabled: true,
          amount: 5000,
          currency: "PKR",
          due_day: 5,
          grace_period_days: 3,
          late_payment_charge: 500,
          effective_date: new Date("2026-01-01"),
        },
      },
    }
  );
  console.log("Society updated (members + maintenance config)\n");

  // 4. Create invoices — last 4 months for resident, mix of paid/unpaid
  const now = new Date();
  const invoiceDefs = [];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = monthLabel(d);
    const isPaid = i > 1; // oldest 2 paid, recent 2 unpaid

    invoiceDefs.push({
      society_id: SOCIETY_ID,
      apartment_id: residentApt._id,
      user_id: residentUser._id,
      amount: 5000,
      currency: "PKR",
      type: "maintenance",
      period_key: key,
      month: label,
      due_date: dueDate(d.getFullYear(), d.getMonth() + 1),
      status: isPaid ? "paid" : "unpaid",
    });
  }

  // Also one invoice for admin apartment (paid)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  invoiceDefs.push({
    society_id: SOCIETY_ID,
    apartment_id: adminApt._id,
    user_id: adminUser._id,
    amount: 5000,
    currency: "PKR",
    type: "maintenance",
    period_key: monthKey(lastMonth),
    month: monthLabel(lastMonth),
    due_date: dueDate(lastMonth.getFullYear(), lastMonth.getMonth() + 1),
    status: "paid",
  });

  let invoiceCreated = 0;
  for (const inv of invoiceDefs) {
    try {
      await Invoice.findOneAndUpdate(
        { society_id: inv.society_id, apartment_id: inv.apartment_id, period_key: inv.period_key, type: inv.type },
        inv,
        { upsert: true, new: true }
      );
      invoiceCreated++;
    } catch (e) {
      console.warn(`  Invoice upsert skipped (${inv.period_key}): ${e.message}`);
    }
  }
  console.log(`Invoices upserted: ${invoiceCreated}\n`);

  // 5. Create announcements
  const announcements = [
    {
      title: "Water Supply Maintenance — 2 July",
      message: "Water supply will be interrupted on 2 July from 10 AM to 2 PM due to pipeline maintenance. Please store water accordingly.",
      category: "important",
      is_important: true,
    },
    {
      title: "Eid Holiday Parking Notice",
      message: "During Eid holidays (6–8 July), visitor parking in Block B will be reserved for residents only. Please cooperate.",
      category: "general",
      is_important: false,
    },
    {
      title: "Monthly Society Meeting",
      message: "The monthly residents meeting is scheduled for 10 July at 7 PM in the community hall. Agenda: budget review and elevator maintenance approval.",
      category: "general",
      is_important: false,
    },
    {
      title: "CCTV Upgrade Complete",
      message: "We are pleased to announce the CCTV upgrade project is now complete. All common areas, entry gates, and parking zones now have 4K coverage.",
      category: "general",
      is_important: false,
    },
    {
      title: "Emergency: Generator Fuel Refill",
      message: "The backup generator fuel is running critically low. Maintenance team has been alerted. Potential power backup gap between 6–8 PM today. Stay prepared.",
      category: "emergency",
      is_important: true,
    },
  ];

  for (const ann of announcements) {
    const exists = await Announcement.findOne({ title: ann.title, society_id: SOCIETY_ID });
    if (!exists) {
      await Announcement.create({ ...ann, society_id: SOCIETY_ID, user_id: adminUser._id });
    }
  }
  console.log(`Announcements seeded: ${announcements.length}\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  DEMO ACCOUNTS READY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Admin Account`);
  console.log(`    Email    : ${DEMO_ADMIN.email}`);
  console.log(`    Password : ${DEMO_ADMIN.password}`);
  console.log(`    Apartment: A-101 (Floor 1)`);
  console.log();
  console.log(`  Resident Account`);
  console.log(`    Email    : ${DEMO_RESIDENT.email}`);
  console.log(`    Password : ${DEMO_RESIDENT.password}`);
  console.log(`    Apartment: B-205 (Floor 2)`);
  console.log(`    Invoices : 2 paid, 2 unpaid (PKR 5,000 each)`);
  console.log("═══════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
