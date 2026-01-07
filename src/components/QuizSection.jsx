import React, { useState } from 'react';

const IMG_BASE = "/screenshots";

const QUIZ_DATA = [
    {
        q: "Which query generated this map?",
        img: "trash_2026-01-01_21-46-33.png",
        options: ["restaurant", "trash", "construction", "rats"],
        correct: "trash",
        expl: "Trash bags pile up in high-density commercial and residential zones, creating a distinct heatmap."
    },
    {
        q: "What is the VLM seeing here?",
        img: "gothic_2026-01-01_21-31-58.png",
        options: ["church", "gothic", "school", "old"],
        correct: "gothic",
        expl: "The model identifies the architectural style 'gothic' across churches, universities, and historic civic buildings."
    },
    {
        q: "This map shows a specific type of infrastructure. Which one?",
        img: "scaffolding_2026-01-01_21-55-26.png",
        options: ["scaffolding", "subway", "stop sign", "bike lane"],
        correct: "scaffolding",
        expl: "Scaffolding (or 'sidewalk sheds') covers huge swaths of the city, creating a map of active renovation."
    },
    {
        q: "Identify the query for this coastal pattern.",
        img: "highway_2026-01-01_21-30-33.png",
        options: ["water", "bridge", "highway", "park"],
        correct: "highway",
        expl: "The FDR and West Side Highway ring the island, creating a crisp perimeter of 'highway' detections."
    },
    {
        q: "What urban feature is mapped here?",
        img: "graffiti_2026-01-01_21-37-45.png",
        options: ["murals", "graffiti", "posters", "subway"],
        correct: "graffiti",
        expl: "The model picks up tag clusters, heavily concentrated in the Lower East Side and industrial interaction zones."
    }
];

// Fisher-Yates Shuffle
const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const QuizSection = () => {
    // Initialize state with randomized options
    const [quizQuestions, setQuizQuestions] = useState(() => {
        return QUIZ_DATA.map(q => ({
            ...q,
            options: shuffleArray(q.options)
        }));
    });

    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);

    const question = quizQuestions[currentQ];

    const handleGuess = (opt) => {
        if (selected) return; // Prevent multiple guesses
        setSelected(opt);
        const correct = opt === question.correct;
        setIsCorrect(correct);
        if (correct) setScore(s => s + 1);
    };

    const nextQuestion = () => {
        const nextIdx = currentQ + 1;
        if (nextIdx < quizQuestions.length) {
            setSelected(null);
            setIsCorrect(null);
            setCurrentQ(nextIdx);
        } else {
            setShowResult(true);
        }
    };

    const restartQuiz = () => {
        // Re-randomize on restart
        setQuizQuestions(QUIZ_DATA.map(q => ({
            ...q,
            options: shuffleArray(q.options)
        })));
        setSelected(null);
        setIsCorrect(null);
        setCurrentQ(0);
        setScore(0);
        setShowResult(false);
    };

    const displayedImage = showResult ? quizQuestions[quizQuestions.length - 1].img : question.img;

    return (
        <section className="quiz-section">
            <div className="quiz-container">
                <div className="quiz-header">
                    <h2>Mini-game: Guess the Map</h2>
                    <p>Can you guess the pattern?</p>
                </div>

                <div className="quiz-card">
                    <div className="quiz-image">
                        <img src={`${IMG_BASE}/${displayedImage}`} alt="Guess the map" />
                    </div>
                    <div className="quiz-content">
                        {showResult ? (
                            <div className="result-summary">
                                <h3>Game Complete</h3>
                                <div style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.5rem' }}>
                                        You scored <strong>{score} / {quizQuestions.length}</strong>
                                    </p>
                                    <p style={{ color: '#888', marginBottom: '2rem' }}>
                                        Want to try again?
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <button
                                            onClick={restartQuiz}
                                            className="option-btn"
                                            style={{ textAlign: 'center', justifyContent: 'center' }}
                                        >
                                            Start Over
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3>{question.q}</h3>
                                <div className="options-grid">
                                    {question.options.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => handleGuess(opt)}
                                            className={`option-btn ${selected === opt
                                                ? (opt === question.correct ? 'correct' : 'wrong')
                                                : ''
                                                } ${selected && opt === question.correct ? 'correct' : ''}`}
                                            disabled={!!selected}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>

                                <div className={`result-box animate-in ${selected ? (isCorrect ? 'success' : 'failure') : 'placeholder'}`}>
                                    <div style={{ visibility: selected ? 'visible' : 'hidden' }}>
                                        <p><strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong> {question.expl}</p>
                                        <button onClick={nextQuestion} className="next-btn">
                                            {currentQ < quizQuestions.length - 1 ? 'Next Pattern →' : 'See Results →'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default QuizSection;
