# Extension Reload Instructions

## If content script won't load on Aave:

### Method 1: Proper Reload
1. chrome://extensions/
2. Turn OFF Brave Capture (toggle)
3. Turn ON Brave Capture (toggle)
4. Click reload button 🔄
5. **CLOSE all Aave tabs**
6. Open NEW tab → go to Aave
7. Wait for page to load completely
8. Try extension

### Method 2: Complete Reinstall
1. chrome://extensions/
2. Click "Remove" on Brave Capture
3. Close ALL browser windows
4. Reopen browser
5. chrome://extensions/
6. Turn on "Developer mode" (top right)
7. Click "Load unpacked"
8. Select folder: /Volumes/Crucial X8/Code/Brave-Capture
9. Go to Aave in NEW tab

### Method 3: Check Console
On Aave page:
- Press F12
- Go to Console tab
- Look for: "🎯 Brave Capture content script loaded"
- If missing, content script didn't inject

### Method 4: Manual Permission Grant
1. Click extension icon
2. Click the three dots (⋮) or puzzle icon
3. Select "This can read and change site data"
4. Choose "On all sites" temporarily
5. Reload Aave page

## Common Issues:
- ❌ Just refreshing page → Won't work, need new tab
- ❌ Extension not reloaded → Changes not active
- ❌ Old tab still open → Using old version
- ✅ New tab + reloaded extension → Works
