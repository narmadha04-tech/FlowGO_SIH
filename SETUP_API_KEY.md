# 🔑 Setup TomTom API Key - Quick Guide

## ✅ TomTom Maps is Working!

The package is now installed and working. You just need to add your API key.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your Free API Key

1. **Visit:** https://developer.tomtom.com
2. **Sign up** for a free account (or log in)
3. **Create a new app:**
   - Click "My Apps" or "Applications"
   - Click "Add a new app"
   - Name it (e.g., "FlowGO")
   - Select "Web" platform
   - Click "Create App"
4. **Copy your API Key** (it looks like: `AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`)

### Step 2: Create .env.local File

**In the `frontend` folder**, create a file named `.env.local`:

**Location:** `e:\FlowGO\frontend\.env.local`

**Content:**
```env
VITE_TOMTOM_API_KEY=paste_your_api_key_here
```

Replace `paste_your_api_key_here` with the actual key you copied.

### Step 3: Restart Dev Server

**IMPORTANT:** Environment variables are only loaded when the server starts.

1. **Stop the dev server:**
   - In your frontend terminal, press `Ctrl+C`
   - OR press `q` then Enter

2. **Start it again:**
   ```powershell
   cd e:\FlowGO\frontend
   npm run dev
   ```

3. **Refresh your browser**

---

## ✅ Verify It Works

After restarting, open:
- **Admin Map:** http://localhost:5173/authority/dashboard → Click "Map"
- **Public Map:** http://localhost:5173/public

You should see:
- ✅ TomTom map loading
- ✅ Real-time traffic flow (green/yellow/red roads)
- ✅ Traffic incidents
- ✅ No error messages

---

## 📝 Example .env.local File

```env
VITE_TOMTOM_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

**That's it!** Just one line with your API key.

---

## 🔍 File Location

Make sure the file is in the correct location:
```
e:\FlowGO\frontend\.env.local
```

**NOT** in the root folder, but in the `frontend` folder!

---

## ⚠️ Troubleshooting

### Still seeing "API Key not configured"?

1. ✅ Check file name: Must be exactly `.env.local` (not `.env` or `.env.example`)
2. ✅ Check location: Must be in `frontend` folder
3. ✅ Check variable name: Must be `VITE_TOMTOM_API_KEY` (starts with `VITE_`)
4. ✅ Restart dev server: Variables only load on startup
5. ✅ No spaces: `VITE_TOMTOM_API_KEY=yourkey` (no spaces around `=`)

### Map not loading?

- Check browser console (F12) for errors
- Verify API key is correct (no typos)
- Make sure you restarted the dev server

---

## 💡 Free Tier

TomTom's free tier includes:
- 2,500 requests/day
- 15,000 requests/month
- Perfect for development!

---

## 🎉 That's It!

Once you:
1. ✅ Get your API key from developer.tomtom.com
2. ✅ Create `.env.local` file with the key
3. ✅ Restart the dev server

**The maps will work perfectly!** 🗺️✨

---

**Need help?** See `docs/guides/TOMTOM_API_KEY_SETUP.md` for detailed instructions.
