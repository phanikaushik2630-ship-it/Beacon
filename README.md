# Beacon — Real-Time 1-to-1 Messaging Platform

A modern, high-performance, full-stack real-time messaging application built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **Socket.io**, and **MongoDB**.

---

## 📁 Project Structure

```
Beacon/
├── client/                     # Frontend Application (React + Vite + Tailwind CSS)
│   ├── public/
│   │   ├── favicon.svg         # Application icon
│   │   └── paint_splash_bg.jpg # 3D paint splash background asset
│   ├── src/
│   │   ├── components/         # Reusable UI components (LiveBackground, Logo, EmojiPicker, GifPicker)
│   │   ├── context/            # AuthContext for session management
│   │   ├── pages/              # LandingPage, Login, Register, ChatPage
│   │   ├── services/           # Socket.io client & Axios REST API helpers
│   │   ├── index.css           # Tailwind CSS directives & theme animations
│   │   ├── App.jsx             # React Router route definitions
│   │   └── main.jsx            # React root mount
│   ├── index.html              # HTML5 entry with Google Fonts
│   ├── package.json            # Client dependencies
│   └── vite.config.js          # Vite config
│
├── server/                     # Backend Application (Node.js + Express + Socket.io + MongoDB)
│   ├── src/
│   │   ├── middleware/         # JWT authentication middleware
│   │   ├── models/             # Mongoose User & Message schemas
│   │   ├── routes/             # REST routes for auth, health, and messages
│   │   ├── sockets/            # Socket.io real-time chat & typing handlers
│   │   └── server.js           # Express + HTTP + Socket.io bootstrap
│   ├── package.json            # Server dependencies
│   ├── .env.example            # Server environment template
│   └── .gitignore              # Server ignore rules
│
├── .gitignore                  # Git ignore rules
├── package.json                # Monorepo convenience scripts
└── README.md                   # Project documentation
```

---

## ⚡ Features

- **Real-Time 1-to-1 Messaging**: Instant bi-directional message streaming via authenticated WebSockets (Socket.io).
- **Persistent Chat History**: MongoDB database storage with automatic message history retrieval.
- **Message Deletion & Clear Chat**: Delete individual messages or clear conversation history in real time.
- **Chat Backup & Export**: One-click download of conversation transcripts (`.txt`) and structured data (`.json`).
- **Interactive Emoji & GIF Picker**: Integrated emoji categories and animated GIF sharing with rich media previews.
- **Authentication & Security**: Secure user registration, login, bcrypt password hashing, and JWT tokens.
- **Presence & Live Indicators**: Real-time online status badges, read receipts, and typing indicators.
- **3D Dynamic Visual Design**: Liquid paint splash theme with smooth animations, glassmorphism, and responsive layout.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local instance or MongoDB Atlas connection string

---

### 2. Installation

Install dependencies for both client and server:
```bash
npm install
npm run install:all
```

---

### 3. Environment Configuration

Create `.env` files in both `/server` and `/client` directories:

#### Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/realtimechat
JWT_SECRET=your_secret_jwt_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

#### Client (`client/.env`)
```env
VITE_SERVER_URL=http://localhost:5000
```

---

### 4. Running the App

Run both server and client concurrently:
```bash
npm run dev
```

- **Client Application**: [http://localhost:5173](http://localhost:5173)
- **Server API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🛠️ Production Build

To build the frontend client:
```bash
npm run build:client
```

To start the production server:
```bash
npm run start:server
```

---

## 📄 License
ISC
