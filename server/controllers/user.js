const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const handleUserSignup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.json({ status: "error", message: "All fields are required." });
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res
        .status(409)
        .json({ status: "error", message: "User Already Exist. Please Login" });
    }

    const encryptedUserPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email: email.toLowerCase(),
      password: encryptedUserPassword,
    });
    return res
      .status(201)
      .json({ status: "ok", message: "User registered successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Some error occurred", error });
  }
};

const handleUserLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ email }, process.env.TOKEN_KEY, {
        expiresIn: "5h",
      });
      user.token = token;

      res.cookie("filegem_token", token, {
        // domain: process.env.BASE_URL,
        path: "/",
        sameSite: "none",
        httpOnly: true,
        secure: true,
        expire: Date.now() + 2592000000,
      });

      return res.status(200).json({
        status: "ok",
        message: "Login successful",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }
    return res
      .status(400)
      .json({ status: "error", message: "Invalid Credentials" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error });
  }
};

const handleUserDetails = async (req, res) => {
  const user = req.user;
  try {
    return res.status(200).json({
      status: "ok",
      message: "User details returned successsfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ status: "error", message: error });
  }
};

const handleUserLogout = (req, res) => {
  try {
    res.clearCookie("filegem_token", {
      // domain: process.env.BASE_URL,
      path: "/",
      sameSite: "none",
      httpOnly: true,
      secure: true,
      expire: Date.now() + 2592000000,
    });
    return res.json({ status: "ok", message: "Logged out successfully" });
  } catch (error) {
    console.log(error);
    return res.json({ status: "error", error: error });
  }
};

module.exports = {
  handleUserSignup,
  handleUserLogin,
  handleUserDetails,
  handleUserLogout,
};
