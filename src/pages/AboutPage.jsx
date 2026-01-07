import { Link } from 'react-router-dom';
import posthog from 'posthog-js';
import { ArrowDownRight, MapPin } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import QuizSection from '../components/QuizSection';
import TimelapseSection from '../components/TimelapseSection';
import ManhattanMap from '../components/ManhattanMap';
import TransformControls from '../components/TransformControls';
import './AboutPage.css';



// Screenshots are served from /public/screenshots/
const IMG_BASE = "/screenshots";

// --- HELPER COMPONENTS ---
const Typewriter = ({ text, delay = 0 }) => {
    const [displayLength, setDisplayLength] = useState(0);
    const requestRef = useRef();
    const progressRef = useRef(0);
    const currentLenRef = useRef(0);

    useEffect(() => {
        progressRef.current = 0;
        currentLenRef.current = 0;
        setDisplayLength(0);

        const animate = () => {
            // 1. Calculate Target (Accelerating Curve)
            progressRef.current += 0.012; // Slightly faster base to compensate for clamping
            const t = Math.min(progressRef.current, 1);
            const targetLen = Math.floor(text.length * (t * t));

            // 2. Clamp the Update (Max 1 char per frame for smoothness)
            if (currentLenRef.current < targetLen) {
                // Determine step: Allow jumps early on if needed, but smooth out? 
                // Actually, forcing 1 char/frame is 60 chars/sec = fast enough.
                const dist = targetLen - currentLenRef.current;
                const step = dist > 2 ? Math.ceil(dist / 2) : 1; // Soft clamp: Catch up by half-distance, but min 1

                // Strict clamping at the very end to prevent the "last 5 chars freeze"
                // If we are within last 10 chars, force step = 1
                const charsLeft = text.length - currentLenRef.current;
                const finalStep = (charsLeft <= 10) ? 1 : step;

                currentLenRef.current += finalStep;
                setDisplayLength(currentLenRef.current);
            }

            // 3. Continue until fully displayed
            if (currentLenRef.current < text.length) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        const startTimeout = setTimeout(() => {
            requestRef.current = requestAnimationFrame(animate);
        }, delay);

        return () => {
            clearTimeout(startTimeout);
            cancelAnimationFrame(requestRef.current);
        };
    }, [text, delay]);

    return <span>{text.slice(0, displayLength)}</span>;
};

const HERO_IMAGES = [
    "chinese_2026-01-01_21-23-50.png", "bridge_2026-01-01_21-24-51.png", "foliage_2026-01-01_21-39-32.png",
    "skyline_2026-01-01_21-46-22.png", "trash_2026-01-01_21-46-33.png", "gothic_2026-01-01_21-31-58.png",
    "scaffolding_2026-01-01_21-55-26.png", "restaurant_2026-01-01_21-30-21.png", "exact_east_2026-01-01_21-28-03.png",
    "exact_west_2026-01-01_21-28-17.png", "food_2026-01-01_21-30-26.png", "graffiti_2026-01-01_21-37-45.png",
    "bagel_2026-01-01_21-59-03.png", "beer_2026-01-01_22-14-25.png", "cathedral_2026-01-01_21-30-56.png",
    "subway_2026-01-01_22-19-23.png", "taxi_2026-01-01_21-44-21.png", "times_2026-01-01_21-55-09.png",
    "flower_2026-01-01_21-40-22.png", "penn_2026-01-01_21-39-58.png", "library_2026-01-01_21-45-35.png",
    "museum_2026-01-01_22-03-08.png", "statue_2026-01-01_22-03-15.png", "truck_2026-01-01_21-51-54.png",
    "stadium_2026-01-01_21-46-05.png"
];

const STREAM_ITEMS = [
    {
        label: "BAGEL", img: "bagel_2026-01-01_21-59-03.png", desc: "The breakfast of champions. Note the complete absence in industrial zones.",
        gallery: ["bagel_01.jpg", "bagel_02.jpg", "bagel_03.jpg"]
    },
    {
        label: "BEER", img: "beer_2026-01-01_22-14-25.png", desc: "Identifies bars, advertisements, and bodegas with neon signage.",
        gallery: ["beer_03.jpg", "beer_05.jpg", "beer_08.jpg"]
    },
    {
        label: "HOTEL", img: "hotel_2026.png", desc: "A temporary home for millions, marked by distinctive awnings.",
        gallery: ["hotel_30.jpg", "hotel_19.jpg", "hotel_22.jpg"]
    },
    {
        label: "CONDITIONING", img: "conditioning_2026.png", desc: "The ubiquitous hum of summer, defining the residential facade.",
        gallery: ["conditioner_12.jpg", "conditioner_21.jpg", "conditioner_07.jpg"]
    },
    {
        label: "RESTAURANT", img: "restaurant_2026.png", desc: "The city's dining rooms, spilling onto the sidewalks.",
        gallery: ["restaurant_01.jpg", "restaurant_03.jpg", "restaurant_02.jpg"]
    },
    {
        label: "BASEBALL", img: "baseball_2026-01-01_21-36-10.png", desc: "Reveals the hidden green spaces of the city, from sandlots to stadiums.",
        gallery: ["baseball_03.jpg", "baseball_04.jpg", "baseball_05.jpg"]
    },
    {
        label: "TOURIST", img: "tourist_2026.png", desc: "Shows distinct clustering in landmark zones.",
        gallery: ["tourist_church_01.jpg", "tourist_25.jpg", "cathedral_03.jpg"]
    },
    {
        label: "CATHEDRAL", img: "cathedral_2026-01-01_21-30-56.png", desc: "Distinct from \"Church\" - captures only the grandest scale architecture.",
        gallery: ["cathedral_01.jpg", "cathedral_02.jpg", "cathedral_03.jpg"]
    },
    {
        label: "SUBWAY", img: "subway_2026-01-01_22-19-23.png", desc: "Maps the entrances, but also ventilation grates and signage.",
        gallery: ["subway_02.jpg", "subway_04.jpg", "subway_05.jpg"]
    }
];

const DEFAULT_TRANSFORM = {
    x: 50,
    y: 40,
    scaleX: 1.1,
    scaleY: 2.075,
    rotate: 6
};

const MACHINE_EYE_ITEMS = [
    {
        filename: 'foliage_06.jpg',
        bg: 'skyline_2026-01-01_21-46-22.png',
        label: 'Skyline',
        caption: "Dense vegetation flanks the pathway, with steps leading up to a higher elevation. The thick growth of ivy adds a sense of seclusion, creating a quiet spot for nature observation.",
        lat: 40.80302,
        lon: -73.94120,
        bearing: 135,
        category: "Machine Eye"
    },
    {
        filename: 'gothic_10.jpg',
        bg: 'church_2026-01-01_21-30-49.png',
        label: 'Church',
        caption: "A protected bike lane runs alongside the bustling sidewalk of a dense urban environment. A Gothic church spire stands out against the modern skyscrapers, adding a historical dimension.",
        lat: 40.70851,
        lon: -74.01160,
        bearing: 45,
        category: "Machine Eye"
    },
    {
        filename: 'brick_09.jpg',
        bg: 'townhouse_2026-01-01_21-42-34.png',
        label: 'Brick',
        caption: "Narrow residential streets are lined with classic stone and red brick buildings. The contrasting architectural styles and tree-lined curbs create a picturesque, timeless urban neighborhood.",
        lat: 40.78667,
        lon: -73.95639,
        bearing: 315,
        category: "Machine Eye"
    },
    {
        filename: 'graffiti_16.jpg',
        bg: 'graffiti_2026-01-01_21-37-45.png',
        label: 'Graffiti',
        caption: "The shop's facade is adorned with tags, a canvas for street artists. The upper floors show signs of wear, with metal fire escapes typical of older urban centers like the Lower East Side.",
        lat: 40.72000,
        lon: -73.99615,
        bearing: 270,
        category: "Machine Eye"
    },
    {
        filename: 'flower_09.jpg',
        bg: 'flower_2026-01-01_21-40-22.png',
        label: 'Flower',
        caption: "A bustling, intimate urban alley features outdoor dining and multicultural flags. Small garden areas and flower stands spill onto the sidewalk, signaling vibrant neighborhood life.",
        lat: 40.71867,
        lon: -73.99795,
        bearing: 90,
        category: "Machine Eye"
    },
    {
        filename: 'bridge_001.png',
        bg: 'bridge_2026-01-01_21-24-51.png',
        label: 'Bridge',
        caption: "The massive steel truss of the bridge dominates the frame, separating the city from its waterways. A metal railing borders the scenic view of the calm river and distant urban skyline.",
        lat: 40.756382,
        lon: -73.960435,
        bearing: 90,
        category: "Machine Eye"
    }
];

const WEST_ITEM = {
    filename: 'west_21.jpg',
    caption: "West 115th Street",
    lat: 40.80608,
    lon: -73.96147,
    category: "COMPASS"
};

const EAST_ITEM = {
    filename: 'east_04.jpg',
    caption: "east side of river",
    lat: 40.76083,
    lon: -73.95602,
    category: "COMPASS"
};

const CrossFadeMap = ({ src, activeTag, transformOverride }) => {
    const [displaySrc, setDisplaySrc] = useState(src);
    const [bufferSrc, setBufferSrc] = useState(src);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        if (src !== displaySrc) {
            setBufferSrc(displaySrc);
            setDisplaySrc(src);
            setOpacity(0);

            // Note: We do NOT set opacity automatically here.
            // We wait for the onLoad event of the new image to trigger the fade.
            // This prevents fading in a blank/loading image.
        }
    }, [src, displaySrc]);

    // Added COMPASS to prevent zoom-out on Ghost in the Machine section
    // If transformOverride is provided, use it. Otherwise calculate based on tag.
    const transformStyle = transformOverride !== undefined
        ? transformOverride
        : (['INTRO', 'MACHINE EYE', 'CHINESE', 'GOTHIC', 'SCAFFOLDING', 'COMPASS', 'Compass'].includes(activeTag)
            ? 'scale(1.11) translate(-21px, 0px)'
            : 'none');

    return (
        <div id="main-map-container" style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transform: transformStyle, transition: 'transform 0.5s ease'
        }}>
            {/* Permanent Base Layer (Intro Background) */}
            <img
                src={`${IMG_BASE}/abcdefg_2026.png`}
                alt=""
                style={{
                    position: 'absolute', top: 0, left: '50%', height: '100%', width: 'auto', maxWidth: 'none',
                    transform: 'translateX(-50%)',
                    zIndex: 0
                }}
            />
            {/* Buffer (Back) - zIndex 1 */}
            <img
                src={bufferSrc}
                alt=""
                style={{
                    position: 'absolute', top: 0, left: '50%', height: '100%', width: 'auto', maxWidth: 'none',
                    transform: 'translateX(-50%)',
                    zIndex: 1
                }}
            />
            {/* Display (Front) - zIndex 2 */}
            <img
                key={displaySrc} /* Force re-mount ensures clean transition start */
                src={displaySrc}
                alt="Map"
                onLoad={() => {
                    // RAF nesting to force a repaint frame at opacity:0 before transitioning
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setOpacity(1);
                        });
                    });
                }}
                onError={() => setOpacity(1)} /* Fallback */
                style={{
                    position: 'absolute', top: 0, left: '50%', height: '100%', width: 'auto', maxWidth: 'none',
                    transform: 'translateX(-50%)', /* Base centering */
                    opacity: opacity, transition: 'opacity 1.0s ease',
                    zIndex: 2
                }}
            />
        </div>
    );
};


