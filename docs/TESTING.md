# Testing Guide

This is a comprehensive testing guide for the Preferred Solutions Transport platform.

## Test Users Setup

Before testing, you need to create master test users for each role.

### Step 1: Create Auth Users in Supabase
1.  Go to your Supabase project dashboard → **Authentication** → **Users**.
2.  Click **Add user** and create the following four users. **Use these exact emails**.
    -   `admin@test.preferredsolutions`
    -   `dispatcher@test.preferredsolutions`
    -   `driver@test.preferredsolutions`
    -   `customer@test.preferredsolutions`
3.  For each user, set a password and check the **"Auto Confirm"** box.

### Step 2: Run the Test Data Seed Script
1.  Go to the **SQL Editor** in your Supabase dashboard.
2.  Open the file `supabase/seeds/001_test_users.sql` from the repository.
3.  Copy the entire contents of the file, paste it into the SQL Editor, and click **Run**.

This script will create the necessary user records, drivers, customers, and sample orders, linking them to the auth users you created.

## Testing by Role

### Admin Dashboard Testing (`/admin`)
-   Log in as `admin@test.preferredsolutions`.
-   Verify you can see system statistics and health status.
-   Check that you can view and manage users, drivers, and all orders.

### Dispatcher Dashboard Testing (`/dispatcher`)
-   Log in as `dispatcher@test.preferredsolutions`.
-   Verify you can see the dispatch queue with "ReadyForDispatch" orders.
-   Test assigning a driver to an order.
-   Check the fleet map for driver locations.

### Driver Interface Testing (`/driver`)
-   Log in as `driver@test.preferredsolutions`.
-   Verify you only see orders assigned to you.
-   Test the order status update flow (Accepted → PickedUp → InTransit → Delivered).
-   Test the proof of delivery capture (photo and signature).

### Customer Dashboard Testing (`/customer/dashboard`)
-   Log in as `customer@test.preferredsolutions`.
-   Verify you only see your own orders.
-   Test the live tracking link for an active order.
-   Check the payment history.

## Integration Testing

-   **HubSpot**: Verify that a deal is created in HubSpot after a payment is made. Test the manual "Sync Now" button in the dispatcher dashboard.
-   **Stripe**: Test the full payment flow using a test card. Verify the order status is updated after payment and that the transaction appears in the customer's payment history.
-   **Google Maps**: Check that address autocomplete works on the quote form and that maps render correctly on the fleet and tracking pages.

## End-to-End User Flows

Test the complete customer journey:
1.  A customer requests a quote and pays for it.
2.  The order appears in the dispatcher queue.
3.  The dispatcher assigns a driver.
4.  The driver accepts and completes the delivery, capturing proof of delivery.
5.  The customer tracks the delivery in real-time and views the proof of delivery afterward.

## Authentication Testing Checklist

Use this matrix to verify every critical authentication flow across environments and roles.

| # | Flow | Role | Local (`localhost`) | Preview (`*.vercel.app`) | Production |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Email/Password **Signup** | Customer | ☐ | ☐ | ☐ |
| 2 | Email/Password **Signup** | Driver | ☐ | ☐ | ☐ |
| 3 | Email **Verification Link** | Any | ☐ | ☐ | ☐ |
| 4 | Email/Password **Sign-in** | All Roles | ☐ | ☐ | ☐ |
| 5 | **Google OAuth Signup** | All Roles | ☐ | ☐ | ☐ |
| 6 | **Google OAuth Sign-in** | Any existing | ☐ | ☐ | ☐ |
| 7 | **Password Reset Link** | Any | ☐ | ☐ | ☐ |
| 8 | **Middleware Access** | All Roles | ☐ | ☐ | ☐ |

## Role-Based Data Access Testing

Verify that each user role sees only the appropriate data, especially the filtered HubSpot metadata.

-   **Driver/Customer**: Should only see "Special Delivery Instructions" from the HubSpot metadata.
-   **Dispatcher**: Should see instructions, recurring frequency, and rush request status.
-   **Admin**: Should see all HubSpot metadata unfiltered.

Test this by logging in as each role and inspecting the order details in the UI, or by querying the `/api/orders/unified` endpoint which should return role-filtered data.
