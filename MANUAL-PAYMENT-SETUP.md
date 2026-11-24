# Manual Maintenance Payment Confirmation

Razorpay is not required. Admins and managers can record an offline payment from Admin → Payments.

## How it works
1. Open Admin → Payments.
2. On an unpaid maintenance record, click **Mark as Paid**.
3. Confirm that the money was actually received.
4. Enter `cash`, `upi`, or `bank_transfer`.
5. Optionally enter a transaction/reference number.
6. The maintenance record is marked paid and a PaymentLog audit record is created.

The API endpoint is `PATCH /api/maintenance/:id/mark-paid`; it requires an authenticated `admin` or `manager` account. A duplicate confirmation is rejected.

## Run
Backend: `cd server && npm install && npm run dev`
Frontend: `cd client && npm install && npm run dev`

Configure `server/.env.local` using `server/.env.example`. Do not commit or share real credentials.
