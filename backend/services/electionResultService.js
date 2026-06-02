import Announcement from "../models/Announcement.js";
import Candidate from "../models/Candidate.js";
import Election from "../models/Election.js";
import User from "../models/User.js";
import Vote from "../models/Vote.js";
import { createAndSendNotification } from "./notificationService.js";

const PROCESS_INTERVAL_MS = 60 * 1000;

const getVoteCounts = async (electionId) => {
  const counts = await Vote.aggregate([
    { $match: { election_id: electionId } },
    { $group: { _id: "$candidate_id", count: { $sum: 1 } } },
  ]);

  return counts.reduce((map, item) => {
    map.set(item._id.toString(), item.count);
    return map;
  }, new Map());
};

export const calculateElectionResults = async (electionId) => {
  const candidates = await Candidate.find({ election_id: electionId })
    .populate("user_id", "name")
    .sort({ created_at: 1 });
  const voteCounts = await getVoteCounts(electionId);

  const results = candidates
    .map((candidate) => ({
      candidate_id: candidate._id,
      user_id: candidate.user_id?._id,
      candidate_name: candidate.user_id?.name || "Unknown candidate",
      votes: voteCounts.get(candidate._id.toString()) || 0,
    }))
    .sort((a, b) => b.votes - a.votes || a.candidate_name.localeCompare(b.candidate_name));

  const topVotes = results[0]?.votes ?? 0;
  const winners = topVotes > 0 ? results.filter((result) => result.votes === topVotes) : [];

  return {
    results,
    winners,
    is_tie: winners.length > 1,
  };
};

const getAnnouncementAuthorId = async (societyId) => {
  const author = await User.findOne({ society_id: societyId, role: "admin" }).select("_id")
    || await User.findOne({ society_id: societyId }).select("_id");

  return author?._id;
};

const buildResultCopy = (election, winners, completionDate) => {
  if (winners.length === 0) {
    return {
      title: `Election results: ${election.title}`,
      message: `${election.title} concluded on ${completionDate}. No winner was declared because no votes were cast.`,
      notificationMessage: `${election.title} has concluded. No winner was declared because no votes were cast.`,
    };
  }

  if (winners.length > 1) {
    const winnerNames = winners.map((winner) => winner.candidate_name).join(", ");
    return {
      title: `Election results: ${election.title}`,
      message: `${election.title} concluded on ${completionDate}. Tie result: ${winnerNames} each received ${winners[0].votes} vote(s).`,
      notificationMessage: `${election.title} ended in a tie: ${winnerNames}.`,
    };
  }

  const [winner] = winners;
  return {
    title: `Election results: ${election.title}`,
    message: `${election.title} concluded on ${completionDate}. Winner: ${winner.candidate_name} with ${winner.votes} vote(s).`,
    notificationMessage: `${winner.candidate_name} won ${election.title} with ${winner.votes} vote(s).`,
  };
};

export const publishElectionResults = async (electionOrId, io) => {
  const election = typeof electionOrId === "object"
    ? electionOrId
    : await Election.findById(electionOrId);

  if (!election || election.result_published) {
    return null;
  }

  const { results, winners, is_tie } = await calculateElectionResults(election._id);
  const publishedAt = new Date();
  const completionDate = publishedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const copy = buildResultCopy(election, winners, completionDate);
  const authorId = await getAnnouncementAuthorId(election.society_id);

  const announcementPayload = {
    society_id: election.society_id,
    title: copy.title,
    message: copy.message,
  };

  if (authorId) {
    announcementPayload.user_id = authorId;
  }

  const announcement = await Announcement.create(announcementPayload);

  const updatedElection = await Election.findOneAndUpdate(
    { _id: election._id, result_published: { $ne: true } },
    {
      status: "completed",
      result_published: true,
      result_published_at: publishedAt,
      results,
      winners,
      is_tie,
    },
    { new: true }
  );

  if (!updatedElection) {
    if (announcement) {
      await Announcement.findByIdAndDelete(announcement._id);
    }
    return null;
  }

  const residents = await User.find({
    society_id: election.society_id,
    role: "resident",
  }).select("_id");

  const data = {
    category: "election",
    electionId: election._id.toString(),
    announcementId: announcement?._id?.toString() || "",
    deepLink: `election-detail?id=${election._id.toString()}`,
  };

  const notification = await createAndSendNotification({
    io,
    userIds: residents.map((resident) => resident._id),
    societyId: election.society_id,
    type: "election_result",
    title: copy.title,
    message: copy.notificationMessage,
    data,
  });

  if (io) {
    io.to(`society_${election.society_id}`).emit("election:resultsPublished", {
      election: updatedElection,
      announcement,
    });
  }

  return { election: updatedElection, announcement, notification };
};

export const processExpiredElections = async (io) => {
  const expiredElections = await Election.find({
    status: "ongoing",
    end_date: { $lte: new Date() },
    result_published: { $ne: true },
  });

  const processed = [];

  for (const election of expiredElections) {
    try {
      const result = await publishElectionResults(election, io);
      if (result) {
        processed.push(result);
      }
    } catch (error) {
      console.error(`[ELECTION RESULTS] Failed for ${election._id}:`, error.message);
    }
  }

  return processed;
};

export const startElectionResultScheduler = (io) => {
  processExpiredElections(io).catch((error) => {
    console.error("[ELECTION RESULTS] Initial processing failed:", error.message);
  });

  return setInterval(() => {
    processExpiredElections(io).catch((error) => {
      console.error("[ELECTION RESULTS] Scheduled processing failed:", error.message);
    });
  }, PROCESS_INTERVAL_MS);
};
