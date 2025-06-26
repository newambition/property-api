import { useState, useEffect } from "react";
import type { SearchParams } from "../types/property";

interface SidebarProps {
  searchParams: SearchParams;
  onSearch: (params: SearchParams) => void;
}

const Sidebar = ({ searchParams, onSearch }: SidebarProps) => {
  const [formData, setFormData] = useState({
    postcode: searchParams.postcode,
    street: searchParams.street || "",
    radius: searchParams.radius.toString(),
  });

  // Update form data when searchParams change
  useEffect(() => {
    setFormData({
      postcode: searchParams.postcode,
      street: searchParams.street || "",
      radius: searchParams.radius.toString(),
    });
  }, [searchParams]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate postcode is not empty
    if (!formData.postcode.trim()) {
      alert("Please enter a postcode");
      return;
    }

    const newParams: SearchParams = {
      postcode: formData.postcode.trim(),
      street: formData.street.trim() || undefined,
      radius: parseFloat(formData.radius),
    };

    onSearch(newParams);
  };

  return (
    <aside className="w-80 h-full bg-white shadow-lg p-6 flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
        Property API
      </h1>

      {/* Search Form */}
      <form className="space-y-4" onSubmit={handleSearch}>
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
            value={formData.postcode}
            onChange={handleInputChange}
            placeholder="e.g. BH15 1DA"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
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
            value={formData.street}
            onChange={handleInputChange}
            placeholder="e.g. High Street"
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
            value={formData.radius}
            onChange={handleInputChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="0.5">0.5</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="5">5</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          Search
        </button>
      </form>

      <div className="mt-8 flex-grow border-t pt-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Current Search:</h3>
          <p className="text-sm text-gray-600">
            <strong>Postcode:</strong> {searchParams.postcode}
          </p>
          {searchParams.street && (
            <p className="text-sm text-gray-600">
              <strong>Street:</strong> {searchParams.street}
            </p>
          )}
          <p className="text-sm text-gray-600">
            <strong>Radius:</strong> {searchParams.radius} km
          </p>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Map data will be displayed here. Click on a property cluster to zoom
          in.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
