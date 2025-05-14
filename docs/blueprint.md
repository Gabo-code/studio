# **App Name**: Jumbo Dispatch Tracker

## Core Features:

- Driver Check-in: Driver check-in: Driver enters the queue, sharing location (Leaflet map enabled within 50m radius) and taking a selfie. System generates and stores a persistent ID.
- Coordinator Checkout: Coordinator checkout: Coordinators mark driver departures, logging the departure time, bag count, destination commune, and removing the driver from the queue.
- Fraud Detection: Anti-fraud System: Detects and flags duplicate driver names with different persistent IDs, or duplicate IDs with different names, alerting administrators to potential issues. Uses persistent ID stored in local storage.
- Order List: Driver App Home Page: Displays the drivers remaining orders, estimated distance to each delivery, and any special notes about a delivery (ie: access codes)
- Admin Dashboard: Admin panel: Generate reports, view daily/weekly driver rankings. Also to maintain driver records.

## Style Guidelines:

- Primary color: Jumbo's brand primary color.
- Secondary color: Light grey for backgrounds and subtle contrasts.
- Accent: Teal (#008080) for interactive elements and calls to action.
- Clean, sans-serif font for readability.
- Simple and clear icons for navigation and status indicators.
- Mobile-first responsive design for accessibility on driver devices.