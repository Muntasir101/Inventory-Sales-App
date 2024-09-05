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
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  saleDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Association: A Sale belongs to a Product
Sale.belongsTo(Product, { foreignKey: 'productId' });

module.exports = Sale;
