const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById
} = require("../controllers/usercontroller2");
const { registerValidators, loginValidators } = require('../middleware/validators');

router.get("/", (req, res) => res.send("User API is working"));

router.post("/register", registerValidators, registerUser);
router.post("/login", loginValidators, loginUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);

module.exports = router;