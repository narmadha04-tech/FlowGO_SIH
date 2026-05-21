# 🔑 TomTom API Key Setup Guide

## Quick Setup

### Step 1: Get Your Free TomTom API Key

1. **Visit:** https://developer.tomtom.com
2. **Sign up** for a free account (or log in if you already have one)
3. **Create a new application:**
   - Go to "My Apps" or "Applications"
   - Click "Add a new app"
   - Give it a name (e.g., "FlowGO Traffic")
   - Select "Web" as the platform
   - Click "Create App"
4. **Copy your API Key** from the app details page

### Step 2: Add API Key to Your Project

1. **Open or create** the file: `frontend/.env.local`

2. **Add your API key:**
   ```env
   VITE_TOMTOM_API_KEY=your_actual_api_key_here
   ```

   Replace `your_actual_api_key_here` with the API key you copied from TomTom.

3. **Save the file**

### Step 3: Restart Dev Server

**Important:** You must restart the frontend dev server for the environment variable to be loaded.

1. **Stop the dev server:**
   - Press `Ctrl+C` in the frontend terminal
   - OR press `q` then Enter

2. **Start it again:**
   ```powershell
   cd e:\FlowGO\frontend
   npm run dev
   ```

3. **Refresh your browser** (or it should auto-reload)

---

## File Location

The `.env.local` file should be located at:
```
e:\FlowGO\frontend\.env.local
```

---

## Example .env.local File

```env
# TomTom Maps API Key
VITE_TOMTOM_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890

# Backend API (optional - defaults to http://localhost:8000)
VITE_API_URL=http://localhost:8000
```

---

## Alternative Variable Name

You can also use `VITE_TOMTOM_KEY` instead of `VITE_TOMTOM_API_KEY`:

```env
VITE_TOMTOM_KEY=your_api_key_here
```

---

## Verify It's Working

After adding the API key and restarting:

1. **Open the app:** http://localhost:5173
2. **Navigate to the map** (Authority Dashboard → Map, or Public View)
3. **You should see:**
   - ✅ TomTom map loading
   - ✅ Real-time traffic flow (color-coded roads)
   - ✅ Traffic incidents
   - ✅ No error messages

---

## Free Tier Limits

TomTom's free tier includes:
- **2,500 requests/day**
- **15,000 requests/month**
- Perfect for development and testing

For production, consider upgrading to a paid plan.

---

## Troubleshooting

### ❌ "API Key not configured" still showing

1. **Check the file name:** Must be exactly `.env.local` (not `.env` or `.env.example`)
2. **Check the location:** Must be in the `frontend` folder
3. **Check the variable name:** Must start with `VITE_`
4. **Restart the dev server:** Environment variables are only loaded on startup
5. **Check for typos:** No spaces around the `=` sign

### ❌ "Invalid API Key" error

- Verify you copied the entire API key
- Check for extra spaces or line breaks
- Make sure the key is active in your TomTom account

### ❌ Map not loading

- Check browser console for errors
- Verify the API key is correct
- Make sure you restarted the dev server after adding the key

---

## Security Note

⚠️ **Never commit `.env.local` to git!**

The `.env.local` file is already in `.gitignore` and won't be committed. Keep your API keys private.

---

## Need Help?

- **TomTom Documentation:** https://developer.tomtom.com/maps-sdk-web-js/documentation
- **Get Support:** https://developer.tomtom.com/support

---

**Once you add your API key and restart, the maps will work perfectly!** 🗺️✨
