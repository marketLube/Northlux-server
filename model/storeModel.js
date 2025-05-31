const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  area: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  pincode: {
    type: Number,
    required: true,
  }
});

const storeSchema = new mongoose.Schema(
  {
    store_name: {
      type: String,
      required: true,
    },

    store_number: {
      type: Number,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    address: addressSchema,

    login_number: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    activeStatus: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", storeSchema);
