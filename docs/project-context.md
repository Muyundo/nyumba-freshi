# Copilot Instructions
You are helping build an MVP web app for booking domestic workers.
Follow the architecture defined below.
Keep everything simple and MVP-focused.

# Domestic Help Platform - MVP Context

## Overview
This is a web-based MVP platform connecting homeowners with domestic workers (cleaning and laundry services) in Nairobi. We will call it Nyumba Freshi

## Tech Stack
- Frontend: React
- Backend: Node.js + Express
- Database: MySQL
- Auth: JWT
- Password hashing: bcrypt

## User Roles
1. Homeowner
2. Worker (Service Provider)
3. System Administrator

## MVP Scope
Services:
- House Cleaning
- Laundry
- Both

Core Features:
- Register/Login (dynamic role selection)
- Worker profile creation
- Worker listing & filtering
- Booking system
- Accept/Reject booking
- Booking status tracking
- Rating system (later)

## Database Core Tables
- users
- worker_profiles
- worker_services
- bookings
- ratings

## Booking Status Flow
PENDING → ACCEPTED → COMPLETED
or
PENDING → REJECTED