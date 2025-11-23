import React, { useState, useRef, useEffect } from "react";
import { Send, Loader, Moon, Sun, MessageSquare } from "lucide-react";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const response = await fetch("http://localhost:8000/initialize", {
          method: "POST",
        });
        const data = await response.json();
        if (response.ok) {
          setInitialized(true);
        } else {
          setInitError(data.detail);
        }
      } catch (error) {
        setInitError("Failed to connect to backend on http://localhost:8000");
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !initialized) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    const question = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      if (response.ok) {
        const botMessage = {
          role: "assistant",
          content: data.answer,
          sections: data.relevant_sections,
          followUp: data.follow_up_questions,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.detail}`,
            isError: true,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect to the server.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? "dark" : ""}`}>
      <div className="flex flex-col h-full bg-white dark:bg-neutral-900 transition-colors duration-200">
        {/* Header - PaperMod Style */}
        <header className="border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Resume Assistant
                </h1>
                {initialized && !initError && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ● Connected
                  </p>
                )}
                {initError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ● Error
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {initError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="max-w-4xl mx-auto px-6 py-3">
              <p className="text-sm text-red-800 dark:text-red-300">
                {initError}
              </p>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {messages.length === 0 && initialized && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Welcome to Resume Assistant
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Ask me anything about your resume, experience, skills, or
                  projects. I'm here to help!
                </p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl ${msg.role === "user" ? "w-auto" : "w-full"}`}
                  >
                    {/* Assistant Label */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <MessageSquare className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Assistant
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-5 py-3 ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                          : msg.isError
                            ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800"
                            : "bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-neutral-700"
                      }`}
                    >
                      <p className="text-sm  whitespace-pre-wrap text-justify">
                        {msg.content}
                      </p>

                      {/* Follow-up Questions */}
                      {msg.followUp && msg.followUp.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-600 space-y-2">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">
                            Suggested questions:
                          </p>
                          <div className="space-y-2">
                            {msg.followUp.map((q, i) => (
                              <button
                                key={i}
                                onClick={() => setInput(q)}
                                className="block w-full text-left text-sm bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-neutral-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-neutral-600 transition-all"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Label */}
                    {msg.role === "user" && (
                      <div className="flex items-center gap-2 mt-2 justify-end">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          You
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Assistant
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-5 py-3 flex items-center gap-3">
                      <Loader className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEnd} />
            </div>
          </div>
        </main>

        {/* Input Area - PaperMod Style */}
        <footer className="border-t border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 sticky bottom-0">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your resume..."
                  disabled={loading || !initialized}
                  className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded-xl px-5 py-3 pr-12 
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-neutral-900 disabled:cursor-not-allowed
                           transition-all text-[15px]"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={loading || !initialized || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                         text-white px-5 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed 
                         flex items-center gap-2 font-medium shadow-lg hover:shadow-xl
                         transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
