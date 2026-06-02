import Society from "../models/Society.js";
import User from "../models/User.js";
import MaintenanceConfigAudit from "../models/MaintenanceConfigAudit.js";

const normalizeMaintenanceConfig = (config = {}) => {
  const amount = Number(config.amount);
  const dueDay = Number(config.due_day);
  const gracePeriodDays = Number(config.grace_period_days || 0);
  const latePaymentCharge = Number(config.late_payment_charge || 0);
  const currency = String(config.currency || "PKR").trim().toUpperCase();
  const effectiveDate = config.effective_date ? new Date(config.effective_date) : new Date();

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Maintenance amount must be a valid non-negative number.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a valid 3-letter code.");
  }

  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error("Due day must be a number between 1 and 31.");
  }

  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0) {
    throw new Error("Grace period must be a non-negative whole number.");
  }

  if (!Number.isFinite(latePaymentCharge) || latePaymentCharge < 0) {
    throw new Error("Late payment charge must be a valid non-negative number.");
  }

  if (Number.isNaN(effectiveDate.getTime())) {
    throw new Error("Effective date must be a valid date.");
  }

  return {
    amount,
    currency,
    due_day: dueDay,
    grace_period_days: gracePeriodDays,
    late_payment_charge: latePaymentCharge,
    effective_date: effectiveDate,
  };
};

const getAuthorizedSocietyAdmin = async ({ societyId, userId }) => {
  if (!societyId || !userId) {
    return { error: { status: 400, message: "Society ID and user ID are required." } };
  }

  const [society, user] = await Promise.all([
    Society.findById(societyId),
    User.findById(userId),
  ]);

  if (!society) {
    return { error: { status: 404, message: "Society not found." } };
  }

  if (!user) {
    return { error: { status: 404, message: "User not found." } };
  }

  const isSocietyAdmin = society.admins.some((adminId) => adminId.toString() === user._id.toString());
  const belongsToSociety = user.society_id?.toString() === society._id.toString();

  if (user.role !== "admin" || !belongsToSociety || !isSocietyAdmin) {
    return { error: { status: 403, message: "Only society administrators can update maintenance settings." } };
  }

  return { society, user };
};

