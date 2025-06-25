export interface SoldProperty {
  transaction_id: string; // Will be added later for unique keys
  price: number;
  date_of_transfer: string;
  postcode: string;
  property_type: string;
  new_build: boolean;
  tenure: string;
  address: string;
  // These will be needed for mapping
  latitude?: number;
  longitude?: number;
}

export interface EpcProperty {
  address: string;
  postcode: string;
  lodgement_date: string;
  uprn?: string;
  current_energy_rating: string;
  potential_energy_rating: string;
  total_floor_area_sqm?: number;
  property_type: string;
}
