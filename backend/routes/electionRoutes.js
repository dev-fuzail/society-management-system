import express from "express";
import {
  createElection,
  toggleElectionStatus,
  addCandidate,
  getElections,
  getElectionDetails,
  castVote,
  getElectionResults,
  forceCompleteElection,
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

// Super-admin: instantly complete election for testing
router.post("/:id/force-complete", authMiddleware, forceCompleteElection);

export default router;
