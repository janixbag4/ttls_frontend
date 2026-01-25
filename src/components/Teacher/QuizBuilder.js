import React, { useState } from 'react';
import './TeacherDashboard.css';

const QuizBuilder = ({ questions, onChange }) => {
  const [localQuestions, setLocalQuestions] = useState(questions || []);

  const addQuestion = (type) => {
    const newQuestion = {
      _id: `temp_${Date.now()}_${Math.random()}`,
      question: '',
      type: type,
      options: type === 'multiple-choice' ? ['', '', '', ''] : [],
      correctAnswer: '',
      correctAnswers: [],
      points: 1,
      order: localQuestions.length,
    };
    const updated = [...localQuestions, newQuestion];
    setLocalQuestions(updated);
    onChange(updated);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
    onChange(updated);
  };

  const removeQuestion = (index) => {
    const updated = localQuestions.filter((_, i) => i !== index);
    updated.forEach((q, i) => { q.order = i; });
    setLocalQuestions(updated);
    onChange(updated);
  };

  const addOption = (index) => {
    const updated = [...localQuestions];
    updated[index].options = [...(updated[index].options || []), ''];
    setLocalQuestions(updated);
    onChange(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...localQuestions];
    updated[qIndex].options[oIndex] = value;
    setLocalQuestions(updated);
    onChange(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...localQuestions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setLocalQuestions(updated);
    onChange(updated);
  };

  const addEnumerationAnswer = (index) => {
    const updated = [...localQuestions];
    updated[index].correctAnswers = [...(updated[index].correctAnswers || []), ''];
    setLocalQuestions(updated);
    onChange(updated);
  };

  const updateEnumerationAnswer = (qIndex, aIndex, value) => {
    const updated = [...localQuestions];
    updated[qIndex].correctAnswers[aIndex] = value;
    setLocalQuestions(updated);
    onChange(updated);
  };

  const removeEnumerationAnswer = (qIndex, aIndex) => {
    const updated = [...localQuestions];
    updated[qIndex].correctAnswers = updated[qIndex].correctAnswers.filter((_, i) => i !== aIndex);
    setLocalQuestions(updated);
    onChange(updated);
  };

  const totalPoints = localQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

  return (
    <div className="quiz-builder">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>Quiz Questions ({localQuestions.length})</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => addQuestion('multiple-choice')} style={{ fontSize: 12, padding: '6px 12px' }}>
            + Multiple Choice
          </button>
          <button type="button" className="btn-secondary" onClick={() => addQuestion('identification')} style={{ fontSize: 12, padding: '6px 12px' }}>
            + Identification
          </button>
          <button type="button" className="btn-secondary" onClick={() => addQuestion('enumeration')} style={{ fontSize: 12, padding: '6px 12px' }}>
            + Enumeration
          </button>
          <button type="button" className="btn-secondary" onClick={() => addQuestion('essay')} style={{ fontSize: 12, padding: '6px 12px' }}>
            + Essay
          </button>
          <button type="button" className="btn-secondary" onClick={() => addQuestion('file-upload')} style={{ fontSize: 12, padding: '6px 12px' }}>
            + File Upload
          </button>
        </div>
      </div>

      {totalPoints > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: 8, fontSize: 14 }}>
          <strong>Total Points: {totalPoints}</strong>
        </div>
      )}

      {localQuestions.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No questions added yet. Click a button above to add a question.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {localQuestions.map((q, qIndex) => (
            <div key={q._id || qIndex} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: '0.25rem' }}>
                    Question {qIndex + 1} • {q.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <input
                    type="text"
                    placeholder="Enter question..."
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Points"
                    value={q.points || 1}
                    onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                    style={{ width: 80, padding: '6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Multiple Choice */}
              {q.type === 'multiple-choice' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Options:
                  </label>
                  {q.options.map((option, oIndex) => (
                    <div key={oIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name={`correct_${qIndex}`}
                        checked={q.correctAnswer === String(oIndex)}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', String(oIndex))}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, oIndex)}
                          style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    style={{ marginTop: '0.5rem', padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {/* Identification */}
              {q.type === 'identification' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Correct Answer:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the correct answer..."
                    value={q.correctAnswer || ''}
                    onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                  />
                </div>
              )}

              {/* Enumeration */}
              {q.type === 'enumeration' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                    Correct Answers (one per line):
                  </label>
                  {(q.correctAnswers || []).map((answer, aIndex) => (
                    <div key={aIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`Answer ${aIndex + 1}`}
                        value={answer}
                        onChange={(e) => updateEnumerationAnswer(qIndex, aIndex, e.target.value)}
                        style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeEnumerationAnswer(qIndex, aIndex)}
                        style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addEnumerationAnswer(qIndex)}
                    style={{ marginTop: '0.5rem', padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    + Add Answer
                  </button>
                </div>
              )}

              {/* Essay and File Upload - no correct answer needed */}
              {(q.type === 'essay' || q.type === 'file-upload') && (
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: 6, fontSize: 13, color: '#92400e' }}>
                  This question will be graded manually by the teacher.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;

