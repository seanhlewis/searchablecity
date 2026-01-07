import React, { useState, useEffect } from 'react';

const TransformControls = ({ onTransformChange, initialValues }) => {
    // Initial State
    const [transform, setTransform] = useState(initialValues || {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0
    });

    const [status, setStatus] = useState("");

    // Notify parent of changes immediately
    useEffect(() => {
        onTransformChange(transform);
    }, [transform, onTransformChange]);

    const handleChange = (key, value) => {
        setTransform(prev => ({
            ...prev,
            [key]: parseFloat(value)
        }));
    };

    const handleSave = async () => {
        setStatus("Saving...");
        try {
            // Assume Flask backend is running on 5001 (default in app.py)
            // Vite proxy might not be set up for this new path, so use full URL or try relative if proxy exists.
            // Looking at package.json, typically explicit URL is safer for rapid dev if proxy isn't confirmed.
            const response = await fetch('http://localhost:5001/api/save_transform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transform)
            });

            if (response.ok) {
                setStatus("Saved!");
                setTimeout(() => setStatus(""), 2000);
            } else {
                setStatus("Error saving");
            }
        } catch (e) {
            console.error(e);
            setStatus("Network Error");
            // Fallback: Console log
            console.log("Save failed. JSON:", JSON.stringify(transform));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            border: '1px solid #333',
            borderRadius: '8px',
            zIndex: 9999,
            color: '#fff',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '280px'
        }}>
            <h4 style={{ margin: 0, color: '#aaa', fontSize: '0.8rem' }}>TRANSFORM CONTROLS</h4>

            {/* Position */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <label>
                    X (px)
                    <input
                        type="number"
                        value={transform.x}
                        onChange={(e) => handleChange('x', e.target.value)}
                        step="10"
                        style={inputStyle}
                    />
                </label>
                <label>
                    Y (px)
                    <input
                        type="number"
                        value={transform.y}
                        onChange={(e) => handleChange('y', e.target.value)}
                        step="10"
                        style={inputStyle}
                    />
                </label>
            </div>

            {/* Scale */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <label>
                    Scale X
                    <input
                        type="number"
                        value={transform.scaleX}
                        onChange={(e) => handleChange('scaleX', e.target.value)}
                        step="0.1"
                        style={inputStyle}
                    />
                </label>
                <label>
                    Scale Y
                    <input
                        type="number"
                        value={transform.scaleY}
                        onChange={(e) => handleChange('scaleY', e.target.value)}
                        step="0.1"
                        style={inputStyle}
                    />
                </label>
            </div>

            {/* Rotation */}
            <label>
                Rotation (deg)
                <input
                    type="range"
                    min="-180"
                    max="180"
                    value={transform.rotate}
                    onChange={(e) => handleChange('rotate', e.target.value)}
                    style={{ width: '100%' }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.7em' }}>{transform.rotate}°</div>
            </label>

            <button
                onClick={handleSave}
                style={{
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginTop: '5px'
                }}
            >
                {status || "ACCEPT & SAVE"}
            </button>
        </div>
    );
};

const inputStyle = {
    background: '#222',
    border: '1px solid #444',
    color: '#fff',
    width: '100%',
    padding: '4px',
    borderRadius: '3px',
    fontSize: '0.9em'
};

export default TransformControls;
