'use client';

export default function Home() {

  const handleRunPlaywright = () => {
    fetch('http://localhost:3000/api/playwright', {
      method: "POST"
    }).then(res => {



    })

  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <button onClick={handleRunPlaywright}> start-Playwrght </button>
    </div>
  );
}
