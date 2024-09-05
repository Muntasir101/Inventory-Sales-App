const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./models/db');
const Product = require('./models/Product');
const Sale = require('./models/Sale');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to Inventory and Sales Management App');
});

// Sync database
sequelize.sync()
  .then(() => {
    console.log('Database synced');
  })
  .catch((err) => {
    console.error('Unable to sync database:', err);
  });

// CRUD routes for Product

// 1. Create a Product
app.post('/products', async (req, res) => {
  const { name, price, quantity } = req.body;
  try {
    const product = await Product.create({ name, price, quantity });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error creating product' });
  }
});

// 2. Get all Products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// 3. Get a single Product by ID
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByPk(id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching product' });
  }
});

// 4. Update a Product
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, quantity } = req.body;
  try {
    const product = await Product.findByPk(id);
    if (product) {
      product.name = name;
      product.price = price;
      product.quantity = quantity;
      await product.save();
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

// 5. Delete a Product
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByPk(id);
    if (product) {
      await product.destroy();
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// Sales routes

// 1. Create a Sale (decrease stock and record sale)
app.post('/sales', async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    // Find the product by ID
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if there is enough stock
    if (product.quantity < quantity) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    // Calculate total price
    const totalPrice = product.price * quantity;

    // Create the sale record
    const sale = await Sale.create({
      productId: product.id,
      quantity,
      totalPrice
    });

    // Decrease the product's stock
    product.quantity -= quantity;
    await product.save();

    res.status(201).json({ message: 'Sale recorded successfully', sale });
  } catch (error) {
    res.status(500).json({ error: 'Error processing sale' });
  }
});

// 2. Get all Sales
app.get('/sales', async (req, res) => {
  try {
    const sales = await Sale.findAll({ include: Product });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sales' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
