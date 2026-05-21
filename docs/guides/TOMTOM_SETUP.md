# TomTom Maps Integration Guide

## Overview

FlowGO now uses TomTom Maps for real-time traffic visualization on both the admin dashboard and public view pages. TomTom provides:

- **Real-time Traffic Flow**: Live traffic conditions with color-coded flow indicators
- **Traffic Incidents**: Real-time accident and incident reporting
- **High-quality Maps**: Detailed street-level mapping
- **Dark Theme Support**: Matches FlowGO's dark theme design

## Setup Instructions

### 1. Get TomTom API Key

1. Visit [TomTom Developer Portal](https://developer.tomtom.com)
2. Sign up for a free account (or log in if you already have one)
3. Create a new application/project
4. Copy your API key

### 2. Configure Environment Variables

Create or update your `.env.local` file in the `frontend` directory:

```env
# TomTom API Key (use either variable name)
VITE_TOMTOM_API_KEY=your_api_key_here
# OR
VITE_TOMTOM_KEY=your_api_key_here
```

### 3. Features Enabled

The TomTom integration automatically enables:

- **Traffic Flow Visualization**: Color-coded roads showing traffic speed
  - Green: Free flow
  - Yellow: Slow traffic
  - Red: Congested/stopped traffic

- **Traffic Incidents**: Real-time markers for accidents, road closures, and incidents

- **Custom Markers**: 
  - Traffic signal markers (green/red/yellow based on status)
  - Vehicle markers (for admin view)
  - Green corridor paths (for admin view)

### 4. Usage

The TomTom map is automatically used in:

- **Admin Dashboard**: Full-featured map with all markers and green corridors
- **Public View**: Public-facing map with traffic signals and real-time traffic

### 5. API Limits

TomTom's free tier includes:
- 2,500 requests/day
- 15,000 requests/month

For production use, consider upgrading to a paid plan for higher limits.

## Troubleshooting

### Map Not Loading

1. Check that your API key is correctly set in `.env.local`
2. Verify the API key is active in your TomTom developer account
3. Check browser console for any error messages
4. Ensure you're using `VITE_TOMTOM_API_KEY` or `VITE_TOMTOM_KEY` (not `VITE_GOOGLE_MAPS_API_KEY`)

### Traffic Data Not Showing

- Traffic flow and incidents are automatically enabled
- Ensure you have an active internet connection
- Traffic data availability depends on your location (better coverage in urban areas)

### Styling Issues

- The map uses TomTom's "night" style to match the dark theme
- Custom markers use FlowGO's color scheme
- Green corridors are displayed as semi-transparent green lines

## Migration from Google Maps

If you were previously using Google Maps:

1. Remove `VITE_GOOGLE_MAPS_API_KEY` from `.env.local`
2. Add `VITE_TOMTOM_API_KEY` with your TomTom key
3. Restart your development server
4. The map will automatically use TomTom

Both map providers can coexist - the component will use TomTom if the TomTom key is available, otherwise it will fall back to Google Maps (if configured).
