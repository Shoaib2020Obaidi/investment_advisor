import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  GeoJSON,
  Popup,
  WMSTileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import "../components/Wfs.css";
import L from "leaflet";

const angle_1 = L.latLng(52.09869878736497, 7.310838379199994);
const angle_2 = L.latLng(51.80913301576177, 7.84718257469464);
const bounds = L.latLngBounds(angle_1, angle_2);

let previouslyClickedLayer = null; // Global variable to track the previously clicked layer

const defaultStyle = {
  color: "#ffffff", // Default border color
  weight: 0.5, // Default border width
  fillColor: "#aadfff", // Default fill color
  fillOpacity: 0.5, // Default fill opacity
};

const highlightStyle = {
  color: "#ffffff",
  weight: 1,
  fillColor: "red",
  fillOpacity: 0.5,
};

const Dropdown = ({ onSelect }) => {
  const [showSlider, setShowSlider] = useState(false); // State to toggle slider visibility
  const [sliderValues, setSliderValues] = useState({
    beach: 1, // first slider
    restaurants: 1, // second slider
    cafes: 1, // third slider
  }); // Independent states for each slider

  const handleSliderChange = (name, value) => {
    const newValue = Math.min(Math.max(parseInt(value), 1), 5); // Clamp value between 1 and 5
    setSliderValues((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  return (
    <div
      style={{ position: "absolute", top: "20px", left: "50px", zIndex: 1000 }}
    >
      {/* Main Dropdown */}
      <label htmlFor="mainDropdown"></label>
   
      <select 
        id="mainDropdown"
        onChange={(e) => onSelect(e.target.value)}
        style={{
          padding: "13px",
          paddingRight: "15px",
          border: "1px solid #dfd",
          borderRadius: "4px",
          backgroundColor: "#fff",
          fontSize: "16px",
          color: "#fff",
          cursor: "pointer", 
          backgroundColor:"rgba(17, 149, 210, 0.59)"
        }}
      >
        <option value="">Select a Business Plan</option>
        <option value="restaurants">Restaurants</option>
        <option value="cafes">Cafes</option>
        <option value="bike_repair">Bike Repair Shop</option>
      </select>

      {/* Nested Dropdown */}
      <div style={{ marginTop: "10px", position: "relative" }}>
        <button
          onClick={() => setShowSlider(!showSlider)}
          style={{
            padding: "10px 20px",
            backgroundColor: "rgba(17, 149, 210, 0.59)",
            color: "#fff",
            border: "1px solid white",
            cursor: "pointer",
            borderRadius: "10px",
          }}
        >
          Adjust Preferences
        </button>

        {showSlider && (
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: "0",
              backgroundColor: "rgba(17, 149, 210, 0.59)",
              color: "#fff",
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "4px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              zIndex: 1001,
            }}
          >
            {/* Beach Slider */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="beachSlider" style={{ marginRight: "10px" }}>
                Near Beach
              </label>
              <input
                id="beachSlider"
                type="range"
                min="1"
                max="3"
                value={sliderValues.beach}
                onChange={(e) => handleSliderChange("beach", e.target.value)}
                style={{ width: "200px", cursor: "pointer"}}
              />
              <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                {sliderValues.beach}
              </span>
            </div>

            {/* Restaurants Slider */}
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="restaurantsSlider"
                style={{ marginRight: "10px" }}
              >
                Away from Crowd
              </label>
              <input
                id="restaurantsSlider"
                type="range"
                min="1"
                max="3"
                value={sliderValues.restaurants}
                onChange={(e) =>
                  handleSliderChange("restaurants", e.target.value)
                }
                style={{ width: "200px", cursor: "pointer" }}
              />
              <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                {sliderValues.restaurants}
              </span>
            </div>

            {/* Cafes Slider */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="cafesSlider" style={{ marginRight: "10px" }}>
                Close to City Center
              </label>
              <span>
                <input
                  id="cafesSlider"
                  type="range"
                  min="1"
                  max="3"
                  value={sliderValues.cafes}
                  onChange={(e) => handleSliderChange("cafes", e.target.value)}
                  style={{ width: "200px", cursor: "pointer" }}
                />
              </span>
              <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                {sliderValues.cafes}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Map = () => {
  const [selectedOption, setSelectedOption] = useState("");
  const [restaurantsData, setRestaurantsData] = useState(null);
  const [cafesData, setCafesData] = useState(null);
  const [bikeRepairData, setBikeRepairData] = useState(null);
  const mapRef = useRef();
  const [munsterDistricts, setMunsterDistricts] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const [showMunsterDistricts, setShowMunsterDistricts] = useState(true);
  const [showRestaurants, setShowRestaurants] = useState(false);
  const [showCafes, setShowCafes] = useState(false);
  const [showBikeRepair, setShowBikeRepair] = useState(false);

  const restaurantIcon = new L.Icon({
    iconUrl: "/icons/restaurant.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const cafeIcon = new L.Icon({
    iconUrl: "/icons/cafe.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const bikeIcon = new L.Icon({
    iconUrl: "/icons/cycling.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const busStopIcon = new L.Icon({
    iconUrl: "/icons/bus-stop.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const houseIcon = new L.Icon({
    iconUrl: "/icons/house.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const fastfoodIcon = new L.Icon({
    iconUrl: "/icons/fast-food.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  const supermarketIcon = new L.Icon({
    iconUrl: "/icons/grocery-cart.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
  
  const scoolIcon = new L.Icon({
    iconUrl: "/icons/school.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

  
  useEffect(() => {
    fetch("http://localhost:4000/api/districts")
      .then((response) => response.json())
      .then((data) => {
        setMunsterDistricts(data);
      })
      .catch((error) => {
        console.error("Error fetching district data:", error);
      });
  }, []);

  useEffect(() => {
    fetch("http://localhost:4000/api/districts/restaurants")
      .then((response) => response.json())
      .then((data) => {
        if (data && data.type === "Feature") {
          setRestaurantsData({ type: "FeatureCollection", features: [data] });
        } else {
          setRestaurantsData(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching restaurants data:", error);
      });
  }, []);

  useEffect(() => {
    fetch("http://localhost:4000/api/districts/Cafes")
      .then((response) => response.json())
      .then((data) => {
        if (data && data.type === "Feature") {
          setCafesData({ type: "FeatureCollection", features: [data] });
        } else {
          setCafesData(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching cafes data:", error);
      });
  }, []);

  useEffect(() => {
    fetch("http://localhost:4000/api/districts/bikerepair")
      .then((response) => response.json())
      .then((data) => {
        if (data && data.type === "Feature") {
          setBikeRepairData({ type: "FeatureCollection", features: [data] });
        } else {
          setBikeRepairData(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching bike repair data:", error);
      });
  }, []);

  const handleDropdownChange = (value) => {
    setSelectedOption(value);
    let bounds = null;

    if (value === "restaurants" && restaurantsData) {
      setShowMunsterDistricts(false);
      setShowRestaurants(true);
      setShowCafes(false);
      setShowBikeRepair(false);
      bounds = L.geoJSON(restaurantsData).getBounds();
    } else if (value === "cafes" && cafesData) {
      setShowMunsterDistricts(false);
      setShowCafes(true);
      setShowRestaurants(false);
      setShowBikeRepair(false);
      bounds = L.geoJSON(cafesData).getBounds();
    } else if (value === "bike_repair" && bikeRepairData) {
      setShowMunsterDistricts(false);
      setShowBikeRepair(true);
      setShowRestaurants(false);
      setShowCafes(false);
      bounds = L.geoJSON(bikeRepairData).getBounds();
    } else {
      setShowMunsterDistricts(true);
      setShowRestaurants(false);
      setShowCafes(false);
      setShowBikeRepair(false);
      bounds = L.geoJSON(munsterDistricts).getBounds();
    }

    if (bounds && mapRef.current) {
      mapRef.current.flyToBounds(bounds, { duration: 1.5 });
    }
  };

  const handleDistrictClick = (e) => {
    const feature = e.target.feature;
    let popupContent = "";

    // Check if the feature is a polygon (district) or a point (business)
    if (
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon"
    ) {
      // Handle district polygons
      setSelectedFeature({
        district: {
          attraction_site_count: feature.properties.attraction_site_count,
          bakeries_count: feature.properties.bakeries_count,
          cafesCount: feature.properties.cafes_count,
          busStopCount: feature.properties.bus_stops_count,
          childrenpgroundCount: feature.properties.children_pground_count,
          sportFacilityCount: feature.properties.sport_facilities_count,
          vending_parkings_count: feature.properties.vending_parkings_count,
          schools_count: feature.properties.schools_count,
          houses_count: feature.properties.houses_count,
          bicycle_count: feature.properties.bicycle_count,
          gov_offices_count: feature.properties.gov_offices_count,
          fast_food_count: feature.properties.fast_food_count,
          restaurant_count: feature.properties.restaurant_count,
          supermarketCount: feature.properties.supermarket_count,
          Population: feature.properties.district_population,
          Area: feature.properties.area,
          district_name: feature.properties.district_name,
          TotalSum: feature.properties.total_sum
        },
        restaurant: null,
      });

      let total_sum = feature.properties.total_sum;

if (typeof total_sum === 'undefined' || total_sum === null) {
    total_sum = 0; // Set a default value if undefined or null
} else {
    total_sum = parseFloat(total_sum).toFixed(1); // Ensure it's a number and format it
}
      popupContent = `
  <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
    <tr>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Property</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Value</th>
    </tr>
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">District Name</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${feature.properties.district_name}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Weight</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${total_sum}</td>
    </tr>
</table>

`;
    } else if (feature.geometry.type === "Point") {
      // Handle point features like restaurants, cafes, bike repair, etc.
      setSelectedFeature({
        district: null,
        restaurant: feature.properties,
      });

      // Conditionally show popup content based on feature properties
      if (feature.properties.fast_food_name) {
        popupContent = `
          <div style="text-align: center;">
    <strong>Fast Food Name:</strong> ${
      feature.properties.fast_food_name || "N/A"
    }<br>
          <br>
    <img src="/icons/fast-food.png" alt="Bus Stop Icon" style="width: 70px; height: auto; margin-bottom: 8px;">
  </div>
  
        `;
      } else if (feature.properties.site_name) {
        popupContent = `
                    <div style="text-align: center;">
          <strong>Attraction Site Name:</strong> ${
            feature.properties.site_name || "N/A"
          }<br>
          <br>
    <img src="/icons/landmark.png" alt="Bus Stop Icon" style="width: 70px; height: auto; margin-bottom: 8px;">
  </div>

        `;
      } else if (feature.properties.cafe_name) {
        // Default content for unknown point types
        popupContent = `
  <div style="text-align: center;">
    <strong>Cafe Name:</strong> ${feature.properties.cafe_name || "N/A"}<br><br>
    <img src="/icons/cafe.png" alt="Cafe Icon" style="display: block; margin: 0 auto; width: 70px; height: auto; margin-bottom: 8px;">
  </div>
`;
      } else if (feature.properties.bus_stop_name) {
        // Default content for unknown point types
        popupContent = `
  <div style="text-align: center;">
    <strong>Bus Stop:</strong> ${
      feature.properties.bus_stop_name || "N/A"
    }<br><br>
    <img src="/icons/bus-stop.png" alt="Bus Stop Icon" style="width: 70px; height: auto; margin-bottom: 8px;">
  </div>
`;
      } else if (feature.properties.house_type) {
        // Default content for unknown point types
        popupContent = `
        <div style="text-align: center;">
    <strong>House:</strong> ${feature.properties.house_type || "N/A"}<br>
          <br>
    <img src="/icons/house.png" alt="Bus Stop Icon" style="width: 70px; height: auto; margin-bottom: 8px;">
  </div>
       
        `;
      } else if (feature.properties.supermarket_name) {
        // Default content for unknown point types
        popupContent = `
        <div style="text-align: center;">
    <strong>House:</strong> ${feature.properties.supermarket_name || "N/A"}<br>
          <br>
    <img src="/icons/grocery-cart.png" alt="Bus Stop Icon" style="width: 70px; height: auto; margin-bottom: 8px;">
  </div>
       
        `;
      }
    }

    // Bind the popup with the appropriate content
    e.target.bindPopup(popupContent).openPopup();
  };

  return (
    <div style={{ display: "flex" }}>
      <MapContainer
        center={[51.95454969797575, 7.62324550202594]}
        maxBoundsViscosity={1.0}
        maxBounds={bounds}
        zoom={11}
        minZoom={11}
        style={{ height: "100vh", width: "90%" }}
        ref={mapRef}
      >
        <LayersControl
          position="topright"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <LayersControl.BaseLayer checked name="ESRI Map">
            <TileLayer
              style={{ cursor: "pointer" }}
              attribution="Investment Advisor App Built by: Shoaib | Zuhal | Srinivas"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Google Maps">
            <TileLayer
              style={{ cursor: "pointer" }}
              attribution="Investment Advisor App Built by: Shoaib | Zuhal | Srinivas"
              url="http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Black Map">
            <TileLayer
              attribution="Investment Advisor App Built by: Shoaib | Zuhal | Srinivas"
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="No Base">
            <TileLayer
              attribution="Investment Advisor App Built by: Shoaib | Zuhal | Srinivas"
              url=""
            />
          </LayersControl.BaseLayer>

          {showMunsterDistricts && munsterDistricts && (
            <LayersControl.Overlay checked name="Munster Districts">
              <GeoJSON
                data={munsterDistricts}
                style={defaultStyle}
                onEachFeature={(feature, layer) => {
                  // Bind the popup or other default functionality
                  layer.bindPopup(
                    `<strong>District Name:</strong> ${feature.properties.district_name}<br>
                    <strong>Population:</strong> ${feature.properties.district_population}`
                  );

                  // Add click event listener to handle style changes
                  layer.on("click", (e) => {
                    const clickedLayer = e.target;

                    // Reset the style of the previously clicked layer
                    if (previouslyClickedLayer) {
                      previouslyClickedLayer.setStyle(defaultStyle);
                    }

                    // Highlight the newly clicked layer
                    clickedLayer.setStyle(highlightStyle);

                    // Bring the popup to the front
                    clickedLayer.openPopup();

                    // Call the handleDistrictClick function
                    handleDistrictClick(e);

                    // Update the reference to the currently clicked layer
                    previouslyClickedLayer = clickedLayer;
                  });
                }}
              />
            </LayersControl.Overlay>
          )}

          {showRestaurants && restaurantsData && (
            <LayersControl.Overlay checked name="Restaurants">
            <GeoJSON
              data={restaurantsData}
              pointToLayer={(feature, latlng) => {
                // Define a variable for the icon
                let icon = null;
          
                // Conditionally set the icon based on feature properties
                if (feature.properties.bike_shop_name) {
                  icon = bikeIcon; // Use the bikeIcon if it's a bike shop
                } else if (feature.properties.cafe_name) {
                  icon = cafeIcon; // Use the cafeIcon if it's a cafe
                } else if (feature.properties.restaurant_name) {
                  icon = restaurantIcon; // Use the restaurantIcon if it's a restaurant
                } else if (feature.properties.house_type) {
                  icon = houseIcon; // Use the houseIcon if it's a house
                } else if (feature.properties.bus_stop_name) {
                  icon = busStopIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.fast_food_name) {
                  icon = fastfoodIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.supermarket_name) {
                  icon = supermarketIcon; // Use the busStopIcon if it's a bus stop
                } 

                // Only create a marker if an icon is defined
                if (icon) {
                  return L.marker(latlng, { icon: icon });
                }
          
                // If no icon is defined, return null (meaning no marker)
                return null;
              }}
              onEachFeature={(feature, layer) => {
                layer.on({ click: handleDistrictClick });
              }}
            />
          </LayersControl.Overlay>
          
          )}

          {showCafes && cafesData && (
            <LayersControl.Overlay checked name="Cafes">
            <GeoJSON
              data={cafesData}
              pointToLayer={(feature, latlng) => {
                // Define the icon as null initially
                let icon = null;
          
                // Conditionally set the icon based on feature properties
                if (feature.properties.bike_shop_name) {
                  icon = bikeIcon; // Use the bikeIcon if it's a bike shop
                } else if (feature.properties.cafe_name) {
                  icon = cafeIcon; // Use the cafeIcon if it's a cafe
                } else if (feature.properties.restaurant_name) {
                  icon = restaurantIcon; // Use the restaurantIcon if it's a restaurant
                } else if (feature.properties.house_type) {
                  icon = houseIcon; // Use the houseIcon if it's a house
                } else if (feature.properties.bus_stop_name) {
                  icon = busStopIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.fast_food_name) {
                  icon = fastfoodIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.supermarket_name) {
                  icon = supermarketIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.schools_count) {
                  icon = scoolIcon; // Use the busStopIcon if it's a bus stop
                }
          
                // Only create a marker if the icon is defined
                if (icon) {
                  return L.marker(latlng, { icon: icon });
                }
          
                // If no icon is found, return null (meaning no marker)
                return null;
              }}
              onEachFeature={(feature, layer) => {
                layer.on({ click: handleDistrictClick });
              }}
            />
          </LayersControl.Overlay>
          
          
          )}

          {showBikeRepair && bikeRepairData && (
            <LayersControl.Overlay checked name="Bike Repair Shops">
            <GeoJSON
              data={bikeRepairData}
              pointToLayer={(feature, latlng) => {
                // Define the icon as null initially
                let icon = null;
          
                // Conditionally set the icon based on feature properties
                if (feature.properties.bike_shop_name) {
                  icon = bikeIcon; // Use the bikeIcon if it's a bike shop
                } else if (feature.properties.cafe_name) {
                  icon = cafeIcon; // Use the cafeIcon if it's a cafe
                } else if (feature.properties.restaurant_name) {
                  icon = restaurantIcon; // Use the restaurantIcon if it's a restaurant
                } else if (feature.properties.house_type) {
                  icon = houseIcon; // Use the houseIcon if it's a house
                } else if (feature.properties.bus_stop_name) {
                  icon = busStopIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.fast_food_name) {
                  icon = fastfoodIcon; // Use the busStopIcon if it's a bus stop
                } else if (feature.properties.supermarket_name) {
                  icon = supermarketIcon; // Use the busStopIcon if it's a bus stop
                } 

                // Only create a marker if the icon is defined
                if (icon) {
                  return L.marker(latlng, { icon: icon });
                }
          
                // If no icon is found, return null (meaning no marker)
                return null;
              }}
              onEachFeature={(feature, layer) => {
                layer.on({ click: handleDistrictClick });
              }}
            />
          </LayersControl.Overlay>
          
          )}
          <LayersControl.Overlay name="Attraction Sites">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:attraction_sites"}
              format="image/png"
              zIndex={10000}
            />
          </LayersControl.Overlay>

          {/* Green Spaces Map Features */}
          <LayersControl.Overlay name="Green Spaces">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:green_spaces"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Hotels Map Features */}
          <LayersControl.Overlay
            name="Hotels"
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "left",
            }}
          >
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:hotels"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Houses Map Features */}
          <LayersControl.Overlay name="Houses">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:houses"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Fast Food Map Features */}
          <LayersControl.Overlay name="Fast Foods">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="1.1.0"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:fast_foods"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Parkings Map Features */}
          <LayersControl.Overlay name="Parkings">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:parkings"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Parks Map Features */}
          <LayersControl.Overlay name="Parks">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:parks"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Restaurants Map Features */}
          <LayersControl.Overlay name="Restaurants">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:restaurants"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Supermarkets Map Features */}
          <LayersControl.Overlay name="Supermarkets">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:supermarkets"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Vending Parkings Map Features */}
          <LayersControl.Overlay name="Vending Parkings">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:vending_parkings"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>

          {/* Waters Map Features */}
          <LayersControl.Overlay name="Waters">
            <WMSTileLayer
              url="http://localhost:8081/geoserver/investor_advisor/wms?"
              version="2.14.2"
              opacity={1}
              transparent={true}
              srs="EPSG:25832"
              layers={"investor_advisor:waters"}
              format="image/png"
              zIndex={11}
            />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      <Sidebar featureDetails={selectedFeature} />
      <Dropdown onSelect={handleDropdownChange} />
    </div>
  );
};

export default Map;
