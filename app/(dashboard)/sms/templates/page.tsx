export default function TemplatesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">SMS Templates</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">SMS Templates</h2>
          <button className="text-blue-500 hover:text-blue-600 hover:underline">
            Click here to add your first SMS template
          </button>
        </div>
      </div>
    </div>
  )
}