const AboutPage = () => {
    const [activeTag, setActiveTag] = useState("INTRO");
    const [mainImg, setMainImg] = useState(`${IMG_BASE}/abcdefg_2026.png`);
    const [splitVisible, setSplitVisible] = useState(false);
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [visualCultureData, setVisualCultureData] = useState([]);
    const [transformOverride, setTransformOverride] = useState(null); // Leave null to use defaults initially, or set DEFAULT_TRANSFORM
    const [streamImg, setStreamImg] = useState(`${IMG_BASE}/skyline_2026-01-01_21-46-22.png`);
    const [activeStreamIndex, setActiveStreamIndex] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Machine Eye Carousel State
    const [machineEyeIndex, setMachineEyeIndex] = useState(0);
    const [carouselHovered, setCarouselHovered] = useState(false);
    const [isManualNav, setIsManualNav] = useState(false);

    // Carousel Navigation
    const nextMachineEye = () => {
        if (machineEyeIndex < MACHINE_EYE_ITEMS.length - 1) {
            setIsManualNav(true);
            setMachineEyeIndex(prev => prev + 1);
            posthog.capture('carousel_next', { index: machineEyeIndex + 1 });
        }
    };
    const prevMachineEye = () => {
        if (machineEyeIndex > 0) {
            setIsManualNav(true);
            setMachineEyeIndex(prev => prev - 1);
            posthog.capture('carousel_prev', { index: machineEyeIndex - 1 });
        }
    };

    const machineEyeIndexRef = useRef(0);
    useEffect(() => { machineEyeIndexRef.current = machineEyeIndex; }, [machineEyeIndex]);

    // Sync Background with Carousel Index (Machine Eye Section)
    useEffect(() => {
        if (activeTag === 'MACHINE EYE') {
            setMainImg(`${IMG_BASE}/${MACHINE_EYE_ITEMS[machineEyeIndex].bg}`);
        }
    }, [machineEyeIndex, activeTag]);



    const splitViewRef = useRef(null);
    const streamImgRef = useRef(null);
    const streamItemsRef = useRef([]);

    // Observer for Narrative Steps
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        // Mobile: Trigger near TOP (-5% from top, -95% from bottom creates a 5% slice near top)
        const rootMargin = isMobile ? "-5% 0px -95% 0px" : "-50% 0px -50% 0px";

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Update Active Class
                    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                    entry.target.classList.add('active');

                    // Extract Data
                    const { type, tag, img } = entry.target.dataset;

                    setActiveTag(tag.toUpperCase());
                    setIsManualNav(false); // Reset manual delay logic whenever section changes

                    // POSTHOG: Track Section View
                    posthog.capture('section_viewed', {
                        section: tag,
                        type: type
                    });

                    if (type === 'split') {
                        setSplitVisible(true);
                        setGalleryVisible(false);
                    } else if (type === 'gallery') {
                        setGalleryVisible(true);
                        setSplitVisible(false);
                        setMainImg(`${IMG_BASE}/${img}`);
                    } else if (type === 'carousel') {
                        setGalleryVisible(true);
                        setSplitVisible(false);
                        // PREVENT FLASH: Use the CURRENT machineEyeIndex background via Ref
                        const currentBg = MACHINE_EYE_ITEMS[machineEyeIndexRef.current].bg;
                        setMainImg(`${IMG_BASE}/${currentBg}`);
                    } else {
                        setSplitVisible(false);
                        setGalleryVisible(false);
                        setMainImg(`${IMG_BASE}/${img}`);
                    }
                }
            });
        }, { threshold: 0, rootMargin });

        const steps = document.querySelectorAll('.step');
        steps.forEach(step => observer.observe(step));

        return () => observer.disconnect();
    }, []);

    // Observer for Stream Items (Scroll-Triggered Updates)
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        const rootMargin = isMobile ? "-70% 0px -15% 0px" : "-50% 0px -50% 0px";

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = Number(entry.target.dataset.index);
                    setActiveStreamIndex(idx);
                }
            });
        }, { threshold: 0, rootMargin });

        streamItemsRef.current.forEach(item => {
            if (item) observer.observe(item);
        });

        return () => observer.disconnect();
    }, []);

    // --- MOBILE REPAIR V12: DYNAMIC VISUAL FADE ---
    useEffect(() => {
        const handleScroll = () => {
            // Only active on mobile
            if (window.innerWidth > 768) {
                const sticky = document.querySelector('.sticky-container');
                if (sticky) sticky.style.opacity = '1';
                return; // Exit
            }

            const sticky = document.querySelector('.sticky-container');
            if (!sticky) return;

            const stickyTop = sticky.getBoundingClientRect().top;

            // Default to visible
            let minOpacity = 1;

            // Check overlap with any step content
            const steps = document.querySelectorAll('.step-content');
            steps.forEach(step => {
                const rect = step.getBoundingClientRect();

                // USER LOGIC:
                // "if a container's topmost part hits the bottom of a info section then it begins to fade to transparent"
                // "when it hits the top of the info section it is completely invisible"

                // Conditions: 
                // 1. StickyTop <= RectBottom (Hits Bottom / Below Bottom)
                // 2. StickyTop >= RectTop (Hits Top / Above Top)

                if (stickyTop >= rect.top && stickyTop <= rect.bottom) {
                    // We are inside the fading zone.
                    // Progress 0 at Top, 1 at Bottom.
                    // Opacity = Progress.
                    const progress = (stickyTop - rect.top) / rect.height;
                    minOpacity = Math.min(minOpacity, progress);
                }
            });

            sticky.style.opacity = Math.max(0, Math.min(1, minOpacity));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Init
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll Handler for Clicking Items
    const handleStreamClick = (index, img, label) => {
        setStreamImg(`${IMG_BASE}/${img}`);
        setActiveStreamIndex(index);

        // POSTHOG: Track Stream Click
        posthog.capture('stream_item_clicked', {
            idx: index,
            label: label
        });

        // Disable observer temporarily or just force scroll
        if (streamItemsRef.current[index]) {
            // Use 'nearest' for edges to prevent un-sticking the map, 'center' for others
            const alignment = (index === 0 || index === STREAM_ITEMS.length - 1) ? 'nearest' : 'center';
            streamItemsRef.current[index].scrollIntoView({ behavior: 'smooth', block: alignment });
        }
    };

    // Effect to update Image and Scroll List when Active Index changes
    useEffect(() => {
        if (activeStreamIndex !== null) {
            const item = STREAM_ITEMS[activeStreamIndex];
            setStreamImg(`${IMG_BASE}/${item.img}`);


        }
    }, [activeStreamIndex]);

    // Preload Images
    useEffect(() => {
        const imagesToLoad = [
            `${IMG_BASE}/chinese_2026-01-01_21-23-50.png`,
            `${IMG_BASE}/bridge_2026-01-01_21-24-51.png`,
            `${IMG_BASE}/foliage_2026-01-01_21-39-32.png`,
            `${IMG_BASE}/skyline_2026-01-01_21-46-22.png`,
            `${IMG_BASE}/trash_2026-01-01_21-46-33.png`,
            `${IMG_BASE}/gothic_2026-01-01_21-31-58.png`,
            `${IMG_BASE}/scaffolding_2026-01-01_21-55-26.png`,
            `${IMG_BASE}/restaurant_2026-01-01_21-30-21.png`,
            `${IMG_BASE}/exact_east_2026-01-01_21-28-03.png`,
            `${IMG_BASE}/exact_west_2026-01-01_21-28-17.png`,
            `${IMG_BASE}/food_2026-01-01_21-30-26.png`,
            `${IMG_BASE}/graffiti_2026-01-01_21-37-45.png`
        ];

        document.querySelectorAll('[data-img]').forEach(el => {
            const src = `${IMG_BASE}/${el.dataset.img}`;
            if (!imagesToLoad.includes(src)) imagesToLoad.push(src);
        });

        imagesToLoad.forEach(src => {
            const img = new Image();
            img.src = src;
        });

        // Fetch Visual Culture Metadata
        fetch('/gallery_data/metadata.json')
            .then(res => res.json())
            .then(data => setVisualCultureData(data))
            .catch(err => console.error("Failed to load visual culture data", err));
    }, []);



    const HERO_IMG_BASE = "/herogrid"; // Dedicated optimized folder

    return (
        <div className="about-page">
            <section id="hero">
                <div className="hero-bg-grid">
                    {Array(12).fill(HERO_IMAGES).flat().map((img, i) => (
                        <div key={i} style={{ backgroundImage: `url('${HERO_IMG_BASE}/${img.replace('.png', '.jpg')}')` }}></div>
                    ))}
                </div>

                <div className="title-card">
                    <div className="meta">
                        <span>Cornell Tech</span>
                        <span> &middot; </span>
                        <span>Urban Tech Hub</span>
                        <span className="hidden md:inline"> &middot; </span>
                        <span className="block md:inline mt-1 md:mt-0">by <a href="https://seanhardestylewis.com" target="_blank" rel="noopener noreferrer" className="author-link">Sean Hardesty Lewis</a></span>
                    </div>
                    <h1>The City That<br />AI Sees</h1>
                    <p>
                        We ran a Vision Language Model on hundreds of thousands of images of Manhattan.
                        <br />This is the first open-vocabulary semantic atlas of New York City.
                    </p>
                </div>
            </section>

            {/* Narrative Block 1 */}
            <section className="narrative-section">
                <div className="narrative-content">
                    {/* <h3>Beyond the Static Label</h3>
                    <p>
                        For decades, digital maps have been glorified spreadsheets - constrained by a finite set of labels.
                        A coffee shop is a point. A park is a polygon. This rigid taxonomy ignores the visual richness of the street.
                        Why can't we search for "the sunniest corner in the West Village" or "a facade that feels like 1920s Paris"?
                    </p>
                    <p>
                        This project uses Visual Language Models (VLMs) to re-index the city, turning pixels into semantic understanding.
                        Think of them as Large Language Models (LLMs), but for images.
                        We don't need new data; we just need new eyes.
                    </p> */}
                    <h3>Maps are blind.</h3>
                    <p>
                        Every ten years, New York City conducts a massive, manual census of its street trees. Thousands of volunteers walk every block with clipboards, counting and identifying every oak and maple across the five boroughs.
                    </p>
                    <p>
                        They do it because the digital map does not know the trees exist.
                    </p>
                    <p>
                        To Google or Apple, the city is a grid of addresses and listings. The rest of the world gets flattened. Not because it is invisible, but because it was never entered into a database. The map can tell you where a pharmacy is. It cannot tell you where the fire escapes are. Where the murals are. Where the awnings begin. Where the street trees actually cast shade. Where the scaffolding still hangs.
                    </p>
                    <p>
                        That is not a New York problem. It is a mapping problem.
                    </p>
                    <p>
                        We processed hundreds of thousands of Manhattan street view images with a vision language model (VLM). Instead of asking the model for coordinates, we simply asked it to describe what it saw.
                    </p>
                </div>
            </section>

            <section id="scrolly-section">
                <div className="sticky-container">
                    <div className="tag-indicator">
                        <span>QUERY PATTERN</span>
                        <h2 id="current-tag">
                            {activeTag === 'MACHINE EYE' ? MACHINE_EYE_ITEMS[machineEyeIndex].label.toUpperCase() : activeTag}
                        </h2>
                    </div>

                    <CrossFadeMap src={mainImg} activeTag={activeTag} />

                    <div id="split-view" className={splitVisible ? 'visible' : ''} ref={splitViewRef}>
                        <div className="split-pane" id="pane-west">
                            <h3>WEST</h3>
                            <img src={`${IMG_BASE}/exact_west_2026-01-01_21-28-17.png`} alt="West" />
                        </div>
                        <div className="split-pane" id="pane-east">
                            <h3>EAST</h3>
                            <img src={`${IMG_BASE}/exact_east_2026-01-01_21-28-03.png`} alt="East" />
                        </div>
                    </div>

                    <div id="gallery-view" className={galleryVisible || splitVisible ? 'visible' : ''}>
                        {splitVisible ? (
                            <>
                                {/* Left Map (West) - Symmetrical Offset (Center 25%) */}
                                <ManhattanMap
                                    visible={true}
                                    data={[WEST_ITEM]}
                                    transformOverride={{ x: -400 }}
                                    category="COMPASS_WEST"
                                    showBorder={false}
                                    hoveredIndex={hoveredIndex === 0 ? 0 : null}
                                />
                                {/* Right Map (East) - Symmetrical Offset (Center 75%) */}
                                <ManhattanMap
                                    visible={true}
                                    data={[EAST_ITEM]}
                                    transformOverride={{ x: 510 }}
                                    category="COMPASS_EAST"
                                    showBorder={false}
                                    hoveredIndex={hoveredIndex === 1 ? 0 : null}
                                />
                            </>
                        ) : (
                            /* Standard Single Map */
                            <ManhattanMap
                                visible={galleryVisible}
                                data={
                                    activeTag === 'MACHINE EYE'
                                        ? [MACHINE_EYE_ITEMS[machineEyeIndex]]
                                        : visualCultureData.filter(d => d.category === activeTag)
                                }
                                transformOverride={transformOverride}
                                category={activeTag}
                                showBorder={false}
                                hoveredIndex={activeTag === 'MACHINE EYE' && carouselHovered ? 0 : hoveredIndex}
                            />
                        )}

                        {/* Standard Gallery */}
                        {activeTag !== 'MACHINE EYE' && (
                            <div className={`gallery-cards-container ${activeTag ? activeTag.toLowerCase() : ''}`}>
                                {splitVisible ? (
                                    // Compass / Split View Cards
                                    [WEST_ITEM, EAST_ITEM].map((item, idx) => (
                                        <div
                                            className="gallery-card"
                                            key={`compass-${idx}`}
                                            onMouseEnter={() => setHoveredIndex(idx)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        >
                                            <img src={`/gallery_data/${item.filename}`} alt={item.caption} />
                                            <p>{item.caption}</p>
                                        </div>
                                    ))
                                ) : (
                                    // Normal Visual Culture Cards
                                    visualCultureData.filter(d => d.category === activeTag).map((item, idx) => (
                                        <div
                                            className="gallery-card"
                                            key={`${activeTag}-${idx}`}
                                            onMouseEnter={() => setHoveredIndex(idx)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        >
                                            <img src={`/visual_culture/${item.filename}`} alt={item.caption} />
                                            <p>{item.caption}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* MACHINE EYE CAROUSEL - Persistent Render for Transition */}
                        <div className={`carousel-container ${activeTag === 'MACHINE EYE' ? 'active' : ''}`}>
                            <div
                                className="carousel-card"
                                onMouseEnter={() => setCarouselHovered(true)}
                                onMouseLeave={() => setCarouselHovered(false)}
                            >
                                <img
                                    src={`/gallery_data/${MACHINE_EYE_ITEMS[machineEyeIndex].filename}`}
                                    alt="Machine Eye"
                                />
                                <div className="carousel-meta">
                                    <div className="meta-left">
                                        <MapPin size={14} />
                                        <span>{MACHINE_EYE_ITEMS[machineEyeIndex].lat.toFixed(5)}, {MACHINE_EYE_ITEMS[machineEyeIndex].lon.toFixed(5)}</span>
                                    </div>
                                    <div className="meta-right">
                                        <span>
                                            {MACHINE_EYE_ITEMS[machineEyeIndex].bearing}°
                                            {' '}
                                            {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(MACHINE_EYE_ITEMS[machineEyeIndex].bearing / 45) % 8]}
                                        </span>
                                    </div>
                                </div>

                                <div className="carousel-caption-wrapper">
                                    <div className="ai-caption-label">AI Caption:</div>
                                    <div className="ai-caption-text">
                                        <Typewriter
                                            key={activeTag}
                                            text={MACHINE_EYE_ITEMS[machineEyeIndex].caption}
                                            delay={isManualNav ? 0 : 500}
                                        />
                                    </div>
                                </div>

                                <div className="carousel-controls">
                                    <button
                                        onClick={prevMachineEye}
                                        disabled={machineEyeIndex === 0}
                                        style={{ visibility: machineEyeIndex === 0 ? 'hidden' : 'visible' }}
                                    >
                                        &lt;
                                    </button>
                                    <span className="carousel-dots">
                                        {MACHINE_EYE_ITEMS.map((_, i) => (
                                            <span
                                                key={i}
                                                className={`dot ${i === machineEyeIndex ? 'active' : ''}`}
                                            />
                                        ))}
                                    </span>
                                    <button
                                        onClick={nextMachineEye}
                                        disabled={machineEyeIndex === MACHINE_EYE_ITEMS.length - 1}
                                        style={{ visibility: machineEyeIndex === MACHINE_EYE_ITEMS.length - 1 ? 'hidden' : 'visible' }}
                                    >
                                        &gt;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="scrolly-overlay">
                    {/* Trigger to reset state when scrolling entirely to top */}
                    <div className="step" data-tag="INTRO" data-img="abcdefg_2026.png" style={{ minHeight: '10vh', marginBottom: '0' }}></div>
                    <div className="step" data-type="carousel" data-tag="Machine Eye"
                        data-img="skyline_2026-01-01_21-46-22.png">
                        <div className="step-content">
                            <h3>The Machine Eye</h3>
                            <p>Standard maps rely on rigid databases. We used a supercomputer to "watch" the city instead. By
                                generating hundreds of tags for every street view image in Manhattan, we created a searchable visual index of the city.</p>
                        </div>
                    </div>

                    <div className="step" data-type="gallery" data-tag="Chinese"
                        data-img="chinese_2026-01-01_21-23-50.png">
                        <div className="step-content">
                            <h3>Visual Culture</h3>
                            <p>When we query "Chinese," the AI identifies architectural patterns, signage density, and color
                                palettes. It successfully delineates Chinatown without knowing a single zip code.</p>
                        </div>
                    </div>

                    <div className="step" data-type="gallery" data-tag="Gothic"
                        data-img="gothic_2026-01-01_21-31-58.png">
                        <div className="step-content">
                            <h3>Architectural Memory</h3>
                            <p>Querying "Gothic" reveals the 19th-century spine of the city. Churches, universities, and older
                                civic buildings light up, separating the historic from the modern glass towers.</p>
                        </div>
                    </div>

                    <div className="step" data-type="split" data-tag="Compass" data-img="">
                        <div className="step-content">
                            <h3>The Ghost in the Machine</h3>
                            <p>This was unexpected. When we queried "East" vs "West," the model accurately lit up the respective
                                sides of the island. Is it reading street signs? Shadows? The model somehow figured out which way it was facing just by analyzing the image data.</p>
                        </div>
                    </div>

                    <div className="step" data-type="gallery" data-tag="Scaffolding"
                        data-img="scaffolding_2026-01-01_21-55-26.png"
                        style={{ minHeight: '120vh', marginBottom: '20vh' }}>
                        <div className="step-content">
                            <h3>Perpetual Construction</h3>
                            <p>Mapping scaffolding is effectively a way to map change. It highlights exactly where money is being spent on renovation, and
                                where Local Law 11 is forcing facade repairs. It is the temporary city, frozen in 2025.</p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Narrative Block 2 */}
            < section className="narrative-section" >
                <div className="narrative-content">
                    <h3>The Decoded City</h3>
                    <p>
                        When you stop looking for addresses and start looking for <em>patterns</em>, the invisible becomes obvious.
                        Consider the air conditioner. As modern HVAC systems retro-fit the skyline, the window unit becomes a marker
                        of building age and socioeconomic strata.
                    </p>
                    <p>
                        A semantic query can instantly light up every wall sleeve or hanging unit across the boroughs,
                        revealing the city's pace of renovation in real-time.
                    </p>
                    <p>
                        The city is not just a grid of addresses. It is a a dense, messy feed of visual information, and for the first time, we have the processing power to read it.
                    </p>
                    <p>
                        Traditional maps see the city as essentially blueprints. They show streets, blocks, and property lines. But a city is defined by its layers, not just its layout. By applying computer vision to street-level imagery, we are effectively decoding the invisible systems that make New York run.
                    </p>
                    <p>
                        By turning street-level visual noise into structured data, we can finally track things that used to be impossible to quantify. We can finally see the density of culture, the vectors of gentrification, and the physical footprint of the economy. We are moving from a map of location to a map of meaning.
                    </p>
                </div>
            </section >

            <section className="static-grid-section">
                <h2>The Infrastructure of Daily Life</h2>
                <div className="grid-container">
                    <div className="grid-item">
                        <div className="placeholder-img">
                            <img src={`${IMG_BASE}/trash_2026-01-01_21-46-33.png`} alt="Trash" />
                        </div>
                        <p><strong>TRASH:</strong> Correlates with commercial density and foot traffic.</p>
                        <div className="mini-gallery-row">
                            <img src="/gallery_data/trash_10.jpg" alt="Trash 1" />
                            <img src="/gallery_data/trash_12.jpg" alt="Trash 2" />
                            <img src="/gallery_data/trash_27.jpg" alt="Trash 3" />
                            <img src="/gallery_data/trash_04.jpg" alt="Trash 4" />
                            <img src="/gallery_data/trash_07.jpg" alt="Trash 5" />
                            <img src="/gallery_data/trash_09.jpg" alt="Trash 6" />
                            <img src="/gallery_data/trash_11.jpg" alt="Trash 7" />
                            <img src="/gallery_data/trash_13.jpg" alt="Trash 8" />
                            <img src="/gallery_data/trash_15.jpg" alt="Trash 9" />
                        </div>
                    </div>
                    <div className="grid-item">
                        <div className="placeholder-img">
                            <img src={`${IMG_BASE}/bridge_2026-01-01_21-24-51.png`} alt="Bridge" />
                        </div>
                        <p><strong>BRIDGE:</strong> The VLM detects the structural steel of the exits.</p>
                        <div className="mini-gallery-row">
                            <img src="/gallery_data/bridge_10.jpg" alt="Bridge 1" />
                            <img src="/gallery_data/bridge_19.jpg" alt="Bridge 2" />
                            <img src="/gallery_data/bridge_29.jpg" alt="Bridge 3" />
                            <img src="/gallery_data/bridge_02.jpg" alt="Bridge 4" />
                            <img src="/gallery_data/bridge_06.jpg" alt="Bridge 5" />
                            <img src="/gallery_data/bridge_08.jpg" alt="Bridge 6" />
                            <img src="/gallery_data/bridge_09.jpg" alt="Bridge 7" />
                            <img src="/gallery_data/bridge_12.jpg" alt="Bridge 8" />
                            <img src="/gallery_data/bridge_13.jpg" alt="Bridge 9" />
                        </div>
                    </div>
                    <div className="grid-item">
                        <div className="placeholder-img">
                            <img src={`${IMG_BASE}/foliage_2026-01-01_21-39-32.png`} alt="Foliage" />
                        </div>
                        <p><strong>FOLIAGE:</strong> The concrete jungle creates a foliage void in Midtown.</p>
                        <div className="mini-gallery-row">
                            <img src="/gallery_data/foliage_10.jpg" alt="Foliage 1" />
                            <img src="/gallery_data/foliage_12.jpg" alt="Foliage 2" />
                            <img src="/gallery_data/foliage_26.jpg" alt="Foliage 3" />
                            <img src="/gallery_data/foliage_03.jpg" alt="Foliage 4" />
                            <img src="/gallery_data/foliage_04.jpg" alt="Foliage 5" />
                            <img src="/gallery_data/foliage_05.jpg" alt="Foliage 6" />
                            <img src="/gallery_data/foliage_06.jpg" alt="Foliage 7" />
                            <img src="/gallery_data/foliage_07.jpg" alt="Foliage 8" />
                            <img src="/gallery_data/foliage_08.jpg" alt="Foliage 9" />
                        </div>
                    </div>
                    <div className="grid-item">
                        <div className="placeholder-img">
                            <img src={`${IMG_BASE}/graffiti_2026-01-01_21-37-45.png`} alt="Graffiti" />
                        </div>
                        <p><strong>GRAFFITI:</strong> The unauthorized art layer of the Lower East Side.</p>
                        <div className="mini-gallery-row">
                            <img src="/gallery_data/graffiti_04.jpg" alt="Graffiti 1" />
                            <img src="/gallery_data/graffiti_10.jpg" alt="Graffiti 2" />
                            <img src="/gallery_data/graffiti_29.jpg" alt="Graffiti 3" />
                            <img src="/gallery_data/graffiti_01.jpg" alt="Graffiti 4" />
                            <img src="/gallery_data/graffiti_02.jpg" alt="Graffiti 5" />
                            <img src="/gallery_data/graffiti_03.jpg" alt="Graffiti 6" />
                            <img src="/gallery_data/graffiti_05.jpg" alt="Graffiti 7" />
                            <img src="/gallery_data/graffiti_06.jpg" alt="Graffiti 8" />
                            <img src="/gallery_data/graffiti_07.jpg" alt="Graffiti 9" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Narrative Block 3 */}
            <section className="narrative-section">
                <div className="narrative-content">
                    <h3>The Blind Spots</h3>
                    <p>
                        However, this approach has inherent limitations. It is bound by the same physics as the human eye.
                        A fire hydrant can vanish behind a double‑parked delivery truck.
                        A basement entrance can dissolve into darkness.
                        A sidewalk ramp can be present, and effectively invisible, if the frame catches it at the wrong angle.
                    </p>
                    <p>
                        And then there are the structural blind spots: what the camera never sees. Courtyards. Lobbies. Rooftops. The private city behind the street wall. Street View is not “the city.” It is a particular pass, from a particular height, on a particular day, along routes that a platform chose to drive and update.
                    </p>
                    <p>
                        Unlike ground-truth datasets provided by the city, a visual index carries the biases of its vantage point.
                        It sees what the street view car sees - no more, no less.
                    </p>
                    <p>
                        This map represents probabilities, not absolute facts. A missing tag doesn't prove a missing object. In fact, the empty spaces on the map often reveal more about the limitations of data collection than they do about the city itself.
                    </p>
                </div>
            </section>

            <QuizSection />

            <section id="data-stream-section">
                <div className="stream-sticky-map">
                    <CrossFadeMap src={streamImg} activeTag={null} transformOverride="none" />
                </div>
                <div className="stream-list">
                    <div style={{ marginBottom: '4rem' }}>
                        <h3 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>The Visual Language</h3>
                        <p style={{ color: '#888' }}>We found over 3,000 unique descriptive tags. Scroll to explore the weirdest
                            patterns found in the dataset.</p>
                    </div>

                    {STREAM_ITEMS.map((item, index) => (
                        <div
                            key={item.label}
                            ref={el => streamItemsRef.current[index] = el}
                            className={`stream-item ${activeStreamIndex === index ? 'active' : ''}`}
                            data-img={item.img}
                            data-index={index}
                            onClick={() => handleStreamClick(index, item.img)}
                        >
                            <h4>{item.label}</h4>
                            <p>{item.desc}</p>
                            {item.gallery && (
                                <div className="stream-gallery">
                                    {item.gallery.map(gImg => (
                                        <img key={gImg} src={`/gallery_data/${gImg}`} alt={item.label} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Narrative Block 4 */}
            <section className="narrative-section">
                <div className="narrative-content">
                    <h3>The Searchable Future</h3>
                    <p>
                        Imagine a city you can Ctrl+F.
                    </p>
                    <p>
                        Not a list of addresses: a living surface you can query. Search: “scaffolding.” Search: “shade.” Search: “flood risk.” Search: “closed storefront.” Search: “stoops where people actually sit.”
                    </p>
                    <p>
                        We’re heading toward a continuous, searchable reality. As cameras multiply and refresh cycles compress, the map stops being a document and becomes a question you can ask at any moment. The interface is simple—a search bar—but what it returns is new: a city organized by meaning instead of coordinates.
                    </p>
                    <p>
                        This is what open-vocabulary mapping unlocks. Not just navigation, but perception at scale: the ability to see how the city changes as if you stood on every corner at once.
                    </p>
                </div>
            </section>

            <section className="map-embed-section">
                <div className="embed-content-wrapper">
                    <div className="embed-text">
                        <h3>Explore the Data</h3>
                        <p>Search the complete semantic atlas of Manhattan.</p>
                    </div>
                    <div className="iframe-interactive-container">
                        <iframe
                            src="/?embed_source=about"
                            title="Interactive Map"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            loading="lazy"
                        ></iframe>
                    </div>
                    <div className="fullscreen-link-wrapper">
                        <a href="/" target="_blank" rel="noopener noreferrer" className="fullscreen-link">
                            <span>Open Fullscreen App</span>
                            <ArrowDownRight size={18} />
                        </a>
                        <p className="link-subtext">Optimized for desktop experience</p>
                    </div>
                </div>
            </section>

            <TimelapseSection />

            <footer>
                <p>Project by <a href="https://seanhardestylewis.com" target="_blank" rel="noopener noreferrer" className="footer-author-link">Sean Hardesty Lewis</a></p>
                <p style={{ marginTop: '10px', opacity: 0.5 }}>Imagery from Google Maps. © 2025 Google LLC, used under fair use.</p>
            </footer>
        </div >
    );
};

export default AboutPage;
