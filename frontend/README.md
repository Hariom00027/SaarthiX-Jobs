# Saarthix Jobs - React Frontend

A modern React frontend for the Saarthix Jobs portal with RapidAPI integration and Google OAuth authentication.

## Features

- 🔍 **Job Search** - Search jobs using RapidAPI JSearch
- 📋 **Job Details** - View detailed job information
- 🔐 **Google Authentication** - Login with Google OAuth
- 🚫 **Protected Apply** - Apply to jobs only when logged in
- 📱 **Responsive Design** - Works on all devices

## Setup Instructions

### 1. Install Dependencies

```bash
cd jobs/frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Backend Requirements

Make sure your Spring Boot backend is running on `http://localhost:8080` before using the frontend.

## API Integration

The frontend uses RapidAPI JSearch API for job listings:

- **Search Jobs**: `/search` endpoint
- **Job Details**: `/job-details` endpoint
- **Estimated Salaries**: `/estimated-salary` endpoint (available but not used in UI yet)

API credentials are configured in `src/api/jobApi.js`.

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirects to Spring Boot OAuth endpoint
3. After successful login, redirects back to frontend
4. Frontend checks auth status via `/api/auth/me`
5. Apply buttons are enabled when authenticated

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── authApi.js      # Authentication API calls
│   │   └── jobApi.js        # RapidAPI job search calls
│   ├── components/
│   │   ├── Header.jsx       # Header with login/logout
│   │   └── JobList.jsx      # Job listing and search
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind CSS imports
├── index.html               # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json            # Dependencies

```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Variables

If you need to change the backend URL, update it in:
- `src/api/authApi.js` - `BACKEND_URL` constant
- `src/api/jobApi.js` - API endpoints (if using proxy)

## Troubleshooting

### CORS Issues
Make sure your backend CORS configuration allows `http://localhost:5173`

### Authentication Not Working
1. Check that backend is running on port 8080
2. Verify OAuth redirect URL in backend config matches frontend URL
3. Check browser console for errors

### Jobs Not Loading
1. Verify RapidAPI key is valid in `src/api/jobApi.js`
2. Check network tab for API errors
3. Ensure backend `/api/jobs` endpoint is accessible
