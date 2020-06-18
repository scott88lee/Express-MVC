const purchases = require("../models/purchases");
const products = require("../models/products");
const sales = require("../models/sales");
const helper = require('../helpers/helper');
const { PerformanceObserver, performance } = require('perf_hooks');

module.exports = {

  serveDashboard: async (req, res) => {
    res.render("reports/dashboard", { layout: "reportLayout" })
  },

  serveCOGS: async (req, res) => {
    res.render("reports/cogs", { layout: "reportLayout" })
  },

  searchCOGS: async (req, res) => {
    try {
      let dateRange = req.body.start + " to " + req.body.end
      let s1 = performance.now()
      let purQ = await purchases.getPurchasesQueue()
      let totSold = await sales.totalSoldBeforeDate(req.body.start)
      let salesQ = await sales.getSalesQueue(req.body)
      let s2 = performance.now()
      console.log(s2-s1)
      //Setting inv start cursor
      let s3 = performance.now()
      
      for (let i in purQ) {
        for (let k = 0; k < purQ[i].buy_queue.length; k++) {
          if (purQ[i].buy_queue[k].buy_qty > totSold[purQ[i].sku]) {
            purQ[i].buy_queue[k].buy_qty -= totSold[purQ[i].sku];
            k = purQ[i].buy_queue.length;
          }
          else if (purQ[i].buy_queue[k].buy_qty <= totSold[purQ[i].sku]) {
            totSold[purQ[i].sku] -= purQ[i].buy_queue[k].buy_qty;
            purQ[i].buy_queue.splice(k, 1);
            k -= 1;
          }
        }
      }

      let totalSales = 0;

      for (let i in salesQ) {  // Joining both stacks for simpler looping
        for (let k in purQ) {
          if (salesQ[i].sku == purQ[k].sku) {
            salesQ[i].buy_queue = purQ[k].buy_queue;
          }
        }
        for (let k in salesQ[i].sold_queue) {
          totalSales += salesQ[i].sold_queue[k].sold_qty * salesQ[i].sold_queue[k].sold_price;
        }
      }

      let cogs = 0;

      for (let i in salesQ) {
        // console.log()
        // console.log(salesQ[i].sku)
        // console.log()
        for (let j = 0, k = 0; j < salesQ[i].sold_queue.length; j++) {
          // console.log("j = " + j + ", k = " + k)
          // console.log("===================")

          if (salesQ[i].sold_queue[j].sold_qty < salesQ[i].buy_queue[k].buy_qty) {
            cogs += salesQ[i].sold_queue[j].sold_qty * salesQ[i].buy_queue[k].buy_cost;
            salesQ[i].buy_queue[k].buy_qty -= salesQ[i].sold_queue[j].sold_qty
            // console.log("Sold: " + salesQ[i].sold_queue[j].sold_qty + " & " + salesQ[i].buy_queue[k].buy_qty + " left @ " + salesQ[i].buy_queue[k].buy_cost)
            // console.log("COGS: " + cogs)
          }
          //NEED TO THINK OF RECURSIVE SOLUTION
          else {
            let spillover = true;
            while (spillover) {
              if (salesQ[i].buy_queue[k].buy_qty != 0) {
                if (salesQ[i].sold_queue[j].sold_qty > salesQ[i].buy_queue[k].buy_qty) {
                  // console.log("Selling: " + salesQ[i].sold_queue[j].sold_qty + " but left " + salesQ[i].buy_queue[k].buy_qty)
                  cogs += salesQ[i].buy_queue[k].buy_qty * salesQ[i].buy_queue[k].buy_cost;
                  // console.log("Sold " + salesQ[i].buy_queue[k].buy_qty + " @ " + salesQ[i].buy_queue[k].buy_cost)
                  // console.log("COGS: " + cogs)
                  salesQ[i].sold_queue[j].sold_qty -= salesQ[i].buy_queue[k].buy_qty
                  salesQ[i].buy_queue[k].buy_qty = 0;
                  k++;
                }
                else if (salesQ[i].sold_queue[j].sold_qty <= salesQ[i].buy_queue[k].buy_qty) {
                  cogs += salesQ[i].sold_queue[j].sold_qty * salesQ[i].buy_queue[k].buy_cost;
                  salesQ[i].buy_queue[k].buy_qty -= salesQ[i].sold_queue[j].sold_qty
                  // console.log("Sold: " + salesQ[i].sold_queue[j].sold_qty + " & " + salesQ[i].buy_queue[k].buy_qty + " left @ " + salesQ[i].buy_queue[k].buy_cost)
                  // console.log("COGS: " + cogs)
                  spillover = false;
                }
              } else {
                spillover = false
              }
            }
          }
        }
      }

      let grossProfit = totalSales - cogs;
      let s4 = performance.now()
      console.log(s4-s3)
      res.render("reports/cogs", {
        layout: "reportLayout",
        dateRange: dateRange,
        totalSales: totalSales,
        cogs: cogs,
        grossProfit: grossProfit,
      })
    }
    catch (err) {
      console.log(err)
      res.render("error", { message: err.message })
    }
  },

  getCurrentInventory: async (req, res) => {
    try {
      let totalPurchases = await purchases.totalPurchasesByProduct();
      let totalSales = await sales.totalSalesByProduct();
      let today = helper.todayDDMMYYYY()

      for (let i in totalPurchases) {
        for (let k in totalSales) {
          if (totalPurchases[i].sku === totalSales[k].sku) {
            totalPurchases[i].total_qty -= totalSales[k].total_qty
            totalSales[k].processed = true;
          }
        }
      } //BUG !!!

      res.render("reports/invlevel", { layout: "reportLayout", date: today, inv: totalPurchases })
    }
    catch (err) {
      console.log(err)
      res.render("error", { message: err.message })
    }
  }
}