from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import random

app = Flask(__name__)
CORS(app)

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",
        database="your_database"
    )

@app.route('/')
def home():
    return "Backend Connected to Database!"

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    print(f"Login attempt for: {username}")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM users WHERE username = %s AND password = %s"
        cursor.execute(query, (username, password))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user:
            print("✅ User found!")
            return jsonify({"status": "success", "message": "Login Successful", "user": user})
        else:
            print("❌ User not found")
            return jsonify({"status": "error", "message": "Invalid credentials"})
    
    except mysql.connector.Error as err:
        print(f"⚠️ Database Error: {err}")
        return jsonify({"status": "error", "message": "Server Database Error"})

# NEW: AI-Powered Recommendation System
@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """
    AI-powered recommendation system that suggests:
    - What to do next
    - Where to visit
    - Personalized content based on user behavior
    """
    data = request.get_json()
    user_id = data.get('user_id')
    user_interests = data.get('interests', [])  # User's interests
    current_location = data.get('location', 'unknown')
    time_of_day = data.get('time_of_day', 'day')  # morning, afternoon, evening, night
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user's past activities
        cursor.execute("SELECT * FROM user_activities WHERE user_id = %s ORDER BY timestamp DESC LIMIT 10", (user_id,))
        past_activities = cursor.fetchall()
        
        # AI Recommendation Logic
        recommendations = {
            "actions": generate_action_recommendations(past_activities, user_interests, time_of_day),
            "places": generate_place_recommendations(current_location, user_interests, time_of_day),
            "content": generate_content_recommendations(past_activities, user_interests),
            "personalized_message": generate_personalized_message(user_interests, time_of_day)
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({"status": "success", "recommendations": recommendations})
    
    except mysql.connector.Error as err:
        print(f"⚠️ Database Error: {err}")
        return jsonify({"status": "error", "message": "Could not generate recommendations"})

def generate_action_recommendations(past_activities, interests, time_of_day):
    """Generate personalized action recommendations"""
    actions = []
    
    # Time-based recommendations
    if time_of_day == "morning":
        actions.extend([
            {"action": "Start your day with meditation", "icon": "🧘", "priority": "high"},
            {"action": "Check your daily goals", "icon": "📋", "priority": "medium"},
            {"action": "Review your calendar", "icon": "📅", "priority": "high"}
        ])
    elif time_of_day == "evening":
        actions.extend([
            {"action": "Review your achievements today", "icon": "⭐", "priority": "medium"},
            {"action": "Plan tomorrow's tasks", "icon": "📝", "priority": "high"},
            {"action": "Relax with a book or music", "icon": "🎵", "priority": "low"}
        ])
    
    # Interest-based recommendations
    if "fitness" in interests:
        actions.append({"action": "Complete your workout session", "icon": "💪", "priority": "high"})
    if "learning" in interests:
        actions.append({"action": "Continue your online course", "icon": "📚", "priority": "medium"})
    if "social" in interests:
        actions.append({"action": "Connect with friends", "icon": "👥", "priority": "medium"})
    
    return actions[:5]  # Return top 5 recommendations

def generate_place_recommendations(location, interests, time_of_day):
    """Generate place recommendations based on location and interests"""
    places = []
    
    # Location-based places (you can integrate with a real places API)
    base_places = {
        "restaurant": [
            {"name": "The Garden Bistro", "type": "Fine Dining", "distance": "0.5 km", "rating": 4.5, "icon": "🍽️"},
            {"name": "Spice Route", "type": "Indian Cuisine", "distance": "1.2 km", "rating": 4.7, "icon": "🍛"},
            {"name": "Ocean View Cafe", "type": "Seafood", "distance": "2.1 km", "rating": 4.3, "icon": "🦞"}
        ],
        "entertainment": [
            {"name": "City Cinema Complex", "type": "Movie Theater", "distance": "1.5 km", "rating": 4.4, "icon": "🎬"},
            {"name": "Adventure Park", "type": "Theme Park", "distance": "5.0 km", "rating": 4.8, "icon": "🎢"},
            {"name": "Live Music Bar", "type": "Nightlife", "distance": "0.8 km", "rating": 4.6, "icon": "🎸"}
        ],
        "fitness": [
            {"name": "Fitness First Gym", "type": "Gym", "distance": "0.3 km", "rating": 4.5, "icon": "🏋️"},
            {"name": "Yoga Wellness Center", "type": "Yoga Studio", "distance": "1.0 km", "rating": 4.7, "icon": "🧘"},
            {"name": "City Park", "type": "Outdoor", "distance": "0.7 km", "rating": 4.6, "icon": "🌳"}
        ],
        "shopping": [
            {"name": "Grand Mall", "type": "Shopping Center", "distance": "2.0 km", "rating": 4.5, "icon": "🛍️"},
            {"name": "Artisan Market", "type": "Local Market", "distance": "1.3 km", "rating": 4.4, "icon": "🏪"},
            {"name": "Tech Hub Store", "type": "Electronics", "distance": "1.8 km", "rating": 4.6, "icon": "💻"}
        ]
    }
    
    # Match interests to place categories
    for interest in interests:
        if interest in base_places:
            places.extend(base_places[interest])
    
    # Add general recommendations if no specific matches
    if not places:
        places.extend(random.sample(base_places["restaurant"] + base_places["entertainment"], 3))
    
    return places[:6]  # Return top 6 places

def generate_content_recommendations(past_activities, interests):
    """Generate personalized content recommendations"""
    content = []
    
    content_library = {
        "fitness": [
            {"title": "10-Minute Morning Workout", "type": "Video", "duration": "10 min", "icon": "▶️"},
            {"title": "Nutrition Guide for Beginners", "type": "Article", "duration": "5 min read", "icon": "📖"}
        ],
        "learning": [
            {"title": "Python for Data Science", "type": "Course", "duration": "2 hours", "icon": "🎓"},
            {"title": "Daily Tech News Digest", "type": "Newsletter", "duration": "3 min read", "icon": "📰"}
        ],
        "entertainment": [
            {"title": "Top Movies This Week", "type": "List", "duration": "2 min read", "icon": "🎬"},
            {"title": "Trending Music Playlist", "type": "Playlist", "duration": "1 hour", "icon": "🎵"}
        ]
    }
    
    for interest in interests:
        if interest in content_library:
            content.extend(content_library[interest])
    
    return content[:4]  # Return top 4 content items

def generate_personalized_message(interests, time_of_day):
    """Generate a personalized greeting message"""
    greetings = {
        "morning": "Good morning! ☀️",
        "afternoon": "Good afternoon! 🌤️",
        "evening": "Good evening! 🌆",
        "night": "Good night! 🌙"
    }
    
    greeting = greetings.get(time_of_day, "Hello!")
    
    if interests:
        interest_text = f" Based on your interests in {', '.join(interests)}, we have some great suggestions for you!"
    else:
        interest_text = " Let us help you discover something new today!"
    
    return greeting + interest_text

# Track user activities for better recommendations
@app.route('/api/track-activity', methods=['POST'])
def track_activity():
    """Track user activities to improve recommendations"""
    data = request.get_json()
    user_id = data.get('user_id')
    activity_type = data.get('activity_type')  # e.g., 'visited_place', 'completed_task', 'viewed_content'
    activity_data = data.get('activity_data')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """INSERT INTO user_activities (user_id, activity_type, activity_data, timestamp) 
                   VALUES (%s, %s, %s, NOW())"""
        cursor.execute(query, (user_id, activity_type, str(activity_data)))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Activity tracked"})
    
    except mysql.connector.Error as err:
        print(f"⚠️ Database Error: {err}")
        return jsonify({"status": "error", "message": "Could not track activity"})

if __name__ == '__main__':
    app.run(debug=True, port=5500)