import { useState } from "react";
import Sidebar from "./components/Sidebar";
import MapComponent from "./components/MapComponent";
import type { SearchParams } from "./types/property";

function App() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    postcode: "BH15 1DA",
    street: "",
    radius: 1,
  });

  const handleSearch = (newParams: SearchParams) => {
    setSearchParams(newParams);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <Sidebar searchParams={searchParams} onSearch={handleSearch} />

      {/* Main Content Area - Map takes the rest of the space */}
      <main className="flex-1">
        <MapComponent searchParams={searchParams} />
      </main>
    </div>
  );
}

export default App;
