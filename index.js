const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./models/db');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
    console.error(error); // Log error for debugging
    res.status(500).json({ error: 'Error creating product' });
  }
});

// 2. Get all Products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error(error); // Log error for debugging
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
    console.error(error); // Log error for debugging
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
    console.error(error); // Log error for debugging
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
    console.error(error); // Log error for debugging
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// Sales routes

// 1. Create a Sale (decrease stock and record sale with salesPrice)
app.post('/sales', async (req, res) => {
  const { productId, quantity, salesPrice } = req.body;
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

    // Calculate total sale price based on salesPrice
    const totalPrice = salesPrice * quantity;

    // Create the sale record
    const sale = await Sale.create({
      productId: product.id,
      quantity,
      salesPrice,
      totalPrice
    });

    // Decrease the product's stock
    product.quantity -= quantity;
    await product.save();

    res.status(201).json({ message: 'Sale recorded successfully', sale });
  } catch (error) {
    console.error('Error processing sale:', error); // Log the specific error
    res.status(500).json({ error: 'Error processing sale' });
  }
});

// 2. Get all Sales with profit/loss calculation
app.get('/sales', async (req, res) => {
  try {
    const sales = await Sale.findAll({ include: Product });

    // Calculate profit/loss for each sale
    const salesWithProfit = sales.map(sale => {
      const profit = (sale.salesPrice - sale.Product.price) * sale.quantity;
      return {
        saleId: sale.id,
        productName: sale.Product.name,
        quantity: sale.quantity,
        buyingPrice: sale.Product.price,
        salesPrice: sale.salesPrice,
        totalPrice: sale.totalPrice,
        saleDate: sale.saleDate,
        profit
      };
    });

    res.json(salesWithProfit);
  } catch (error) {
    console.error('Error fetching sales:', error); // Log error for debugging
    res.status(500).json({ error: 'Error fetching sales' });
  }
});

// Report generation route with profit/loss summary
app.get('/reports', async (req, res) => {
  const { startDate, endDate } = req.query;

  // Validate input
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Please provide startDate and endDate in query parameters' });
  }

  try {
    // Fetch sales within the specified date range
    const sales = await Sale.findAll({
      where: {
        saleDate: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      include: Product
    });

    // Calculate total revenue, total items sold, and total profit/loss
    let totalRevenue = 0;
    let totalItemsSold = 0;
    let totalProfit = 0;

    const salesDetails = sales.map(sale => {
      const profit = (sale.salesPrice - sale.Product.price) * sale.quantity;
      totalRevenue += sale.totalPrice;
      totalItemsSold += sale.quantity;
      totalProfit += profit;

      return {
        saleId: sale.id,
        productName: sale.Product.name,
        quantity: sale.quantity,
        buyingPrice: sale.Product.price,
        salesPrice: sale.salesPrice,
        totalPrice: sale.totalPrice,
        profit,
        saleDate: sale.saleDate
      };
    });

    // Format report
    const report = {
      totalRevenue,
      totalItemsSold,
      totalProfit,
      totalSales: sales.length,
      salesDetails
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error); // Log error for debugging
    res.status(500).json({ error: 'Error generating report' });
  }
});

// Report generation and PDF download route
app.get('/download-report', async (req, res) => {
    const { startDate, endDate } = req.query;
  
    // Validate input
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Please provide startDate and endDate in query parameters' });
    }
  
    try {
      // Fetch sales within the specified date range
      const sales = await Sale.findAll({
        where: {
          saleDate: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        include: Product
      });
  
      // Calculate total revenue, total items sold, and total profit/loss
      let totalRevenue = 0;
      let totalItemsSold = 0;
      let totalProfit = 0;
  
      const salesDetails = sales.map(sale => {
        const profit = (sale.salesPrice - sale.Product.price) * sale.quantity;
        totalRevenue += sale.totalPrice;
        totalItemsSold += sale.quantity;
        totalProfit += profit;
  
        return {
          saleId: sale.id,
          productName: sale.Product.name,
          quantity: sale.quantity,
          buyingPrice: sale.Product.price,
          salesPrice: sale.salesPrice,
          totalPrice: sale.totalPrice,
          profit,
          saleDate: sale.saleDate
        };
      });
  
      // Create a PDF document
      const doc = new PDFDocument();
      
      // Set the response headers to force download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
  
      // Pipe the PDF to the response stream
      doc.pipe(res);
  
      // Add a title to the PDF
      doc.fontSize(20).text('Sales Report', { align: 'center' });
      doc.fontSize(12).text(`From: ${startDate} To: ${endDate}`, { align: 'center' });
  
      doc.moveDown();
  
      // Add the summary to the PDF
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
      doc.text(`Total Items Sold: ${totalItemsSold}`);
      doc.text(`Total Profit: $${totalProfit.toFixed(2)}`);
      doc.moveDown();
  
      // Add sales details to the PDF
      salesDetails.forEach((sale, index) => {
        doc.text(`Sale #${index + 1}`);
        doc.text(`Product: ${sale.productName}`);
        doc.text(`Quantity: ${sale.quantity}`);
        doc.text(`Buying Price: $${sale.buyingPrice}`);
        doc.text(`Sales Price: $${sale.salesPrice}`);
        doc.text(`Total Price: $${sale.totalPrice}`);
        doc.text(`Profit: $${sale.profit}`);
        doc.text(`Date: ${sale.saleDate}`);
        doc.moveDown();
      });
  
      // Finalize the PDF and end the stream
      doc.end();
    } catch (error) {
      res.status(500).json({ error: 'Error generating report' });
    }
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
