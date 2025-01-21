const express = require("express");
const path = require("path");
const db = require("./database");
const app = express();
const PORT = process.env.PORT || 4000;
const cors = require("cors");

// Enable CORS for all origins
app.use(cors());

// Serve static files from the React app build
app.get("/api/districts", async (req, res) => {
  try {
    const query = `
      SELECT 
        jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object(
            'type', CASE 
                      WHEN ST_GeometryType(geom) = 'ST_Polygon' THEN 'Polygon' 
                      ELSE 'MultiPolygon' 
                    END,
            'coordinates', COALESCE((ST_AsGeoJSON(ST_Transform(ST_MakeValid(geom), 4326))::jsonb)->'coordinates', '[]')
          ),
          'properties', jsonb_build_object(
            'district_name', district_name,
            'area', area,
            'attraction_site_count', attraction_site_count,
            'bakeries_count', bakeries_count,
            'cafes_count', cafes_count,
            'bus_stops_count', bus_stop_count,
            'children_pground_count', children_pground_count,
            'gov_offices_count', gov_offices_count,
            'hotels_count', hotels_count,
            'vending_parkings_count', vending_parkings_count,
            'schools_count', schools_count,
            'sport_facilities_count', sport_facilities_count,
            'supermarket_count', supermarket_count,
            'houses_count',houses_count,
            'restaurant_count',restaurant_count,
            'fast_food_count',fast_food_count,
            'bicycle_count',bicycle_count,

            'district_population', district_population  -- Added the district_population column
          )
        ) AS geojson
      FROM munster_districts
      WHERE ST_IsValid(geom);
    `;

    const { rows } = await db.query(query);

    const cleanGeoJSON = (geojson) => {
      if (geojson.geometry && geojson.geometry.coordinates) {
        geojson.geometry.coordinates = geojson.geometry.coordinates.map(
          (polygon) =>
            polygon.map((ring) =>
              ring.filter(
                (point) =>
                  point.length === 2 &&
                  point[1] >= -90 &&
                  point[1] <= 90 &&
                  point[0] >= -180 &&
                  point[0] <= 180
              )
            )
        );
      }
      return geojson;
    };

    if (rows.length > 0) {
      const featureCollection = {
        type: "FeatureCollection",
        features: rows.map((row) => cleanGeoJSON(row.geojson)),
      };
      res.json(featureCollection);
    } else {
      res.status(404).json({ error: "No data found" });
    }
  } catch (error) {
    console.error("Database query failed:", error);
    res.status(500).json({ error: "Failed to fetch district data" });
  }
});

