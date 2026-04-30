const express = require('express');
const Order = require('../models/Order');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate, channel, trendMonths: trendMonthsParam } = req.query;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const matchFilter = { orderDate: { $gte: start, $lte: end } };
    if (channel) matchFilter.salesChannel = channel;

    // Trend always covers the last N months from today, independent of the KPI date filter
    const trendN = Math.min(24, Math.max(1, parseInt(trendMonthsParam) || 6));
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (trendN - 1), 1);
    const trendEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const trendFilter = { orderDate: { $gte: trendStart, $lte: trendEnd } };
    if (channel) trendFilter.salesChannel = channel;

    // Lead filter uses same date range applied to lead creation date
    const leadFilter = { date: { $gte: start, $lte: end } };

    // Previous period (same duration, shifted back) for % change comparison
    const periodMs = end - start;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(start.getTime() - periodMs - 1);
    const prevFilter = { orderDate: { $gte: prevStart, $lte: prevEnd } };
    if (channel) prevFilter.salesChannel = channel;

    // Dormant customers (no order in 90+ days)
    const dormantCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

    // Full funnel: all-time lead counts by status
    const allLeadFilter = {};

    const [orderStats, channelBreakdown, monthlyTrend, leadStats, topProducts, customerStats, prevStats, funnelStats, dormantCount] = await Promise.all([
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
      ]),
      // Previous period totals for % change
      Order.aggregate([
        { $match: prevFilter },
        { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$orderValue' } } }
      ]),
      // Full funnel — all-time lead status breakdown
      Lead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Dormant customers (no order in 90+ days)
      Customer.countDocuments({ lastOrderDate: { $lt: dormantCutoff } })
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, newCustomers: 0, repeatCustomers: 0 };
    const leads = leadStats[0] || { total: 0, converted: 0 };
    const custStats = customerStats[0] || { total: 0, repeat: 0 };
    const prev = prevStats[0] || { totalOrders: 0, totalRevenue: 0 };

    // Build funnel from all-time lead status counts
    const funnelMap = Object.fromEntries(funnelStats.map(f => [f._id, f.count]));
    const totalLeadsAllTime = Object.values(funnelMap).reduce((s, v) => s + v, 0);
    const funnel = {
      total:       totalLeadsAllTime,
      interested:  funnelMap['Interested']    || 0,
      followUp:    funnelMap['Follow Up']     || 0,
      converted:   funnelMap['Converted']     || 0,
      notInterested: funnelMap['Not Interested'] || 0,
    };

    // % change vs previous period
    const pctChange = (curr, prev) => prev > 0 ? +((( curr - prev) / prev) * 100).toFixed(1) : null;

    res.json({
      overview: {
        ...stats,
        conversionRate: leads.total > 0 ? ((leads.converted / leads.total) * 100).toFixed(1) : 0,
        totalLeads: leads.total,
        convertedLeads: leads.converted,
        uniqueCustomers: custStats.total,
        repeatCustomerCount: custStats.repeat,
        prevOrders: prev.totalOrders,
        prevRevenue: prev.totalRevenue,
        ordersChange: pctChange(stats.totalOrders, prev.totalOrders),
        revenueChange: pctChange(stats.totalRevenue, prev.totalRevenue),
        dormantCustomers: dormantCount
      },
      channelBreakdown,
      monthlyTrend,
      topProducts,
      funnel
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
