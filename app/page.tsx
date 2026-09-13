export default function Home() {
  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-gray-600 text-sm font-semibold">Prospects</h2>
          <p className="text-3xl font-bold text-wine mt-2">0</p>
        </div>
        <div className="card">
          <h2 className="text-gray-600 text-sm font-semibold">Clients</h2>
          <p className="text-3xl font-bold text-wine mt-2">0</p>
        </div>
        <div className="card">
          <h2 className="text-gray-600 text-sm font-semibold">Offres</h2>
          <p className="text-3xl font-bold text-wine mt-2">0</p>
        </div>
      </div>
    </div>
  )
}
