import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import OnboardingMovies from "./MovieOnboarding";
import OnboardingShows from "./ShowOnboarding";
import Home from "./HomePage";

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const hasOnboarded = localStorage.getItem("hasOnboarded") === "true";
    if (hasOnboarded && pathname.startsWith("/onboarding")) {
      navigate("/home", { replace: true });
    }
    if (!hasOnboarded && pathname === "/") {
      navigate("/onboarding/movies", { replace: true });
    }
  }, [pathname, navigate]);

  return (
    <Routes>
      <Route path="/onboarding/movies" element={<OnboardingMovies />} />
      <Route path="/onboarding/shows" element={<OnboardingShows />} />
      <Route path="/home" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
