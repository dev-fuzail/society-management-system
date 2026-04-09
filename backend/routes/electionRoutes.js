import express from "express";
import {
  createElection,
  toggleElectionStatus,
  addCandidate,
  getElections,
  getElectionDetails,
  castVote,
  getElectionResults,
  updateUserRole
} from "../controllers/electionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Election management
router.post("/", authMiddleware, createElection);
router.patch("/:id/status", authMiddleware, toggleElectionStatus);
router.post("/candidates", authMiddleware, addCandidate);
router.get("/", authMiddleware, getElections);
router.get("/:id", authMiddleware, getElectionDetails);
router.get("/:id/results", authMiddleware, getElectionResults);

// Voting
router.post("/vote", authMiddleware, castVote);

// User roles (related to committee assignment)
router.patch("/roles", authMiddleware, updateUserRole);

export default router;
