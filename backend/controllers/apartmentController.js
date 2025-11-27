import Apartment from "../models/Apartment.js";

export const createApartment = async (req, res) => {
  console.log("Create Apartment Request Body:", req.body);
  try {
    const { apartment_name, floor, block } = req.body;
    const apartment = new Apartment({
      society_id: req.user.society_id,
      apartment_name,
      owned_by: req.user._id,
      floor,
      block,
    });
    await apartment.save();

    res.status(201).json({ success: true, message: "Apartment created successfully.", result: apartment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApartmentsByUser = async (req, res) => {
  console.log("Get Apartments By User ID:", req.user.id);
  try {
    const apartments = await Apartment.find({ owned_by: req.user.id });
    res.status(200).json({ success: true, message: "User apartments fetched successfully.", result: apartments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateApartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { apartment_name, floor, block } = req.body;

    const apartment = await Apartment.findById(id);
    if (!apartment) {
      return res.status(404).json({ success: false, message: "Apartment not found." });
    }

    // Ensure the user owns the apartment
    if (apartment.owned_by.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this apartment." });
    }

    const updatedApartment = await Apartment.findByIdAndUpdate(id, { apartment_name, floor, block }, { new: true });
    res.status(200).json({ success: true, message: "Apartment updated successfully.", result: updatedApartment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteApartment = async (req, res) => {
  try {
    const { id } = req.params;
    const apartment = await Apartment.findById(id);
    if (!apartment || apartment.owned_by.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized or apartment not found." });
    }
    await Apartment.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Apartment deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApartmentsBySociety = async (req, res) => {
  try {
    const { society_id } = req.query;
    const apartments = await Apartment.find({ society_id });
    res.status(200).json({ success: true, message: "Apartments fetched successfully.", result: apartments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyApartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting 'verified' or 'rejected'

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admins can perform this action." });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status provided." });
    }

    const apartment = await Apartment.findByIdAndUpdate(id, { status }, { new: true });
    res.status(200).json({ success: true, message: `Apartment status updated to ${status}.`, result: apartment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSocietyApartmentsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const apartments = await Apartment.find({ society_id: req.user.society_id })
      .populate('owned_by', 'name email')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, message: "Society apartments fetched for admin.", result: apartments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
