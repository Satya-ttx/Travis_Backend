const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/travisDB");

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
});


const User = mongoose.model("User", userSchema);
const Agent = mongoose.model("Agent", userSchema);
app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    // First, try to find the user based on email, regardless of role
    let user;
    
    // Try to find in the appropriate collection based on provided role
    if (role === "admin") {
      user = await User.findOne({ email, password });
    } else {
      user = await Agent.findOne({ email, password });
    }
    
    // If user is found, verify their role
    if (user) {
      // Return user information including their actual role from DB
      res.json({ 
        success: true, 
        role: user.role,
        userId: user._id
      });
    } else {
      // Try the other collection as fallback (in case the user selected the wrong role)
      const otherModel = role === "admin" ? Agent : User;
      const otherUser = await otherModel.findOne({ email, password });
      
      if (otherUser) {
        // User exists but in the other collection
        res.json({ 
          success: true, 
          role: otherUser.role,
          userId: otherUser._id 
        });
      } else {
        // No user found in either collection
        res.json({ success: false, message: "Invalid credentials" });
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.post("/register", async (req, res) => {
  console.log("Registration request received:", req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    console.log("Missing required fields");
    return res.status(400).json({ 
      success: false, 
      message: "Email and password are required" 
    });
  }
  try {
    // Check if an agent with this email already exists
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(400).json({ 
        success: false, 
        message: "An agent with this email already exists" 
      });
    }
    
    // Check if a user with this email exists in the User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "A user with this email already exists" 
      });
    }
    
    // Create new agent with role explicitly set to "agent"
    const newAgent = new Agent({
      email,
      password,
      role: "agent" // Always set to "agent" as required
    });
    
    // Save the new agent to the database
    await newAgent.save();
    res.status(201).json({ 
      success: true, 
      message: "Agent registered successfully",
      role: "agent"
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
 