// API endpoint to get top district by total sum of scores
app.get("/api/districts/Cafes", async (req, res) => {
  try {
    const result = await db.query(`
        WITH selected_polygon AS (
    SELECT 
        ST_Transform(ST_SetSRID(geom, 25832), 4326) AS geom, 
        district_name, area, 
    (COALESCE(arts_center_score, 0) * 4 + COALESCE(beauty_shop_score, 0) * 3 + COALESCE(bookshop_score, 0) * 4 + 
     COALESCE(cinema_score, 0) * 5 + COALESCE(college_score, 0) * 5 + COALESCE(library_score, 0) * 6 + 
     COALESCE(museum_score, 0) * 2 + COALESCE(university_score, 0) * 5 + COALESCE(zoo_score, 0) * 2 + 
     COALESCE(attraction_site_score, 0) * 4 + COALESCE(bakeries_score, 0) * 1 + COALESCE(bicycle_shop_score, 0) * 1 + 
     COALESCE(bus_stops_score, 0) * 2 + COALESCE(cafes_score, 0) * -2 + COALESCE(fast_food_score, 0) * 4 + 
     COALESCE(restaurant_score, 0) * 5 + COALESCE(supermarket_score, 0) * 1 + COALESCE(vending_parkings_score, 0) * 1 + 
     COALESCE(children_pground_score, 0) * 2 + COALESCE(schools_score, 0) * 4 + COALESCE(sport_facilities_score, 0) * 4 + 
     COALESCE(hotels_score, 0) * 5 + COALESCE(gov_offices_score, 0) * 6 + COALESCE(road_score, 0) * 3 + 
     COALESCE(cycleways_score, 0) * 1 + COALESCE(parkings_score, 0) * 2 + COALESCE(parks_score, 0) * 3 + 
     COALESCE(streams_score, 0) * 2 + COALESCE(population_score, 0) * 10) AS total_sum,
        cafes_count, hotels_count, houses_count, bicycle_count, 
        schools_count, bus_stop_count, fast_food_count, restaurant_count, 
        gov_offices_count, supermarket_count, district_population,
        attraction_site_count, children_pground_count, sport_facilities_count,
        vending_parkings_count
    FROM munster_districts
	WHERE district_name != '5001-145'
    ORDER BY total_sum DESC
    LIMIT 3
),
houses_within_polygon AS (
    SELECT 
        h.gid AS house_id, 
        h.district_n AS house_type, 
        ST_Transform(ST_SetSRID(h.geom, 25832), 4326) AS geom
    FROM houses h
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(h.geom, 25832), 4326))
),
children_playgrounds_within_polygon AS (
    SELECT 
        p.gid AS playground_id, 
        p.name, 
        ST_Transform(ST_SetSRID(p.geom, 4326), 4326) AS geom
    FROM children_playground p
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(p.geom, 4326), 4326))
),
vending_parkings_within_polygon AS (
    SELECT 
        v.gid AS vending_parking_id, 
        v.name, 
        ST_Transform(ST_SetSRID(v.geom, 4326), 4326) AS geom
    FROM vending_parkings v
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(v.geom, 4326), 4326))
),
bicycle_shops_within_polygon AS (
    SELECT 
        b.gid AS bicycle_shop_id, 
        b.name, 
        ST_Transform(ST_SetSRID(b.geom, 4326), 4326) AS geom
    FROM bicycle_shops b
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(b.geom, 4326), 4326))
),
supermarkets_within_polygon AS (
    SELECT 
        s.gid AS supermarket_id, 
        s.name, 
        ST_Transform(ST_SetSRID(s.geom, 4326), 4326) AS geom
    FROM supermarkets s
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(s.geom, 4326), 4326))
),
restaurants_within_polygon AS (
    SELECT 
        r.gid AS restaurant_id, 
        r.name, 
        ST_Transform(ST_SetSRID(r.geom, 4326), 4326) AS geom
    FROM restaurants r
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(r.geom, 4326), 4326))
),
bakeries_within_polygon AS (
    SELECT 
        b.gid AS bakery_id, 
        b.name, 
        ST_Transform(ST_SetSRID(b.geom, 4326), 4326) AS geom
    FROM bakeries b
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(b.geom, 4326), 4326))
),
cafes_within_polygon AS (
    SELECT 
        c.gid AS cafe_id, 
        c.name, 
        ST_Transform(ST_SetSRID(c.geom, 4326), 4326) AS geom
    FROM cafes c
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(c.geom, 4326), 4326))
),
bus_stops_within_polygon AS (
    SELECT 
        bs.gid AS bus_stop_id, 
        bs.name, 
        ST_Transform(ST_SetSRID(bs.geom, 4326), 4326) AS geom
    FROM bus_stops bs
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(bs.geom, 4326), 4326))
)
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(features)
) AS geojson
FROM (
    -- Selected Polygon (District Area)
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Polygon',
            'coordinates', 
                CASE
                    WHEN ST_GeometryType(sp.geom) = 'ST_Polygon' THEN 
                        (ST_AsGeoJSON(sp.geom)::jsonb)->'coordinates'
                    WHEN ST_GeometryType(sp.geom) = 'ST_MultiPolygon' THEN 
                        (ST_AsGeoJSON(sp.geom)::jsonb)->'coordinates'->0
                    ELSE '[]'
                END
        ),
        'properties', jsonb_build_object(
            'district_name', sp.district_name,
            'area', sp.area,
            'total_sum', sp.total_sum,
            'cafes_count', sp.cafes_count,
            'hotels_count', sp.hotels_count,
            'houses_count', sp.houses_count,
            'bicycle_count', sp.bicycle_count,
            'schools_count', sp.schools_count,
            'bus_stop_count', sp.bus_stop_count,
            'fast_food_count', sp.fast_food_count,
            'restaurant_count', sp.restaurant_count,
            'gov_offices_count', sp.gov_offices_count,
            'supermarket_count', sp.supermarket_count,
            'district_population', sp.district_population,
            'attraction_site_count', sp.attraction_site_count,
            'children_pground_count', sp.children_pground_count,
            'sport_facilities_count', sp.sport_facilities_count,
            'vending_parkings_count', sp.vending_parkings_count
        )
    ) AS features
    FROM selected_polygon sp
    
    UNION ALL

    -- Houses (Limited to 10)
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(h.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'house_id', h.house_id,
            'house_type', h.house_type
        )
    ) AS features
    FROM houses_within_polygon h

    UNION ALL

    -- Playgrounds (Using ST_Intersects)
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(p.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'playground_id', p.playground_id,
            'playground_name', p.name
        )
    ) AS features
    FROM children_playgrounds_within_polygon p

    UNION ALL

    -- Vending Parkings
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(v.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'vending_parking_id', v.vending_parking_id,
            'vending_parking_name', v.name
        )
    ) AS features
    FROM vending_parkings_within_polygon v

    UNION ALL

    -- Bicycle Shops
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(b.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bicycle_shop_id', b.bicycle_shop_id,
            'bicycle_shop_name', b.name
        )
    ) AS features
    FROM bicycle_shops_within_polygon b

    UNION ALL

    -- Supermarkets
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(s.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'supermarket_id', s.supermarket_id,
            'supermarket_name', s.name
        )
    ) AS features
    FROM supermarkets_within_polygon s

    UNION ALL

    -- Restaurants
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(r.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'restaurant_id', r.restaurant_id,
            'restaurant_name', r.name
        )
    ) AS features
    FROM restaurants_within_polygon r

    UNION ALL

    -- Bakeries
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(b.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bakery_id', b.bakery_id,
            'bakery_name', b.name
        )
    ) AS features
    FROM bakeries_within_polygon b

    UNION ALL

    -- Cafes
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(c.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'cafe_id', c.cafe_id,
            'cafe_name', c.name
        )
    ) AS features
    FROM cafes_within_polygon c

    UNION ALL

    -- Bus Stops
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(bs.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bus_stop_id', bs.bus_stop_id,
            'bus_stop_name', bs.name
        )
    ) AS features
    FROM bus_stops_within_polygon bs
) features;
      `);

    const geojson = result.rows[0].geojson;
    res.json(geojson);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/districts/restaurants", async (req, res) => {
  try {
    const result = await db.query(`
WITH selected_polygon AS (
    SELECT 
        ST_Transform(ST_SetSRID(geom, 25832), 4326) AS geom, 
        district_name, area, 
        (COALESCE(arts_center_score, 0) * 6 + COALESCE(beauty_shop_score, 0) * 2 + COALESCE(bookshop_score, 0) * 2 + 
     	COALESCE(cinema_score, 0) * 5 + COALESCE(college_score, 0) * 3 + COALESCE(library_score, 0) * 3 + 
     	COALESCE(museum_score, 0) * 3 + COALESCE(university_score, 0) * 3 + COALESCE(zoo_score, 0) * 3 + 
     	COALESCE(attraction_site_score, 0) * 5 + COALESCE(bakeries_score, 0) * 2 + COALESCE(bicycle_shop_score, 0) * 1 + 
     	COALESCE(bus_stops_score, 0) * 3 + COALESCE(cafes_score, 0) * 4 + COALESCE(fast_food_score, 0) * 1 + 
     	COALESCE(restaurant_score, 0) * 3 + COALESCE(supermarket_score, 0) * 2 + COALESCE(vending_parkings_score, 0) * 1 + 
     	COALESCE(children_pground_score, 0) * 3 + COALESCE(schools_score, 0) * 2 + COALESCE(sport_facilities_score, 0) * 3 + 
     	COALESCE(hotels_score, 0) * 6 + COALESCE(gov_offices_score, 0) * 6 + COALESCE(road_score, 0) * 4 + 
     	COALESCE(cycleways_score, 0) * 2 + COALESCE(parkings_score, 0) * 4 + COALESCE(parks_score, 0) * 4 + 
     	COALESCE(streams_score, 0) * 5 + COALESCE(population_score, 0) * 10) AS total_sum,
        cafes_count, hotels_count, houses_count, bicycle_count, 
        schools_count, bus_stop_count, fast_food_count, restaurant_count, 
        gov_offices_count, supermarket_count, district_population,
        attraction_site_count, children_pground_count, sport_facilities_count,
        vending_parkings_count
    FROM munster_districts
    ORDER BY total_sum DESC
    LIMIT 3
),
houses_within_polygon AS (
    SELECT 
        h.gid AS house_id, 
        h.district_n AS house_type, 
        ST_Transform(ST_SetSRID(h.geom, 25832), 4326) AS geom
    FROM houses h
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(h.geom, 25832), 4326))
),
children_playgrounds_within_polygon AS (
    SELECT 
        p.gid AS playground_id, 
        p.name, 
        ST_Transform(ST_SetSRID(p.geom, 4326), 4326) AS geom
    FROM children_playground p
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(p.geom, 4326), 4326))
),
vending_parkings_within_polygon AS (
    SELECT 
        v.gid AS vending_parking_id, 
        v.name, 
        ST_Transform(ST_SetSRID(v.geom, 4326), 4326) AS geom
    FROM vending_parkings v
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(v.geom, 4326), 4326))
),
bicycle_shops_within_polygon AS (
    SELECT 
        b.gid AS bicycle_shop_id, 
        b.name, 
        ST_Transform(ST_SetSRID(b.geom, 4326), 4326) AS geom
    FROM bicycle_shops b
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(b.geom, 4326), 4326))
),
supermarkets_within_polygon AS (
    SELECT 
        s.gid AS supermarket_id, 
        s.name, 
        ST_Transform(ST_SetSRID(s.geom, 4326), 4326) AS geom
    FROM supermarkets s
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(s.geom, 4326), 4326))
),
restaurants_within_polygon AS (
    SELECT 
        r.gid AS restaurant_id, 
        r.name, 
        ST_Transform(ST_SetSRID(r.geom, 4326), 4326) AS geom
    FROM restaurants r
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(r.geom, 4326), 4326))
),
bakeries_within_polygon AS (
    SELECT 
        b.gid AS bakery_id, 
        b.name, 
        ST_Transform(ST_SetSRID(b.geom, 4326), 4326) AS geom
    FROM bakeries b
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(b.geom, 4326), 4326))
),
cafes_within_polygon AS (
    SELECT 
        c.gid AS cafe_id, 
        c.name, 
        ST_Transform(ST_SetSRID(c.geom, 4326), 4326) AS geom
    FROM cafes c
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(c.geom, 4326), 4326))
),
bus_stops_within_polygon AS (
    SELECT 
        bs.gid AS bus_stop_id, 
        bs.name, 
        ST_Transform(ST_SetSRID(bs.geom, 4326), 4326) AS geom
    FROM bus_stops bs
    JOIN selected_polygon sp
    ON ST_Intersects(sp.geom, ST_Transform(ST_SetSRID(bs.geom, 4326), 4326))
)
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(features)
) AS geojson
FROM (
    -- Selected Polygon (District Area)
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Polygon',
            'coordinates', 
                CASE
                    WHEN ST_GeometryType(sp.geom) = 'ST_Polygon' THEN 
                        (ST_AsGeoJSON(sp.geom)::jsonb)->'coordinates'
                    WHEN ST_GeometryType(sp.geom) = 'ST_MultiPolygon' THEN 
                        (ST_AsGeoJSON(sp.geom)::jsonb)->'coordinates'->0
                    ELSE '[]'
                END
        ),
        'properties', jsonb_build_object(
            'district_name', sp.district_name,
            'area', sp.area,
            'total_sum', sp.total_sum,
            'cafes_count', sp.cafes_count,
            'hotels_count', sp.hotels_count,
            'houses_count', sp.houses_count,
            'bicycle_count', sp.bicycle_count,
            'schools_count', sp.schools_count,
            'bus_stop_count', sp.bus_stop_count,
            'fast_food_count', sp.fast_food_count,
            'restaurant_count', sp.restaurant_count,
            'gov_offices_count', sp.gov_offices_count,
            'supermarket_count', sp.supermarket_count,
            'district_population', sp.district_population,
            'attraction_site_count', sp.attraction_site_count,
            'children_pground_count', sp.children_pground_count,
            'sport_facilities_count', sp.sport_facilities_count,
            'vending_parkings_count', sp.vending_parkings_count
        )
    ) AS features
    FROM selected_polygon sp
    
    UNION ALL

    -- Houses (Limited to 10)
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(h.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'house_id', h.house_id,
            'house_type', h.house_type
        )
    ) AS features
    FROM houses_within_polygon h

    UNION ALL

    -- Playgrounds (Using ST_Intersects)
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(p.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'playground_id', p.playground_id,
            'playground_name', p.name
        )
    ) AS features
    FROM children_playgrounds_within_polygon p

    UNION ALL

    -- Vending Parkings
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(v.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'vending_parking_id', v.vending_parking_id,
            'vending_parking_name', v.name
        )
    ) AS features
    FROM vending_parkings_within_polygon v

    UNION ALL

    -- Bicycle Shops
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(b.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bicycle_shop_id', b.bicycle_shop_id,
            'bicycle_shop_name', b.name
        )
    ) AS features
    FROM bicycle_shops_within_polygon b

    UNION ALL

    -- Supermarkets
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(s.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'supermarket_id', s.supermarket_id,
            'supermarket_name', s.name
        )
    ) AS features
    FROM supermarkets_within_polygon s

    UNION ALL

    -- Restaurants
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(r.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'restaurant_id', r.restaurant_id,
            'restaurant_name', r.name
        )
    ) AS features
    FROM restaurants_within_polygon r

    UNION ALL

    -- Bakeries
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(b.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bakery_id', b.bakery_id,
            'bakery_name', b.name
        )
    ) AS features
    FROM bakeries_within_polygon b

    UNION ALL

    -- Cafes
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(c.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'cafe_id', c.cafe_id,
            'cafe_name', c.name
        )
    ) AS features
    FROM cafes_within_polygon c

    UNION ALL

    -- Bus Stops
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(bs.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bus_stop_id', bs.bus_stop_id,
            'bus_stop_name', bs.name
        )
    ) AS features
    FROM bus_stops_within_polygon bs
) features;






 `);

    const geojson = result.rows[0].geojson;
    console.log("GeoJSON Response:", JSON.stringify(geojson, null, 2)); // Debugging output
    res.json(geojson);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/districts/bikerepair", async (req, res) => {
  try {
    const result = await db.query(`
  WITH selected_polygon AS (
    SELECT ST_Transform(ST_SetSRID(geom, 25832), 4326) AS geom, 
           district_name, area, 
           (COALESCE(arts_center_score, 0) * 1 + COALESCE(beauty_shop_score, 0) * 1 + COALESCE(bookshop_score, 0) * 3 + 
     		COALESCE(cinema_score, 0) * 8 + COALESCE(college_score, 0) * 4 + COALESCE(library_score, 0) * 5 + 
     		COALESCE(museum_score, 0) * 3 + COALESCE(university_score, 0) * 5 + COALESCE(zoo_score, 0) * 1 + 
     		COALESCE(attraction_site_score, 0) * 2 + COALESCE(bakeries_score, 0) * 3 + COALESCE(bicycle_shop_score, 0) * 2 + 
     		COALESCE(bus_stops_score, 0) * 2 + COALESCE(cafes_score, 0) * 5 + COALESCE(fast_food_score, 0) * 5 + 
     		COALESCE(restaurant_score, 0) * 4 + COALESCE(supermarket_score, 0) * 4 + COALESCE(vending_parkings_score, 0) * 1 + 
     		COALESCE(children_pground_score, 0) * 1 + COALESCE(schools_score, 0) * 7 + COALESCE(sport_facilities_score, 0) * 8 + 
     		COALESCE(hotels_score, 0) * 1 + COALESCE(gov_offices_score, 0) * 5 + COALESCE(road_score, 0) * 4 + 
     		COALESCE(cycleways_score, 0) * 7 + COALESCE(parkings_score, 0) * 1 + COALESCE(parks_score, 0) * 5 + 
     		COALESCE(streams_score, 0) * 1 + COALESCE(population_score, 0) * 10) AS total_sum,
           cafes_count, hotels_count, houses_count, bicycle_count, 
           schools_count, bus_stop_count, fast_food_count, restaurant_count, 
           gov_offices_count, supermarket_count, district_population,
           attraction_site_count, children_pground_count, sport_facilities_count,
           vending_parkings_count
    FROM munster_districts
    ORDER BY total_sum DESC
    LIMIT 3
),
houses_within_polygon AS (
    SELECT h.gid AS house_id, h.district_n AS house_type, ST_Transform(ST_SetSRID(h.geom, 25832), 4326) AS geom
    FROM houses h
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(h.geom, 25832), 4326))
    
),
attraction_sites_within_polygon AS (
    SELECT a.gid AS site_id, a.name, ST_Transform(ST_SetSRID(a.geom, 25832), 4326) AS geom
    FROM attraction_sites a
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(a.geom, 25832), 4326))
),
cafes_within_polygon AS (
    SELECT c.gid AS cafe_id, c.name, ST_Transform(ST_SetSRID(c.geom, 4326), 4326) AS geom
    FROM cafes c
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(c.geom, 4326), 4326))
),
bus_stops_within_polygon AS (
    SELECT bs.gid AS bus_stop_id, bs.name, ST_Transform(ST_SetSRID(bs.geom, 4326), 4326) AS geom
    FROM bus_stops bs
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(bs.geom, 4326), 4326))
),
fast_foods_within_polygon AS (
    SELECT f.gid AS fast_food_id, f.name, ST_Transform(ST_SetSRID(f.geom, 4326), 4326) AS geom
    FROM fast_foods f
    JOIN selected_polygon sp
    ON ST_Contains(sp.geom, ST_Transform(ST_SetSRID(f.geom, 4326), 4326))
)
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(features)
) AS geojson
FROM (
    -- Add the polygon as a feature
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Polygon',
            'coordinates', 
                CASE
                    WHEN ST_GeometryType(sp.geom) = 'ST_Polygon' THEN 
                        (ST_AsGeoJSON(sp.geom)::jsonb)->'coordinates'
                    WHEN ST_GeometryType(sp.geom) = 'ST_MultiPolygon' THEN 
                        (ST_AsGeoJSON(sp.geom)::jsonb)->'coordinates'->0
                    ELSE '[]'
                END
        ),
        'properties', jsonb_build_object(
            'district_name', sp.district_name,
            'area', sp.area,
            'total_sum', sp.total_sum,
            'cafes_count', sp.cafes_count,
            'hotels_count', sp.hotels_count,
            'houses_count', sp.houses_count,
            'bicycle_count', sp.bicycle_count,
            'schools_count', sp.schools_count,
            'bus_stops_count', sp.bus_stop_count,
            'fast_food_count', sp.fast_food_count,
            'restaurant_count', sp.restaurant_count,
            'gov_offices_count', sp.gov_offices_count,
            'supermarket_count', sp.supermarket_count,
            'district_population', sp.district_population,
            'attraction_site_count', sp.attraction_site_count,
            'children_pground_count', sp.children_pground_count,
            'sport_facilities_count', sp.sport_facilities_count,
            'vending_parkings_count', sp.vending_parkings_count
        )
    ) AS features
    FROM selected_polygon sp
    
    UNION ALL

    -- Add the points (houses) as features
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(h.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'house_id', h.house_id,
            'house_type', h.house_type
        )
    ) AS features
    FROM houses_within_polygon h

    UNION ALL

    -- Add the points (attraction sites) as features
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(a.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'site_id', a.site_id,
            'site_name', a.name
        )
    ) AS features
    FROM attraction_sites_within_polygon a

    UNION ALL

    -- Add the points (cafes) as features
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(c.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'cafe_id', c.cafe_id,
            'cafe_name', c.name
        )
    ) AS features
    FROM cafes_within_polygon c

    UNION ALL

    -- Add the points (bus stops) as features
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(bs.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'bus_stop_id', bs.bus_stop_id,
            'bus_stop_name', bs.name
        )
    ) AS features
    FROM bus_stops_within_polygon bs

    UNION ALL

    -- Add the points (fast foods) as features
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', (ST_AsGeoJSON(f.geom)::jsonb)->'coordinates'
        ),
        'properties', jsonb_build_object(
            'fast_food_id', f.fast_food_id,
            'fast_food_name', f.name
        )
    ) AS features
    FROM fast_foods_within_polygon f
) features;
      `);

    const geojson = result.rows[0].geojson;
    res.json(geojson);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
