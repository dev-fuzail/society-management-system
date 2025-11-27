import Society from "../models/Society.js";
import User from "../models/User.js";

export const createSociety = async (req, res) => {
  try {
    const { name, address } = req.body;
    const exists = await Society.findOne({ name });
    if (exists)
      return res.status(400).json({ message: "Society already exists" });

    const society = new Society({ name, address });
    await society.save();

    res.status(201).json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSocieties = async (req, res) => {
  try {
    const societies = await Society.find()
      .populate("admins", "name email role") // admins ka sirf name, email, role
      .populate("members", "name email role"); // members ka sirf name, email, role

    res.json(societies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users of a specific society
export const getUserSocieties = async (req, res) => {
  console.log("🔍 Fetching societies for user...");
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Find all societies where user is admin or member
    const societies = await Society.find({
      $or: [{ admins: user_id }, { members: user_id }],
    })
      .populate("members", "name email role phone")
      .populate("admins", "name email role phone");

      console.log("🔍 Societies for user:", societies);
    if (!societies || societies.length === 0) {
      return res
        .status(404)
        .json({ message: "No societies found for this user." });
    }

    return res.status(200).json({
      success: true,
      result: societies,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all members and admins of a specific society
export const getSocietyMembers = async (req, res) => {
  try {
    const { societyId } = req.params; // society ID URL se

    if (!societyId) {
      return res.status(400).json({ message: "Society ID is required." });
    }

    const society = await Society.findById(societyId)
      .populate("members", "name email role phone") // select fields
      .populate("admins", "name email role phone");

    if (!society) {
      return res.status(404).json({ message: "Society not found." });
    }

    return res.status(200).json({
      success: true,
      society_id: society._id,
      name: society.name,
      members: society.members, // all members including admins
      admins: society.admins, // all admins
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔹 Ensure user is linked to a society
    if (!user.society_id) {
      return res
        .status(400)
        .json({ message: "User is not associated with any society" });
    }

    // 🔹 Find society by user’s society_id
    const society = await Society.findById(user.society_id);
    if (!society) return res.status(404).json({ message: "Society not found" });

    // 🔹 Check if user is admin of that society
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
      .json({ message: "Society updated successfully", data: updatedSociety });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
