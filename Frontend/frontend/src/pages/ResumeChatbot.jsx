import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Loader, MessageCircle, CheckCircle } from 'lucide-react';

export default function ResumeChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState('');
  const [initializing, setInitializing] = useState(true);
  const messagesEnd = useRef(null);

  // Initialize on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const response = await fetch('http://localhost:8000/initialize', {
          method: 'POST',
        });
        const data = await response.json();
        if (response.ok) {
          setInitialized(true);
          setInitError('');
        } else {
          setInitError(data.detail);
          setInitialized(false);
        }
      } catch (error) {
        setInitError('Failed to connect to backend. Make sure it\'s running on http://localhost:8000');
        setInitialized(false);
      } finally {
        setInitializing(false);
      }
    };
    initializeApp();
  }, []);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setUploadStatus('❌ Please upload a PDF file');
      return;
    }

    setUploading(true);
    setUploadStatus('');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:8000/reload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      const data = await response.json();
      if (response.ok) {
        setUploadStatus(`✅ ${data.message}`);
        setFile(selectedFile.name);
      } else {
        setUploadStatus(`❌ ${data.detail}`);
      }
    } catch (error) {
      setUploadStatus('❌ Upload failed. Make sure the backend is running.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const question = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      if (response.ok) {
        const botMessage = {
          role: 'assistant',
          content: data.answer,
          sections: data.relevant_sections,
          followUp: data.follow_up_questions,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.detail}`, isError: true },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to connect to the server. Make sure the backend is running on http://localhost:8000',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Resume Chatbot</h1>
                <p className="text-sm text-slate-400">
                  {initializing ? 'Initializing...' : initialized ? '✓ Ready' : '✗ Error'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {initError && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 text-red-200 rounded-lg">
              <p className="font-semibold">Initialization Error</p>
              <p className="text-sm mt-1">{initError}</p>
            </div>
          )}

          {initializing && (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Loader className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-slate-300">Initializing chatbot...</p>
            </div>
          )}

          {!initializing && messages.length === 0 && !initError && (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="mb-6 p-4 bg-slate-700/30 rounded-2xl">
                <MessageCircle className="w-16 h-16 text-slate-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Resume Chatbot</h2>
              <p className="text-slate-400 max-w-md">
                Ask questions about your resume and get instant answers with relevant sections and suggestions.
              </p>
            </div>
          )}

          {!initializing && messages.length > 0 && (
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-5 py-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : msg.isError
                          ? 'bg-red-900/30 border border-red-700/50 text-red-200'
                          : 'bg-slate-700/50 border border-slate-600 text-slate-100'
                    } transition-all duration-300`}
                  >
                    <p className="leading-relaxed">{msg.content}</p>

                    {/* Sections and Follow-up Questions */}
                    {msg.sections && msg.sections.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-600">
                        <p className="text-xs font-semibold text-slate-300 mb-2">Relevant sections:</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sections.map((section, i) => (
                            <span
                              key={i}
                              className="inline-block px-3 py-1 bg-slate-600 text-slate-200 text-xs rounded-full hover:bg-slate-500 transition-colors"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.followUp && msg.followUp.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-300">Suggested questions:</p>
                        {msg.followUp.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(q)}
                            className="block w-full text-left text-xs px-3 py-2 bg-slate-600/40 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors truncate"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-slate-700/50 border border-slate-600 rounded-2xl px-5 py-4 flex items-center gap-2">
                    <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-slate-300 text-sm">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEnd} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 bg-slate-800/50 backdrop-blur-md sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask something about your resume..."
              disabled={loading || !initialized}
              rows="1"
              className="flex-1 px-5 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !initialized || !input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          {!initialized && !initializing && (
            <p className="text-xs text-slate-400 mt-2">Cannot send message - initialization failed</p>
          )}
          {initialized && (
            <p className="text-xs text-slate-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
