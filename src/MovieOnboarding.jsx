export default function OnboardingMovies() {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Step 1: Pick 5–10 movies</h1>
        <p>search here next.</p>
        <button onClick={() => (window.location.href = "/onboarding/shows")}>
          Continue →
        </button>
      </div>
    );
  }
  