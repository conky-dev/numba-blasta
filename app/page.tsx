export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Numba Blasta
        </h1>
        <p className="text-gray-600 mb-8">
          White-labeled Twilio SMS Platform
        </p>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm text-gray-500">
            System Status: <span className="text-green-600 font-semibold">Online</span>
          </p>
        </div>
      </div>
    </main>
  )
}

