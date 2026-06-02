# Updated Notification & Maintenance Requirements

## 1. Real-Time & Push Notification System

### Objective

Implement a hybrid notification system using Socket.IO for real-time updates and Firebase Cloud Messaging (FCM) for background and offline push notifications.

### Architecture

#### Socket.IO

Used for:

* Real-time announcements
* Election updates
* Payment status updates
* Visitor arrival notifications
* In-app notification center updates

#### Firebase Cloud Messaging (FCM)

Used for:

* Notifications when app is in background
* Notifications when app is closed
* Lock screen notifications
* Scheduled reminders
* Critical society updates

### Requirements

#### Notification Delivery

* Store FCM device tokens for all mobile users.
* Maintain Socket.IO connections for active users.
* Send notifications through:

  * Socket.IO when user is online.
  * FCM when user is offline or app is backgrounded.
  * Both channels when required.

#### Notification Types

* Announcement notifications
* Election notifications
* Maintenance reminders
* Payment notifications
* Visitor notifications
* General society updates

#### Notification Center

* Store all notifications in database.
* Support:

  * Read/Unread status
  * Notification history
  * Pagination
  * Filtering by category

### Acceptance Criteria

* Online users receive instant Socket.IO notifications.
* Offline users receive FCM push notifications.
* All notifications are available inside the application notification center.

---

## 2. Automatic Election Result Announcement

### Objective

Automatically publish election results and notify all residents when voting concludes.

### Requirements

#### Election Processing

* Automatically trigger result calculation after election end time.
* Calculate total votes for each candidate.
* Determine winner(s).
* Handle tie scenarios based on configured business rules.

#### Announcement Creation

Generate announcement containing:

* Election name
* Winner name
* Total votes received
* Election completion date
* Additional remarks (optional)

#### Notification Delivery

* Broadcast real-time update via Socket.IO.
* Send push notification via FCM.
* Save notification record in database.
* Add result to announcements module.

### Acceptance Criteria

* Results are generated automatically.
* Residents receive notifications even if application is closed.

---

## 3. Announcement Notification Integration

### Objective

Automatically notify residents whenever a new announcement is published.

### Requirements

#### Trigger Events

* New announcement created.
* Announcement updated and marked as important.
* Emergency announcement published.

#### Notification Content

* Title
* Short description
* Deep link to announcement details page

#### Delivery

* Socket.IO for online users.
* FCM for offline users.
* Store notification record in database.

### Acceptance Criteria

* Every announcement generates a notification event.
* Residents can directly open announcement details from notification.

---

## 4. Society Maintenance Configuration Management

### Objective

Allow society administrators to configure maintenance fees and billing settings.

### Requirements

#### Society Settings

Add maintenance configuration section in Society Management.

Admin can:

* Create maintenance fee amount.
* Update maintenance fee amount.
* Configure currency.
* Configure due date.
* Configure grace period.
* Configure late payment charges (optional).
* Configure effective date.

#### Audit Tracking

Maintain history of:

* Previous amount
* Updated amount
* Change date
* Administrator who made changes

### Acceptance Criteria

* Each society can maintain independent maintenance settings.
* Historical fee changes are preserved.

---

## 5. Automated Monthly Maintenance Billing & Reminder System

### Objective

Automatically remind residents to pay maintenance charges every month.

### Requirements

#### Scheduled Job

Create Cron Job that runs on the 1st day of every month.

#### Billing Generation

For each society:

* Generate monthly maintenance invoice.
* Calculate applicable maintenance amount.
* Create payment record.

#### Notification Delivery

Send:

* Socket.IO notification to online users.
* FCM notification to offline users.

Notification should contain:

* Invoice amount
* Due date
* Payment link
* Society name

#### Duplicate Prevention

* Ensure invoice generation occurs only once per month.
* Prevent duplicate reminders.

### Acceptance Criteria

* Monthly invoices are automatically generated.
* Residents receive reminders on the first day of every month.

---

## 6. Dynamic Stripe Integration Per Society

### Objective

Support independent Stripe payment processing for each society.

### Requirements

#### Society-Level Stripe Configuration

Each society should have:

* Stripe Publishable Key
* Stripe Secret Key
* Stripe Webhook Secret
* Stripe Connected Account ID (optional)

#### Payment Processing

Use society-specific Stripe configuration for:

* Maintenance payments
* Additional society charges
* Future billable services

#### Transaction Management

Store:

* Transaction ID
* Stripe Payment Intent ID
* Amount
* Currency
* Payment Status
* Resident ID
* Society ID
* Invoice ID
* Payment Date

#### Webhook Handling

Handle:

* payment_intent.succeeded
* payment_intent.failed
* charge.refunded
* invoice.paid
* invoice.payment_failed

#### Receipts

Generate:

* Digital receipt
* Downloadable invoice
* Payment confirmation notification

### Acceptance Criteria

* Each society uses its own Stripe account.
* Financial records remain isolated between societies.

---

## 7. Notification Preferences

### Requirements

Residents can enable/disable notifications for:

* Announcements
* Elections
* Maintenance Reminders
* Visitor Notifications
* Payment Notifications
* General Society Updates

### Acceptance Criteria

* Notification preferences are respected across both Socket.IO and FCM channels.

---

## 8. Notification Analytics Dashboard (Admin)

### Requirements

Provide admin dashboard showing:

* Total notifications sent
* Delivered notifications
* Failed notifications
* Read notifications
* Notification type breakdown

### Acceptance Criteria

* Admin can track notification delivery performance.

---

## 9. Monthly Maintenance Invoice Management

### Requirements

Automatically generate monthly invoices.

Invoice statuses:

* Pending
* Paid
* Partially Paid
* Overdue
* Cancelled

Support:

* Invoice PDF generation
* Invoice download
* Invoice history

### Acceptance Criteria

* Residents can view current and historical invoices.

---

## 10. Future Scalability Requirements

System should support:

* Multiple societies
* Thousands of residents
* Multiple Stripe accounts
* Real-time Socket.IO communication
* Background FCM notifications
* Scheduled jobs and automated billing

### Technical Stack

* Node.js Backend
* MongoDB
* Socket.IO
* Firebase Cloud Messaging (FCM)
* Stripe
* Cron Jobs / Scheduled Tasks
