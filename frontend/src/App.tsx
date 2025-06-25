import Sidebar from "./components/Sidebar";
import MapComponent from "./components/MapComponent";

function App() {
  return (
    <div className="flex h-screen w-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area - Map takes the rest of the space */}
      <main className="flex-1">
        <MapComponent />
      </main>
    </div>
  );
}

export default App;
