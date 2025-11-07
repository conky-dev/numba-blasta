'use client'

export default function Header({ title }: { title?: string }) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          {title && <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-600">Balance: </span>
            <span className="font-semibold text-gray-900">$52.88</span>
            <button className="ml-2 text-green-600 hover:text-green-700">+</button>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            ❓
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 relative">
            🔔
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            🔍
          </button>
          <button className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            🌐
          </button>
        </div>
      </div>
    </header>
  )
}

