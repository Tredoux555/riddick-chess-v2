import React, { useState } from 'react';
import LessonPlayer from '../components/LessonPlayer';
import { SAMPLE_LESSON_PAWN, SAMPLE_LESSON_INTRO } from '../data/sampleLessons';
import '../styles/LearnTest.css';

const LearnTest = () => {
  const [selectedLesson, setSelectedLesson] = useState(null);

  const lessons = [
    SAMPLE_LESSON_INTRO,
    SAMPLE_LESSON_PAWN
  ];

  const handleComplete = () => {
    alert(`Lesson ${selectedLesson.title} complete! Earned ${selectedLesson.xp} XP`);
    setSelectedLesson(null);
  };

  if (selectedLesson) {
    return (
      <LessonPlayer
        lesson={selectedLesson}
        onComplete={handleComplete}
        onExit={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="learn-test-page">
      <div className="learn-test-container">
        <div className="learn-test-header">
          <div className="test-badge">🧪 TEST MODE</div>
          <h1 className="learn-test-title">Interactive Lessons</h1>
          <p className="learn-test-subtitle">New 3-Exercise System Demo</p>
        </div>

        <div className="lessons-grid">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="lesson-card"
              onClick={() => setSelectedLesson(lesson)}
            >
              <div className="lesson-icon">
                {lesson.id === 'intro' ? (
                  <div className="chessboard-icon">
                    {[...Array(64)].map((_, i) => (
                      <div key={i}></div>
                    ))}
                  </div>
                ) : (
                  lesson.icon
                )}
              </div>
              <div className="lesson-content">
                <h2 className="lesson-title">{lesson.title}</h2>
                <p className="lesson-description">{lesson.description}</p>
                <div className="lesson-stats">
                  <div className="stat">
                    <span>XP:</span>
                    <span className="stat-value">{lesson.xp}</span>
                  </div>
                  <div className="stat">
                    <span>Exercises:</span>
                    <span className="stat-value">3</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="features-section">
          <h3 className="features-title">✨ What's New</h3>
          <ul className="features-list">
            <li className="feature-item">
              <span className="check">✓</span>
              3 progressive exercises per lesson (practice → challenge → quiz)
            </li>
            <li className="feature-item">
              <span className="check">✓</span>
              Hearts reset between exercises (3 per exercise)
            </li>
            <li className="feature-item">
              <span className="check">✓</span>
              Progressive hints unlock after failed attempts
            </li>
            <li className="feature-item">
              <span className="check">✓</span>
              XP locked until ALL 3 exercises complete
            </li>
            <li className="feature-item">
              <span className="check">✓</span>
              Stunning gradients matching riddickchess.site theme
            </li>
            <li className="feature-item">
              <span className="check">✓</span>
              Glass morphism, shadows, and smooth animations
            </li>
            <li className="feature-item">
              <span className="check">✓</span>
              Mobile-responsive design
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LearnTest;