export const createSociety = async (req, res) => {
  try {
    const { name, address } = req.body;
    const exists = await Society.findOne({ name });
    if (exists)
      return res.status(400).json({ success: false, message: "Society already exists" });

    const society = new Society({ name, address });
    await society.save();

    res.status(201).json({ success: true, message: "Society created successfully.", result: society });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSocieties = async (req, res) => {
  try {
    const societies = await Society.find()
      .populate("admins", "name email role") // admins ka sirf name, email, role
      .populate("members", "name email role"); // members ka sirf name, email, role

    res.status(200).json({ success: true, message: "Societies fetched successfully.", result: societies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users of a specific society
export const getUserSocieties = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    // Find all societies where user is admin or member
    const societies = await Society.find({
      $or: [{ admins: user_id }, { members: user_id }],
    })
      .populate("members", "name email role phone")
      .populate("admins", "name email role phone");

    if (!societies || societies.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No societies found for this user." });
    }

    return res.status(200).json({
      success: true,
      result: societies,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all members and admins of a specific society
export const getSocietyMembers = async (req, res) => {
  try {
    const { societyId } = req.params; // society ID URL se

    if (!societyId) {
      return res.status(400).json({ success: false, message: "Society ID is required." });
    }

    const society = await Society.findById(societyId)
      .populate("members", "name email role phone") // select fields
      .populate("admins", "name email role phone");

    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Society members fetched successfully.",
      result: {
        society_id: society._id,
        name: society.name,
        members: society.members, // all members including admins
        admins: society.admins, // all admins
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const updateSociety = async (req, res) => {
//   try {
//     const { id } = req.params; // society id
//     const { userId, name, address, city, contact_email, total_apartments, addAdmins, removeAdmins, removeMembers } = req.body;

//     const society = await Society.findById(id);
//     if (!society) return res.status(404).json({ message: "Society not found" });

//     // Only admin can update society
//     if (!society.admins.includes(userId)) {
//       return res.status(403).json({ message: "Only admin can update society" });
//     }

//     // Update basic fields
//     if (name) society.name = name;
//     if (address) society.address = address;
//     if (city) society.city = city;
//     if (contact_email) society.contact_email = contact_email;
//     if (total_apartments !== undefined) society.total_apartments = total_apartments;

//     // 🔹 Add new admins (if provided)
//     if (addAdmins && Array.isArray(addAdmins)) {
//       addAdmins.forEach(adminId => {
//         if (!society.admins.includes(adminId)) {
//           society.admins.push(adminId);
//           if (!society.members.includes(adminId)) {
//             society.members.push(adminId); // admin is also a member
//           }
//         }
//       });
//     }

//     // 🔹 Remove admins (if provided)
//     if (removeAdmins && Array.isArray(removeAdmins)) {
//       removeAdmins.forEach(adminId => {
//         society.admins = society.admins.filter(a => a.toString() !== adminId);
//       });
//     }

//     // 🔹 Remove members (if provided)
//     if (removeMembers && Array.isArray(removeMembers)) {
//       removeMembers.forEach(memberId => {
//         society.members = society.members.filter(m => m.toString() !== memberId);
//         // Agar wo member admin bhi hai, admin list me nahi hatayenge (separate option hai removeAdmins)
//       });
//     }

//     const updatedSociety = await society.save();
//     res.status(200).json({ message: "Society updated successfully", data: updatedSociety });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const updateSociety = async (req, res) => {
  try {
    const {
      userId,
      name,
      address,
      city,
      contact_email,
      total_apartments,
      addAdmins,
      removeAdmins,
      removeMembers,
    } = req.body;

    // 🔹 Validate user existence
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 🔹 Ensure user is linked to a society
    if (!user.society_id) {
      return res
        .status(400)
        .json({ success: false, message: "User is not associated with any society" });
    }

    // 🔹 Find society by user’s society_id
    const society = await Society.findById(user.society_id);
    if (!society) return res.status(404).json({ success: false, message: "Society not found" });

    // 🔹 Check if user is admin of that society (This was commented out, keeping it that way)
    // if (!society.admins.includes(userId)) {
    //   return res
    //     .status(403)
    //     .json({ message: "Only admins can update society" });
    // }

    // 🔹 Update basic fields
    if (name) society.name = name;
    if (address) society.address = address;
    if (city) society.city = city;
    if (contact_email) society.contact_email = contact_email;
    if (total_apartments !== undefined)
      society.total_apartments = total_apartments;

    // 🔹 Add new admins
    if (addAdmins && Array.isArray(addAdmins)) {
      addAdmins.forEach((adminId) => {
        if (!society.admins.includes(adminId)) {
          society.admins.push(adminId);
          if (!society.members.includes(adminId)) {
            society.members.push(adminId); // admin must also be member
          }
        }
      });
    }

    // 🔹 Remove admins
    if (removeAdmins && Array.isArray(removeAdmins)) {
      removeAdmins.forEach((adminId) => {
        society.admins = society.admins.filter((a) => a.toString() !== adminId);
      });
    }

    // 🔹 Remove members
    if (removeMembers && Array.isArray(removeMembers)) {
      removeMembers.forEach((memberId) => {
        society.members = society.members.filter(
          (m) => m.toString() !== memberId
        );
      });
    }

    const updatedSociety = await society.save();
    res
      .status(200)
      .json({ success: true, message: "Society updated successfully", result: updatedSociety });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMaintenanceSettings = async (req, res) => {
  try {
    const { societyId } = req.params;
    const society = await Society.findById(societyId).select("maintenance_config");

    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Maintenance settings fetched successfully.",
      result: society.maintenance_config,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMaintenanceSettings = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { userId, maintenance_config } = req.body;
    const { society, user, error } = await getAuthorizedSocietyAdmin({ societyId, userId });

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const previousConfig = society.maintenance_config?.toObject
      ? society.maintenance_config.toObject()
      : society.maintenance_config || {};
    const updatedConfig = normalizeMaintenanceConfig(maintenance_config);

    society.maintenance_config = updatedConfig;
    await society.save();

    const audit = await MaintenanceConfigAudit.create({
      society_id: society._id,
      admin_id: user._id,
      previous_amount: Number(previousConfig.amount || 0),
      updated_amount: updatedConfig.amount,
      previous_config: previousConfig,
      updated_config: updatedConfig,
      changed_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Maintenance settings updated successfully.",
      result: {
        maintenance_config: society.maintenance_config,
        audit,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMaintenanceAuditHistory = async (req, res) => {
  try {
    const { societyId } = req.params;
    const history = await MaintenanceConfigAudit.find({ society_id: societyId })
      .populate("admin_id", "name email")
      .sort({ changed_at: -1 });

    return res.status(200).json({
      success: true,
      message: "Maintenance audit history fetched successfully.",
      result: history,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
