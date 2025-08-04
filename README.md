# 🍓 Dragon Fruit Bloom Tracker App

An offline-first mobile app to record flower blooms, track harvest readiness, log abortions, and analyze yield performance on a structured dragon fruit farm layout with greenhouses, trellises, and double poles.

---

## 📱 Purpose

Designed to help dragon fruit farmers:
- Log daily flower blooms
- Track harvest readiness
- Record flower abortions
- Forecast yield
- Analyze abortion trends
- Operate fully offline with optional cloud sync

---

## 🧩 Features

### ✅ Flower Bloom Logging
- Select pole (Greenhouse, Trellis, or Double Pole)
- Choose flower variety (Red/White/Yellow)
- Enter bloom count
- Add optional photo evidence

### ❌ Abortion Logging (Smart Linked)
- Select from bloom history
- No manual location/variety input needed
- Enter abortion count
- Add notes and image

### ⏳ Harvest Estimation
- Based on flowering date + maturity period (default 26 days)
- Subtracts abortions automatically
- View daily harvest-ready list

### 📊 Analytics
- Expected fruit yield chart (per day)
- Abortion rate per pole/variety
- Pole history viewer with filters

### 📂 Offline-First with Cloud Sync
- All data stored locally using SQLite/AsyncStorage
- Export/import via CSV or JSON
- Google Drive backup (manual and scheduled)

---

## 🌿 Farm Layout System

- **Greenhouses (8):** N/S GH1–4 → Poles: `N11A`, `S32F`, etc.
- **Trellis Lines (8):** NT1–4, ST1–4 → Sections: `NT3D`, `ST2A`
- **Double Poles (4):** NDPU, NDPL, SDPU, SDPL → `NDPU3`, `SDPL6`

---

## 🛠️ Tech Stack

- **Frontend:** React Native + Expo
- **Local DB:** SQLite via `expo-sqlite` or `AsyncStorage`
- **File Sync:** Google Drive API (CSV/JSON exports)
- **Charts:** Victory Native or React Native Charts Wrapper

---

## 🚀 Getting Started

### 📦 Prerequisites
- Node.js & npm
- Expo CLI (`npm install -g expo-cli`)
- Android/iOS device or emulator

### 🧪 Development Setup
```bash
git clone https://github.com/yourusername/dragon-fruit-tracker.git
cd dragon-fruit-tracker
npm install
expo start
