import React, { useState, useEffect, useRef } from 'react';

// Sorted image list from analysis
const IMAGES = [
    "cathedral_2026-01-01_21-30-56.jpg", "gothic_2026-01-01_21-31-58.jpg", "harlem_2026-01-01_21-29-11.jpg", "bowery_2026-01-01_21-39-44.jpg",
    "inwood_2026-01-01_21-40-03.jpg", "battery_2026-01-01_21-29-26.jpg", "washington_2026-01-01_21-39-52.jpg", "empire_2026-01-01_21-34-46.jpg", "exact_west_2026-01-01_21-28-17.jpg",
    "penn_2026-01-01_21-39-58.jpg", "baseball_2026-01-01_21-36-10.jpg", "6_2026-01-01_21-33-15.jpg", "7_2026-01-01_21-33-19.jpg", "8_2026-01-01_21-33-22.jpg",
    "5_2026-01-01_21-33-11.jpg", "3_2026-01-01_21-33-03.jpg", "4_2026-01-01_21-33-07.jpg", "alone_2026-01-01_21-38-03.jpg", "fashion_2026-01-01_21-37-03.jpg",
    "church_2026-01-01_21-30-49.jpg", "9_2026-01-01_21-33-26.jpg", "cafe_2026-01-01_21-30-14.jpg", "social_2026-01-01_21-37-57.jpg", "poster_2026-01-01_22-02-39.jpg",
    "restaurants_2026-01-01_21-52-12.jpg", "coffee_2026-01-01_21-58-58.jpg", "gold_2026-01-01_21-49-57.jpg", "cart_2026-01-01_21-42-43.jpg", "times_2026-01-01_21-55-09.jpg",
    "crowd_2026-01-01_22-19-06.jpg", "police_2026-01-01_21-45-55.jpg", "flagpole_2026-01-01_21-52-26.jpg", "avenue_2026-01-01_22-03-37.jpg", "luxury_2026-01-01_22-31-43.jpg",
    "music_2026-01-01_22-15-12.jpg", "dog_2026-01-01_21-55-56.jpg", "jersey_2026-01-01_22-06-29.jpg", "burger_2026-01-01_21-59-14.jpg", "potter_2026-01-01_22-17-05.jpg",
    "indian_2026-01-01_22-12-14.jpg", "african_2026-01-01_22-00-31.jpg", "russian_2026-01-01_22-12-24.jpg", "trump_2026-01-01_22-16-17.jpg", "korean_2026-01-01_21-59-35.jpg",
    "french_2026-01-01_22-11-05.jpg", "british_2026-01-01_22-11-16.jpg", "german_2026-01-01_22-11-00.jpg", "mexican_2026-01-01_22-00-40.jpg", "duane_2026-01-01_21-47-19.jpg",
    "soho_2026-01-01_21-54-22.jpg", "oval_2026-01-01_21-52-58.jpg", "gas_2026-01-01_21-43-04.jpg", "irish_2026-01-01_22-11-20.jpg", "union_2026-01-01_22-17-18.jpg",
    "bagel_2026-01-01_21-59-03.jpg", "anger_2026-01-01_22-10-34.jpg", "alcohol_2026-01-01_22-11-54.jpg", "rainbow_2026-01-01_22-10-02.jpg", "greenwich_2026-01-01_21-54-28.jpg",
    "silverware_2026-01-01_22-04-47.jpg", "sandwich_2026-01-01_21-59-09.jpg", "japanese_2026-01-01_22-00-03.jpg", "lincoln_2026-01-01_22-16-06.jpg", "pool_2026-01-01_21-49-14.jpg",
    "rum_2026-01-01_22-14-35.jpg", "beer_2026-01-01_22-14-25.jpg", "wine_2026-01-01_22-14-30.jpg", "fabric_2026-01-01_22-09-34.jpg", "fountain_2026-01-01_21-42-21.jpg",
    "library_2026-01-01_21-45-35.jpg", "booth_2026-01-01_22-04-52.jpg", "circle_2026-01-01_21-53-08.jpg", "electrical_2026-01-01_22-13-05.jpg", "emo_2026-01-01_22-01-18.jpg",
    "statue_2026-01-01_22-03-15.jpg", "museum_2026-01-01_22-03-08.jpg", "gallery_2026-01-01_21-42-01.jpg", "gentle_2026-01-01_22-07-34.jpg", "stadium_2026-01-01_21-46-05.jpg",
    "pier_2026-01-01_21-52-32.jpg", "boat_2026-01-01_21-52-37.jpg", "hexagon_2026-01-01_21-53-14.jpg", "lost_2026-01-01_22-19-34.jpg", "grocery_2026-01-01_22-18-24.jpg",
    "pharmacy_2026-01-01_22-18-17.jpg", "subway_2026-01-01_22-19-23.jpg", "free_2026-01-01_22-18-47.jpg", "exact_grey_2026-01-01_21-50-51.jpg", "grey_2026-01-01_21-50-17.jpg",
    "cluster_2026-01-01_22-05-54.jpg", "lake_2026-01-01_22-06-58.jpg", "rock_2026-01-01_22-01-24.jpg", "suit_2026-01-01_22-07-50.jpg", "purple_2026-01-01_21-51-21.jpg",
    "garbage_2026-01-01_21-46-39.jpg", "alley_2026-01-01_22-03-48.jpg", "star_2026-01-01_21-53-27.jpg", "ceiling_2026-01-01_21-53-41.jpg", "chair_2026-01-01_22-07-14.jpg",
    "tourist_2026-01-01_21-45-24.jpg", "hotel_2026-01-01_22-02-17.jpg", "flag_2026-01-01_22-05-36.jpg", "advertisement_2026-01-01_21-54-49.jpg", "square_2026-01-01_21-53-03.jpg",
    "steel_2026-01-01_22-01-43.jpg", "column_2026-01-01_21-55-47.jpg", "classical_2026-01-01_21-42-11.jpg", "motorcycle_2026-01-01_22-17-46.jpg", "litter_2026-01-01_21-46-28.jpg",
    "young_2026-01-01_22-01-51.jpg", "garden_2026-01-01_21-43-45.jpg", "bush_2026-01-01_21-43-40.jpg", "undisturbed_2026-01-01_21-49-33.jpg", "tranquility_2026-01-01_21-48-16.jpg",
    "grass_2026-01-01_21-32-15.jpg", "suburban_2026-01-01_21-40-12.jpg", "suv_2026-01-01_21-51-40.jpg", "narrow_2026-01-01_21-44-45.jpg", "scaffolding_2026-01-01_21-55-26.jpg",
    "intersection_2026-01-01_21-41-51.jpg", "truck_2026-01-01_21-51-54.jpg", "sedan_2026-01-01_21-51-47.jpg", "traffic_2026-01-01_22-08-23.jpg", "a_2026-01-01_21-33-57.jpg",
    "apartment_2026-01-01_21-37-26.jpg", "2_2026-01-01_21-32-59.jpg", "conditioning_2026-01-01_21-39-00.jpg", "escape_2026-01-01_21-32-38.jpg", "1_2026-01-01_21-32-53.jpg",
    "food_2026-01-01_21-30-26.jpg", "food_2026-01-01_21-41-41.jpg", "restaurant_2026-01-01_21-52-08.jpg", "restaurant_2026-01-01_21-30-21.jpg", "ornate_2026-01-01_21-38-42.jpg",
    "warm_2026-01-01_22-13-49.jpg", "enjoy_2026-01-01_21-48-01.jpg", "wood_2026-01-01_22-04-14.jpg", "stone_2026-01-01_22-04-21.jpg", "wide_2026-01-01_21-44-52.jpg",
    "glass_2026-01-01_22-04-42.jpg", "taxi_2026-01-01_21-44-21.jpg", "tower_2026-01-01_22-05-01.jpg", "skyscraper_2026-01-01_22-05-08.jpg", "skyline_2026-01-01_21-46-22.jpg",
    "streetlight_2026-01-01_21-54-10.jpg", "streetlight_2026-01-01_22-08-33.jpg", "trash_2026-01-01_21-46-33.jpg", "graffiti_2026-01-01_21-37-45.jpg", "flower_2026-01-01_21-40-22.jpg",
    "exact_east_2026-01-01_21-40-51.jpg", "playground_2026-01-01_21-43-15.jpg", "sports_2026-01-01_21-49-51.jpg", "semi_2026-01-01_22-06-08.jpg", "animals_2026-01-01_22-02-10.jpg",
    "townhouse_2026-01-01_21-42-34.jpg", "exact_west_2026-01-01_21-40-56.jpg", "billboard_2026-01-01_21-54-54.jpg", "theater_2026-01-01_21-28-57.jpg", "exact_east_2026-01-01_21-28-03.jpg",
    "chinese_2026-01-01_21-23-50.jpg", "highway_2026-01-01_21-30-33.jpg", "bridge_2026-01-01_21-24-51.jpg", "cold_2026-01-01_22-13-31.jpg", "canopy_2026-01-01_21-39-25.jpg",
    "foliage_2026-01-01_21-39-32.jpg"
];

