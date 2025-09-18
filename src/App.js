import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import OnboardingMovies from "./onboarding/MovieOnboarding";
import OnboardingShows from "./onboarding/ShowOnboarding";
import MovieRanking from "./rankings/MovieRanking";
import ShowRanking from "./rankings/ShowRanking";
import Dashboard from "./dashboard/Dashboard";

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
      <Route path="/onboarding/movies/ranking" element={<MovieRanking />} />
      <Route path="/onboarding/shows" element={<OnboardingShows />} />
      <Route path="/onboarding/shows/ranking" element={<ShowRanking />} />
      <Route path="/home" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}