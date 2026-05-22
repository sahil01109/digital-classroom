import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import hero from "../assets/img/hero.webp"
import logo from "../assets/img/logo.webp"
import avtar from "../assets/img/user.png"
function Home() {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatScreen, setChatScreen] = useState("home")
  const [msgInput, setMsgInput] = useState("")
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const openChat = () => setChatOpen(true)
  const closeChat = () => setChatOpen(false)
  const toggleDark = () => setDarkMode((prev) => !prev)
  const openChatScreen = () => setChatScreen("chat")
  const openMessages = () => setChatScreen("messages")
  const showScreen = (screen) => setChatScreen(screen)
  const sendMsg = () => {
    if (!msgInput.trim()) return
    setMsgInput("")
    setChatScreen("chat")
  }

  return (
<>
  
  <header className="bg-white shadow-sm sticky top-0 z-50">
    <input id="mobile-menu" type="checkbox" className="peer hidden"/>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

      <div className="flex items-center gap-2">
        <img src={logo} alt="Smart Classroom Logo" className="w-10 h-10 rounded-lg" />
        <span className="text-[#2b4c7e] font-semibold">Smart</span>
      </div>

      <label htmlFor="mobile-menu"
        className="md:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
        aria-label="Open menu">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </label>

      <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
        <a className="text-blue-600 border-b-2 border-blue-600 pb-1">Home</a>

        <div className="relative group">
          <button className="hover:text-blue-600">Features ▾</button>
          <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-lg mt-2 w-44 p-2">
            <a className="block px-3 py-2 hover:bg-gray-100 rounded">Timetable</a>
            <a className="block px-3 py-2 hover:bg-gray-100 rounded">GPA</a>
            <a className="block px-3 py-2 hover:bg-gray-100 rounded">Quiz</a>
          </div>
        </div>

        <a className="hover:text-blue-600">Resources</a>
        <a className="hover:text-blue-600">Why Us</a>
      </nav>

      <Link to="/auth"
        className="hidden md:inline-flex bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm shadow hover:scale-105 transition">
        Sign In
      </Link>

    </div>

    <div className="hidden peer-checked:block md:hidden bg-white border-t border-gray-200 px-4 py-4">
      <div className="space-y-3 text-sm text-gray-700">
        <a className="block py-2 rounded-lg hover:bg-gray-100">Home</a>
        <a className="block py-2 rounded-lg hover:bg-gray-100">Features</a>
        <a className="block py-2 rounded-lg hover:bg-gray-100">Resources</a>
        <a className="block py-2 rounded-lg hover:bg-gray-100">Why Us</a>
        <Link to="/auth" className="w-full bg-blue-500 text-white px-4 py-2 rounded-full shadow hover:scale-105 transition">
          Sign In
        </Link>
      </div>
    </div>
  </header>


  <section className="relative text-[#2b4c7e] bg-no-repeat bg-bottom bg-cover min-h-[70vh] sm:min-h-[75vh]"
    style={{ "backgroundImage": `url(${hero})` }}>

    <div className="absolute inset-0 bg-gradient-to-b "></div>

    <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 pb-28 sm:pb-40">

      <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-5 leading-tight">
        Smart Digital ClassRoom <br className="hidden sm:block"/>For Modern Learning
      </h1>

      <p className="text-gray-700 max-w-xl mb-6">
        Manage timetable, calculate GPA, and boost learning with quizzes — all in one platform.
      </p>

      <div className="flex gap-3 flex-col sm:flex-row">
        <Link to="/auth?mode=signup" className="bg-[#e74c3c] px-6 py-2.5 rounded-lg text-white shadow hover:scale-105 transition">
          Get Started
        </Link>
      </div>

    </div>

    <div className="absolute bottom-0 w-full h-16 bg-[#f3f6fb] rounded-t-[30px]"></div>
  </section>


 
  <section className="max-w-7xl mx-auto px-4 py-16 text-center">
    <h2 className="text-3xl sm:text-4xl font-bold text-[#2b4c7e] mb-10">Powerful Features</h2>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
        <div className="text-4xl mb-3">📅</div>
        <h3 className="font-semibold mb-2">Smart Scheduling</h3>
        <p className="text-sm text-gray-600">Auto generate and manage timetables efficiently</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="font-semibold mb-2">Performance Tracking</h3>
        <p className="text-sm text-gray-600">Calculate GPA and monitor progress</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
        <div className="text-4xl mb-3">🧠</div>
        <h3 className="font-semibold mb-2">Interactive Learning</h3>
        <p className="text-sm text-gray-600">Daily quizzes to boost knowledge</p>
      </div>

    </div>
  </section>
  <section className="max-w-7xl mx-auto px-4 py-20">

    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

     
      <div className="relative">
        <img src="https://images.unsplash.com/photo-1523580494863-6f3031224c94"
          className="rounded-2xl shadow-lg w-full h-72 sm:h-[350px] object-cover"/>

        
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-xl shadow-md">
          <h4 className="text-sm font-semibold text-blue-600">10K+ Students</h4>
          <p className="text-xs text-gray-500">Trust our platform</p>
        </div>
      </div>

    
      <div>

        <h2 className="text-3xl font-bold text-[#2b4c7e] mb-5">
          About Smart ClassNameroom
        </h2>

        <p className="text-gray-600 mb-4 leading-relaxed">
          Smart ClassNameroom is a modern digital learning platform designed to simplify student life.
          From managing timetables to tracking academic performance, we bring everything into one place.
        </p>

        <p className="text-gray-600 mb-6 leading-relaxed">
          Our goal is to provide students with smart tools that improve productivity, save time,
          and enhance learning experiences in a simple and effective way.
        </p>

       
        <div className="space-y-3 text-sm text-gray-700">
          <p>✔ Easy to use interface</p>
          <p>✔ All-in-one academic tools</p>
          <p>✔ Designed for students & teachers</p>
          <p>✔ Modern and responsive design</p>
        </div>

    
        <button className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-lg shadow hover:scale-105 transition">
          Learn More
        </button>

      </div>

    </div>

  </section>
  
  <section className="bg-white py-20">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

      <div>
        <h2 className="text-3xl font-bold text-[#2b4c7e] mb-6">Why Choose Smart ClassNameroom?</h2>

        <ul className="space-y-4 text-gray-600">
          <li>✔ Easy to use interface</li>
          <li>✔ All tools in one platform</li>
          <li>✔ Saves time & improves productivity</li>
          <li>✔ Designed for modern students</li>
        </ul>
      </div>

      <div className="bg-blue-100 p-10 rounded-2xl text-center">
        <h3 className="text-xl font-semibold mb-2">Better Learning Experience</h3>
        <p className="text-sm text-gray-600">Everything you need to succeed in one place</p>
      </div>

    </div>
  </section>

  
  <section className="py-20 bg-blue-50 text-center overflow-hidden">
    <h2 className="text-3xl font-bold text-[#2b4c7e] mb-10">What Students Say</h2>

    <div className="relative w-full  px-4 sm:px-0">

     
      <div className="flex gap-6 animate-slide min-w-max">

        
        <div className="bg-white p-6 rounded-xl shadow w-[280px] flex-shrink-0">
          <img src={avtar} className="w-16 h-16 rounded-full mx-auto mb-3"/>
          <p className="text-sm">"Amazing platform for managing studies!"</p>
          <h4 className="mt-2 font-medium text-sm text-gray-700">Rahul</h4>
        </div>

        <div className="bg-white p-6 rounded-xl shadow w-[280px] flex-shrink-0">
          <img src={avtar} className="w-16 h-16 rounded-full mx-auto mb-3"/>
          <p className="text-sm">"Improved my GPA easily."</p>
          <h4 className="mt-2 font-medium text-sm text-gray-700">Priya</h4>
        </div>

        <div className="bg-white p-6 rounded-xl shadow w-[280px] flex-shrink-0">
          <img src={avtar} className="w-16 h-16 rounded-full mx-auto mb-3"/>
          <p className="text-sm">"Very useful platform."</p>
          <h4 className="mt-2 font-medium text-sm text-gray-700">Amit</h4>
        </div>

        <div className="bg-white p-6 rounded-xl shadow w-[280px] flex-shrink-0">
          <img src={avtar} className="w-16 h-16 rounded-full mx-auto mb-3"/>
          <p className="text-sm">"Best system for students!"</p>
          <h4 className="mt-2 font-medium text-sm text-gray-700">Neha</h4>
        </div>

        <div className="bg-white p-6 rounded-xl shadow w-[280px] flex-shrink-0">
          <img src={avtar} className="w-16 h-16 rounded-full mx-auto mb-3"/>
          <p className="text-sm">"Amazing platform for managing studies!"</p>
          <h4 className="mt-2 font-medium text-sm text-gray-700">Rahul</h4>
        </div>

      </div>
    </div>
  </section>
  <div className="fixed bottom-5 right-5">
    <button onClick={openChat} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition">
      💬
    </button>
  </div>



  <div id="chatModal" className={`${chatOpen ? "fixed" : "hidden"} bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[360px] h-full md:h-[600px] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50`}>


    <div id="chatRoot" className="bg-white h-full flex flex-col dark:bg-gray-800 transition duration-300">


      <div className="flex justify-between items-center p-4 border-b dark:bg-gray-700">
        <div>
          <h1 className="font-semibold text-gray-800 dark:text-white">Smart ClassNameroom</h1>
          <p className="text-xs text-gray-500">AI Assistant</p>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={toggleDark} id="themeBtn">🌙</button>
          <button className="dark:text-white" onClick={closeChat}>✖</button>
        </div>
      </div>


      <div className="flex-1 overflow-y-auto dark:bg-gray-800">

  
        <div id="homeScreen" className={`p-5 space-y-5 ${chatScreen !== "home" ? "hidden" : ""}`}>

          <div onClick={openChatScreen}
            className="border p-4 rounded-xl cursor-pointer flex justify-between hover:bg-gray-50 dark:hover:bg-gray-700">

            <div>
              <p className="font-semibold text-gray-800 dark:text-white">Start Chat</p>
              <p className="text-sm text-gray-500">We respond instantly</p>
            </div>
            <span className="dark:text-white">➤</span>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
            <h2 className="font-semibold mb-2 text-gray-700 dark:text-white">Recent</h2>

            <div onClick={openMessages} className="cursor-pointer text-sm">
              <p className="text-gray-500">Last chat</p>
              <p className="text-gray-800 dark:text-gray-200">Hello! How can I help?</p>
            </div>
          </div>

        </div>

      
        <div id="messagesScreen" className={`p-5 space-y-5 ${chatScreen !== "messages" ? "hidden" : ""}`}>

          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Messages</h2>

          <div onClick={openChatScreen}
            className="border p-4 rounded-xl cursor-pointer flex justify-between hover:bg-gray-50 dark:hover:bg-gray-700">

            <div>
              <p className="font-semibold text-gray-800 dark:text-white">New Chat</p>
              <p className="text-sm text-gray-500">We respond instantly</p>
            </div>
            ➤
          </div>

        </div>


        <div id="chatScreen" className={`flex flex-col h-full ${chatScreen !== "chat" ? "hidden" : ""}`}>

   
          <div id="chatBox" className="flex-1 p-4 space-y-4 overflow-y-auto">

            <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-2xl max-w-[85%] text-sm text-gray-800 dark:text-white">
              Hello 👋 How can I help you today?
            </div>

          </div>

     
          <div className="p-3 border-t dark:border-gray-700 flex gap-2">

            <input id="msgInput" className="flex-1 border dark:border-gray-600 rounded-xl px-3 py-2 text-sm
            bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none" placeholder="Type a message..."
              value={msgInput}
              onChange={(event) => setMsgInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') sendMsg() }} />

            <button onClick={sendMsg} className="bg-black dark:bg-white text-white dark:text-black px-4 rounded-xl">
              ➤
            </button>

          </div>

        </div>

      </div>


      <div className="border-t dark:border-gray-700 flex justify-around p-3 text-gray-600 dark:text-gray-300">
        <button onClick={() => showScreen('home')}>🏠</button>
        <button onClick={() => showScreen('messages')}>💬</button>
      </div>

    </div>
  </div>

  <footer className="bg-[#2b4c7e] text-white py-10 text-center">
    <h3 className="font-semibold mb-2">Smart Classroom</h3>
    <p className="text-sm text-gray-200">© 2026 All rights reserved</p>
  </footer>

</>
  );
}

export default Home;