import mongoose from "mongoose";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";
import Vote from "../models/Vote.js";
import User from "../models/User.js";
import { calculateElectionResults, publishElectionResults } from "../services/electionResultService.js";

const requireRole = (req, res, roles) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  return true;
};

// Create a new election (Admin only)
export const createElection = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { title, start_date, end_date, society_id } = req.body;
    const election = new Election({ title, start_date, end_date, society_id });
    await election.save();
    res.status(201).json({ success: true, message: "Election created successfully", result: election });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle election status (Admin only)
export const toggleElectionStatus = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { id } = req.params;
    const { status } = req.body; // "ongoing" or "completed"

    if (!["ongoing", "completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid election status" });
    }

    const election = await Election.findByIdAndUpdate(id, { status }, { new: true });

    if (!election) {
      return res.status(404).json({ success: false, message: "Election not found" });
    }

    if (status === "completed" && !election.result_published) {
      const publication = await publishElectionResults(election, req.io);
      return res.status(200).json({
        success: true,
        message: "Election completed and results published",
        result: publication?.election || election,
      });
    }

    res.status(200).json({ success: true, message: `Election marked as ${status}`, result: election });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add candidate to election (Admin only)
export const addCandidate = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { election_id, user_id, manifesto } = req.body;

    const election = await Election.findById(election_id);
    if (!election) {
      return res.status(404).json({ success: false, message: "Election not found" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.society_id || user.society_id.toString() !== election.society_id.toString()) {
      return res.status(400).json({ success: false, message: "Candidate must belong to the same society as the election." });
    }

    const candidate = new Candidate({ election_id, user_id, manifesto });
    await candidate.save();
    res.status(201).json({ success: true, message: "Candidate added successfully", result: candidate });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "This user is already assigned as a candidate for this election." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all elections for a society
export const getElections = async (req, res) => {
  try {
    const { society_id } = req.query;
    const elections = await Election.find({ society_id }).sort({ created_at: -1 });
    res.status(200).json({ success: true, result: elections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get election details including candidates
export const getElectionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });

    const candidates = await Candidate.find({ election_id: id }).populate("user_id", "name email avatar");
    res.status(200).json({ success: true, result: { election, candidates } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cast a vote (Resident or Admin)
export const castVote = async (req, res) => {
  try {
    if (!requireRole(req, res, ["resident", "admin"])) return;
    const { election_id, candidate_id } = req.body;
    const voter_id = req.user.id;

    // Check if election is ongoing
    const election = await Election.findById(election_id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });
    if (election.status !== "ongoing") return res.status(400).json({ success: false, message: "Election is not ongoing" });

    const now = new Date();
    if (now < election.start_date || now > election.end_date) {
        return res.status(400).json({ success: false, message: "Election is not currently active based on dates" });
    }

    const candidate = await Candidate.findOne({ _id: candidate_id, election_id });
    if (!candidate) {
      return res.status(400).json({ success: false, message: "Candidate does not belong to this election" });
    }

    const vote = new Vote({ election_id, voter_id, candidate_id });
    await vote.save();

    res.status(201).json({ success: true, message: "Vote cast successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "You have already cast your vote for this election" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get election results (Admin/Resident)
export const getElectionResults = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid election id" });
    }

    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ success: false, message: "Election not found" });
    }

    if (election.result_published) {
      return res.status(200).json({
        success: true,
        result: election.results,
        winners: election.winners,
        is_tie: election.is_tie,
        published_at: election.result_published_at,
      });
    }

    const calculated = await calculateElectionResults(new mongoose.Types.ObjectId(id));

    res.status(200).json({
      success: true,
      result: calculated.results,
      winners: calculated.winners,
      is_tie: calculated.is_tie,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Force-complete an election instantly (bypasses end_date — for testing)
export const forceCompleteElection = async (req, res) => {
  try {
    const { id } = req.params;
    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found." });

    election.status = "completed";
    election.end_date = new Date();
    await election.save();

    const publication = await publishElectionResults(election, req.io);
    return res.status(200).json({
      success: true,
      message: "Election force-completed and results published.",
      result: publication?.election || election,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
    try {
    if (!requireRole(req, res, ["admin"])) return;
        const { user_id, role } = req.body;
    if (!["admin", "committee_member"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

    const currentUser = await User.findById(user_id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (currentUser.role !== "resident") {
      return res.status(400).json({ success: false, message: "Only resident users can be promoted" });
    }

        const user = await User.findByIdAndUpdate(user_id, { role }, { new: true });
        res.status(200).json({ success: true, message: "User role updated successfully", result: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
