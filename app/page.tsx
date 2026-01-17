'use client';
export default function Home() {


  const handleRunPlaywright = ()=>{
    fetch('/api/playwright').then(res=>{
      

      
    })
    
  }

  return (
    <div>
      <header> Playwright DashBorad </header>

      <div className="btn-group">

        <button onClick={handleRunPlaywright}> Playwright Function : Open Baidu </button>

      </div>
    </div>
  );
}
