# Confession Wall

A real-time, anonymous confession wall web application where users can share their thoughts and react to others.

## Features
- **Anonymous Posting**: Share confessions without login.
- **Real-time Updates**: See new confessions and reactions instantly.
- **Emoji Reactions**: React to confessions with a variety of emojis.
- **Theme Modes**: Switch between "Ghost" and "Romantic" themes.
- **24-hour Expiration**: Confessions vanish after 24 hours.

## How to Run Locally

### 1. Prerequisites
- Node.js installed on your system.
- npm (Node Package Manager).

### 2. Setup Backend
1. Open a terminal in the root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the server:
   ```bash
   node server.js
   ```
   The backend will run on `http://localhost:3001`.

### 3. Setup Frontend
1. Open a *new* terminal in the `client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`.

### 4. Access the App
Open your browser and navigate to [http://localhost:5173](http://localhost:5173).
