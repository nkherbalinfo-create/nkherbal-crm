const express = require('express');
const Order = require('../models/Order');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate, channel } = req.query;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const matchFilter = { orderDate: { $gte: start, $lte: end } };
    if (channel) matchFilter.salesChannel = channel;

    // Trend uses selected period when dates provided, otherwise last 6 months
    const trendStart = startDate ? start : new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const trendFilter = { orderDate: { $gte: trendStart, $lte: end } };
    if (channel) trendFilter.salesChannel = channel;

    // Lead filter uses same date range applied to lead creation date
    const leadFilter = { date: { $gte: start, $lte: end } };

    const [orderStats, channelBreakdown, monthlyTrend, leadStats, topProducts, customerStats] = await Promise.all([
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$orderValue' },
            avgOrderValue: { $avg: '$orderValue' },
            newCustomers: { $sum: { $cond: [{ $eq: ['$customerType', 'New'] }, 1, 0] } },
            repeatCustomers: { $sum: { $cond: [{ $eq: ['$customerType', 'Repeat'] }, 1, 0] } },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$salesChannel', orders: { $sum: 1 }, revenue: { $sum: '$orderValue' } } }
      ]),
      // Monthly trend respects the date filter and channel filter
      Order.aggregate([
        { $match: trendFilter },
        {
          $group: {
            _id: { year: { $year: '$orderDate' }, month: { $month: '$orderDate' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$orderValue' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Conversion rate based on leads created in the same period
      Lead.aggregate([
        { $match: leadFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$productName', orders: { $sum: 1 }, revenue: { $sum: '$orderValue' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]),
      // Unique customers = distinct buyers in the filtered period, not all-time
      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$mobile', customerType: { $last: '$customerType' } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            repeat: { $sum: { $cond: [{ $eq: ['$customerType', 'Repeat'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, newCustomers: 0, repeatCustomers: 0 };
    const leads = leadStats[0] || { total: 0, converted: 0 };
    const custStats = customerStats[0] || { total: 0, repeat: 0 };

    res.json({
      overview: {
        ...stats,
        conversionRate: leads.total > 0 ? ((leads.converted / leads.total) * 100).toFixed(1) : 0,
        totalLeads: leads.total,
        convertedLeads: leads.converted,
        uniqueCustomers: custStats.total,
        repeatCustomerCount: custStats.repeat
      },
      channelBreakdown,
      monthlyTrend,
      topProducts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
