import Apartment from "../models/Apartment.js";

export const createApartment = async (req, res) => {
  try {
    const { society_id, apartment_name, floor, block } = req.body;

    const apartment = new Apartment({
      society_id,
      apartment_name,
      floor,
      block,
    });
    await apartment.save();

    res.status(201).json({ success: true, message: "Apartment created successfully.", result: apartment });
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
