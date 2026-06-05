<div align="center">

# 🏋️ FORGE AI

**High-Performance Athletic System**

AI-powered fitness companion built with React, Express, Gemini AI & Turso DB

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Workout Planner** | Generate personalized workout plans with smart muscle rotation — avoids redundant muscle groups based on 7-day training history |
| 📊 **Body Recomposition** | BMI analysis with AI-generated nutrition advice (calories, protein targets, focus type) |
| 💬 **AI Chat Trainer** | Conversational fitness coach powered by Gemini — motivational, casual Indonesian style |
| 📸 **Gym Equipment Scanner** | Upload a photo of any gym machine → multimodal AI identifies it and explains proper form |
| 📅 **Workout Logger** | Log sessions with exercises, sets, reps, weight tracking & interactive calendar view |
| 🔥 **Weekly Streak** | Tracks consecutive weeks with at least 1 training session — resets if a full week is skipped |
| 🏋️ **117+ Exercise Database** | Comprehensive exercise library covering chest, back, shoulders, arms, legs, core & cardio |
| ⏱️ **Rest Timer** | Built-in rest timer between sets |
| 📈 **Progressive Overload Tracking** | Monitor strength progress over time |
| 🏆 **Workout Share Card** | Generate shareable workout summary cards |

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Motion (Framer Motion)
- **Backend**: Express.js (local) / Vercel Serverless Functions (production)
- **AI**: Google Gemini 3.5 Flash (text + multimodal)
- **Database**: Turso (libSQL) — edge-optimized SQLite
- **Cache**: Upstash Redis
- **Icons**: Lucide React
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

The `vercel.json` handles:
- Frontend: `vite build` → static files
- API: `/api/*` → serverless function (`api/index.ts`)

## 📁 Project Structure

```
forge-ai/
├── api/
│   └── index.ts              # Vercel serverless function (Express app)
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
├── server.ts                 # Local development server (Express + Vite)
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
