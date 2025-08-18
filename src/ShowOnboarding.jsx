export default function OnboardingShows() {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Step 2: Pick 5–10 shows</h1>
        <p>Search goes here next.</p>
        <button onClick={() => {
          localStorage.setItem("hasOnboarded", "true");
          window.location.href = "/home";
        }}>
          Finish →
        </button>
      </div>
    );
  }
  