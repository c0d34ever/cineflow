# Authentication Architecture Issue

## Current Setup (Problematic)

**All users** (regular users AND admins) currently authenticate through the **Admin API**:
- Frontend → `https://cineflow.youtilitybox.com/admin-api/auth/login`
- Routes to → Admin service (port 5001)
- Admin API handles:
  - ✅ Authentication (login/register) - **Used by ALL users**
  - ✅ Admin operations (user management, stats) - **Admin only**

## The Problem

1. **Naming confusion**: "Admin API" suggests admin-only, but it handles all user auth
2. **Architectural mixing**: Auth service mixed with admin operations
3. **Scalability**: All auth traffic goes through admin service
4. **Separation of concerns**: Auth should be separate from admin features

## Recommended Architecture

### Option 1: Move Auth to Main Backend (Recommended)
- **Main Backend API (port 5000)**:**
  - Authentication (login/register/getMe) - **All users**
  - Regular user operations (projects, scenes, etc.) - **All users**
  
- **Admin API (port 5001)**:**
  - Admin-only operations (user management, stats, etc.) - **Admin only**

### Option 2: Keep Current (Simpler, but less ideal)
- Keep auth in Admin API
- Rename "Admin API" to "Auth & Admin API" for clarity
- Accept that it's a mixed service

## Recommendation

**Move authentication to the main backend API** for better separation of concerns.

