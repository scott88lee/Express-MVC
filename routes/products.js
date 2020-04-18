const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products');

// ROUTES
router.get('/', productsController.getAllProducts);

module.exports = router;