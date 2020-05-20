const products = require("../models/products");
const purchases = require("../models/purchases");

module.exports = {
  getAll: (req, res) => {
    res.send("GetAll");
  },

  new: async  (req, res) => {
    let productList = await products.getAll("physical");
    res.render("addPurchase", { 
      layout: "purLayout",
      products: productList
    });
  },

  recordPurchase: async (req, res) => {
    let data = req.body;
    //Convert base64 payload to JSON object
    // base64 encoded input string
    let str = data.payload
    // create buffer from base64 string
    let binaryData = Buffer.from(str, "base64");
    // decode buffer as utf8, then JSON.Parse
    data.list = JSON.parse(binaryData.toString("utf8"))
    
    res.send("Purchase successfully added. " + JSON.stringify(data))
  }
};
