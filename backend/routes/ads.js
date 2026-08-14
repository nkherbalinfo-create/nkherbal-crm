const express = require('express');
const https   = require('https');
const { protect } = require('../middleware/auth');
const router  = express.Router();

const TOKEN   = process.env.META_ADS_TOKEN;
const ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const BASE    = 'https://graph.facebook.com/v19.0';

function metaGet(path) {
  return new Promise((resolve, reject) => {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${BASE}${path}${sep}access_token=${TOKEN}`;
    https.get(url, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

router.get('/stats', protect, async (req, res) => {
  try {
    const { preset = 'this_month' } = req.query;

    const [account, insightsMonth, insights30d, campaigns] = await Promise.all([
      metaGet(`/${ACCOUNT}?fields=name,amount_spent,balance,currency,spend_cap`),
      metaGet(`/${ACCOUNT}/insights?fields=spend,impressions,clicks,cpc,ctr,reach&date_preset=this_month`),
      metaGet(`/${ACCOUNT}/insights?fields=spend,impressions,clicks&date_preset=last_30d&time_increment=1`),
      metaGet(`/${ACCOUNT}/campaigns?fields=name,status,daily_budget,lifetime_budget,budget_remaining&limit=10`),
    ]);

    if (account.error) return res.status(400).json({ message: account.error.message });

    // Meta stores currency amounts in minor units (paise for INR) — divide by 100
    const toRupees = v => Math.round(parseFloat(v || 0) * 100) / 100;

    const overview = {
      name:        account.name,
      currency:    account.currency,
      amountSpent: toRupees(account.amount_spent / 100),
      balance:     toRupees(account.balance / 100),
      spendCap:    toRupees(account.spend_cap / 100),
    };

    const monthly = insightsMonth.data?.[0] || {};
    const thisMonth = {
      spend:       parseFloat(monthly.spend || 0),
      impressions: parseInt(monthly.impressions || 0),
      clicks:      parseInt(monthly.clicks || 0),
      cpc:         parseFloat(monthly.cpc || 0),
      ctr:         parseFloat(monthly.ctr || 0),
      reach:       parseInt(monthly.reach || 0),
      dateStart:   monthly.date_start,
      dateStop:    monthly.date_stop,
    };

    // Daily spend for chart
    const daily = (insights30d.data || []).map(d => ({
      date:  d.date_start,
      spend: parseFloat(d.spend || 0),
    }));

    // Active campaigns
    const activeCampaigns = (campaigns.data || [])
      .filter(c => c.status === 'ACTIVE')
      .map(c => ({
        name:            c.name,
        status:          c.status,
        dailyBudget:     c.daily_budget ? toRupees(c.daily_budget / 100) : null,
        budgetRemaining: c.budget_remaining ? toRupees(c.budget_remaining / 100) : null,
      }));

    res.json({ overview, thisMonth, daily, activeCampaigns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
