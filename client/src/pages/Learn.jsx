import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaPlay, FaEye, FaGraduationCap, FaChessKnight, FaChessQueen, FaChessRook } from 'react-icons/fa';

const CATEGORIES = {
  basics: { name: 'Basics', icon: FaChessKnight, color: '#22c55e' },
  openings: { name: 'Openings', icon: FaChessRook, color: '#3b82f6' },
  tactics: { name: 'Tactics', icon: FaChessQueen, color: '#f59e0b' },
  endgames: { name: 'Endgames', icon: FaGraduationCap, color: '#8b5cf6' },
};

const DIFFICULTIES = {
  beginner: { name: 'Beginner', color: '#22c55e' },
  intermediate: { name: 'Intermediate', color: '#f59e0b' },
  advanced: { name: 'Advanced', color: '#ef4444' },
};

const Learn = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const response = await axios.get('/api/lessons');
      setLessons(response.data);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.category]) acc[lesson.category] = [];
    acc[lesson.category].push(lesson);
    return acc;
  }, {});

  const filteredLessons = selectedCategory 
    ? { [selectedCategory]: groupedLessons[selectedCategory] || [] }
    : groupedLessons;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
        <p>Loading lessons...</p>
      </div>
    );
  }

  // Video player modal
  if (selectedLesson) {
    return (
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'white' }}>
        <button 
          onClick={() => setSelectedLesson(null)}
          style={{ background: 'none', border: 'none', color: '#769656', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}
        >
          ← Back to lessons
        </button>
        
        <h1>{selectedLesson.title}</h1>
        
        <div style={{ 
          background: '#000', 
          borderRadius: '12px', 
          overflow: 'hidden',
          marginTop: '20px',
          aspectRatio: '16/9'
        }}>
          <video 
            controls 
            autoPlay
            style={{ width: '100%', height: '100%' }}
            src={`${selectedLesson.video_url}?t=${selectedLesson.updated_at || Date.now()}`}
            key={selectedLesson.video_url}
          >
            Your browser does not support video playback.
          </video>
        </div>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ 
            background: CATEGORIES[selectedLesson.category]?.color || '#666',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            {CATEGORIES[selectedLesson.category]?.name || selectedLesson.category}
          </span>
          <span style={{ 
            background: DIFFICULTIES[selectedLesson.difficulty]?.color || '#666',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            {DIFFICULTIES[selectedLesson.difficulty]?.name || selectedLesson.difficulty}
          </span>
          <span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaEye /> {selectedLesson.views} views
          </span>
        </div>
        
        {selectedLesson.description && (
          <div style={{ 
            marginTop: '20px', 
            color: '#ccc', 
            lineHeight: '1.7',
            whiteSpace: 'pre-line'
          }}>
            {selectedLesson.description}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'white' }}>
      <h1><FaGraduationCap style={{ marginRight: '12px' }} />Learn Chess</h1>
      <p style={{ color: '#aaa', marginTop: '10px' }}>Master the game with our video tutorials</p>
      
      {/* Category filters */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            padding: '10px 20px',
            borderRadius: '25px',
            border: 'none',
            cursor: 'pointer',
            background: selectedCategory === null ? '#769656' : 'rgba(255,255,255,0.1)',
            color: 'white',
            fontWeight: selectedCategory === null ? 'bold' : 'normal'
          }}
        >
          All
        </button>
        {Object.entries(CATEGORIES).map(([key, { name, color }]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            style={{
              padding: '10px 20px',
              borderRadius: '25px',
              border: 'none',
              cursor: 'pointer',
              background: selectedCategory === key ? color : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: selectedCategory === key ? 'bold' : 'normal'
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Lessons by category */}
      {Object.entries(filteredLessons).map(([category, categoryLessons]) => (
        <div key={category} style={{ marginTop: '35px' }}>
          <h2 style={{ 
            color: CATEGORIES[category]?.color || '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {(() => {
              const Icon = CATEGORIES[category]?.icon;
              return Icon ? <Icon /> : null;
            })()}
            {CATEGORIES[category]?.name || category}
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            marginTop: '15px'
          }}>
            {categoryLessons.map(lesson => (
              <div 
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                {/* Thumbnail or placeholder */}
                <div style={{
                  aspectRatio: '16/9',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {lesson.thumbnail_url ? (
                    <img src={lesson.thumbnail_url} alt={lesson.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FaPlay style={{ fontSize: '40px', color: 'rgba(255,255,255,0.3)' }} />
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: DIFFICULTIES[lesson.difficulty]?.color || '#666',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {DIFFICULTIES[lesson.difficulty]?.name || lesson.difficulty}
                  </div>
                </div>
                
                <div style={{ padding: '15px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>{lesson.title}</h3>
                  {lesson.description && (
                    <p style={{ 
                      color: '#888', 
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {lesson.description}
                    </p>
                  )}
                  <div style={{ marginTop: '10px', color: '#666', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaEye /> {lesson.views}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {lessons.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
          <FaGraduationCap style={{ fontSize: '60px', marginBottom: '20px', opacity: 0.3 }} />
          <p>No lessons available yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
};

export default Learn;

