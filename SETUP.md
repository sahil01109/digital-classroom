# Setup Guide for Digital Classroom

## For New Devices / New Team Members

### Step 1: Clone the repository
```bash
git clone <repository-url>
cd digital-classroom
```

### Step 2: Install all dependencies
This will install all libraries listed in `package.json`:
```bash
npm install
```

**Libraries installed:**
- `react` ^19.2.5 - UI framework
- `react-dom` ^19.2.5 - React DOM renderer
- `react-router-dom` ^7.14.2 - Client-side routing
- `firebase` ^12.12.1 - Backend, authentication, database
- `openai` ^6.37.0 - OpenAI GPT API for AI features
- `lucide-react` ^1.14.0 - Beautiful icon library
- `vite` ^8.0.10 - Fast build tool
- `eslint` ^10.2.1 - Code quality linting

### Step 3: Set up environment variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   - **OpenAI API Key**: Get from https://platform.openai.com/api-keys
   - **Firebase Config** (optional): Get from your Firebase project settings

### Step 4: Start development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Step 5: Build for production
```bash
npm run build
```

---

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/               # Page components
│   ├── Auth.jsx
│   ├── Home.jsx
│   ├── Profile.jsx
│   ├── dashboard/
│   │   ├── student/     # Student dashboard pages
│   │   └── teacher/     # Teacher dashboard pages
├── layouts/             # Layout wrappers
├── context/             # React context providers
├── hooks/               # Custom React hooks
├── services/            # API & business logic
│   └── aiService.js     # OpenAI integration
├── firebase.js          # Firebase configuration
└── App.jsx              # Main app router
```

---

## Key Features

- 👨‍🎓 **Student Dashboard** - View subjects, assignments, quizzes, notes
- 👨‍🏫 **Teacher Dashboard** - Create classes, assignments, quizzes
- 🤖 **AI Quiz Generation** - Generate quizzes using OpenAI GPT
- 📝 **Real-time Notifications** - Live updates via Firestore
- 🔐 **Firebase Auth** - Secure authentication
- 🌓 **Dark Mode** - Built-in dark theme support

---

## Troubleshooting

### Missing dependencies error
If you see an error about missing modules, run:
```bash
npm install
```

### Port 5173 already in use
Change the port in `vite.config.js` or kill the process using that port.

### OpenAI API errors
- Verify your API key is valid
- Check you have sufficient API quota
- Ensure `VITE_OPENAI_API_KEY` is set in `.env`

### Firebase connection errors
- Check Firebase config in `src/firebase.js`
- Verify Firestore rules allow read/write
- Check internet connection

---

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint checks
```

---

## Support

For issues or questions, please refer to:
- Firebase docs: https://firebase.google.com/docs
- OpenAI docs: https://platform.openai.com/docs
- React docs: https://react.dev
