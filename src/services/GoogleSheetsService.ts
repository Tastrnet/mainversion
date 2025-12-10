/**
 * Service for fetching restaurant data from Google Sheets
 * and calculating distances using the Haversine formula
 */

export interface Restaurant {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

export class GoogleSheetsService {
  /**
   * Calculate distance between two coordinates using the Haversine formula
   * Returns distance in kilometers
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Fetch restaurants from the spreadsheet data
   * This is dummy data structure - replace with actual spreadsheet API call
   */
  static async getRestaurants(): Promise<Restaurant[]> {
    /* 
     * DUMMY DATA FROM SPREADSHEET
     * Real data from: https://docs.google.com/spreadsheets/d/1qUdEGo0weYu35J26_vSxMd5s_9RWtZ5BMyavLMQrGJw/edit?gid=0#gid=0
     * TODO: Replace with actual Google Sheets API integration
     */
    return [
      { name: "Restaurant 1", address: "Address 1", latitude: 57.70584330000001, longitude: 13.0 },
      { name: "Restaurant 2", address: "Address 2", latitude: 55.59769069999999, longitude: 13.0 },
      { name: "Restaurant 3", address: "Address 3", latitude: 59.32931709999999, longitude: 13.0 },
      { name: "Restaurant 4", address: "Address 4", latitude: 55.59076169999999, longitude: 13.0 },
      { name: "Restaurant 5", address: "Address 5", latitude: 55.59610929999999, longitude: 13.0 },
      { name: "Restaurant 6", address: "Address 6", latitude: 55.60339339999999, longitude: 13.0 },
      { name: "Restaurant 7", address: "Address 7", latitude: 59.33902339999999, longitude: 13.0 },
      { name: "Restaurant 8", address: "Address 8", latitude: 55.61243570000001, longitude: 13.0 },
      { name: "Restaurant 9", address: "Address 9", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 10", address: "Address 10", latitude: 55.60383539999999, longitude: 13.0 },
      { name: "Restaurant 11", address: "Address 11", latitude: 55.60135039999999, longitude: 13.0 },
      { name: "Restaurant 12", address: "Address 12", latitude: 55.60669240000001, longitude: 13.0 },
      { name: "Restaurant 13", address: "Address 13", latitude: 55.59247879999999, longitude: 13.0 },
      { name: "Restaurant 14", address: "Address 14", latitude: 55.60513359999999, longitude: 13.0 },
      { name: "Restaurant 15", address: "Address 15", latitude: 56.67441299999999, longitude: 13.0 },
      { name: "Restaurant 16", address: "Address 16", latitude: 55.60736730000001, longitude: 13.0 },
      { name: "Restaurant 17", address: "Address 17", latitude: 55.60004370000001, longitude: 13.0 },
      { name: "Restaurant 18", address: "Address 18", latitude: 55.59809490000001, longitude: 13.0 },
      { name: "Restaurant 19", address: "Address 19", latitude: 55.59582709999999, longitude: 13.0 },
      { name: "Restaurant 20", address: "Address 20", latitude: 59.86628529999999, longitude: 13.0 },
      { name: "Restaurant 21", address: "Address 21", latitude: 55.59873779999999, longitude: 13.0 },
      { name: "Restaurant 22", address: "Address 22", latitude: 55.60531539999999, longitude: 13.0 },
      { name: "Restaurant 23", address: "Address 23", latitude: 55.60330159999999, longitude: 13.0 },
      { name: "Restaurant 24", address: "Address 24", latitude: 55.60587100000001, longitude: 13.0 },
      { name: "Restaurant 25", address: "Address 25", latitude: 55.58121879999999, longitude: 13.0 },
      { name: "Restaurant 26", address: "Address 26", latitude: 55.60513700000001, longitude: 13.0 },
      { name: "Restaurant 27", address: "Address 27", latitude: 55.60501679999999, longitude: 13.0 },
      { name: "Restaurant 28", address: "Address 28", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 29", address: "Address 29", latitude: 55.60339339999999, longitude: 13.0 },
      { name: "Restaurant 30", address: "Address 30", latitude: 58.03648159999999, longitude: 13.0 },
      { name: "Restaurant 31", address: "Address 31", latitude: 59.32371519999999, longitude: 13.0 },
      { name: "Restaurant 32", address: "Address 32", latitude: 59.33011990000001, longitude: 13.0 },
      { name: "Restaurant 33", address: "Address 33", latitude: 55.60339339999999, longitude: 13.0 },
      { name: "Restaurant 34", address: "Address 34", latitude: 59.32464449999999, longitude: 13.0 },
      { name: "Restaurant 35", address: "Address 35", latitude: 55.59171749999999, longitude: 13.0 },
      { name: "Restaurant 36", address: "Address 36", latitude: 59.34389599999999, longitude: 13.0 },
      { name: "Restaurant 37", address: "Address 37", latitude: 55.63626559999999, longitude: 13.0 },
      { name: "Restaurant 38", address: "Address 38", latitude: 55.60820649999999, longitude: 13.0 },
      { name: "Restaurant 39", address: "Address 39", latitude: 55.60509279999999, longitude: 13.0 },
      { name: "Restaurant 40", address: "Address 40", latitude: 55.60014779999999, longitude: 13.0 },
      { name: "Restaurant 41", address: "Address 41", latitude: 58.02496730000001, longitude: 13.0 },
      { name: "Restaurant 42", address: "Address 42", latitude: 55.61105629999999, longitude: 13.0 },
      { name: "Restaurant 43", address: "Address 43", latitude: 55.60135039999999, longitude: 13.0 },
      { name: "Restaurant 44", address: "Address 44", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 45", address: "Address 45", latitude: 59.32861279999999, longitude: 13.0 },
      { name: "Restaurant 46", address: "Address 46", latitude: 55.60361229999999, longitude: 13.0 },
      { name: "Restaurant 47", address: "Address 47", latitude: 55.61403259999999, longitude: 13.0 },
      { name: "Restaurant 48", address: "Address 48", latitude: 59.33035889999999, longitude: 13.0 },
      { name: "Restaurant 49", address: "Address 49", latitude: 55.59191980000001, longitude: 13.0 },
      { name: "Restaurant 50", address: "Address 50", latitude: 59.32467639999999, longitude: 13.0 },
      { name: "Restaurant 51", address: "Address 51", latitude: 59.33437799999999, longitude: 13.0 },
      { name: "Restaurant 52", address: "Address 52", latitude: 55.53043899999999, longitude: 13.0 },
      { name: "Restaurant 53", address: "Address 53", latitude: 55.60620669999999, longitude: 13.0 },
      { name: "Restaurant 54", address: "Address 54", latitude: 55.58866579999999, longitude: 13.0 },
      { name: "Restaurant 55", address: "Address 55", latitude: 59.32626610000001, longitude: 13.0 },
      { name: "Restaurant 56", address: "Address 56", latitude: 57.69253699999999, longitude: 13.0 },
      { name: "Restaurant 57", address: "Address 57", latitude: 55.57466239999999, longitude: 13.0 },
      { name: "Restaurant 58", address: "Address 58", latitude: 55.60526300000001, longitude: 13.0 },
      { name: "Restaurant 59", address: "Address 59", latitude: 55.60346610000001, longitude: 13.0 },
      { name: "Restaurant 60", address: "Address 60", latitude: 55.60592949999999, longitude: 13.0 },
      { name: "Restaurant 61", address: "Address 61", latitude: 55.59969710000001, longitude: 13.0 },
      { name: "Restaurant 62", address: "Address 62", latitude: 55.56202800000001, longitude: 13.0 },
      { name: "Restaurant 63", address: "Address 63", latitude: 55.59347820000001, longitude: 13.0 },
      { name: "Restaurant 64", address: "Address 64", latitude: 55.59934870000001, longitude: 13.0 },
      { name: "Restaurant 65", address: "Address 65", latitude: 55.57142349999999, longitude: 13.0 },
      { name: "Restaurant 66", address: "Address 66", latitude: 55.59873779999999, longitude: 13.0 },
      { name: "Restaurant 67", address: "Address 67", latitude: 59.32952270000001, longitude: 13.0 },
      { name: "Restaurant 68", address: "Address 68", latitude: 55.60789279999999, longitude: 13.0 },
      { name: "Restaurant 69", address: "Address 69", latitude: 55.60413800000001, longitude: 13.0 },
      { name: "Restaurant 70", address: "Address 70", latitude: 59.32532759999999, longitude: 13.0 },
      { name: "Restaurant 71", address: "Address 71", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 72", address: "Address 72", latitude: 55.60646329999999, longitude: 13.0 },
      { name: "Restaurant 73", address: "Address 73", latitude: 55.59505559999999, longitude: 13.0 },
      { name: "Restaurant 74", address: "Address 74", latitude: 55.58443339999999, longitude: 13.0 },
      { name: "Restaurant 75", address: "Address 75", latitude: 59.32394060000001, longitude: 13.0 },
      { name: "Restaurant 76", address: "Address 76", latitude: 55.59288669999999, longitude: 13.0 },
      { name: "Restaurant 77", address: "Address 77", latitude: 55.60501679999999, longitude: 13.0 },
      { name: "Restaurant 78", address: "Address 78", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 79", address: "Address 79", latitude: 55.59614877999999, longitude: 13.0 },
      { name: "Restaurant 80", address: "Address 80", latitude: 55.58981499999999, longitude: 13.0 },
      { name: "Restaurant 81", address: "Address 81", latitude: 55.58441149999999, longitude: 13.0 },
      { name: "Restaurant 82", address: "Address 82", latitude: 55.60257009999999, longitude: 13.0 },
      { name: "Restaurant 83", address: "Address 83", latitude: 64.75316769999999, longitude: 13.0 },
      { name: "Restaurant 84", address: "Address 84", latitude: 55.56054294979216, longitude: 13.0 },
      { name: "Restaurant 85", address: "Address 85", latitude: 55.59480139999999, longitude: 13.0 },
      { name: "Restaurant 86", address: "Address 86", latitude: 55.60728539999999, longitude: 13.0 },
      { name: "Restaurant 87", address: "Address 87", latitude: 55.60014779999999, longitude: 13.0 },
      { name: "Restaurant 88", address: "Address 88", latitude: 55.60162680000001, longitude: 13.0 },
      { name: "Restaurant 89", address: "Address 89", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 90", address: "Address 90", latitude: 55.56438009999999, longitude: 13.0 },
      { name: "Restaurant 91", address: "Address 91", latitude: 55.59678599999999, longitude: 13.0 },
      { name: "Restaurant 92", address: "Address 92", latitude: 55.61120589999999, longitude: 13.0 },
      { name: "Restaurant 93", address: "Address 93", latitude: 57.69920449999999, longitude: 13.0 },
      { name: "Restaurant 94", address: "Address 94", latitude: 55.59247879999999, longitude: 13.0 },
    ];
  }

  /**
   * Get restaurants sorted by distance from user location
   */
  static async getRestaurantsByDistance(
    userLat: number,
    userLon: number
  ): Promise<Restaurant[]> {
    const restaurants = await this.getRestaurants();

    // Calculate distance for each restaurant
    const restaurantsWithDistance = restaurants.map((restaurant) => ({
      ...restaurant,
      distance: this.calculateDistance(
        userLat,
        userLon,
        restaurant.latitude,
        restaurant.longitude
      ),
    }));

    // Sort by distance (closest first)
    return restaurantsWithDistance.sort((a, b) => a.distance! - b.distance!);
  }

  /**
   * Get the closest restaurant to user location
   */
  static async getClosestRestaurant(
    userLat: number,
    userLon: number
  ): Promise<Restaurant | null> {
    const restaurants = await this.getRestaurantsByDistance(userLat, userLon);
    return restaurants.length > 0 ? restaurants[0] : null;
  }
}
