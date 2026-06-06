<div align="center">

# 🏋️ FORGE AI

**High-Performance Athletic System**

AI-powered fitness companion built with React, Express, Gemini AI & Turso DB

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Workout Planner** | Generate personalized plans with smart muscle rotation — avoids redundant groups based on 7-day history |
| 📊 **Progress Charts** | Volume per session visualization with Recharts |
| 💬 **AI Chat Trainer** | Context-aware coach that knows your PRs, history & body composition |
| 📸 **Gym Equipment Scanner** | Upload photo → AI identifies machine and explains proper form (with image compression) |
| 📅 **Workout Logger** | Log sessions with exercises, sets, reps, weight & interactive calendar |
| 🗓️ **Auto Schedule** | Smart weekly planner that adapts based on actual training history |
| 🔥 **Weekly Streak** | Consecutive weeks with at least 1 session — resets if a full week is skipped |
| 🏆 **Achievement System** | Unlock badges: First Session, 5/10/25/50 Sessions, 1000kg Volume, Streak milestones |
| 🎯 **PR Tracker** | Auto-detect personal records with celebration popup on new PRs |
| 🔄 **Recovery Status** | Shows muscle group recovery state (recovering/ready) based on recent logs |
| 📤 **PDF Report Export** | Monthly summary with workout history and personal records |
| 🔔 **Push Notifications** | Rest day reminders when you haven't trained in 2+ days |
| 🏋️ **117+ Exercise Database** | Comprehensive library with YouTube & Google tutorial links per exercise |
| ⏱️ **Rest Timer** | Built-in rest timer between sets |
| 📈 **Body Recomposition** | BMI analysis with AI nutrition advice (calories, protein, focus type) |
| 🏆 **Workout Share Card** | Generate shareable workout summary cards |
| 📱 **Swipe Navigation** | Swipe between tabs for native mobile feel |

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Motion + Recharts
- **Backend**: Express.js (local) / Vercel Serverless Functions (production)
- **AI**: Google Gemini 2.5 Flash → 2.0 Flash (auto-fallback on rate limit)
- **Database**: Turso (libSQL) — edge-optimized SQLite
- **Cache**: Upstash Redis
- **Packages**: jsPDF, browser-image-compression, Recharts, Lucide React
- **Build**: Vite 6

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Gemini API Key](https://aistudio.google.com/apikey)
- [Turso Database](https://turso.tech/)
- [Upstash Redis](https://upstash.com/) (optional — for caching)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Adamibnualfatahh/forge-ai.git
cd forge-ai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |
| `TURSO_DATABASE_URL` | Yes | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Yes | Turso authentication token |
| `REDIS_URL` | No | Upstash Redis URL for caching |

## 📦 Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables in **Settings → Environment Variables**
4. Deploy 🎉

## 📁 Project Structure

```
forge-ai/
├── api/
│   └── index.ts              # Vercel serverless function
├── src/
│   ├── App.tsx               # Main React application
│   ├── exerciseDb.ts         # Exercise database (117+ exercises)
│   ├── RestTimer.tsx         # Rest timer component
│   ├── WeightChart.tsx       # Weight progress chart
│   ├── WorkoutTemplates.tsx  # Workout templates
│   ├── ProgressiveOverload.tsx
│   ├── ShareCard.tsx         # Shareable workout card
│   ├── GoalSetting.tsx       # Goal configuration
│   ├── MuscleIcon.tsx        # Muscle group icons
│   ├── store.ts              # Zustand state store
│   ├── types.ts              # TypeScript type definitions
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles
├── server.ts                 # Local dev server (Express + Vite)
├── vercel.json               # Vercel deployment config
├── vite.config.ts            # Vite build configuration
└── .env.example              # Environment variables template
```

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start local dev server with HMR |
| `npm run build` | Build frontend + bundle server for production |
| `npm start` | Run production server |
| `npm run lint` | TypeScript type checking |

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).

---

<div align="center">

Built with 💪 by Adam Ibnu Alfatah

</div>
