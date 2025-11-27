import Society from '../models/Society.js';

export const createSociety = async (req, res) => {
  try {
    const { name, address } = req.body;
    const exists = await Society.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Society already exists' });

    const society = new Society({ name, address });
    await society.save();

    res.status(201).json(society);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSocieties = async (req, res) => {
  try {
    const societies = await Society.find();
    res.json(societies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
