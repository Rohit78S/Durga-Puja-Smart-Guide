from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allows your HTML/JS to talk to this Python app

# 1. Basic Health Check
@app.route('/')
def home():
    return "Python Backend is Running!"

# 2. Login Route (Where your JS will send data)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()  # Get the data sent by JS
    username = data.get('username')
    password = data.get('password')

    print(f"Received login attempt: {username} / {password}")

    # TODO: Later, we will check this against your MySQL Database
    if username == "admin" and password == "1234":
        return jsonify({"status": "success", "message": "Login Successful!"})
    else:
        return jsonify({"status": "error", "message": "Wrong password!"}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5000)