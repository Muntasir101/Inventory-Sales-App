const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Product = require('./Product');

const Sale = sequelize.define('Sale', {
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    },
    onUpdate: 'CASCADE',  // Optional: Update sale if product ID is updated
    onDelete: 'CASCADE'   // Optional: Delete sale if product is deleted
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1  // Ensure at least 1 product is sold
    }
  },
  salesPrice: {  // Field to track the sales price per unit
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0  // Ensure sales price is non-negative
    }
  },
  totalPrice: {  // Calculated field for the total price of the sale
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0  // Ensure total price is non-negative
    }
  },
  saleDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,  // Default to the current date and time
    allowNull: false
  }
});

// Define the association: A Sale belongs to a Product
Sale.belongsTo(Product, { foreignKey: 'productId' });

module.exports = Sale;
