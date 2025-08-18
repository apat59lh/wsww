export default function Home() {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Welcome 👋</h1>
        <p>Onboarding complete. Add rankings/recs here later.</p>
        <button onClick={() => {
          localStorage.removeItem("hasOnboarded");
          window.location.href = "/onboarding/movies";
        }}>
          Reset onboarding
        </button>
      </div>
    );
  }
  