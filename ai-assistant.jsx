import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, TrendingUp, Users } from 'lucide-react';

const AIPujaAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const messagesEndRef = useRef(null);

  // Sample pandal data - matches your data structure
  const pandalDatabase = [
    { id: 1, name: "Bagbazar Sarbojanin", area: "Bagbazar", type: "heritage", theme: "Traditional", crowdLevel: "high", accessibility: true, foodNearby: true, bestTime: "evening" },
    { id: 2, name: "Kumartuli Park", area: "Kumartuli", type: "theme", theme: "Environmental", crowdLevel: "medium", accessibility: true, foodNearby: true, bestTime: "afternoon" },
    { id: 3, name: "Hatibagan Nabin Pally", area: "Hatibagan", type: "community", theme: "Unity", crowdLevel: "low", accessibility: true, foodNearby: false, bestTime: "morning" },
    { id: 4, name: "Ahiritola Sarbojanin", area: "Ahiritola", type: "heritage", theme: "Classical", crowdLevel: "high", accessibility: false, foodNearby: true, bestTime: "evening" },
    { id: 5, name: "Sovabazar Rajbari", area: "Sovabazar", type: "heritage", theme: "Royal", crowdLevel: "medium", accessibility: true, foodNearby: true, bestTime: "afternoon" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage('ai', 'Namaskar! 🙏 I\'m your AI Puja Assistant. I can help you with:\n\n• Personalized pandal recommendations\n• Route planning and optimization\n• Crowd predictions & best visit times\n• Finding pandals by theme or location\n• Accessibility and food information\n\nWhat would you like to know?');
      generateInitialRecommendations();
    }
  }, [isOpen]);

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const generateInitialRecommendations = () => {
    const topPandals = pandalDatabase
      .filter(p => p.crowdLevel !== 'high')
      .slice(0, 3);
    setRecommendations(topPandals);
  };

  const analyzeUserIntent = (message) => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('recommend') || lowerMsg.includes('suggest') || lowerMsg.includes('best')) {
      return 'recommendation';
    } else if (lowerMsg.includes('route') || lowerMsg.includes('plan') || lowerMsg.includes('optimize')) {
      return 'route';
    } else if (lowerMsg.includes('crowd') || lowerMsg.includes('busy') || lowerMsg.includes('time')) {
      return 'crowd';
    } else if (lowerMsg.includes('food') || lowerMsg.includes('eat')) {
      return 'food';
    } else if (lowerMsg.includes('wheelchair') || lowerMsg.includes('accessible') || lowerMsg.includes('disability')) {
      return 'accessibility';
    } else if (lowerMsg.includes('heritage') || lowerMsg.includes('traditional') || lowerMsg.includes('theme')) {
      return 'type';
    } else if (lowerMsg.includes('near') || lowerMsg.includes('location') || lowerMsg.includes('area')) {
      return 'location';
    }
    return 'general';
  };

  const generateAIResponse = async (userMessage) => {
    const intent = analyzeUserIntent(userMessage);
    let response = '';
    let recommendedPandals = [];

    switch (intent) {
      case 'recommendation':
        recommendedPandals = getSmartRecommendations(userMessage);
        response = `Based on your query, here are my top recommendations:\n\n${recommendedPandals.map((p, i) => 
          `${i + 1}. **${p.name}** (${p.area})\n   • Theme: ${p.theme}\n   • Crowd: ${p.crowdLevel}\n   • Best time: ${p.bestTime}\n   ${p.accessibility ? '✓ Wheelchair accessible' : ''}`
        ).join('\n\n')}`;
        setRecommendations(recommendedPandals);
        break;

      case 'route':
        response = `I can help you plan the perfect route! 🗺️\n\nFor an optimized route, I recommend:\n\n1. Start early (9-11 AM) for heritage pandals\n2. Visit 4-6 pandals per session\n3. Take breaks at food spots\n\nWould you like me to create a custom route based on your preferences?`;
        break;

      case 'crowd':
        response = `Here's the crowd prediction for today:\n\n🟢 **Low Crowd** (Best to visit):\n• Hatibagan Nabin Pally - Morning\n• Kumartuli Park - Afternoon\n\n🟡 **Medium Crowd**:\n• Sovabazar Rajbari - All day\n\n🔴 **High Crowd** (Avoid peak hours):\n• Bagbazar Sarbojanin - Evening\n• Ahiritola Sarbojanin - Evening\n\nBest overall time to visit: 10 AM - 2 PM`;
        break;

      case 'food':
        const foodPandals = pandalDatabase.filter(p => p.foodNearby);
        response = `Great food options near these pandals:\n\n${foodPandals.map((p, i) => 
          `${i + 1}. **${p.name}** - Famous street food in ${p.area}`
        ).join('\n')}`;
        break;

      case 'accessibility':
        const accessiblePandals = pandalDatabase.filter(p => p.accessibility);
        response = `Wheelchair accessible pandals:\n\n${accessiblePandals.map((p, i) => 
          `${i + 1}. **${p.name}** (${p.area})\n   ${p.crowdLevel === 'low' ? '✓ Less crowded - easier navigation' : ''}`
        ).join('\n\n')}`;
        setRecommendations(accessiblePandals);
        break;

      case 'type':
        const typeMatch = userMessage.match(/heritage|traditional|theme|community/i);
        const type = typeMatch ? typeMatch[0].toLowerCase() : 'heritage';
        const typePandals = pandalDatabase.filter(p => p.type === type);
        response = `${type.charAt(0).toUpperCase() + type.slice(1)} pandals:\n\n${typePandals.map((p, i) => 
          `${i + 1}. **${p.name}** - ${p.theme} theme`
        ).join('\n')}`;
        setRecommendations(typePandals);
        break;

      case 'location':
        response = `I can help you find pandals near you! 📍\n\nPopular areas:\n• Bagbazar - Heritage pandals\n• Kumartuli - Artist quarter\n• Sovabazar - Royal palaces\n\nWhich area interests you?`;
        break;

      default:
        response = `I can help you with:\n\n🎭 Pandal recommendations\n🗺️ Route planning\n👥 Crowd predictions\n🍴 Food spots\n♿ Accessibility info\n📍 Location-based search\n\nWhat would you like to know more about?`;
    }

    return response;
  };

  const getSmartRecommendations = (query) => {
    const lowerQuery = query.toLowerCase();
    let scored = pandalDatabase.map(pandal => {
      let score = 0;
      
      if (lowerQuery.includes('heritage') && pandal.type === 'heritage') score += 3;
      if (lowerQuery.includes('theme') && pandal.type === 'theme') score += 3;
      if (lowerQuery.includes('community') && pandal.type === 'community') score += 3;
      if (lowerQuery.includes('accessible') && pandal.accessibility) score += 3;
      if (lowerQuery.includes('food') && pandal.foodNearby) score += 2;
      if (lowerQuery.includes('less crowd') && pandal.crowdLevel === 'low') score += 3;
      if (lowerQuery.includes('kids') && pandal.crowdLevel === 'low') score += 2;
      if (lowerQuery.includes(pandal.area.toLowerCase())) score += 2;
      
      if (!lowerQuery.includes('popular') && !lowerQuery.includes('famous')) {
        if (pandal.crowdLevel === 'low') score += 1;
        if (pandal.crowdLevel === 'medium') score += 0.5;
      }
      
      return { ...pandal, score };
    });
    
    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage('user', userMessage);
    setInput('');
    setIsTyping(true);

    setTimeout(async () => {
      const response = await generateAIResponse(userMessage);
      addMessage('ai', response);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (action) => {
    setInput(action);
    setTimeout(() => handleSendMessage(), 100);
  };

  const quickActions = [
    "Recommend heritage pandals",
    "Best time to visit today",
    "Wheelchair accessible options",
    "Pandals with good food nearby"
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center gap-2 group"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="hidden group-hover:inline-block font-semibold">AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-96 h-[600px] flex flex-col overflow-hidden border-2 border-orange-200">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Puja Assistant</h3>
                <p className="text-xs text-white/80">Smart recommendations • Live updates</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {recommendations.length > 0 && (
            <div className="bg-orange-50 p-3 border-b border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-800">Top Picks for You</span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {recommendations.map(rec => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-lg p-2 min-w-[160px] border border-orange-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="font-semibold text-sm text-gray-800">{rec.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{rec.area}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-3 h-3 text-orange-600" />
                      <span className="text-xs text-orange-600">{rec.crowdLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-orange-50/30 to-white">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                      : 'bg-white border-2 border-orange-200 text-gray-800'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-600">AI Assistant</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                  <div className="text-xs mt-2 opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border-2 border-orange-200 rounded-2xl p-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="p-3 bg-orange-50 border-t border-orange-200">
              <p className="text-xs font-semibold text-orange-800 mb-2">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action)}
                    className="text-xs bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 rounded-lg p-2 transition-colors text-left"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-white border-t-2 border-orange-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 border-2 border-orange-200 rounded-full px-4 py-2 focus:outline-none focus:border-orange-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full p-2 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPujaAssistant;