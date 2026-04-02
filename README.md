# Travel Nest

Travel Nest is an AI-powered travel planning platform for two real-world use cases:

- business travelers who want to use free time between meetings effectively
- leisure travelers who want a fast, personalized local itinerary

The project combines schedule understanding, point-of-interest discovery, map routing, and user preferences to generate practical city plans from limited time windows.

## Problem Statement

Travelers often lose valuable time because planning is fragmented.

- Business travelers may have short gaps between meetings but no quick way to turn those gaps into meaningful local plans.
- Leisure travelers may know their location and available time, but still spend too long deciding where to go.
- Existing tools usually solve only one part of the journey: maps, recommendations, or notes, but not the full planning workflow.

## Solution

Travel Nest solves this by creating context-aware itineraries from real user inputs.

- In business mode, users can upload a schedule PDF, paste schedule text, or use both.
- In leisure mode, users can plan from current location or a chosen city/area.
- The system analyzes time, place, interests, transport preference, and budget style.
- It then generates a route-backed itinerary with a map, timeline, must-try suggestions, export/share options, and trip notes.

## What The Project Does

Travel Nest currently supports:

- secure sign-in with Clerk
- business travel planning from PDF or pasted schedule text
- leisure travel planning from geolocation or manual location
- custom available-time input
- transportation mode preferences
- expense mode selection
- nearby place discovery
- route-aware itinerary generation
- interactive itinerary map with marked stops
- itinerary timeline view
- must-try local recommendations when meaningful matches exist
- trip sharing via link
- offline export
- trip notes and journal with edit/delete support
- saved trip persistence with MongoDB

## End-to-End Workflow

### 1. User Authentication

The user opens the app, signs in, and enters the main planning flow.

### 2. Mode Selection

The user chooses one of two modes:

- `Business`
- `Leisure`

### 3. Business Planning Flow

The business workflow is designed for users with meetings or scheduled events.

- Upload a schedule PDF
- Or paste schedule text manually
- Or use both together for better extraction reliability
- Add a base location or city
- Select interests
- Choose transport mode
- Choose expense mode

The backend then:

- extracts schedule text
- identifies busy windows
- computes free slots
- determines a usable location anchor
- fetches nearby POIs
- builds a feasible itinerary for the available time

### 4. Leisure Planning Flow

The leisure workflow is designed for faster city exploration.

- Use current location or enter a place manually
- Choose interests like food, cafes, sightseeing, culture, or shopping
- Set available time with custom duration
- Choose transport mode
- Choose expense mode

The system then builds a personalized itinerary around the selected place and time window.

### 5. Itinerary Dashboard

The generated itinerary includes:

- a clear map with route context and marked stops
- an ordered trip timeline
- refine and regenerate actions
- must-try area suggestions when good matches exist
- trip share link
- offline export
- notes and journal support

### 6. Saved Trips and Reuse

Saved trips can be reopened later, and supporting trip details such as journal content and preferences are restored.

## Why Travel Nest Is Useful

Travel Nest is useful because it turns limited travel time into a guided experience instead of leaving the user to manually combine maps, notes, and search results.

It is especially strong for:

- meeting-gap exploration
- short city visits
- quick local planning
- personalized route building
- combining AI reasoning with map-based practicality

## Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS v4
- React Router
- Clerk React
- Axios
- Framer Motion
- Leaflet
- React Leaflet
- Lucide React

### Backend

- Node.js
- Express 5
- Mongoose
- Multer
- pdf-parse
- Axios
- Clerk Express and Clerk Backend
- Google GenAI SDK

### Database

- MongoDB

### External Services and APIs

- Gemini API for extraction and itinerary refinement
- Overpass API for nearby POI discovery
- OSRM for route and travel-time checks
- Nominatim for geocoding
- Browser Geolocation API for user location in leisure flow

## High-Level Architecture

The project uses a full-stack workspace structure:

```text
travel-nest/
|-- client/     # React + Vite frontend
|-- server/     # Express + MongoDB backend
|-- package.json
`-- README.md
```

### Client Responsibilities

The frontend handles:

- authentication-aware routing
- business and leisure setup forms
- planner state management
- itinerary rendering
- map visualization
- journaling, sharing, and export interactions

Important frontend areas:

- [`client/src/pages`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/client/src/pages)
- [`client/src/components`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/client/src/components)
- [`client/src/context/PlannerContext.jsx`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/client/src/context/PlannerContext.jsx)
- [`client/src/lib/api.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/client/src/lib/api.js)

### Server Responsibilities

The backend handles:

- auth-aware API access
- PDF upload and parsing
- schedule extraction
- geocoding and POI lookup
- route checking
- itinerary synthesis
- trip persistence
- journal persistence

Important backend areas:

- [`server/server.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/server.js)
- [`server/controllers`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/controllers)
- [`server/services`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/services)
- [`server/models/Trip.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/models/Trip.js)

## Project Structure

