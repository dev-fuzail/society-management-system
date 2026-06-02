# Election Winner Testing Ideas

## 1) Update the DB end time (manual)
- In MongoDB, set the target election `end_date`/`end_time` to a past timestamp.
- Trigger whatever scheduler or endpoint recalculates results (if available).
- Verify that:
  - votes are counted correctly,
  - winner(s) are set,
  - announcement + notification records are created.

## 2) Create a short-lived election (API/UI)
- Create an election that ends in 1-2 minutes.
- Cast votes from multiple users.
- Wait for the end time, then verify automatic result processing.

## 3) Force a tie (manual)
- In the votes collection, insert votes to make two candidates equal.
- Trigger the result calculation.
- Verify tie-handling rules (document the expected behavior).

## 4) Re-run result calculation (idempotency)
- Trigger the result calculation twice.
- Ensure the winner and announcements do not duplicate.

## 5) Partial data edge cases
- Election with zero votes.
- Election with a single candidate.
- Invalid or deleted candidate referenced by a vote.

## 6) Notifications validation
- Confirm a notification record is created for each resident.
- Confirm real-time notification is delivered via Socket.IO.
- Confirm push notification is sent when offline.
