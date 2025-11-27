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

    res.status(201).json(apartment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApartmentsBySociety = async (req, res) => {
  try {
    const { society_id } = req.query;
    const apartments = await Apartment.find({ society_id });
    res.json(apartments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
