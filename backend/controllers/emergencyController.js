import EmergencyContact from '../models/EmergencyContact.js';
import Society from '../models/Society.js';

const DEFAULT_CONTACTS = [
  { name: 'Police', number: '15', category: 'police', is_default: true },
  { name: 'Edhi Ambulance', number: '115', category: 'ambulance', is_default: true },
  { name: 'Chippa Ambulance', number: '1020', category: 'ambulance', is_default: true },
  { name: 'Rescue', number: '1122', category: 'rescue', is_default: true },
  { name: 'Fire Brigade', number: '16', category: 'fire', is_default: true },
];

export const getEmergencyContacts = async (req, res) => {
  try {
    const { societyId } = req.params;
    let contacts = await EmergencyContact.find({ society_id: societyId }).sort({ is_default: -1, category: 1, createdAt: 1 });

    // Auto-seed defaults if society has none
    if (contacts.length === 0) {
      const seeded = await EmergencyContact.insertMany(
        DEFAULT_CONTACTS.map(c => ({ ...c, society_id: societyId }))
      );
      contacts = seeded;
    }

    return res.json({ success: true, result: contacts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createEmergencyContact = async (req, res) => {
  try {
    const { societyId } = req.params;
    const society = await Society.findById(societyId);
    const isAdmin = society?.admins?.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Admins only.' });

    const { name, number, category } = req.body;
    if (!name || !number) return res.status(400).json({ success: false, message: 'Name and number are required.' });

    const contact = await EmergencyContact.create({ society_id: societyId, name, number, category: category || 'other' });
    return res.status(201).json({ success: true, result: contact });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await EmergencyContact.findById(id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    const society = await Society.findById(contact.society_id);
    const isAdmin = society?.admins?.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Admins only.' });

    const { name, number, category } = req.body;
    if (name) contact.name = name;
    if (number) contact.number = number;
    if (category) contact.category = category;
    await contact.save();

    return res.json({ success: true, result: contact });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await EmergencyContact.findById(id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    const society = await Society.findById(contact.society_id);
    const isAdmin = society?.admins?.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Admins only.' });

    await contact.deleteOne();
    return res.json({ success: true, message: 'Contact deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
