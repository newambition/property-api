import { useState, useEffect } from "react";
import apiClient from "../api";

const useApi = <T>(url: string, params: Record<string, any> = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<T>(url, { params });
        setData(response.data);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, JSON.stringify(params)]); // Re-fetch when URL or params change

  return { data, loading, error };
};

export default useApi;
