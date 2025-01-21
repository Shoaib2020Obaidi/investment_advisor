import React, { useState, useEffect } from "react";
import "./Sidebar.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Sidebar = ({ featureDetails }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const hardcodedDistrict = {
    TotalDistricts: "502",
    TotalPopulation: 322915,
    TotalArea: 303107000.1,
  };

  // Initial values
  const dummyCounts = {
    attraction_site_count: 12,
    bakeries_count: 134,
    cafescount: 156,
    busstopscount: 1367,
    childrenpgroundCount: 341,
    sportFacilityCount: 225,
    vending_parkings_count: 41,
    schools_count: 101,
    houses_count: 56207,
    bicycle_count: 46,
    gov_offices_count: 57,
    fast_food_count: 163,
    restaurant_count: 257,
    supermarket_count: 88,
    TotalSum: 0,
  };

  const counts = featureDetails?.district || dummyCounts;

  const handleDistrictClick = () => {
    setSelectedDistrict(
      featureDetails?.district?.district_name || "District Name"
    );
    setShowPopup(true);
  };

  const population =
    featureDetails?.district?.Population || hardcodedDistrict.TotalPopulation;
  const area = featureDetails?.district?.Area || hardcodedDistrict.TotalArea;

  const filteredCounts = Object.keys(counts)
    .filter(
      (key) => key !== "Population" && key !== "Area" && key !== "district_name"
    )
    .reduce((obj, key) => {
      obj[key] = counts[key];
      return obj;
    }, {});

  useEffect(() => {
    if (featureDetails?.district) {
      setSelectedDistrict(featureDetails.district.district_name);
    }
  }, [featureDetails]);

  return (
    <div className="sidebar">
      <h3
        className="sidebar-title"
        onClick={handleDistrictClick}
        style={{ cursor: "pointer" }}
      >
        Münster District Overview
      </h3>
      <div className="sidebar-item">
        <strong>Total Districts</strong>
        <span className="sidebar-value">
          {hardcodedDistrict.TotalDistricts}
        </span>
      </div>
      <div className="sidebar-item">
        <strong>Total Population</strong>
        <span className="sidebar-value">
          {hardcodedDistrict.TotalPopulation}
        </span>
      </div>
      <div className="sidebar-item">
        <strong>Total Area</strong>
        <span className="sidebar-value">303107.1</span>
      </div>

      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <h4>{selectedDistrict}</h4>
            <button onClick={() => setShowPopup(false)}>Close</button>
          </div>
        </div>
      )}

      <divider></divider>
      {/* <h3 className="district_feature_info_txt">District Feature Information</h3> */}

      <div className="scrollable-table">
        <table className="count-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(filteredCounts).map((key, index) => (
              <tr key={index}>
                <td>
                  {key
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/^\w/, (c) => c.toUpperCase())}
                </td>
                <td>{filteredCounts[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="charts-container"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div className="chart-item" style={{ width: "90%", height: "130px" }}>
          <h4 className="chart-title">Population and Area</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={[
                { name: "Population", Value: population },
                { name: "Area (m²)", Value: (area / 1000).toFixed(1) }, // Use "m²" for proper formatting
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Value" fill="#39aade" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
