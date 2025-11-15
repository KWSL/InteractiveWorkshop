import React, { useState, useEffect } from 'react';
import { Send, Monitor, Smartphone, Trash2, RefreshCw, ThumbsUp, Plus, X, ChevronRight, ChevronLeft, Check, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue, remove, update } from 'firebase/database';

// ============================================
// FIREBASE CONFIGURATION - REPLACE WITH YOUR CONFIG
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyD6cSF4EFpUKplWo1hYcwAl-JExQ3qcML8",
  authDomain: "workshop-qa.firebaseapp.com",
  databaseURL: "https://workshop-qa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "workshop-qa",
  storageBucket: "workshop-qa.firebasestorage.app",
  messagingSenderId: "430925696908",
  appId: "1:430925696908:web:3c386dd2bf3eb0b58410a9",
  databaseURL: "https://workshop-qa-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function WorkshopQA() {
  const forceMode = window.location.hash.includes('participant') ? 'participant' : 
                    window.location.hash.includes('presenter') ? 'presenter' : 
                    null;
  
  const [mode, setMode] = useState(forceMode || 'select');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [participantAnswer, setParticipantAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);

  // Load questions
  const loadQuestions = async () => {
    try {
      const snapshot = await get(ref(database, 'workshop-questions'));
      if (snapshot.exists()) {
        setQuestions(snapshot.val());
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  // Load current question index
  const loadCurrentIndex = async () => {
    try {
      const snapshot = await get(ref(database, 'workshop-current-index'));
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return 0;
    } catch (error) {
      console.error('Error loading index:', error);
      return 0;
    }
  };

  // Load responses for current question
  const loadResponses = async (index) => {
    try {
      const snapshot = await get(ref(database, `workshop-responses-${index}`));
      if (snapshot.exists()) {
        setResponses(snapshot.val());
      } else {
        setResponses([]);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
      setResponses([]);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    if (mode !== 'select') {
      // Load everything
      loadQuestions();
      
      loadCurrentIndex().then(index => {
        setCurrentQuestionIndex(index);
        loadResponses(index);
      });

      // Set up real-time listeners
      const questionsRef = ref(database, 'workshop-questions');
      const unsubscribeQuestions = onValue(questionsRef, (snapshot) => {
        if (snapshot.exists()) {
          setQuestions(snapshot.val());
        }
      });

      const indexRef = ref(database, 'workshop-current-index');
      const unsubscribeIndex = onValue(indexRef, (snapshot) => {
        if (snapshot.exists()) {
          const newIndex = snapshot.val();
          setCurrentQuestionIndex(newIndex);
          loadResponses(newIndex);
        }
      });

      return () => {
        unsubscribeQuestions();
        unsubscribeIndex();
      };
    }
  }, [mode]);

  // Real-time listener for responses
  useEffect(() => {
    if (mode !== 'select' && questions.length > 0) {
      const responsesRef = ref(database, `workshop-responses-${currentQuestionIndex}`);
      const unsubscribe = onValue(responsesRef, (snapshot) => {
        if (snapshot.exists()) {
          setResponses(snapshot.val());
        } else {
          setResponses([]);
        }
      });

      return () => unsubscribe();
    }
  }, [currentQuestionIndex, mode, questions.length]);

  // Save questions
  const saveQuestions = async (newQuestions) => {
    setLoading(true);
    try {
      await set(ref(database, 'workshop-questions'), newQuestions);
      setQuestions(newQuestions);
    } catch (error) {
      console.error('Error saving questions:', error);
    }
    setLoading(false);
  };

  // Add question
  const addQuestion = async () => {
    if (!newQuestion.trim()) return;
    const updated = [...questions, newQuestion.trim()];
    await saveQuestions(updated);
    setNewQuestion('');
  };

  // Delete question
  const deleteQuestion = async (index) => {
    const updated = questions.filter((_, i) => i !== index);
    await saveQuestions(updated);
    if (currentQuestionIndex >= updated.length && updated.length > 0) {
      await setActiveQuestion(updated.length - 1);
    }
  };

  // Move question up
  const moveQuestionUp = async (index) => {
    if (index === 0) return;
    const updated = [...questions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    await saveQuestions(updated);
    
    if (currentQuestionIndex === index) {
      await setActiveQuestion(index - 1);
    } else if (currentQuestionIndex === index - 1) {
      await setActiveQuestion(index);
    }
  };

  // Move question down
  const moveQuestionDown = async (index) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    await saveQuestions(updated);
    
    if (currentQuestionIndex === index) {
      await setActiveQuestion(index + 1);
    } else if (currentQuestionIndex === index + 1) {
      await setActiveQuestion(index);
    }
  };

  // Set active question
  const setActiveQuestion = async (index) => {
    setLoading(true);
    try {
      await set(ref(database, 'workshop-current-index'), index);
      setCurrentQuestionIndex(index);
      await loadResponses(index);
    } catch (error) {
      console.error('Error setting question:', error);
    }
    setLoading(false);
  };

  // Clear responses
  const clearResponses = async () => {
    setClearing(true);
    try {
      for (let i = 0; i < questions.length; i++) {
        await set(ref(database, `workshop-responses-${i}`), []);
      }
      setResponses([]);
    } catch (error) {
      console.error('Error clearing responses:', error);
    }
    setClearing(false);
  };

  // Submit response
  const submitResponse = async () => {
    if (!participantAnswer.trim()) return;
    
    setLoading(true);
    try {
      const snapshot = await get(ref(database, `workshop-responses-${currentQuestionIndex}`));
      let currentResponses = snapshot.exists() ? snapshot.val() : [];
      
      const newResponse = {
        id: Date.now(),
        answer: participantAnswer.trim(),
        likes: 0,
        checked: false,
        timestamp: new Date().toLocaleTimeString()
      };
      
      currentResponses.push(newResponse);
      await set(ref(database, `workshop-responses-${currentQuestionIndex}`), currentResponses);
      setParticipantAnswer('');
    } catch (error) {
      console.error('Error submitting response:', error);
    }
    setLoading(false);
  };

  // Like response
  const likeResponse = async (responseId) => {
    setLoading(true);
    try {
      const snapshot = await get(ref(database, `workshop-responses-${currentQuestionIndex}`));
      const currentResponses = snapshot.exists() ? snapshot.val() : [];
      
      const updated = currentResponses.map(r => 
        r.id === responseId ? { ...r, likes: r.likes + 1 } : r
      );
      
      await set(ref(database, `workshop-responses-${currentQuestionIndex}`), updated);
    } catch (error) {
      console.error('Error liking response:', error);
    }
    setLoading(false);
  };

  // Toggle checkmark
  const toggleCheckmark = async (responseId) => {
    setLoading(true);
    try {
      const snapshot = await get(ref(database, `workshop-responses-${currentQuestionIndex}`));
      const currentResponses = snapshot.exists() ? snapshot.val() : [];
      
      const updated = currentResponses.map(r => 
        r.id === responseId ? { ...r, checked: !r.checked } : r
      );
      
      await set(ref(database, `workshop-responses-${currentQuestionIndex}`), updated);
    } catch (error) {
      console.error('Error toggling checkmark:', error);
    }
    setLoading(false);
  };

  // Delete response
  const deleteResponse = async (responseId) => {
    setLoading(true);
    try {
      const snapshot = await get(ref(database, `workshop-responses-${currentQuestionIndex}`));
      const currentResponses = snapshot.exists() ? snapshot.val() : [];
      
      const updated = currentResponses.filter(r => r.id !== responseId);
      
      await set(ref(database, `workshop-responses-${currentQuestionIndex}`), updated);
    } catch (error) {
      console.error('Error deleting response:', error);
    }
    setLoading(false);
  };

  // Sort responses
  const sortedResponses = [...responses].sort((a, b) => {
    if (a.checked !== b.checked) {
      return a.checked ? 1 : -1;
    }
    return b.likes - a.likes;
  });

  // Mode selection screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">Workshop Q&A</h1>
          <p className="text-gray-600 mb-8 text-center">Interactive audience response system</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('presenter')}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-gray-300 hover:border-gray-400 flex flex-col items-center gap-4"
            >
              <Monitor className="w-16 h-16" style={{color: '#437484'}} />
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Presenter View</h2>
                <p className="text-gray-600">Manage questions and view responses</p>
              </div>
            </button>
            
            <button
              onClick={() => setMode('participant')}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-gray-300 hover:border-gray-400 flex flex-col items-center gap-4"
            >
              <Smartphone className="w-16 h-16" style={{color: '#437484'}} />
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Participant View</h2>
                <p className="text-gray-600">Submit and vote on answers</p>
              </div>
            </button>
          </div>
          
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Responses are shared across all users in real-time via Firebase. Participants should use their own devices to access this same page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Presenter view
  if (mode === 'presenter') {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">EP3/EnergyPlus Workshop</h1>
            <button
              onClick={() => setMode('select')}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{backgroundColor: '#5d655d'}}
            >
              Exit
            </button>
          </div>
          
          {/* Question management */}
          <div className={`mb-6 transition-all ${questionsCollapsed ? 'border-b-2 border-gray-300 cursor-pointer hover:border-gray-400' : 'bg-white border border-gray-300 rounded-xl p-6'}`} onClick={() => questionsCollapsed && setQuestionsCollapsed(false)}>
            <div className={`flex justify-between items-center ${questionsCollapsed ? '' : 'mb-4'}`}>
              {!questionsCollapsed && (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuestionsCollapsed(true)}
                      className="p-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                      style={{backgroundColor: '#5d655d'}}
                      title="Collapse questions"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-gray-800">Questions</h2>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearResponses}
                      disabled={clearing}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                      style={{backgroundColor: '#5d655d'}}
                    >
                      <Trash2 className="w-4 h-4" />
                      {clearing ? 'Clearing...' : 'Clear All Responses'}
                    </button>
                    <button
                      onClick={() => setEditingQuestions(!editingQuestions)}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                      style={{backgroundColor: '#437484'}}
                    >
                      {editingQuestions ? 'Done Editing' : 'Edit Questions'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {!questionsCollapsed && (
              <>
                {editingQuestions ? (
                  <div className="space-y-3">
                    {questions.map((q, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg border border-gray-300">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveQuestionUp(index)}
                            disabled={index === 0}
                            className="p-1 text-white rounded hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{backgroundColor: '#5d655d'}}
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveQuestionDown(index)}
                            disabled={index === questions.length - 1}
                            className="p-1 text-white rounded hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{backgroundColor: '#5d655d'}}
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-gray-800 flex-1">{q}</span>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="p-2 text-white rounded hover:opacity-90 transition-opacity"
                          style={{backgroundColor: '#5d655d'}}
                          title="Delete question"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="flex gap-3 mt-4">
                      <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-800 rounded-lg focus:outline-none focus:ring-2"
                        style={{focusRingColor: '#437484'}}
                        placeholder="Add new question..."
                      />
                      <button
                        onClick={addQuestion}
                        disabled={!newQuestion.trim()}
                        className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        style={{backgroundColor: '#437484'}}
                      >
                        <Plus className="w-5 h-5" />
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No questions yet. Click "Edit Questions" to add some.</p>
                    ) : (
                      questions.map((q, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveQuestion(index)}
                          className={`w-full text-left p-4 rounded-lg transition-all text-gray-800 ${
                            index === currentQuestionIndex
                              ? 'text-gray-800 border-2'
                              : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                          }`}
                          style={index === currentQuestionIndex ? {backgroundColor: '#c79917', borderColor: '#c79917'} : {}}
                        >
                          <span className="font-semibold">Q{index + 1}:</span> {q}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Current question display */}
          {questions.length > 0 && (
            <>
              <div className="border border-gray-300 rounded-xl p-6 mb-6" style={{backgroundColor: '#c79917'}}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveQuestion(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="p-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30"
                    style={{backgroundColor: '#437484'}}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="flex-1 text-center">
                    <p className="text-gray-800 text-2xl font-semibold">{questions[currentQuestionIndex]}</p>
                  </div>
                  
                  <button
                    onClick={() => setActiveQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="p-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30"
                    style={{backgroundColor: '#437484'}}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 text-sm">
                    {responses.length} response{responses.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-600 text-xs flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Real-time sync
                  </span>
                </div>
              </div>

              {/* Responses grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedResponses.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-gray-500">
                    Waiting for participant responses...
                  </div>
                ) : (
                  sortedResponses.map((response) => (
                    <div key={response.id} className={`bg-white rounded-lg p-4 border-2 flex items-center gap-3 ${response.checked ? 'border-gray-400 opacity-60' : 'border-gray-300'}`}>
                      <p className="text-gray-800 flex-1">{response.answer}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleCheckmark(response.id)}
                          disabled={loading}
                          className={`p-1 rounded transition-colors text-white ${
                            response.checked 
                              ? 'opacity-90' 
                              : 'hover:opacity-90'
                          }`}
                          style={{backgroundColor: response.checked ? '#437484' : '#5d655d'}}
                          title={response.checked ? 'Mark as unhandled' : 'Mark as handled'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => likeResponse(response.id)}
                          disabled={loading}
                          className="p-1 rounded transition-colors text-gray-800 hover:opacity-90 disabled:opacity-50 flex items-center"
                          style={{backgroundColor: '#c79917'}}
                          title="Like this response"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span className="ml-0.5 text-xs font-semibold">{response.likes}</span>
                        </button>
                        <button
                          onClick={() => deleteResponse(response.id)}
                          disabled={loading}
                          className="p-1 text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                          style={{backgroundColor: '#5d655d'}}
                          title="Delete response"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Participant view
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">EP3/EnergyPlus Workshop</h1>
          {!forceMode && (
            <button
              onClick={() => setMode('select')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Exit
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-300">
          {questions.length > 0 && questions[currentQuestionIndex] ? (
            <>
              <div className="mb-6">
                <p className="text-2xl text-gray-900 font-medium">{questions[currentQuestionIndex]}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Your Answer:</label>
                  <textarea
                    value={participantAnswer}
                    onChange={(e) => setParticipantAnswer(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-800"
                    style={{focusRingColor: '#437484'}}
                    placeholder="Type your answer here..."
                  />
                </div>

                <button
                  onClick={submitResponse}
                  disabled={loading}
                  className="w-full px-6 py-4 text-gray-800 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold"
                  style={{backgroundColor: '#c79917'}}
                >
                  <Send className="w-5 h-5" />
                  Submit Response
                </button>
              </div>

              {/* Other responses */}
              <div className="border-t border-gray-300 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Other Responses ({sortedResponses.length})
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sortedResponses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No responses yet. Be the first!</p>
                  ) : (
                    sortedResponses.map((response) => (
                      <div key={response.id} className="bg-gray-50 rounded-lg p-4 border border-gray-300 flex items-center gap-3">
                        <p className="text-gray-900 flex-1">{response.answer}</p>
                        <button
                          onClick={() => likeResponse(response.id)}
                          disabled={loading}
                          className="p-1 rounded transition-colors disabled:opacity-50 text-gray-800 hover:opacity-90 flex items-center gap-1 flex-shrink-0"
                          style={{backgroundColor: '#c79917'}}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-xs font-semibold">{response.likes}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">Waiting for the presenter to set up questions...</p>
              <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mt-4 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}