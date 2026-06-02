<div align="center">

# 🏋️ FORGE AI

**High-Performance Athletic System**

AI-powered fitness companion built with React, Express, Gemini AI & Turso DB

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Adamibnualfatahh/forge-ai)
[![Live Demo](https://img.shields.io/badge/demo-forge--ai--lilac.vercel.app-black?style=for-the-badge&logo=vercel)](https://forge-ai-lilac.vercel.app)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Workout Planner** | Generate personalized workout plans based on equipment, location, and muscle rotation using Gemini AI |
| 📊 **Body Recomposition** | BMI analysis with AI-generated nutrition advice (calories, protein targets, focus type) |
| 💬 **AI Chat Trainer** | Conversational fitness coach powered by Gemini — motivational, casual Indonesian style |
| 📸 **Gym Equipment Scanner** | Upload a photo of any gym machine → multimodal AI identifies it and explains proper form |
| 📅 **Workout Logger** | Log sessions with exercises, sets, reps, weight tracking & interactive calendar view |
| 👥 **Multi-Profile** | Support multiple user profiles with individual stats, streaks, and session history |

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Motion (Framer Motion)
- **Backend**: Express.js (local) / Vercel Serverless Functions (production)
- **AI**: Google Gemini 3.5 Flash (text + multimodal)
- **Database**: Turso (libSQL) — edge-optimized SQLite
- **Icons**: Lucide React
- **Build**: Vite 6

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Gemini API Key](https://aistudio.google.com/apikey)
- [Turso Database](https://turso.tech/) (optional — app has fallback mock data)

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

## 📦 Deployment (Vercel)

This project is configured for **Vercel** deployment out of the box:

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables in **Settings → Environment Variables**
4. Deploy! 🎉

The `vercel.json` handles:
- Frontend: `vite build` → static files
- API: `/api/*` → serverless function (`api/index.ts`)

## 📁 Project Structure

```
forge-ai/
├── api/
│   └── index.ts          # Vercel serverless function (Express app)
├── src/
│   ├── App.tsx            # Main React application
│   ├── main.tsx           # React entry point
│   ├── index.css          # Global styles
│   └── types.ts           # TypeScript type definitions
├── public/
│   ├── icon.svg           # App icon
│   └── manifest.json      # PWA manifest
├── server.ts              # Local development server (Express + Vite)
├── vercel.json            # Vercel deployment config
├── vite.config.ts         # Vite build configuration
└── .env.example           # Environment variables template
```

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start local dev server with HMR |
| `npm run build` | Build frontend + bundle server for production |
| `npm start` | Run production server |
| `npm run lint` | TypeScript type checking |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).

---

<div align="center">
  
Built with 💪 by [Adam Ibn Al Fatah](https://github.com/Adamibnualfatahh)

</div>
