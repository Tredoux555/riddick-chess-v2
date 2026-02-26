import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaUpload, FaVideo } from 'react-icons/fa';

const AdminLessons = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'basics',
    difficulty: 'beginner',
    order_index: 0,
    video_url: '',
    video_file: null
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadLessons();
  }, [isAdmin]);

  const loadLessons = async () => {
    try {
      const response = await axios.get('/api/lessons/admin/all');
      setLessons(response.data);
    } catch (error) {
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('difficulty', form.difficulty);
      formData.append('order_index', form.order_index);
      
      if (form.video_file) {
        formData.append('video', form.video_file);
      } else if (form.video_url) {
        formData.append('video_url', form.video_url);
      }

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };

      if (editingLesson) {
        await axios.put(`/api/lessons/${editingLesson.id}`, formData, config);
        toast.success('Lesson updated!');
      } else {
        await axios.post('/api/lessons', formData, config);
        toast.success('Lesson created!');
      }
      
      resetForm();
      loadLessons();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save lesson');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      description: lesson.description || '',
      category: lesson.category,
      difficulty: lesson.difficulty,
      order_index: lesson.order_index,
      video_url: lesson.video_url?.startsWith('http') ? lesson.video_url : '',
      video_file: null
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/lessons/${id}`);
      toast.success('Lesson deleted');
      loadLessons();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  const togglePublish = async (lesson) => {
    try {
      await axios.put(`/api/lessons/${lesson.id}`, { 
        is_published: !lesson.is_published 
      });
      toast.success(lesson.is_published ? 'Lesson hidden' : 'Lesson published');
      loadLessons();
    } catch (error) {
      toast.error('Failed to update lesson');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingLesson(null);
    setForm({
      title: '',
      description: '',
      category: 'basics',
      difficulty: 'beginner',
      order_index: 0,
      video_url: '',
      video_file: null
    });
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1><FaVideo style={{ marginRight: '12px' }} />Manage Lessons</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '12px 24px',
            background: '#769656',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaPlus /> Add Lesson
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '30px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2>{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</h2>
            
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    background: '#2a2a2a',
                    color: 'white'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    background: '#2a2a2a',
                    color: 'white',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      background: '#2a2a2a',
                      color: 'white'
                    }}
                  >
                    <option value="basics">Basics</option>
                    <option value="openings">Openings</option>
                    <option value="tactics">Tactics</option>
                    <option value="endgames">Endgames</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      background: '#2a2a2a',
                      color: 'white'
                    }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>Order</label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={e => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      background: '#2a2a2a',
                      color: 'white'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>
                  <FaUpload style={{ marginRight: '8px' }} />
                  Upload Video
                </label>
                {editingLesson?.video_url && (
                  <div style={{ marginBottom: '10px', padding: '10px', background: 'rgba(118,150,86,0.2)', borderRadius: '8px', color: '#95cc75', fontSize: '14px' }}>
                    ✓ This lesson already has a video. Upload a new one to replace it.
                  </div>
                )}
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => setForm({ ...form, video_file: e.target.files[0], video_url: '' })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    background: '#2a2a2a',
                    color: 'white'
                  }}
                />
                {form.video_file && (
                  <p style={{ color: '#95cc75', marginTop: '5px', fontSize: '14px' }}>
                    Selected: {form.video_file.name}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#d0d0e0' }}>
                  Or paste video URL (YouTube, etc.)
                </label>
                <input
                  type="text"
                  value={form.video_url}
                  onChange={e => setForm({ ...form, video_url: e.target.value, video_file: null })}
                  placeholder="https://..."
                  disabled={form.video_file}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    background: form.video_file ? '#1a1a1a' : '#2a2a2a',
                    color: 'white'
                  }}
                />
              </div>

              {uploading && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    background: '#333',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    height: '10px'
                  }}>
                    <div style={{
                      background: '#769656',
                      width: `${uploadProgress}%`,
                      height: '100%',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <p style={{ color: '#c0c0d0', marginTop: '5px', fontSize: '14px' }}>
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: uploading ? '#666' : '#769656',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: uploading ? 'wait' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {uploading ? 'Uploading...' : (editingLesson ? 'Update Lesson' : 'Create Lesson')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '14px 24px',
                    background: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lessons Table */}
      <div style={{ marginTop: '30px' }}>
        {lessons.length === 0 ? (
          <p style={{ color: '#c0c0d0', textAlign: 'center' }}>No lessons yet. Add your first one!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Difficulty</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Views</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map(lesson => (
                <tr key={lesson.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '12px' }}>{lesson.title}</td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>{lesson.category}</td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>{lesson.difficulty}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{lesson.views}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: lesson.is_published ? '#22c55e' : '#666'
                    }}>
                      {lesson.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => togglePublish(lesson)}
                      style={{ background: 'none', border: 'none', color: '#c0c0d0', cursor: 'pointer', marginRight: '10px' }}
                      title={lesson.is_published ? 'Hide' : 'Publish'}
                    >
                      {lesson.is_published ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button
                      onClick={() => handleEdit(lesson)}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminLessons;

