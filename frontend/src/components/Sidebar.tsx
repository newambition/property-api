const Sidebar = () => {
  return (
    <aside className="w-80 h-full bg-white shadow-lg p-6 flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
        Property API
      </h1>

      {/* Search Form - Placeholder for future functionality */}
      <form className="space-y-4">
        <div>
          <label
            htmlFor="postcode"
            className="block text-sm font-medium text-gray-700"
          >
            Postcode
          </label>
          <input
            type="text"
            id="postcode"
            name="postcode"
            defaultValue="BH15 1DA" // Default Poole town center postcode
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="street"
            className="block text-sm font-medium text-gray-700"
          >
            Street Name (Optional)
          </label>
          <input
            type="text"
            id="street"
            name="street"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="radius"
            className="block text-sm font-medium text-gray-700"
          >
            Radius (km)
          </label>
          <select
            id="radius"
            name="radius"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0.5</option>
            <option selected>1</option>
            <option>2</option>
            <option>5</option>
          </select>
        </div>

        <button
          type="submit"
          disabled // Disabled for now
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          Search
        </button>
      </form>

      <div className="mt-8 flex-grow border-t pt-4">
        <p className="text-sm text-gray-500">
          Map data will be displayed here. Click on a property cluster to zoom
          in.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
