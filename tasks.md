# Society Management System - Feature Implementation Guide

**Tech Stack:** Node.js (Express), React Native (Expo), MongoDB (Mongoose)
**Architecture Context:** REST API, Role-Based Access Control (RBAC)

## 1. Committee Elections & Role Assignment

### Backend
* **Models:**
    * `Election`: `{ title, startDate, endDate, status }`
    * `Candidate`: `{ electionId, userId, manifesto }`
    * `Vote`: `{ electionId, candidateId, userId }` (Enforce unique compound index on `[electionId, userId]`)
* **API Routes:**
    * `POST /api/elections/candidates`: (Admin) Create election candidates.
    * `POST /api/elections/vote`: (Resident) Cast vote. Transactional logic required to ensure one vote per resident per election.
    * `PATCH /api/users/roles`: (Admin) Assign committee roles (promote `Resident` to `SocietyAdmin` or `CommitteeMember`).

### Frontend
* **Admin Views:** Election management dashboard (create/close elections, add candidates). Committee assignment table (select users and update roles).
* **Resident Views:** Active election dashboard, candidate profiles, secure voting interface (hide/disable after voting).

---

## 2. Service Providers & Verified Reviews

### Backend
* **Models:**
    * `ServiceProvider`: `{ name, category, contact, averageRating }`
    * `ServiceBooking`: `{ providerId, userId, status: ['PENDING', 'COMPLETED', 'CANCELLED'], date }`
    * `Review`: `{ providerId, userId, rating, comment }`
* **API Routes:**
    * `POST /api/providers`: (Admin) Add new service providers.
    * `POST /api/bookings`: (Resident) Book a service provider.
    * `PATCH /api/bookings/:id/status`: (Admin/Provider) Mark booking as completed.
    * `POST /api/providers/:id/reviews`: (Resident) Add review. **Middleware Rule:** Verify `ServiceBooking` exists for this `userId` + `providerId` with status `COMPLETED`.

### Frontend
* **Admin Views:** Provider management CRUD. Service booking tracking.
* **Resident Views:** Provider directory. Booking interface. "My Bookings" page with a conditional "Leave Review" button (only visible if status is `COMPLETED` and no existing review).

---

## 3. Amenities Management & Flexible Pricing

### Backend
* **Models:**
    * `Amenity`: Polymorphic schema approach for flexibility.
        `{ name, type: ['PER_USER', 'FLAT_EVENT'], basePrice, maxCapacity }`
    * `Booking`: 
        `{ amenityId, userId, startTime, endTime, status, calculatedPrice, guestCount }`
* **Pricing Logic (Middleware/Service):**
    * If `type === 'PER_USER'` (e.g., Gym): `calculatedPrice = basePrice * guestCount`.
    * If `type === 'FLAT_EVENT'` (e.g., Hall): `calculatedPrice = basePrice * (duration in hours/days)`.
* **API Routes:**
    * `POST /api/amenities`: (Admin) Define amenities and pricing types.
    * `POST /api/amenities/bookings`: (Resident) Request booking. Must include conflict validation (check overlapping `startTime` and `endTime`).

### Frontend
* **Admin Views:** Integration of a calendar library (e.g., `react-big-calendar`) fetching from `/api/amenities/bookings`. Visual indicators for pending vs. approved bookings.
* **Resident Views:** Amenity selection, dynamic pricing calculator based on amenity `type` and input parameters (guests vs. hours), and a booking submission form.