const IMG_BASE = "/timelapse";

const TimelapseSection = () => {
    const [idx, setIdx] = useState(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);

    // Preload Images
    useEffect(() => {
        let loadedCount = 0;
        const total = IMAGES.length;

        IMAGES.forEach(src => {
            const img = new Image();
            img.src = `${IMG_BASE}/${src}`;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === total) {
                    setImagesLoaded(true);
                }
            };
        });
    }, []);

    // Auto-play loop (only start after loading)
    useEffect(() => {
        if (!imagesLoaded) return;

        const interval = setInterval(() => {
            setIdx(prev => (prev + 1) % IMAGES.length);
        }, 1000 / 12); // 12 FPS
        return () => clearInterval(interval);
    }, [imagesLoaded]);

    return (
        <section className="timelapse-section">
            <div className="timelapse-layout">
                <div className="timelapse-text">
                    <p>
                        For centuries, we have organized our cities using static labels: a specific street address, a grid coordinate,
                        a fixed zip code. But these are just empty containers; they tell us where something is, but never what it is.
                    </p>
                    <p>
                        This project proposes a different kind of index. By processing the city through the eyes of an AI, we no longer rely on manual or static labels. We are no longer searching for a location, but for a feeling, an aesthetic, or a
                        specific meaning. We are building a navigation system based on the invisible threads of context that bind
                        neighborhoods together. This kind of map doesn't just show us where we are; it helps us understand where we’re actually standing.
                    </p>
                    <p>
                        It is time to see the city through a new lens.
                    </p>
                </div>

                <div className="timelapse-visual">
                    <img
                        src={`${IMG_BASE}/${IMAGES[idx]}`}
                        alt="Latent Space Walk"
                    />
                </div>
            </div>
        </section>
    );
};

export default TimelapseSection;
