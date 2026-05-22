import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { setDoc } from "firebase/firestore";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const providers = [
    {
      name: "Google",
      url: "https://accounts.google.com",
      icon: "https://ucarecdn.com/8f25a2ba-bdcf-4ff1-b596-088f330416ef/",
    },
   
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "",
          email: user.email,
          role: "student",
          teacherStatus: "none",
          createdAt: new Date(),
        });

        localStorage.setItem("userRole", "student");
        navigate("/student");
      } else {
        const data = userSnap.data();
        const isApprovedTeacher =
          data.role === "teacher" &&
          data.teacherStatus === "approved";

        if (data.role === "admin") {
          localStorage.setItem("userRole", "admin");
          navigate("/admin/teacher-approval");
          return;
        }

        localStorage.setItem("userRole", isApprovedTeacher ? "teacher" : "student");

        if (isApprovedTeacher) {
          navigate("/teacher-dashboard");
        } else {
          navigate("/student");
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, form.email, form.password);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "",
            email: user.email,
            role: "student",
            teacherStatus: "none",
            createdAt: new Date(),
          });

          localStorage.setItem("userRole", "student");
          navigate("/student");
        } else {
          const data = userSnap.data();
          const isApprovedTeacher =
            data.role === "teacher" &&
            data.teacherStatus === "approved";

          if (data.role === "admin") {
            localStorage.setItem("userRole", "admin");
            navigate("/admin/teacher-approval");
            return;
          }

          localStorage.setItem("userRole", isApprovedTeacher ? "teacher" : "student");

          if (isApprovedTeacher) {
            navigate("/teacher-dashboard");
          } else {
            navigate("/student");
          }
        }
      } else {
        if (form.password !== form.confirmPassword) {
          alert("Passwords do not match");
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const user = result.user;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: form.name,
          email: form.email,
          role: "student",
          teacherStatus: "none",
          createdAt: new Date(),
        });

        localStorage.setItem("userRole", "student");
        navigate("/student");

        alert("Signup successful. Your teacher access request can be submitted later.");
        setIsLogin(true);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setErrorMessage('No account found for this email. Redirecting to sign up...');
        setIsLogin(false);
        navigate('/auth?mode=signup');
        return;
      }

      if (error.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password. Please try again or reset your password.');
      } else {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-6 dark:text-white">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-100 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:bg-gray-800 dark:border-gray-700"
            />
          )}


          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:bg-gray-800 dark:border-gray-700"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:border-gray-700"
          />

          {!isLogin && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:border-gray-700"
            />
          )}

          {isLogin && (
            <div className="text-right text-sm">
              <a href="#" className="text-blue-500 hover:underline">
                Forgot password?
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? "Processing..." : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm dark:text-gray-400">
          {isLogin ? (
            <>
              Don’t have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-blue-500 hover:underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-blue-500 hover:underline"
              >
                Login
              </button>
            </>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
            OR
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {providers.map((provider, i) =>
              provider.name === "Google" ? (
                <button
                  key={i}
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="flex h-11 w-11 items-center justify-center rounded-full border shadow hover:scale-110 disabled:opacity-50"
                >
                  <img src={provider.icon} alt={provider.name} className="h-6 w-6" />
                </button>
              ) : (
                <a
                  key={i}
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full border bg-white/10 shadow-sm transition hover:scale-110"
                >
                  <img src={provider.icon} alt={provider.name} className="h-6 w-6" />
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
