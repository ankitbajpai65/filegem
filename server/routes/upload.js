const express = require("express");
const router = express.Router();
const { upload } = require('../middleware/upload');
const verifyToken = require('../middleware/auth')
const { handleFileUpload } = require('../controllers/upload');

router.post('/', verifyToken, upload, handleFileUpload);

module.exports = router;