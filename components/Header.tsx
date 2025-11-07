'use client'

interface HeaderProps {
  title?: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Hamburger menu for mobile */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {title && <h1 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>}
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="text-xs md:text-sm">
            <span className="text-gray-600 hidden sm:inline">Balance: </span>
            <span className="font-semibold text-gray-900">$52.88</span>
            <button className="ml-1 md:ml-2 text-green-600 hover:text-green-700">+</button>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 hidden sm:block">
            ❓
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 relative">
            🔔
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 hidden sm:block">
            🔍
          </button>
          <button className="w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
            🌐
          </button>
        </div>
      </div>
    </header>
  )
}