```text
travel-nest/
|-- client/
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx
|       |-- main.jsx
|       |-- index.css
|       |-- components/
|       |-- context/
|       |-- lib/
|       `-- pages/
|-- server/
|   |-- package.json
|   |-- server.js
|   |-- config/
|   |-- controllers/
|   |-- middlewares/
|   |-- models/
|   |-- routes/
|   |-- services/
|   `-- utils/
|-- package.json
`-- README.md
```

## Frontend Routes

Current frontend pages include:

- `/` - Landing page
- `/auth` - Authentication page
- `/mode` - Mode selection
- `/business-setup` - Business planning input flow
- `/leisure-setup` - Leisure planning input flow
- `/itinerary` - Itinerary dashboard
- `/dashboard` - Saved trip dashboard

## Backend API Overview

The exact route mounting is handled in the server, but the main backend responsibilities are:

- schedule extraction for business mode
- POI fetching for location-based discovery
- itinerary generation and optimization
- saved trip retrieval and updates
- journal/note persistence
- auth-related user flow support

Main route groups:

- [`server/routes/scheduleRoutes.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/routes/scheduleRoutes.js)
- [`server/routes/poiRoutes.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/routes/poiRoutes.js)
- [`server/routes/itineraryRoutes.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/routes/itineraryRoutes.js)
- [`server/routes/authRoutes.js`](/home/siddu/Desktop/FULL STACK/IdeaVerse/TravelNest-IdeaVerse/server/routes/authRoutes.js)

## Implementation Highlights

### Business Mode Implementation

Business mode works by combining document understanding with itinerary generation.

- User submits schedule PDF or pasted schedule text
- Server parses document text with `pdf-parse`
- AI-assisted extraction and fallback parsing identify meeting times
- Free slots are calculated
- Base area is geocoded
- Nearby places are discovered
- Route feasibility is considered
- Final itinerary is generated and optionally persisted

### Leisure Mode Implementation

Leisure mode is lighter and faster.

- User provides location
- User selects interests, time, transport mode, and expense mode
- Nearby places are fetched
- Candidate places are ranked and filtered
- An itinerary is created for the requested time window

### Itinerary Experience

The itinerary dashboard combines several layers:

- route and stop visualization on map
- stop-by-stop timeline
- must-try suggestions
- regenerate/refinement controls
- offline export
- share link
- trip journal

## Environment Variables

This project uses separate frontend and backend configuration.

### Server Environment

Create `server/.env` and add values like:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OSRM_API_URL=https://router.project-osrm.org
NOMINATIM_USER_AGENT=travel-nest/1.0 (your-email@example.com)
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Client Environment

Create `client/.env` and add:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:5000
```

Note:

- Keep real secrets out of version control.
- Replace any placeholder or example credentials with your own values.

## How To Run The Project

### 1. Install Dependencies

From the project root:

```bash
npm install
```

If needed, also install workspace dependencies explicitly:

```bash
npm install --workspace client
npm install --workspace server
```

### 2. Add Environment Variables

- Create `server/.env`
- Create `client/.env`
- Add the required keys shown above

### 3. Start Both Frontend and Backend

From the root:

```bash
npm run dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Express backend on `http://localhost:5000`

### 4. Run Only One Side If Needed

Frontend only:

```bash
npm run dev:client
```

Backend only:

```bash
npm run dev:server
```

### 5. Build The Frontend

```bash
npm run build
```

### 6. Run Lint

```bash
npm run lint
```

## Typical Demo Flow

If you want to show the project quickly:

1. Open the landing page and sign in.
2. Choose `Business` mode and upload a PDF or paste schedule text.
3. Add interests, transport preference, and expense mode.
4. Generate the itinerary.
5. Show the map, timeline, and must-try section.
6. Open trip journal and show add/edit/delete.
7. Show share link and offline export.
8. Return and show the `Leisure` flow with custom time input.

## Current Status

The project currently has a working end-to-end MVP with both business and leisure flows.

Implemented:

- routed frontend experience
- Clerk-authenticated flow
- PDF and text-based business schedule input
- leisure planner with custom time and preferences
- itinerary dashboard with map and timeline
- must-try local picks
- sharing and offline export
- expense and transport preferences
- trip journal with edit/delete
- MongoDB-backed saved trips

## Known Limitations

- The app depends on external APIs for some travel intelligence and routing behavior.
- Public/free APIs may have response limits or occasional inconsistencies.
- Some older backend files remain in the repository and are not part of the main active flow.
- Frontend build size can still be optimized further with code splitting.

## Future Enhancements

Planned or useful next additions include:

- opening-hours awareness
- multi-day itinerary support
- calendar integration
- hotel and stay anchor support
- live event discovery
- accessibility-focused preferences
- richer PDF export

## Summary

Travel Nest is a practical AI travel assistant built to help users make better use of limited time in a city. It connects schedule understanding, nearby discovery, routing logic, map visualization, and personalization into one full-stack product.
